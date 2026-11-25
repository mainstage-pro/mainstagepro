import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTipoMovimientoMap, naturalezaDe } from "@/lib/tipos-movimiento";
import { diffMovimiento, registrarCambioMovimiento, registrarBajaMovimiento } from "@/lib/auditoria-movimiento";
import { sincronizarCxPPrestamo } from "@/lib/prestamos-capital";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const mov = await prisma.movimientoFinanciero.findUnique({ where: { id } });
  if (!mov) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if ("concepto" in body) data.concepto = body.concepto;
  if ("monto" in body) data.monto = parseFloat(body.monto);
  if ("fecha" in body) data.fecha = new Date(body.fecha);
  if ("notas" in body) data.notas = body.notas || null;
  if ("referencia" in body) data.referencia = body.referencia || null;
  if ("metodoPago" in body) data.metodoPago = body.metodoPago;
  if ("categoriaId" in body) data.categoriaId = body.categoriaId || null;
  if ("cuentaOrigenId" in body) data.cuentaOrigenId = body.cuentaOrigenId || null;
  if ("cuentaDestinoId" in body) data.cuentaDestinoId = body.cuentaDestinoId || null;
  if ("proyectoId" in body) data.proyectoId = body.proyectoId || null;

  // Cambio de tipo: recalcula la naturaleza y reasigna cuenta origen/destino
  // igual que al crear (ver api/movimientos/route.ts POST).
  if ("tipo" in body && body.tipo && body.tipo !== mov.tipo) {
    data.tipo = body.tipo;
    const tipoMap = await getTipoMovimientoMap();
    const naturaleza = naturalezaDe(tipoMap, body.tipo);
    if (naturaleza === "NEUTRO") {
      data.cuentaOrigenId = body.cuentaOrigenId || null;
      data.cuentaDestinoId = body.cuentaDestinoId || null;
    } else if (naturaleza === "SALIDA") {
      data.cuentaOrigenId = body.cuentaOrigenId || null;
      data.cuentaDestinoId = null;
    } else {
      data.cuentaDestinoId = body.cuentaDestinoId || null;
      data.cuentaOrigenId = null;
    }
  }

  const { movUpdated: updated, avisoPrestamo } = await prisma.$transaction(async (tx) => {
    const movUpdated = await tx.movimientoFinanciero.update({ where: { id }, data });

    // Sincronizar con entidades relacionadas
    const syncData: Record<string, any> = {};
    if ("fecha" in data) syncData.fecha = data.fecha;
    if ("metodoPago" in data) syncData.metodoPago = data.metodoPago;

    if (Object.keys(syncData).length > 0 || "cuentaDestinoId" in data) {
      const abonoSync = { ...syncData };
      if ("cuentaDestinoId" in data) abonoSync.cuentaDestinoId = data.cuentaDestinoId;
      if (Object.keys(abonoSync).length > 0) {
        await tx.abono.updateMany({
          where: { movimientoId: id },
          data: abonoSync
        });
      }
    }

    if (Object.keys(syncData).length > 0 || "cuentaOrigenId" in data) {
      const pagoSync = { ...syncData };
      if ("cuentaOrigenId" in data) pagoSync.cuentaOrigenId = data.cuentaOrigenId;
      if (Object.keys(pagoSync).length > 0) {
        await tx.abonoPago.updateMany({
          where: { movimientoId: id },
          data: pagoSync
        });
        
        // PagoNomina usa fechaPago en lugar de fecha
        const nominaSync: Record<string, any> = {};
        if ("fecha" in data) nominaSync.fechaPago = data.fecha;
        if ("metodoPago" in data) nominaSync.metodoPago = data.metodoPago;
        if ("cuentaOrigenId" in data) nominaSync.cuentaOrigenId = data.cuentaOrigenId;
        
        if (Object.keys(nominaSync).length > 0) {
          await tx.pagoNomina.updateMany({
            where: { movimientoId: id },
            data: nominaSync
          });
        }
      }
    }

    // Si cambió categoría, tipo, monto o concepto, la CxP del préstamo se
    // crea / ajusta / borra para seguir al movimiento.
    const prestamo = await sincronizarCxPPrestamo(tx, id);

    return { movUpdated, avisoPrestamo: prestamo.aviso };
  });

  await registrarCambioMovimiento(session.id, id, updated.concepto, diffMovimiento(mov, data));

  return NextResponse.json({ movimiento: updated, aviso: avisoPrestamo ?? null });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const mov = await prisma.movimientoFinanciero.findUnique({
    where: { id },
    select: { concepto: true, monto: true, abono: { select: { id: true } }, cuentaPagar: { select: { id: true } } },
  });
  if (!mov) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Only allow deleting movements not linked to CxC/CxP (those need to be reversed via anular)
  if (mov.abono || mov.cuentaPagar) {
    return NextResponse.json({ error: "Este movimiento está vinculado a un cobro o pago. Usa la opción Anular desde cobros y pagos." }, { status: 400 });
  }

  // Préstamo de capital: su CxP se va con él, salvo que ya se haya devuelto algo.
  const cxpPrestamo = await prisma.cuentaPagar.findUnique({
    where: { movimientoOrigenId: id },
    select: { id: true, montoPagado: true },
  });
  if (cxpPrestamo && cxpPrestamo.montoPagado > 0) {
    return NextResponse.json({ error: "Este préstamo ya tiene pagos registrados en su cuenta por pagar. Anula esos pagos antes de borrarlo." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (cxpPrestamo) await tx.cuentaPagar.delete({ where: { id: cxpPrestamo.id } });
    await tx.movimientoFinanciero.delete({ where: { id } });
  });
  await registrarBajaMovimiento(session.id, id, mov.concepto, mov.monto);
  return NextResponse.json({ ok: true });
}
