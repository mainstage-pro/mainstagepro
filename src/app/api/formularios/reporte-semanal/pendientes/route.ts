import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // 1. Tareas del módulo de Tareas (Operaciones) — pendientes o en progreso, con fecha y responsable
  const tareasOp = await prisma.tarea.findMany({
    where: {
      asignadoAId: session.id,
      estado: { in: ['PENDIENTE', 'EN_PROGRESO'] },
      parentId: null,
      fecha: { not: null }, // SOLO con fecha asignada
      // asignadoAId ya garantiza que tiene responsable
    },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      prioridad: true,
      area: true,
      estado: true,
      fecha: true,
      fechaVencimiento: true,
      recurrencia: true,
      createdAt: true,
      fechaCompletada: true,
      asignadoA:     { select: { id: true, name: true } },
      proyectoTarea: { select: { id: true, nombre: true, color: true } },
      seccion:       { select: { id: true, nombre: true } },
      juntaOrigen:   { select: { id: true, area: true, fecha: true } },
      _count:        { select: { subtareas: true, comentarios: true, archivos: true } },
    },
    orderBy: [
      { prioridad: 'asc' },
      { fecha: 'asc' },
    ],
    take: 30,
  })

  // 2. Compromisos del Plan de Trabajo — pendientes de semanas anteriores
  const lunesActual = new Date()
  const dow = lunesActual.getDay()
  lunesActual.setDate(lunesActual.getDate() - ((dow + 6) % 7))
  lunesActual.setHours(0, 0, 0, 0)

  const compromisosPlan = await prisma.pTTareaInstancia.findMany({
    where: {
      responsableId: session.id,
      estado: 'PENDIENTE',
      fechaVencimiento: { lt: lunesActual },
    },
    include: {
      template: {
        select: {
          nombre: true,
          impacto: true,
          area: { select: { nombre: true, color: true } },
        },
      },
    },
    orderBy: { fechaVencimiento: 'asc' },
    take: 20,
  })

  return NextResponse.json({
    tareasOperaciones: tareasOp.map(t => ({
      id: t.id,
      titulo: t.titulo,
      descripcion: t.descripcion ?? null,
      prioridad: t.prioridad,
      area: t.area,
      estado: t.estado,
      fecha: t.fecha?.toISOString().slice(0, 10) ?? null,
      fechaVencimiento: t.fechaVencimiento?.toISOString().slice(0, 10) ?? null,
      recurrencia: t.recurrencia ?? null,
      createdAt: t.createdAt.toISOString(),
      fechaCompletada: t.fechaCompletada?.toISOString() ?? null,
      asignadoA: t.asignadoA ?? null,
      proyectoTarea: t.proyectoTarea ?? null,
      seccion: t.seccion ?? null,
      juntaOrigenId: t.juntaOrigen?.id ?? null,
      juntaOrigen: t.juntaOrigen ? {
        id: t.juntaOrigen.id,
        area: t.juntaOrigen.area,
        fecha: t.juntaOrigen.fecha.toISOString(),
      } : null,
      _count: t._count,
    })),
    compromisosPlan: compromisosPlan.map(c => ({
      id: c.id,
      templateNombre: c.template.nombre,
      impacto: c.template.impacto,
      areaNombre: c.template.area.nombre,
      areaColor: c.template.area.color,
      fechaVencimiento: c.fechaVencimiento.toISOString().slice(0, 10),
    })),
  })
}
