import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type ItemEntrada = { descripcion?: string | null; cantidad?: number | string | null };

/**
 * Reemplaza los conceptos manuales del proveedor: lo que nos renta y no corresponde a
 * ninguna línea de la cotización. Lo que sí viene de la cotización se liga desde el
 * listado de equipos (CotizacionLinea.proveedorEventoId), no por aquí.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, pid } = await params;

  const proveedor = await prisma.proveedorEvento.findFirst({ where: { id: pid, proyectoId: id } });
  if (!proveedor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const entradas: ItemEntrada[] = Array.isArray(body.items) ? body.items : [];
  const filas = entradas
    .filter((it) => it.descripcion?.trim())
    .map((it, i) => ({
      proveedorEventoId: pid,
      descripcion: it.descripcion!.trim(),
      cantidad: Math.max(1, Math.round(Number(it.cantidad) || 1)),
      orden: i,
    }));

  await prisma.$transaction([
    prisma.proveedorEventoItem.deleteMany({ where: { proveedorEventoId: pid } }),
    ...(filas.length ? [prisma.proveedorEventoItem.createMany({ data: filas })] : []),
  ]);

  const items = await prisma.proveedorEventoItem.findMany({
    where: { proveedorEventoId: pid },
    orderBy: { orden: "asc" },
  });
  return NextResponse.json({ items });
}
