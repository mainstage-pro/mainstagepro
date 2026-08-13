// ── Sistema de "Calendarios" ─────────────────────────────────────────────────
// Módulo con varias pestañas: eventos (operativo, derivado de proyectos/tratos) +
// tres calendarios ANUALES editables que viven en la tabla `calendario_entradas`
// (creada por migración lazy, ver ensureCalendariosTabla). Las entradas son
// conceptuales/recurrentes: se guardan por mes/día (no por fecha absoluta) para
// que la vista anual se repita cada año, con `anio` opcional para fijarlas a uno.

export type CalendarioKey = "ADMINISTRATIVO" | "COMERCIAL" | "FECHAS_ESPECIALES" | "FESTIVIDADES";

export interface TipoEntrada {
  key: string;
  label: string;
  color: string;    // hex — acento sobre tema oscuro
  periodo?: boolean; // true = temporada (banda en la línea de tiempo); false = hito/fecha (punto)
}

export interface CalendarioDef {
  key: CalendarioKey;
  slug: string;
  nombre: string;
  descripcion: string;
  tag: string;              // etiqueta que llevan las tareas creadas desde aquí
  tipos: TipoEntrada[];
  ideasLabel: string;       // rótulo del campo de ideas
  ligaTipoEvento?: boolean; // muestra el selector "tipo de evento" (comercial)
  ligaServicio?: boolean;   // muestra el campo "servicio" (comercial)
}

// ── Definiciones de los tres calendarios anuales ─────────────────────────────
export const CALENDARIOS: Record<CalendarioKey, CalendarioDef> = {
  ADMINISTRATIVO: {
    key: "ADMINISTRATIVO",
    slug: "administrativo",
    nombre: "Administrativo",
    descripcion: "Temporalidades del negocio, hitos financieros y de operación a lo largo del año.",
    tag: "Cal. Administrativo",
    ideasLabel: "Plan de acción / notas",
    tipos: [
      { key: "TEMPORADA_ALTA",  label: "Temporada alta",   color: "#10b981", periodo: true },
      { key: "TEMPORADA_MEDIA", label: "Temporada media",  color: "#3b82f6", periodo: true },
      { key: "TEMPORADA_BAJA",  label: "Temporada baja",   color: "#f59e0b", periodo: true },
      { key: "HITO_FINANCIERO", label: "Hito financiero",  color: "#B3985B" },
      { key: "HITO_OPERATIVO",  label: "Hito operativo",   color: "#8b5cf6" },
      { key: "HITO",            label: "Hito general",     color: "#94a3b8" },
    ],
  },
  COMERCIAL: {
    key: "COMERCIAL",
    slug: "comercial",
    nombre: "Comercial",
    descripcion: "Temporalidades y fechas clave del año ligadas a servicios y tipos de evento, para gestar productos, paquetes y campañas.",
    tag: "Cal. Comercial",
    ideasLabel: "Ideas de campañas · productos · paquetes",
    ligaTipoEvento: true,
    ligaServicio: true,
    tipos: [
      { key: "TEMPORALIDAD", label: "Temporalidad",  color: "#ec4899", periodo: true },
      { key: "FECHA_CLAVE",  label: "Fecha clave",   color: "#B3985B" },
      { key: "CAMPANA",      label: "Campaña",       color: "#8b5cf6" },
    ],
  },
  FECHAS_ESPECIALES: {
    key: "FECHAS_ESPECIALES",
    slug: "fechas-especiales",
    nombre: "Fechas especiales",
    descripcion: "Días conmemorativos del año con ideas de publicaciones y stories para redes.",
    tag: "Cal. Fechas especiales",
    ideasLabel: "Ideas de stories / publicaciones",
    tipos: [
      { key: "FECHA",      label: "Fecha especial",  color: "#B3985B" },
      { key: "EFEMERIDE",  label: "Efeméride gremio", color: "#06b6d4" },
      { key: "ESTACIONAL", label: "Estacional",       color: "#22c55e" },
    ],
  },
  FESTIVIDADES: {
    key: "FESTIVIDADES",
    slug: "festividades",
    nombre: "Festividades MX",
    descripcion: "Días festivos y de asueto en México. Consulta de descansos obligatorios por ley (Art. 74 LFT) y fechas cívicas para planear cierres y avisos.",
    tag: "Cal. Festividades",
    ideasLabel: "Nota operativa / aviso",
    tipos: [
      { key: "ASUETO_LEY",     label: "Asueto obligatorio (LFT)", color: "#ef4444" },
      { key: "ASUETO_OFICIAL", label: "Descanso oficial / común", color: "#3b82f6" },
      { key: "CONMEMORACION",  label: "Fecha cívica",             color: "#94a3b8" },
    ],
  },
};

