// Tipos de evento
export const TIPO_EVENTO_LABELS: Record<string, string> = {
  MUSICAL: "Musical",
  SOCIAL: "Social",
  EMPRESARIAL: "Empresarial",
  OTRO: "Otro",
};

export const TIPO_EVENTO_COLORS: Record<string, string> = {
  MUSICAL: "#1A2E4A",
  SOCIAL: "#B3985B",
  EMPRESARIAL: "#6B7280",
  OTRO: "#1F2937",
};

// Etapas del trato
export const ETAPA_LABELS: Record<string, string> = {
  DESCUBRIMIENTO: "Descubrimiento",
  OPORTUNIDAD: "Oportunidad",
  VENTA_CERRADA: "Venta Cerrada",
  VENTA_PERDIDA: "Venta Perdida",
};

// Momento de contratación del lead → mapea a etapa por defecto del pipeline
export const MOMENTO_LABELS: Record<string, string> = {
  EXPLORANDO: "Explorando",
  COTIZANDO: "Cotizando",
  LISTO_DECIDIR: "Listo para decidir",
  URGENTE: "Urgente",
};

export const MOMENTO_COLORS: Record<string, string> = {
  EXPLORANDO: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  COTIZANDO: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  LISTO_DECIDIR: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  URGENTE: "bg-red-500/15 text-red-300 border-red-500/30",
};

export const MOMENTO_OPTIONS: { value: string; label: string; hint: string; etapa: string }[] = [
  { value: "EXPLORANDO", label: "Explorando", hint: "Apenas investigando opciones", etapa: "LEAD" },
  { value: "COTIZANDO", label: "Cotizando", hint: "Pidiendo precios / comparando", etapa: "DESCUBRIMIENTO" },
  { value: "LISTO_DECIDIR", label: "Listo para decidir", hint: "Con presupuesto y fecha", etapa: "OPORTUNIDAD" },
  { value: "URGENTE", label: "Urgente", hint: "Necesita cerrar ya", etapa: "OPORTUNIDAD" },
];

// Estados de cotización (activos: BORRADOR, ENVIADA, APROBADA, RECHAZADA, VENCIDA)
export const ESTADO_COTIZACION_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  APROBADA: "Venta Cerrada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
  // Legacy — kept for backward-compatible display of old records
  EN_REVISION: "En Revisión",
  AJUSTE_SOLICITADO: "Ajuste Solicitado",
  REENVIADA: "Reenviada",
};

export const ESTADO_COTIZACION_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-700",
  ENVIADA: "bg-blue-100 text-blue-700",
  APROBADA: "bg-green-100 text-green-700",
  RECHAZADA: "bg-red-100 text-red-700",
  VENCIDA: "bg-gray-100 text-gray-500",
  // Legacy
  EN_REVISION: "bg-yellow-100 text-yellow-700",
  AJUSTE_SOLICITADO: "bg-orange-100 text-orange-700",
  REENVIADA: "bg-blue-100 text-blue-700",
};

// Solicitudes de cotización (inbox de briefs)
export const ESTADO_SOLICITUD_LABELS: Record<string, string> = {
  NUEVA: "Nueva",
  ASIGNADA: "Asignada",
  COTIZADA: "Cotizada",
  CONVERTIDA: "Convertida a trato",
};

export const ESTADO_SOLICITUD_COLORS: Record<string, string> = {
  NUEVA:      "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  ASIGNADA:   "bg-violet-500/10 text-violet-400 border border-violet-500/30",
  COTIZADA:   "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  CONVERTIDA: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
};

export const ENTREGABLE_LABELS: Record<string, string> = {
  PRESENTACION_DESCUENTO: "Presentación descuento ventas",
  SOLO_PDF: "Solo PDF",
};

// Estados de proyecto
export const ESTADO_PROYECTO_LABELS: Record<string, string> = {
  PLANEACION: 'Planeación',
  EN_CURSO:   'En Curso',
  COMPLETADO: 'Completado',
  CANCELADO:  'Cancelado',
};

export const ESTADO_PROYECTO_COLORS: Record<string, string> = {
  PLANEACION: 'bg-blue-500/10 text-blue-400/80',
  EN_CURSO:   'bg-yellow-500/10 text-yellow-400/80',
  COMPLETADO: 'bg-gray-500/10 text-gray-400/60',
  CANCELADO:  'bg-red-500/10 text-red-400/60',
};

