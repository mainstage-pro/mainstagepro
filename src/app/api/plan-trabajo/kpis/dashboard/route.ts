import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { calcularKPI, KPI_AUTO_SLUGS } from '@/lib/kpi-calculators'

export const dynamic = 'force-dynamic'

function getSemaforo(valor: number | null, meta: string): 'verde' | 'amarillo' | 'rojo' | 'sin-dato' {
  if (valor === null) return 'sin-dato'
  const metaNum = parseFloat(meta.replace(/[^0-9.]/g, ''))
  if (isNaN(metaNum)) return 'sin-dato'
  const pct = valor / metaNum
  if (pct >= 0.9) return 'verde'
  if (pct >= 0.7) return 'amarillo'
  return 'rojo'
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodoParam = searchParams.get('periodo') ?? 'mensual'
  const anio  = parseInt(searchParams.get('anio')  ?? new Date().getFullYear().toString())
  const mes   = parseInt(searchParams.get('mes')   ?? (new Date().getMonth() + 1).toString())
  const trim  = parseInt(searchParams.get('trimestre') ?? Math.ceil(new Date().getMonth() / 3).toString())

  const kpiParams = periodoParam === 'trimestral'
    ? { trimestre: trim, anio }
    : { mes, anio }

  const allKpis = await prisma.pTKPI.findMany({
    where: { activo: true },
    include: { area: { select: { id: true, nombre: true, color: true } } },
    orderBy: [{ esTransversal: 'desc' }, { orden: 'asc' }],
  })

  // For each KPI, try auto-calculate or fetch last manual registro
  const kpisConValor = await Promise.all(allKpis.map(async (kpi) => {
    const slug = kpi.slug ?? ''
    let valorActual: number | null = null
    let calculo = 'manual'

    if (slug && KPI_AUTO_SLUGS.has(slug)) {
      valorActual = await calcularKPI(slug, kpiParams)
      calculo = 'automatico'
    }

    if (valorActual === null && slug) {
      // Try manual registro
      const registro = await prisma.pTRegistroKPI.findFirst({
        where: { kpiSlug: slug, periodo: periodoParam, anio },
        orderBy: { fechaInicio: 'desc' },
      })
      if (registro) {
        valorActual = registro.valor ?? null
        calculo = 'manual'
      }
    }

    const metaNum = parseFloat(kpi.meta.replace(/[^0-9.]/g, ''))
    const cumplida = valorActual !== null && !isNaN(metaNum) && valorActual >= metaNum

    return {
      ...kpi,
      slug,
      valorActual,
      cumplida,
      calculo,
      semaforo: getSemaforo(valorActual, kpi.meta),
    }
  }))

  const cabecera = kpisConValor.filter((k) => k.esTransversal)
  const porArea: Record<string, typeof kpisConValor> = {}
  kpisConValor
    .filter((k) => !k.esTransversal && k.area)
    .forEach((k) => {
      const areaNombre = k.area?.nombre ?? 'Otras'
      if (!porArea[areaNombre]) porArea[areaNombre] = []
      porArea[areaNombre].push(k)
    })

  return NextResponse.json({ cabecera, porArea, periodo: periodoParam, anio, mes, trimestre: trim })
}
