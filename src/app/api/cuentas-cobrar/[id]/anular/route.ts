import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cxc = await prisma.cuentaCobrar.findUnique({ where: { id } });
  if (!cxc) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (cxc.estado === "PENDIENTE") return NextResponse.json({ error: "Ya está pendiente" }, { status: 400 });

  const movimientoId = cxc.movimientoId;

  const updated = await prisma.cuentaCobrar.update({
    where: { id },
    data: {
      estado: "PENDIENTE",
      montoCobrado: 0,
      fechaCobroReal: null,
      movimientoId: null,
    },
  });

  if (movimientoId) {
    await prisma.movimientoFinanciero.delete({ where: { id: movimientoId } }).catch(() => null);
  }

  return NextResponse.json({ cxc: updated });
}
