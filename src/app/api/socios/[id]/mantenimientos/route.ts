import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const mantenimientos = await prisma.socioMantenimiento.findMany({
    where: { activo: { socioId: id } },
    orderBy: { createdAt: "desc" },
    include: { activo: { select: { nombre: true, codigoInventario: true } } },
  });

  return NextResponse.json({ mantenimientos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { activoId, tipo, descripcion, fechaEjecucion, costoTotal, costoSocio, costoMainstage, realizadoPor, notas } = body;

  if (!activoId || !tipo || !descripcion) {
    return NextResponse.json({ error: "activoId, tipo y descripcion son requeridos" }, { status: 400 });
  }

  // Verify activo belongs to socio
  const activo = await prisma.socioActivo.findFirst({ where: { id: activoId, socioId: id } });
  if (!activo) return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });

  const cTotal = parseFloat(costoTotal) || 0;
  const cSocio = parseFloat(costoSocio) || 0;
  const cMainstage = parseFloat(costoMainstage) || 0;

  const mantenimiento = await prisma.socioMantenimiento.create({
    data: {
      activoId,
      tipo,
      descripcion,
      fechaEjecucion: fechaEjecucion ? new Date(fechaEjecucion) : null,
      costoTotal: cTotal,
      costoSocio: cSocio,
      costoMainstage: cMainstage,
      realizadoPor: realizadoPor || null,
      notas: notas || null,
    },
    include: { activo: { select: { nombre: true, codigoInventario: true } } },
  });

  return NextResponse.json({ mantenimiento }, { status: 201 });
}
