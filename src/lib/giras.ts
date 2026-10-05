// Vocabulario compartido del módulo Giras (production management de artistas).
// Es la fuente única: UI, API, PDFs y portales públicos leen de aquí para que
// nadie reinvente una etiqueta ni un color.

// ── Disciplinas técnicas ─────────────────────────────────────────────────────
export const DISCIPLINAS = [
  "AUDIO",
  "ILUMINACION",
  "VIDEO",
  "BACKLINE",
  "ESCENARIO",
  "ENERGIA",
  "COMUNICACION",
  "RIGGING",
  "OTRO",
] as const;
export type Disciplina = (typeof DISCIPLINAS)[number];

export const DISCIPLINA_LABEL: Record<string, string> = {
  AUDIO: "Audio",
  ILUMINACION: "Iluminación",
  VIDEO: "Video",
  BACKLINE: "Backline",
  ESCENARIO: "Escenario",
  ENERGIA: "Energía",
  COMUNICACION: "Comunicación",
  RIGGING: "Rigging",
  OTRO: "Otro",
};

// ── Personas del artista ─────────────────────────────────────────────────────
export const ROLES_PERSONA = [
  "PERSONAL_MANAGER",
  "TOUR_MANAGER",
  "PRODUCTION_MANAGER",
  "MUSICO",
  "FOH",
  "MONITORES",
  "LUCES",
  "VIDEO",
  "STAGE_MANAGER",
  "BACKLINE",
  "BOOKING",
  "PROMOTOR",
  "PRENSA",
  "OTRO",
] as const;

export const ROL_PERSONA_LABEL: Record<string, string> = {
  PERSONAL_MANAGER: "Personal manager",
  TOUR_MANAGER: "Tour manager",
  PRODUCTION_MANAGER: "Production manager",
  MUSICO: "Músico",
  FOH: "Ingeniero de FOH",
  MONITORES: "Ingeniero de monitores",
  LUCES: "Iluminación",
  VIDEO: "Video",
  STAGE_MANAGER: "Stage manager",
  BACKLINE: "Backline / tech",
  BOOKING: "Booking",
  PROMOTOR: "Promotor",
  PRENSA: "Prensa",
  OTRO: "Otro",
};

/// Los roles que por default son parte del elenco en escena.
export const ROLES_EN_ESCENA = ["MUSICO"];

// ── Rider: input y output list ───────────────────────────────────────────────
export const SOPORTES_MIC = [
  "TRIPIE_CORTO",
  "TRIPIE_LARGO",
  "CLIP",
  "DI",
  "SUBSNAKE",
  "NINGUNO",
] as const;

export const SOPORTE_MIC_LABEL: Record<string, string> = {
  TRIPIE_CORTO: "Tripié corto",
  TRIPIE_LARGO: "Tripié largo",
  CLIP: "Clip / pinza",
  DI: "Caja directa",
  SUBSNAKE: "Subsnake",
  NINGUNO: "Sin soporte",
};

export const TIPOS_SALIDA = ["IEM", "WEDGE", "SIDEFILL", "DRUM_FILL", "SUB_DRUM", "PA", "SHOUT"] as const;

export const TIPO_SALIDA_LABEL: Record<string, string> = {
  IEM: "In-ear",
  WEDGE: "Monitor de piso",
  SIDEFILL: "Sidefill",
  DRUM_FILL: "Drum fill",
  SUB_DRUM: "Sub de batería",
  PA: "PA",
  SHOUT: "Shout / talkback",
};

/// Un mix estéreo ocupa DOS salidas de consola (L y R); uno mono, una. Por eso el
/// número de una salida es su primer canal y no su posición en la lista: si el IEM
/// de voz es estéreo y arranca en 1, el siguiente mix empieza en 3. Numerar por
/// posición haría pedir la mitad de las salidas que de verdad se parchan.
export function canalesDeSalida(estereo: boolean): number {
  return estereo ? 2 : 1;
}

export function numerarSalidas<T extends { estereo: boolean }>(salidas: T[]): (T & { canal: number })[] {
  let canal = 1;
  return salidas.map((s) => {
    const numerada = { ...s, canal };
    canal += canalesDeSalida(s.estereo);
    return numerada;
  });
}

export function etiquetaCanalSalida(canal: number, estereo: boolean): string {
  return estereo ? `${canal}/${canal + 1}` : String(canal);
}

export function totalCanalesSalida(salidas: { estereo: boolean }[]): number {
  return salidas.reduce((n, s) => n + canalesDeSalida(s.estereo), 0);
}

/// Para el documento que lee el ingeniero de la casa: lo que él parcha son canales,
/// no mixes, así que el estéreo se abre en dos renglones marcados L y R.
export function expandirSalida(canal: number, estereo: boolean): { canal: number; lado: "L" | "R" | null }[] {
  return estereo
    ? [
        { canal, lado: "L" },
        { canal: canal + 1, lado: "R" },
      ]
    : [{ canal, lado: null }];
}

// ── Rider maestro: prioridad y quién provee ──────────────────────────────────
// La prioridad es lo que permite negociar con la casa sin regalar lo que no se negocia.
export const PRIORIDADES = ["INDISPENSABLE", "IMPORTANTE", "DESEABLE"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const PRIORIDAD_LABEL: Record<string, string> = {
  INDISPENSABLE: "Indispensable",
  IMPORTANTE: "Importante",
  DESEABLE: "Deseable",
};

export const PRIORIDAD_COLOR: Record<string, string> = {
  INDISPENSABLE: "text-red-300 bg-red-500/10 border-red-500/30",
  IMPORTANTE: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  DESEABLE: "text-[#9ca3af] bg-white/5 border-white/10",
};

export const PROVISTO_POR = ["CASA", "ARTISTA", "MAINSTAGE", "POR_DEFINIR"] as const;

export const PROVISTO_POR_LABEL: Record<string, string> = {
  CASA: "La casa",
  ARTISTA: "El artista",
  MAINSTAGE: "Mainstage",
  POR_DEFINIR: "Por definir",
};

// ── Advance por show ─────────────────────────────────────────────────────────
export const CUBIERTO_POR = [
  "POR_DEFINIR",
  "CASA",
  "MAINSTAGE",
  "PROVEEDOR",
  "ARTISTA",
  "SUSTITUIDO",
  "NO_CUBIERTO",
  "NO_APLICA",
] as const;

export const CUBIERTO_POR_LABEL: Record<string, string> = {
  POR_DEFINIR: "Por definir",
  CASA: "Lo pone la casa",
  MAINSTAGE: "Lo llevamos nosotros",
  PROVEEDOR: "Se renta a proveedor",
  ARTISTA: "Lo trae el artista",
  SUSTITUIDO: "Sustitución aprobada",
  NO_CUBIERTO: "Sin cubrir",
  NO_APLICA: "No aplica aquí",
};

export const ESTADOS_ADVANCE = [
  "PENDIENTE",
  "SOLICITADO",
  "COTIZANDO",
  "CONFIRMADO",
  "RECHAZADO",
  "SUSTITUCION_APROBADA",
] as const;

export const ESTADO_ADVANCE_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  SOLICITADO: "Solicitado",
  COTIZANDO: "Cotizando",
  CONFIRMADO: "Confirmado",
  RECHAZADO: "Rechazado",
  SUSTITUCION_APROBADA: "Sustitución aprobada",
};

