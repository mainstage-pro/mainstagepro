/**
 * Rellena la foto de portada (imagenUrl) de los equipos del catálogo 2026 a partir
 * de los PNG con fondo transparente que se descargaron del mismo documento del
 * proveedor con el que se registraron los equipos.
 *
 * Fuentes:
 *   ~/Downloads/Catalogo_Indice_Equipos_2026.csv            → marca, modelo, archivo
 *   ~/Downloads/Catalogo_Equipos_2026/Imagenes_PNG/*.png    → las imágenes
 *
 * El emparejamiento es por marca+modelo normalizados (sin acentos, sin signos) contra
 * los equipos de línea PREMIUM, con alias de marca para las dos escrituras del mismo
 * fabricante (L-Acoustics / L'Acoustics, Funktion-One / Funktion One, …).
 *
 * Uso:
 *   ENV_FILE=.env.prod.backup npx tsx scripts/seed-imagenes-catalogo-2026.ts           # dry run
 *   ENV_FILE=.env.prod.backup npx tsx scripts/seed-imagenes-catalogo-2026.ts --apply
 *   … --force   → también reemplaza la portada de equipos que ya tienen foto
 */
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { config } from "dotenv";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import sharp from "sharp";

config({ path: process.env.ENV_FILE ?? ".env" });

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

const CSV = path.join(homedir(), "Downloads/Catalogo_Indice_Equipos_2026.csv");
const DIR_PNG = path.join(homedir(), "Downloads/Catalogo_Equipos_2026/Imagenes_PNG");
const MAX_DIM = 1200; // portadas de catálogo: suficiente para la ficha y el PDF

const sql = neon(
  process.env
    .DATABASE_URL!.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "")
);

// ── Normalización ────────────────────────────────────────────────────────────
const norm = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Misma marca escrita de dos formas entre el CSV del proveedor y el catálogo.
const ALIAS_MARCA: Record<string, string> = {
  lacoustics: "lacoustics",
  funktionone: "funktionone",
  dbaudiotechnik: "dbaudiotechnik",
  chauvetdj: "chauvet",
  chauvetprofessional: "chauvet",
  pioneerdj: "pioneerdj",
  alphatheta: "alphatheta",
};
const marcaKey = (m: string) => ALIAS_MARCA[norm(m)] ?? norm(m);

// ── CSV ──────────────────────────────────────────────────────────────────────
type Fila = { categoria: string; cantidad: string; descripcion: string; marca: string; modelo: string; archivo: string };

function parseCsv(texto: string): Fila[] {
  const lineas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  const out: Fila[] = [];
  for (const linea of lineas.slice(1)) {
    const campos: string[] = [];
    let actual = "";
    let enComillas = false;
    for (const ch of linea) {
      if (ch === '"') enComillas = !enComillas;
      else if (ch === "," && !enComillas) { campos.push(actual); actual = ""; }
      else actual += ch;
    }
    campos.push(actual);
    const [categoria, cantidad, descripcion, marca, modelo, archivo] = campos;
    out.push({ categoria, cantidad, descripcion, marca, modelo, archivo });
  }
  return out;
}

type EquipoRow = {
  id: string; marca: string | null; modelo: string | null; descripcion: string;
  tipo: string; imagenUrl: string | null; tratamiento: string | null; categoria: string;
};

