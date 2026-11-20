import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { asignarLineasAProveedorEvento } from "@/lib/proveedor-equipos";
import { asegurarCxPDeProveedorEvento } from "@/lib/pagos-proveedor";
import { proveedorEventoInclude } from "../../route";

/**
 * Reemplaza las líneas de la cotización que cubre el proveedor: equipo propio que
 * se subarrienda, equipo de tercero o servicios. Los conceptos que no están en la
 * cotización van por `/items`.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, pid } = await params;

  const actual = await prisma.proveedorEvento.findFirst({ where: { id: pid, proyectoId: id }, select: { id: true } });
  if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const lineaIds: string[] = Array.isArray(body.lineaIds) ? body.lineaIds : [];

  await prisma.$transaction(async (tx) => {
    await asignarLineasAProveedorEvento(tx, id, pid, lineaIds);
    // La CxP ya formalizada se describe con lo que renta: se mantiene al día.
    const bloque = await tx.proveedorEvento.findUnique({ where: { id: pid }, select: { cuentaPagarId: true } });
    if (bloque?.cuentaPagarId) await asegurarCxPDeProveedorEvento(tx, pid);
  });

  const proveedor = await prisma.proveedorEvento.findUnique({ where: { id: pid }, include: proveedorEventoInclude });
  return NextResponse.json({ lineas: proveedor?.lineas ?? [] });
}
