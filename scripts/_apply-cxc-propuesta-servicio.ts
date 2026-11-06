/**
 * Fase 4 (Grupo Mainstage): CxC real al aprobar una PropuestaServicio de
 * Live o Creative. Columna aditiva, nullable — no toca datos existentes:
 *
 *   - propuestaServicioId: liga la CuentaCobrar a la propuesta que la generó
 *     (ver src/lib/cuenta-cobrar-desde-propuesta.ts). Antes de esto, lo que
 *     vendían Live/Creative nunca entraba a /finanzas/cobros-pagos.
 *
 * Ver prisma/schema.prisma (modelo CuentaCobrar) y
 * docs/grupo-mainstage-fase4-esquema-comercial.md.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/_apply-cxc-propuesta-servicio.ts
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: process.env.ENV_FILE || ".env.prod.backup" });
const url = process.env
  .DATABASE_URL!.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql`ALTER TABLE cuentas_cobrar ADD COLUMN IF NOT EXISTS "propuestaServicioId" TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS cuentas_cobrar_propuestaServicioId_idx ON cuentas_cobrar("propuestaServicioId")`;
  console.log("OK: columna propuestaServicioId + índice listos en cuentas_cobrar");

  const check = await sql`
    SELECT column_name, column_default FROM information_schema.columns
    WHERE table_name = 'cuentas_cobrar' AND column_name = 'propuestaServicioId'
  `;
  console.log(check);
}

main();
