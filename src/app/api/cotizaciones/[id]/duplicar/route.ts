import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const original = await prisma.cotizacion.findUnique({
    where: { id },
    include: { lineas: true },
  });
  if (!original) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Generar nuevo número
  const year = new Date().getFullYear();
  const maxCot = await prisma.cotizacion.findFirst({
    where: { numeroCotizacion: { startsWith: `COT-${year}-` } },
    orderBy: { numeroCotizacion: "desc" },
  });
  let siguiente = 1;
  if (maxCot) {
    const partes = maxCot.numeroCotizacion.split("-");
    const num = parseInt(partes[2] ?? "0", 10);
    if (!isNaN(num)) siguiente = num + 1;
  }
  const numeroCotizacion = `COT-${year}-${String(siguiente).padStart(3, "0")}`;

  const nueva = await prisma.cotizacion.create({
    data: {
      numeroCotizacion,
      version: 1,
      estado: "BORRADOR",
      tratoId: original.tratoId,
      clienteId: original.clienteId,
      creadaPorId: session.id,
      // Datos del evento
      nombreEvento: original.nombreEvento ? `${original.nombreEvento} (copia)` : null,
      tipoEvento: original.tipoEvento,
      tipoServicio: original.tipoServicio,
      fechaEvento: original.fechaEvento,
      lugarEvento: original.lugarEvento,
      diasEquipo: original.diasEquipo,
      diasOperacion: original.diasOperacion,
      // Totales
      subtotalEquiposBruto: original.subtotalEquiposBruto,
      descuentoTotalPct: original.descuentoTotalPct,
      montoDescuento: original.montoDescuento,
      subtotalEquiposNeto: original.subtotalEquiposNeto,
      subtotalOperacion: original.subtotalOperacion,
      subtotalTransporte: original.subtotalTransporte,
      subtotalComidas: original.subtotalComidas,
      subtotalHospedaje: original.subtotalHospedaje,
      total: original.total,
      aplicaIva: original.aplicaIva,
      montoIva: original.montoIva,
      granTotal: original.granTotal,
      costosTotalesEstimados: original.costosTotalesEstimados,
      utilidadEstimada: original.utilidadEstimada,
      porcentajeUtilidad: original.porcentajeUtilidad,
      // Configuración
      vigenciaDias: original.vigenciaDias,
      planPagos: original.planPagos,
      observaciones: original.observaciones,
      notasSecciones: original.notasSecciones,
      diasComidas: original.diasComidas,
      // Copiar líneas
      lineas: {
        create: original.lineas.map(l => ({
          tipo: l.tipo,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          dias: l.dias,
          precioUnitario: l.precioUnitario,
          costoUnitario: l.costoUnitario,
          subtotal: l.subtotal,

          equipoId: l.equipoId,
          proveedorId: l.proveedorId,
          rolTecnicoId: l.rolTecnicoId,
          nivel: l.nivel,
          jornada: l.jornada,
          notas: l.notas,
          orden: l.orden,
        })),
      },
    },
  });

  return NextResponse.json({ id: nueva.id, numeroCotizacion: nueva.numeroCotizacion });
}
