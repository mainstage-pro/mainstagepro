import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // Fase 7: origen y enlace al catálogo unificado en rider_accesorios (aditivo, idempotente)
  await sql.query(`ALTER TABLE rider_accesorios ADD COLUMN IF NOT EXISTS "origen" TEXT`);
  await sql.query(`ALTER TABLE rider_accesorios ADD COLUMN IF NOT EXISTS "accesorioId" TEXT`);

  const cols = await sql.query(`SELECT column_name FROM information_schema.columns
    WHERE table_name='rider_accesorios' ORDER BY column_name`);
  console.log("OK rider_accesorios:", cols.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
