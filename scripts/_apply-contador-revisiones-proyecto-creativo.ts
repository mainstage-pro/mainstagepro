/**
 * Fase 4 (Grupo Mainstage / esquema comercial de Creative), §4.6 punto 2:
 * contador simple "revisiones usadas / incluidas" en el proyecto creativo,
 * para que el vendedor sepa cuándo ya toca cobrar el cambio extra (catálogo
 * CAMBIO_ADICIONAL_RENDER_A/AA/AAA, ver §3.4 punto 2 de
 * docs/grupo-mainstage-fase4-esquema-comercial.md). No es un Kanban nuevo,
 * solo dos columnas enteras, aditivas, con default — no tocan datos
 * existentes.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/_apply-contador-revisiones-proyecto-creativo.ts
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
  await sql`ALTER TABLE proyectos_creativos ADD COLUMN IF NOT EXISTS "revisionesIncluidas" INTEGER NOT NULL DEFAULT 2`;
  await sql`ALTER TABLE proyectos_creativos ADD COLUMN IF NOT EXISTS "revisionesUsadas" INTEGER NOT NULL DEFAULT 0`;
  console.log("OK: columnas revisionesIncluidas / revisionesUsadas listas en proyectos_creativos");

  const check = await sql`
    SELECT column_name, column_default FROM information_schema.columns
    WHERE table_name = 'proyectos_creativos' AND column_name IN ('revisionesIncluidas', 'revisionesUsadas')
  `;
  console.log(check);
}

main();
