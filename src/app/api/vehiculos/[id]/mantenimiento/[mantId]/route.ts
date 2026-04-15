import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; mantId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { mantId } = await params;
  await prisma.mantenimientoVehiculo.delete({ where: { id: mantId } });
  return NextResponse.json({ ok: true });
}
