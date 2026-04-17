import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; reporteId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { reporteId } = await params;
  const body = await req.json();

  const reporte = await prisma.socioReporte.update({
    where: { id: reporteId },
    data: {
      ...(body.estado !== undefined && { estado: body.estado }),
      ...(body.notas !== undefined && { notas: body.notas || null }),
      ...(body.estado === "PAGADO" && { pagadoEn: new Date() }),
    },
  });

  return NextResponse.json({ reporte });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; reporteId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { reporteId } = await params;
  await prisma.socioReporte.delete({ where: { id: reporteId } });
  return NextResponse.json({ ok: true });
}
