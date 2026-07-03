import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let isAuthorized = session.role === "ADMIN";
  if (!isAuthorized) {
    const hasModule = await prisma.moduloAcceso.findFirst({ where: { userId: session.id, moduloKey: "admin-usuarios" } });
    if (hasModule) isAuthorized = true;
  }
  if (!isAuthorized) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { key } = await params;
  const { userId } = await req.json();

  const acceso = await prisma.moduloAcceso.upsert({
    where: { moduloKey_userId: { moduloKey: key, userId } },
    update: {},
    create: { moduloKey: key, userId },
  });

  return NextResponse.json({ acceso });
}
