import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const kpiSlug  = searchParams.get('kpiSlug')
  const kpiArea  = searchParams.get('kpiArea')
  const periodo  = searchParams.get('periodo')
  const anio     = searchParams.get('anio')
  const mes      = searchParams.get('mes')
  const semana   = searchParams.get('semana')
  const trimestre = searchParams.get('trimestre')

  const where: Record<string, unknown> = {}
  if (kpiSlug)  where.kpiSlug  = kpiSlug
  if (kpiArea)  where.kpiArea  = kpiArea
  if (periodo)  where.periodo  = periodo
  if (anio)     where.anio     = parseInt(anio)
  if (mes)      where.mes      = parseInt(mes)
  if (semana)   where.semana   = parseInt(semana)
  if (trimestre) where.trimestre = parseInt(trimestre)

  const registros = await prisma.pTRegistroKPI.findMany({
    where,
    orderBy: { fechaInicio: 'desc' },
    include: { kpi: { select: { id: true, nombre: true, meta: true, slug: true } } },
  })

  return NextResponse.json({ registros })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const {
    kpiId, kpiSlug, kpiNombre, kpiArea, valor, valorTexto, meta,
    cumplida, periodo, fechaInicio, fechaFin,
    semana, quincena, mes, trimestre, semestre, anio, nota,
  } = body

  if (!kpiSlug || !periodo || !fechaInicio || !fechaFin || !anio) {
    return NextResponse.json({ error: 'kpiSlug, periodo, fechaInicio, fechaFin, anio requeridos' }, { status: 400 })
  }

  const registro = await prisma.pTRegistroKPI.upsert({
    where: {
      kpiSlug_periodo_fechaInicio: {
        kpiSlug,
        periodo,
        fechaInicio: new Date(fechaInicio),
      },
    },
    create: {
      kpiId: kpiId ?? null,
      kpiSlug,
      kpiNombre: kpiNombre ?? '',
      kpiArea: kpiArea ?? '',
      valor: valor ?? null,
      valorTexto: valorTexto ?? null,
      meta: meta ?? '',
      cumplida: cumplida ?? false,
      calculo: 'manual',
      periodo,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      semana: semana ?? null,
      quincena: quincena ?? null,
      mes: mes ?? null,
      trimestre: trimestre ?? null,
      semestre: semestre ?? null,
      anio,
      nota: nota ?? null,
      registradoPor: session.id,
    },
    update: {
      valor: valor ?? null,
      valorTexto: valorTexto ?? null,
      meta: meta ?? '',
      cumplida: cumplida ?? false,
      nota: nota ?? null,
    },
  })

  return NextResponse.json({ registro })
}
