// Configuración de la "Evaluación Post Evento" (cierre operativo del coordinador).
// Compartida entre el formulario (página) y el resumen dentro del proyecto.

export type RespValor = "si" | "no" | "na";

export type ItemResp = { valor: RespValor | null; comentario: string };

export type EvalPostEventoData = {
  llenadoPorId: string | null;
  llenadoPorNombre: string | null;
  respondidoEn: string | null; // primera vez que se guardó
  actualizadoEn: string | null; // última edición
  items: Record<string, ItemResp>;
  calificaciones: Record<string, number | null>; // dimensión -> 1..5
  calificacionFinal: number | null; // calificación global del coordinador 1..5
  propuestasMejora: string[];
  comentariosFinales: string;
};

export type EvalItem = {
  id: string;
  label: string;
  desc?: string;
  // "si-no": Sí / No · "si-no-na": Sí / No / No fue necesario (documentos opcionales)
  tipo: "si-no" | "si-no-na";
  // Cuando "si" refleja una incidencia (no un logro), lo marcamos para el resumen.
  incidenciaSiSi?: boolean;
};

export type EvalSeccion = {
  id: string;
  titulo: string;
  descripcion?: string;
  color: string; // acento (hex) para títulos, barras y bordes
  items: EvalItem[];
};

export const EVAL_SECCIONES: EvalSeccion[] = [
  {
    id: "operativo",
    titulo: "Cumplimiento operativo",
    descripcion: "Apego al protocolo del equipo técnico durante toda la jornada.",
    color: "#5B9BD5",
    items: [
      { id: "llamado", label: "¿Se llegó al llamado en tiempo y forma?", desc: "El equipo se presentó a la hora citada y listo para trabajar.", tipo: "si-no" },
      { id: "uniforme", label: "¿El equipo portó uniforme (o ropa negra)?", desc: "Imagen adecuada: uniforme de la empresa o, en su defecto, ropa negra.", tipo: "si-no" },
      { id: "viaticos", label: "¿Se solicitaron los viáticos correspondientes?", desc: "Se gestionaron a tiempo casetas, combustible, comidas u hospedaje.", tipo: "si-no" },
      { id: "celular", label: "¿Se hizo uso del celular de la empresa?", desc: "Se usó la línea/equipo de la empresa para la comunicación operativa.", tipo: "si-no" },
      { id: "reporteMovimientos", label: "¿Se reportó cada movimiento importante?", desc: "Llegada a venue, inicio de montaje, inicio del evento, fin del evento, llegada a bodega y término de operación.", tipo: "si-no" },
      { id: "evidenciaFoto", label: "¿Se cumplió con la evidencia fotográfica?", desc: "Montaje, operación, momentos importantes y fallas; o se marcó explícitamente que no hubo fallas.", tipo: "si-no" },
    ],
  },
  {
    id: "montaje",
    titulo: "Montaje y ejecución",
    descripcion: "Desarrollo del montaje, del evento y del cierre en sitio.",
    color: "#E0A458",
    items: [
      { id: "montajeInicio", label: "¿El montaje inició en tiempo?", desc: "Arranque del montaje según lo planeado.", tipo: "si-no" },
      { id: "montajeTermino", label: "¿El montaje terminó en tiempo?", desc: "Se dejó todo listo dentro de la ventana prevista.", tipo: "si-no" },
      { id: "pruebas", label: "¿Se pudieron realizar pruebas?", desc: "Hubo tiempo para pruebas de audio, iluminación y/o video antes del evento.", tipo: "si-no" },
      { id: "eventoInicio", label: "¿El evento inició en tiempo y forma?", desc: "Arranque puntual y sin contratiempos técnicos.", tipo: "si-no" },
      { id: "incidenciaCliente", label: "¿Hubo incidencia con el cliente?", desc: "Algún problema o roce con el cliente antes, durante o después del evento.", tipo: "si-no", incidenciaSiSi: true },
      { id: "incidenciaEquipo", label: "¿Hubo incidencia con algún equipo?", desc: "Fallas de equipo o mala operación durante el evento.", tipo: "si-no", incidenciaSiSi: true },
      { id: "eventoEnTiempo", label: "¿El evento terminó en tiempo (sin extenderse)?", desc: "Se cerró en el horario acordado, sin tiempo extra imprevisto.", tipo: "si-no" },
      { id: "equipoOrdenado", label: "¿El equipo quedó ordenado en carga/descarga?", desc: "Todo el equipo quedó ordenado y listo en zona de carga/descarga.", tipo: "si-no" },
    ],
  },
  {
    id: "documentos",
    titulo: "Documentos operativos",
    descripcion: "Documentación técnica generada para el evento. Render, lighting plot y stage plot son opcionales.",
    color: "#A78BFA",
    items: [
      { id: "riderCarga", label: "¿Se generó el rider de carga?", desc: "Listado de equipo cargado para el evento.", tipo: "si-no" },
      { id: "fichaOperativa", label: "¿Se generó la ficha técnica / operativa?", desc: "Documento operativo con la información técnica del evento.", tipo: "si-no" },
      { id: "render", label: "Render", desc: "Opcional. Marca «No fue necesario» si el evento no lo requería.", tipo: "si-no-na" },
      { id: "lightingPlot", label: "Lighting plot", desc: "Opcional. Plano de iluminación; marca «No fue necesario» si no aplica.", tipo: "si-no-na" },
      { id: "stagePlot", label: "Stage plot", desc: "Opcional. Diagrama de escenario; marca «No fue necesario» si no aplica.", tipo: "si-no-na" },
    ],
  },
];

