import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { key } = await params;
  const { userId } = await req.json();

  const acceso = await prisma.moduloAcceso.upsert({
    where: { moduloKey_userId: { moduloKey: key, userId } },
    update: {},
    create: { moduloKey: key, userId },
  });

  return NextResponse.json({ acceso });
}
