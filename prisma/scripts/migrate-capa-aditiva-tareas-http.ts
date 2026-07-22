import { neon } from '@neondatabase/serverless'

// Runner por HTTP (443) para entornos donde el puerto 5432 está bloqueado.
// Aplica la misma migración aditiva idempotente que migrate-capa-aditiva-tareas.ts
const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('== Capa aditiva Tarea — migración idempotente (HTTP) ==')

  const tareaCols: [string, string][] = [
    ['tipoOrigen', `text NOT NULL DEFAULT 'TAREA'`],
    ['requiereEvidencia', `boolean NOT NULL DEFAULT false`],
    ['tipoEvidencia', `text`],
    ['evidenciaNota', `text`],
    ['estadoVerificacion', `text NOT NULL DEFAULT 'NO_REQUIERE'`],
    ['verificadaPorId', `text`],
    ['verificadaAt', `timestamp(3)`],
    ['motivoRechazo', `text`],
    ['porqueSeHace', `text`],
    ['estandarMinimo', `text`],
    ['siNoSeHace', `text`],
    ['cuando', `text`],
    ['moduloDestino', `text`],
    ['moduloTexto', `text`],
    ['moduloDisponible', `boolean NOT NULL DEFAULT true`],
    ['esAccionCampo', `boolean NOT NULL DEFAULT false`],
    ['ptTemplateId', `text`],
  ]
  for (const [col, def] of tareaCols) {
    await sql.query(`ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "${col}" ${def}`)
  }

  await sql.query(
    `ALTER TABLE "pt_tarea_templates" ADD COLUMN IF NOT EXISTS "ultimaTareaGeneradaAt" timestamp(3)`
  )

  await sql.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tareas_verificadaPorId_fkey') THEN
        ALTER TABLE "tareas" ADD CONSTRAINT "tareas_verificadaPorId_fkey"
          FOREIGN KEY ("verificadaPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tareas_ptTemplateId_fkey') THEN
        ALTER TABLE "tareas" ADD CONSTRAINT "tareas_ptTemplateId_fkey"
          FOREIGN KEY ("ptTemplateId") REFERENCES "pt_tarea_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `)

  await sql.query(`CREATE INDEX IF NOT EXISTS "tareas_tipoOrigen_estado_idx" ON "tareas" ("tipoOrigen", "estado")`)
  await sql.query(`CREATE INDEX IF NOT EXISTS "tareas_estadoVerificacion_idx" ON "tareas" ("estadoVerificacion")`)
  await sql.query(`CREATE INDEX IF NOT EXISTS "tareas_asignadoAId_fecha_idx" ON "tareas" ("asignadoAId", "fecha")`)
  await sql.query(`CREATE INDEX IF NOT EXISTS "tareas_ptTemplateId_idx" ON "tareas" ("ptTemplateId")`)

  await sql.query(`
    UPDATE "tareas" SET "tipoOrigen" = CASE
      WHEN "proyectoEventoId" IS NOT NULL THEN 'EVENTO'
      WHEN "proyectoInternoId" IS NOT NULL THEN 'PROYECTO'
      WHEN "planActividadId" IS NOT NULL OR "origenPlan" = true THEN 'PLAN'
      ELSE 'TAREA'
    END
  `)

  const conteo = await sql.query(
    `SELECT "tipoOrigen", COUNT(*)::int AS total FROM "tareas" GROUP BY "tipoOrigen" ORDER BY total DESC`
  )
  console.log('== Conteo Tarea por tipoOrigen ==')
  for (const row of conteo as { tipoOrigen: string; total: number }[]) {
    console.log(`  ${String(row.tipoOrigen).padEnd(10)} ${row.total}`)
  }
  console.log('== Migración completa ==')
}

main().catch((e) => { console.error(e); process.exit(1) })
