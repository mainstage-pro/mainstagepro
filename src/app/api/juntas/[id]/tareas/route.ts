import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: juntaId } = await params;

  // Verify junta exists
  const junta = await prisma.junta.findUnique({ where: { id: juntaId }, select: { id: true, area: true } });
  if (!junta) return NextResponse.json({ error: "Junta no encontrada" }, { status: 404 });

  const body = await req.json();
  const { titulo, descripcion, prioridad, asignadoAId, fechaVencimiento, proyectoTareaId } = body;

  if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const tarea = await prisma.tarea.create({
    data: {
      titulo:          titulo.trim(),
      descripcion:     descripcion      || null,
      prioridad:       prioridad        || "MEDIA",
      area:            junta.area === "GLOBAL" ? "GENERAL" : junta.area,
      estado:          "PENDIENTE",
      asignadoAId:     asignadoAId      || null,
      creadoPorId:     session.id,
      proyectoTareaId: proyectoTareaId  || null,
      fechaVencimiento:fechaVencimiento ? new Date(fechaVencimiento) : null,
      juntaOrigenId:   juntaId,
    },
    select: {
      id: true, titulo: true, descripcion: true, prioridad: true,
      estado: true, fechaVencimiento: true, createdAt: true,
      asignadoA:    { select: { id: true, name: true } },
      proyectoTarea: { select: { id: true, nombre: true } },
    },
  });

  // Notify assignee if different from creator
  if (asignadoAId && asignadoAId !== session.id) {
    await prisma.notificacion.create({
      data: {
        usuarioId: asignadoAId,
        tipo:      "SISTEMA",
        titulo:    "Nueva tarea asignada desde junta",
        mensaje:   `${session.name} te asignó: "${titulo.trim()}"`,
        url:       `/operaciones`,
      },
    });
  }

  return NextResponse.json({ tarea }, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: juntaId } = await params;

  const tareas = await prisma.tarea.findMany({
    where:   { juntaOrigenId: juntaId, parentId: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, titulo: true, descripcion: true, prioridad: true,
      estado: true, fechaVencimiento: true, createdAt: true,
      asignadoA:    { select: { id: true, name: true } },
      proyectoTarea: { select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json({ tareas });
}