export const ESTADO_ADVANCE_COLOR: Record<string, string> = {
  PENDIENTE: "text-[#9ca3af] bg-white/5 border-white/10",
  SOLICITADO: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  COTIZANDO: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  CONFIRMADO: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  RECHAZADO: "text-red-300 bg-red-500/10 border-red-500/30",
  SUSTITUCION_APROBADA: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
};

/// Un renglón del advance está resuelto cuando ya sabemos de dónde sale y está confirmado.
export const ESTADOS_RESUELTOS = ["CONFIRMADO", "SUSTITUCION_APROBADA"];

// ── Show suelto o gira ───────────────────────────────────────────────────────
// La mayoría de lo que producimos para un artista es una sola fecha, no una gira.
// El registro es el mismo (un show es una gira de una fecha) y este tipo decide
// cómo se nombra y cómo se navega.
export const TIPOS_REGISTRO = ["SHOW", "GIRA"] as const;
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number];

export const TIPO_REGISTRO_LABEL: Record<string, string> = {
  SHOW: "Show",
  GIRA: "Gira",
};

export const TIPO_REGISTRO_COLOR: Record<string, string> = {
  SHOW: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  GIRA: "text-[#B3985B] bg-[#B3985B]/10 border-[#B3985B]/30",
};

export function esGira(tipo: string | null | undefined): boolean {
  return tipo !== "SHOW";
}

// ── Gira y show ──────────────────────────────────────────────────────────────
export const ESTADOS_GIRA = ["PLANEACION", "CONFIRMADA", "EN_CURSO", "CERRADA", "CANCELADA"] as const;

export const ESTADO_GIRA_LABEL: Record<string, string> = {
  PLANEACION: "En planeación",
  CONFIRMADA: "Confirmada",
  EN_CURSO: "En curso",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
};

/// El mismo estado leído de un show suelto: "confirmada" de un show chirría.
export const ESTADO_SHOW_SUELTO_LABEL: Record<string, string> = {
  PLANEACION: "En planeación",
  CONFIRMADA: "Confirmado",
  EN_CURSO: "En curso",
  CERRADA: "Cerrado",
  CANCELADA: "Cancelado",
};

export function estadoRegistroLabel(estado: string, tipo?: string | null): string {
  return (esGira(tipo) ? ESTADO_GIRA_LABEL : ESTADO_SHOW_SUELTO_LABEL)[estado] ?? estado;
}

export const ESTADO_GIRA_COLOR: Record<string, string> = {
  PLANEACION: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  CONFIRMADA: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  EN_CURSO: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  CERRADA: "text-[#9ca3af] bg-white/5 border-white/10",
  CANCELADA: "text-red-300 bg-red-500/10 border-red-500/30",
};

export const ESTADOS_SHOW = ["POR_CONFIRMAR", "CONFIRMADO", "EJECUTADO", "CANCELADO"] as const;

export const ESTADO_SHOW_LABEL: Record<string, string> = {
  POR_CONFIRMAR: "Por confirmar",
  CONFIRMADO: "Confirmado",
  EJECUTADO: "Ejecutado",
  CANCELADO: "Cancelado",
};

export const ESTADO_SHOW_COLOR: Record<string, string> = {
  POR_CONFIRMAR: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  CONFIRMADO: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  EJECUTADO: "text-[#9ca3af] bg-white/5 border-white/10",
  CANCELADO: "text-red-300 bg-red-500/10 border-red-500/30",
};

export const TIPOS_SHOW = ["HEADLINE", "SOPORTE", "FESTIVAL", "SHOWCASE", "PRIVADO"] as const;

export const TIPO_SHOW_LABEL: Record<string, string> = {
  HEADLINE: "Headline",
  SOPORTE: "Soporte / opening",
  FESTIVAL: "Festival",
  SHOWCASE: "Showcase",
  PRIVADO: "Privado",
};

// ── Día del show ─────────────────────────────────────────────────────────────
export const TIPOS_BLOQUE = [
  "LOGISTICA",
  "MONTAJE",
  "SOUNDCHECK",
  "PROGRAMA",
  "DESMONTAJE",
  "VIAJE",
  "COMIDA",
] as const;

export const TIPO_BLOQUE_LABEL: Record<string, string> = {
  LOGISTICA: "Logística",
  MONTAJE: "Montaje",
  SOUNDCHECK: "Soundcheck",
  PROGRAMA: "Programa",
  DESMONTAJE: "Desmontaje",
  VIAJE: "Viaje",
  COMIDA: "Comida",
};

export const TIPO_BLOQUE_COLOR: Record<string, string> = {
  LOGISTICA: "text-sky-300",
  MONTAJE: "text-amber-300",
  SOUNDCHECK: "text-violet-300",
  PROGRAMA: "text-[#B3985B]",
  DESMONTAJE: "text-orange-300",
  VIAJE: "text-teal-300",
  COMIDA: "text-emerald-300",
};

/// Orden de las fases dentro del día, para que la jornada se lea de corrido.
export const ORDEN_BLOQUE: Record<string, number> = {
  VIAJE: 0,
  LOGISTICA: 1,
  MONTAJE: 2,
  SOUNDCHECK: 3,
  COMIDA: 4,
  PROGRAMA: 5,
  DESMONTAJE: 6,
};

/// La jornada de un show no termina a medianoche: el desmontaje de la 1 a.m. es
/// parte del mismo día de trabajo. Todo lo que cae antes de esta hora se lee como
/// madrugada del día siguiente y se ordena al final, no al principio.
export const HORA_CORTE_JORNADA = "05:00";

/// Minutos corridos desde el arranque de la jornada. null si la hora no es válida.
export function minutosDeJornada(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const [h, m] = hora.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const minutos = h * 60 + m;
  const corte = parseInt(HORA_CORTE_JORNADA.slice(0, 2), 10) * 60;
  return minutos < corte ? minutos + 1440 : minutos;
}

export interface BloqueOrdenable {
  hora: string | null;
  tipo: string;
  orden: number;
}

/// El day sheet se lee cronológicamente. Los bloques sin hora todavía no tienen
/// lugar en el reloj, así que se van al final ordenados por fase: siguen siendo
/// pendientes de agendar, no huecos del día.
export function ordenarBloques<T extends BloqueOrdenable>(bloques: T[]): T[] {
  return [...bloques].sort((a, b) => {
    const ma = minutosDeJornada(a.hora);
    const mb = minutosDeJornada(b.hora);
    if (ma !== null && mb !== null && ma !== mb) return ma - mb;
    if (ma !== null && mb === null) return -1;
    if (ma === null && mb !== null) return 1;
    const fa = ORDEN_BLOQUE[a.tipo] ?? 99;
    const fb = ORDEN_BLOQUE[b.tipo] ?? 99;
    if (fa !== fb) return fa - fb;
    return a.orden - b.orden;
  });
}

