// Notas y aprendizajes de gira: autoevaluación simple, en texto libre, pensada
// para mejora continua y no para calificar a nadie. Dos niveles con la misma
// forma de guardado (JSON en GiraShow.evaluacion / Gira.evaluacion):
//   - por show: lo puntual de esa fecha (montaje, soundcheck, show, desmontaje...).
//   - por gira: la autocrítica general, mucho más breve, para la junta de equipo.
// Ningún campo es obligatorio — la estructura solo sirve de guía de qué anotar.

export type GiraShowEvaluacionData = {
  coordinacionLogistica: string;
  tiemposProduccion: string;
  montaje: string;
  soundcheck: string;
  show: string;
  desmontaje: string;
  notas: string;
  actualizadoPorId: string | null;
  actualizadoPorNombre: string | null;
  actualizadoEn: string | null;
};

export type GiraEvaluacionData = {
  resumenGeneral: string;
  aciertos: string;
  areasMejora: string;
  notas: string;
  actualizadoPorId: string | null;
  actualizadoPorNombre: string | null;
  actualizadoEn: string | null;
};

type CampoTexto<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T];
export type CampoEvaluacion<T> = { id: CampoTexto<T>; label: string; placeholder: string };

export const CAMPOS_EVALUACION_SHOW: CampoEvaluacion<GiraShowEvaluacionData>[] = [
  {
    id: "coordinacionLogistica",
    label: "Coordinación y logística",
    placeholder: "Venue, horarios, accesos, comunicación con el promotor o la casa...",
  },
  {
    id: "tiemposProduccion",
    label: "Tiempos de producción",
    placeholder: "Puntualidad de producción local, crew del artista y producción del artista...",
  },
  {
    id: "montaje",
    label: "Montaje",
    placeholder: "Dificultades durante el montaje; qué faltó, se olvidó o se pudo evitar...",
  },
  {
    id: "soundcheck",
    label: "Soundcheck",
    placeholder: "¿Cómo salió? ¿Hubo tiempo suficiente, calidad, ajustes de última hora?",
  },
  {
    id: "show",
    label: "Durante el show",
    placeholder: "Aciertos y fallas mientras corría el show...",
  },
  {
    id: "desmontaje",
    label: "Desmontaje y load-out",
    placeholder: "Cómo salió el desmontaje y la carga de salida...",
  },
  {
    id: "notas",
    label: "Notas y comentarios adicionales",
    placeholder: "Cualquier otra cosa que valga la pena dejar escrita...",
  },
];

export const CAMPOS_EVALUACION_GIRA: CampoEvaluacion<GiraEvaluacionData>[] = [
  {
    id: "resumenGeneral",
    label: "Resumen general de la gira",
    placeholder: "Cómo fue la gira en general, de inicio a fin...",
  },
  {
    id: "aciertos",
    label: "Aciertos",
    placeholder: "Qué funcionó bien y vale la pena repetir en la próxima gira...",
  },
  {
    id: "areasMejora",
    label: "Áreas de mejora",
    placeholder: "Qué cambiar o preparar mejor la próxima vez...",
  },
  {
    id: "notas",
    label: "Notas y comentarios adicionales",
    placeholder: "Cualquier otra cosa que valga la pena dejar escrita...",
  },
];

export function emptyGiraShowEvaluacion(): GiraShowEvaluacionData {
  return {
    coordinacionLogistica: "",
    tiemposProduccion: "",
    montaje: "",
    soundcheck: "",
    show: "",
    desmontaje: "",
    notas: "",
    actualizadoPorId: null,
    actualizadoPorNombre: null,
    actualizadoEn: null,
  };
}

export function emptyGiraEvaluacion(): GiraEvaluacionData {
  return {
    resumenGeneral: "",
    aciertos: "",
    areasMejora: "",
    notas: "",
    actualizadoPorId: null,
    actualizadoPorNombre: null,
    actualizadoEn: null,
  };
}

export function showEvaluacionTieneContenido(d: GiraShowEvaluacionData | null | undefined): boolean {
  if (!d) return false;
  return CAMPOS_EVALUACION_SHOW.some((c) => (d[c.id] ?? "").trim().length > 0);
}

export function giraEvaluacionTieneContenido(d: GiraEvaluacionData | null | undefined): boolean {
  if (!d) return false;
  return CAMPOS_EVALUACION_GIRA.some((c) => (d[c.id] ?? "").trim().length > 0);
}
