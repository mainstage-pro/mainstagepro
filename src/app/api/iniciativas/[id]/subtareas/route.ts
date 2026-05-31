import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/iniciativas/[id]/subtareas
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: iniciativaId } = await params;
  const { titulo } = await req.json();

  if (!titulo?.trim()) {
    return NextResponse.json({ error: "titulo requerido" }, { status: 400 });
  }

  // Calcular orden como max + 1
  const last = await prisma.subtareaIniciativa.findFirst({
    where: { iniciativaId },
    orderBy: { orden: "desc" },
  });

  const subtarea = await prisma.subtareaIniciativa.create({
    data: {
      iniciativaId,
      titulo: titulo.trim(),
      orden: (last?.orden ?? -1) + 1,
    },
  });

  return NextResponse.json(subtarea, { status: 201 });
}
