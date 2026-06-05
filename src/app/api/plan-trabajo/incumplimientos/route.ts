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

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const isAdmin = session.role === 'ADMIN' || session.role === 'DIRECTOR'
  if (!isAdmin) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const usuarioId = searchParams.get('usuarioId') ?? 'todos'
  const semanas = Math.min(parseInt(searchParams.get('semanas') ?? '4'), 8)

  // Build last N Mondays (oldest first)
  const lunesStrings = Array.from({ length: semanas }, (_, i) => getLunes(semanas - i))

  // For each week, get all instances for the user
  const semanaData = await Promise.all(
    lunesStrings.map(async (lunesStr) => {
      const lunes = new Date(`${lunesStr}T00:00:00.000-06:00`)
      const domingo = new Date(lunes)
      domingo.setDate(lunes.getDate() + 6)
      domingo.setHours(23, 59, 59, 999)

      let whereUser: object
      if (usuarioId === 'todos') {
        whereUser = {}
      } else {
        whereUser = {
          OR: [
            { responsableId: usuarioId },
            { template: { puestoDefault: 'Todo el equipo' } },
          ],
        }
      }

      const instancias = await prisma.pTTareaInstancia.findMany({
        where: {
          fechaVencimiento: { gte: lunes, lte: domingo },
          ...whereUser,
        },
        select: {
          templateId: true,
          estado: true,
          responsableId: true,
          template: {
            select: {
              nombre: true,
              impacto: true,
              area: { select: { nombre: true, color: true } },
              responsable: { select: { id: true, name: true } },
            },
          },
          responsable: { select: { id: true, name: true } },
        },
      })

      return { lunes: lunesStr, instancias }
    })
  )

  // Group by templateId: track completada/pendiente per week
  type TemplateKey = string // `${templateId}-${responsableId}`
  const templateMap = new Map<TemplateKey, {
    templateId: string
    nombre: string
    area: string
    color: string
    responsable: string | null
    semanas: ('completada' | 'pendiente' | 'sin-datos')[]
  }>()

  for (let wi = 0; wi < semanaData.length; wi++) {
    const { instancias } = semanaData[wi]
    for (const inst of instancias) {
      const respId = inst.responsableId ?? '__todos__'
      const key = `${inst.templateId}-${respId}`
      if (!templateMap.has(key)) {
        templateMap.set(key, {
          templateId: inst.templateId,
          nombre: inst.template.nombre,
          area: inst.template.area.nombre,
          color: inst.template.area.color,
          responsable: inst.responsable?.name ?? inst.template.responsable?.name ?? null,
          semanas: Array(semanas).fill('sin-datos') as ('completada' | 'pendiente' | 'sin-datos')[],
        })
      }
      const entry = templateMap.get(key)!
      entry.semanas[wi] = inst.estado === 'COMPLETADA' ? 'completada' : 'pendiente'
    }
  }

  // Find templates with 3+ consecutive pending weeks (ending in most recent week)
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
    // Count consecutive pending from the most recent week backwards
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
