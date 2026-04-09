import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: agregar item al checklist
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { item } = await req.json();
  if (!item) return NextResponse.json({ error: "item requerido" }, { status: 400 });

  const count = await prisma.proyectoChecklist.count({ where: { proyectoId: id } });
  const check = await prisma.proyectoChecklist.create({
    data: { proyectoId: id, item, orden: count, completado: false },
  });
  return NextResponse.json({ check });
}

// PATCH: toggle completado
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { checkId, completado } = await req.json();

  const check = await prisma.proyectoChecklist.update({
    where: { id: checkId, proyectoId: id },
    data: {
      completado,
      fechaCompletado: completado ? new Date() : null,
    },
  });
  return NextResponse.json({ check });
}
