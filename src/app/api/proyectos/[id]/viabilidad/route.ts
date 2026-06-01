import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Umbrales de viabilidad (igual que constants.ts)
const VIABILIDAD = {
  IDEAL:   0.55,
  REGULAR: 0.40,
  MINIMO:  0.25,
}

function getSemaforo(pct: number): 'IDEAL' | 'REGULAR' | 'MINIMO' | 'RIESGO' {
  if (pct >= VIABILIDAD.IDEAL)   return 'IDEAL'
  if (pct >= VIABILIDAD.REGULAR) return 'REGULAR'
  if (pct >= VIABILIDAD.MINIMO)  return 'MINIMO'
  return 'RIESGO'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      estado: true,
      tratoId: true,
      trato: {
        select: {
          id: true,
          cotizaciones: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              numeroCotizacion: true,
              version: true,
              opcionLetra: true,
              estado: true,
              total: true,
              granTotal: true,
              aplicaIva: true,
              montoIva: true,
              descuentoTotalPct: true,
              montoDescuento: true,
              subtotalEquiposBruto: true,
              subtotalEquiposNeto: true,
              subtotalOperacion: true,
              subtotalTransporte: true,
              subtotalHospedaje: true,
              subtotalComidas: true,
              subtotalPaquetes: true,
              subtotalTerceros: true,
              costosTotalesEstimados: true,
              utilidadEstimada: true,
              porcentajeUtilidad: true,
              createdAt: true,
              lineas: {
                where: {
                  esIncluido: false,
                  tipo: {
                    in: ['OPERACION_TECNICA', 'DJ', 'TRANSPORTE', 'COMIDA', 'HOSPEDAJE'],
                  },
                },
                select: { tipo: true, subtotal: true },
              },
            },
          },
        },
      },
    },
  })

  if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  const cotizaciones = proyecto.trato?.cotizaciones ?? []

  // La cotización activa es la más reciente en estado APROBADA, ENVIADA o BORRADOR
  const prioridad = ['APROBADA', 'ENVIADA', 'BORRADOR', 'ARCHIVADA']
  const cotActiva = cotizaciones
    .slice()
    .sort((a, b) => prioridad.indexOf(a.estado) - prioridad.indexOf(b.estado))[0] ?? null

  const analisis = cotizaciones.map(cot => {
    const costoReal = cot.lineas.reduce((s, l) => s + l.subtotal, 0)
    const utilidadViva = cot.total - costoReal
    const pctVivo = cot.total > 0 ? utilidadViva / cot.total : 0

    return {
      id: cot.id,
      numero: cot.numeroCotizacion,
      version: cot.version,
      opcion: cot.opcionLetra,
      estado: cot.estado,
      esActiva: cotActiva?.id === cot.id,
      // Totales
      subtotalBruto: cot.subtotalEquiposBruto,
      descuentoPct: cot.descuentoTotalPct,
      montoDescuento: cot.montoDescuento,
      subtotalNeto: cot.subtotalEquiposNeto,
      subtotalOperacion: cot.subtotalOperacion,
      subtotalTransporte: cot.subtotalTransporte,
      subtotalHospedaje: cot.subtotalHospedaje,
      subtotalComidas: cot.subtotalComidas,
      subtotalPaquetes: cot.subtotalPaquetes,
      subtotalTerceros: cot.subtotalTerceros,
      total: cot.total,
      aplicaIva: cot.aplicaIva,
      montoIva: cot.montoIva,
      granTotal: cot.granTotal,
      // Costos (desde líneas no incluidas de los tipos operativos)
      costoReal,
      // Viabilidad
      utilidadEstimada: cot.costosTotalesEstimados > 0
        ? cot.total - cot.costosTotalesEstimados
        : utilidadViva,
      utilidadViva,
      pctUtilidad: pctVivo,
      semaforo: getSemaforo(pctVivo),
      // Desglose de costos
      desgloseCostos: {
        operacion: cot.subtotalOperacion,
        transporte: cot.subtotalTransporte,
        hospedaje: cot.subtotalHospedaje,
        comidas: cot.subtotalComidas,
        paquetes: cot.subtotalPaquetes,
        terceros: cot.subtotalTerceros,
        total: costoReal,
      },
    }
  })

  const viabilidadActiva = analisis.find(a => a.esActiva) ?? analisis[0] ?? null

  return NextResponse.json({
    proyectoId: proyecto.id,
    viabilidadActiva,
    historico: analisis,
    umbrales: VIABILIDAD,
  })
}