// Origen del lead
// Valores activos para nuevos formularios: META_ADS, REDES_SOCIALES, REFERIDO, RECOMPRA, PROSPECCION
// Valores legacy (solo para mostrar registros históricos): GOOGLE_ADS, ORGANICO, OTRO
export const ORIGEN_LEAD_LABELS: Record<string, string> = {
  META_ADS:      "Meta Ads",
  REDES_SOCIALES: "Redes Sociales",
  REFERIDO:      "Referido",
  RECOMPRA:      "Recompra",
  PROSPECCION:   "Prospección",
  // Legacy — solo para mostrar registros históricos, no ofrecer como opción nueva
  GOOGLE_ADS:    "Google Ads",
  ORGANICO:      "Orgánico",
  OTRO:          "Otro",
};

// Opciones activas para formularios (no incluye valores legacy)
export const ORIGEN_LEAD_OPTIONS: { value: string; label: string }[] = [
  { value: "META_ADS",       label: "Meta Ads" },
  { value: "REDES_SOCIALES", label: "Redes Sociales" },
  { value: "REFERIDO",       label: "Referido" },
  { value: "RECOMPRA",       label: "Recompra" },
  { value: "PROSPECCION",    label: "Prospección" },
];

// Tipo de servicio
export const TIPO_SERVICIO_LABELS: Record<string, string> = {
  RENTA: "Renta de Equipo",
  PRODUCCION_TECNICA: "Producción Técnica",
  DIRECCION_TECNICA: "Dirección Técnica",
};

// Clasificación cliente
export const CLASIFICACION_LABELS: Record<string, string> = {
  PROSPECTO: "Prospecto",
  NUEVO: "Nuevo",
  REGULAR: "Regular",
  PRIORITY: "Priority",
  BASIC: "Basic", // legacy — migrado a REGULAR
  EVITABLE: "Evitable",
};

// Tipo cliente
export const TIPO_CLIENTE_LABELS: Record<string, string> = {
  B2B: "B2B",
  B2C: "B2C",
  POR_DESCUBRIR: "Por Descubrir",
};

// Jornadas
export const JORNADA_LABELS: Record<string, string> = {
  CORTA: "0–8 hrs",
  MEDIA: "8–12 hrs",
  LARGA: "12+ hrs",
};

// Niveles técnicos
export const NIVEL_LABELS: Record<string, string> = {
  AAA: "AAA",
  AA: "AA",
  A: "A",
};

// Estados CxC / CxP
export const ESTADO_CXC_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  LIQUIDADO: "Liquidado",
  VENCIDO: "Vencido",
};

export const ESTADO_CXC_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700",
  PARCIAL: "bg-blue-100 text-blue-700",
  LIQUIDADO: "bg-green-100 text-green-700",
  VENCIDO: "bg-red-100 text-red-700",
};

// Rangos de descuento por volumen
export const DESCUENTOS_VOLUMEN = [
  { desde: 0, hasta: 24999, pct: 0 },
  { desde: 25000, hasta: 49999, pct: 0.05 },
  { desde: 50000, hasta: 74999, pct: 0.07 },
  { desde: 75000, hasta: 99999, pct: 0.09 },
  { desde: 100000, hasta: Infinity, pct: 0.11 },
];

// Descuento B2B
export const DESCUENTO_B2B = 0.10;

// Descuentos multi-día
export const DESCUENTOS_MULTIDIA = [
  { dias: 1, pct: 0 },
  { dias: 2, pct: 0.10 },
  { dias: 3, pct: 0.15 },
  { dias: 4, pct: 0.20 },
  { dias: 5, pct: 0.25 },
];

// IVA
export const IVA = 0.16;

// Política de cobros
export const ANTICIPO_PCT = 0.5;
export const LIQUIDACION_PCT = 0.5;

// Umbrales de viabilidad
// Costo estimado = operación técnica + DJ + logística (lo que realmente pagas de tu bolsa).
// El equipo propio NO tiene costo en esta fórmula porque ya está capitalizado.
// Margen = (total con descuento - costos operativos) / total con descuento.
export const VIABILIDAD = {
  IDEAL: 0.55,    // ≥55% → el equipo cubre bien los costos operativos
  REGULAR: 0.40,  // 40-55% → proyecto aceptable
  MINIMO: 0.25,   // 25-40% → mínimo para considerar
  // <25% → RIESGO
};

// Score foto/video
export const SCORE_FOTOVIDEO = {
  SI: 20,
  OPCIONAL: 15,
};
