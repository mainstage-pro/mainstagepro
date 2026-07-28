import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const allowed = ["descripcion","periodoNomina","montoCalculado","aplicada","notificada","evidenciaUrl"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  // Flujo proponer/aprobar: al aprobar o rechazar se sella quién y cuándo.
  if (body.estado && ["PROPUESTA","APROBADA","RECHAZADA"].includes(body.estado)) {
    data.estado = body.estado;
    if (body.estado === "APROBADA" || body.estado === "RECHAZADA") {
      data.aprobadaPor = session.name ?? session.email ?? "—";
      data.aprobadaEn = new Date();
    } else {
      data.aprobadaPor = null;
      data.aprobadaEn = null;
    }
  }

  const incidencia = await prisma.incidencia.update({ where: { id }, data });
  return NextResponse.json({ incidencia });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.incidencia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
