import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/captura/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { tipo, area, clasificado } = body;

  const updated = await prisma.capturaRapida.update({
    where: { id },
    data: {
      ...(tipo      !== undefined && { tipo }),
      ...(area      !== undefined && { area }),
      ...(clasificado !== undefined && { clasificado }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/captura/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.capturaRapida.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
