import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Pick allowed fields
  const {
    nombre, descripcion, tipo, frecuencia, diasSemana, horaLimite,
    moduloDestino, moduloTexto, activa, responsableId,
    impacto, contexto, cuando, puestoDefault, kpiNombre,
    estandarMinimo, porqueSeHace, relacionCon, siNoSeHace,
    afectaA, dependeDe, bloqueaA,
    tipoAsignacion, areaAsignada, subAreaId,
  } = body

  const data: Record<string, unknown> = {}
  if (nombre      !== undefined) data.nombre      = nombre
  if (descripcion !== undefined) data.descripcion = descripcion
  if (tipo        !== undefined) data.tipo        = tipo
  if (frecuencia  !== undefined) data.frecuencia  = frecuencia
  if (diasSemana  !== undefined) data.diasSemana  = diasSemana
  if (horaLimite  !== undefined) data.horaLimite  = horaLimite
  if (moduloDestino !== undefined) data.moduloDestino = moduloDestino
  if (moduloTexto   !== undefined) data.moduloTexto   = moduloTexto
  if (activa      !== undefined) data.activa      = activa
  if (responsableId !== undefined) data.responsableId = responsableId || null
  if (impacto     !== undefined) data.impacto     = impacto
  if (contexto    !== undefined) data.contexto    = contexto
  if (cuando      !== undefined) data.cuando      = cuando
  if (puestoDefault !== undefined) data.puestoDefault = puestoDefault
  if (kpiNombre   !== undefined) data.kpiNombre   = kpiNombre
  if (estandarMinimo !== undefined) data.estandarMinimo = estandarMinimo
  if (porqueSeHace   !== undefined) data.porqueSeHace   = porqueSeHace
  if (relacionCon    !== undefined) data.relacionCon    = relacionCon
  if (siNoSeHace     !== undefined) data.siNoSeHace     = siNoSeHace
  if (afectaA        !== undefined) data.afectaA        = afectaA
  if (dependeDe      !== undefined) data.dependeDe      = dependeDe
  if (bloqueaA       !== undefined) data.bloqueaA       = bloqueaA
  if (tipoAsignacion !== undefined) data.tipoAsignacion = tipoAsignacion
  if (areaAsignada   !== undefined) data.areaAsignada   = areaAsignada
  if (subAreaId      !== undefined) data.subAreaId      = subAreaId

  const template = await prisma.pTTareaTemplate.update({
    where: { id },
    data,
    include: {
      area: true,
      subArea: true,
      responsable: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ template })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params

  // Soft delete
  const template = await prisma.pTTareaTemplate.update({
    where: { id },
    data: { activa: false },
  })

  return NextResponse.json({ template })
}
