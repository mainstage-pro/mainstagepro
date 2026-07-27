import { neon } from '@neondatabase/serverless'

// Runner por HTTP (443) para agregar proyecto_personal.movimientoId en prod
// ANTES del deploy. Aditivo e idempotente. La columna liga cada fila de nómina
// con el MovimientoFinanciero (GASTO) que se genera al marcar PAGADO.
const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('== proyecto_personal.movimientoId — migración aditiva (HTTP) ==')
  await sql.query(`ALTER TABLE "proyecto_personal" ADD COLUMN IF NOT EXISTS "movimientoId" TEXT`)
  await sql.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "proyecto_personal_movimientoId_key" ON "proyecto_personal" ("movimientoId")`
  )
  await sql.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proyecto_personal_movimientoId_fkey') THEN
        ALTER TABLE "proyecto_personal" ADD CONSTRAINT "proyecto_personal_movimientoId_fkey"
          FOREIGN KEY ("movimientoId") REFERENCES "movimientos_financieros"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `)
  const cols = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'proyecto_personal' AND column_name = 'movimientoId'`
  )
  console.log('Columna presente:', (cols as unknown[]).length === 1 ? 'sí' : 'NO')
  console.log('== Migración completa ==')
}

main().catch((e) => { console.error(e); process.exit(1) })
