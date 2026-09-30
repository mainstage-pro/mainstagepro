/**
 * Comidas y viáticos: una sola forma de contar a la gente de casa que va al evento.
 *
 * La cuadrilla es la gente del día con más personas, no la suma de las jornadas: un
 * técnico que monta el viernes y opera el sábado es una persona, no dos, pero se le
 * dan comidas los dos días (de eso se encargan los días, no el conteo).
 *
 * La cotización cuenta puestos (todavía no hay nombres); el proyecto cuenta personas
 * asignadas. El número sale igual porque la regla es la misma.
 */

const SIN_FECHA = "__sin_fecha__";

/** Puestos de operación técnica cotizados (una línea por rol, sin fecha). */
export type LineaOperacionCotizada = { cantidad: number };

/** Jornada del plan de trabajo de la cotización: puestos por día. */
export type JornadaCotizada = { fecha: string; slots: { cantidad: number }[] };

/** Puesto del proyecto: una fila por persona y jornada. */
export type PuestoProyecto = {
  tecnicoId?: string | null;
  tecnico?: { id: string } | null;
  fechaJornada?: string | null;
};

/** Personas que van al evento según la cotización. */
export function personasDeCotizacion(input: {
  lineasOperacion?: LineaOperacionCotizada[];
  djs?: number;
  jornadas?: JornadaCotizada[];
}): number {
  const sinFecha =
    (input.lineasOperacion ?? []).reduce((s, l) => s + Math.max(0, Math.round(l.cantidad)), 0) +
    Math.max(0, input.djs ?? 0);

  const porDia = (input.jornadas ?? []).map((j) =>
    j.slots.reduce((s, slot) => s + Math.max(0, Math.round(slot.cantidad)), 0),
  );

  return Math.max(sinFecha, ...porDia, 0);
}

/** Personas que van al evento según los técnicos asignados en el proyecto. */
export function personasDeProyecto(personal: PuestoProyecto[]): number {
  const porDia = new Map<string, { asignados: Set<string>; vacantes: number }>();

  for (const p of personal) {
    const dia = p.fechaJornada?.slice(0, 10) || SIN_FECHA;
    const bucket = porDia.get(dia) ?? { asignados: new Set<string>(), vacantes: 0 };
    const tecnicoId = p.tecnicoId ?? p.tecnico?.id ?? null;
    if (tecnicoId) bucket.asignados.add(tecnicoId);
    else bucket.vacantes += 1;
    porDia.set(dia, bucket);
  }

  const conteos = [...porDia.values()].map((b) => b.asignados.size + b.vacantes);
  return Math.max(...conteos, 0);
}

/** Lo que cuesta el renglón: tantas personas, tantos servicios al día, tantos días. */
export function montoViatico(input: {
  personas: number;
  porDia: number;
  dias: number;
  costoUnitario: number;
}): number {
  const { personas, porDia, dias, costoUnitario } = input;
  return Math.max(0, personas) * Math.max(0, porDia) * Math.max(0, dias) * Math.max(0, costoUnitario);
}

export const ESTADOS_VIATICO = ["PROPUESTO", "AUTORIZADO", "ENTREGADO"] as const;
export type EstadoViatico = (typeof ESTADOS_VIATICO)[number];

/**
 * El estado no se guarda: se deduce de las dos marcas que sí importan. Así no hay
 * forma de que un renglón diga "autorizado" sin tener quién y cuándo lo autorizó.
 */
export function estadoViatico(fila: { entregado: boolean; autorizadoEn: Date | string | null }): EstadoViatico {
  if (fila.entregado) return "ENTREGADO";
  return fila.autorizadoEn ? "AUTORIZADO" : "PROPUESTO";
}

export const TIPOS_VIATICO = [
  { valor: "COMIDA", label: "Comidas" },
  { valor: "TRANSPORTE", label: "Transporte" },
  { valor: "HOSPEDAJE", label: "Hospedaje" },
  { valor: "OTRO", label: "Otro" },
] as const;

export const MODALIDADES_VIATICO = [
  { valor: "EFECTIVO", label: "Efectivo", ayuda: "Se entrega el dinero a quien coordina." },
  { valor: "SERVICIO", label: "Servicio de comida", ayuda: "Se contrata a un proveedor." },
] as const;

export type ModalidadViatico = (typeof MODALIDADES_VIATICO)[number]["valor"];
