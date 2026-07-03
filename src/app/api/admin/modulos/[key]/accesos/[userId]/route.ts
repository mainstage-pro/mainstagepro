import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ key: string; userId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let isAuthorized = session.role === "ADMIN";
  if (!isAuthorized) {
    const hasModule = await prisma.moduloAcceso.findFirst({ where: { userId: session.id, moduloKey: "admin-usuarios" } });
    if (hasModule) isAuthorized = true;
  }
  if (!isAuthorized) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { key, userId } = await params;
  await prisma.moduloAcceso.deleteMany({ where: { moduloKey: key, userId } });
  return NextResponse.json({ ok: true });
}
