import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createExpiringToken } from "@/lib/tokens";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const token = createExpiringToken(365);

  const proyecto = await prisma.proyecto.update({
    where: { id },
    data: { portalToken: token },
    select: { portalToken: true },
  });

  return NextResponse.json({ token: proyecto.portalToken });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.proyecto.update({
    where: { id },
    data: { portalToken: null },
  });

  return NextResponse.json({ ok: true });
}
