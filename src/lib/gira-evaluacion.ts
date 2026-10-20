// Notas y aprendizajes de gira: por tema se documentan hallazgos (una falla o
// situación puntual + la solución que se propone, con severidad) y un espacio
// de comentarios abiertos para lo que no encaja como hallazgo. Dos niveles,
// misma forma de guardado (JSON en GiraShow.evaluacion / Gira.evaluacion):
//   - por show: los temas de esa fecha (coordinación, montaje, soundcheck...).
//   - por gira: los temas que importan a toda la producción, más un resumen
//     ejecutivo y los aciertos que vale la pena repetir en la próxima gira.
// Ningún campo es obligatorio — la estructura solo guía qué anotar.

export type Severidad = "MENOR" | "IMPORTANTE" | "CRITICA";

export const SEVERIDADES: Severidad[] = ["MENOR", "IMPORTANTE", "CRITICA"];

export const SEVERIDAD_LABEL: Record<Severidad, string> = {
  MENOR: "Menor",
  IMPORTANTE: "Importante",
  CRITICA: "Crítica",
};

export interface Hallazgo {
  id: string;
  severidad: Severidad;
  falla: string;
  solucion: string;
}

export interface TemaEvaluacion {
  hallazgos: Hallazgo[];
  comentarios: string;
}

export function temaVacio(): TemaEvaluacion {
  return { hallazgos: [], comentarios: "" };
}

export function temaTieneContenido(t: TemaEvaluacion | null | undefined): boolean {
  if (!t) return false;
  if ((t.comentarios ?? "").trim().length > 0) return true;
  return (t.hallazgos ?? []).some((h) => h.falla.trim().length > 0 || h.solucion.trim().length > 0);
}

function construirTemas<K extends string>(
  defs: readonly { id: K }[],
  valor: Record<string, unknown> | null | undefined,
): Record<K, TemaEvaluacion> {
  const out = {} as Record<K, TemaEvaluacion>;
  for (const d of defs) {
    const crudo = (valor?.[d.id] ?? null) as Partial<TemaEvaluacion> | null;
    out[d.id] = {
      comentarios: typeof crudo?.comentarios === "string" ? crudo.comentarios : "",
      hallazgos: Array.isArray(crudo?.hallazgos) ? (crudo.hallazgos as Hallazgo[]) : [],
    };
  }
  return out;
}

// ── Por show ──────────────────────────────────────────────────────────────────

export type TemaShowId =
  | "coordinacionLogistica"
  | "tiemposProduccion"
  | "montaje"
  | "soundcheck"
  | "show"
  | "desmontaje";

export const TEMAS_SHOW: { id: TemaShowId; label: string; ayuda: string }[] = [
  {
    id: "coordinacionLogistica",
    label: "Coordinación y logística",
    ayuda: "Venue, horarios, accesos, comunicación con el promotor o la casa.",
  },
  {
    id: "tiemposProduccion",
    label: "Tiempos de producción",
    ayuda: "Puntualidad de producción local, crew del artista y producción del artista.",
  },
  {
    id: "montaje",
    label: "Montaje",
    ayuda: "Dificultades durante el montaje; qué faltó, se olvidó o se pudo evitar.",
  },
  {
    id: "soundcheck",
    label: "Soundcheck",
    ayuda: "¿Hubo tiempo suficiente? ¿Calidad, ajustes de última hora?",
  },
  {
    id: "show",
    label: "Durante el show",
    ayuda: "Aciertos y fallas mientras corría el show.",
  },
  {
    id: "desmontaje",
    label: "Desmontaje y load-out",
    ayuda: "Cómo salió el desmontaje y la carga de salida.",
  },
];

export interface GiraShowEvaluacionData {
  temas: Record<TemaShowId, TemaEvaluacion>;
  actualizadoPorId: string | null;
  actualizadoPorNombre: string | null;
  actualizadoEn: string | null;
}

