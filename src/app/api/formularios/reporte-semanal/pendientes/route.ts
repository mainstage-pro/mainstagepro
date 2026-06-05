import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)

  // 1. Tareas del módulo de Tareas (Operaciones) — pendientes o en progreso
  const tareasOperaciones = await prisma.tarea.findMany({
    where: {
      asignadoAId: session.id,
      estado: { in: ['PENDIENTE', 'EN_PROGRESO'] },
      parentId: null, // solo top-level
    },
    select: {
      id: true,
      titulo: true,
      prioridad: true,
      estado: true,
      fecha: true,
      fechaVencimiento: true,
      proyectoTarea: { select: { nombre: true } },
    },
    orderBy: [
      { prioridad: 'asc' },
      { fechaVencimiento: 'asc' },
    ],
    take: 20,
  })

  // 2. Compromisos del Plan de Trabajo — pendientes de semanas anteriores
  // Buscar instancias donde fechaVencimiento < lunes actual Y estado = PENDIENTE
  const lunesActual = new Date()
  const dow = lunesActual.getDay()
  lunesActual.setDate(lunesActual.getDate() - ((dow + 6) % 7))
  lunesActual.setHours(0, 0, 0, 0)

  const compromisosPlan = await prisma.pTTareaInstancia.findMany({
    where: {
      responsableId: session.id,
      estado: 'PENDIENTE',
      fechaVencimiento: { lt: lunesActual }, // semanas anteriores solamente
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
    tareasOperaciones: tareasOperaciones.map(t => ({
      id: t.id,
      titulo: t.titulo,
      prioridad: t.prioridad,
      estado: t.estado,
      fecha: t.fecha?.toISOString().slice(0, 10) ?? null,
      fechaVencimiento: t.fechaVencimiento?.toISOString().slice(0, 10) ?? null,
      proyecto: t.proyectoTarea?.nombre ?? null,
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
