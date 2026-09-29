import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(`ALTER TABLE cuentas_bancarias ADD COLUMN IF NOT EXISTS "orden" INTEGER NOT NULL DEFAULT 0`);
  const rows = await sql.query(`SELECT "orden", nombre FROM cuentas_bancarias ORDER BY "orden", nombre`);
  console.log("OK cuentas_bancarias.orden:", rows.map((r: { orden: number; nombre: string }) => `${r.orden}·${r.nombre}`).join(" | "));
}

main().catch(e => { console.error(e); process.exit(1); });
