import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, puedeVerificar } from "@/lib/auth";
import { ensureReembolsos } from "@/lib/reembolsos";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureReembolsos();
  const { id } = await params;
  const solicitud = await prisma.solicitudReembolso.findUnique({ where: { id } });
  if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  if (solicitud.solicitanteId !== session.id && !puedeVerificar(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (solicitud.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Ya fue revisada; no se puede editar" }, { status: 400 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("concepto" in body) data.concepto = body.concepto?.trim();
  if ("monto" in body) data.monto = parseFloat(body.monto);
  if ("fechaGasto" in body) data.fechaGasto = new Date(body.fechaGasto);
  if ("categoriaId" in body) data.categoriaId = body.categoriaId || null;
  if ("proyectoId" in body) data.proyectoId = body.proyectoId || null;
  if ("comprobanteUrl" in body) data.comprobanteUrl = body.comprobanteUrl || null;
  if ("notas" in body) data.notas = body.notas || null;

  const actualizada = await prisma.solicitudReembolso.update({ where: { id }, data });
  return NextResponse.json({ solicitud: actualizada });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureReembolsos();
  const { id } = await params;
  const solicitud = await prisma.solicitudReembolso.findUnique({ where: { id } });
  if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  if (solicitud.solicitanteId !== session.id && !puedeVerificar(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (solicitud.estado === "APROBADO") {
    return NextResponse.json({ error: "Ya está aprobada y tiene una cuenta por pagar" }, { status: 400 });
  }

  await prisma.solicitudReembolso.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
