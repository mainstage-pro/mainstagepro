import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/equipos/[id]/accesorios/[accesorioId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; accesorioId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { accesorioId } = await params;
  const body = await req.json();
  const { nombre, categoria } = body;

  const data: Record<string, string | null> = {};
  if (nombre !== undefined) data.nombre = nombre.trim();
  if (categoria !== undefined) data.categoria = categoria ?? null;

  const accesorio = await prisma.equipoAccesorio.update({
    where: { id: accesorioId },
    data,
  });
  return NextResponse.json({ accesorio });
}

// DELETE /api/equipos/[id]/accesorios/[accesorioId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; accesorioId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { accesorioId } = await params;
  await prisma.equipoAccesorio.delete({ where: { id: accesorioId } });
  return NextResponse.json({ ok: true });
}
