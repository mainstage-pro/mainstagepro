import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

const ENV = process.env.ENVF || ".env.prod.backup";
config({ path: ENV });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// DDL aditivo: campos de la "ficha base" del tema en sesiones_capacitacion.
// Columnas en camelCase citado (el modelo Prisma no usa @map).
async function main() {
  const cols: Array<[string, string]> = [
    ["subArea", "TEXT"],
    ["publicoObjetivo", "TEXT"],
    ["prerrequisitos", "TEXT[] NOT NULL DEFAULT '{}'"],
    ["procedimiento", "TEXT[] NOT NULL DEFAULT '{}'"],
    ["erroresComunes", "TEXT[] NOT NULL DEFAULT '{}'"],
    ["checklistAplicacion", "TEXT[] NOT NULL DEFAULT '{}'"],
    ["recursos", "TEXT[] NOT NULL DEFAULT '{}'"],
  ];

  for (const [name, type] of cols) {
    await sql.query(`ALTER TABLE "sesiones_capacitacion" ADD COLUMN IF NOT EXISTS "${name}" ${type}`);
    console.log(`[${ENV}] + columna ${name} ${type}`);
  }

  const check = await sql.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sesiones_capacitacion'
      AND column_name IN ('subArea','publicoObjetivo','prerrequisitos','procedimiento','erroresComunes','checklistAplicacion','recursos')
    ORDER BY column_name
  `);
  console.log(`[${ENV}] columnas presentes:`, (check as any[]).map((r) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
