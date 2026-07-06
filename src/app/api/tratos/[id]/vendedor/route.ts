import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores pueden corregir el vendedor" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { vendedorId } = body;

  if (!vendedorId) {
    return NextResponse.json({ error: "vendedorId requerido" }, { status: 400 });
  }

  // Verify vendor exists and is in VENTAS area
  const vendedor = await prisma.user.findUnique({
    where: { id: vendedorId },
    select: { id: true, name: true, area: true },
  });
  if (!vendedor) {
    return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });
  }

  const trato = await prisma.trato.update({
    where: { id },
    data: { vendedorId },
    select: { id: true, vendedorId: true },
  });

  return NextResponse.json({ ok: true, trato, vendedor: { id: vendedor.id, name: vendedor.name } });
}