export const CALENDARIO_POR_SLUG: Record<string, CalendarioDef> = Object.fromEntries(
  Object.values(CALENDARIOS).map(c => [c.slug, c]),
);

// Etiqueta que lleva una tarea creada desde el calendario de eventos.
export const TAG_EVENTOS = "Cal. Eventos";

// ── Modelo de una entrada (fila de calendario_entradas) ──────────────────────
export interface Entrada {
  id: string;
  calendario: CalendarioKey;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  anio: number | null;      // null = se repite cada año
  mesInicio: number;        // 1-12
  diaInicio: number | null; // null = desde el inicio del mes (temporada)
  mesFin: number | null;    // null = fecha/hito puntual
  diaFin: number | null;
  color: string | null;
  icono: string | null;     // emoji
  ideas: string | null;
  tipoEventoSlug: string | null;
  servicio: string | null;
  orden: number;
}

export const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const MESES_CORTOS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export function tipoDef(cal: CalendarioDef, tipoKey: string): TipoEntrada {
  return cal.tipos.find(t => t.key === tipoKey) ?? cal.tipos[0];
}

export function colorEntrada(cal: CalendarioDef, e: Entrada): string {
  return e.color || tipoDef(cal, e.tipo).color;
}

// ¿La entrada abarca un rango de varios días (temporada / periodo)?
export function esRango(e: Entrada): boolean {
  if (e.mesFin == null) return e.diaInicio == null; // sin fin: sólo es rango si es "todo el mes"
  if (e.mesFin !== e.mesInicio) return true;
  // mismo mes con fin: rango si los días difieren o cubre el mes completo
  return (e.diaInicio ?? 1) !== (e.diaFin ?? 31);
}

// Días absolutos (mes 0-based, día) que cubre la entrada dentro del año indicado.
// Se usa para pintar puntos en las mini-vistas de mes. Para temporadas devuelve
// sólo los extremos como marcadores; el relleno lo hace la línea de tiempo.
export function diasCubiertos(e: Entrada, anio: number): { mes: number; dia: number }[] {
  if (e.anio != null && e.anio !== anio) return [];
  const m0 = e.mesInicio - 1;
  if (!esRango(e)) {
    return [{ mes: m0, dia: e.diaInicio ?? 1 }];
  }
  return [];
}

// Rango normalizado para la línea de tiempo: fracción [0,1] del año de inicio y fin.
export function rangoAnual(e: Entrada): { desde: number; hasta: number } | null {
  if (!esRango(e)) return null;
  const mi = e.mesInicio - 1;
  const di = (e.diaInicio ?? 1) - 1;
  const mf = (e.mesFin ?? e.mesInicio) - 1;
  const df = (e.diaFin ?? 31) - 1;
  const diasMesFin = new Date(2001, mf + 1, 0).getDate();
  const desde = (mi + Math.min(di, 30) / 31) / 12;
  const hasta = (mf + Math.min(df, diasMesFin - 1) / (diasMesFin - 1 || 1) + 1 / 12) / 12;
  return { desde: Math.max(0, desde), hasta: Math.min(1, hasta) };
}

