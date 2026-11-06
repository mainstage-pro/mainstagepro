/**
 * Fase 4 (Grupo Mainstage / esquema comercial de Creative): descubrimiento
 * propio de Creative, sobre lo que ya existe en vez de un flujo paralelo
 * (mismo criterio que el descubrimiento de Live, ver
 * scripts/_apply-complejidad-alcance-gira.ts). Dos columnas nuevas,
 * nullable/con default, aditivas — no tocan datos existentes:
 *
 *   - fixtureCountEstimado: lo que el vendedor estima al alta, antes de
 *     cotizar — alimenta el calculador de nivel A/AA/AAA en la propuesta.
 *   - urgente: si el cliente ya avisó que necesita entrega acelerada
 *     (URGENCIA_RENDER en el catálogo, solo aplica a Nivel A).
 *
 * Ver prisma/schema.prisma (modelo ProyectoCreativo) y
 * docs/grupo-mainstage-fase4-esquema-comercial.md §4.3/§5.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/_apply-descubrimiento-creativo.ts
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
  await sql`ALTER TABLE proyectos_creativos ADD COLUMN IF NOT EXISTS "fixtureCountEstimado" INTEGER`;
  await sql`ALTER TABLE proyectos_creativos ADD COLUMN IF NOT EXISTS "urgente" BOOLEAN NOT NULL DEFAULT false`;
  console.log("OK: columnas fixtureCountEstimado / urgente listas en proyectos_creativos");

  const check = await sql`
    SELECT column_name, column_default FROM information_schema.columns
    WHERE table_name = 'proyectos_creativos' AND column_name IN ('fixtureCountEstimado', 'urgente')
  `;
  console.log(check);
}

main();
