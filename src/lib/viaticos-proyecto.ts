import { prisma } from "@/lib/prisma";
import { montoViatico, personasDeCotizacion } from "@/lib/viaticos";

/**
 * Siembra el cuadro de comidas y viáticos del proyecto desde la cotización.
 *
 * Un renglón por tipo (comidas, transporte, hospedaje) con el desglose que capturó el
 * vendedor, para que coordinación no vuelva a teclear nada: llega a revisar el número
 * de personas contra los técnicos que quedaron asignados y a pedir la autorización.
 *
 * Solo siembra lo que falta. Nunca pisa un renglón existente: en el proyecto se
 * corrigen personas, costos y modalidad, y esa corrección es la que vale.
 */

type LineaCot = {
  tipo: string;
  descripcion: string | null;
  notas: string | null;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  subtotal: number;
};

const CONCEPTO_POR_TIPO: Record<string, string> = {
  COMIDA: "Comidas del crew",
  TRANSPORTE: "Transporte y casetas",
  HOSPEDAJE: "Hospedaje del crew",
};

/** Personas que van al evento según la cotización: el ajuste manual manda. */
export function personasCotizadas(cot: {
  personasViaticos: number | null;
  jornadasPlan: string | null;
  lineas: { tipo: string; notas: string | null; cantidad: number }[];
}): number {
  if (cot.personasViaticos != null) return cot.personasViaticos;

  // Las líneas que el plan de trabajo genera se cuentan por jornada, no aquí, o la
  // misma persona entraría dos veces.
  const lineasOperacion = cot.lineas.filter(
    (l) => l.tipo === "OPERACION_TECNICA" && l.notas !== "from:jornada" && l.notas !== "zona:bonus",
  );
  const djs = cot.lineas.filter((l) => l.tipo === "DJ").length;

  let jornadas: { fecha: string; slots: { cantidad: number }[] }[] = [];
  try {
    const parsed = cot.jornadasPlan ? JSON.parse(cot.jornadasPlan) : [];
    if (Array.isArray(parsed)) jornadas = parsed;
  } catch {
    jornadas = [];
  }

  return personasDeCotizacion({ lineasOperacion, djs, jornadas });
}

export async function sembrarViaticosProyecto(proyectoId: string, cotizacionId: string): Promise<void> {
  const cot = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    select: {
      personasViaticos: true,
      comidasPorDia: true,
      jornadasPlan: true,
      lineas: {
        select: { tipo: true, descripcion: true, notas: true, cantidad: true, dias: true, precioUnitario: true, subtotal: true },
      },
    },
  });
  if (!cot) return;

  const yaSembrados = await prisma.gastoOperativo.findMany({
    where: { proyectoId, cotizacionId },
    select: { tipo: true },
  });
  const tiposSembrados = new Set(yaSembrados.map((g) => g.tipo));

  const personas = personasCotizadas(cot);
  const porDiaComidas = Math.max(1, cot.comidasPorDia || 1);

  for (const tipo of ["COMIDA", "TRANSPORTE", "HOSPEDAJE"] as const) {
    if (tiposSembrados.has(tipo)) continue;

    const lineas = (cot.lineas as LineaCot[]).filter((l) => l.tipo === tipo);
    const monto = lineas.reduce((s, l) => s + l.subtotal, 0);
    if (monto <= 0) continue;

    const dias = Math.max(1, ...lineas.map((l) => l.dias));
    // Las comidas se desglosan por persona; transporte y hospedaje se cotizan por
    // concepto, así que su costo unitario es lo que toca a cada día.
    const esPorPersona = tipo === "COMIDA" && personas > 0;
    const factorPersonas = esPorPersona ? personas : 1;
    const factorPorDia = esPorPersona ? porDiaComidas : 1;
    const divisor = factorPersonas * factorPorDia * dias;

    await prisma.gastoOperativo.create({
      data: {
        proyectoId,
        cotizacionId,
        tipo,
        concepto: lineas.map((l) => l.descripcion).filter(Boolean).join(" · ") || CONCEPTO_POR_TIPO[tipo],
        personas: esPorPersona ? personas : null,
        porDia: factorPorDia,
        dias,
        costoUnitario: divisor > 0 ? monto / divisor : monto,
        monto,
        cantidad: Math.max(1, Math.round(factorPersonas * factorPorDia)),
        modalidad: "EFECTIVO",
      },
    });
  }
}

/** Recalcula el monto de un renglón con su propio desglose. */
export function montoDeFila(fila: {
  personas: number | null;
  porDia: number | null;
  dias: number | null;
  costoUnitario: number | null;
}): number {
  return montoViatico({
    personas: fila.personas ?? 1,
    porDia: fila.porDia ?? 1,
    dias: fila.dias ?? 1,
    costoUnitario: fila.costoUnitario ?? 0,
  });
}
