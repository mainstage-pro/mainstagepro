import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { monto, motivo, concepto, fechaCompromiso, clienteId, cuentaDestinoId } = body;

  if (monto !== undefined && (typeof monto !== "number" || monto < 0))
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  if (monto !== undefined && (!motivo || String(motivo).trim().length < 5))
    return NextResponse.json({ error: "El motivo del ajuste es obligatorio (mínimo 5 caracteres)" }, { status: 400 });

  const cxc = await prisma.cuentaCobrar.findUnique({ where: { id } });
  if (!cxc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (cxc.estado === "LIQUIDADO")
    return NextResponse.json({ error: "No se puede ajustar una cuenta ya liquidada" }, { status: 400 });

  const updateData: Record<string, unknown> = {};

  if (monto !== undefined) {
    // Set montoOriginal only on first adjustment
    if (!cxc.montoOriginal) updateData.montoOriginal = cxc.monto;

    // Append to ajustesLog
    const log: Array<{ fecha: string; de: number; a: number; motivo: string; usuario: string }> =
      cxc.ajustesLog ? JSON.parse(cxc.ajustesLog) : [];
    log.push({ fecha: new Date().toISOString(), de: cxc.monto, a: monto, motivo: String(motivo).trim(), usuario: session.name ?? session.email ?? "usuario" });
    updateData.ajustesLog = JSON.stringify(log);
    updateData.monto = monto;
  }

  if (concepto !== undefined) updateData.concepto = concepto;
  if (fechaCompromiso !== undefined) updateData.fechaCompromiso = new Date(fechaCompromiso);
  if (clienteId !== undefined) updateData.clienteId = clienteId || null;
  if (cuentaDestinoId !== undefined) updateData.cuentaDestinoId = cuentaDestinoId || null;

  const updated = await prisma.cuentaCobrar.update({ where: { id }, data: updateData });

  return NextResponse.json({ ok: true, cxc: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  await prisma.cuentaCobrar.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
