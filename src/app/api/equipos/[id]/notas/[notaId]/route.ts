import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; notaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { notaId } = await params;
  const nota = await prisma.equipoNota.findUnique({ where: { id: notaId } });
  if (!nota) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (nota.creadoPorId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo puedes eliminar tus propias notas" }, { status: 403 });
  }
  await prisma.equipoNota.delete({ where: { id: notaId } });
  return NextResponse.json({ ok: true });
}
