import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Helper: last 8 Mondays
  function getLunes(offsetWeeks: number): Date {
    const now = new Date()
    const dow = now.getDay()
    const lunes = new Date(now)
    lunes.setDate(now.getDate() - ((dow + 6) % 7) - offsetWeeks * 7)
    lunes.setHours(0, 0, 0, 0)
    return lunes
  }

  // Measurable = has a responsable assigned (fecha is NOT required — many project tasks lack it)
  // Subtasks (parentId != null) are excluded to avoid double-counting
  const measurableWhere = {
    asignadoAId: { not: null as string | null },
    estado: { not: 'CANCELADA' },
    parentId: null as string | null,
  }

  // 1. Weekly stats — uses fecha to bucket tasks into weeks (only tasks with fecha)
  const semanas = await Promise.all(
    Array.from({ length: 8 }, (_, i) => i).reverse().map(async (offset) => {
      const lunes = getLunes(offset)
      const domingo = new Date(lunes)
      domingo.setDate(lunes.getDate() + 6)
      domingo.setHours(23, 59, 59, 999)

      const weekWhere = {
        ...measurableWhere,
        fecha: { gte: lunes, lte: domingo },
      }

      const [total, completadas] = await Promise.all([
        prisma.tarea.count({ where: weekWhere }),
        prisma.tarea.count({ where: { ...weekWhere, estado: 'COMPLETADA' } }),
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

  // 2. Per-user stats — ALL assigned tasks regardless of fecha
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
      pendientes: total - completadas,
      pct: total > 0 ? Math.round((completadas / total) * 100) : 0,
    }
  }).sort((a, b) => b.pct - a.pct)

  // 3. Per-priority stats — ALL assigned tasks
  const PRIORIDADES = ['URGENTE', 'ALTA', 'MEDIA', 'BAJA']
  const prioStats = await Promise.all(PRIORIDADES.map(async (p) => {
    const [total, completadas] = await Promise.all([
      prisma.tarea.count({ where: { ...measurableWhere, prioridad: p } }),
      prisma.tarea.count({ where: { ...measurableWhere, prioridad: p, estado: 'COMPLETADA' } }),
    ])
    return { prioridad: p, total, completadas, pct: total > 0 ? Math.round((completadas / total) * 100) : 0 }
  }))

  // 4. Sin responsable = not measurable (can't track who's responsible)
  const sinResponsable = await prisma.tarea.count({
    where: {
      estado: { not: 'CANCELADA' },
      parentId: null,
      asignadoAId: null,
    },
  })

  // 5. Totals
  const [totalMedibles, totalCompletadas] = await Promise.all([
    prisma.tarea.count({ where: measurableWhere }),
    prisma.tarea.count({ where: { ...measurableWhere, estado: 'COMPLETADA' } }),
  ])

  return NextResponse.json({
    semanas,
    usuarios,
    prioridades: prioStats,
    noMedibles: sinResponsable,   // tasks without responsable (truly untrackable)
    totalMedibles,
    totalCompletadas,
    pctGeneral: totalMedibles > 0 ? Math.round((totalCompletadas / totalMedibles) * 100) : 0,
    currentUserId: session.id,
  })
}
