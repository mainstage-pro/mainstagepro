import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/iniciativas/[id]/subtareas/[subtareaId] — toggle completada o editar titulo
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subtareaId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { subtareaId } = await params;
  const body = await req.json();
  const { completada, titulo } = body;

  const updated = await prisma.subtareaIniciativa.update({
    where: { id: subtareaId },
    data: {
      ...(completada !== undefined && { completada }),
      ...(titulo     !== undefined && { titulo }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/iniciativas/[id]/subtareas/[subtareaId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; subtareaId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { subtareaId } = await params;
  await prisma.subtareaIniciativa.delete({ where: { id: subtareaId } });
  return NextResponse.json({ ok: true });
}
