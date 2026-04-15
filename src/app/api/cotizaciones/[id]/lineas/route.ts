import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/cotizaciones/[id]/lineas
 * Agrega una línea extra a una cotización aprobada (post-venta)
 * y recalcula el granTotal de la cotización.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const cot = await prisma.cotizacion.findUnique({ where: { id } });
  if (!cot) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

  const {
    tipo = "EQUIPO_PROPIO",
    descripcion,
    equipoId = null,
    proveedorId = null,
    cantidad = 1,
    dias = 1,
    precioUnitario = 0,
    costoUnitario = 0,
    esExterno = false,
  } = body;

  if (!descripcion) return NextResponse.json({ error: "Descripción requerida" }, { status: 400 });

  const subtotal = Math.round(precioUnitario * cantidad * dias * 100) / 100;

  // Obtener orden máximo actual
  const maxOrdenRow = await prisma.cotizacionLinea.aggregate({
    where: { cotizacionId: id },
    _max: { orden: true },
  });
  const maxOrden = maxOrdenRow._max.orden ?? 0;

  const linea = await prisma.cotizacionLinea.create({
    data: {
      cotizacionId: id,
      tipo,
      descripcion,
      equipoId: equipoId || null,
      proveedorId: proveedorId || null,
      cantidad,
      dias,
      precioUnitario,
      costoUnitario,
      subtotal,
      esExterno,
      orden: maxOrden + 1,
    },
  });

  // Recalcular granTotal sumando el nuevo subtotal (+ IVA si aplica)
  const ivaExtra = cot.aplicaIva ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
  const increment = subtotal + ivaExtra;

  await prisma.cotizacion.update({
    where: { id },
    data: {
      total: { increment: subtotal },
      montoIva: { increment: ivaExtra },
      granTotal: { increment: increment },
    },
  });

  const cotActualizada = await prisma.cotizacion.findUnique({
    where: { id },
    select: { granTotal: true },
  });

  return NextResponse.json({ linea, granTotal: cotActualizada?.granTotal });
}
