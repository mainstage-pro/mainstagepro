import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const TZ = 'America/Mexico_City'

function getLunes(offsetWeeks: number): string {
  const now = new Date()
  const dow = now.getDay()
  const lunes = new Date(now)
  lunes.setDate(now.getDate() - ((dow + 6) % 7) - offsetWeeks * 7)
  return lunes.toLocaleDateString('en-CA', { timeZone: TZ })
}

// Unidad común (Tarea PLAN + PTTareaInstancia no-migrada)
type Unidad = {
  templateId: string
  estado: string
  respId: string | null
  respName: string | null
  nombre: string
  areaNombre: string
  areaColor: string
  tplRespName: string | null
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const isAdmin = session.role === 'ADMIN' || session.role === 'DIRECTOR'
  if (!isAdmin) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const usuarioId = searchParams.get('usuarioId') ?? 'todos'
  const semanas = Math.min(parseInt(searchParams.get('semanas') ?? '4'), 8)

  const lunesStrings = Array.from({ length: semanas }, (_, i) => getLunes(semanas - i))

  const semanaData = await Promise.all(
    lunesStrings.map(async (lunesStr) => {
      const lunes = new Date(`${lunesStr}T00:00:00.000-06:00`)
      const domingo = new Date(lunes)
      domingo.setDate(lunes.getDate() + 6)
      domingo.setHours(23, 59, 59, 999)
      const rango = { gte: lunes, lte: domingo }

      const whereInstUser = usuarioId === 'todos'
        ? {}
        : { OR: [{ responsableId: usuarioId }, { template: { puestoDefault: 'Todo el equipo' } }] }
      const whereTareaUser = usuarioId === 'todos' ? {} : { asignadoAId: usuarioId }

      const [instancias, tareas] = await Promise.all([
        prisma.pTTareaInstancia.findMany({
          where: { fechaVencimiento: rango, migradaATareaId: null, ...whereInstUser },
          select: {
            templateId: true,
            estado: true,
            responsableId: true,
            template: {
              select: {
                nombre: true,
                area: { select: { nombre: true, color: true } },
                responsable: { select: { id: true, name: true } },
              },
            },
            responsable: { select: { id: true, name: true } },
          },
        }),
        prisma.tarea.findMany({
          where: { tipoOrigen: 'PLAN', parentId: null, fechaVencimiento: rango, ...whereTareaUser },
          select: {
            ptTemplateId: true,
            estado: true,
            asignadoAId: true,
            asignadoA: { select: { id: true, name: true } },
            ptTemplate: {
              select: {
                nombre: true,
                area: { select: { nombre: true, color: true } },
                responsable: { select: { id: true, name: true } },
              },
            },
          },
        }),
      ])

      const unidades: Unidad[] = [
        ...instancias.map((i) => ({
          templateId: i.templateId,
          estado: i.estado,
          respId: i.responsableId,
          respName: i.responsable?.name ?? null,
          nombre: i.template?.nombre ?? 'Sin nombre',
          areaNombre: i.template?.area?.nombre ?? 'Sin área',
          areaColor: i.template?.area?.color ?? '#888',
          tplRespName: i.template?.responsable?.name ?? null,
        })),
        ...tareas
          .filter((t) => t.ptTemplateId)
          .map((t) => ({
            templateId: t.ptTemplateId as string,
            estado: t.estado,
            respId: t.asignadoAId,
            respName: t.asignadoA?.name ?? null,
            nombre: t.ptTemplate?.nombre ?? 'Sin nombre',
            areaNombre: t.ptTemplate?.area?.nombre ?? 'Sin área',
            areaColor: t.ptTemplate?.area?.color ?? '#888',
            tplRespName: t.ptTemplate?.responsable?.name ?? null,
          })),
      ]

      return { lunes: lunesStr, unidades }
    })
  )

  type TemplateKey = string
  const templateMap = new Map<TemplateKey, {
    templateId: string
    nombre: string
    area: string
    color: string
    responsable: string | null
    semanas: ('completada' | 'pendiente' | 'sin-datos')[]
  }>()

  for (let wi = 0; wi < semanaData.length; wi++) {
    for (const u of semanaData[wi].unidades) {
      const respId = u.respId ?? '__todos__'
      const key = `${u.templateId}-${respId}`
      if (!templateMap.has(key)) {
        templateMap.set(key, {
          templateId: u.templateId,
          nombre: u.nombre,
          area: u.areaNombre,
          color: u.areaColor,
          responsable: u.respName ?? u.tplRespName ?? null,
          semanas: Array(semanas).fill('sin-datos') as ('completada' | 'pendiente' | 'sin-datos')[],
        })
      }
      const entry = templateMap.get(key)!
      // Si ya se marcó completada esta semana por otra fuente, no la degrades a pendiente
      if (entry.semanas[wi] === 'completada') continue
      entry.semanas[wi] = u.estado === 'COMPLETADA' ? 'completada' : 'pendiente'
    }
  }

  const incumplimientos: {
    templateId: string
    nombre: string
    area: string
    color: string
    responsable: string | null
    semanasIncumplidas: number
    historial: ('completada' | 'pendiente' | 'sin-datos')[]
  }[] = []

  for (const entry of templateMap.values()) {
    let consecutivas = 0
    for (let i = entry.semanas.length - 1; i >= 0; i--) {
      if (entry.semanas[i] === 'pendiente') consecutivas++
      else break
    }
    if (consecutivas >= 3) {
      incumplimientos.push({
        templateId: entry.templateId,
        nombre: entry.nombre,
        area: entry.area,
        color: entry.color,
        responsable: entry.responsable,
        semanasIncumplidas: consecutivas,
        historial: entry.semanas,
      })
    }
  }

  incumplimientos.sort((a, b) => b.semanasIncumplidas - a.semanasIncumplidas)

  return NextResponse.json({ incumplimientos, semanas: lunesStrings })
}
