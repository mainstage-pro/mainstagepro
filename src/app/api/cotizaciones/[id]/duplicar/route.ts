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
      // Descuentos
      subtotalEquiposBruto: original.subtotalEquiposBruto,
      descuentoVolumenPct: original.descuentoVolumenPct,
      descuentoB2bPct: original.descuentoB2bPct,
      descuentoMultidiaPct: original.descuentoMultidiaPct,
      descuentoPatrocinioPct: original.descuentoPatrocinioPct,
      descuentoPatrocinioNota: original.descuentoPatrocinioNota,
      descuentoEspecialPct: original.descuentoEspecialPct,
      descuentoEspecialNota: original.descuentoEspecialNota,
      descuentoFamilyFriendsPct: original.descuentoFamilyFriendsPct,
      descuentoFijoMonto: original.descuentoFijoMonto,
      descuentoManualRazon: original.descuentoManualRazon,
      descuentoManualEsMonto: original.descuentoManualEsMonto,
      descuentoTotalPct: original.descuentoTotalPct,
      montoDescuento: original.montoDescuento,
      montoBeneficio: original.montoBeneficio,
      tipoBeneficio: original.tipoBeneficio,
      // Totales
      subtotalEquiposNeto: original.subtotalEquiposNeto,
      subtotalPaquetes: original.subtotalPaquetes,
      subtotalTerceros: original.subtotalTerceros,
      subtotalOperacion: original.subtotalOperacion,
      subtotalTransporte: original.subtotalTransporte,
      subtotalComidas: original.subtotalComidas,
      subtotalHospedaje: original.subtotalHospedaje,
      total: original.total,
      aplicaIva: original.aplicaIva,
      incluirChofer: original.incluirChofer,
      montoIva: original.montoIva,
      granTotal: original.granTotal,
      costosTotalesEstimados: original.costosTotalesEstimados,
      utilidadEstimada: original.utilidadEstimada,
      porcentajeUtilidad: original.porcentajeUtilidad,
      // Configuración
      horasOperacion: original.horasOperacion,
      tipoJornada: original.tipoJornada,
      diasTransporte: original.diasTransporte,
      diasHospedaje: original.diasHospedaje,
      diasComidas: original.diasComidas,
      vigenciaDias: original.vigenciaDias,
      planPagos: original.planPagos,
      observaciones: original.observaciones,
      terminosComerciales: original.terminosComerciales,
      notasSecciones: original.notasSecciones,
      jornadasPlan: original.jornadasPlan,
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