/// Duración del bloque en minutos; null si falta una de las dos horas.
export function duracionBloque(hora: string | null | undefined, horaFin: string | null | undefined): number | null {
  const a = minutosDeJornada(hora);
  const b = minutosDeJornada(horaFin);
  if (a === null || b === null) return null;
  // Un bloque que cruza el corte (show 23:00 → fin 00:30) sigue durando lo suyo.
  const fin = b < a ? b + 1440 : b;
  return fin - a;
}

export function fmtDuracion(minutos: number | null): string {
  if (minutos === null || minutos <= 0) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/// Los horarios gruesos del show se convierten en bloques del day sheet. El
/// show toma su hora de fin del propio campo horaFin, para no dejar un bloque
/// "Fin del show" sin cuerpo.
export const SIEMBRA_BLOQUES: { campo: string; campoFin?: string; titulo: string; tipo: string }[] = [
  { campo: "horaLoadIn", titulo: "Load in", tipo: "LOGISTICA" },
  { campo: "horaMontaje", titulo: "Montaje", tipo: "MONTAJE" },
  { campo: "horaLineCheck", titulo: "Line check", tipo: "SOUNDCHECK" },
  { campo: "horaSoundcheck", titulo: "Soundcheck", tipo: "SOUNDCHECK" },
  { campo: "horaDoors", titulo: "Apertura de puertas", tipo: "PROGRAMA" },
  { campo: "horaShow", campoFin: "horaFin", titulo: "Show", tipo: "PROGRAMA" },
  { campo: "horaLoadOut", titulo: "Load out", tipo: "DESMONTAJE" },
  { campo: "curfew", titulo: "Curfew", tipo: "DESMONTAJE" },
];

// ── Setlist ──────────────────────────────────────────────────────────────────
/// Las canciones se capturan como "3:45" porque así las dicta el músico, pero se
/// guardan en segundos para poder sumar el set sin acarrear el formato.
export function segundosDesdeTexto(texto: string): number | null {
  const s = texto.trim();
  if (!s) return null;
  if (s.includes(":")) {
    const [m, seg] = s.split(":");
    const minutos = parseInt(m, 10);
    const segundos = parseInt(seg || "0", 10);
    if (!Number.isFinite(minutos)) return null;
    return minutos * 60 + (Number.isFinite(segundos) ? Math.min(59, segundos) : 0);
  }
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return null;
  // Un número suelto se lee como minutos: nadie dicta una canción en segundos.
  return n * 60;
}

export function fmtMinSeg(segundos: number | null | undefined): string {
  if (!segundos || segundos <= 0) return "";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/// El setlist no es solo canciones: entre ellas hay intro en video, presentación
/// y pausas con cambio de vestuario, y el que opera luces o video las necesita
/// numeradas junto al resto.
export const TIPOS_FILA_SETLIST = ["CANCION", "INTRO", "PRESENTACION", "PAUSA", "CIERRE"] as const;

export const TIPO_FILA_SETLIST_LABEL: Record<string, string> = {
  CANCION: "Canción",
  INTRO: "Intro",
  PRESENTACION: "Presentación",
  PAUSA: "Pausa",
  CIERRE: "Cierre",
};

export function esCancion(tipo: string | null | undefined): boolean {
  return (tipo ?? "CANCION") === "CANCION";
}

/// El color del bloque es de la paleta del artista, no del dato: se repite al
/// pasar del séptimo bloque porque nadie imprime un setlist de ocho tandas.
const COLORES_BLOQUE = ["#E23B2E", "#6CDD1F", "#3B9BF0", "#EE6BDF", "#F0781F", "#F4C62C", "#7B2CF5"] as const;

export function colorDeBloque(numero: number): string {
  return COLORES_BLOQUE[(numero - 1) % COLORES_BLOQUE.length];
}

export interface FilaDeSetlist {
  id: string;
  tipo: string;
}

export type SegmentoSetlist<T> =
  | { clase: "bloque"; clave: string; numero: number; color: string; canciones: { fila: T; posicion: number }[] }
  | { clase: "momento"; clave: string; fila: T };

/// Los bloques no se capturan: son las tandas de canciones que quedan entre dos
/// momentos. Derivarlos evita que el número del bloque y el color se
/// desincronicen de las canciones que lo forman.
export function segmentarSetlist<T extends FilaDeSetlist>(filas: T[]): SegmentoSetlist<T>[] {
  const segmentos: SegmentoSetlist<T>[] = [];
  let posicion = 0;
  let numero = 0;

  for (const fila of filas) {
    if (!esCancion(fila.tipo)) {
      segmentos.push({ clase: "momento", clave: fila.id, fila });
      continue;
    }

    posicion += 1;
    const ultimo = segmentos[segmentos.length - 1];
    if (ultimo?.clase === "bloque") {
      ultimo.canciones.push({ fila, posicion });
      continue;
    }

    numero += 1;
    segmentos.push({
      clase: "bloque",
      clave: `bloque-${numero}`,
      numero,
      color: colorDeBloque(numero),
      canciones: [{ fila, posicion }],
    });
  }

  return segmentos;
}

// ── Crew ─────────────────────────────────────────────────────────────────────
export const ORIGENES_CREW = ["MAINSTAGE", "ARTISTA", "CASA", "PROVEEDOR", "EXTERNO"] as const;

export const ORIGEN_CREW_LABEL: Record<string, string> = {
  MAINSTAGE: "Mainstage",
  ARTISTA: "Del artista",
  CASA: "De la casa",
  PROVEEDOR: "Del proveedor",
  EXTERNO: "Externo",
};

export interface CrewNombrable {
  nombreLibre?: string | null;
  tecnico?: { nombre: string } | null;
  persona?: { nombre: string } | null;
}

/// Quién es esta persona. El nombre libre manda cuando existe: es el que se
/// capturó a propósito para esta gira (el técnico de la casa que no está en
/// ningún catálogo); si no, se lee del técnico o del integrante del artista.
export function nombreCrew(c: CrewNombrable): string {
  return c.nombreLibre?.trim() || c.tecnico?.nombre || c.persona?.nombre || "Sin nombre";
}

/**
 * Claves compuestas de los selectores de persona. Un crew sale del catálogo de
 * técnicos o del elenco del artista, y el renglón guarda uno u otro id; el
 * Combobox, en cambio, necesita un solo valor. La clave viaja prefijada para que
 * no haya dos selectores donde el usuario ve una sola pregunta: quién.
 */
export function partirClavePersona(valor: string | null | undefined): {
  tecnicoId: string | null;
  personaId: string | null;
} {
  if (typeof valor !== "string" || !valor.includes(":")) return { tecnicoId: null, personaId: null };
  const [tipo, id] = valor.split(":");
  if (!id) return { tecnicoId: null, personaId: null };
  if (tipo === "tecnico") return { tecnicoId: id, personaId: null };
  if (tipo === "persona") return { tecnicoId: null, personaId: id };
  return { tecnicoId: null, personaId: null };
}

export function clavePersona(fila: { tecnicoId?: string | null; personaId?: string | null }): string {
  if (fila.tecnicoId) return `tecnico:${fila.tecnicoId}`;
  if (fila.personaId) return `persona:${fila.personaId}`;
  return "";
}

/**
 * Rooming y viajes se asignan a quien ya está en el crew de la gira, porque es
 * la única lista que sabe quién viaja. También se admite el integrante del
 * artista suelto, para el músico que no pasó por el crew.
 */
export function partirClaveRooming(valor: string | null | undefined): {
  crewId: string | null;
  personaId: string | null;
} {
  if (typeof valor !== "string" || !valor.includes(":")) return { crewId: null, personaId: null };
  const [tipo, id] = valor.split(":");
  if (!id) return { crewId: null, personaId: null };
  if (tipo === "crew") return { crewId: id, personaId: null };
  if (tipo === "persona") return { crewId: null, personaId: id };
  return { crewId: null, personaId: null };
}

export function claveRooming(fila: { crewId?: string | null; personaId?: string | null }): string {
  if (fila.crewId) return `crew:${fila.crewId}`;
  if (fila.personaId) return `persona:${fila.personaId}`;
  return "";
}

// ── Hospedaje y viajes ───────────────────────────────────────────────────────
export const TIPOS_HABITACION = ["SENCILLA", "DOBLE", "TWIN", "SUITE"] as const;

export const TIPO_HABITACION_LABEL: Record<string, string> = {
  SENCILLA: "Sencilla",
  DOBLE: "Doble",
  TWIN: "Twin (2 camas)",
  SUITE: "Suite",
};

export const TIPOS_VIAJE = ["VUELO", "VAN", "AUTOBUS", "TREN", "TAXI", "TERRESTRE"] as const;

export const TIPO_VIAJE_LABEL: Record<string, string> = {
  VUELO: "Vuelo",
  VAN: "Van",
  AUTOBUS: "Autobús",
  TREN: "Tren",
  TAXI: "Taxi / app",
  TERRESTRE: "Terrestre",
};

// ── Propuesta de servicios ───────────────────────────────────────────────────
export const MODELOS_COBRO = ["POR_SHOW", "POR_DIA", "POR_EVENTO", "POR_GIRA", "RETAINER", "PORCENTAJE"] as const;

export const MODELO_COBRO_LABEL: Record<string, string> = {
  POR_SHOW: "Por show",
  POR_DIA: "Por día",
  POR_EVENTO: "Por evento",
  POR_GIRA: "Por gira",
  RETAINER: "Retainer mensual",
  PORCENTAJE: "Porcentaje",
};

export const UNIDADES_COBRO = [
  "SHOW",
  "DIA",
  "PERSONA_DIA",
  "PLAZA",
  "GIRA",
  "PIEZA",
  "MES",
  "HORA",
  "GLOBAL",
] as const;

export const UNIDAD_COBRO_LABEL: Record<string, string> = {
  SHOW: "por show",
  DIA: "por día",
  PERSONA_DIA: "por persona/día",
  PLAZA: "por venue",
  GIRA: "por gira",
  PIEZA: "por pieza",
  MES: "por mes",
  HORA: "por hora",
  GLOBAL: "global",
};

export const TIPOS_LINEA_PROPUESTA = [
  "HONORARIO",
  "ADVANCE",
  "COORDINACION",
  "DOCUMENTACION",
  "EQUIPO",
  "VIAJE",
  "HOSPEDAJE",
  "VIATICO",
  "PRODUCCION_LOCAL",
  "REEMBOLSABLE",
  "DESCUENTO",
] as const;

export const TIPO_LINEA_PROPUESTA_LABEL: Record<string, string> = {
  HONORARIO: "Honorario",
  ADVANCE: "Advance técnico",
  COORDINACION: "Coordinación",
  DOCUMENTACION: "Documentación",
  EQUIPO: "Equipo",
  VIAJE: "Viaje",
  HOSPEDAJE: "Hospedaje",
  VIATICO: "Viáticos",
  PRODUCCION_LOCAL: "Producción local",
  REEMBOLSABLE: "Reembolsable",
  DESCUENTO: "Descuento",
};

export const CATEGORIAS_SERVICIO = [
  "PRODUCTION_MANAGEMENT",
  "AUDIO",
  "ILUMINACION",
  "VIDEO",
  "DISENO",
  "LOGISTICA",
  "DOCUMENTACION",
  "EQUIPO",
] as const;

export const CATEGORIA_SERVICIO_LABEL: Record<string, string> = {
  PRODUCTION_MANAGEMENT: "Production management",
  AUDIO: "Audio",
  ILUMINACION: "Iluminación",
  VIDEO: "Video",
  DISENO: "Diseño y renders",
  LOGISTICA: "Logística",
  DOCUMENTACION: "Documentación",
  EQUIPO: "Equipo",
};

/// Dónde se vende el servicio. Una gira cobra por show y por plaza; un evento por
/// día y global. Es el filtro con el que se lee el catálogo, no una restricción:
/// un servicio de gira se puede meter a una propuesta de evento si aplica.
export const NIVELES_SERVICIO = ["GIRA", "EVENTO", "AMBOS"] as const;

export const NIVEL_SERVICIO_LABEL: Record<string, string> = {
  GIRA: "Shows y giras",
  EVENTO: "Eventos",
  AMBOS: "Ambos",
};

/// A qué subtotal de la propuesta suma cada tipo de línea.
export const GRUPO_SUBTOTAL: Record<string, "honorarios" | "equipo" | "logistica" | "reembolsables"> = {
  HONORARIO: "honorarios",
  ADVANCE: "honorarios",
  COORDINACION: "honorarios",
  DOCUMENTACION: "honorarios",
  EQUIPO: "equipo",
  PRODUCCION_LOCAL: "equipo",
  VIAJE: "logistica",
  HOSPEDAJE: "logistica",
  VIATICO: "logistica",
  REEMBOLSABLE: "reembolsables",
  DESCUENTO: "honorarios",
};

export const ESTADOS_PROPUESTA = [
  "BORRADOR",
  "ENVIADA",
  "EN_REVISION",
  "APROBADA",
  "RECHAZADA",
  "VENCIDA",
] as const;

export const ESTADO_PROPUESTA_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  EN_REVISION: "En revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
};

export const ESTADO_PROPUESTA_COLOR: Record<string, string> = {
  BORRADOR: "text-[#9ca3af] bg-white/5 border-white/10",
  ENVIADA: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  EN_REVISION: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  APROBADA: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  RECHAZADA: "text-red-300 bg-red-500/10 border-red-500/30",
  VENCIDA: "text-orange-300 bg-orange-500/10 border-orange-500/30",
};

export const IVA = 0.16;

// ── Semáforo del advance ─────────────────────────────────────────────────────
export interface LineaAdvanceResumible {
  prioridad: string;
  estado: string;
  cubiertoPor: string;
}

export interface ResumenAdvance {
  total: number;
  resueltas: number;
  abiertas: number;
  indispensablesTotal: number;
  indispensablesResueltas: number;
  /// 0-100 sobre los renglones indispensables: es lo que decide si el show va o no va.
  avance: number;
  semaforo: "LISTO" | "EN_PROCESO" | "RIESGO" | "SIN_ARMAR";
}

/// Un renglón cuenta como resuelto si está confirmado, o si se decidió que no aplica
/// en este show. "No cubierto" nunca cuenta como resuelto, aunque sea una decisión.
function estaResuelta(l: LineaAdvanceResumible): boolean {
  if (l.cubiertoPor === "NO_APLICA") return true;
  if (l.cubiertoPor === "NO_CUBIERTO") return false;
  return ESTADOS_RESUELTOS.includes(l.estado);
}

export function resumirAdvance(lineas: LineaAdvanceResumible[]): ResumenAdvance {
  const total = lineas.length;
  const resueltas = lineas.filter(estaResuelta).length;
  const indispensables = lineas.filter((l) => l.prioridad === "INDISPENSABLE");
  const indispensablesResueltas = indispensables.filter(estaResuelta).length;

  const avance = indispensables.length
    ? Math.round((indispensablesResueltas / indispensables.length) * 100)
    : total
      ? Math.round((resueltas / total) * 100)
      : 0;

  let semaforo: ResumenAdvance["semaforo"] = "SIN_ARMAR";
  if (total > 0) {
    if (avance >= 100) semaforo = "LISTO";
    else if (avance >= 60) semaforo = "EN_PROCESO";
    else semaforo = "RIESGO";
  }

  return {
    total,
    resueltas,
    abiertas: total - resueltas,
    indispensablesTotal: indispensables.length,
    indispensablesResueltas,
    avance,
    semaforo,
  };
}

/// Una cotización rechazada o vencida ya no es dinero de esta gira, pero el borrador
/// sí: el total de la gira se arma mientras se negocia fecha por fecha y tiene que
/// moverse desde la primera. Por eso se descartan dos estados y no se exige APROBADA.
const COTIZACION_FUERA = ["RECHAZADA", "VENCIDA"];

export interface EquipoDeFecha {
  /// Suma de lo cotizado que sigue vivo. 0 también cuando no hay ninguna.
  total: number;
  cotizaciones: number;
  cerrada: boolean;
}

/// Lo cotizado de equipo en una fecha. Fuente única del total por show y del global
/// de la gira: el renglón de la fecha y el total de arriba salen de aquí, para que no
/// puedan decir cosas distintas.
export function equipoDeFecha(
  cotizaciones: { estado: string; granTotal: number }[],
): EquipoDeFecha {
  const vivas = cotizaciones.filter((c) => !COTIZACION_FUERA.includes(c.estado));
  return {
    total: vivas.reduce((s, c) => s + c.granTotal, 0),
    cotizaciones: vivas.length,
    cerrada: vivas.some((c) => c.estado === "APROBADA"),
  };
}

export const SEMAFORO_LABEL: Record<string, string> = {
  LISTO: "Listo",
  EN_PROCESO: "En proceso",
  RIESGO: "En riesgo",
  SIN_ARMAR: "Sin armar",
};

export const SEMAFORO_COLOR: Record<string, string> = {
  LISTO: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  EN_PROCESO: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  RIESGO: "text-red-300 bg-red-500/10 border-red-500/30",
  SIN_ARMAR: "text-[#9ca3af] bg-white/5 border-white/10",
};

// ── Helpers de formato ───────────────────────────────────────────────────────
export function fmtMoneda(n: number | null | undefined, moneda = "MXN"): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("es-MX", { style: "currency", currency: moneda, maximumFractionDigits: 0 });
}

