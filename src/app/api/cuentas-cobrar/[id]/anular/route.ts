import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/cuentas-cobrar/[id]/anular
// Body: { abonoId?: string }  — si se omite, anula todos los abonos (resetea la CxC)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { abonoId } = body as { abonoId?: string };

  const cxc = await prisma.cuentaCobrar.findUnique({
    where: { id },
    include: { abonos: true },
  });
  if (!cxc) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (abonoId) {
      // Anular un abono específico
      const abono = cxc.abonos.find((a) => a.id === abonoId);
      if (!abono) throw new Error("Abono no encontrado");

      if (abono.movimientoId) {
        await tx.movimientoFinanciero.delete({ where: { id: abono.movimientoId } }).catch(() => null);
      }
      await tx.abono.delete({ where: { id: abonoId } });

      const nuevoMontoCobrado = Math.round(
        cxc.abonos.filter((a) => a.id !== abonoId).reduce((s, a) => s + a.monto, 0) * 100
      ) / 100;

      const nuevoEstado =
        nuevoMontoCobrado <= 0 ? "PENDIENTE" :
        nuevoMontoCobrado >= cxc.monto ? "LIQUIDADO" : "PARCIAL";

      await tx.cuentaCobrar.update({
        where: { id },
        data: {
          montoCobrado: nuevoMontoCobrado,
          estado: nuevoEstado,
          fechaCobroReal: nuevoEstado === "LIQUIDADO" ? cxc.fechaCobroReal : null,
        },
      });
    } else {
      // Anular todos los abonos (reset completo)
      for (const abono of cxc.abonos) {
        if (abono.movimientoId) {
          await tx.movimientoFinanciero.delete({ where: { id: abono.movimientoId } }).catch(() => null);
        }
      }
      await tx.abono.deleteMany({ where: { cuentaCobrarId: id } });
      await tx.cuentaCobrar.update({
        where: { id },
        data: { estado: "PENDIENTE", montoCobrado: 0, fechaCobroReal: null },
      });
    }
  });

  const updated = await prisma.cuentaCobrar.findUnique({
    where: { id },
    include: { abonos: { orderBy: { fecha: "asc" } } },
  });

  return NextResponse.json({ cxc: updated });
}
