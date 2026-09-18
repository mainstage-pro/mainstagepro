// DDL aditivo en prod: cotizaciones.horaInicioEvento / cotizaciones.horaFinEvento.
// Se aplica ANTES del deploy porque ambas columnas están declaradas en schema.prisma
// y Prisma las pide en cualquier findMany de cotizaciones sin select (gotcha migración lazy).
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

async function main() {
  await sql.query(`ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS "horaInicioEvento" TEXT`);
  await sql.query(`ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS "horaFinEvento" TEXT`);
  const cols = await sql.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'cotizaciones' AND column_name IN ('horaInicioEvento','horaFinEvento')
    ORDER BY column_name
  `);
  console.log("Columnas presentes:", (cols as { column_name: string }[]).map((c) => c.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
