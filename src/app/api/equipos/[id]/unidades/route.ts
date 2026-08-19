import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Migración lazy YA APLICADA en prod (verificado 2026-08-19: equipo_unidades.voltaje
// ya existe). No-op: antes corría ALTER TABLE incondicional en cada GET/POST de
// esta ruta (detalle de equipo, muy visitada en Inventario), y ALTER TABLE ...
// ADD COLUMN IF NOT EXISTS toma un lock ACCESS EXCLUSIVE aunque la columna ya
// exista, bloqueando lecturas concurrentes de la tabla.
async function ensureVoltajeColumn() {}

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
  const skipIncrement = request.nextUrl.searchParams.get("skipIncrement") === "true";
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

  if (!skipIncrement) {
    await prisma.equipo.update({
      where: { id },
      data: { cantidadTotal: { increment: 1 } }
    });
  }

  return NextResponse.json({ unidad }, { status: 201 });
}