export function fmtFechaCorta(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const fecha = typeof d === "string" ? new Date(d) : d;
  return fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function fmtFechaLarga(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const fecha = typeof d === "string" ? new Date(d) : d;
  return fecha.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/// Rango de fechas de la gira en una línea ("9 – 17 oct 2026").
export function fmtRango(inicio: Date | string | null | undefined, fin: Date | string | null | undefined): string {
  if (!inicio && !fin) return "Sin fechas";
  if (!fin) return fmtFechaCorta(inicio);
  if (!inicio) return fmtFechaCorta(fin);
  const a = typeof inicio === "string" ? new Date(inicio) : inicio;
  const b = typeof fin === "string" ? new Date(fin) : fin;
  const anio = b.getUTCFullYear();
  if (a.getTime() === b.getTime()) return `${fmtFechaCorta(a)} ${anio}`;
  return `${a.toLocaleDateString("es-MX", { day: "numeric", timeZone: "UTC" })} – ${fmtFechaCorta(b)} ${anio}`;
}

// ── Avance agregado de la gira ───────────────────────────────────────────────
export interface ShowResumible {
  riderLineas: LineaAdvanceResumible[];
}

export interface ResumenGira {
  shows: number;
  /// Promedio simple del avance de cada show: un show pesa igual que otro,
  /// aunque tenga menos renglones. Si se promediaran renglones, el show chico
  /// desaparecería detrás del grande y es justo el que se olvida.
  avance: number;
  semaforo: ResumenAdvance["semaforo"];
  enRiesgo: number;
  sinArmar: number;
}

export function avanceGira(shows: ShowResumible[]): ResumenGira {
  const resumenes = shows.map((s) => resumirAdvance(s.riderLineas));
  const conLineas = resumenes.filter((r) => r.total > 0);

  const avance = conLineas.length
    ? Math.round(conLineas.reduce((s, r) => s + r.avance, 0) / conLineas.length)
    : 0;

  const sinArmar = resumenes.filter((r) => r.semaforo === "SIN_ARMAR").length;
  const enRiesgo = resumenes.filter((r) => r.semaforo === "RIESGO").length;

  let semaforo: ResumenAdvance["semaforo"] = "SIN_ARMAR";
  if (conLineas.length) {
    if (enRiesgo > 0 || sinArmar > 0) semaforo = enRiesgo > 0 ? "RIESGO" : "EN_PROCESO";
    else if (avance >= 100) semaforo = "LISTO";
    else semaforo = "EN_PROCESO";
  }

  return { shows: shows.length, avance, semaforo, enRiesgo, sinArmar };
}

/// Las fechas del sistema viven al mediodía UTC: así ningún huso las corre de día.
export function parseFechaGira(valor: unknown): Date | null {
  if (typeof valor !== "string" || !valor.trim()) return null;
  const d = new Date(`${valor.slice(0, 10)}T12:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

/// La fecha tal como la espera un <input type="date">.
export function fechaInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const fecha = typeof d === "string" ? new Date(d) : d;
  if (isNaN(fecha.getTime())) return "";
  return fecha.toISOString().slice(0, 10);
}

/// Salidas y llegadas llevan hora. Se guarda la hora de pared tal como se
/// capturó (fijada en UTC) porque un vuelo sale a las 7:10 del reloj del
/// aeropuerto: si se convirtiera de huso, la gira cambiaría de hora según el
/// servidor que la lea.
export function parseFechaHoraGira(valor: unknown): Date | null {
  if (typeof valor !== "string" || !valor.trim()) return null;
  const texto = valor.trim();
  const d = new Date(texto.length <= 16 ? `${texto}:00.000Z` : texto);
  return isNaN(d.getTime()) ? null : d;
}

/// El valor tal como lo espera un <input type="datetime-local">.
export function fechaHoraInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const fecha = typeof d === "string" ? new Date(d) : d;
  if (isNaN(fecha.getTime())) return "";
  return fecha.toISOString().slice(0, 16);
}

export function fmtFechaHora(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const fecha = typeof d === "string" ? new Date(d) : d;
  if (isNaN(fecha.getTime())) return "—";
  return fecha
    .toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    })
    .replace(/\b([ap])\.\s?m\./gi, (_, p: string) => `${p.toUpperCase()}M`);
}

/// Días calendario de hoy a la fecha, en el huso del negocio. Negativo = ya pasó.
export function diasRestantes(fecha: Date | string | null | undefined): number | null {
  if (!fecha) return null;
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const hoy = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
  const objetivo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86400000);
}

export function fmtDiasRestantes(dias: number | null): string {
  if (dias === null) return "Sin fecha";
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias < 0) return `Hace ${Math.abs(dias)} d`;
  return `En ${dias} d`;
}

// ── Artista: formación ───────────────────────────────────────────────────────
export const TIPOS_FORMACION = ["BANDA", "SOLISTA", "DJ", "ENSAMBLE", "COLECTIVO"] as const;

export const TIPO_FORMACION_LABEL: Record<string, string> = {
  BANDA: "Banda",
  SOLISTA: "Solista",
  DJ: "DJ",
  ENSAMBLE: "Ensamble",
  COLECTIVO: "Colectivo",
};

// ── Rider: contexto y origen ─────────────────────────────────────────────────
// Un artista no tiene "un" rider: tiene el de su tour, el que manda a festivales
// y el que acepta en un privado. Mientras todos vivieron como versiones de la
// misma línea, el vigente del tour apagaba al de festival. El contexto separa las
// líneas: hay un rider vigente POR CONTEXTO, no uno por artista.

export const CONTEXTOS_RIDER = ["TOUR", "FESTIVAL", "PRIVADO", "TEATRO", "SHOWCASE", "ACUSTICO", "GENERAL"] as const;
export type ContextoRider = (typeof CONTEXTOS_RIDER)[number];

export const CONTEXTO_RIDER_LABEL: Record<string, string> = {
  TOUR: "Tour",
  FESTIVAL: "Festival",
  PRIVADO: "Evento privado",
  TEATRO: "Teatro",
  SHOWCASE: "Showcase",
  ACUSTICO: "Acústico",
  GENERAL: "General",
};

export const CONTEXTO_RIDER_AYUDA: Record<string, string> = {
  TOUR: "El montaje completo de la gira: lo que piden cuando ellos arman la producción.",
  FESTIVAL: "Lo que entra en un cambio de 20 minutos compartiendo backline y consola.",
  PRIVADO: "Boda, corporativo, fiesta: formato reducido y presupuesto de cliente final.",
  TEATRO: "Recinto sentado, acústica controlada, niveles bajos.",
  SHOWCASE: "Set corto para industria o prensa.",
  ACUSTICO: "Formato desenchufado, mucho menos canal y nada de backline pesado.",
  GENERAL: "El rider de cajón, el que aplica mientras no haya uno específico.",
};

export const CONTEXTO_RIDER_COLOR: Record<string, string> = {
  TOUR: "ms-badge-gold",
  FESTIVAL: "ms-badge-purple",
  PRIVADO: "ms-badge-blue",
  TEATRO: "ms-badge-sky",
  SHOWCASE: "ms-badge-emerald",
  ACUSTICO: "ms-badge-pink",
  GENERAL: "ms-badge-gray",
};

export function contextoRiderLabel(contexto: string | null | undefined): string {
  if (!contexto) return CONTEXTO_RIDER_LABEL.GENERAL;
  return CONTEXTO_RIDER_LABEL[contexto] ?? contexto;
}

/// GENERADO: la ficha se captura aquí y el PDF lo arma la plataforma.
/// CARGADO: el artista ya trae su PDF y solo lo guardamos; los números críticos
/// se capturan igual para que el advance y la cotización sigan funcionando.
export const ORIGENES_RIDER = ["GENERADO", "CARGADO"] as const;
export type OrigenRider = (typeof ORIGENES_RIDER)[number];

export const ORIGEN_RIDER_LABEL: Record<string, string> = {
  GENERADO: "Armado en la plataforma",
  CARGADO: "Documento del artista",
};

// ── Rider: secciones libres ──────────────────────────────────────────────────
/// Los nueve bloques fijos cubren el rider típico; lo que un artista pide fuera
/// de ellos (pirotecnia, seguridad, protocolo de prensa) entra como sección
/// libre con su propio título.
export interface SeccionExtraRider {
  id: string;
  titulo: string;
  contenido: string;
}

export function leerSeccionesExtra(valor: unknown): SeccionExtraRider[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s, i) => ({
      id: typeof s.id === "string" && s.id ? s.id : `sec-${i}`,
      titulo: typeof s.titulo === "string" ? s.titulo : "",
      contenido: typeof s.contenido === "string" ? s.contenido : "",
    }))
    .filter((s) => s.titulo.trim() !== "" || s.contenido.trim() !== "");
}

// ── Rider: anexos (stage plots y planos) ─────────────────────────────────────
export const TIPOS_ARCHIVO_RIDER = ["STAGE_PLOT", "PATCH", "PLANO", "OTRO"] as const;

export const TIPO_ARCHIVO_RIDER_LABEL: Record<string, string> = {
  STAGE_PLOT: "Stage plot",
  PATCH: "Patch / lista de canales",
  PLANO: "Plano o diagrama",
  OTRO: "Otro anexo",
};

export const TIPO_ARCHIVO_RIDER_COLOR: Record<string, string> = {
  STAGE_PLOT: "ms-badge-purple",
  PATCH: "ms-badge-emerald",
  PLANO: "ms-badge-sky",
  OTRO: "ms-badge-gray",
};

const EXT_IMAGEN = ["png", "jpg", "jpeg", "webp", "gif", "avif", "heic", "heif"];

/// Un anexo se imprime distinto según sea imagen o PDF: la imagen se dibuja en su
/// propia página a escala, el PDF se pega al final con sus páginas intactas.
export function esImagenArchivo(url: string, mime?: string | null): boolean {
  if (mime) return mime.startsWith("image/");
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return EXT_IMAGEN.includes(ext);
}

// ── Rider de equipo: unidades ────────────────────────────────────────────────
export const UNIDADES_RIDER = ["PZA", "JGO", "PAR", "CANAL", "MIX", "METRO", "SERVICIO"] as const;

export const UNIDAD_RIDER_LABEL: Record<string, string> = {
  PZA: "pza",
  JGO: "juego",
  PAR: "par",
  CANAL: "canal",
  MIX: "mix",
  METRO: "m",
  SERVICIO: "servicio",
};

// ── Plantillas de arranque del rider ─────────────────────────────────────────
// Un rider nuevo se captura más rápido corrigiendo una plantilla razonable que
// escribiendo 30 renglones en blanco. Todo lo sembrado es editable y borrable.

export interface PlantillaCanalInput {
  nombre: string;
  instrumento?: string;
  microfono?: string;
  alternativas?: string;
  soporte?: string;
  phantom?: boolean;
}

export const PLANTILLA_INPUT_BANDA: PlantillaCanalInput[] = [
  { nombre: "Kick in", instrumento: "Bombo", microfono: "Shure Beta 91A", alternativas: "Audix D6, AKG D112", soporte: "NINGUNO" },
  { nombre: "Kick out", instrumento: "Bombo", microfono: "Audix D6", alternativas: "Shure Beta 52A", soporte: "TRIPIE_CORTO" },
  { nombre: "Snare top", instrumento: "Tarola", microfono: "Shure SM57", alternativas: "Beyerdynamic M201", soporte: "CLIP" },
  { nombre: "Snare bottom", instrumento: "Tarola", microfono: "Shure SM57", soporte: "CLIP" },
  { nombre: "Hi-hat", instrumento: "Hi-hat", microfono: "AKG C451", alternativas: "Shure SM81, Neumann KM184", soporte: "TRIPIE_CORTO", phantom: true },
  { nombre: "Tom 1", instrumento: "Tom de aire", microfono: "Sennheiser e904", alternativas: "Shure Beta 98", soporte: "CLIP" },
  { nombre: "Tom 2", instrumento: "Tom de aire", microfono: "Sennheiser e904", alternativas: "Shure Beta 98", soporte: "CLIP" },
  { nombre: "Floor tom", instrumento: "Tom de piso", microfono: "Sennheiser e904", alternativas: "Audix D4", soporte: "CLIP" },
  { nombre: "Overhead L", instrumento: "Platillos", microfono: "Neumann KM184", alternativas: "AKG C414, Shure SM81", soporte: "TRIPIE_LARGO", phantom: true },
  { nombre: "Overhead R", instrumento: "Platillos", microfono: "Neumann KM184", alternativas: "AKG C414, Shure SM81", soporte: "TRIPIE_LARGO", phantom: true },
  { nombre: "Bajo DI", instrumento: "Bajo eléctrico", microfono: "DI activa Radial J48", alternativas: "BSS AR133", soporte: "DI", phantom: true },
  { nombre: "Bajo mic", instrumento: "Amplificador de bajo", microfono: "Shure Beta 52A", alternativas: "Audix D6", soporte: "TRIPIE_CORTO" },
  { nombre: "Guitarra 1", instrumento: "Guitarra eléctrica", microfono: "Sennheiser e906", alternativas: "Shure SM57", soporte: "TRIPIE_CORTO" },
  { nombre: "Guitarra 2", instrumento: "Guitarra eléctrica", microfono: "Sennheiser e906", alternativas: "Shure SM57", soporte: "TRIPIE_CORTO" },
  { nombre: "Guitarra acústica", instrumento: "Guitarra acústica", microfono: "DI activa", soporte: "DI", phantom: true },
  { nombre: "Teclado L", instrumento: "Teclado", microfono: "DI activa", soporte: "DI", phantom: true },
  { nombre: "Teclado R", instrumento: "Teclado", microfono: "DI activa", soporte: "DI", phantom: true },
  { nombre: "Tracks L", instrumento: "Playback", microfono: "DI activa", soporte: "DI", phantom: true },
  { nombre: "Tracks R", instrumento: "Playback", microfono: "DI activa", soporte: "DI", phantom: true },
  { nombre: "Click", instrumento: "Metrónomo", microfono: "DI activa", soporte: "DI", phantom: true },
  { nombre: "Voz lead", instrumento: "Voz principal", microfono: "Shure Beta 58A", alternativas: "SM58, Sennheiser e935", soporte: "TRIPIE_LARGO" },
  { nombre: "Coro 1", instrumento: "Voz", microfono: "Shure SM58", alternativas: "Sennheiser e835", soporte: "TRIPIE_LARGO" },
  { nombre: "Coro 2", instrumento: "Voz", microfono: "Shure SM58", alternativas: "Sennheiser e835", soporte: "TRIPIE_LARGO" },
  { nombre: "Talkback / shout", instrumento: "Comunicación", microfono: "Shure SM58", soporte: "TRIPIE_CORTO" },
];

export interface PlantillaCanalOutput {
  nombre: string;
  tipoSalida: string;
  estereo?: boolean;
}

export const PLANTILLA_OUTPUT_BANDA: PlantillaCanalOutput[] = [
  { nombre: "IEM voz lead", tipoSalida: "IEM", estereo: true },
  { nombre: "IEM guitarra", tipoSalida: "IEM", estereo: true },
  { nombre: "IEM bajo", tipoSalida: "IEM", estereo: true },
  { nombre: "IEM teclados", tipoSalida: "IEM", estereo: true },
  { nombre: "IEM batería", tipoSalida: "IEM", estereo: true },
  { nombre: "Wedge centro", tipoSalida: "WEDGE" },
  { nombre: "Sub de batería", tipoSalida: "SUB_DRUM" },
  { nombre: "Sidefill L/R", tipoSalida: "SIDEFILL", estereo: true },
  { nombre: "Shout a FOH", tipoSalida: "SHOUT" },
];

export interface PlantillaLineaRider {
  disciplina: string;
  concepto: string;
  cantidad: number;
  unidad: string;
  preferido?: string;
  aceptables?: string;
  prioridad: string;
  provistoPor: string;
}

export const PLANTILLA_RIDER_BANDA: PlantillaLineaRider[] = [
  { disciplina: "AUDIO", concepto: "Consola digital de FOH, mínimo 32 entradas", cantidad: 1, unidad: "PZA", preferido: "DiGiCo SD12 / Avid S6L", aceptables: "Yamaha CL5, Allen & Heath dLive", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "AUDIO", concepto: "Consola digital de monitores", cantidad: 1, unidad: "PZA", preferido: "DiGiCo SD12", aceptables: "Yamaha CL5, dLive", prioridad: "IMPORTANTE", provistoPor: "CASA" },
  { disciplina: "AUDIO", concepto: "Sistema PA line array con cobertura uniforme", cantidad: 1, unidad: "SERVICIO", preferido: "L-Acoustics K2 / Kara", aceptables: "d&b, Meyer, JBL VTX", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "AUDIO", concepto: "Subwoofers", cantidad: 8, unidad: "PZA", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "AUDIO", concepto: "Monitores de piso (wedges) amplificados", cantidad: 6, unidad: "PZA", preferido: "d&b M4", aceptables: "L-Acoustics X15", prioridad: "IMPORTANTE", provistoPor: "CASA" },
  { disciplina: "AUDIO", concepto: "Sistema de in-ear inalámbrico", cantidad: 5, unidad: "PZA", preferido: "Sennheiser G4 IEM", aceptables: "Shure PSM900", prioridad: "IMPORTANTE", provistoPor: "CASA" },
  { disciplina: "AUDIO", concepto: "Micrófono inalámbrico de mano", cantidad: 2, unidad: "PZA", preferido: "Shure Axient / ULXD con cápsula Beta 58", aceptables: "Sennheiser EW500", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "AUDIO", concepto: "Paquete de microfonía según input list", cantidad: 1, unidad: "JGO", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "AUDIO", concepto: "Cajas directas activas", cantidad: 8, unidad: "PZA", preferido: "Radial J48", aceptables: "BSS AR133", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "AUDIO", concepto: "Tripiés de micrófono tipo jirafa", cantidad: 12, unidad: "PZA", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "BACKLINE", concepto: "Batería completa con herrajes y banco (sin platillos)", cantidad: 1, unidad: "JGO", preferido: "DW Collector's / Yamaha Recording", aceptables: "Pearl Masters", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "BACKLINE", concepto: "Amplificador de bajo con pantalla 4x10", cantidad: 1, unidad: "PZA", preferido: "Ampeg SVT", aceptables: "Gallien-Krueger", prioridad: "IMPORTANTE", provistoPor: "CASA" },
  { disciplina: "BACKLINE", concepto: "Amplificador de guitarra", cantidad: 2, unidad: "PZA", preferido: "Fender Twin Reverb", aceptables: "Vox AC30, Marshall JCM", prioridad: "IMPORTANTE", provistoPor: "CASA" },
  { disciplina: "BACKLINE", concepto: "Teclado 88 teclas con soporte y pedal", cantidad: 1, unidad: "PZA", preferido: "Nord Stage 3", aceptables: "Yamaha CP88", prioridad: "DESEABLE", provistoPor: "CASA" },
  { disciplina: "ESCENARIO", concepto: "Tarima de batería (riser) 2x2 m", cantidad: 1, unidad: "PZA", prioridad: "IMPORTANTE", provistoPor: "CASA" },
  { disciplina: "ESCENARIO", concepto: "Escenario limpio, nivelado y techado", cantidad: 1, unidad: "SERVICIO", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "ILUMINACION", concepto: "Consola de iluminación", cantidad: 1, unidad: "PZA", preferido: "grandMA3", aceptables: "Avolites, ChamSys", prioridad: "IMPORTANTE", provistoPor: "CASA" },
  { disciplina: "ILUMINACION", concepto: "Cabezas móviles spot", cantidad: 12, unidad: "PZA", prioridad: "IMPORTANTE", provistoPor: "CASA" },
  { disciplina: "ILUMINACION", concepto: "Frontales de luz blanca cálida", cantidad: 8, unidad: "PZA", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "ILUMINACION", concepto: "Máquina de humo / hazer", cantidad: 2, unidad: "PZA", prioridad: "DESEABLE", provistoPor: "CASA" },
  { disciplina: "ENERGIA", concepto: "Alimentación limpia y aterrizada para audio", cantidad: 1, unidad: "SERVICIO", prioridad: "INDISPENSABLE", provistoPor: "CASA" },
  { disciplina: "ENERGIA", concepto: "Planta de respaldo", cantidad: 1, unidad: "PZA", prioridad: "DESEABLE", provistoPor: "CASA" },
  { disciplina: "COMUNICACION", concepto: "Intercom entre FOH, monitores y escenario", cantidad: 4, unidad: "PZA", prioridad: "IMPORTANTE", provistoPor: "CASA" },
  { disciplina: "VIDEO", concepto: "Pantalla LED de fondo con procesador", cantidad: 1, unidad: "SERVICIO", prioridad: "DESEABLE", provistoPor: "CASA" },
];

// ── Inventario de casa del venue ─────────────────────────────────────────────
// Condición del equipo que presta el foro: se captura al verificar la ficha en sitio.
export const CONDICIONES_CASA = ["BUENO", "REGULAR", "MALO", "DESCONOCIDO"] as const;

export const CONDICION_CASA_LABEL: Record<string, string> = {
  BUENO: "Bueno",
  REGULAR: "Regular",
  MALO: "Malo",
  DESCONOCIDO: "Sin verificar",
};

export const CONDICION_CASA_COLOR: Record<string, string> = {
  BUENO: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  REGULAR: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  MALO: "text-red-300 bg-red-500/10 border-red-500/30",
  DESCONOCIDO: "text-[#9ca3af] bg-white/5 border-white/10",
};

// ── Archivero de la gira ─────────────────────────────────────────────────────
// Lo que llega de afuera y no se captura: el contra-rider en PDF de la casa, el
// contrato del promotor, planos. Vive como archivo porque nadie va a transcribir
// un plano a campos, pero sí tiene que estar a un clic del advance.
export const TIPOS_ARCHIVO_GIRA = [
  "RIDER_CASA",
  "CONTRATO",
  "PLANO",
  "STAGE_PLOT",
  "INPUT_LIST",
  "HOSPITALIDAD",
  "OTRO",
] as const;

export const TIPO_ARCHIVO_GIRA_LABEL: Record<string, string> = {
  RIDER_CASA: "Rider de la casa",
  CONTRATO: "Contrato",
  PLANO: "Plano del foro",
  STAGE_PLOT: "Stage plot",
  INPUT_LIST: "Input list recibida",
  HOSPITALIDAD: "Hospitalidad",
  OTRO: "Otro",
};

export const TIPO_ARCHIVO_GIRA_COLOR: Record<string, string> = {
  RIDER_CASA: "ms-badge-gold",
  CONTRATO: "ms-badge-blue",
  PLANO: "ms-badge-sky",
  STAGE_PLOT: "ms-badge-purple",
  INPUT_LIST: "ms-badge-emerald",
  HOSPITALIDAD: "ms-badge-pink",
  OTRO: "ms-badge-gray",
};

// ── Secciones del libro de gira ──────────────────────────────────────────────
// El libro es un documento maestro recortable: estas llaves viajan en el
// querystring `?secciones=`, así que la UI, el generador y el PDF hablan del
// mismo vocabulario. Viven aquí y no en el componente del PDF porque la pantalla
// que las elige corre en el cliente y no debe arrastrar el renderer.
export const SECCIONES_LIBRO = [
  "resumen",
  "shows",
  "crew",
  "logistica",
  "setlist",
  "advance",
  "pendientes",
] as const;
export type SeccionLibro = (typeof SECCIONES_LIBRO)[number];

export const SECCION_LIBRO_LABEL: Record<SeccionLibro, string> = {
  resumen: "Resumen de la gira",
  shows: "Calendario de shows",
  crew: "Crew y contactos",
  logistica: "Logística y rooming",
  setlist: "Repertorio",
  advance: "Estado del advance",
  pendientes: "Pendientes por cerrar",
};

export const SECCION_LIBRO_AYUDA: Record<SeccionLibro, string> = {
  resumen: "Artista, fechas, estado y qué asume Mainstage.",
  shows: "Una fila por fecha: ciudad, foro, horarios clave y promotor.",
  crew: "Quién viaja y a quién se le marca en cada plaza.",
  logistica: "Vuelos y traslados, hoteles y la rooming list.",
  setlist: "El setlist base y las variantes por show.",
  advance: "Semáforo por show y los indispensables que siguen abiertos.",
  pendientes: "El checklist del advance agrupado por frente.",
};

/// Peso del archivo como se lee en pantalla. El modelo lo guarda en bytes porque
/// es lo que reporta Blob; nadie lee "4823910".
export function fmtTamano(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
