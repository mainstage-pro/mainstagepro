import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

/**
 * Imágenes en base64 (data:image/...) → Vercel Blob.
 *
 * Las pantallas de inventario y productos comprimen la foto en el navegador y la
 * mandaban como data-URI, que terminaba guardada tal cual en la BD. Con ~100 fotos
 * así, /api/equipos pesaba 3.7 MB y /api/productos/publico 9 MB: el cotizador los
 * descargaba enteros al abrir (y otra vez cada que la pestaña recuperaba el foco),
 * por eso tardaba tanto en mostrar el contenido.
 *
 * - `imagenAUrl`: se usa al GUARDAR para que no entren más data-URIs.
 * - `migrarImagenesBase64`: migración lazy (patrón del repo) que convierte las ya
 *   guardadas la primera vez que se piden los catálogos.
 */

const esDataUri = (v: unknown): v is string => typeof v === "string" && v.startsWith("data:");

async function subirDataUri(dataUri: string, carpeta: string): Promise<string> {
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUri);
  if (!m) throw new Error("data-URI inválido");
  const contentType = m[1] || "image/jpeg";
  const buffer = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]));
  const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "");
  const blob = await put(`${carpeta}/${Date.now()}.${ext}`, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}

/** Si el valor es un data-URI lo sube a Blob y devuelve la URL; si no, lo regresa igual. */
export async function imagenAUrl<T>(valor: T, carpeta: string): Promise<T | string> {
  if (!esDataUri(valor)) return valor;
  return subirDataUri(valor, carpeta);
}

/** Igual que imagenAUrl para el JSON array de `Equipo.imagenesUrls`. */
export async function imagenesJsonAUrls(valor: unknown, carpeta: string): Promise<unknown> {
  if (typeof valor !== "string" || !valor.includes("data:")) return valor;
  try {
    const arr = JSON.parse(valor);
    if (!Array.isArray(arr)) return valor;
    const urls = await Promise.all(arr.map((u) => imagenAUrl(u, carpeta)));
    return JSON.stringify(urls);
  } catch {
    return valor;
  }
}

// ── Migración lazy de lo ya guardado ─────────────────────────────────────────
let _migradas = false;
let _enCurso: Promise<void> | null = null;

/**
 * Convierte a Blob todas las imágenes base64 de equipos y productos. Corre una vez
 * por instancia; las llamadas concurrentes comparten la misma promesa. Nunca lanza:
 * si algo falla, el endpoint sigue respondiendo y se reintenta en la siguiente.
 */
export function migrarImagenesBase64(): Promise<void> {
  if (_migradas) return Promise.resolve();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Promise.resolve();
  if (!_enCurso) {
    _enCurso = correrMigracion()
      .then(() => { _migradas = true; })
      .catch((err) => { console.error("[imagen-blob] migración falló:", err); })
      .finally(() => { _enCurso = null; });
  }
  return _enCurso;
}

async function correrMigracion() {
  // Mismo data-URI (p. ej. producto que heredó la foto de su equipo) → una sola subida.
  const cache = new Map<string, Promise<string>>();
  const subir = (uri: string, carpeta: string) => {
    let p = cache.get(uri);
    if (!p) { p = subirDataUri(uri, carpeta); cache.set(uri, p); }
    return p;
  };

  const equipos = await prisma.equipo.findMany({
    where: { OR: [{ imagenUrl: { startsWith: "data:" } }, { imagenesUrls: { contains: "data:" } }] },
    select: { id: true, imagenUrl: true, imagenesUrls: true },
  });
  const productos = await prisma.producto.findMany({
    where: { imagenUrl: { startsWith: "data:" } },
    select: { id: true, imagenUrl: true },
  });
  if (equipos.length === 0 && productos.length === 0) return;

  // De a pocas para no saturar Blob ni la BD.
  const tareas: Array<() => Promise<void>> = [];
  for (const e of equipos) {
    tareas.push(async () => {
      const data: { imagenUrl?: string; imagenesUrls?: string } = {};
      if (esDataUri(e.imagenUrl)) data.imagenUrl = await subir(e.imagenUrl, "equipos");
      if (e.imagenesUrls?.includes("data:")) {
        try {
          const arr = JSON.parse(e.imagenesUrls);
          if (Array.isArray(arr)) {
            data.imagenesUrls = JSON.stringify(await Promise.all(arr.map((u) => (esDataUri(u) ? subir(u, "equipos") : u))));
          }
        } catch { /* JSON roto: se deja igual */ }
      }
      if (Object.keys(data).length === 0) return;
      // Condicional: si alguien cambió la foto mientras tanto, no la pisamos.
      await prisma.equipo.updateMany({
        where: { id: e.id, imagenUrl: e.imagenUrl, imagenesUrls: e.imagenesUrls },
        data,
      });
    });
  }
  for (const p of productos) {
    tareas.push(async () => {
      const url = await subir(p.imagenUrl!, "productos");
      await prisma.producto.updateMany({ where: { id: p.id, imagenUrl: p.imagenUrl }, data: { imagenUrl: url } });
    });
  }

  const LOTE = 6;
  for (let i = 0; i < tareas.length; i += LOTE) {
    await Promise.all(tareas.slice(i, i + LOTE).map((t) => t().catch((err) => console.error("[imagen-blob]", err))));
  }
  console.log(`[imagen-blob] migradas ${equipos.length} imágenes de equipo y ${productos.length} de producto a Blob`);
}
