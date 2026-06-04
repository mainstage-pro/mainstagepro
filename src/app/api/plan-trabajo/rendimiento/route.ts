import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Get last 8 Mondays
  function getLunes(offsetWeeks: number): Date {
    const now = new Date()
    const dow = now.getDay()
    const lunes = new Date(now)
    lunes.setDate(now.getDate() - ((dow + 6) % 7) - offsetWeeks * 7)
    lunes.setHours(0, 0, 0, 0)
    return lunes
  }

  const semanas = await Promise.all(
    Array.from({ length: 8 }, (_, i) => i).reverse().map(async (offset) => {
      const lunes = getLunes(offset)
      const viernes = new Date(lunes)
      viernes.setDate(lunes.getDate() + 4)
      viernes.setHours(23, 59, 59, 999)

      const [total, completadas] = await Promise.all([
        prisma.pTTareaInstancia.count({
          where: {
            fechaVencimiento: { gte: lunes, lte: viernes },
          },
        }),
        prisma.pTTareaInstancia.count({
          where: {
            fechaVencimiento: { gte: lunes, lte: viernes },
            estado: 'COMPLETADA',
          },
        }),
      ])

      const label = lunes.toLocaleDateString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: 'numeric',
        month: 'short',
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

  // Per-area stats for current week
  const lunesActual = getLunes(0)
  const viernesActual = new Date(lunesActual)
  viernesActual.setDate(lunesActual.getDate() + 4)
  viernesActual.setHours(23, 59, 59, 999)

  const instanciasActual = await prisma.pTTareaInstancia.findMany({
    where: {
      fechaVencimiento: { gte: lunesActual, lte: viernesActual },
    },
    select: {
      estado: true,
      responsable: {
        select: { id: true, name: true, area: true },
      },
      template: {
        select: {
          impacto: true,
          area: { select: { nombre: true, icono: true } },
        },
      },
    },
  })

  // Group by area
  const areaMap = new Map<string, { nombre: string; icono: string; total: number; completadas: number }>()
  for (const inst of instanciasActual) {
    const area = inst.template.area
    if (!areaMap.has(area.nombre)) {
      areaMap.set(area.nombre, { nombre: area.nombre, icono: area.icono ?? '', total: 0, completadas: 0 })
    }
    const a = areaMap.get(area.nombre)!
    a.total++
    if (inst.estado === 'COMPLETADA') a.completadas++
  }

  // Impact breakdown current week
  const impactoMap = { critico: { total: 0, completadas: 0 }, alto: { total: 0, completadas: 0 }, estandar: { total: 0, completadas: 0 } }
  for (const inst of instanciasActual) {
    const imp = inst.template.impacto as keyof typeof impactoMap
    if (impactoMap[imp]) {
      impactoMap[imp].total++
      if (inst.estado === 'COMPLETADA') impactoMap[imp].completadas++
    }
  }

  // Per-user stats for current week
  const usuariosMap = new Map<string, { id: string; name: string; area: string | null; total: number; completadas: number }>()
  for (const inst of instanciasActual) {
    if (!inst.responsable) continue
    const u = inst.responsable
    if (!usuariosMap.has(u.id)) {
      usuariosMap.set(u.id, { id: u.id, name: u.name, area: u.area, total: 0, completadas: 0 })
    }
    const entry = usuariosMap.get(u.id)!
    entry.total++
    if (inst.estado === 'COMPLETADA') entry.completadas++
  }

  const usuarios = Array.from(usuariosMap.values())
    .map(u => ({ ...u, pct: u.total > 0 ? Math.round((u.completadas / u.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)

  return NextResponse.json({
    semanas,
    areas: Array.from(areaMap.values()).sort((a, b) => b.total - a.total),
    impacto: impactoMap,
    usuarios,
  })
}
