import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; comentarioId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { comentarioId } = await params;
  const comentario = await prisma.tareaComentario.findUnique({ where: { id: comentarioId } });
  if (!comentario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (comentario.autorId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  await prisma.tareaComentario.delete({ where: { id: comentarioId } });
  return NextResponse.json({ ok: true });
}
