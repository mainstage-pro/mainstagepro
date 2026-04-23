import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const INCLUDE = {
  asignadoA:  { select: { id: true, name: true } },
  creadoPor:  { select: { id: true, name: true } },
  _count:     { select: { subtareas: true, comentarios: true, archivos: true } },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: proyectoId } = await params;

  const tareas = await prisma.tarea.findMany({
    where:   { proyectoEventoId: proyectoId, parentId: null, estado: { not: "CANCELADA" } },
    include: INCLUDE,
    orderBy: [{ orden: "asc" }, { fecha: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tareas });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: proyectoId } = await params;
  const body = await req.json();
  const {
    titulo, descripcion, prioridad, area,
    asignadoAId, fecha, fechaVencimiento, notas,
  } = body;

  if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true },
  });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const tarea = await prisma.tarea.create({
    data: {
      titulo:           titulo.trim(),
      descripcion:      descripcion      || null,
      prioridad:        prioridad        || "MEDIA",
      area:             area             || "PRODUCCION",
      asignadoAId:      asignadoAId      || null,
      creadoPorId:      session.id,
      proyectoEventoId: proyectoId,
      fecha:            fecha            ? new Date(fecha) : null,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      notas:            notas            || null,
      orden:            0,
    },
    include: INCLUDE,
  });

  return NextResponse.json({ tarea }, { status: 201 });
}
