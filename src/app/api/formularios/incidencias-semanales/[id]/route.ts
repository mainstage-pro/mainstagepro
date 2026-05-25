import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const registro = await prisma.incidenciaSemanal.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, area: true } } },
  });

  if (!registro) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (registro.userId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  return NextResponse.json({ registro });
}
