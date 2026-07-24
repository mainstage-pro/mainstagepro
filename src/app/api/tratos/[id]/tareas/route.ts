import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";

const INCLUDE = {
  asignadoA:  { select: { id: true, name: true } },
  creadoPor:  { select: { id: true, name: true } },
  _count:     { select: { subtareas: true, comentarios: true, archivos: true } },
};

// Tareas ad-hoc ligadas a un trato de ventas (tipoOrigen TRATO). Mismo patrón
// que /api/proyectos/[id]/tareas para proyectos de evento.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTareaColumns();
  const { id: tratoId } = await params;

  const tareas = await prisma.tarea.findMany({
    where:   { tratoId, parentId: null, estado: { not: "CANCELADA" } },
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

  await ensureTareaColumns();
  const { id: tratoId } = await params;
  const body = await req.json();
  const {
    titulo, descripcion, prioridad, area,
    asignadoAId, fecha, fechaVencimiento, notas,
  } = body;

  if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    select: { id: true },
  });
  if (!trato) return NextResponse.json({ error: "Trato no encontrado" }, { status: 404 });

  const tarea = await prisma.tarea.create({
    data: {
      titulo:           titulo.trim(),
      descripcion:      descripcion      || null,
      prioridad:        prioridad        || "MEDIA",
      area:             area             || "VENTAS",
      asignadoAId:      asignadoAId      || null,
      creadoPorId:      session.id,
      tratoId,
      tipoOrigen:       "TRATO",
      fecha:            fecha            ? new Date(fecha) : null,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      notas:            notas            || null,
      orden:            0,
    },
    include: INCLUDE,
  });

  return NextResponse.json({ tarea }, { status: 201 });
}
