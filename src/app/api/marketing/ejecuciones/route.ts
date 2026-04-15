import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes");
  const where = mes ? { mes } : {};
  const ejecuciones = await prisma.ejecucionCampana.findMany({
    where,
    include: { tipo: true },
    orderBy: { fechaInicio: "asc" },
  });
  return NextResponse.json({ ejecuciones });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json();
  const {
    tipoId, nombre, objetivo, canal, color, fechaInicio, fechaFin,
    estado, presupuesto, notas, mes,
    idMetaAds, alcance, impresiones, clics, ctr, cantResultados, costoResultado,
  } = body;
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  if (!fechaInicio || !fechaFin) return NextResponse.json({ error: "Fechas requeridas" }, { status: 400 });
  const ejecucion = await prisma.ejecucionCampana.create({
    data: {
      tipoId: tipoId || null,
      nombre: nombre.trim(),
      objetivo: objetivo || null,
      canal: canal || null,
      color: color || null,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      estado: estado ?? "PLANIFICADA",
      presupuesto: presupuesto ? parseFloat(presupuesto) : null,
      notas: notas || null,
      mes: mes ?? fechaInicio.slice(0, 7),
      idMetaAds: idMetaAds || null,
      alcance: alcance ? parseInt(alcance) : null,
      impresiones: impresiones ? parseInt(impresiones) : null,
      clics: clics ? parseInt(clics) : null,
      ctr: ctr ? parseFloat(ctr) : null,
      cantResultados: cantResultados ? parseInt(cantResultados) : null,
      costoResultado: costoResultado ? parseFloat(costoResultado) : null,
    },
    include: { tipo: true },
  });
  return NextResponse.json({ ejecucion }, { status: 201 });
}
