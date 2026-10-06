import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/// Serie única COT-NNNN. El orden lexicográfico sirve porque el consecutivo ya
/// pasó de 2026, así que los COT-2026-xxx viejos quedan debajo del máximo.
export async function siguienteNumeroCotizacion(): Promise<string> {
  const ultima = await prisma.cotizacion.findFirst({
    orderBy: { numeroCotizacion: "desc" },
    select: { numeroCotizacion: true },
  });
  const n = ultima ? parseInt(ultima.numeroCotizacion.replace("COT-", "")) || 0 : 0;
  return `COT-${String(n + 1).padStart(4, "0")}`;
}

type CotizacionConLineas = Prisma.CotizacionGetPayload<{ include: { lineas: true } }>;

/// Copia precios, descuentos, configuración y líneas de una cotización. Lo que
/// identifica al documento (número, estado, evento, fecha, gira) lo pone quien
/// llama: duplicar dentro del mismo evento y bajar la base del tour a una fecha
/// son la misma copia con distinta cabecera.
export function datosCopiaCotizacion(
  original: CotizacionConLineas,
  cabecera: Partial<Prisma.CotizacionUncheckedCreateInput> & { numeroCotizacion: string; creadaPorId: string },
): Prisma.CotizacionUncheckedCreateInput {
  return {
    version: 1,
    estado: "BORRADOR",
    tratoId: original.tratoId,
    clienteId: original.clienteId,
    nombreEvento: original.nombreEvento,
    tipoEvento: original.tipoEvento,
    tipoServicio: original.tipoServicio,
    fechaEvento: original.fechaEvento,
    lugarEvento: original.lugarEvento,
    venueId: original.venueId,
    horaInicioEvento: original.horaInicioEvento,
    horaFinEvento: original.horaFinEvento,
    diasEquipo: original.diasEquipo,
    diasOperacion: original.diasOperacion,
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
    ...cabecera,
    lineas: {
      create: original.lineas.map((l) => ({
        tipo: l.tipo,
        descripcion: l.descripcion,
        marca: l.marca,
        modelo: l.modelo,
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
        esExterno: l.esExterno,
        costoExterno: l.costoExterno,
        esIncluido: l.esIncluido,
        cantidadPropia: l.cantidadPropia,
        cantidadExterna: l.cantidadExterna,
        proveedorRentaId: l.proveedorRentaId,
        notasInternas: l.notasInternas,
        notas: l.notas,
        orden: l.orden,
      })),
    },
  };
}
