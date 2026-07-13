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

const CALIF_EVENTO: CalifDimension[] = [
  { id: "operacionTecnica", label: "Operación técnica", desc: "Calidad del montaje, operación y desempeño técnico en sitio." },
  { id: "coordinacion", label: "Coordinación del equipo", desc: "Organización, liderazgo y comunicación interna durante la jornada." },
  { id: "comunicacionCliente", label: "Comunicación con el cliente", desc: "Claridad y trato con el cliente antes, durante y después." },
  { id: "tiempos", label: "Cumplimiento de tiempos", desc: "Apego al cronograma: llamado, montaje, pruebas e inicio." },
  { id: "imprevistos", label: "Manejo de imprevistos", desc: "Capacidad de resolver fallas o cambios de último momento." },
];

// ─── Variante RENTA (renta de equipo) ────────────────────────────────────────

const SECCIONES_RENTA: EvalSeccion[] = [
  {
    id: "entrega",
    titulo: "Entrega del equipo",
    descripcion: "Cumplimiento en la salida del equipo hacia el cliente.",
    color: "#5B9BD5",
    items: [
      { id: "entregaTiempo", label: "¿La entrega se realizó en tiempo y forma?", desc: "El equipo se entregó en la fecha y hora acordadas con el cliente.", tipo: "si-no" },
      { id: "entregaCompleta", label: "¿Se entregó el equipo completo (equipos, cables y accesorios)?", desc: "Todo lo listado en el contrato se entregó al cliente.", tipo: "si-no" },
      { id: "entregaBuenEstado", label: "¿El equipo se entregó funcionando y en buen estado?", desc: "Se verificó funcionamiento y estado físico antes de la entrega.", tipo: "si-no" },
      { id: "entregaAcordado", label: "¿La entrega se hizo según lo acordado (sin cambio de planes)?", desc: "Sin cambios de última hora en fecha, lugar o alcance de la renta.", tipo: "si-no" },
      { id: "responsivaFirmada", label: "¿Se firmó contrato / responsiva de renta?", desc: "Documento que respalda la renta y las responsabilidades del cliente.", tipo: "si-no" },
      { id: "evidenciaEntrega", label: "¿Se documentó la entrega con evidencia (fotos / checklist de salida)?", desc: "Fotos y/o inventario firmado del equipo que salió a renta.", tipo: "si-no" },
    ],
  },
  {
    id: "devolucion",
    titulo: "Devolución del equipo",
    descripcion: "Cumplimiento del cliente en el regreso del equipo.",
    color: "#E0A458",
    items: [
      { id: "devolucionTiempo", label: "¿La devolución se realizó en tiempo?", desc: "El cliente devolvió el equipo en la fecha y hora pactadas.", tipo: "si-no" },
      { id: "devolucionCompleta", label: "¿El equipo y accesorios regresaron completos?", desc: "Regresaron todos los equipos, cables y accesorios entregados; sin faltantes.", tipo: "si-no" },
      { id: "devolucionAcordado", label: "¿La devolución se hizo según lo acordado (sin cambio de planes)?", desc: "Sin cambios imprevistos en la logística de recolección o devolución.", tipo: "si-no" },
      { id: "revisionRetorno", label: "¿Se revisó el equipo al momento de la devolución?", desc: "Se hizo checklist de retorno frente al cliente o al recibir en bodega.", tipo: "si-no" },
      { id: "equipoLimpio", label: "¿El equipo regresó limpio y presentable?", desc: "Estado de limpieza al reingresar a bodega.", tipo: "si-no" },
    ],
  },
  {
    id: "estado",
    titulo: "Estado, daños y decisión",
    descripcion: "Condición del equipo al retorno y decisión sobre el cliente.",
    color: "#A78BFA",
    items: [
      { id: "danos", label: "¿Hubo daños en los equipos al regresar?", desc: "Golpes, roturas o desgaste anormal detectado en la revisión de retorno.", tipo: "si-no", incidenciaSiSi: true },
      { id: "fallasCliente", label: "¿El cliente reportó fallas de algún equipo en específico?", desc: "Fallas o mal funcionamiento reportadas por el cliente durante la renta.", tipo: "si-no", incidenciaSiSi: true },
      { id: "requiereMantenimiento", label: "¿Algún equipo requiere mantenimiento o reparación tras la renta?", desc: "Equipo que debe entrar a servicio antes de volver a rentarse.", tipo: "si-no", incidenciaSiSi: true },
      { id: "cargoAdicional", label: "¿Aplica algún cargo adicional al cliente (daños / faltantes / retraso)?", desc: "Se identificó un cobro extra por daños, piezas faltantes o devolución tardía.", tipo: "si-no", incidenciaSiSi: true },
      { id: "volveriaRentar", label: "¿Volveríamos a rentarle equipo a este cliente?", desc: "Recomendación de seguir rentando a este cliente según su comportamiento.", tipo: "si-no" },
    ],
  },
];

const CALIF_RENTA: CalifDimension[] = [
  { id: "estadoRetorno", label: "Estado del equipo al retorno", desc: "Condición física y funcional del equipo devuelto." },
  { id: "cumplimientoCliente", label: "Cumplimiento del cliente", desc: "Apego del cliente a fechas, cuidado y condiciones de la renta." },
  { id: "comunicacionCliente", label: "Comunicación con el cliente", desc: "Claridad y trato durante la coordinación de entrega y devolución." },
  { id: "logistica", label: "Logística de entrega y recolección", desc: "Eficiencia en tiempos y traslados de entrega y devolución." },
  { id: "rentabilidad", label: "Rentabilidad de la renta", desc: "Relación entre el ingreso de la renta y el costo/desgaste involucrado." },
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