export type CalifDimension = { id: string; label: string; desc: string };

export const CALIF_DIMENSIONES: CalifDimension[] = [
  { id: "operacionTecnica", label: "Operación técnica", desc: "Calidad del montaje, operación y desempeño técnico en sitio." },
  { id: "coordinacion", label: "Coordinación del equipo", desc: "Organización, liderazgo y comunicación interna durante la jornada." },
  { id: "comunicacionCliente", label: "Comunicación con el cliente", desc: "Claridad y trato con el cliente antes, durante y después." },
  { id: "tiempos", label: "Cumplimiento de tiempos", desc: "Apego al cronograma: llamado, montaje, pruebas e inicio." },
  { id: "imprevistos", label: "Manejo de imprevistos", desc: "Capacidad de resolver fallas o cambios de último momento." },
];

export const EVAL_ITEMS: EvalItem[] = EVAL_SECCIONES.flatMap((s) => s.items);

export const SECCION_CALIF_COLOR = "#34D399";
export const SECCION_MEJORA_COLOR = "#B3985B";

export function emptyEvalData(): EvalPostEventoData {
  return {
    llenadoPorId: null,
    llenadoPorNombre: null,
    respondidoEn: null,
    actualizadoEn: null,
    items: {},
    calificaciones: {},
    calificacionFinal: null,
    propuestasMejora: [],
    comentariosFinales: "",
  };
}

// Un ítem "requiere respuesta" salvo los opcionales marcados como "No fue necesario".
export function contarRespondidos(items: Record<string, ItemResp>) {
  let respondidos = 0;
  for (const it of EVAL_ITEMS) {
    const v = items?.[it.id]?.valor;
    if (v === "si" || v === "no" || v === "na") respondidos++;
  }
  return { respondidos, total: EVAL_ITEMS.length };
}

// Ítems que representan una incidencia detectada (para destacar en la junta).
export function contarIncidencias(items: Record<string, ItemResp>) {
  let n = 0;
  for (const it of EVAL_ITEMS) {
    const v = items?.[it.id]?.valor;
    if (it.incidenciaSiSi && v === "si") n++;
    else if (!it.incidenciaSiSi && it.tipo === "si-no" && v === "no") n++;
  }
  return n;
}

// Promedio (1..5) de las dimensiones calificadas.
export function promedioCalificaciones(calif: Record<string, number | null>) {
  const vals = CALIF_DIMENSIONES
    .map((d) => calif?.[d.id])
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Nivel + color según una calificación 1..5.
export function nivelResultado(prom: number | null): { label: string; color: string } {
  if (prom == null || prom <= 0) return { label: "Sin calificar", color: "#555555" };
  if (prom >= 4.5) return { label: "Excelente", color: "#34D399" };
  if (prom >= 3.5) return { label: "Bueno", color: "#A3E635" };
  if (prom >= 2.5) return { label: "Regular", color: "#FACC15" };
  return { label: "Deficiente", color: "#F87171" };
}
