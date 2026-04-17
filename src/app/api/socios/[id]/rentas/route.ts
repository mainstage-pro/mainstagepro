import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes");
  const anio = searchParams.get("anio");

  const rentas = await prisma.socioRenta.findMany({
    where: {
      activo: { socioId: id },
      ...(mes ? { mes: parseInt(mes) } : {}),
      ...(anio ? { anio: parseInt(anio) } : {}),
    },
    orderBy: [{ anio: "desc" }, { mes: "desc" }, { createdAt: "desc" }],
    include: { activo: { select: { nombre: true, codigoInventario: true, categoria: true } } },
  });

  return NextResponse.json({ rentas });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { activoId, descripcion, proyectoId, mes, anio, fechaInicio, fechaFin, dias, notas } = body;

  if (!activoId || !descripcion || !mes || !anio) {
    return NextResponse.json({ error: "activoId, descripcion, mes y anio son requeridos" }, { status: 400 });
  }

  // Resolve activo and socio for pct calculation
  const activo = await prisma.socioActivo.findUnique({
    where: { id: activoId },
    include: { socio: { select: { pctSocio: true, pctMainstage: true } } },
  });
  if (!activo || activo.socioId !== id) {
    return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
  }

  const pctSocio = activo.pctSocioOverride ?? activo.socio.pctSocio;
  const pctMainstage = activo.pctMainstageOverride ?? activo.socio.pctMainstage;
  const diasNum = parseInt(dias) || 1;
  const subtotal = activo.precioDia * diasNum;
  const montoSocio = (subtotal * pctSocio) / 100;
  const montoMainstage = (subtotal * pctMainstage) / 100;

  const renta = await prisma.socioRenta.create({
    data: {
      activoId,
      descripcion,
      proyectoId: proyectoId || null,
      mes: parseInt(mes),
      anio: parseInt(anio),
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      dias: diasNum,
      precioDia: activo.precioDia,
      subtotal,
      pctSocio,
      pctMainstage,
      montoSocio,
      montoMainstage,
      notas: notas || null,
    },
    include: { activo: { select: { nombre: true, codigoInventario: true, categoria: true } } },
  });

  return NextResponse.json({ renta }, { status: 201 });
}
