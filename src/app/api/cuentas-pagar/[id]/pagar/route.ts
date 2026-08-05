import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCuentaPagarCategoria } from "@/lib/mantenimiento-costo";
import { getCategoriaSueldosYSalarios } from "@/lib/nomina-pagos";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { monto, fecha, notas, cuentaId, metodoPago, categoriaId } = await req.json();

  await ensureCuentaPagarCategoria();
  const cxp = await prisma.cuentaPagar.findUnique({
    where: { id },
    include: { abonos: true, pagoNomina: true },
  });
  if (!cxp) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (cxp.estado === "LIQUIDADO") return NextResponse.json({ error: "Ya está liquidada" }, { status: 400 });

  const montoAbono = parseFloat(monto);
  if (!montoAbono || montoAbono <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

  const nuevoMontoPagado = Math.round((cxp.montoPagado + montoAbono) * 100) / 100;
  const liquidado = nuevoMontoPagado >= cxp.monto;

  await prisma.$transaction(async (tx) => {
    const esNomina = cxp.esNomina || cxp.tipoAcreedor === "PERSONAL_INTERNO" || !!cxp.pagoNomina;
    const finalCategoriaId = esNomina ? await getCategoriaSueldosYSalarios(tx) : (categoriaId || cxp.categoriaId || null);

    const movimiento = await tx.movimientoFinanciero.create({
      data: {
        tipo: "GASTO",
        fecha: fecha ? new Date(fecha) : new Date(),
        concepto: cxp.concepto,
        monto: montoAbono,
        proyectoId: cxp.proyectoId,
        cuentaOrigenId: cuentaId || null,
        metodoPago: metodoPago || "TRANSFERENCIA",
        categoriaId: finalCategoriaId,
        notas: notas || null,
        creadoPor: session.id,
      },
    });

    await tx.abonoPago.create({
      data: {
        cuentaPagarId: id,
        monto: montoAbono,
        fecha: fecha ? new Date(fecha) : new Date(),
        metodoPago: metodoPago || "TRANSFERENCIA",
        notas: notas || null,
        cuentaOrigenId: cuentaId || null,
        movimientoId: movimiento.id,
        creadoPor: session.id,
      },
    });

    await tx.cuentaPagar.update({
      where: { id },
      data: {
        montoPagado: nuevoMontoPagado,
        estado: liquidado ? "LIQUIDADO" : "PARCIAL",
        fechaPagoReal: fecha ? new Date(fecha) : new Date(), // siempre registrar fecha del último abono
        cuentaOrigenId: cuentaId || undefined,
      },
    });

    if (liquidado && cxp.pagoNomina) {
      await tx.pagoNomina.update({
        where: { id: cxp.pagoNomina.id },
        data: {
          estado: "PAGADO",
          fechaPago: fecha ? new Date(fecha) : new Date(),
          metodoPago: metodoPago || "TRANSFERENCIA",
          cuentaOrigenId: cuentaId || null,
          movimientoId: movimiento.id,
        },
      });
    }
  });

  const updated = await prisma.cuentaPagar.findUnique({
    where: { id },
    include: { abonos: { orderBy: { fecha: "asc" } } },
  });

  return NextResponse.json({ cxp: updated });
}
