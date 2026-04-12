import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const INCLUDE = {
  asignadoA:  { select: { id: true, name: true } },
  creadoPor:  { select: { id: true, name: true } },
  iniciativa: { select: { id: true, nombre: true, color: true, area: true } },
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const area         = searchParams.get("area");
  const estado       = searchParams.get("estado");
  const asignadoAId  = searchParams.get("asignadoAId");
  const iniciativaId = searchParams.get("iniciativaId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (area)         where.area         = area;
  if (asignadoAId)  where.asignadoAId  = asignadoAId;
  if (iniciativaId) where.iniciativaId = iniciativaId;
  if (estado)       where.estado       = estado;
  else              where.estado       = { not: "CANCELADA" };

  const tareas = await prisma.tarea.findMany({
    where,
    include: INCLUDE,
    orderBy: [
      { fechaVencimiento: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ tareas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    titulo, descripcion, prioridad, area,
    asignadoAId, iniciativaId, fechaVencimiento, notas, etiquetas,
  } = body;

  if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const tarea = await prisma.tarea.create({
    data: {
      titulo:          titulo.trim(),
      descripcion:     descripcion     || null,
      prioridad:       prioridad       || "MEDIA",
      area:            area            || "GENERAL",
      asignadoAId:     asignadoAId     || null,
      iniciativaId:    iniciativaId    || null,
      fechaVencimiento:fechaVencimiento ? new Date(fechaVencimiento) : null,
      notas:           notas           || null,
      etiquetas:       etiquetas       ? JSON.stringify(etiquetas) : null,
      creadoPorId:     session.id,
    },
    include: INCLUDE,
  });

  return NextResponse.json({ tarea }, { status: 201 });
}
