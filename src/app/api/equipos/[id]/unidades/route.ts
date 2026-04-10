import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const unidades = await prisma.equipoUnidad.findMany({
    where: { equipoId: id },
    include: {
      _count: { select: { mantenimientos: true } },
      mantenimientos: {
        orderBy: { fecha: "desc" },
        take: 1,
        select: { fecha: true, proximoMantenimiento: true, tipo: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ unidades });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { codigo, estado, notas } = body;

  const unidad = await prisma.equipoUnidad.create({
    data: {
      equipoId: id,
      codigo: codigo || null,
      estado: estado ?? "ACTIVO",
      notas: notas || null,
    },
    include: {
      _count: { select: { mantenimientos: true } },
      mantenimientos: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true, proximoMantenimiento: true, tipo: true } },
    },
  });
  return NextResponse.json({ unidad }, { status: 201 });
}
