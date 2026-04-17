import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const reportes = await prisma.socioReporte.findMany({
    where: { socioId: id },
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
  });

  return NextResponse.json({ reportes });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { mes, anio } = body;

  if (!mes || !anio) return NextResponse.json({ error: "Mes y año requeridos" }, { status: 400 });

  const mesNum = parseInt(mes);
  const anioNum = parseInt(anio);

  // Aggregate all rentas for this socio in this month
  const rentas = await prisma.socioRenta.findMany({
    where: { activo: { socioId: id }, mes: mesNum, anio: anioNum },
  });

  const totalEventos = rentas.length;
  const totalDias = rentas.reduce((s, r) => s + r.dias, 0);
  const totalFacturado = rentas.reduce((s, r) => s + r.subtotal, 0);
  const totalSocio = rentas.reduce((s, r) => s + r.montoSocio, 0);
  const totalMainstage = rentas.reduce((s, r) => s + r.montoMainstage, 0);

  const reporte = await prisma.socioReporte.upsert({
    where: { socioId_mes_anio: { socioId: id, mes: mesNum, anio: anioNum } },
    create: {
      socioId: id,
      mes: mesNum,
      anio: anioNum,
      totalEventos,
      totalDias,
      totalFacturado,
      totalSocio,
      totalMainstage,
    },
    update: {
      totalEventos,
      totalDias,
      totalFacturado,
      totalSocio,
      totalMainstage,
      // Reset to BORRADOR if regenerated while not yet paid
      estado: "BORRADOR",
    },
  });

  return NextResponse.json({ reporte }, { status: 201 });
}
