/**
 * Compresión one-time de imágenes en Vercel Blob (Opción A: overwrite in-place).
 *
 * - Galería (imagenesUrls): descarga cada foto de Blob, redimensiona a máx 1920px
 *   y recomprime (JPEG q82 / PNG comprimido), re-subiendo a la MISMA ruta → misma URL.
 *   No requiere tocar la BD de galería.
 * - Portadas base64 (imagenUrl que empieza con "data:"): comprime a máx 800px, sube a
 *   Blob y reemplaza imagenUrl por la URL. (Reduce el payload del endpoint público.)
 *
 * Respaldo previo de valores de BD en scripts/_backup-imagenes-<fecha>.json.
 *
 * Correr con env de PRODUCCIÓN:
 *   set -a; source .env.prod.backup; set +a; npx tsx scripts/compress-blob-imagenes.ts
 */
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_HOST = ".public.blob.vercel-storage.com";

const MAX_GALERIA = 1920;
const MAX_COVER = 800;
const Q = 82;
const SKIP_UNDER = 450 * 1024; // ya optimizada: no re-procesar

if (!TOKEN) { console.error("Falta BLOB_READ_WRITE_TOKEN"); process.exit(1); }

function pathnameFromUrl(u: string): string | null {
  try {
    const url = new URL(u);
    if (!url.host.endsWith(BLOB_HOST)) return null;
    return decodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch { return null; }
}

type Compressed = { data: Buffer; ct: string; w?: number; h?: number };

async function compress(buf: Buffer, maxDim: number): Promise<Compressed | null> {
  let pipe = sharp(buf, { failOn: "none" }).rotate(); // aplica orientación EXIF
  const meta = await pipe.metadata();
  const hasAlpha = !!meta.hasAlpha && meta.format === "png";
  pipe = pipe.resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true });
  if (hasAlpha) {
    const data = await pipe.png({ compressionLevel: 9, quality: Q, palette: true }).toBuffer();
    return { data, ct: "image/png" };
  }
  const data = await pipe.jpeg({ quality: Q, progressive: true, mozjpeg: true }).toBuffer();
  return { data, ct: "image/jpeg" };
}

// ── Galería ──────────────────────────────────────────────────────────────────
type GalItem = string | { url?: string; nombre?: string; uso?: string };

async function procesarGaleria() {
  const equipos = await prisma.equipo.findMany({
    where: { imagenesUrls: { not: null } },
    select: { id: true, imagenesUrls: true },
  });

  const urls = new Set<string>();
  for (const e of equipos) {
    try {
      const arr = JSON.parse(e.imagenesUrls || "[]") as GalItem[];
      if (!Array.isArray(arr)) continue;
      for (const it of arr) {
        const u = typeof it === "string" ? it : it?.url;
        if (u && pathnameFromUrl(u)) urls.add(u);
      }
    } catch { /* ignore */ }
  }

  const list = [...urls];
  console.log(`\n[galería] ${list.length} fotos únicas en Blob\n`);
  let ok = 0, skip = 0, err = 0, savedBytes = 0;

  for (let i = 0; i < list.length; i++) {
    const url = list[i];
    const pathname = pathnameFromUrl(url)!;
    const tag = `[galería ${i + 1}/${list.length}]`;
    try {
      const res = await fetch(url);
      if (!res.ok) { console.log(`${tag} ✗ fetch ${res.status} ${pathname}`); err++; continue; }
      const orig = Buffer.from(await res.arrayBuffer());
      const c = await compress(orig, MAX_GALERIA);
      if (!c) { console.log(`${tag} ✗ compress ${pathname}`); err++; continue; }
      if (c.data.length >= orig.length || orig.length < SKIP_UNDER) {
        console.log(`${tag} = skip (orig ${(orig.length/1024).toFixed(0)}KB, comp ${(c.data.length/1024).toFixed(0)}KB) ${pathname}`);
        skip++; continue;
      }
      const uploaded = await put(pathname, c.data, {
        access: "public", token: TOKEN, addRandomSuffix: false, allowOverwrite: true, contentType: c.ct,
      });
      if (uploaded.url !== url) console.log(`${tag} ⚠ URL cambió: ${uploaded.url}`);
      savedBytes += orig.length - c.data.length;
      ok++;
      console.log(`${tag} ✓ ${(orig.length/1024/1024).toFixed(2)}MB → ${(c.data.length/1024).toFixed(0)}KB  ${pathname}`);
    } catch (e) {
      err++; console.log(`${tag} ✗ ${(e as Error).message} ${pathname}`);
    }
  }
  console.log(`\n[galería] listo. comprimidas:${ok} saltadas:${skip} errores:${err} ahorro:${(savedBytes/1024/1024).toFixed(1)}MB`);
}

// ── Portadas base64 ──────────────────────────────────────────────────────────
async function procesarCoversBase64() {
  const equipos = await prisma.equipo.findMany({
    where: { imagenUrl: { startsWith: "data:" } },
    select: { id: true, imagenUrl: true },
  });
  console.log(`\n[covers] ${equipos.length} portadas en base64\n`);
  let ok = 0, err = 0;

  for (let i = 0; i < equipos.length; i++) {
    const e = equipos[i];
    const tag = `[cover ${i + 1}/${equipos.length}]`;
    try {
      const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(e.imagenUrl || "");
      if (!m) { console.log(`${tag} ✗ no base64 ${e.id}`); err++; continue; }
      const orig = Buffer.from(m[2], "base64");
      const c = await compress(orig, MAX_COVER);
      if (!c) { console.log(`${tag} ✗ compress ${e.id}`); err++; continue; }
      const ext = c.ct === "image/png" ? "png" : "jpg";
      const pathname = `inventario/equipos/cover/${e.id}.${ext}`;
      const uploaded = await put(pathname, c.data, {
        access: "public", token: TOKEN, addRandomSuffix: false, allowOverwrite: true, contentType: c.ct,
      });
      await prisma.equipo.update({ where: { id: e.id }, data: { imagenUrl: uploaded.url } });
      ok++;
      console.log(`${tag} ✓ ${(orig.length/1024).toFixed(0)}KB base64 → ${(c.data.length/1024).toFixed(0)}KB  ${uploaded.url}`);
    } catch (err2) {
      err++; console.log(`${tag} ✗ ${(err2 as Error).message} ${e.id}`);
    }
  }
  console.log(`\n[covers] listo. migradas:${ok} errores:${err}`);
}

async function main() {
  // Respaldo
  const all = await prisma.equipo.findMany({ select: { id: true, imagenUrl: true, imagenesUrls: true } });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `scripts/_backup-imagenes-${stamp}.json`;
  writeFileSync(backupPath, JSON.stringify(all, null, 2));
  console.log(`Respaldo: ${backupPath} (${all.length} equipos)`);

  await procesarGaleria();
  await procesarCoversBase64();
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
