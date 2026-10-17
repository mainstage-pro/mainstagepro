// DDL aditivo: notas y aprendizajes de gira (por show + autocrítica general de la gira).
//   ENV_FILE=.env.prod.backup npx tsx scripts/ddl-giras-notas.ts
// Idempotente: solo agrega columnas, nunca borra datos. Correr ANTES del push.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ path: process.env.ENV_FILE || process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const STATEMENTS = [
  `ALTER TABLE giras ADD COLUMN IF NOT EXISTS "evaluacion" JSONB`,
  `ALTER TABLE gira_shows ADD COLUMN IF NOT EXISTS "evaluacion" JSONB`,
];

async function main() {
  for (const stmt of STATEMENTS) await sql.query(stmt);
  const cols = await sql.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_name IN ('giras','gira_shows') AND column_name = 'evaluacion'
    ORDER BY table_name`);
  console.log("Columnas:", cols.map((r: Record<string, string>) => `${r.table_name}.${r.column_name}`).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
