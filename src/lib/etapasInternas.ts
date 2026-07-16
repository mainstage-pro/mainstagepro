// Etapas internas de cada etapa del pipeline de ventas.
// La etapa del pipeline (LEAD | DESCUBRIMIENTO | OPORTUNIDAD | VENTA_CERRADA | VENTA_PERDIDA)
// dice "en qué caja está" el prospecto; la etapa interna dice "en qué punto del proceso"
// dentro de esa caja. Es un campo manual (trato.etapaInterna) que el vendedor avanza.

export type EtapaInterna = { key: string; label: string; hint?: string };

export const ETAPAS_INTERNAS: Record<string, EtapaInterna[]> = {
  LEAD: [
    { key: "SIN_CONTACTAR",        label: "Sin contactar",              hint: "Aún no se hace el primer contacto." },
    { key: "PRESENTACION_ENVIADA", label: "Presentación enviada",       hint: "Se compartió quiénes somos y el material." },
    { key: "GENERANDO_CONFIANZA",  label: "Generando confianza",        hint: "Portfolio, casos de éxito, seguimiento proactivo." },
    { key: "CALIFICANDO",          label: "Calificando interés",        hint: "Detectando si hay un evento real que atender." },
    { key: "LISTO_DESCUBRIMIENTO", label: "Listo para descubrimiento",  hint: "Mostró intención — toca levantar requerimientos." },
  ],
  DESCUBRIMIENTO: [
    { key: "MODALIDAD_DEFINIDA",       label: "Modalidad definida",       hint: "Se eligió inventario o contra-rider." },
    { key: "EN_SEGUIMIENTO",           label: "En seguimiento",           hint: "Contactos previos al levantamiento técnico." },
    { key: "BRIEF_ENVIADO",            label: "Brief enviado",            hint: "Formulario enviado al cliente / en llenado." },
    { key: "DESCUBRIMIENTO_COMPLETO",  label: "Descubrimiento completo",  hint: "Ya tenemos los requerimientos del evento." },
  ],
  OPORTUNIDAD: [
    { key: "COTIZACION_ELABORACION", label: "Cotización en elaboración", hint: "Armando la propuesta." },
    { key: "COTIZACION_ENVIADA",     label: "Cotización enviada",        hint: "Propuesta enviada al cliente." },
    { key: "NEGOCIACION",            label: "En negociación",            hint: "Ajustes de precio, alcance o condiciones." },
    { key: "ESPERANDO_DECISION",     label: "Esperando decisión",        hint: "El cliente está decidiendo." },
  ],
  VENTA_CERRADA: [
    { key: "CONFIRMACION_VERBAL", label: "Confirmación verbal", hint: "Confirmó, falta formalizar." },
    { key: "ANTICIPO_PAGADO",     label: "Anticipo pagado",     hint: "Anticipo recibido — apartado en firme." },
    { key: "EN_PRODUCCION",       label: "En producción",       hint: "Arrancó el levantamiento y la operación." },
  ],
  VENTA_PERDIDA: [
    { key: "MOTIVO_REGISTRADO", label: "Motivo registrado",          hint: "Se documentó por qué se perdió." },
    { key: "NURTURING",         label: "En nurturing / reactivación", hint: "Candidato a re-contacto futuro." },
  ],
};

export function etapasInternasDe(etapa: string): EtapaInterna[] {
  return ETAPAS_INTERNAS[etapa] ?? [];
}

export function esEtapaInternaValida(etapa: string, key: string | null | undefined): boolean {
  if (!key) return false;
  return (ETAPAS_INTERNAS[etapa] ?? []).some(e => e.key === key);
}

export function etapaInternaLabel(etapa: string, key: string | null | undefined): string | null {
  if (!key) return null;
  return (ETAPAS_INTERNAS[etapa] ?? []).find(e => e.key === key)?.label ?? null;
}

// Primera etapa interna de una etapa del pipeline (el punto de entrada al cambiar de etapa).
export function defaultEtapaInterna(etapa: string): string | null {
  return ETAPAS_INTERNAS[etapa]?.[0]?.key ?? null;
}

// Progreso 0-based dentro de la etapa. index = -1 cuando no hay etapa interna aún.
export function progresoEtapaInterna(etapa: string, key: string | null | undefined): { index: number; total: number } {
  const arr = ETAPAS_INTERNAS[etapa] ?? [];
  const idx = key ? arr.findIndex(e => e.key === key) : -1;
  return { index: idx, total: arr.length };
}
