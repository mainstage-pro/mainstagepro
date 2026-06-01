import { prisma } from './prisma'

interface KPIPeriodParams {
  mes?: number       // 1-12
  anio: number
  semana?: number
  trimestre?: number
}

function periodRange(params: KPIPeriodParams): { fechaInicio: Date; fechaFin: Date } {
  const { mes, anio, trimestre } = params
  if (mes !== undefined) {
    const fechaInicio = new Date(anio, mes - 1, 1)
    const fechaFin    = new Date(anio, mes, 0, 23, 59, 59, 999)
    return { fechaInicio, fechaFin }
  }
  if (trimestre !== undefined) {
    const mesInicio = (trimestre - 1) * 3 + 1
    const fechaInicio = new Date(anio, mesInicio - 1, 1)
    const fechaFin    = new Date(anio, mesInicio + 2, 0, 23, 59, 59, 999)
    return { fechaInicio, fechaFin }
  }
  // Default: full year
  return {
    fechaInicio: new Date(anio, 0, 1),
    fechaFin:    new Date(anio, 11, 31, 23, 59, 59, 999),
  }
}

async function sumMovimientos(tipo: 'INGRESO' | 'GASTO', fechaInicio: Date, fechaFin: Date): Promise<number> {
  const result = await prisma.movimientoFinanciero.aggregate({
    _sum: { monto: true },
    where: { tipo, fecha: { gte: fechaInicio, lte: fechaFin } },
  })
  return result._sum.monto ?? 0
}

export async function calcularKPI(
  slug: string,
  params: KPIPeriodParams
): Promise<number | null> {
  const { fechaInicio, fechaFin } = periodRange(params)

  try {
    switch (slug) {
      case 'ingresos-totales': {
        return await sumMovimientos('INGRESO', fechaInicio, fechaFin)
      }

      case 'utilidad-neta': {
        const ingresos = await sumMovimientos('INGRESO', fechaInicio, fechaFin)
        const gastos   = await sumMovimientos('GASTO',   fechaInicio, fechaFin)
        if (ingresos === 0) return null
        return ((ingresos - gastos) / ingresos) * 100
      }

      case 'eventos-vendidos': {
        return await prisma.proyecto.count({
          where: {
            createdAt: { gte: fechaInicio, lte: fechaFin },
            estado: { not: 'CANCELADO' },
          },
        })
      }

      case 'ticket-promedio': {
        const ingresos = await sumMovimientos('INGRESO', fechaInicio, fechaFin)
        const eventos  = await prisma.proyecto.count({
          where: { createdAt: { gte: fechaInicio, lte: fechaFin }, estado: { not: 'CANCELADO' } },
        })
        if (eventos === 0) return null
        return ingresos / eventos
      }

      case 'costo-de-ventas': {
        const ingresos = await sumMovimientos('INGRESO', fechaInicio, fechaFin)
        const gastos   = await sumMovimientos('GASTO',   fechaInicio, fechaFin)
        if (ingresos === 0) return null
        return (gastos / ingresos) * 100
      }

      default:
        return null // KPI manual
    }
  } catch {
    return null
  }
}

// KPIs that can be auto-calculated
export const KPI_AUTO_SLUGS = new Set([
  'ingresos-totales',
  'utilidad-neta',
  'eventos-vendidos',
  'ticket-promedio',
  'costo-de-ventas',
])
