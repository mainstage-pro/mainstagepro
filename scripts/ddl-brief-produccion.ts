import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const COLS = ["briefObjetivo", "briefAcomodo", "briefCriterioTecnico", "briefRestricciones", "briefNoNegociables"];

async function main() {
  for (const col of COLS) {
    await sql.query(`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS "${col}" TEXT`);
  }
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='proyectos' AND column_name = ANY($1) ORDER BY column_name`,
    [COLS],
  );
  console.log("OK proyectos brief cols:", rows.map((r: Record<string, string>) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
