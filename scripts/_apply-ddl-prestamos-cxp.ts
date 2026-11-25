// DDL aditivo para CxP de préstamos de capital (cuentas_pagar.esPrestamo / movimientoOrigenId).
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const sql = neon(raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, ""));
async function main() {
  await sql.query(`ALTER TABLE "cuentas_pagar" ADD COLUMN IF NOT EXISTS "esPrestamo" BOOLEAN NOT NULL DEFAULT false`);
  await sql.query(`ALTER TABLE "cuentas_pagar" ADD COLUMN IF NOT EXISTS "movimientoOrigenId" TEXT`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS "cuentas_pagar_movimientoOrigenId_key" ON "cuentas_pagar"("movimientoOrigenId")`);
  console.log(await sql.query(`SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='cuentas_pagar' AND column_name IN ('esPrestamo','movimientoOrigenId')`));
}
main();
