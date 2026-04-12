import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const INCLUDE = {
  asignadoA:  { select: { id: true, name: true } },
  creadoPor:  { select: { id: true, name: true } },
  iniciativa: { select: { id: true, nombre: true, color: true, area: true } },
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();

  const allowed = [
    "titulo", "descripcion", "prioridad", "area", "estado",
    "asignadoAId", "iniciativaId", "fechaVencimiento", "notas", "etiquetas",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    if (key === "fechaVencimiento") {
      data[key] = body[key] ? new Date(body[key]) : null;
    } else {
      data[key] = body[key];
    }
  }

  // Auto-gestión de fechaCompletada
  if ("estado" in data) {
    data.fechaCompletada = data.estado === "COMPLETADA" ? new Date() : null;
  }

  const tarea = await prisma.tarea.update({ where: { id }, data, include: INCLUDE });
  return NextResponse.json({ tarea });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  if (session.role !== "ADMIN") {
    const tarea = await prisma.tarea.findUnique({
      where: { id },
      select: { creadoPorId: true },
    });
    if (tarea?.creadoPorId !== session.id) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
  }

  await prisma.tarea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
