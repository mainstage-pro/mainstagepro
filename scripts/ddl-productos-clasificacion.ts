import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);
async function main() {
  await sql.query(`ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "nichos" TEXT`);
  await sql.query(`ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "rol" TEXT NOT NULL DEFAULT 'base'`);
  await sql.query(`ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "disponibilidad" TEXT NOT NULL DEFAULT 'propio'`);
  await sql.query(`ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "proveedorRef" TEXT`);
  await sql.query(`ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "costoRef" DOUBLE PRECISION`);
  const c = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='productos' AND column_name IN ('nichos','rol','disponibilidad','proveedorRef','costoRef') ORDER BY column_name`);
  console.log("OK columnas productos:", c.map((r: any) => r.column_name).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
