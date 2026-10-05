/**
 * El alcance de Dirección y operaciones se palomea en el descubrimiento y se
 * cobra en la propuesta. Para que lo palomeado llegue al documento, los dos
 * lados hablan el mismo vocabulario: `ServicioPM.clave`.
 *
 * Antes el descubrimiento usaba códigos `DT_*` propios que nadie más leía.
 * Aquí vive el puente para los tratos que los traen guardados.
 */

/** `DT_*` del descubrimiento viejo → `ServicioPM.clave` del catálogo. */
export const MAPA_DT: Record<string, string> = {
  DT_CONCEPTUAL: "DISENO_CONCEPTO",
  DT_PROVEEDORES: "COORD_PROVEEDORES",
  DT_LOGISTICA: "LOGISTICA_EVENTO",
  DT_PRESUPUESTO: "CONTROL_PRESUPUESTO",
  "DT_SUPERVISIÓN": "OPERACIONES_SITIO",
  // DT_PT_PROPIA no tiene equivalente: "producción técnica propia" es un escalón
  // de `Trato.servicios`, no un servicio que se cobre en la propuesta.
};

export const NIVELES_INVOLUCRAMIENTO = [
  {
    id: "ASESORIA",
    label: "Solo asesoría",
    desc: "Guía y recomendaciones. El cliente ejecuta.",
  },
  {
    id: "COORDINACION_PARCIAL",
    label: "Coordinación parcial",
    desc: "Gestionamos algunas áreas; el cliente coordina el resto.",
  },
  {
    id: "DIRECCION_INTEGRAL",
    label: "Dirección integral",
    desc: "Mainstage toma el control total de producción y logística.",
  },
] as const;

export type NivelInvolucramiento = (typeof NIVELES_INVOLUCRAMIENTO)[number]["id"];

/** `DT_*` de nivel → valor de `Trato.nivelInvolucramiento`. */
const MAPA_NIVEL: Record<string, NivelInvolucramiento> = {
  DT_ASESOR: "ASESORIA",
  DT_PARCIAL: "COORDINACION_PARCIAL",
  DT_INTEGRAL: "DIRECCION_INTEGRAL",
};

export function etiquetaNivel(nivel: string | null | undefined): string {
  return NIVELES_INVOLUCRAMIENTO.find((n) => n.id === nivel)?.label ?? "";
}

/**
 * Traduce un `serviciosInteres` guardado al vocabulario del catálogo. Las claves
 * que ya son del catálogo pasan intactas; los niveles y `DT_PT_PROPIA` se caen
 * (el nivel vive en su propia columna, la PT propia en `Trato.servicios`).
 */
export function migrarServiciosInteres(claves: string[]): string[] {
  const out: string[] = [];
  for (const c of claves) {
    if (c in MAPA_NIVEL || c === "DT_PT_PROPIA") continue;
    const clave = MAPA_DT[c] ?? c;
    if (!out.includes(clave)) out.push(clave);
  }
  return out;
}

/** Rescata el nivel de involucramiento de un `serviciosInteres` viejo. */
export function nivelDesdeServiciosInteres(claves: string[]): NivelInvolucramiento | "" {
  for (const c of claves) if (c in MAPA_NIVEL) return MAPA_NIVEL[c];
  return "";
}