async function main() {
  const filas = parseCsv(readFileSync(CSV, "utf8"));
  const archivos = new Set(readdirSync(DIR_PNG).filter((f) => f.toLowerCase().endsWith(".png")));

  const equipos = (await sql`
    SELECT e.id, e.marca, e.modelo, e.descripcion, e.tipo, e."imagenUrl", e.tratamiento,
           c.nombre AS categoria
      FROM equipos e JOIN categoria_equipos c ON c.id = e."categoriaId"
     WHERE e.activo = true AND e.tipo = 'PREMIUM'
  `) as EquipoRow[];

  const porClave = new Map<string, EquipoRow[]>();
  for (const e of equipos) {
    const k = `${marcaKey(e.marca ?? "")}|${norm(e.modelo)}`;
    porClave.set(k, [...(porClave.get(k) ?? []), e]);
  }

  const buscar = (marca: string, modelo: string): { eq: EquipoRow; via: string } | null => {
    const mk = marcaKey(marca);
    const mo = norm(modelo);
    const exacto = porClave.get(`${mk}|${mo}`);
    if (exacto?.length === 1) return { eq: exacto[0], via: "marca+modelo" };
    // El catálogo a veces agrega sufijo al modelo (Freedom Flex H4 IP → … X6)
    const mismaMarca = equipos.filter((e) => marcaKey(e.marca ?? "") === mk);
    const prefijo = mismaMarca.filter((e) => norm(e.modelo).startsWith(mo) || mo.startsWith(norm(e.modelo)));
    if (prefijo.length === 1) return { eq: prefijo[0], via: "prefijo de modelo" };
    // Último recurso: modelo único entre todos los PREMIUM
    const soloModelo = equipos.filter((e) => norm(e.modelo) === mo);
    if (soloModelo.length === 1) return { eq: soloModelo[0], via: "solo modelo" };
    return null;
  };

  type Plan = { fila: Fila; eq: EquipoRow; via: string; archivo: string };
  const plan: Plan[] = [];
  const sinImagen: Fila[] = [];
  const sinArchivo: Fila[] = [];
  const sinEquipo: Fila[] = [];
  const yaTienen: Plan[] = [];
  const usados = new Set<string>();

  for (const f of filas) {
    if (!f.archivo || f.archivo === "SIN IMAGEN") { sinImagen.push(f); continue; }
    if (!archivos.has(f.archivo)) { sinArchivo.push(f); continue; }
    const m = buscar(f.marca, f.modelo);
    if (!m) { sinEquipo.push(f); continue; }
    if (usados.has(m.eq.id)) { sinEquipo.push(f); continue; } // dos filas al mismo equipo: revisar a mano
    usados.add(m.eq.id);
    const p = { fila: f, eq: m.eq, via: m.via, archivo: f.archivo };
    if (m.eq.imagenUrl && !FORCE) yaTienen.push(p);
    else plan.push(p);
  }

  console.log(`CSV: ${filas.length} filas · PNG en disco: ${archivos.size} · equipos PREMIUM activos: ${equipos.length}\n`);

  console.log(`── A cargar: ${plan.length} ─────────────────────────────────`);
  for (const p of plan) {
    const marcaOk = marcaKey(p.fila.marca) === marcaKey(p.eq.marca ?? "");
    const modeloOk = norm(p.fila.modelo) === norm(p.eq.modelo);
    const nota = marcaOk && modeloOk ? "" : `   ⟵ ${p.eq.marca} ${p.eq.modelo} (${p.via})`;
    console.log(`  ${p.fila.marca} ${p.fila.modelo}  →  ${p.archivo}${nota}`);
  }

  if (yaTienen.length) {
    console.log(`\n── Ya tienen foto (se respetan; usa --force para reemplazar): ${yaTienen.length} ──`);
    for (const p of yaTienen) console.log(`  ${p.eq.marca} ${p.eq.modelo}`);
  }
  if (sinImagen.length) {
    console.log(`\n── Sin imagen en el documento del proveedor: ${sinImagen.length} ──`);
    for (const f of sinImagen) console.log(`  ${f.marca} ${f.modelo} — ${f.descripcion}`);
  }
  if (sinArchivo.length) {
    console.log(`\n── ⚠ El CSV nombra un PNG que no está en disco: ${sinArchivo.length} ──`);
    for (const f of sinArchivo) console.log(`  ${f.marca} ${f.modelo} → ${f.archivo}`);
  }
  if (sinEquipo.length) {
    console.log(`\n── ⚠ Sin equipo PREMIUM que empate: ${sinEquipo.length} ──`);
    for (const f of sinEquipo) console.log(`  ${f.marca} ${f.modelo} — ${f.descripcion}`);
  }

  const huerfanos = equipos.filter((e) => !usados.has(e.id) && !e.imagenUrl);
  if (huerfanos.length) {
    console.log(`\n── Equipos PREMIUM que siguen sin foto (no venían en el CSV): ${huerfanos.length} ──`);
    for (const e of huerfanos) console.log(`  ${e.marca ?? "—"} ${e.modelo ?? "—"} — ${e.descripcion}`);
  }

  if (!APPLY) {
    console.log("\nDry run. Corre con --apply para subir y escribir.");
    return;
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("\nFalta BLOB_READ_WRITE_TOKEN en el env.");
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    `scripts/_backup-imagenes-catalogo-2026-${stamp}.json`,
    JSON.stringify(
      plan.map((p) => ({ id: p.eq.id, marca: p.eq.marca, modelo: p.eq.modelo, imagenUrl: p.eq.imagenUrl, tratamiento: p.eq.tratamiento })),
      null,
      2
    )
  );

  let ok = 0;
  let err = 0;
  for (const p of plan) {
    const etiqueta = `${p.eq.marca} ${p.eq.modelo}`;
    try {
      const original = readFileSync(path.join(DIR_PNG, p.archivo));
      const optimizada = await sharp(original, { failOn: "none" })
        .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 85, effort: 9 }) // paleta: conserva alfa y pesa 3-4× menos
        .toBuffer();
      const slug = p.archivo.replace(/\.png$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const blob = await put(`inventario/equipos/catalogo2026/${slug}.png`, optimizada, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      await sql`
        UPDATE equipos
           SET "imagenUrl" = ${blob.url}, tratamiento = 'png-transparente', "updatedAt" = now()
         WHERE id = ${p.eq.id}
      `;
      const kb = (n: number) => `${Math.round(n / 1024)} KB`;
      console.log(`  ✓ ${etiqueta}  ${kb(original.length)} → ${kb(optimizada.length)}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${etiqueta}: ${(e as Error).message}`);
      err++;
    }
  }
  console.log(`\nListo: ${ok} portadas cargadas, ${err} con error.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
