import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Fuente combinada (Bloque 2):
//  - ACTUAL/futuro: Tarea (tipoOrigen="PLAN", parent) — hub de ejecución.
//  - HISTÓRICO previo a la migración: PTTareaInstancia con migradaATareaId IS NULL
//    (las migradas ya viven como Tarea, se excluyen para no duplicar).

type Row = {
  completada: boolean
  resp: { id: string; name: string; area: string | null } | null
  impacto: string
  areaNombre: string
  areaIcono: string
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

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
      const rango = { gte: lunes, lte: viernes }

      const [instTotal, instComp, tareaTotal, tareaComp] = await Promise.all([
        prisma.pTTareaInstancia.count({ where: { fechaVencimiento: rango, migradaATareaId: null } }),
        prisma.pTTareaInstancia.count({ where: { fechaVencimiento: rango, migradaATareaId: null, estado: 'COMPLETADA' } }),
        prisma.tarea.count({ where: { tipoOrigen: 'PLAN', parentId: null, fechaVencimiento: rango } }),
        prisma.tarea.count({ where: { tipoOrigen: 'PLAN', parentId: null, fechaVencimiento: rango, estado: 'COMPLETADA' } }),
      ])

      const total = instTotal + tareaTotal
      const completadas = instComp + tareaComp
      const label = lunes.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short' })

      return {
        semana: lunes.toISOString().slice(0, 10),
        label,
        total,
        completadas,
        pct: total > 0 ? Math.round((completadas / total) * 100) : 0,
      }
    })
  )

  // Detalle de la semana actual (combinado)
  const lunesActual = getLunes(0)
  const viernesActual = new Date(lunesActual)
  viernesActual.setDate(lunesActual.getDate() + 4)
  viernesActual.setHours(23, 59, 59, 999)
  const rangoActual = { gte: lunesActual, lte: viernesActual }

  const [instancias, tareas] = await Promise.all([
    prisma.pTTareaInstancia.findMany({
      where: { fechaVencimiento: rangoActual, migradaATareaId: null },
      select: {
        estado: true,
        responsable: { select: { id: true, name: true, area: true } },
        template: { select: { impacto: true, area: { select: { nombre: true, icono: true } } } },
      },
    }),
    prisma.tarea.findMany({
      where: { tipoOrigen: 'PLAN', parentId: null, fechaVencimiento: rangoActual },
      select: {
        estado: true,
        asignadoA: { select: { id: true, name: true, area: true } },
        ptTemplate: { select: { impacto: true, area: { select: { nombre: true, icono: true } } } },
      },
    }),
  ])

  const rows: Row[] = [
    ...instancias.map((i) => ({
      completada: i.estado === 'COMPLETADA',
      resp: i.responsable,
      impacto: i.template?.impacto ?? 'estandar',
      areaNombre: i.template?.area?.nombre ?? 'Sin área',
      areaIcono: i.template?.area?.icono ?? '',
    })),
    ...tareas.map((t) => ({
      completada: t.estado === 'COMPLETADA',
      resp: t.asignadoA,
      impacto: t.ptTemplate?.impacto ?? 'estandar',
      areaNombre: t.ptTemplate?.area?.nombre ?? 'Sin área',
      areaIcono: t.ptTemplate?.area?.icono ?? '',
    })),
  ]

  const areaMap = new Map<string, { nombre: string; icono: string; total: number; completadas: number }>()
  const impactoMap = { critico: { total: 0, completadas: 0 }, alto: { total: 0, completadas: 0 }, estandar: { total: 0, completadas: 0 } }
  const usuariosMap = new Map<string, { id: string; name: string; area: string | null; total: number; completadas: number }>()

  for (const r of rows) {
    if (!areaMap.has(r.areaNombre)) areaMap.set(r.areaNombre, { nombre: r.areaNombre, icono: r.areaIcono, total: 0, completadas: 0 })
    const a = areaMap.get(r.areaNombre)!
    a.total++
    if (r.completada) a.completadas++

    const imp = r.impacto as keyof typeof impactoMap
    if (impactoMap[imp]) {
      impactoMap[imp].total++
      if (r.completada) impactoMap[imp].completadas++
    }

    if (r.resp) {
      if (!usuariosMap.has(r.resp.id)) usuariosMap.set(r.resp.id, { id: r.resp.id, name: r.resp.name, area: r.resp.area, total: 0, completadas: 0 })
      const u = usuariosMap.get(r.resp.id)!
      u.total++
      if (r.completada) u.completadas++
    }
  }

  const usuarios = Array.from(usuariosMap.values())
    .map((u) => ({ ...u, pct: u.total > 0 ? Math.round((u.completadas / u.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)

  return NextResponse.json({
    semanas,
    areas: Array.from(areaMap.values()).sort((a, b) => b.total - a.total),
    impacto: impactoMap,
    usuarios,
    currentUserId: session.id,
  })
}
