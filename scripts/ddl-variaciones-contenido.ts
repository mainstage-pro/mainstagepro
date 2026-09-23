/**
 * DDL aditivo para variaciones de contenido + ocultar publicaciones.
 * Se aplica en prod ANTES de desplegar el código que las usa.
 *   npx tsx --env-file=.env.prod.backup scripts/ddl-variaciones-contenido.ts
 */
import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const SENTENCIAS: [string, string][] = [
  ["publicaciones.oculta",
   `ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS oculta boolean NOT NULL DEFAULT false`],

  ["publicaciones.variacionId",
   `ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS "variacionId" text`],

  ["tipos_contenido.cicloSemanas",
   `ALTER TABLE tipos_contenido ADD COLUMN IF NOT EXISTS "cicloSemanas" integer`],

  ["tipos_contenido.cicloInicio",
   `ALTER TABLE tipos_contenido ADD COLUMN IF NOT EXISTS "cicloInicio" timestamp(3)`],

  ["tabla variaciones_contenido",
   `CREATE TABLE IF NOT EXISTS variaciones_contenido (
      id          text PRIMARY KEY,
      "tipoId"    text NOT NULL,
      codigo      text NOT NULL,
      nombre      text NOT NULL,
      semana      integer NOT NULL DEFAULT 1,
      posicion    integer NOT NULL DEFAULT 1,
      descripcion text,
      activo      boolean NOT NULL DEFAULT true,
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`],

  ["índice variaciones_contenido",
   `CREATE INDEX IF NOT EXISTS "variaciones_contenido_tipoId_semana_posicion_idx"
      ON variaciones_contenido ("tipoId", semana, posicion)`],

  ["índice publicaciones.variacionId",
   `CREATE INDEX IF NOT EXISTS "publicaciones_variacionId_idx"
      ON publicaciones ("variacionId")`],

  ["FK variaciones_contenido → tipos_contenido",
   `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variaciones_contenido_tipoId_fkey') THEN
        ALTER TABLE variaciones_contenido
          ADD CONSTRAINT "variaciones_contenido_tipoId_fkey"
          FOREIGN KEY ("tipoId") REFERENCES tipos_contenido(id) ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`],

  ["FK publicaciones → variaciones_contenido",
   `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publicaciones_variacionId_fkey') THEN
        ALTER TABLE publicaciones
          ADD CONSTRAINT "publicaciones_variacionId_fkey"
          FOREIGN KEY ("variacionId") REFERENCES variaciones_contenido(id) ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$`],
];

async function main() {
  for (const [nombre, sentencia] of SENTENCIAS) {
    await sql.query(sentencia);
    console.log(`  ✓ ${nombre}`);
  }

  const cols = await sql.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_name IN ('publicaciones','tipos_contenido','variaciones_contenido')
      AND column_name IN ('oculta','variacionId','cicloSemanas','cicloInicio','codigo','semana','posicion')
    ORDER BY table_name, column_name
  `);
  console.log("\nVerificación:");
  for (const c of cols) console.log(`  ${c.table_name}.${c.column_name}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
