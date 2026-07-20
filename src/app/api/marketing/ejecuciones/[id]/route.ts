import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCampanaBriefColumns } from "@/lib/campana-brief-db";
import { isBriefCompletoRaw } from "@/lib/campana-brief";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCampanaBriefColumns();
  const { id } = await params;
  const body = await request.json();
  const {
    nombre, objetivo, canal, color, fechaInicio, fechaFin, estado,
    presupuesto, notas, mes, tipoId, brief, audiencia, ubicaciones,
    idMetaAds, alcance, impresiones, clics, ctr, cantResultados, costoResultado,
  } = body;

  // briefCompleto se recalcula cuando cambia el brief.
  const briefCompleto = brief !== undefined ? isBriefCompletoRaw(brief) : undefined;

  // Regla: no se puede poner una campaña EN_EJECUCION si su brief no está completo.
  if (estado === "EN_EJECUCION") {
    const completo = briefCompleto ??
      (await prisma.ejecucionCampana.findUnique({ where: { id }, select: { briefCompleto: true } }))?.briefCompleto ??
      false;
    if (!completo) {
      return NextResponse.json({ error: "El brief debe estar completo antes de poner la campaña en ejecución." }, { status: 400 });
    }
  }

  const ejecucion = await prisma.ejecucionCampana.update({
    where: { id },
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(objetivo !== undefined && { objetivo: objetivo || null }),
      ...(canal !== undefined && { canal: canal || null }),
      ...(color !== undefined && { color: color || null }),
      ...(fechaInicio !== undefined && { fechaInicio: new Date(fechaInicio) }),
      ...(fechaFin !== undefined && { fechaFin: new Date(fechaFin) }),
      ...(estado !== undefined && { estado }),
      ...(brief !== undefined && { brief: brief || null }),
      ...(briefCompleto !== undefined && { briefCompleto }),
      ...(presupuesto !== undefined && { presupuesto: presupuesto ? parseFloat(presupuesto) : null }),
      ...(notas !== undefined && { notas: notas || null }),
      ...(mes !== undefined && { mes }),
      ...(tipoId !== undefined && { tipoId: tipoId || null }),
      ...(audiencia !== undefined && { audiencia: audiencia || null }),
      ...(ubicaciones !== undefined && { ubicaciones: ubicaciones || null }),
      ...(idMetaAds !== undefined && { idMetaAds: idMetaAds || null }),
      ...(alcance !== undefined && { alcance: alcance ? parseInt(alcance) : null }),
      ...(impresiones !== undefined && { impresiones: impresiones ? parseInt(impresiones) : null }),
      ...(clics !== undefined && { clics: clics ? parseInt(clics) : null }),
      ...(ctr !== undefined && { ctr: ctr ? parseFloat(ctr) : null }),
      ...(cantResultados !== undefined && { cantResultados: cantResultados ? parseInt(cantResultados) : null }),
      ...(costoResultado !== undefined && { costoResultado: costoResultado ? parseFloat(costoResultado) : null }),
    },
    include: { tipo: true, resultados: { orderBy: { fecha: "desc" } }, anuncios: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({ ejecucion });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.ejecucionCampana.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
