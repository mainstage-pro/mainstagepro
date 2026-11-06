/**
 * Fase 4 (Grupo Mainstage / esquema comercial de Live): descubrimiento propio
 * de Live. Agrega a `giras` dos columnas nuevas, nullable, aditivas — sin
 * tocar datos existentes — para capturar la clasificación comercial de la
 * gira/show (complejidad y alcance geográfico) desde el alta.
 *
 * Ver prisma/schema.prisma (modelo Gira) y src/lib/giras.ts
 * (COMPLEJIDAD_GIRA / ALCANCE_GEOGRAFICO_GIRA) para los valores válidos.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/_apply-complejidad-alcance-gira.ts
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
  await sql`ALTER TABLE giras ADD COLUMN IF NOT EXISTS "complejidad" TEXT`;
  await sql`ALTER TABLE giras ADD COLUMN IF NOT EXISTS "alcanceGeografico" TEXT`;
  console.log("OK: columnas complejidad / alcanceGeografico listas en giras");

  const check = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'giras' AND column_name IN ('complejidad', 'alcanceGeografico')
  `;
  console.log(check);
}

main();
