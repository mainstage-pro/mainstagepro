import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCampanaBriefColumns } from "@/lib/campana-brief-db";

// Resultados por periodo de una campaña unificada. Calcula CPM/CPC/CPL al vuelo.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCampanaBriefColumns();
  const { id } = await params;
  const body = await req.json();

  const impresiones = parseInt(body.impresiones) || 0;
  const alcance = parseInt(body.alcance) || 0;
  const clics = parseInt(body.clics) || 0;
  const leads = parseInt(body.leads) || 0;
  const gastado = parseFloat(body.gastado) || 0;

  const resultado = await prisma.resultadoCampana.create({
    data: {
      ejecucionId: id,
      fecha: body.fecha ? new Date(body.fecha) : new Date(),
      impresiones, alcance, clics, leads, gastado,
      cpm: impresiones > 0 ? (gastado / impresiones) * 1000 : null,
      cpc: clics > 0 ? gastado / clics : null,
      cpl: leads > 0 ? gastado / leads : null,
      frecuencia: alcance > 0 ? impresiones / alcance : null,
      notas: body.notas || null,
    },
  });
  return NextResponse.json({ resultado }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { resultadoId } = await req.json();
  if (!resultadoId) return NextResponse.json({ error: "resultadoId requerido" }, { status: 400 });
  await prisma.resultadoCampana.deleteMany({ where: { id: resultadoId, ejecucionId: id } });
  return NextResponse.json({ ok: true });
}
