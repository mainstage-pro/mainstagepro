import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/ideas/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { titulo, nota, area, tipo, estado, convertidaA } = body;

  const updated = await prisma.idea.update({
    where: { id },
    data: {
      ...(titulo      !== undefined && { titulo }),
      ...(nota        !== undefined && { nota }),
      ...(area        !== undefined && { area }),
      ...(tipo        !== undefined && { tipo }),
      ...(estado      !== undefined && { estado }),
      ...(convertidaA !== undefined && { convertidaA }),
    },
    include: { usuario: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/ideas/[id] — soft delete (marca como descartada)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const updated = await prisma.idea.update({
    where: { id },
    data: { estado: "descartada" },
  });

  return NextResponse.json(updated);
}
