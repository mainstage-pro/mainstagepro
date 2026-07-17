import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf-8");
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
const sql = neon(match[1]);

// IDs exactos del evento Expo Supraterra (cliente Kathya Medina).
const TRATO_ID = "cmqsj41st0001f64gfppsveum";
const PROYECTO_ID = "cmr3za8lr0002uzncpsfcrqtu";
const FECHAS = ["2026-07-24", "2026-07-25", "2026-07-26"];
const FECHAS_JSON = JSON.stringify(FECHAS); // ["2026-07-24","2026-07-25","2026-07-26"]

const APPLY = process.argv.includes("--apply");

console.log(`Fechas objetivo: ${FECHAS_JSON}\nModo: ${APPLY ? "APLICAR" : "DRY-RUN (usa --apply para escribir)"}\n`);

// ── ANTES ──────────────────────────────────────────────────────────────────
const [tAntes] = await sql`
  SELECT id, "nombreEvento", "fechaEventoEstimada", "fechasEvento", "diasServicio"
  FROM tratos WHERE id = ${TRATO_ID}`;
const [pAntes] = await sql`
  SELECT id, nombre, "fechaEvento", "fechasEvento", "horariosEvento", estado
  FROM proyectos WHERE id = ${PROYECTO_ID}`;

if (!tAntes) throw new Error(`No se encontró el trato ${TRATO_ID}`);
if (!pAntes) throw new Error(`No se encontró el proyecto ${PROYECTO_ID}`);

console.log("ANTES");
console.log("  Trato:   ", tAntes.nombreEvento, "| fechaEventoEstimada:", tAntes.fechaEventoEstimada, "| fechasEvento:", tAntes.fechasEvento, "| diasServicio:", tAntes.diasServicio);
console.log("  Proyecto:", pAntes.nombre, "| fechaEvento:", pAntes.fechaEvento, "| fechasEvento:", pAntes.fechasEvento, "| estado:", pAntes.estado);

if (APPLY) {
  // El día 1 (fechaEventoEstimada / fechaEvento) YA es 2026-07-24, no se toca.
  // Solo agregamos la lista multidía. NO se tocan precios ni la cotización.
  await sql`UPDATE tratos SET "fechasEvento" = ${FECHAS_JSON}, "diasServicio" = ${FECHAS.length} WHERE id = ${TRATO_ID}`;
  await sql`UPDATE proyectos SET "fechasEvento" = ${FECHAS_JSON} WHERE id = ${PROYECTO_ID}`;

  const [tDesp] = await sql`
    SELECT "fechaEventoEstimada", "fechasEvento", "diasServicio" FROM tratos WHERE id = ${TRATO_ID}`;
  const [pDesp] = await sql`
    SELECT "fechaEvento", "fechasEvento" FROM proyectos WHERE id = ${PROYECTO_ID}`;
  console.log("\nDESPUÉS");
  console.log("  Trato:    fechaEventoEstimada:", tDesp.fechaEventoEstimada, "| fechasEvento:", tDesp.fechasEvento, "| diasServicio:", tDesp.diasServicio);
  console.log("  Proyecto: fechaEvento:", pDesp.fechaEvento, "| fechasEvento:", pDesp.fechasEvento);
  console.log("\n✅ Aplicado.");
} else {
  console.log("\n(No se escribió nada. Ejecuta con --apply para aplicar.)");
}

console.log("");
