import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  await sql.query(`ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "nichoSlug" TEXT`);
  await sql.query(`ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "respuestasDescubrimiento" TEXT`);
  await sql.query(`ALTER TABLE "tratos" ADD COLUMN IF NOT EXISTS "adicionalesSeleccionados" TEXT`);
  const cols = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='tratos' AND column_name IN ('nichoSlug','respuestasDescubrimiento','adicionalesSeleccionados')`
  );
  console.log("OK columnas tratos descubrimiento:", cols.map((c) => c.column_name as string).sort());
}
main().catch((e) => { console.error(e); process.exit(1); });
