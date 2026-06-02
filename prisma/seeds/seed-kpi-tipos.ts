import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const TIPOS: Record<string, 'automatico' | 'mixto' | 'manual'> = {
  // AUTOMATICO
  'utilidad-neta': 'automatico',
  'utilidad-bruta': 'automatico',
  'flujo-de-efectivo': 'automatico',
  'leads-calificados-generados': 'automatico',
  'conversion-leads-a-ventas': 'automatico',
  'ticket-promedio-por-venta': 'automatico',
  'servicios-vendidos': 'automatico',
  'clientes-nuevos': 'automatico',
  'clientes-recurrentes': 'automatico',
  // MIXTO
  'costo-por-lead-cpl': 'mixto',
  'costo-de-adquisicion-cac': 'mixto',
  'roi-de-marketing': 'mixto',
  'tasa-de-conversion-a-venta': 'mixto',
}

const DESCRIPCIONES: Record<string, { descripcion: string; proposito: string }> = {
  'utilidad-neta': {
    descripcion: 'Porcentaje de ganancia real después de todos los costos y gastos del período',
    proposito: 'Medir si el negocio es rentable. Si baja de 30% se requiere acción inmediata',
  },
  'utilidad-bruta': {
    descripcion: 'Porcentaje que queda después de restar solo los costos directos de los eventos',
    proposito: 'Medir la rentabilidad de la operación sin contar gastos fijos',
  },
  'flujo-de-efectivo': {
    descripcion: 'Relación entre el efectivo real disponible y los ingresos del período',
    proposito: 'Medir liquidez. Un negocio puede tener utilidad y quedarse sin caja',
  },
  'leads-calificados-generados': {
    descripcion: 'Número de contactos nuevos con intención real de contratar',
    proposito: 'Medir si el volumen de entrada al pipeline es suficiente para alcanzar la meta comercial',
  },
  'costo-por-lead-cpl': {
    descripcion: 'Cuánto cuesta en pauta obtener un lead calificado',
    proposito: 'Medir eficiencia de inversión publicitaria. Guía decisiones de presupuesto',
  },
  'ticket-promedio-por-venta': {
    descripcion: 'Valor promedio de cada cotización aprobada en el período',
    proposito: 'Medir si se está vendiendo con el margen correcto',
  },
  'tasa-de-conversion-a-venta': {
    descripcion: 'Porcentaje de oportunidades abiertas que terminan en venta cerrada',
    proposito: 'Medir la efectividad del proceso comercial',
  },
}

async function main() {
  console.log('Updating KPI tipos...')
  
  // Update tipoCalculo for all classified KPIs
  for (const [slug, tipo] of Object.entries(TIPOS)) {
    const result = await prisma.pTKPI.updateMany({
      where: { slug },
      data: { tipoCalculo: tipo },
    })
    console.log(`  ${slug}: ${tipo} (updated ${result.count})`)
  }

  // Update descripcion + proposito
  for (const [slug, data] of Object.entries(DESCRIPCIONES)) {
    const result = await prisma.pTKPI.updateMany({
      where: { slug },
      data,
    })
    console.log(`  ${slug}: descriptions updated (${result.count})`)
  }

  console.log('Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
