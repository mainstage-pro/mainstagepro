// Configuración del "Reporte Post Evento / Post Renta" (bitácora del coordinador).
// Es un REPORTE de hechos frente al servicio (no una autoevaluación): checklist de
// hitos, evidencia obligatoria, gastos y notas del evento. Dirección es quien califica.
// Dos variantes con la misma estructura y estética; contenido según el tipo de servicio.

export type Variante = "evento" | "renta";

export type RespValor = "si" | "no" | "na";

export type ItemResp = { valor: RespValor | null; comentario: string };

// Evidencia (fotos / videos) que sube el coordinador para el reporte al cliente.
export type FotoReporte = { url: string; nombre: string; tipo: "imagen" | "video" };

// Gasto / imprevisto reportado por el coordinador. El comprobante es obligatorio.
export type GastoReporte = { concepto: string; monto: number; comprobante: FotoReporte[] };

// Slot de evidencia obligatoria: bloquea el envío del reporte hasta subir la foto.
// Es el mecanismo anti-mentira: no se puede afirmar sin respaldarlo con imagen.
export type EvidenciaSlot = {
  id: string;
  label: string;
  desc?: string;
  obligatoria: boolean;
  min?: number; // mínimo de fotos (default 1)
};

export type EvalPostEventoData = {
  llenadoPorId: string | null;
  llenadoPorNombre: string | null;
  respondidoEn: string | null; // primera vez que se guardó
  actualizadoEn: string | null; // última edición
  items: Record<string, ItemResp>;
  // Evidencia por slot obligatorio (montaje, operación, regreso, etc.).
  evidencias: Record<string, FotoReporte[]>;
  // Gastos e imprevistos, cada uno con su comprobante.
  gastos: GastoReporte[];
  // Notas del evento (tono reporte, no autoevaluación).
  resumenEvento: string; // ¿Cómo salió el evento? ¿Qué se resolvió? (obligatorio)
  faltantes: string; // ¿Qué faltó? herramientas, equipo o recursos (opcional)
  propuestaMejora: string; // una mejora concreta para el próximo evento (opcional)
  fotos: FotoReporte[]; // evidencia fotográfica / video para el reporte al cliente
  completado: boolean; // el coordinador marcó el reporte como terminado
  completadoEn: string | null;
  // Legacy: campos de versiones anteriores. Se conservan opcionales para no romper
  // la lectura de reportes viejos (el coordinador ya NO se autocalifica ni autocritica).
  logros?: string;
  autocritica?: string;
  propuestasMejora?: string[];
  comentariosFinales?: string;
  calificaciones?: Record<string, number | null>;
  calificacionFinal?: number | null;
};

// Longitud mínima para considerar "respondido" un bloque de texto obligatorio.
export const MIN_TEXTO_REPORTE = 15;

// Ejemplos guía (placeholder) para los campos de texto del reporte.
export const EJEMPLO_RESUMEN =
  "Ej.: «El evento salió bien. Se cayó un cañón a mitad de show y lo sustituí en 5 min con el de respaldo; el cliente no lo notó. Todo terminó a tiempo.»";
export const EJEMPLO_FALTANTES =
  "Ej.: «Faltó una extensión de 20 m y un adaptador XLR; tuve que improvisar con lo que había en sitio.»";
export const EJEMPLO_MEJORA =
  "Ej.: «Pedir el brief 48 h antes para no improvisar la distribución de audio en el lugar.»";

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

export const SECCION_NOTAS_COLOR = "#34D399";
export const SECCION_MEJORA_COLOR = "#B3985B";

// ─── Variante EVENTO (producción / dirección técnica) ────────────────────────

