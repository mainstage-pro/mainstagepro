import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ cuotaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { cuotaId } = await params;
  const { cuentaId, metodoPago, fecha } = await req.json();

  const cuota = await prisma.cuotaReparto.findUnique({
    where: { id: cuotaId },
    include: { reparto: { include: { socio: true } } },
  });

  if (!cuota) return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
  if (cuota.estado === "PAGADO") return NextResponse.json({ error: "Ya está pagada" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    // Generar MovimientoFinanciero para registrar salida de dinero
    await tx.movimientoFinanciero.create({
      data: {
        tipo: "GASTO",
        fecha: fecha ? new Date(fecha) : new Date(),
        concepto: `Pago Cuota Reparto: ${cuota.reparto.beneficiario} — ${cuota.periodo}`,
        monto: cuota.monto,
        cuentaOrigenId: cuentaId || null,
        metodoPago: metodoPago || "TRANSFERENCIA",
        notas: `Reparto: ${cuota.reparto.nombre}`,
        creadoPor: session.id,
      },
    });

    // Marcar cuota como PAGADO
    await tx.cuotaReparto.update({
      where: { id: cuotaId },
      data: { estado: "PAGADO" },
    });
  });

  return NextResponse.json({ success: true });
}
