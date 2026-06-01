import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ahora = new Date()
  const hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [proximos, recientes] = await Promise.all([
    // Active/confirmed projects ordered by event date
    prisma.proyecto.findMany({
      where: { estado: { in: ['CONFIRMADO', 'EN_CURSO'] } },
      select: {
        id: true, nombre: true, estado: true,
        fechaEvento: true, lugarEvento: true,
        cliente: { select: { nombre: true, empresa: true } },
      },
      orderBy: { fechaEvento: 'asc' },
      take: 20,
    }),
    // Completed projects from last 7 days
    prisma.proyecto.findMany({
      where: {
        estado: 'COMPLETADO',
        fechaEvento: { gte: hace7dias },
      },
      select: {
        id: true, nombre: true, estado: true,
        fechaEvento: true, lugarEvento: true,
        cliente: { select: { nombre: true, empresa: true } },
      },
      orderBy: { fechaEvento: 'desc' },
      take: 10,
    }),
  ])

  return NextResponse.json({ proximos, recientes })
}
