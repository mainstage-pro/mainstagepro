import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const vehiculo = await prisma.vehiculo.findUnique({
    where: { id },
    include: { mantenimientos: { orderBy: { fecha: "desc" } } },
  });

  if (!vehiculo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ vehiculo });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const vehiculo = await prisma.vehiculo.update({
    where: { id },
    data: {
      nombre: body.nombre || undefined,
      marca: body.marca !== undefined ? (body.marca || null) : undefined,
      modelo: body.modelo !== undefined ? (body.modelo || null) : undefined,
      anio: body.anio !== undefined ? (body.anio ? parseInt(body.anio) : null) : undefined,
      placas: body.placas !== undefined ? (body.placas || null) : undefined,
      color: body.color !== undefined ? (body.color || null) : undefined,
      kilometraje: body.kilometraje !== undefined ? (body.kilometraje ? parseInt(body.kilometraje) : null) : undefined,
      proximoServicioKm: body.proximoServicioKm !== undefined ? (body.proximoServicioKm ? parseInt(body.proximoServicioKm) : null) : undefined,
      proximoServicioFecha: body.proximoServicioFecha !== undefined ? (body.proximoServicioFecha ? new Date(body.proximoServicioFecha) : null) : undefined,
      activo: body.activo !== undefined ? Boolean(body.activo) : undefined,
      notas: body.notas !== undefined ? (body.notas || null) : undefined,
    },
  });

  return NextResponse.json({ vehiculo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.vehiculo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
