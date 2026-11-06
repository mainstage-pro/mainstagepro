/**
 * Fase 5.3 (Grupo Mainstage): entregables versionados de Mainstage Creative
 * (render/plot/documentación técnica). Modelo nuevo — no columna sobre tabla
 * existente — mismo patrón de `CREATE TABLE IF NOT EXISTS` que
 * scripts/ddl-proyecto-creativo.ts usó para proyectos_creativos. Versionado
 * simple: nunca se sobreescribe una versión anterior, solo se agrega la
 * siguiente (version = max(version donde tipo=X) + 1).
 *
 * Ver prisma/schema.prisma (modelo CreativeEntregable) y
 * docs/grupo-mainstage-fase4-esquema-comercial.md.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/_apply-creative-entregables.ts
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
  await sql.query(`
    CREATE TABLE IF NOT EXISTS creative_entregables (
      "id" TEXT NOT NULL,
      "proyectoCreativoId" TEXT NOT NULL REFERENCES proyectos_creativos(id) ON DELETE CASCADE,
      "tipo" TEXT NOT NULL,
      "version" INTEGER NOT NULL DEFAULT 1,
      "nombre" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "notas" TEXT,
      "subidoPor" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "creative_entregables_pkey" PRIMARY KEY ("id")
    )
  `);
  await sql.query(
    `CREATE INDEX IF NOT EXISTS creative_entregables_proyectoCreativoId_idx ON creative_entregables("proyectoCreativoId")`,
  );
  console.log("OK: tabla creative_entregables + índice listos");

  const check = await sql.query(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_name = 'creative_entregables'`,
  );
  console.log(`Tabla creative_entregables: ${check[0].n ? "OK" : "FALTA"}`);
}

main();
