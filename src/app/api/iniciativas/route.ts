import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const iniciativas = await prisma.iniciativaExterna.findMany({
    where: { estado: { not: "ARCHIVADA" } },
    include: {
      _count:  { select: { tareas: true } },
      tareas:  { where: { estado: { not: "COMPLETADA" } }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ iniciativas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, descripcion, area, color, fechaInicio, fechaFin } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const iniciativa = await prisma.iniciativaExterna.create({
    data: {
      nombre:     nombre.trim(),
      descripcion:descripcion  || null,
      area:       area         || "GENERAL",
      color:      color        || null,
      fechaInicio:fechaInicio  ? new Date(fechaInicio) : null,
      fechaFin:   fechaFin     ? new Date(fechaFin)    : null,
      creadoPorId:session.id,
    },
  });

  return NextResponse.json({ iniciativa }, { status: 201 });
}
