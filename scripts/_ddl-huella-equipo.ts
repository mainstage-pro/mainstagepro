import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const envRaw = readFileSync(".env.prod.backup", "utf8");
const m = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)!;
const url = m[1].replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const stmts = [
  `ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "huellaAnchoM" DOUBLE PRECISION`,
  `ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "huellaLargoM" DOUBLE PRECISION`,
];

async function main() {
  for (const s of stmts) {
    await sql.query(s);
    console.log("ok:", s.slice(0, 80));
  }
  const cols = await sql.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'equipos' AND column_name IN ('huellaAnchoM','huellaLargoM','pesoKg')
     ORDER BY column_name`,
  );
  console.log("\nverificación:", cols);
}

main().catch(e => { console.error(e); process.exit(1); });
