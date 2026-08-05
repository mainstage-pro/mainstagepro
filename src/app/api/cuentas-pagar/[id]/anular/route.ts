import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cxp = await prisma.cuentaPagar.findUnique({ where: { id }, include: { pagoNomina: true } });
  if (!cxp) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (cxp.estado === "PENDIENTE") return NextResponse.json({ error: "Ya está pendiente" }, { status: 400 });

  const movimientoId = cxp.movimientoId;

  const [updated] = await prisma.$transaction([
    prisma.cuentaPagar.update({
      where: { id },
      data: { estado: "PENDIENTE", fechaPagoReal: null, movimientoId: null },
    }),
    // Si es pago de técnico, revertir estadoPago de los slots de personal
    ...(cxp.tipoAcreedor === "TECNICO" && cxp.tecnicoId && cxp.proyectoId
      ? [prisma.proyectoPersonal.updateMany({
          where: { tecnicoId: cxp.tecnicoId, proyectoId: cxp.proyectoId, estadoPago: "PAGADO" },
          data: { estadoPago: "PENDIENTE" },
        })]
      : []),
    // Si tiene pago de nómina enlazado, revertirlo a PENDIENTE
    ...(cxp.pagoNomina
      ? [prisma.pagoNomina.update({
          where: { id: cxp.pagoNomina.id },
          data: { estado: "PENDIENTE", fechaPago: null, movimientoId: null },
        })]
      : []),
  ]);

  if (movimientoId) {
    await prisma.movimientoFinanciero.delete({ where: { id: movimientoId } }).catch(() => null);
  }

  return NextResponse.json({ cxp: updated });
}
