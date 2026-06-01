// TEMPORARY — DELETE AFTER USE
// GET /api/admin/seed-pt?secret=seedpt2026
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import soData from '@/lib/plan-trabajo/so-data.json'

const SECRET = 'seedpt2026'

const PUESTO_USER: Record<string, string> = {
  'Director General': 'cmnrpg62h0000zmizxpydetsm',
  'Asistente de Dirección': 'cmo6m98n80000eruqx1tk6er4',
  'Auxiliar de Dirección': 'cmo6m98n80000eruqx1tk6er4',
  'Administrador General': 'cmo7ikcc00000oqfsqwzys8g4',
  'Coordinador de Marketing y Contenido': 'cmo6mbjqy0001eruqem29tp7k',
  'Gerente Comercial / Director General': 'cmnrpg62h0000zmizxpydetsm',
  'Coordinador de Producción y Eventos': 'cmnxjcynq0000aloaylskv8g6',
  'Encargado de Bodega e Inventario': 'cmo6m8jzj0000298l2oo20o1u',
  'Auxiliar de Bodega y Logística': 'cmp3ew8mf0000v6xkmwrbuy5w',
}

const DIA_MAP: Record<string, number> = { L: 1, M: 2, X: 3, J: 4, V: 5 }

const AREA_CONFIGS = [
  { nombre: 'Operaciones Generales', color: '#1C1C2E', icono: '⚙️', orden: 0 },
  { nombre: 'Dirección', color: '#1a1a2e', icono: '🎯', orden: 1 },
  { nombre: 'Administración', color: '#16213e', icono: '📊', orden: 2 },
  { nombre: 'Marketing', color: '#1a472a', icono: '📣', orden: 3 },
  { nombre: 'Ventas', color: '#4a1942', icono: '💰', orden: 4 },
  { nombre: 'Producción', color: '#7b2d00', icono: '🎪', orden: 5 },
]

const AREA_MAP: Record<string, string> = {
  'Operaciones Generales del Equipo': 'Operaciones Generales',
  'Dirección General': 'Dirección',
  'Administración': 'Administración',
  'Marketing': 'Marketing',
  'Ventas': 'Ventas',
  'Producción': 'Producción',
}

function inferFrecuencia(cuando: string): string {
  const c = cuando.toLowerCase()
  if (c.includes('ltimo viernes') || c.includes('primer lunes') || c.includes('primer martes') || c.includes('1er lunes')) return 'MENSUAL'
  if (c.includes('trimest')) return 'TRIMESTRAL'
  if (c.includes('2 semanas') || c.includes('quincenal')) return 'QUINCENAL'
  if (c.includes('por evento') || c.includes('post-evento') || c.includes('post evento') || c.includes('día del evento') || c.includes('dia del evento')) return 'POR_EVENTO'
  if (c.includes('diario') || c.includes('todos los d')) return 'DIARIO'
  if (c.includes('lunes') && c.includes('jueves')) return 'LUNES_JUEVES'
  return 'SEMANAL'
}

function inferContexto(cuando: string, nombre: string): string {
  const c = (cuando + ' ' + nombre).toLowerCase()
  if (c.includes('evento') || c.includes('montaje') || c.includes('desmontaje') || c.includes('post-evento') || c.includes('post evento')) return 'evento'
  return 'independiente'
}

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

function getResponsableId(puesto: string): string | null {
  for (const [key, userId] of Object.entries(PUESTO_USER)) {
    if (puesto.includes(key)) return userId
  }
  return null
}

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== SECRET) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  type HtmlTarea = {
    nombre: string; tipo: string; impacto: string; cuando: string; dias: string[]
    puesto: string; moduloTexto: string; moduloDestino: string; kpi: string
    descripcion: string; estandar: string; porque: string; relacionCon: string
    siNoSeHace: string; dependeDe: null | Record<string, string>
    bloqueaA: null | Record<string, string>; afectaA: string[]
  }
  type HtmlSubarea = { nombre: string; entregables: string[]; tareas: HtmlTarea[] }
  type HtmlArea = { nombre: string; icono: string; color: string; objetivo: string; subareas: HtmlSubarea[] }

  const htmlAreas = soData as HtmlArea[]

  // Clear
  const deletedT = await prisma.pTTareaTemplate.deleteMany()
  const deletedS = await prisma.pTSubArea.deleteMany()

  // Upsert areas
  const areaIds: Record<string, string> = {}
  for (const cfg of AREA_CONFIGS) {
    const area = await prisma.pTArea.upsert({
      where: { nombre: cfg.nombre },
      create: cfg,
      update: { color: cfg.color, icono: cfg.icono, orden: cfg.orden },
    })
    areaIds[cfg.nombre] = area.id
  }

  let totalCreated = 0
  for (const htmlArea of htmlAreas) {
    const areaNombre = AREA_MAP[htmlArea.nombre]
    const areaId = areaIds[areaNombre]
    if (!areaId) continue

    for (let si = 0; si < htmlArea.subareas.length; si++) {
      const htmlSub = htmlArea.subareas[si]
      const subarea = await prisma.pTSubArea.create({
        data: { areaId, nombre: htmlSub.nombre, entregables: htmlSub.entregables ?? [], orden: si },
      })
      for (let ti = 0; ti < htmlSub.tareas.length; ti++) {
        const t = htmlSub.tareas[ti]
        const diasSemana = (t.dias ?? []).map((d: string) => DIA_MAP[d]).filter(Boolean)
        await prisma.pTTareaTemplate.create({
          data: {
            areaId,
            subAreaId: subarea.id,
            responsableId: getResponsableId(t.puesto),
            nombre: t.nombre,
            descripcion: t.descripcion || null,
            tipo: t.tipo,
            frecuencia: inferFrecuencia(t.cuando),
            diasSemana,
            moduloDestino: t.moduloDestino || null,
            moduloTexto: t.moduloTexto || null,
            activa: true,
            orden: ti,
            impacto: t.impacto ?? 'estandar',
            contexto: inferContexto(t.cuando, t.nombre),
            cuando: t.cuando || null,
            puestoDefault: t.puesto || null,
            kpiNombre: t.kpi || null,
            estandarMinimo: t.estandar || null,
            porqueSeHace: t.porque || null,
            relacionCon: t.relacionCon || null,
            siNoSeHace: t.siNoSeHace || null,
            afectaA: t.afectaA ?? [],
            dependeDe: t.dependeDe != null ? (t.dependeDe as Prisma.InputJsonValue) : Prisma.JsonNull,
            bloqueaA: t.bloqueaA != null ? (t.bloqueaA as Prisma.InputJsonValue) : Prisma.JsonNull,
          },
        })
        totalCreated++
      }
    }
  }

  // Update KPI slugs
  const kpis = await prisma.pTKPI.findMany()
  let kpiUpdated = 0
  for (const kpi of kpis) {
    const slug = slugify(kpi.nombre)
    try {
      await prisma.pTKPI.update({ where: { id: kpi.id }, data: { slug } })
      kpiUpdated++
    } catch {
      try {
        await prisma.pTKPI.update({ where: { id: kpi.id }, data: { slug: slug + '-' + kpi.id.slice(-4) } })
        kpiUpdated++
      } catch { /* skip */ }
    }
  }

  const finalCount = await prisma.pTTareaTemplate.count()

  return NextResponse.json({
    message: 'Seed completado — ELIMINA este endpoint',
    deletedTemplates: deletedT.count,
    deletedSubareas: deletedS.count,
    totalCreated,
    finalCount,
    kpiSlugsUpdated: kpiUpdated,
    success: finalCount === 168,
  })
}
