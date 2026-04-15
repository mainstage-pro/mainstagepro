import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const {
    nombre, objetivo, canal, color, fechaInicio, fechaFin, estado,
    presupuesto, notas, mes, tipoId,
    idMetaAds, alcance, impresiones, clics, ctr, cantResultados, costoResultado,
  } = body;
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
      ...(presupuesto !== undefined && { presupuesto: presupuesto ? parseFloat(presupuesto) : null }),
      ...(notas !== undefined && { notas: notas || null }),
      ...(mes !== undefined && { mes }),
      ...(tipoId !== undefined && { tipoId: tipoId || null }),
      ...(idMetaAds !== undefined && { idMetaAds: idMetaAds || null }),
      ...(alcance !== undefined && { alcance: alcance ? parseInt(alcance) : null }),
      ...(impresiones !== undefined && { impresiones: impresiones ? parseInt(impresiones) : null }),
      ...(clics !== undefined && { clics: clics ? parseInt(clics) : null }),
      ...(ctr !== undefined && { ctr: ctr ? parseFloat(ctr) : null }),
      ...(cantResultados !== undefined && { cantResultados: cantResultados ? parseInt(cantResultados) : null }),
      ...(costoResultado !== undefined && { costoResultado: costoResultado ? parseFloat(costoResultado) : null }),
    },
    include: { tipo: true },
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
