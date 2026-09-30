/**
 * DDL aditivo + backfill para fusionar varias cotizaciones en un solo proyecto.
 *
 * Marca cada equipo y cada puesto del proyecto con la cotización que lo pagó, y
 * abre el vínculo cotización → proyecto anfitrión. Aditivo e idempotente: no
 * borra ni reescribe nada que ya tenga valor.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/ddl-cotizacion-por-fila.ts
 */
import { neon } from '@neondatabase/serverless'
import fs from 'fs'

const envFile = process.env.ENV_FILE || '.env.prod.backup'
const raw = fs.readFileSync(envFile, 'utf8')
const url = raw
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URL='))!
  .split('=')
  .slice(1)
  .join('=')
  .replace(/^"|"$/g, '')
const sql = neon(url)

async function main() {
  console.log(`BD: ${url.split('@')[1]?.split('/')[0]}`)

  await sql`ALTER TABLE proyecto_equipos ADD COLUMN IF NOT EXISTS cotizacion_id TEXT`
  await sql`ALTER TABLE proyecto_personal ADD COLUMN IF NOT EXISTS cotizacion_id TEXT`
  await sql`ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS proyecto_fusionado_id TEXT`
  console.log('columnas ok')

  await sql`CREATE INDEX IF NOT EXISTS proyecto_equipos_cotizacion_id_idx ON proyecto_equipos(cotizacion_id)`
  await sql`CREATE INDEX IF NOT EXISTS proyecto_personal_cotizacion_id_idx ON proyecto_personal(cotizacion_id)`
  await sql`CREATE INDEX IF NOT EXISTS cotizaciones_proyecto_fusionado_id_idx ON cotizaciones(proyecto_fusionado_id)`
  console.log('índices ok')

  for (const [tabla, fk, destino] of [
    ['proyecto_equipos', 'proyecto_equipos_cotizacion_id_fkey', 'cotizaciones'],
    ['proyecto_personal', 'proyecto_personal_cotizacion_id_fkey', 'cotizaciones'],
  ] as const) {
    await sql.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${fk}') THEN
           ALTER TABLE ${tabla} ADD CONSTRAINT ${fk}
             FOREIGN KEY (cotizacion_id) REFERENCES ${destino}(id) ON DELETE SET NULL;
         END IF;
       END $$`,
    )
  }
  await sql.query(
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizaciones_proyecto_fusionado_id_fkey') THEN
         ALTER TABLE cotizaciones ADD CONSTRAINT cotizaciones_proyecto_fusionado_id_fkey
           FOREIGN KEY (proyecto_fusionado_id) REFERENCES proyectos(id) ON DELETE SET NULL;
       END IF;
     END $$`,
  )
  console.log('llaves foráneas ok')

  // Backfill: todo lo que hoy existe vino de la cotización de origen del proyecto.
  const eq = await sql`
    UPDATE proyecto_equipos pe SET cotizacion_id = p."cotizacionId"
    FROM proyectos p WHERE p.id = pe."proyectoId" AND pe.cotizacion_id IS NULL
    RETURNING pe.id`
  const pers = await sql`
    UPDATE proyecto_personal pp SET cotizacion_id = p."cotizacionId"
    FROM proyectos p WHERE p.id = pp."proyectoId" AND pp.cotizacion_id IS NULL
    RETURNING pp.id`
  console.log(`backfill: ${(eq as unknown[]).length} equipos, ${(pers as unknown[]).length} puestos`)

  const pend = await sql`
    SELECT
      (SELECT COUNT(*) FROM proyecto_equipos WHERE cotizacion_id IS NULL) AS equipos_sin_cot,
      (SELECT COUNT(*) FROM proyecto_personal WHERE cotizacion_id IS NULL) AS puestos_sin_cot`
  console.log('sin cotización tras backfill:', JSON.stringify(pend))
}

main()
