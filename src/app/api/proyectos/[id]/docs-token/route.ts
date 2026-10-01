import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createExpiringToken } from "@/lib/tokens";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const proyecto = await prisma.proyecto.update({
    where: { id },
    data: { docsToken: createExpiringToken(180) },
    select: { docsToken: true },
  });

  return NextResponse.json({ token: proyecto.docsToken });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.proyecto.update({ where: { id }, data: { docsToken: null } });

  return NextResponse.json({ ok: true });
}