const SECCIONES_EVENTO: EvalSeccion[] = [
  {
    id: "hitos",
    titulo: "Hitos del servicio",
    descripcion: "Marca lo que ocurrió en el evento. Son hechos, no calificación.",
    color: "#5B9BD5",
    items: [
      { id: "llegadaMontaje", label: "¿Llegada al llamado y montaje en tiempo?", desc: "El equipo se presentó puntual y el montaje arrancó según lo planeado.", tipo: "si-no" },
      { id: "pruebas", label: "¿Se hicieron pruebas antes del evento?", desc: "Hubo tiempo para probar audio, iluminación y/o video.", tipo: "si-no" },
      { id: "eventoInicio", label: "¿El evento inició en tiempo?", desc: "Arranque puntual, sin contratiempos técnicos.", tipo: "si-no" },
      { id: "incidenciaCliente", label: "¿Hubo incidencia con el cliente?", desc: "Algún problema o roce con el cliente durante el servicio.", tipo: "si-no", incidenciaSiSi: true },
      { id: "incidenciaEquipo", label: "¿Hubo incidencia o falla de equipo?", desc: "Fallas de equipo o mala operación durante el evento.", tipo: "si-no", incidenciaSiSi: true },
      { id: "regresoBodega", label: "¿El equipo regresó completo y en buen estado a bodega?", desc: "Todo el equipo volvió, descargado y acomodado.", tipo: "si-no" },
    ],
  },
];

// Evidencia obligatoria del reporte de PRODUCCIÓN. Cada slot pide foto de cámara.
const EVIDENCIAS_EVENTO: EvidenciaSlot[] = [
  { id: "montaje", label: "Montaje terminado", desc: "Foto del escenario / montaje completo, listo antes del evento.", obligatoria: true },
  { id: "operacion", label: "Equipo en operación", desc: "Foto durante el evento con el equipo funcionando.", obligatoria: true },
  { id: "regreso", label: "Equipo de regreso en bodega", desc: "Foto del equipo ya descargado y acomodado en bodega.", obligatoria: true },
  { id: "fallas", label: "Fallas o incidencias (si hubo)", desc: "Foto de cualquier falla, daño o incidencia. Opcional si no hubo.", obligatoria: false },
];

// ─── Variante RENTA (renta de equipo) ────────────────────────────────────────

const SECCIONES_RENTA: EvalSeccion[] = [
  {
    id: "hitos",
    titulo: "Hitos de la renta",
    descripcion: "Marca lo que ocurrió en la entrega, uso y devolución del equipo.",
    color: "#5B9BD5",
    items: [
      { id: "entregaCompletaTiempo", label: "¿La entrega se realizó completa y en tiempo?", desc: "Todo el equipo del contrato, funcionando, en la fecha acordada.", tipo: "si-no" },
      { id: "responsivaFirmada", label: "¿Se firmó contrato / responsiva de renta?", desc: "Documento que respalda la renta y las responsabilidades del cliente.", tipo: "si-no" },
      { id: "devolucionCompletaTiempo", label: "¿La devolución se realizó completa y en tiempo?", desc: "Regresó todo (equipos, cables y accesorios) en la fecha pactada.", tipo: "si-no" },
      { id: "danos", label: "¿Hubo daños en los equipos al regresar?", desc: "Golpes, roturas o desgaste anormal detectado en la revisión.", tipo: "si-no", incidenciaSiSi: true },
      { id: "fallasCliente", label: "¿El cliente reportó fallas de algún equipo?", desc: "Fallas o mal funcionamiento reportadas durante la renta.", tipo: "si-no", incidenciaSiSi: true },
      { id: "cargoAdicional", label: "¿Aplica algún cargo adicional (daños / faltantes / retraso)?", desc: "Cobro extra por daños, piezas faltantes o devolución tardía.", tipo: "si-no", incidenciaSiSi: true },
    ],
  },
];

// Evidencia obligatoria del reporte de RENTA.
const EVIDENCIAS_RENTA: EvidenciaSlot[] = [
  { id: "entrega", label: "Equipo entregado / cargado", desc: "Foto del equipo completo al momento de entregarlo o cargarlo.", obligatoria: true },
  { id: "responsiva", label: "Responsiva / contrato firmado", desc: "Foto del documento firmado por el cliente.", obligatoria: true },
  { id: "devolucion", label: "Equipo de regreso", desc: "Foto del equipo al recibirlo de vuelta.", obligatoria: true },
  { id: "danos", label: "Daños detectados (si hubo)", desc: "Foto de golpes, roturas o faltantes. Opcional si no hubo.", obligatoria: false },
];

