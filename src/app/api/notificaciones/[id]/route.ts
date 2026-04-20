import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH — marcar como leída (o leer todas si id = "todas")
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  if (id === "todas") {
    await prisma.notificacion.updateMany({
      where: { usuarioId: session.id, leida: false },
      data: { leida: true },
    });
    return NextResponse.json({ ok: true });
  }

  const notif = await prisma.notificacion.update({
    where: { id },
    data: { leida: true },
  });

  return NextResponse.json({ notif });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.notificacion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
