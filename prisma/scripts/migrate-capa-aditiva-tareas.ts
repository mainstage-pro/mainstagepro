import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('== Capa aditiva Tarea — migración idempotente ==')

  // 1. Columnas nuevas en tareas
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
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "${col}" ${def}`
    )
  }

  // 2. Columna nueva en pt_tarea_templates
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "pt_tarea_templates" ADD COLUMN IF NOT EXISTS "ultimaTareaGeneradaAt" timestamp(3)`
  )

  // 3. Foreign keys (idempotente vía pg_constraint)
  await prisma.$executeRawUnsafe(`
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

  // 4. Índices
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "tareas_tipoOrigen_estado_idx" ON "tareas" ("tipoOrigen", "estado")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "tareas_estadoVerificacion_idx" ON "tareas" ("estadoVerificacion")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "tareas_asignadoAId_fecha_idx" ON "tareas" ("asignadoAId", "fecha")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "tareas_ptTemplateId_idx" ON "tareas" ("ptTemplateId")`)

  // 5. Backfill tipoOrigen desde FKs existentes (prioridad determinista)
  await prisma.$executeRawUnsafe(`
    UPDATE "tareas" SET "tipoOrigen" = CASE
      WHEN "proyectoEventoId" IS NOT NULL THEN 'EVENTO'
      WHEN "proyectoInternoId" IS NOT NULL THEN 'PROYECTO'
      WHEN "planActividadId" IS NOT NULL OR "origenPlan" = true THEN 'PLAN'
      ELSE 'TAREA'
    END
  `)

  // 6. Conteo por tipoOrigen
  const conteo = await prisma.$queryRawUnsafe<{ tipoOrigen: string; total: bigint }[]>(
    `SELECT "tipoOrigen", COUNT(*)::bigint AS total FROM "tareas" GROUP BY "tipoOrigen" ORDER BY total DESC`
  )
  console.log('== Conteo Tarea por tipoOrigen ==')
  for (const row of conteo) {
    console.log(`  ${row.tipoOrigen.padEnd(10)} ${row.total.toString()}`)
  }
  console.log('== Migración completa ==')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
