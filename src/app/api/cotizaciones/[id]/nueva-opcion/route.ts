import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Genera letras: A, B, C, ..., Z, AA, AB, ..., AZ, BA, ... (hasta 50+)
function generarLetra(index: number): string {
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < 26) return ALPHA[index];
  const primera = ALPHA[Math.floor(index / 26) - 1];
  const segunda = ALPHA[index % 26];
  return `${primera}${segunda}`;
}

const TIPOS_EQUIPO = ["EQUIPO_PROPIO", "EQUIPO_EXTERNO"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // modo: "completa" = copia todo | "vacia" = sin equipos (solo operación, logística, etc.)
  const body = await req.json().catch(() => ({}));
  const modo: "completa" | "vacia" = body.modo === "vacia" ? "vacia" : "completa";

  const original = await prisma.cotizacion.findUnique({
    where: { id },
    include: { lineas: true },
  });
  if (!original) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Determinar grupoId — si no tiene, el grupo lo ancla el ID de la original
  const grupoId = original.grupoId ?? original.id;

  // Buscar opciones existentes en el mismo grupo
  const hermanas = await prisma.cotizacion.findMany({
    where: { grupoId },
    select: { opcionLetra: true },
    orderBy: { createdAt: "asc" },
  });

  // Incluir la original si aún no tiene grupoId (aún no está en el grupo)
  const letrasUsadas = new Set(hermanas.map(h => h.opcionLetra));
  if (!original.grupoId) letrasUsadas.add(original.opcionLetra);

  if (letrasUsadas.size >= 50) {
    return NextResponse.json({ error: "Máximo de opciones alcanzado (50)" }, { status: 400 });
  }

  // Encontrar siguiente letra libre
  let siguienteLetra = "B";
  for (let i = 0; i < 50; i++) {
    const candidata = generarLetra(i);
    if (!letrasUsadas.has(candidata)) {
      siguienteLetra = candidata;
      break;
    }
  }

  // Si la original aún no tiene grupoId, asignárselo
  if (!original.grupoId) {
    await prisma.cotizacion.update({
      where: { id: original.id },
      data: { grupoId },
    });
  }

  // Generar número de cotización
  const last = await prisma.cotizacion.findFirst({
    orderBy: { numeroCotizacion: "desc" },
    select: { numeroCotizacion: true },
  });
  const lastNum = last ? parseInt(last.numeroCotizacion.replace("COT-", "")) || 0 : 0;
  const numeroCotizacion = `COT-${String(lastNum + 1).padStart(4, "0")}`;

  // Filtrar líneas según el modo
  const lineasACopiar = modo === "vacia"
    ? original.lineas.filter(l => !TIPOS_EQUIPO.includes(l.tipo))
    : original.lineas;

  // En modo vacío, resetear totales de equipos a 0
  const totalesEquipo = modo === "vacia" ? {
    subtotalEquiposBruto: 0,
    subtotalEquiposNeto: 0,
    descuentoVolumenPct: 0,
    descuentoB2bPct: 0,
    descuentoMultidiaPct: 0,
    descuentoFamilyFriendsPct: 0,
    descuentoFijoMonto: 0,
    montoDescuento: 0,
    descuentoTotalPct: 0,
  } : {
    subtotalEquiposBruto: original.subtotalEquiposBruto,
    subtotalEquiposNeto: original.subtotalEquiposNeto,
    descuentoVolumenPct: original.descuentoVolumenPct,
    descuentoB2bPct: original.descuentoB2bPct,
    descuentoMultidiaPct: original.descuentoMultidiaPct,
    descuentoFamilyFriendsPct: original.descuentoFamilyFriendsPct,
    descuentoFijoMonto: original.descuentoFijoMonto,
    montoDescuento: original.montoDescuento,
    descuentoTotalPct: original.descuentoTotalPct,
  };

  const nueva = await prisma.cotizacion.create({
    data: {
      numeroCotizacion,
      version: 1,
      opcionLetra: siguienteLetra,
      grupoId,
      estado: "BORRADOR",
      tratoId: original.tratoId,
      clienteId: original.clienteId,
      creadaPorId: session.id,
      nombreCotizacion: original.nombreCotizacion,
      nombreEvento: original.nombreEvento,
      tipoEvento: original.tipoEvento,
      tipoServicio: original.tipoServicio,
      fechaEvento: original.fechaEvento,
      lugarEvento: original.lugarEvento,
      horasOperacion: original.horasOperacion,
      tipoJornada: original.tipoJornada,
      diasEquipo: original.diasEquipo,
      diasOperacion: original.diasOperacion,
      diasTransporte: original.diasTransporte,
      diasHospedaje: original.diasHospedaje,
      diasComidas: original.diasComidas,
      ...totalesEquipo,
      descuentoPatrocinioPct: original.descuentoPatrocinioPct,
      descuentoPatrocinioNota: original.descuentoPatrocinioNota,
      descuentoEspecialPct: original.descuentoEspecialPct,
      descuentoEspecialNota: original.descuentoEspecialNota,
      descuentoManualRazon: original.descuentoManualRazon,
      descuentoManualEsMonto: original.descuentoManualEsMonto,
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
      gastosProduccionActivo: original.gastosProduccionActivo,
      gastosProduccionEsMonto: original.gastosProduccionEsMonto,
      gastosProduccionPct: original.gastosProduccionPct,
      gastosProduccionMonto: original.gastosProduccionMonto,
      costosTotalesEstimados: original.costosTotalesEstimados,
      utilidadEstimada: original.utilidadEstimada,
      porcentajeUtilidad: original.porcentajeUtilidad,
      tipoBeneficio: original.tipoBeneficio,
      montoBeneficio: original.montoBeneficio,
      vigenciaDias: original.vigenciaDias,
      planPagos: original.planPagos,
      observaciones: original.observaciones,
      terminosComerciales: original.terminosComerciales,
      notasSecciones: original.notasSecciones,
      jornadasPlan: original.jornadasPlan,
      lineas: {
        create: lineasACopiar.map(l => ({
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

  return NextResponse.json({ id: nueva.id, numeroCotizacion: nueva.numeroCotizacion, opcionLetra: nueva.opcionLetra });
}
