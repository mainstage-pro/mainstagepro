import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ key: string; userId: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { key, userId } = await params;
  await prisma.moduloAcceso.deleteMany({ where: { moduloKey: key, userId } });
  return NextResponse.json({ ok: true });
}
