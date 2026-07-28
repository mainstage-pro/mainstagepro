// Configuración de la "Evaluación de Dirección" del servicio.
// A diferencia del reporte del coordinador (que sólo documenta hechos con evidencia),
// aquí DIRECCIÓN califica de 1 a 5 cada dimensión clave, apoyándose en el reporte y la
// evidencia del coordinador. Es el juicio; el reporte es la materia prima.
// Las dimensiones se agrupan en bloques para que sea completa pero clara.

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

export type DireccionBloque = { id: string; titulo: string; dimensiones: CalifDimension[] };

export type DireccionConfig = {
  variante: "evento" | "renta";
  etiqueta: string;
  subtitulo: string;
  bloques: DireccionBloque[];
  dimensiones: CalifDimension[]; // aplanado, para promedio y conteo
};

// ─── Dimensiones PRODUCCIÓN (9 claves en 3 bloques) ──────────────────────────
const BLOQUES_EVENTO: DireccionBloque[] = [
  {
    id: "sitio",
    titulo: "En sitio",
    dimensiones: [
      { id: "puntualidadTiempos", label: "Puntualidad y cumplimiento de tiempos", desc: "Llegada al llamado y cumplimiento de montaje, pruebas, inicio y desmontaje." },
      { id: "montajeEstetica", label: "Montaje, estética y limpieza", desc: "Calidad y seguridad del montaje, cuidado visual, cableado oculto y orden del área." },
      { id: "resolucionIncidencias", label: "Resolución de incidencias y fallas", desc: "Reacción y solución ante imprevistos y fallas técnicas durante la jornada." },
    ],
  },
  {
    id: "liderazgo",
    titulo: "Liderazgo y comunicación",
    dimensiones: [
      { id: "organizacionLiderazgo", label: "Organización y liderazgo del equipo", desc: "Planeación, logística, dirección del equipo y toma de decisiones." },
      { id: "comunicacionDireccion", label: "Comunicación con dirección", desc: "Reportes claros y oportunos a dirección: avisos, dudas y cierre del evento." },
      { id: "tratoCliente", label: "Trato con el cliente", desc: "Comunicación, actitud y presentación frente al cliente en sitio." },
      { id: "actitudProactividad", label: "Actitud y proactividad", desc: "Disposición, iniciativa y compromiso para anticiparse y resolver." },
    ],
  },
  {
    id: "cierre",
    titulo: "Cierre y responsabilidad",
    dimensiones: [
      { id: "gastosImprevistos", label: "Manejo de gastos e imprevistos", desc: "Uso responsable del presupuesto y justificación de gastos no previstos." },
      { id: "calidadReporte", label: "Calidad y honestidad del reporte", desc: "Reporte completo, veraz y respaldado con la evidencia que lo sustenta." },
    ],
  },
];

// ─── Dimensiones RENTA (6 claves en 2 bloques) ───────────────────────────────
const BLOQUES_RENTA: DireccionBloque[] = [
  {
    id: "equipo",
    titulo: "Entrega y equipo",
    dimensiones: [
      { id: "puntualidadEntrega", label: "Puntualidad de entrega y devolución", desc: "Cumplimiento de fechas de entrega y recolección." },
      { id: "estadoRetorno", label: "Estado y limpieza del equipo al retorno", desc: "Condición física y limpieza del equipo devuelto." },
      { id: "documentacion", label: "Documentación", desc: "Responsiva / contrato firmado y en orden." },
    ],
  },
  {
    id: "cierre",
    titulo: "Comunicación y cierre",
    dimensiones: [
      { id: "comunicacionDireccion", label: "Comunicación con dirección", desc: "Reportes claros y oportunos a dirección durante la renta." },
      { id: "manejoDanos", label: "Manejo de daños, cargos y gastos", desc: "Detección de daños, aplicación correcta de cargos y gastos no previstos." },
      { id: "calidadReporte", label: "Calidad y honestidad del reporte", desc: "Reporte completo, veraz y respaldado con evidencia." },
    ],
  },
];

function aplanar(bloques: DireccionBloque[]): CalifDimension[] {
  return bloques.flatMap((b) => b.dimensiones);
}

export function getDireccionConfig(tipoServicio: string | null): DireccionConfig {
  if (tipoServicio === "RENTA") {
    return {
      variante: "renta",
      etiqueta: "Evaluación de Dirección",
      subtitulo: "Calificación de dirección sobre la renta, con base en el reporte y la evidencia.",
      bloques: BLOQUES_RENTA,
      dimensiones: aplanar(BLOQUES_RENTA),
    };
  }
  return {
    variante: "evento",
    etiqueta: "Evaluación de Dirección",
    subtitulo: "Calificación de dirección sobre el evento, con base en el reporte y la evidencia.",
    bloques: BLOQUES_EVENTO,
    dimensiones: aplanar(BLOQUES_EVENTO),
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
