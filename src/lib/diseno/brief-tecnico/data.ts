// Datos de un "Brief Técnico" (serie de 5 stories). En el PoC vienen precargados
// con el evento Expo Supraterra (idéntico a las referencias). Al cablear el módulo
// a producción, estos objetos se arman desde el modelo Proyecto.

export type EquipoItem = { nombre: string; sub: string; cant: string };
export type StatItem = { n: string; label: string };

export type BriefTecnicoData = {
  portada: { kicker: string; tituloGold: string; tituloWhite: string; lugar: string; fechas: string };
  brief: {
    descripcion: string;
    venue: string;
    tipo: string;
    cliente: string;
    servicio: string;
  };
  audio: { tituloGold: string; tituloWhite: string; items: EquipoItem[]; footer: string[] };
  video: { tituloGold: string; tituloWhite: string; items: EquipoItem[]; footer: string[] };
  numeros: { intro: string; stats: StatItem[]; cierreNormal: string; cierreBold: string };
};

export const SUPRATERRA: BriefTecnicoData = {
  portada: {
    kicker: "DETRÁS DEL SHOW",
    tituloGold: "EXPO",
    tituloWhite: "SUPRATERRA",
    lugar: "Discovery Center Zibatá, Querétaro",
    fechas: "24, 25 y 26 Julio 2026",
  },
  brief: {
    descripcion:
      "Una producción técnica con montaje el día anterior y operación ininterrumpida durante tres jornadas de 8 horas. Audio profesional, pantalla LED de doble vista y un equipo técnico presente cada día desde las 7 de la mañana.",
    venue: "Discovery Center Zibatá",
    tipo: "Evento empresarial",
    cliente: "Supraterra",
    servicio: "Producción técnica completa",
  },
  audio: {
    tituloGold: "AUDIO Y",
    tituloWhite: "MICROFONÍA",
    items: [
      { nombre: "Electro Voice EKX 12P", sub: "Audio · Bocina full range", cant: "x8" },
      { nombre: "Electro Voice EKX 18P", sub: "Audio · Subwoofer", cant: "x4" },
      { nombre: "Shure SLXD B58", sub: "Microfonía · Inalámbrico digital", cant: "x4" },
      { nombre: "Allen & Heath SQ5", sub: "Consola · Mezcla digital principal", cant: "x1" },
    ],
    footer: ["Antenas A y B Shure · Planta Predator 9.5KW", "Centro de carga 3 fases Lite Tek"],
  },
  video: {
    tituloGold: "VIDEO Y",
    tituloWhite: "PANTALLA",
    items: [
      { nombre: "Pantalla LED Pitch 2.9mm", sub: "Video · Interior · ×18 m²", cant: "x1" },
      { nombre: "Blackmagic ATEM Mini Pro", sub: "Video · Switcher de señal", cant: "x1" },
      { nombre: "Cable HDMI", sub: "Conexión · 5m", cant: "x1" },
    ],
    footer: ["Operador de video presente los 3 días"],
  },
  numeros: {
    intro: "Eso es lo que requiere una producción técnica integral para una expo de marca.",
    stats: [
      { n: "3", label: "DÍAS DE OPERACIÓN" },
      { n: "18", label: "METROS DE PANTALLA LED" },
      { n: "12", label: "CAJAS DE AUDIO" },
      { n: "4", label: "TECNICOS EN SITIO" },
    ],
    cierreNormal: "Tu evento merece",
    cierreBold: "una producción de este nivel.",
  },
};

// Foto de fondo por story (de /public). Al cablear a prod se reemplaza por las
// fotos del evento subidas a Vercel Blob.
export const STORY_BG: Record<string, string> = {
  portada: "images/presentacion/empresariales/e-sala-pantallas.jpg",
  brief: "images/presentacion/empresariales/e-auditorio.jpg",
  audio: "images/presentacion/equip-speaker.jpg",
  video: "images/presentacion/empresariales/e-proyeccion-mural.jpg",
  numeros: "images/presentacion/empresariales/e-networking.jpg",
};

export const STORY_ORDER = ["portada", "brief", "audio", "video", "numeros"] as const;
export type StoryId = (typeof STORY_ORDER)[number];
