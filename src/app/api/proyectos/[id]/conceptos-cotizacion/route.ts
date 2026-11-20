import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TIPOS_LINEA_ASIGNABLES } from "@/lib/proveedor-equipos";

/**
 * Equipos y servicios de la cotización del proyecto que se le pueden encargar a un
 * proveedor, con quién los cubre ya. Sin precios: sirve igual en la vista discreta.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: { cotizacionId: true } });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (!proyecto.cotizacionId) return NextResponse.json({ conceptos: [] });

  const lineas = await prisma.cotizacionLinea.findMany({
    where: { cotizacionId: proyecto.cotizacionId, tipo: { in: [...TIPOS_LINEA_ASIGNABLES] } },
    select: {
      id: true,
      tipo: true,
      descripcion: true,
      marca: true,
      modelo: true,
      cantidad: true,
      dias: true,
      proveedorEventoId: true,
      proveedorEvento: { select: { nombreProveedor: true } },
    },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json({
    conceptos: lineas.map((l) => ({
      id: l.id,
      tipo: l.tipo,
      descripcion: l.descripcion,
      marca: l.marca,
      modelo: l.modelo,
      cantidad: l.cantidad,
      dias: l.dias,
      proveedorEventoId: l.proveedorEventoId,
      nombreProveedor: l.proveedorEvento?.nombreProveedor ?? null,
    })),
  });
}