// ─── Config por variante ─────────────────────────────────────────────────────

export type EvalConfig = {
  variante: Variante;
  etiqueta: string; // título / breadcrumb
  resumenSubtitulo: string; // subtítulo del card dentro del proyecto
  secciones: EvalSeccion[];
  evidencias: EvidenciaSlot[]; // slots de evidencia (obligatorios y opcionales)
  resumenLabel: string; // pregunta del bloque "resumen del evento"
  resumenDesc: string;
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
      etiqueta: "Reporte Post Renta",
      resumenSubtitulo: "Reporte del coordinador: entrega, devolución y estado del equipo con evidencia",
      secciones: SECCIONES_RENTA,
      evidencias: EVIDENCIAS_RENTA,
      resumenLabel: "¿Cómo salió la renta?",
      resumenDesc: "Resume qué pasó con la renta: entrega, uso y devolución. Si hubo algún problema, cuenta cómo se resolvió.",
    };
  }
  return {
    variante: "evento",
    etiqueta: "Reporte Post Evento",
    resumenSubtitulo: "Reporte del coordinador con evidencia obligatoria para la junta",
    secciones: SECCIONES_EVENTO,
    evidencias: EVIDENCIAS_EVENTO,
    resumenLabel: "¿Cómo salió el evento?",
    resumenDesc: "Resume cómo salió el evento y qué se resolvió. Si hubo algún imprevisto, cuenta qué pasó y cómo lo solucionaste.",
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
    evidencias: {},
    gastos: [],
    resumenEvento: "",
    faltantes: "",
    propuestaMejora: "",
    fotos: [],
    completado: false,
    completadoEn: null,
  };
}

// ─── Validación del reporte del coordinador ──────────────────────────────────
// Verifica los requisitos obligatorios antes de permitir "Completar reporte".
// Se corre en el cliente (para bloquear el botón) y en el servidor (fuente de verdad).
export function reporteCompleto(
  data: EvalPostEventoData,
  config: EvalConfig,
): { ok: boolean; faltantes: string[] } {
  const faltantes: string[] = [];

  // 1. Todas las respuestas Sí/No del checklist deben estar contestadas.
  const items = itemsDeSecciones(config.secciones);
  const sinResponder = items.filter((it) => {
    const v = data.items?.[it.id]?.valor;
    return v !== "si" && v !== "no" && v !== "na";
  });
  if (sinResponder.length) faltantes.push(`Faltan ${sinResponder.length} respuesta(s) del checklist.`);

  // 2. Cada slot de evidencia obligatoria debe tener al menos `min` fotos.
  for (const slot of config.evidencias) {
    if (!slot.obligatoria) continue;
    const n = (data.evidencias?.[slot.id] ?? []).length;
    if (n < (slot.min ?? 1)) faltantes.push(`Falta evidencia: ${slot.label}.`);
  }

  // 3. Cada gasto reportado debe tener concepto y comprobante.
  (data.gastos ?? []).forEach((g, i) => {
    if (!g.concepto?.trim()) faltantes.push(`Gasto #${i + 1}: falta el concepto.`);
    if ((g.comprobante ?? []).length === 0) faltantes.push(`Gasto #${i + 1}: falta el comprobante.`);
  });

  // 4. Único bloque de texto obligatorio: el resumen del evento (los demás son opcionales).
  if ((data.resumenEvento ?? "").trim().length < MIN_TEXTO_REPORTE) faltantes.push(`Falta el resumen: «${config.resumenLabel}».`);

  return { ok: faltantes.length === 0, faltantes };
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

// Promedio (1..5) de las dimensiones calificadas. Lo usa la evaluación de dirección.
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
