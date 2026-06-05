import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const TZ = 'America/Mexico_City'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const DIAS_CORTO = ['L', 'M', 'Mi', 'J', 'V']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const isAdmin = session.role === 'ADMIN' || session.role === 'DIRECTOR'
  if (!isAdmin) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const lunesParam = searchParams.get('lunes') // YYYY-MM-DD
  const usuarioId = searchParams.get('usuarioId') ?? 'todos'

  if (!lunesParam) return NextResponse.json({ error: 'Falta parámetro lunes' }, { status: 400 })

  // Build 5 working days
  const diasHabiles = await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      const diaDate = new Date(`${lunesParam}T12:00:00.000-06:00`)
      diaDate.setDate(diaDate.getDate() + i)
      const fechaStr = diaDate.toLocaleDateString('en-CA', { timeZone: TZ })
      const fechaInicio = new Date(`${fechaStr}T00:00:00.000-06:00`)
      const fechaFin = new Date(`${fechaStr}T23:59:59.999-06:00`)

      const whereBase = {
        fechaVencimiento: { gte: fechaInicio, lte: fechaFin },
      }

      // User filter
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
        where: { ...whereBase, ...whereUser },
        include: {
          template: { include: { area: true, subArea: true } },
          responsable: { select: { id: true, name: true } },
        },
        orderBy: { fechaVencimiento: 'asc' },
      })

      return {
        fecha: fechaStr,
        diaNombre: DIAS[i],
        diaCorto: DIAS_CORTO[i],
        instancias: instancias.map(inst => ({
          id: inst.id,
          templateId: inst.templateId,
          estado: inst.estado,
          completadaAt: inst.completadaAt?.toISOString() ?? null,
          esEntregable: inst.esEntregable,
          responsable: inst.responsable ? { id: inst.responsable.id, name: inst.responsable.name } : null,
          template: {
            nombre: inst.template.nombre,
            impacto: inst.template.impacto,
            frecuencia: inst.template.frecuencia,
            diasSemana: inst.template.diasSemana,
            descripcion: inst.template.descripcion,
            porqueSeHace: inst.template.porqueSeHace,
            siNoSeHace: inst.template.siNoSeHace,
            area: { nombre: inst.template.area.nombre, color: inst.template.area.color, icono: inst.template.area.icono ?? '' },
            subArea: inst.template.subArea ? { nombre: inst.template.subArea.nombre } : null,
          },
        })),
      }
    })
  )

  // Resumen
  const todasInstancias = diasHabiles.flatMap(d => d.instancias)
  const total = todasInstancias.length
  const completadas = todasInstancias.filter(i => i.estado === 'COMPLETADA').length

  // Por área
  const areaMap = new Map<string, { area: string; color: string; total: number; completadas: number }>()
  for (const inst of todasInstancias) {
    const key = inst.template.area.nombre
    if (!areaMap.has(key)) areaMap.set(key, { area: key, color: inst.template.area.color, total: 0, completadas: 0 })
    const a = areaMap.get(key)!
    a.total++
    if (inst.estado === 'COMPLETADA') a.completadas++
  }
  const porArea = [...areaMap.values()].map(a => ({ ...a, pct: a.total > 0 ? Math.round((a.completadas / a.total) * 100) : 0 }))

  // Por impacto
  const impactoMap = new Map<string, { impacto: string; total: number; completadas: number }>()
  for (const inst of todasInstancias) {
    const key = inst.template.impacto ?? 'estandar'
    if (!impactoMap.has(key)) impactoMap.set(key, { impacto: key, total: 0, completadas: 0 })
    const im = impactoMap.get(key)!
    im.total++
    if (inst.estado === 'COMPLETADA') im.completadas++
  }
  const porImpacto = [...impactoMap.values()].map(im => ({ ...im, pct: im.total > 0 ? Math.round((im.completadas / im.total) * 100) : 0 }))

  // Racha: count consecutive days backwards from last working day with ≥1 completada
  let racha = 0
  for (let i = diasHabiles.length - 1; i >= 0; i--) {
    const hayCompletada = diasHabiles[i].instancias.some(inst => inst.estado === 'COMPLETADA')
    if (hayCompletada) racha++
    else break
  }

  // Críticas
  const criticasTotal = todasInstancias.filter(i => i.template.impacto === 'critico').length
  const criticasCompletadas = todasInstancias.filter(i => i.template.impacto === 'critico' && i.estado === 'COMPLETADA').length

  return NextResponse.json({
    semana: lunesParam,
    diasHabiles,
    resumen: {
      total,
      completadas,
      pendientes: total - completadas,
      pct: total > 0 ? Math.round((completadas / total) * 100) : 0,
      porArea,
      porImpacto,
      racha,
      criticasTotal,
      criticasCompletadas,
    },
  })
}
