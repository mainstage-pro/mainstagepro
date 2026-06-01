import { PrismaClient, Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ─── Data types ───────────────────────────────────────────────────────────────

type HtmlTarea = {
  nombre: string
  tipo: 'CHECK' | 'ENTREGABLE'
  impacto: 'critico' | 'alto' | 'estandar'
  cuando: string
  dias: string[]      // ['L','M','X','J','V']
  puesto: string
  moduloTexto: string
  moduloDestino: string
  kpi: string
  descripcion: string
  estandar: string
  porque: string
  relacionCon: string
  siNoSeHace: string
  dependeDe: { tarea: string; puesto: string } | null
  bloqueaA: { tarea: string; puesto: string } | null
  afectaA: string[]
}

type HtmlSubarea = {
  nombre: string
  entregables: string[]
  tareas: HtmlTarea[]
}

type HtmlArea = {
  nombre: string
  icono: string
  color: string
  objetivo: string
  subareas: HtmlSubarea[]
}

// ─── Mappings ────────────────────────────────────────────────────────────────

const AREA_MAP: Record<string, { nombre: string; color: string; icono: string; orden: number }> = {
  'Operaciones Generales del Equipo': { nombre: 'Operaciones Generales', color: '#1C1C2E', icono: '⚙️',  orden: 0 },
  'Dirección General':               { nombre: 'Dirección',             color: '#1a1a2e', icono: '🎯',  orden: 1 },
  'Administración':                  { nombre: 'Administración',        color: '#16213e', icono: '📊',  orden: 2 },
  'Marketing':                       { nombre: 'Marketing',             color: '#1a472a', icono: '📣',  orden: 3 },
  'Ventas':                          { nombre: 'Ventas',                color: '#4a1942', icono: '💰',  orden: 4 },
  'Producción':                      { nombre: 'Producción',            color: '#7b2d00', icono: '🎪',  orden: 5 },
}

const DIA_MAP: Record<string, number> = { L: 1, M: 2, X: 3, J: 4, V: 5 }

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

function inferFrecuencia(cuando: string): string {
  const c = cuando.toLowerCase()
  if (c.includes('ltimo viernes') || c.includes('primer lunes') || c.includes('primer martes') || c.includes('1er lunes')) return 'MENSUAL'
  if (c.includes('trimest')) return 'TRIMESTRAL'
  if (c.includes('2 semanas') || c.includes('quincenal')) return 'QUINCENAL'
  if (c.includes('por evento') || c.includes('post-evento') || c.includes('día del evento') || c.includes('dia del evento') || c.includes('post evento')) return 'POR_EVENTO'
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
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function getResponsableId(puesto: string): string | null {
  for (const [key, userId] of Object.entries(PUESTO_USER)) {
    if (puesto.includes(key)) return userId
  }
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando seed Plan SO v2.0...')

  // 1. Parse HTML
  const htmlPath = path.join(__dirname, 'plan-trabajo-data.html')
  const html = fs.readFileSync(htmlPath, 'utf-8')
  const dataMatch = html.match(/let DATA = (\[[\s\S]*?\]);/)
  if (!dataMatch) throw new Error('No se encontró let DATA en el HTML')
  const areas: HtmlArea[] = JSON.parse(dataMatch[1])

  const totalTareas = areas.reduce((acc, a) => acc + a.subareas.reduce((s, sub) => s + sub.tareas.length, 0), 0)
  console.log(`📋 ${areas.length} áreas, ${totalTareas} tareas encontradas`)

  // 2. Clear templates and subareas (cascade)
  const deletedTemplates = await prisma.pTTareaTemplate.deleteMany()
  console.log(`🗑️  Borradas ${deletedTemplates.count} templates`)
  const deletedSubareas = await prisma.pTSubArea.deleteMany()
  console.log(`🗑️  Borradas ${deletedSubareas.count} subareas`)

  // 3. Upsert PTArea (preserves existing KPI links)
  const areaIds: Record<string, string> = {}
  for (const htmlArea of areas) {
    const mapping = AREA_MAP[htmlArea.nombre]
    if (!mapping) { console.warn('⚠️ No mapping for area:', htmlArea.nombre); continue }
    const area = await prisma.pTArea.upsert({
      where: { nombre: mapping.nombre },
      create: {
        nombre: mapping.nombre,
        color: mapping.color,
        icono: mapping.icono || htmlArea.icono,
        objetivo: htmlArea.objetivo,
        orden: mapping.orden,
      },
      update: {
        color: mapping.color,
        icono: mapping.icono || htmlArea.icono,
        objetivo: htmlArea.objetivo,
        orden: mapping.orden,
      },
    })
    areaIds[htmlArea.nombre] = area.id
    console.log(`  ✓ Área: ${area.nombre} (${area.id})`)
  }

  // 4. Create subareas and templates
  let totalCreated = 0
  for (const htmlArea of areas) {
    const areaId = areaIds[htmlArea.nombre]
    if (!areaId) continue

    for (let si = 0; si < htmlArea.subareas.length; si++) {
      const htmlSub = htmlArea.subareas[si]
      const subarea = await prisma.pTSubArea.create({
        data: {
          areaId,
          nombre: htmlSub.nombre,
          entregables: htmlSub.entregables ?? [],
          orden: si,
        },
      })

      for (let ti = 0; ti < htmlSub.tareas.length; ti++) {
        const t = htmlSub.tareas[ti]
        const diasSemana = (t.dias ?? []).map((d: string) => DIA_MAP[d]).filter(Boolean)
        const responsableId = getResponsableId(t.puesto)
        const frecuencia = inferFrecuencia(t.cuando)
        const contexto = inferContexto(t.cuando, t.nombre)

        await prisma.pTTareaTemplate.create({
          data: {
            areaId,
            subAreaId: subarea.id,
            responsableId,
            nombre: t.nombre,
            descripcion: t.descripcion || null,
            tipo: t.tipo,
            frecuencia,
            diasSemana,
            moduloDestino: t.moduloDestino || null,
            moduloTexto: t.moduloTexto || null,
            activa: true,
            orden: ti,
            // New SO v2.0 fields
            impacto: t.impacto ?? 'estandar',
            contexto,
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

  console.log(`\n✅ Templates creados: ${totalCreated}`)

  // 5. Verify
  const count = await prisma.pTTareaTemplate.count()
  console.log(`📊 Total en BD: ${count} (esperado: 168)`)
  if (count !== 168) {
    console.warn(`⚠️ Esperaba 168, tengo ${count}`)
  } else {
    console.log('✅ Seed completado correctamente — 168 tareas')
  }

  // 6. Update KPI slugs
  const kpis = await prisma.pTKPI.findMany()
  for (const kpi of kpis) {
    const slug = slugify(kpi.nombre)
    try {
      await prisma.pTKPI.update({ where: { id: kpi.id }, data: { slug } })
    } catch {
      // If slug collision, append area
      await prisma.pTKPI.update({ where: { id: kpi.id }, data: { slug: slug + '-' + kpi.id.slice(-4) } })
    }
  }
  console.log(`✓ ${kpis.length} KPI slugs actualizados`)

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
