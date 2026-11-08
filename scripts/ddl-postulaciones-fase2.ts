/**
 * DDL aditivo — Fase 2 del módulo de reclutamiento.
 *
 * Agrega las columnas que la Fase 2 necesita en `postulaciones`:
 *   - origen                  TEXT       (FORMULARIO | MANUAL)
 *   - disciplina              TEXT
 *   - nivel                   TEXT
 *   - formulario_respuesta_id TEXT UNIQUE → formulario_respuestas(id)
 *   - prueba_practica         TEXT (JSON)
 *   - tecnico_id              TEXT → tecnicos(id) (sin FK formal, solo id)
 *
 * El modelo `Postulacion` usa @map snake_case, así que las columnas aquí van
 * en snake_case SIN comillas (si se usara camelCase citado, Prisma leería mal).
 *
 * Todo es ADD COLUMN IF NOT EXISTS: 100% aditivo, sin pérdida de datos.
 *
 * Correr con: npx tsx scripts/ddl-postulaciones-fase2.ts
 */
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

function urlDeProd(): string {
  const env = readFileSync(".env.prod.backup", "utf8");
  const linea = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
  if (!linea) throw new Error("No hay DATABASE_URL en .env.prod.backup");
  return linea.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const sql = neon(urlDeProd());

  await sql`ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'MANUAL'`;
  await sql`ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS disciplina TEXT`;
  await sql`ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS nivel TEXT`;
  await sql`ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS formulario_respuesta_id TEXT`;
  await sql`ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS prueba_practica TEXT`;
  await sql`ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS tecnico_id TEXT`;

  // Unicidad e índice para la relación 1:1 con FormularioRespuesta
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS postulaciones_formulario_respuesta_id_key
             ON postulaciones(formulario_respuesta_id)`;

  // Backfill razonable: las filas existentes son todas MANUAL (no vinieron de
  // formulario porque el flujo de formularios es nuevo).
  const backfill = await sql`
    UPDATE postulaciones
       SET origen = 'MANUAL'
     WHERE origen IS NULL
    RETURNING id`;
  console.log(`postulaciones con origen MANUAL (backfill): ${backfill.length}`);

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'postulaciones' ORDER BY ordinal_position`;
  console.log("postulaciones columnas:", cols.map((c) => c.column_name).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