// Texto legible del periodo/fecha de una entrada.
export function etiquetaFecha(e: Entrada): string {
  const ini = e.diaInicio ? `${e.diaInicio} ${MESES_CORTOS[e.mesInicio - 1]}` : MESES[e.mesInicio - 1];
  if (e.mesFin == null && e.diaInicio) return ini + (e.anio ? ` ${e.anio}` : "");
  if (e.mesFin == null && !e.diaInicio) return MESES[e.mesInicio - 1] + (e.anio ? ` ${e.anio}` : "");
  const fin = e.diaFin ? `${e.diaFin} ${MESES_CORTOS[(e.mesFin ?? e.mesInicio) - 1]}` : MESES[(e.mesFin ?? e.mesInicio) - 1];
  return `${ini} — ${fin}` + (e.anio ? ` ${e.anio}` : "");
}

// Clave de ordenamiento cronológico dentro del año.
export function ordenCronologico(e: Entrada): number {
  return (e.mesInicio - 1) * 32 + (e.diaInicio ?? 0);
}

// ── Semillas por calendario (se insertan la primera vez que se crea la tabla) ──
// Cada entrada: [tipo, titulo, mesInicio, diaInicio|null, mesFin|null, diaFin|null, icono, ideas, extra?]
type SeedRow = {
  tipo: string; titulo: string;
  mi: number; di?: number | null; mf?: number | null; df?: number | null;
  icono?: string; ideas?: string; tipoEvento?: string; servicio?: string; descripcion?: string;
};

