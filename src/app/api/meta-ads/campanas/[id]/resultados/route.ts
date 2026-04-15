import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: campanaId } = await params;
  const body = await req.json();

  const gastado = parseFloat(body.gastado) || 0;
  const leads = parseInt(body.leads) || 0;
  const clics = parseInt(body.clics) || 0;
  const alcance = parseInt(body.alcance) || 0;
  const impresiones = parseInt(body.impresiones) || 0;

  const resultado = await prisma.metaResultado.create({
    data: {
      campanaId,
      fecha: body.fecha ? new Date(body.fecha) : new Date(),
      impresiones,
      alcance,
      clics,
      leads,
      gastado,
      cpm: impresiones > 0 ? (gastado / impresiones) * 1000 : null,
      cpc: clics > 0 ? gastado / clics : null,
      cpl: leads > 0 ? gastado / leads : null,
      frecuencia: alcance > 0 ? impresiones / alcance : null,
      notas: body.notas || null,
    },
  });

  return NextResponse.json({ resultado });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { resultadoId } = body;
  if (!resultadoId) return NextResponse.json({ error: "resultadoId requerido" }, { status: 400 });

  await prisma.metaResultado.delete({ where: { id: resultadoId } });
  return NextResponse.json({ ok: true });
}
