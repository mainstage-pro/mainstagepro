// Configuración de la "Evaluación Post Evento / Post Renta" (cierre del coordinador).
// Dos variantes con la misma estructura y estética; contenido distinto según el
// tipo de servicio del proyecto. Compartida entre el formulario y el resumen.

export type Variante = "evento" | "renta";

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

export type CalifDimension = { id: string; label: string; desc: string };

export const SECCION_CALIF_COLOR = "#34D399";
export const SECCION_MEJORA_COLOR = "#B3985B";

// ─── Variante EVENTO (producción / dirección técnica) ────────────────────────

const SECCIONES_EVENTO: EvalSeccion[] = [
  {
    id: "operativo",
    titulo: "Cumplimiento operativo",
    descripcion: "Apego al protocolo del equipo técnico durante la jornada.",
    color: "#5B9BD5",
    items: [
      { id: "llamado", label: "¿Se llegó al llamado en tiempo y forma?", desc: "El equipo se presentó puntual y listo para trabajar.", tipo: "si-no" },
      { id: "reporteMovimientos", label: "¿Se reportaron los movimientos clave?", desc: "Llegada, montaje, inicio/fin del evento y regreso a bodega.", tipo: "si-no" },
      { id: "evidenciaFoto", label: "¿Se cumplió con la evidencia fotográfica?", desc: "Montaje, operación y fallas; o se marcó que no hubo fallas.", tipo: "si-no" },
    ],
  },
  {
    id: "montaje",
    titulo: "Montaje y ejecución",
    descripcion: "Desarrollo del montaje y del evento en sitio.",
    color: "#E0A458",
    items: [
      { id: "montajeEnTiempo", label: "¿El montaje se realizó dentro del tiempo previsto?", desc: "Inicio y término del montaje según lo planeado.", tipo: "si-no" },
      { id: "pruebas", label: "¿Se realizaron pruebas antes del evento?", desc: "Hubo tiempo para probar audio, iluminación y/o video.", tipo: "si-no" },
      { id: "eventoInicio", label: "¿El evento inició en tiempo y forma?", desc: "Arranque puntual y sin contratiempos técnicos.", tipo: "si-no" },
      { id: "incidenciaCliente", label: "¿Hubo incidencia con el cliente?", desc: "Algún problema o roce con el cliente durante el servicio.", tipo: "si-no", incidenciaSiSi: true },
      { id: "incidenciaEquipo", label: "¿Hubo incidencia con algún equipo?", desc: "Fallas de equipo o mala operación durante el evento.", tipo: "si-no", incidenciaSiSi: true },
    ],
  },
  {
    id: "documentos",
    titulo: "Documentos operativos",
    descripcion: "Documentación técnica generada para el evento.",
    color: "#A78BFA",
    items: [
      { id: "riderCarga", label: "¿Se generó el rider de carga?", desc: "Listado del equipo cargado para el evento.", tipo: "si-no" },
      { id: "fichaOperativa", label: "¿Se generó la ficha técnica / operativa?", desc: "Documento operativo con la información técnica del evento.", tipo: "si-no" },
      { id: "docsComplementarios", label: "¿Se generaron los planos necesarios (render, lighting/stage plot)?", desc: "Opcional. Marca «No fue necesario» si el evento no los requería.", tipo: "si-no-na" },
    ],
  },
];

const CALIF_EVENTO: CalifDimension[] = [
  { id: "operacionTecnica", label: "Operación técnica", desc: "Calidad del montaje, operación y cumplimiento de tiempos en sitio." },
  { id: "coordinacion", label: "Coordinación del equipo", desc: "Organización, liderazgo y manejo de imprevistos durante la jornada." },
  { id: "comunicacionCliente", label: "Comunicación con el cliente", desc: "Claridad y trato con el cliente antes, durante y después." },
];

// ─── Variante RENTA (renta de equipo) ────────────────────────────────────────

const SECCIONES_RENTA: EvalSeccion[] = [
  {
    id: "entregaDevolucion",
    titulo: "Entrega y devolución",
    descripcion: "Cumplimiento en la salida y el regreso del equipo.",
    color: "#5B9BD5",
    items: [
      { id: "entregaCompletaTiempo", label: "¿La entrega se realizó completa y en tiempo?", desc: "Todo el equipo del contrato, funcionando, en la fecha acordada.", tipo: "si-no" },
      { id: "responsivaFirmada", label: "¿Se firmó contrato / responsiva de renta?", desc: "Documento que respalda la renta y las responsabilidades del cliente.", tipo: "si-no" },
      { id: "devolucionCompletaTiempo", label: "¿La devolución se realizó completa y en tiempo?", desc: "Regresó todo (equipos, cables y accesorios) en la fecha pactada.", tipo: "si-no" },
      { id: "revisionRetorno", label: "¿Se revisó el equipo al retorno y regresó en buen estado?", desc: "Checklist de retorno; equipo limpio y presentable.", tipo: "si-no" },
    ],
  },
  {
    id: "estado",
    titulo: "Estado y decisión",
    descripcion: "Condición del equipo al retorno y decisión sobre el cliente.",
    color: "#A78BFA",
    items: [
      { id: "danos", label: "¿Hubo daños en los equipos al regresar?", desc: "Golpes, roturas o desgaste anormal detectado en la revisión.", tipo: "si-no", incidenciaSiSi: true },
      { id: "fallasCliente", label: "¿El cliente reportó fallas de algún equipo?", desc: "Fallas o mal funcionamiento reportadas durante la renta.", tipo: "si-no", incidenciaSiSi: true },
      { id: "cargoAdicional", label: "¿Aplica algún cargo adicional (daños / faltantes / retraso)?", desc: "Cobro extra por daños, piezas faltantes o devolución tardía.", tipo: "si-no", incidenciaSiSi: true },
      { id: "volveriaRentar", label: "¿Volveríamos a rentarle equipo a este cliente?", desc: "Recomendación de seguir rentando según su comportamiento.", tipo: "si-no" },
    ],
  },
];

