import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/plan-trabajo/templates
// ?areaId=X         → returns full template list for that area
// ?responsableId=X  → returns all templates assigned to that user
// (no params)       → returns summary counts per area
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const areaId = searchParams.get('areaId')
  const responsableId = searchParams.get('responsableId')

  // ── Full template list by area ───────────────────────────────────────────────
  if (areaId) {
    const templates = await prisma.pTTareaTemplate.findMany({
      where: { areaId, activa: true },
      include: {
        area:        true,
        subArea:     true,
        responsable: { select: { id: true, name: true } },
      },
      orderBy: [
        { subArea: { orden: 'asc' } },
        { orden: 'asc' },
      ],
    })
    return NextResponse.json({ templates })
  }

  // ── Full template list by responsable (for "Por persona" view) ───────────────
  if (responsableId) {
    const templates = await prisma.pTTareaTemplate.findMany({
      where: { responsableId, activa: true },
      include: {
        area:        true,
        subArea:     true,
        responsable: { select: { id: true, name: true } },
      },
      orderBy: [
        { area: { orden: 'asc' } },
        { subArea: { orden: 'asc' } },
        { orden: 'asc' },
      ],
    })
    return NextResponse.json({ templates })
  }

  // ── Summary counts (default behaviour) ──────────────────────────────────────
  const [totalTemplates, areas] = await Promise.all([
    prisma.pTTareaTemplate.count({ where: { activa: true } }),
    prisma.pTArea.findMany({
      orderBy: { orden: 'asc' },
      include: {
        _count: { select: { templates: { where: { activa: true } } } },
        subareas: {
          orderBy: { orden: 'asc' },
          select: {
            id: true,
            nombre: true,
            _count: { select: { templates: { where: { activa: true } } } },
          },
        },
      },
    }),
  ])

  return NextResponse.json({ totalTemplates, areas })
}

// POST /api/plan-trabajo/templates — create a new template (ADMIN/DIRECTOR only)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (session.role !== 'ADMIN' && session.role !== 'DIRECTOR') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const {
    areaId, subAreaId, nombre, descripcion, tipo, frecuencia,
    diasSemana, horaLimite, responsableId, impacto, contexto,
    cuando, puestoDefault, estandarMinimo, porqueSeHace,
    relacionCon, siNoSeHace, semanaDeMes,
    tipoAsignacion, areaAsignada, esAccionCampo, moduloDestino, moduloTexto, moduloDisponible,
  } = body

  // Compute default orden from diasSemana (Feature 1B)
  const diasArr = Array.isArray(diasSemana) ? diasSemana.map(Number) : []
  const ordenDefault = diasArr.length > 0 ? Math.min(...diasArr) * 100 : 999

  if (!areaId || !subAreaId || !nombre) {
    return NextResponse.json(
      { error: 'areaId, subAreaId y nombre son requeridos' },
      { status: 400 }
    )
  }

  const template = await prisma.pTTareaTemplate.create({
    data: {
      areaId,
      subAreaId,
      nombre,
      descripcion:    descripcion    || null,
      tipo:           tipo           || 'CHECK',
      frecuencia:     frecuencia     || 'DIARIO',
      diasSemana:     diasSemana     || [],
      semanaDeMes:    Array.isArray(semanaDeMes) ? semanaDeMes : [],
      horaLimite:     horaLimite     || null,
      responsableId:  responsableId  || null,
      impacto:        impacto        || 'estandar',
      contexto:       contexto       || 'independiente',
      cuando:         cuando         || null,
      puestoDefault:  puestoDefault  || null,
      estandarMinimo: estandarMinimo || null,
      porqueSeHace:   porqueSeHace   || null,
      relacionCon:    relacionCon    || null,
      siNoSeHace:     siNoSeHace     || null,
      orden:          ordenDefault,
      tipoAsignacion: tipoAsignacion || 'individual',
      areaAsignada:   areaAsignada   || null,
      esAccionCampo:  esAccionCampo  ?? false,
      moduloDestino:  moduloDestino  || null,
      moduloTexto:    moduloTexto    || null,
      moduloDisponible: moduloDisponible ?? true,
    },
    include: {
      area:        true,
      subArea:     true,
      responsable: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ template }, { status: 201 })
}
