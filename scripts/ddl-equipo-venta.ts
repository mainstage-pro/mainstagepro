// DDL aditivo en prod: columnas de venta de equipo en `equipos`.
// Se aplica ANTES del deploy porque están declaradas en schema.prisma y Prisma las pide
// en cualquier findMany de equipos sin select (gotcha migración lazy).
// Idempotente (ADD COLUMN IF NOT EXISTS). Driver HTTP neon (el pooler TCP falla desde local).
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const envFile = process.env.ENV_FILE || ".env.prod.backup";
const envRaw = readFileSync(envFile, "utf8");
const match = envRaw.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error(`No DATABASE_URL en ${envFile}`);
const raw = match[1].trim().replace(/^["']|["']$/g, "");
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const COLUMNAS: [string, string][] = [
  ["enVenta", `BOOLEAN NOT NULL DEFAULT false`],
  ["precioVenta", `DOUBLE PRECISION`],
  ["ventaCantidad", `INTEGER`],
  ["ventaCondicion", `TEXT`],
  ["ventaDescripcion", `TEXT`],
  ["ventaDesde", `TIMESTAMP(3)`],
  ["fechaVenta", `TIMESTAMP(3)`],
];

async function main() {
  for (const [col, tipo] of COLUMNAS) {
    await sql.query(`ALTER TABLE equipos ADD COLUMN IF NOT EXISTS "${col}" ${tipo}`);
  }
  const cols = await sql.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'equipos'
      AND column_name IN ('enVenta','precioVenta','ventaCantidad','ventaCondicion','ventaDescripcion','ventaDesde','fechaVenta')
    ORDER BY column_name
  `);
  console.log("Columnas presentes:", (cols as { column_name: string }[]).map((c) => c.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