export const SEEDS: Record<CalendarioKey, SeedRow[]> = {
  ADMINISTRATIVO: [
    { tipo: "TEMPORADA_ALTA", titulo: "Temporada alta", mi: 9, mf: 12, icono: "📈", descripcion: "Mayor volumen de eventos: bodas, posadas y cierres de año." },
    { tipo: "TEMPORADA_BAJA", titulo: "Temporada baja", mi: 6, mf: 8, icono: "🌵", descripcion: "Menor demanda; enfocar en mantenimiento, capacitación y prospección." },
    { tipo: "TEMPORADA_MEDIA", titulo: "Backup operativo / plan de acción", mi: 1, mf: 3, icono: "🛟", ideas: "Plan de contingencia por baja de flujo: recortar gastos, priorizar cobranza, subrentas.", descripcion: "Inicio de año con flujo ajustado; activar plan de acción financiero." },
    { tipo: "HITO_FINANCIERO", titulo: "Aguinaldos", mi: 12, di: 1, mf: 12, df: 20, icono: "🎁", ideas: "Provisionar aguinaldos desde el 3er trimestre." },
    { tipo: "HITO_FINANCIERO", titulo: "Reparto de utilidades a socios", mi: 3, di: 31, icono: "💰", ideas: "Cierre fiscal anual: calcular y repartir utilidades a socios." },
    { tipo: "HITO_OPERATIVO", titulo: "Cierre de inventario anual", mi: 12, di: 15, icono: "📦" },
  ],
  COMERCIAL: [
    { tipo: "TEMPORALIDAD", titulo: "Temporada de bodas", mi: 10, mf: 12, icono: "💍", tipoEvento: "social", ideas: "Paquetes de audio/DJ para boda, iluminación arquitectónica, pistas." },
    { tipo: "TEMPORALIDAD", titulo: "Temporada de graduaciones", mi: 5, mf: 7, icono: "🎓", tipoEvento: "social", ideas: "Paquetes escolares, salones, foros; combos audio + video." },
    { tipo: "TEMPORALIDAD", titulo: "Temporada de conciertos", mi: 3, mf: 5, icono: "🎤", tipoEvento: "musical", ideas: "Renta de line array, backline, escenarios." },
    { tipo: "TEMPORALIDAD", titulo: "Lanzamientos de autos (agencias)", mi: 8, mf: 10, icono: "🚗", tipoEvento: "empresarial", servicio: "PRODUCCION_TECNICA", ideas: "Producción técnica para presentaciones de nuevos modelos." },
    { tipo: "TEMPORALIDAD", titulo: "Posadas navideñas", mi: 12, di: 1, mf: 12, df: 24, icono: "🎄", tipoEvento: "empresarial", ideas: "Paquetes de posada empresarial: audio, DJ, iluminación." },
    { tipo: "FECHA_CLAVE", titulo: "Super Bowl", mi: 2, di: 9, icono: "🏈", tipoEvento: "empresarial", ideas: "Pantallas/proyección para viewing parties en bares y empresas." },
    { tipo: "FECHA_CLAVE", titulo: "15 de septiembre (Independencia)", mi: 9, di: 15, mf: 9, df: 16, icono: "🇲🇽", tipoEvento: "social", ideas: "Verbenas, kermeses, audio para grito y baile." },
    { tipo: "FECHA_CLAVE", titulo: "Día de muertos", mi: 11, di: 1, mf: 11, df: 2, icono: "💀", tipoEvento: "social", ideas: "Iluminación temática, altares, activaciones de marca." },
    { tipo: "FECHA_CLAVE", titulo: "Halloween", mi: 10, di: 31, icono: "🎃", tipoEvento: "social", ideas: "Fiestas temáticas, iluminación de terror, DJ." },
    { tipo: "FECHA_CLAVE", titulo: "El Buen Fin", mi: 11, di: 15, mf: 11, df: 18, icono: "🛍️", tipoEvento: "empresarial", ideas: "Promos de renta y paquetes con descuento de temporada." },
    { tipo: "FECHA_CLAVE", titulo: "Fiestas de fin de año", mi: 12, di: 15, mf: 12, df: 31, icono: "🥂", tipoEvento: "empresarial", ideas: "Cenas de empresa, fin de año; paquetes llave en mano." },
  ],
  FECHAS_ESPECIALES: [
    { tipo: "FECHA", titulo: "Año nuevo", mi: 1, di: 1, icono: "🎉", ideas: "Post de propósitos y agradecimiento a clientes." },
    { tipo: "FECHA", titulo: "Día de Reyes", mi: 1, di: 6, icono: "👑", ideas: "Story de rosca; promo relámpago." },
    { tipo: "FECHA", titulo: "Día del amor y la amistad", mi: 2, di: 14, icono: "❤️", ideas: "Reel romántico de eventos; iluminación cálida." },
    { tipo: "EFEMERIDE", titulo: "Día del DJ", mi: 3, di: 9, icono: "🎧", ideas: "Reconocer a nuestros DJs; behind the scenes de cabina." },
    { tipo: "ESTACIONAL", titulo: "Inicio de la primavera", mi: 3, di: 20, icono: "🌸", ideas: "Paleta fresca; eventos al aire libre." },
    { tipo: "FECHA", titulo: "Día del niño", mi: 4, di: 30, icono: "🧒", ideas: "Eventos infantiles; audio y pantallas para fiestas." },
    { tipo: "FECHA", titulo: "Día del trabajo", mi: 5, di: 1, icono: "🛠️", ideas: "Reconocer al equipo técnico." },
    { tipo: "FECHA", titulo: "Día de las madres", mi: 5, di: 10, icono: "💐", ideas: "Post emotivo; eventos y comidas." },
    { tipo: "FECHA", titulo: "Día del padre", mi: 6, di: 15, icono: "👔", ideas: "Post; parrilladas y reuniones." },
    { tipo: "EFEMERIDE", titulo: "Día mundial de la música", mi: 6, di: 21, icono: "🎵", ideas: "Playlist del equipo; clips de eventos musicales." },
    { tipo: "FECHA", titulo: "15 de septiembre", mi: 9, di: 15, icono: "🇲🇽", ideas: "Contenido patrio; audio para el grito." },
    { tipo: "ESTACIONAL", titulo: "Inicio del otoño", mi: 9, di: 22, icono: "🍂", ideas: "Paleta cálida; temporada de bodas." },
    { tipo: "FECHA", titulo: "Halloween", mi: 10, di: 31, icono: "🎃", ideas: "Iluminación de terror; fiestas temáticas." },
    { tipo: "FECHA", titulo: "Día de muertos", mi: 11, di: 2, icono: "💀", ideas: "Altar de la empresa; iluminación temática." },
    { tipo: "FECHA", titulo: "Navidad", mi: 12, di: 25, icono: "🎄", ideas: "Felicitación; recap de posadas." },
  ],
  FESTIVIDADES: [
    // ── Descansos obligatorios por ley (Art. 74 Ley Federal del Trabajo) ──
    { tipo: "ASUETO_LEY", titulo: "Año Nuevo", mi: 1, di: 1, icono: "🎆", descripcion: "Descanso obligatorio (Art. 74 I LFT).", ideas: "Bodega cerrada; confirmar que no haya montajes ni cargas programadas." },
    { tipo: "ASUETO_LEY", titulo: "Día de la Constitución", mi: 2, di: 5, icono: "📜", descripcion: "Descanso obligatorio (Art. 74 II LFT). Se recorre al PRIMER LUNES de febrero — verificar la fecha exacta del año.", ideas: "Fin de semana largo: alta demanda de eventos sociales." },
    { tipo: "ASUETO_LEY", titulo: "Natalicio de Benito Juárez", mi: 3, di: 21, icono: "🎩", descripcion: "Descanso obligatorio (Art. 74 III LFT). Se recorre al TERCER LUNES de marzo — verificar la fecha exacta del año.", ideas: "Fin de semana largo: alta demanda de eventos sociales." },
    { tipo: "ASUETO_LEY", titulo: "Día del Trabajo", mi: 5, di: 1, icono: "🛠️", descripcion: "Descanso obligatorio (Art. 74 IV LFT).", ideas: "Avisar a clientes con eventos; prever pago doble a personal que labore." },
    { tipo: "ASUETO_LEY", titulo: "Independencia de México", mi: 9, di: 16, icono: "🇲🇽", descripcion: "Descanso obligatorio (Art. 74 V LFT).", ideas: "Alta demanda por fiestas patrias; planear turnos y descansos del equipo." },
    { tipo: "ASUETO_LEY", titulo: "Revolución Mexicana", mi: 11, di: 20, icono: "🏇", descripcion: "Descanso obligatorio (Art. 74 VI LFT). Se recorre al TERCER LUNES de noviembre — verificar la fecha exacta del año.", ideas: "Fin de semana largo previo a temporada alta de fin de año." },
    { tipo: "ASUETO_LEY", titulo: "Transmisión del Poder Ejecutivo Federal", mi: 10, di: 1, icono: "🏛️", descripcion: "Descanso obligatorio cada seis años (Art. 74 VII LFT). Próximo: 1 de octubre de 2030.", ideas: "Solo en año de cambio presidencial." },
    { tipo: "ASUETO_LEY", titulo: "Navidad", mi: 12, di: 25, icono: "🎄", descripcion: "Descanso obligatorio (Art. 74 VIII LFT).", ideas: "Bodega cerrada; cierre operativo de fin de año." },
    // ── Descansos oficiales / de práctica común (no obligatorios por LFT) ──
    { tipo: "ASUETO_OFICIAL", titulo: "Jueves y Viernes Santo (Semana Santa)", mi: 4, di: 2, mf: 4, df: 4, icono: "✝️", descripcion: "No es asueto obligatorio por LFT, pero suele darse descanso. Fecha MÓVIL (marzo/abril) — verificar cada año.", ideas: "Muchos clientes cierran; confirmar disponibilidad de personal y bodega." },
    { tipo: "ASUETO_OFICIAL", titulo: "Día de Muertos", mi: 11, di: 2, icono: "💀", descripcion: "Descanso oficial de facto en muchas empresas; no obligatorio por LFT.", ideas: "Alta demanda de eventos y activaciones temáticas." },
    { tipo: "ASUETO_OFICIAL", titulo: "Virgen de Guadalupe", mi: 12, di: 12, icono: "🕯️", descripcion: "Festividad religiosa de amplia observancia; no es asueto obligatorio por LFT.", ideas: "Considerar disponibilidad reducida de proveedores." },
    // ── Fechas cívicas (izamiento de bandera; no son días de descanso) ──
    { tipo: "CONMEMORACION", titulo: "Día de la Bandera", mi: 2, di: 24, icono: "🇲🇽", descripcion: "Fecha cívica; día laborable." },
    { tipo: "CONMEMORACION", titulo: "Batalla de Puebla (5 de mayo)", mi: 5, di: 5, icono: "⚔️", descripcion: "Fecha cívica; día laborable." },
  ],
};
