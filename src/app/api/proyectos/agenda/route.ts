import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureCotizacionEventoConfirmadoColumn } from '@/lib/migraciones-lazy'

export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  await ensureCotizacionEventoConfirmadoColumn()

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
    // Tratos ganados/confirmados sin proyecto (mismo criterio que el calendario):
    // VENTA_CERRADA, confirmadaEn, cotización APROBADA, o cotización con eventoConfirmado.
    prisma.trato.findMany({
      where: {
        proyectos: { none: {} },
        // Un trato con venta perdida nunca va a la agenda, ni siquiera con el flag manual.
        etapa: { not: 'VENTA_PERDIDA' },
        OR: [
          { etapa: 'VENTA_CERRADA' },
          { confirmadaEn: { not: null } },
          { cotizaciones: { some: { estado: 'APROBADA' } } },
          { cotizaciones: { some: { eventoConfirmado: true } } },
        ],
      },
      select: {
        id: true,
        nombreEvento: true,
        fechaEventoEstimada: true,
        cliente: { select: { nombre: true, empresa: true } },
        cotizaciones: {
          where: { OR: [{ estado: 'APROBADA' }, { eventoConfirmado: true }] },
          select: { fechaEvento: true },
          orderBy: { fechaEvento: 'asc' },
          take: 1,
        },
      },
    }),
  ])

  // Merge tratos into proximos shape. La fecha sale de la cotización aprobada/confirmada
  // y, si no hay, de fechaEventoEstimada; se filtra a la ventana de próximos 30 días.
  const tratosProximos = tratosVC.flatMap(t => {
    const fechaEvento = t.cotizaciones.find(c => c.fechaEvento)?.fechaEvento ?? t.fechaEventoEstimada ?? null
    if (!fechaEvento) return []
    if (fechaEvento < inicioDeHoy || fechaEvento > en30dias) return []
    return [{
      id: t.id,
      nombre: t.nombreEvento ?? 'Evento',
      estado: 'VENTA_CERRADA',
      numeroProyecto: null,
      fechaEvento,
      lugarEvento: null,
      cliente: t.cliente,
      sinProyecto: true,
    }]
  })

  const proximosMerged = [
    ...proximos.map(p => ({ ...p, sinProyecto: false })),
    ...tratosProximos,
  ].sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime())

  return NextResponse.json({
    proximos: proximosMerged,
    recientes: recientes.map(p => ({ ...p, sinProyecto: false })),
  })
}
