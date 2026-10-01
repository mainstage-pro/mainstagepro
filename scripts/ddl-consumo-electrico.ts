import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const envRaw = readFileSync(".env.prod.backup", "utf8");
const m = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)!;
const url = m[1].replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const stmts = [
  `ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "amperajeRequerido220" DOUBLE PRECISION`,
  `ALTER TABLE "proyecto_equipos" ADD COLUMN IF NOT EXISTS "voltajeUso" TEXT`,
];

async function main() {
  for (const s of stmts) {
    await sql.query(s);
    console.log("ok:", s.slice(0, 90));
  }
  const cols = await sql.query(
    `SELECT table_name, column_name, data_type FROM information_schema.columns
     WHERE (table_name = 'equipos' AND column_name IN ('amperajeRequerido','amperajeRequerido220','voltajeRequerido'))
        OR (table_name = 'proyecto_equipos' AND column_name = 'voltajeUso')
     ORDER BY table_name, column_name`,
  );
  console.log("\nverificación:", cols);
}

main().catch(e => { console.error(e); process.exit(1); });
