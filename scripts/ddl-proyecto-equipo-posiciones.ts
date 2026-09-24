/**
 * DDL aditivo: tabla de posiciones de montaje por equipo de proyecto.
 * Correr contra prod ANTES de hacer push (ver AGENTS.md / migraciones lazy).
 *   npx tsx --env-file=.env.prod.backup scripts/ddl-proyecto-equipo-posiciones.ts
 */
import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS "proyecto_equipo_posiciones" (
      "id"               TEXT PRIMARY KEY,
      "proyectoEquipoId" TEXT NOT NULL,
      "cantidad"         INTEGER NOT NULL DEFAULT 1,
      "funcion"          TEXT,
      "soporte"          TEXT,
      "zona"             TEXT,
      "alturaM"          DOUBLE PRECISION,
      "notas"            TEXT,
      "esSugerencia"     BOOLEAN NOT NULL DEFAULT false,
      "orden"            INTEGER NOT NULL DEFAULT 0,
      "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sql.query(`
    CREATE INDEX IF NOT EXISTS "proyecto_equipo_posiciones_proyectoEquipoId_idx"
    ON "proyecto_equipo_posiciones" ("proyectoEquipoId")
  `);

  const fk = await sql.query(`
    SELECT 1 FROM pg_constraint WHERE conname = 'proyecto_equipo_posiciones_proyectoEquipoId_fkey'
  `);
  if (fk.length === 0) {
    await sql.query(`
      ALTER TABLE "proyecto_equipo_posiciones"
      ADD CONSTRAINT "proyecto_equipo_posiciones_proyectoEquipoId_fkey"
      FOREIGN KEY ("proyectoEquipoId") REFERENCES "proyecto_equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);
    console.log("FK creada");
  } else {
    console.log("FK ya existía");
  }

  const cols = await sql.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'proyecto_equipo_posiciones' ORDER BY ordinal_position
  `);
  console.log("Columnas:", cols.map((c) => `${c.column_name}:${c.data_type}`).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); });
