import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(`ALTER TABLE gira_viajes ADD COLUMN IF NOT EXISTS "personaId" TEXT`);
  await sql.query(`ALTER TABLE gira_viajes ADD COLUMN IF NOT EXISTS "nombreLibre" TEXT`);
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='gira_viajes' AND column_name IN ('personaId','nombreLibre') ORDER BY column_name`,
  );
  console.log("OK gira_viajes cols:", rows.map((r: Record<string, string>) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