export function emptyGiraShowEvaluacion(): GiraShowEvaluacionData {
  return {
    temas: construirTemas(TEMAS_SHOW, null),
    actualizadoPorId: null,
    actualizadoPorNombre: null,
    actualizadoEn: null,
  };
}

export function parseGiraShowEvaluacion(raw: unknown): GiraShowEvaluacionData {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    temas: construirTemas(TEMAS_SHOW, r.temas as Record<string, unknown> | null | undefined),
    actualizadoPorId: typeof r.actualizadoPorId === "string" ? r.actualizadoPorId : null,
    actualizadoPorNombre: typeof r.actualizadoPorNombre === "string" ? r.actualizadoPorNombre : null,
    actualizadoEn: typeof r.actualizadoEn === "string" ? r.actualizadoEn : null,
  };
}

export function showEvaluacionTieneContenido(d: GiraShowEvaluacionData | null | undefined): boolean {
  if (!d) return false;
  return TEMAS_SHOW.some((t) => temaTieneContenido(d.temas?.[t.id]));
}

// ── Por gira ──────────────────────────────────────────────────────────────────

export type TemaGiraId =
  | "coordinacionGeneral"
  | "logisticaTransporte"
  | "produccionTecnica"
  | "equipoPersonal"
  | "administracionFinanzas";

export const TEMAS_GIRA: { id: TemaGiraId; label: string; ayuda: string }[] = [
  {
    id: "coordinacionGeneral",
    label: "Coordinación con management y promotores",
    ayuda: "Comunicación, tiempos de respuesta, cambios de última hora — lo que se repitió en varias fechas.",
  },
  {
    id: "logisticaTransporte",
    label: "Logística y transporte",
    ayuda: "Vuelos, traslados, hoteles, rooming.",
  },
  {
    id: "produccionTecnica",
    label: "Producción técnica y equipo",
    ayuda: "Rider, montaje, fallas de equipo recurrentes entre fechas.",
  },
  {
    id: "equipoPersonal",
    label: "Equipo y personal",
    ayuda: "Crew de Mainstage, roles, carga de trabajo, rotación.",
  },
  {
    id: "administracionFinanzas",
    label: "Administración y finanzas",
    ayuda: "Gastos, viáticos, imprevistos de presupuesto.",
  },
];

export interface GiraEvaluacionData {
  resumenGeneral: string;
  temas: Record<TemaGiraId, TemaEvaluacion>;
  aciertos: string;
  actualizadoPorId: string | null;
  actualizadoPorNombre: string | null;
  actualizadoEn: string | null;
}

export function emptyGiraEvaluacion(): GiraEvaluacionData {
  return {
    resumenGeneral: "",
    temas: construirTemas(TEMAS_GIRA, null),
    aciertos: "",
    actualizadoPorId: null,
    actualizadoPorNombre: null,
    actualizadoEn: null,
  };
}

export function parseGiraEvaluacion(raw: unknown): GiraEvaluacionData {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    resumenGeneral: typeof r.resumenGeneral === "string" ? r.resumenGeneral : "",
    temas: construirTemas(TEMAS_GIRA, r.temas as Record<string, unknown> | null | undefined),
    aciertos: typeof r.aciertos === "string" ? r.aciertos : "",
    actualizadoPorId: typeof r.actualizadoPorId === "string" ? r.actualizadoPorId : null,
    actualizadoPorNombre: typeof r.actualizadoPorNombre === "string" ? r.actualizadoPorNombre : null,
    actualizadoEn: typeof r.actualizadoEn === "string" ? r.actualizadoEn : null,
  };
}

export function giraEvaluacionTieneContenido(d: GiraEvaluacionData | null | undefined): boolean {
  if (!d) return false;
  if (d.resumenGeneral.trim().length > 0 || d.aciertos.trim().length > 0) return true;
  return TEMAS_GIRA.some((t) => temaTieneContenido(d.temas?.[t.id]));
}
