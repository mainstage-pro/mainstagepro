// One-time KPI migration script — uses Neon HTTP (no TCP port 5432)
// Run: npx tsx --env-file=.env prisma/seeds/run-kpi-migrate.mts
import { neon } from '@neondatabase/serverless'

// Use direct URL (no pooler) to avoid PgBouncer DDL visibility issues
const rawUrl = process.env.DATABASE_URL!
  .replace('-pooler.', '.')
  .replace('pgbouncer=true&', '')
  .replace('&pgbouncer=true', '')

const sql = neon(rawUrl)

async function main() {
  console.log('🚀 Running KPI migration via Neon HTTP...\n')

  // Step 1: Add columns using tagged template literals (not .unsafe)
  await sql`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS descripcion TEXT`
  console.log('✅ col descripcion')
  await sql`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS proposito TEXT`
  console.log('✅ col proposito')
  await sql`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS "tipoCalculo" TEXT NOT NULL DEFAULT 'manual'`
  console.log('✅ col tipoCalculo')
  await sql`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS "notaCalculo" TEXT`
  console.log('✅ col notaCalculo')
  await sql`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS "valorManual" DOUBLE PRECISION`
  console.log('✅ col valorManual')
  await sql`ALTER TABLE pt_kpis ADD COLUMN IF NOT EXISTS "fechaValorManual" TIMESTAMP(3)`
  console.log('✅ col fechaValorManual\n')

  // Step 2: tipoCalculo = automatico (one per slug to avoid ANY binding issues)
  const automaticos = [
    'utilidad-neta', 'utilidad-bruta', 'flujo-de-efectivo',
    'leads-calificados-generados', 'conversion-leads-a-ventas',
    'ticket-promedio-por-venta', 'servicios-vendidos',
    'clientes-nuevos', 'clientes-recurrentes',
  ]
  for (const slug of automaticos) {
    await sql`UPDATE pt_kpis SET "tipoCalculo" = 'automatico' WHERE slug = ${slug}`
  }
  console.log(`✅ tipoCalculo=automatico: ${automaticos.length} slugs`)

  // Step 3: tipoCalculo = mixto
  const mixtos = ['costo-por-lead-cpl', 'costo-de-adquisicion-cac', 'roi-de-marketing', 'tasa-de-conversion-a-venta']
  for (const slug of mixtos) {
    await sql`UPDATE pt_kpis SET "tipoCalculo" = 'mixto' WHERE slug = ${slug}`
  }
  console.log(`✅ tipoCalculo=mixto: ${mixtos.length} slugs`)

  // Step 4: Descriptions
  const descripciones = [
    { slug: 'utilidad-neta', descripcion: 'Porcentaje de ganancia real después de todos los costos y gastos del período', proposito: 'Medir si el negocio es rentable. Si baja de 30% se requiere acción inmediata' },
    { slug: 'utilidad-bruta', descripcion: 'Porcentaje que queda después de restar solo los costos directos de los eventos', proposito: 'Medir la rentabilidad de la operación sin contar gastos fijos' },
    { slug: 'flujo-de-efectivo', descripcion: 'Relación entre el efectivo real disponible y los ingresos del período', proposito: 'Medir liquidez. Un negocio puede tener utilidad y quedarse sin caja' },
    { slug: 'leads-calificados-generados', descripcion: 'Número de contactos nuevos con intención real de contratar', proposito: 'Medir si el volumen de entrada al pipeline es suficiente para alcanzar la meta comercial' },
    { slug: 'costo-por-lead-cpl', descripcion: 'Cuánto cuesta en pauta obtener un lead calificado', proposito: 'Medir eficiencia de inversión publicitaria. Guía decisiones de presupuesto' },
    { slug: 'ticket-promedio-por-venta', descripcion: 'Valor promedio de cada cotización aprobada en el período', proposito: 'Medir si se está vendiendo con el margen correcto' },
    { slug: 'tasa-de-conversion-a-venta', descripcion: 'Porcentaje de oportunidades abiertas que terminan en venta cerrada', proposito: 'Medir la efectividad del proceso comercial' },
  ]

  for (const d of descripciones) {
    await sql`UPDATE pt_kpis SET descripcion = ${d.descripcion}, proposito = ${d.proposito} WHERE slug = ${d.slug}`
    console.log(`✅ ${d.slug}`)
  }

  console.log('\n🎉 Migration complete!')
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
