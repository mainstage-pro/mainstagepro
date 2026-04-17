import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const pago = await prisma.hervamPago.update({
    where: { id },
    data: {
      ...(body.montoAcordado !== undefined && { montoAcordado: parseFloat(body.montoAcordado) }),
      ...(body.montoPagado !== undefined && { montoPagado: parseFloat(body.montoPagado) }),
      ...(body.utilidadMes !== undefined && { utilidadMes: body.utilidadMes !== null ? parseFloat(body.utilidadMes) : null }),
      ...(body.estado !== undefined && { estado: body.estado }),
      ...(body.modoPago !== undefined && { modoPago: body.modoPago }),
      ...(body.notas !== undefined && { notas: body.notas || null }),
      ...(body.pagadoEn !== undefined && { pagadoEn: body.pagadoEn ? new Date(body.pagadoEn) : null }),
    },
  });

  return NextResponse.json({ pago });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.hervamPago.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
