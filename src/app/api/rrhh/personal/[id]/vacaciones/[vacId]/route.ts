import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; vacId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { vacId } = await params;
  const body = await req.json();
  const estados = ["PENDIENTE", "APROBADA", "RECHAZADA", "CANCELADA"];
  if (!estados.includes(body.estado)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  const solicitud = await prisma.solicitudVacaciones.update({
    where: { id: vacId },
    data: {
      estado: body.estado,
      aprobadaPor: body.estado === "APROBADA" ? (session.name ?? null) : null,
      aprobadaEn: body.estado === "APROBADA" ? new Date() : null,
    },
  });
  return NextResponse.json({ solicitud });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; vacId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { vacId } = await params;
  await prisma.solicitudVacaciones.delete({ where: { id: vacId } });
  return NextResponse.json({ ok: true });
}
