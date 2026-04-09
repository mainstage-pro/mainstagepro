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

// Estados de cotización
export const ESTADO_COTIZACION_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  EN_REVISION: "En Revisión",
  AJUSTE_SOLICITADO: "Ajuste Solicitado",
  REENVIADA: "Reenviada",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
};

export const ESTADO_COTIZACION_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-700",
  ENVIADA: "bg-blue-100 text-blue-700",
  EN_REVISION: "bg-yellow-100 text-yellow-700",
  AJUSTE_SOLICITADO: "bg-orange-100 text-orange-700",
  REENVIADA: "bg-blue-100 text-blue-700",
  APROBADA: "bg-green-100 text-green-700",
  RECHAZADA: "bg-red-100 text-red-700",
  VENCIDA: "bg-gray-100 text-gray-500",
};

// Estados de proyecto
export const ESTADO_PROYECTO_LABELS: Record<string, string> = {
  PLANEACION: "Planeación",
  CONFIRMADO: "Confirmado",
  EN_CURSO: "En Curso",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

export const ESTADO_PROYECTO_COLORS: Record<string, string> = {
  PLANEACION: "bg-blue-100 text-blue-700",
  CONFIRMADO: "bg-green-100 text-green-700",
  EN_CURSO: "bg-yellow-100 text-yellow-700",
  COMPLETADO: "bg-gray-100 text-gray-700",
  CANCELADO: "bg-red-100 text-red-700",
};

// Origen del lead
export const ORIGEN_LEAD_LABELS: Record<string, string> = {
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  ORGANICO: "Orgánico",
  RECOMPRA: "Recompra",
  REFERIDO: "Referido",
  PROSPECCION: "Prospección",
  OTRO: "Otro",
};

// Tipo de servicio
export const TIPO_SERVICIO_LABELS: Record<string, string> = {
  RENTA: "Renta de Equipo",
  PRODUCCION_TECNICA: "Producción Técnica",
  DIRECCION_TECNICA: "Dirección Técnica",
};

// Clasificación cliente
export const CLASIFICACION_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  BASIC: "Basic",
  REGULAR: "Regular",
  PRIORITY: "Priority",
};

// Tipo cliente
export const TIPO_CLIENTE_LABELS: Record<string, string> = {
  B2B: "B2B",
  B2C: "B2C",
  POR_DESCUBRIR: "Por Descubrir",
};

// Jornadas
export const JORNADA_LABELS: Record<string, string> = {
  CORTA: "Corta (0-8 hrs)",
  MEDIA: "Media (8-12 hrs)",
  LARGA: "Larga (12+ hrs)",
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
export const DESCUENTO_B2B = 0.05;

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
