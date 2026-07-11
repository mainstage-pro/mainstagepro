import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

let voltajeColumnEnsured = false;
async function ensureVoltajeColumn() {
  if (voltajeColumnEnsured) return;
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "equipo_unidades" ADD COLUMN IF NOT EXISTS "voltaje" TEXT'
  );
  voltajeColumnEnsured = true;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureVoltajeColumn();
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

  await ensureVoltajeColumn();
  const { id } = await params;
  const body = await request.json();
  const { codigo, estado, voltaje, notas } = body;

  const unidad = await prisma.equipoUnidad.create({
    data: {
      equipoId: id,
      codigo: codigo || null,
      estado: estado ?? "ACTIVO",
      voltaje: voltaje || null,
      notas: notas || null,
    },
    include: {
      _count: { select: { mantenimientos: true } },
      mantenimientos: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true, proximoMantenimiento: true, tipo: true } },
    },
  });
  return NextResponse.json({ unidad }, { status: 201 });
}