const CALIF_RENTA: CalifDimension[] = [
  { id: "estadoRetorno", label: "Estado del equipo al retorno", desc: "Condición física y funcional del equipo devuelto." },
  { id: "cumplimientoCliente", label: "Cumplimiento del cliente", desc: "Apego a fechas, cuidado, comunicación y condiciones de la renta." },
];

// ─── Config por variante ─────────────────────────────────────────────────────

export type EvalConfig = {
  variante: Variante;
  etiqueta: string; // título / breadcrumb
  resumenSubtitulo: string; // subtítulo del card dentro del proyecto
  secciones: EvalSeccion[];
  califTitulo: string;
  califDescripcion: string;
  califDimensiones: CalifDimension[];
  resultadoLabel: string; // etiqueta del tablero de resultado
  califFinalSeccionDesc: string;
  califFinalPregunta: string;
};

export function varianteDe(tipoServicio: string | null): Variante {
  return tipoServicio === "RENTA" ? "renta" : "evento";
}

export function aplicaEvaluacion(tipoServicio: string | null): boolean {
  return (
    tipoServicio === "RENTA" ||
    tipoServicio === "PRODUCCION_TECNICA" ||
    tipoServicio === "DIRECCION_TECNICA"
  );
}

export function getEvalConfig(tipoServicio: string | null): EvalConfig {
  if (tipoServicio === "RENTA") {
    return {
      variante: "renta",
      etiqueta: "Evaluación Post Renta",
      resumenSubtitulo: "Cierre de la renta: entrega, devolución y estado del equipo",
      secciones: SECCIONES_RENTA,
      califTitulo: "Calificación de la renta",
      califDescripcion: "Califica cada dimensión de 1 a 5 estrellas. El promedio define el resultado de la renta.",
      califDimensiones: CALIF_RENTA,
      resultadoLabel: "Resultado de la renta",
      califFinalSeccionDesc: "Tu valoración global de la renta, considerando estado del equipo, cliente y logística.",
      califFinalPregunta: "¿Cómo calificarías la renta en general?",
    };
  }
  return {
    variante: "evento",
    etiqueta: "Evaluación Post Evento",
    resumenSubtitulo: "Cierre operativo del coordinador para presentar en junta",
    secciones: SECCIONES_EVENTO,
    califTitulo: "Calificación de la operación",
    califDescripcion: "Califica cada dimensión de 1 a 5 estrellas. El promedio define el resultado de operación y coordinación.",
    califDimensiones: CALIF_EVENTO,
    resultadoLabel: "Operación y coordinación",
    califFinalSeccionDesc: "Tu valoración global del evento, considerando operación, coordinación y resultado.",
    califFinalPregunta: "¿Cómo calificarías el evento en general?",
  };
}

// ─── Helpers (variante-aware) ────────────────────────────────────────────────

export function itemsDeSecciones(secciones: EvalSeccion[]): EvalItem[] {
  return secciones.flatMap((s) => s.items);
}

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
export function contarRespondidos(items: Record<string, ItemResp>, secciones: EvalSeccion[]) {
  const lista = itemsDeSecciones(secciones);
  let respondidos = 0;
  for (const it of lista) {
    const v = items?.[it.id]?.valor;
    if (v === "si" || v === "no" || v === "na") respondidos++;
  }
  return { respondidos, total: lista.length };
}

// Ítems que representan una incidencia detectada (para destacar en la junta).
export function contarIncidencias(items: Record<string, ItemResp>, secciones: EvalSeccion[]) {
  const lista = itemsDeSecciones(secciones);
  let n = 0;
  for (const it of lista) {
    const v = items?.[it.id]?.valor;
    if (it.incidenciaSiSi && v === "si") n++;
    else if (!it.incidenciaSiSi && it.tipo === "si-no" && v === "no") n++;
  }
  return n;
}

// Promedio (1..5) de las dimensiones calificadas.
export function promedioCalificaciones(calif: Record<string, number | null>, dimensiones: CalifDimension[]) {
  const vals = dimensiones
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
