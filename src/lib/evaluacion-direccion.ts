// Configuración de la "Evaluación de Dirección" del evento.
// A diferencia del reporte del coordinador (que sólo documenta hechos con evidencia),
// aquí DIRECCIÓN califica de 1 a 5 cada dimensión, apoyándose en el reporte y la
// evidencia del coordinador. Es el juicio; el reporte es la materia prima.

import { promedioCalificaciones, nivelResultado, type CalifDimension } from "@/lib/evaluacion-post-evento";

export { nivelResultado };

export type EvaluacionDireccionData = {
  evaluadorId: string | null;
  evaluadorNombre: string | null;
  evaluadoEn: string | null; // primera vez que se guardó
  actualizadoEn: string | null; // última edición
  calificaciones: Record<string, number | null>; // dimensión -> 1..5
  notas: Record<string, string>; // dimensión -> nota de dirección
  comentario: string; // conclusión global de dirección
  repetiriamos: "si" | "con_ajustes" | "no" | null; // ¿repetiríamos con este coordinador?
  finalizada: boolean;
  finalizadaEn: string | null;
};

export type DireccionConfig = {
  variante: "evento" | "renta";
  etiqueta: string;
  subtitulo: string;
  dimensiones: CalifDimension[];
};

// ─── Dimensiones PRODUCCIÓN (set completo) ───────────────────────────────────
const DIM_EVENTO: CalifDimension[] = [
  { id: "puntualidad", label: "Puntualidad", desc: "Llegada al llamado y arranque del montaje en tiempo." },
  { id: "cumplimientoTiempos", label: "Cumplimiento de tiempos", desc: "Montaje, pruebas, inicio y desmontaje dentro de lo planeado." },
  { id: "uniforme", label: "Uniforme y presentación personal", desc: "Equipo bien presentado, con uniforme y en orden." },
  { id: "montaje", label: "Montaje", desc: "Calidad, orden y seguridad del montaje en sitio." },
  { id: "organizacion", label: "Organización", desc: "Planeación, logística y flujo de trabajo del equipo." },
  { id: "estetica", label: "Estética", desc: "Cuidado visual del escenario, cableado oculto y acabado." },
  { id: "resolucionProblemas", label: "Resolución de problemas e incidencias", desc: "Reacción y solución ante imprevistos durante la jornada." },
  { id: "fallasTecnicas", label: "Manejo de fallas técnicas", desc: "Prevención y respuesta ante fallas de equipo." },
  { id: "presentacionEquipos", label: "Presentación de los equipos", desc: "Estado y presentación de los equipos usados." },
  { id: "limpieza", label: "Limpieza", desc: "Orden y limpieza del área de trabajo antes, durante y al retirarse." },
  { id: "comunicacionGrupos", label: "Comunicación en los grupos", desc: "Reportes claros y oportunos en los grupos de trabajo." },
  { id: "tratoCliente", label: "Trato con el cliente", desc: "Comunicación y actitud frente al cliente en sitio." },
  { id: "gastosImprevistos", label: "Gastos e imprevistos", desc: "Manejo responsable del presupuesto y de gastos no previstos." },
  { id: "liderazgo", label: "Liderazgo del coordinador", desc: "Dirección del equipo, iniciativa y toma de decisiones." },
  { id: "calidadReporte", label: "Calidad del reporte y evidencia", desc: "Reporte completo, honesto y con la evidencia que lo respalda." },
];

// ─── Dimensiones RENTA (subconjunto) ─────────────────────────────────────────
const DIM_RENTA: CalifDimension[] = [
  { id: "puntualidadEntrega", label: "Puntualidad de entrega y devolución", desc: "Cumplimiento de fechas de entrega y recolección." },
  { id: "estadoEquipoRetorno", label: "Estado y limpieza del equipo al retorno", desc: "Condición física y limpieza del equipo devuelto." },
  { id: "documentacion", label: "Documentación", desc: "Responsiva / contrato firmado y en orden." },
  { id: "manejoDanos", label: "Manejo de daños y cargos", desc: "Detección de daños y aplicación correcta de cargos." },
  { id: "comunicacion", label: "Comunicación", desc: "Comunicación con el cliente durante la renta." },
  { id: "gastosImprevistos", label: "Gastos e imprevistos", desc: "Manejo responsable de gastos no previstos." },
  { id: "calidadReporte", label: "Calidad del reporte y evidencia", desc: "Reporte completo, honesto y con la evidencia que lo respalda." },
];

export function getDireccionConfig(tipoServicio: string | null): DireccionConfig {
  if (tipoServicio === "RENTA") {
    return {
      variante: "renta",
      etiqueta: "Evaluación de Dirección",
      subtitulo: "Calificación de dirección sobre la renta, con base en el reporte y la evidencia.",
      dimensiones: DIM_RENTA,
    };
  }
  return {
    variante: "evento",
    etiqueta: "Evaluación de Dirección",
    subtitulo: "Calificación de dirección sobre el evento, con base en el reporte y la evidencia.",
    dimensiones: DIM_EVENTO,
  };
}

export function emptyDireccionData(): EvaluacionDireccionData {
  return {
    evaluadorId: null,
    evaluadorNombre: null,
    evaluadoEn: null,
    actualizadoEn: null,
    calificaciones: {},
    notas: {},
    comentario: "",
    repetiriamos: null,
    finalizada: false,
    finalizadaEn: null,
  };
}

// Promedio 1..5 de las dimensiones calificadas por dirección.
export function promedioDireccion(data: EvaluacionDireccionData, config: DireccionConfig): number | null {
  return promedioCalificaciones(data.calificaciones ?? {}, config.dimensiones);
}

// Dimensiones calificadas / total (para el tablero de progreso).
export function contarCalificadas(data: EvaluacionDireccionData, config: DireccionConfig) {
  const calificadas = config.dimensiones.filter((d) => {
    const v = data.calificaciones?.[d.id];
    return typeof v === "number" && v > 0;
  }).length;
  return { calificadas, total: config.dimensiones.length };
}
