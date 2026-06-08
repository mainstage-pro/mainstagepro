import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ahora = new Date()
  const inicioDeHoy = new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) + 'T00:00:00.000-06:00'
  )
  const en30dias = new Date(ahora.getTime() + 30 * 86400000)

  // Semana anterior exacta (lunes–domingo previo), hora CDMX
  const dow = inicioDeHoy.getDay() // 0=dom, 1=lun... 6=sab
  const diasDesdeElLunes = (dow + 6) % 7  // 0 si es lunes, 6 si es domingo
  const lunesEstaaSemana = new Date(inicioDeHoy.getTime() - diasDesdeElLunes * 86400000)
  const lunesAnterior = new Date(lunesEstaaSemana.getTime() - 7 * 86400000)

  const [proximos, recientes, tratosVC] = await Promise.all([
    // Proyectos próximos (30 días)
    prisma.proyecto.findMany({
      where: {
        estado: { in: ['PLANEACION', 'CONFIRMADO', 'EN_CURSO'] },
        fechaEvento: { gte: inicioDeHoy, lte: en30dias },
      },
      select: {
        id: true, nombre: true, estado: true, numeroProyecto: true,
        fechaEvento: true, lugarEvento: true,
        cliente: { select: { nombre: true, empresa: true } },
      },
      orderBy: { fechaEvento: 'asc' },
      take: 15,
    }),
    // Proyectos semana anterior (lunes–domingo previo)
    prisma.proyecto.findMany({
      where: {
        fechaEvento: { gte: lunesAnterior, lt: lunesEstaaSemana },
        estado: { notIn: ['CANCELADO'] },
      },
      select: {
        id: true, nombre: true, estado: true, numeroProyecto: true,
        fechaEvento: true, lugarEvento: true,
        cliente: { select: { nombre: true, empresa: true } },
      },
      orderBy: { fechaEvento: 'desc' },
      take: 10,
    }),
    // Tratos VENTA_CERRADA sin proyecto, con cotización APROBADA próxima
    prisma.trato.findMany({
      where: {
        etapa: 'VENTA_CERRADA',
        proyecto: null,
        cotizaciones: {
          some: {
            estado: 'APROBADA',
            fechaEvento: { gte: inicioDeHoy, lte: en30dias, not: null },
          },
        },
      },
      select: {
        id: true,
        nombreEvento: true,
        cliente: { select: { nombre: true, empresa: true } },
        cotizaciones: {
          where: { estado: 'APROBADA', fechaEvento: { gte: inicioDeHoy, not: null } },
          select: { fechaEvento: true },
          orderBy: { fechaEvento: 'asc' },
          take: 1,
        },
      },
    }),
  ])

  // Merge tratos into proximos shape
  const tratosProximos = tratosVC.flatMap(t =>
    t.cotizaciones.filter(c => c.fechaEvento).map(c => ({
      id: t.id,
      nombre: t.nombreEvento ?? 'Evento',
      estado: 'VENTA_CERRADA',
      numeroProyecto: null,
      fechaEvento: c.fechaEvento!,
      lugarEvento: null,
      cliente: t.cliente,
      sinProyecto: true,
    }))
  )

  const proximosMerged = [
    ...proximos.map(p => ({ ...p, sinProyecto: false })),
    ...tratosProximos,
  ].sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime())

  return NextResponse.json({
    proximos: proximosMerged,
    recientes: recientes.map(p => ({ ...p, sinProyecto: false })),
  })
}
