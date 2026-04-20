import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createExpiringToken } from "@/lib/tokens";

// POST — generar token único para el portal del proveedor
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const token = createExpiringToken(365);
  const proveedor = await prisma.proveedor.update({
    where: { id },
    data: { portalToken: token },
    select: { id: true, portalToken: true },
  });
  return NextResponse.json({ portalToken: proveedor.portalToken });
}

// DELETE — revocar token
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  await prisma.proveedor.update({ where: { id }, data: { portalToken: null } });
  return NextResponse.json({ ok: true });
}
