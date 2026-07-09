import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCampanaBriefColumns } from "@/lib/campana-brief-db";
import { isBriefCompletoRaw } from "@/lib/campana-brief";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCampanaBriefColumns();
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
  await ensureCampanaBriefColumns();
  const body = await request.json();
  const {
    tipoId, nombre, objetivo, canal, color, fechaInicio, fechaFin,
    estado, presupuesto, notas, mes, brief,
    idMetaAds, alcance, impresiones, clics, ctr, cantResultados, costoResultado,
  } = body;
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  if (!fechaInicio || !fechaFin) return NextResponse.json({ error: "Fechas requeridas" }, { status: 400 });

  // Al crear, clonar la plantilla de brief del tipo si no viene un brief propio.
  let briefJson: string | null = brief || null;
  if (!briefJson && tipoId) {
    const tipo = await prisma.tipoCampana.findUnique({ where: { id: tipoId }, select: { briefTemplate: true } });
    briefJson = tipo?.briefTemplate ?? null;
  }
  const briefCompleto = isBriefCompletoRaw(briefJson);

  // No permitir crear una campaña ya en ejecución con brief incompleto.
  const estadoFinal = estado ?? "PLANIFICADA";
  if (estadoFinal === "EN_EJECUCION" && !briefCompleto) {
    return NextResponse.json({ error: "El brief debe estar completo antes de poner la campaña en ejecución." }, { status: 400 });
  }

  const ejecucion = await prisma.ejecucionCampana.create({
    data: {
      tipoId: tipoId || null,
      nombre: nombre.trim(),
      objetivo: objetivo || null,
      canal: canal || null,
      color: color || null,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      estado: estadoFinal,
      brief: briefJson,
      briefCompleto,
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
