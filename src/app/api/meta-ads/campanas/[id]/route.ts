import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const campana = await prisma.metaCampana.findUnique({
    where: { id },
    include: {
      anuncios: { orderBy: { createdAt: "asc" } },
      resultados: { orderBy: { fecha: "asc" } },
    },
  });

  if (!campana) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ campana });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ["nombre", "objetivo", "estado", "presupuesto", "fechaInicio", "fechaFin", "audiencia", "ubicaciones", "notas"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if ((k === "fechaInicio" || k === "fechaFin") && body[k]) data[k] = new Date(body[k]);
      else if (k === "presupuesto") data[k] = parseFloat(body[k]) || 0;
      else data[k] = body[k] || null;
    }
  }

  const campana = await prisma.metaCampana.update({ where: { id }, data });
  return NextResponse.json({ campana });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.metaCampana.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
