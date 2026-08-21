import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { monto, motivo, concepto, fechaCompromiso, clienteId, cuentaDestinoId, editarSiguientes } = body;

  if (monto !== undefined && (typeof monto !== "number" || monto < 0))
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  if (monto !== undefined && (!motivo || String(motivo).trim().length < 5))
    return NextResponse.json({ error: "El motivo del ajuste es obligatorio (mínimo 5 caracteres)" }, { status: 400 });

  const cxc = await prisma.cuentaCobrar.findUnique({ where: { id } });
  if (!cxc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (cxc.estado === "LIQUIDADO")
    return NextResponse.json({ error: "No se puede ajustar una cuenta ya liquidada" }, { status: 400 });

  // Marcar como liquidado manualmente
  if (body.marcarLiquidado === true) {
    const montoCobradoFinal = typeof body.montoCobrado === "number" ? body.montoCobrado : cxc.monto;
    const updated = await prisma.cuentaCobrar.update({
      where: { id },
      data: {
        montoCobrado: montoCobradoFinal,
        estado: montoCobradoFinal >= cxc.monto ? "LIQUIDADO" : "PARCIAL",
        fechaCobroReal: montoCobradoFinal >= cxc.monto ? new Date() : undefined,
      },
    });
    return NextResponse.json({ ok: true, cxc: updated });
  }

  const updateData: Record<string, unknown> = {};

  if (monto !== undefined) {
    if (!cxc.montoOriginal) updateData.montoOriginal = cxc.monto;
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

  // Actualización masiva si es serie y se seleccionó 'editarSiguientes'
  if (editarSiguientes && cxc.serieRecurrenteId && cxc.numeroPeriodo) {
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar esta cuenta
      await tx.cuentaCobrar.update({ where: { id }, data: updateData });

      // 2. Preparar update masivo para las siguientes (no tocamos fecha ni concepto porque el concepto tiene el numero de periodo)
      // Solo actualizamos monto y clienteId
      const massUpdate: any = {};
      if (monto !== undefined) massUpdate.monto = monto;
      if (clienteId !== undefined) massUpdate.clienteId = clienteId || null;
      if (cuentaDestinoId !== undefined) massUpdate.cuentaDestinoId = cuentaDestinoId || null;
      
      if (Object.keys(massUpdate).length > 0) {
        await tx.cuentaCobrar.updateMany({
          where: {
            serieRecurrenteId: cxc.serieRecurrenteId,
            numeroPeriodo: { gt: cxc.numeroPeriodo as number },
            estado: "PENDIENTE" // Solo afectamos las no pagadas
          },
          data: massUpdate
        });
      }

      // 3. Actualizar la serie base
      if (monto !== undefined || concepto !== undefined || clienteId !== undefined) {
        const serieUpdate: any = {};
        if (monto !== undefined) serieUpdate.monto = monto;
        if (concepto !== undefined) serieUpdate.concepto = concepto; // guardamos el concepto base modificado
        if (clienteId !== undefined) serieUpdate.clienteId = clienteId || null;
        
        await tx.serieRecurrente.update({
          where: { id: cxc.serieRecurrenteId as string },
          data: serieUpdate
        });
      }
    });

    const finalUpdated = await prisma.cuentaCobrar.findUnique({ where: { id } });
    return NextResponse.json({ ok: true, cxc: finalUpdated });
  }

  // Update normal
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
