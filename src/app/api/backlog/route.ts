import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const area   = searchParams.get("area");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (estado) where.estado = estado;
  else where.estado = "PENDIENTE";
  if (area) where.area = area;

  const items = await prisma.backlogItem.findMany({
    where,
    include: { creadoPor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { titulo, descripcion, area, tipo } = body;

  if (!titulo) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const item = await prisma.backlogItem.create({
    data: {
      titulo,
      descripcion: descripcion ?? null,
      area: area ?? null,
      tipo: tipo ?? "IDEA",
      creadoPorId: session.id,
    },
    include: { creadoPor: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ item }, { status: 201 });
}
