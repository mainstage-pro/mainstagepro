/**
 * Rellena la foto de portada (imagenUrl) de los equipos que se sembraron desde la
 * cotización "EQUIPOS RENTA" de SHOWCO SAPI de CV, con los PNG de fondo
 * transparente que vinieron del mismo documento.
 *
 * Fuentes:
 *   ~/Downloads/Equipos_CONEXZION_QRO/Indice_CONEXZION.csv         → código, marca, archivo
 *   ~/Downloads/Equipos_CONEXZION_QRO/Imagenes_PNG/*.png           → las imágenes
 *
 * El emparejamiento es por el código de la cotización (columna `Codigo`), que es la
 * única llave estable entre el documento del proveedor y los equipos ya registrados
 * (el CSV escribe "iPOINTE"/"LTX iFORTE" y la BD "iPointe"/"iForte LTX").
 *
 * Uso:
 *   ENV_FILE=.env.prod.backup npx tsx scripts/seed-imagenes-showco.ts            # dry run
 *   ENV_FILE=.env.prod.backup npx tsx scripts/seed-imagenes-showco.ts --apply
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

const BASE = path.join(homedir(), "Downloads/Equipos_CONEXZION_QRO");
const CSV = path.join(BASE, "Indice_CONEXZION.csv");
const DIR_PNG = path.join(BASE, "Imagenes_PNG");
const MAX_DIM = 1200;

const sql = neon(
  process.env
    .DATABASE_URL!.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "")
);

// Código de la cotización → (marca, modelo) tal como quedaron en seed-showco-iluminacion.ts
const POR_CODIGO: Record<string, { marca: string; modelo: string }> = {
  MPR: { marca: "ROBE", modelo: "MegaPointe" },
  ISR: { marca: "ROBE", modelo: "iSpiider" },
  TRAXR: { marca: "ROBE", modelo: "Tetra X" },
  TRA2R: { marca: "ROBE", modelo: "Tetra 2" },
  IPR: { marca: "ROBE", modelo: "iPointe" },
  FRTR: { marca: "ROBE", modelo: "Forte" },
  LTXFRT: { marca: "ROBE", modelo: "iForte LTX" },
  IBR: { marca: "ROBE", modelo: "iBolt" },
  RBSR: { marca: "ROBE", modelo: "RoboSpot" },
  S500S: { marca: "ShowCo", modelo: "Saeta 500" },
  SPHS: { marca: "ShowCo", modelo: "Saphira Beam" },
  SCRPS: { marca: "ShowCo", modelo: "Scorpio 760" },
  D7215: { marca: "Avolites", modelo: "D7-215" },
  D9330: { marca: "Avolites", modelo: "D9-330" },
  T3: { marca: "Avolites", modelo: "T3" },
  GRMA3L: { marca: "MA Lighting", modelo: "grandMA3 Light" },
  GRMA3F: { marca: "MA Lighting", modelo: "grandMA3 Full" },
  THSF: { marca: "Smoke Factory", modelo: "Tour Hazer II" },
  IORN: { marca: "HILUX", modelo: "IORN" },
  CYCII: { marca: "HILUX", modelo: "Cyclops II" },
};

type Fila = { codigo: string; marca: string; descripcion: string; archivo: string; estado: string };

function parseCsv(texto: string): Fila[] {
  const lineas = texto.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").filter((l) => l.trim());
  return lineas.slice(1).map((linea) => {
    const campos: string[] = [];
    let actual = "";
    let enComillas = false;
    for (const ch of linea) {
      if (ch === '"') enComillas = !enComillas;
      else if (ch === "," && !enComillas) { campos.push(actual); actual = ""; }
      else actual += ch;
    }
    campos.push(actual);
    const [, marca, codigo, descripcion, , archivo, estado] = campos;
    return { codigo: codigo.trim(), marca, descripcion, archivo: archivo.trim(), estado: estado?.trim() ?? "" };
  });
}

type EquipoRow = {
  id: string; marca: string | null; modelo: string | null; descripcion: string;
  tipo: string; imagenUrl: string | null; tratamiento: string | null;
};

async function main() {
  const filas = parseCsv(readFileSync(CSV, "utf8"));
  const archivos = new Set(readdirSync(DIR_PNG).filter((f) => f.toLowerCase().endsWith(".png")));

  const marcas = [...new Set(Object.values(POR_CODIGO).map((v) => v.marca))];
  const equipos = (await sql`
    SELECT id, marca, modelo, descripcion, tipo, "imagenUrl", tratamiento
      FROM equipos WHERE activo = true AND marca = ANY(${marcas})
  `) as EquipoRow[];
  const porClave = new Map(equipos.map((e) => [`${e.marca}|${e.modelo}`, e]));

  type Plan = { fila: Fila; eq: EquipoRow };
  const plan: Plan[] = [];
  const yaTienen: Plan[] = [];
  const sinArchivo: Fila[] = [];
  const sinEquipo: Fila[] = [];

  for (const f of filas) {
    const ref = POR_CODIGO[f.codigo];
    const eq = ref ? porClave.get(`${ref.marca}|${ref.modelo}`) : undefined;
    if (!eq) { sinEquipo.push(f); continue; }
    if (!archivos.has(f.archivo)) { sinArchivo.push(f); continue; }
    const p = { fila: f, eq };
    if (eq.imagenUrl && !FORCE) yaTienen.push(p);
    else plan.push(p);
  }

  console.log(`CSV: ${filas.length} filas · PNG en disco: ${archivos.size} · equipos encontrados: ${equipos.length}\n`);
  console.log(`── A cargar: ${plan.length} ─────────────────────────────────`);
  for (const p of plan) console.log(`  [${p.eq.tipo}] ${p.eq.marca} ${p.eq.modelo}  →  ${p.fila.archivo}`);

  if (yaTienen.length) {
    console.log(`\n── Ya tienen foto (se respetan; usa --force para reemplazar): ${yaTienen.length} ──`);
    for (const p of yaTienen) console.log(`  ${p.eq.marca} ${p.eq.modelo}`);
  }
  if (sinArchivo.length) {
    console.log(`\n── Sin PNG en disco: ${sinArchivo.length} ──`);
    for (const f of sinArchivo) console.log(`  ${f.marca} ${f.descripcion} → ${f.archivo} (${f.estado})`);
  }
  if (sinEquipo.length) {
    console.log(`\n── ⚠ Sin equipo que empate: ${sinEquipo.length} ──`);
    for (const f of sinEquipo) console.log(`  ${f.codigo} ${f.marca} ${f.descripcion}`);
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
    `scripts/_backup-imagenes-showco-${stamp}.json`,
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
      const original = readFileSync(path.join(DIR_PNG, p.fila.archivo));
      const optimizada = await sharp(original, { failOn: "none" })
        .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 85, effort: 9 })
        .toBuffer();
      const slug = p.fila.archivo.replace(/\.png$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const blob = await put(`inventario/equipos/showco/${slug}.png`, optimizada, {
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
