import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  filaDeMovimiento,
  recalcularEstadoFila,
  ajustarCxPNomina,
  eliminarPagoNomina,
} from "@/lib/nomina-pagos";
import { diffMovimiento, registrarCambioMovimiento, registrarBajaMovimiento } from "@/lib/auditoria-movimiento";

// PATCH /api/pagos-personal/registrados/[id] — corrige un pago de nómina ya
// registrado (fecha, monto, método, cuenta, referencia). La fila y su CxP se
// reajustan para seguir al nuevo monto.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const mov = await prisma.movimientoFinanciero.findUnique({ where: { id } });
  if (!mov) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

  const data: { fecha?: Date; monto?: number; metodoPago?: string; cuentaOrigenId?: string | null; referencia?: string | null } = {};
  if ("fecha" in body) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.fecha))) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    data.fecha = new Date(`${body.fecha}T12:00:00Z`);
  }
  if ("monto" in body) {
    const monto = Number(body.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a cero. Para quitar el pago, elimínalo." }, { status: 400 });
    }
    data.monto = Math.round(monto * 100) / 100;
  }
  if ("metodoPago" in body) data.metodoPago = String(body.metodoPago || "TRANSFERENCIA");
  if ("cuentaOrigenId" in body) data.cuentaOrigenId = body.cuentaOrigenId || null;
  if ("referencia" in body) data.referencia = body.referencia ? String(body.referencia) : null;

  const ok = await prisma.$transaction(async (tx) => {
    const ref = await filaDeMovimiento(tx, id);
    if (!ref) return false;
    await tx.movimientoFinanciero.update({ where: { id }, data });
    if (data.monto != null && Math.abs(data.monto - mov.monto) >= 0.01) {
      const fila = await tx.proyectoPersonal.findUnique({
        where: { id: ref.filaId },
        select: { tecnicoId: true, proyectoId: true },
      });
      if (fila) await ajustarCxPNomina(tx, { ...fila, movimientoId: id, delta: data.monto - mov.monto });
      await recalcularEstadoFila(tx, ref.filaId);
    }
    return true;
  });
  if (!ok) return NextResponse.json({ error: "Este movimiento no es un pago de nómina" }, { status: 400 });

  await registrarCambioMovimiento(session.id, id, mov.concepto, diffMovimiento(mov, data));
  return NextResponse.json({ ok: true });
}

// DELETE /api/pagos-personal/registrados/[id] — elimina un pago de nómina; la
// jornada vuelve a quedar con adeudo por ese monto.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const mov = await prisma.movimientoFinanciero.findUnique({
    where: { id },
    select: { concepto: true, monto: true },
  });
  if (!mov) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

  const ok = await prisma.$transaction((tx) => eliminarPagoNomina(tx, id));
  if (!ok) return NextResponse.json({ error: "Este movimiento no es un pago de nómina" }, { status: 400 });

  await registrarBajaMovimiento(session.id, id, mov.concepto, mov.monto);
  return NextResponse.json({ ok: true });
}
