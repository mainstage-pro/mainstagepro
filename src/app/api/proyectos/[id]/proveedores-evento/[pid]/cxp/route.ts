import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { asegurarCxPDeProveedorEvento } from "@/lib/pagos-proveedor";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, pid } = await params;

  const bloque = await prisma.proveedorEvento.findUnique({
    where: { id: pid },
    select: { proyectoId: true },
  });
  if (!bloque || bloque.proyectoId !== id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const resultado = await prisma.$transaction((tx) => asegurarCxPDeProveedorEvento(tx, pid));
  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: 400 });

  if (resultado.creada) {
    await logActividad(session.id, "CREAR", "cuenta_pagar", resultado.cuentaPagarId, `CxP del evento: ${resultado.concepto}`);
  }

  const cuentaPagar = await prisma.cuentaPagar.findUnique({ where: { id: resultado.cuentaPagarId } });
  return NextResponse.json({ cuentaPagar, creada: resultado.creada });
}
