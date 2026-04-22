import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { monto, motivo, concepto, fechaCompromiso } = body;

  if (monto !== undefined && (typeof monto !== "number" || monto < 0))
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  if (monto !== undefined && (!motivo || String(motivo).trim().length < 5))
    return NextResponse.json({ error: "El motivo del ajuste es obligatorio (mínimo 5 caracteres)" }, { status: 400 });

  const cxp = await prisma.cuentaPagar.findUnique({ where: { id } });
  if (!cxp) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (cxp.estado === "LIQUIDADO")
    return NextResponse.json({ error: "No se puede ajustar una cuenta ya liquidada" }, { status: 400 });

  const updateData: Record<string, unknown> = {};

  if (monto !== undefined) {
    if (!cxp.montoOriginal) updateData.montoOriginal = cxp.monto;

    const log: Array<{ fecha: string; de: number; a: number; motivo: string; usuario: string }> =
      cxp.ajustesLog ? JSON.parse(cxp.ajustesLog) : [];
    log.push({ fecha: new Date().toISOString(), de: cxp.monto, a: monto, motivo: String(motivo).trim(), usuario: session.name ?? session.email ?? "usuario" });
    updateData.ajustesLog = JSON.stringify(log);
    updateData.monto = monto;
  }

  if (concepto !== undefined) updateData.concepto = concepto;
  if (fechaCompromiso !== undefined) updateData.fechaCompromiso = new Date(fechaCompromiso);

  const updated = await prisma.cuentaPagar.update({ where: { id }, data: updateData });

  return NextResponse.json({ ok: true, cxp: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.cuentaPagar.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
