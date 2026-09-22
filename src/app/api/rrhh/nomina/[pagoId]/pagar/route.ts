import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getCategoriaSueldosYSalarios, getCategoriaPersonalFreelance } from "@/lib/nomina-pagos";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ pagoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { pagoId } = await params;
  const body = await req.json();

  if (body.estado === "PAGADO") {
    const pago = await prisma.pagoNomina.findUnique({
      where: { id: pagoId },
      include: { personal: { select: { nombre: true, tipo: true } }, tecnico: { select: { nombre: true } } },
    });
    if (!pago) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const fechaPago = body.fechaPago ? new Date(body.fechaPago) : new Date();

    const isFreelance = pago.personal?.tipo === "FREELANCE_RECURRENTE" || !!pago.tecnico;
    const categoriaId = isFreelance ? await getCategoriaPersonalFreelance(prisma) : await getCategoriaSueldosYSalarios(prisma);
    const nombre = pago.personal?.nombre || pago.tecnico?.nombre || "Desconocido";

    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        fecha: fechaPago,
        tipo: "GASTO",
        concepto: pago.concepto ?? `Nómina ${pago.periodo} — ${nombre}`,
        monto: pago.monto,
        metodoPago: body.metodoPago ?? pago.metodoPago,
        cuentaOrigenId: body.cuentaOrigenId ?? pago.cuentaOrigenId ?? null,
        creadoPor: session.name,
        categoriaId,
      },
    });

    const updated = await prisma.pagoNomina.update({
      where: { id: pagoId },
      data: {
        estado: "PAGADO",
        fechaPago,
        metodoPago: body.metodoPago ?? pago.metodoPago,
        movimientoId: movimiento.id,
      },
      include: { cuentaOrigen: { select: { nombre: true } } },
    });

    if (pago.cuentaPagarId) {
      await prisma.cuentaPagar.update({
        where: { id: pago.cuentaPagarId },
        data: {
          estado: "LIQUIDADO",
          montoPagado: pago.monto,
          fechaPagoReal: fechaPago,
          movimientoId: movimiento.id,
        },
      });
      await prisma.abonoPago.create({
        data: {
          cuentaPagarId: pago.cuentaPagarId,
          monto: pago.monto,
          fecha: fechaPago,
          metodoPago: body.metodoPago ?? pago.metodoPago ?? "TRANSFERENCIA",
          cuentaOrigenId: body.cuentaOrigenId ?? pago.cuentaOrigenId ?? null,
          movimientoId: movimiento.id,
          notas: "Pago confirmado desde Nómina (RRHH)",
          creadoPor: session.id,
        },
      });
    }

    return NextResponse.json({ pago: updated });
  }

  return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
}
