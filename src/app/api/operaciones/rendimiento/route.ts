import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Helper: last 8 Mondays (Mexico City timezone offset handled)
  function getLunes(offsetWeeks: number): Date {
    const now = new Date()
    const dow = now.getDay()
    const lunes = new Date(now)
    lunes.setDate(now.getDate() - ((dow + 6) % 7) - offsetWeeks * 7)
    lunes.setHours(0, 0, 0, 0)
    return lunes
  }

  // Base filter: only measurable tasks
  const measurableWhere = {
    fecha: { not: null },
    asignadoAId: { not: null },
    estado: { not: 'CANCELADA' },
    parentId: null, // exclude subtasks from top-level metrics
  }

  // 1. Weekly stats (last 8 weeks)
  const semanas = await Promise.all(
    Array.from({ length: 8 }, (_, i) => i).reverse().map(async (offset) => {
      const lunes = getLunes(offset)
      const domingo = new Date(lunes)
      domingo.setDate(lunes.getDate() + 6)
      domingo.setHours(23, 59, 59, 999)

      const [total, completadas] = await Promise.all([
        prisma.tarea.count({
          where: { ...measurableWhere, fecha: { gte: lunes, lte: domingo } },
        }),
        prisma.tarea.count({
          where: { ...measurableWhere, fecha: { gte: lunes, lte: domingo }, estado: 'COMPLETADA' },
        }),
      ])

      const label = lunes.toLocaleDateString('es-MX', {
        timeZone: 'America/Mexico_City', day: 'numeric', month: 'short',
      })

      return {
        semana: lunes.toISOString().slice(0, 10),
        label,
        total,
        completadas,
        pct: total > 0 ? Math.round((completadas / total) * 100) : 0,
      }
    })
  )

  // 2. Per-user stats (all time, measurable tasks)
  const tareasUsuario = await prisma.tarea.groupBy({
    by: ['asignadoAId'],
    where: measurableWhere,
    _count: { id: true },
  })
  const tareasUsuarioComp = await prisma.tarea.groupBy({
    by: ['asignadoAId'],
    where: { ...measurableWhere, estado: 'COMPLETADA' },
    _count: { id: true },
  })

  // Get user names
  const userIds = tareasUsuario.map(t => t.asignadoAId).filter(Boolean) as string[]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  })

  const compMap = new Map(tareasUsuarioComp.map(t => [t.asignadoAId, t._count.id]))
  const usuarios = users.map(u => {
    const total = tareasUsuario.find(t => t.asignadoAId === u.id)?._count.id ?? 0
    const completadas = compMap.get(u.id) ?? 0
    return {
      id: u.id,
      name: u.name,
      total,
      completadas,
      pct: total > 0 ? Math.round((completadas / total) * 100) : 0,
    }
  }).sort((a, b) => b.pct - a.pct)

  // 3. Per-priority stats
  const PRIORIDADES = ['URGENTE', 'ALTA', 'MEDIA', 'BAJA']
  const prioStats = await Promise.all(PRIORIDADES.map(async (p) => {
    const [total, completadas] = await Promise.all([
      prisma.tarea.count({ where: { ...measurableWhere, prioridad: p } }),
      prisma.tarea.count({ where: { ...measurableWhere, prioridad: p, estado: 'COMPLETADA' } }),
    ])
    return { prioridad: p, total, completadas, pct: total > 0 ? Math.round((completadas / total) * 100) : 0 }
  }))

  // 4. No medibles count (missing fecha OR asignadoAId)
  const noMedibles = await prisma.tarea.count({
    where: {
      estado: { not: 'CANCELADA' },
      parentId: null,
      OR: [{ fecha: null }, { asignadoAId: null }],
    },
  })

  // 5. Total general
  const [totalMedibles, totalCompletadas] = await Promise.all([
    prisma.tarea.count({ where: measurableWhere }),
    prisma.tarea.count({ where: { ...measurableWhere, estado: 'COMPLETADA' } }),
  ])

  return NextResponse.json({
    semanas,
    usuarios,
    prioridades: prioStats,
    noMedibles,
    totalMedibles,
    totalCompletadas,
    pctGeneral: totalMedibles > 0 ? Math.round((totalCompletadas / totalMedibles) * 100) : 0,
    currentUserId: session.id,
  })
}
