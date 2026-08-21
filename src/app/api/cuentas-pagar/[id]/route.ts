import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { monto, motivo, concepto, fechaCompromiso, cuentaOrigenId, proveedorId, tecnicoId, notas, editarSiguientes } = body;

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
  if (cuentaOrigenId !== undefined) updateData.cuentaOrigenId = cuentaOrigenId || null;
  if (proveedorId !== undefined) updateData.proveedorId = proveedorId || null;
  if (tecnicoId !== undefined) updateData.tecnicoId = tecnicoId || null;
  if (notas !== undefined) updateData.notas = notas || null;

  // Actualización masiva si es serie y se seleccionó 'editarSiguientes'
  if (editarSiguientes && cxp.serieRecurrenteId && cxp.numeroPeriodo) {
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar esta cuenta
      await tx.cuentaPagar.update({ where: { id }, data: updateData });

      // 2. Preparar update masivo para las siguientes
      const massUpdate: any = {};
      if (monto !== undefined) massUpdate.monto = monto;
      if (proveedorId !== undefined) massUpdate.proveedorId = proveedorId || null;
      if (tecnicoId !== undefined) massUpdate.tecnicoId = tecnicoId || null;
      if (cuentaOrigenId !== undefined) massUpdate.cuentaOrigenId = cuentaOrigenId || null;
      
      if (Object.keys(massUpdate).length > 0) {
        await tx.cuentaPagar.updateMany({
          where: {
            serieRecurrenteId: cxp.serieRecurrenteId,
            numeroPeriodo: { gt: cxp.numeroPeriodo as number },
            estado: "PENDIENTE" // Solo afectamos las no pagadas
          },
          data: massUpdate
        });
      }

      // 3. Actualizar la serie base
      if (monto !== undefined || concepto !== undefined || proveedorId !== undefined || tecnicoId !== undefined) {
        const serieUpdate: any = {};
        if (monto !== undefined) serieUpdate.monto = monto;
        if (concepto !== undefined) serieUpdate.concepto = concepto;
        if (proveedorId !== undefined) serieUpdate.proveedorId = proveedorId || null;
        if (tecnicoId !== undefined) serieUpdate.tecnicoId = tecnicoId || null;
        
        await tx.serieRecurrente.update({
          where: { id: cxp.serieRecurrenteId as string },
          data: serieUpdate
        });
      }
    });

    const finalUpdated = await prisma.cuentaPagar.findUnique({ where: { id } });
    return NextResponse.json({ ok: true, cxp: finalUpdated });
  }

  // Update normal
  const updated = await prisma.cuentaPagar.update({ where: { id }, data: updateData });
  return NextResponse.json({ ok: true, cxp: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const cxp = await prisma.cuentaPagar.findUnique({ where: { id }, include: { pagoNomina: true } });
  if (cxp?.pagoNomina) {
    await prisma.pagoNomina.delete({ where: { id: cxp.pagoNomina.id } }).catch(() => null);
  }
  await prisma.cuentaPagar.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
