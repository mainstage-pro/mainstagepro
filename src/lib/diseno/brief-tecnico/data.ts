// Datos de un "Brief Técnico" (serie de 5 stories). En el PoC vienen precargados
// con el evento Expo Supraterra (idéntico a las referencias). Al cablear el módulo
// a producción, estos objetos se arman desde el modelo Proyecto.

export type EquipoItem = { nombre: string; sub: string; cant: string };
export type StatItem = { n: string; label: string };

// Un slide de equipo es DINÁMICO: se arma con las categorías realmente usadas en
// el evento. Familias afines se combinan en un slide; si una familia trae muchos
// items, se parte en varios. Cada slide trae su propio título, fondo y label.
export type EquipmentSlide = {
  id: string; // "equipo-0", "equipo-1", …
  tituloGold: string;
  tituloWhite: string;
  label: string; // para el hub/preview, ej. "Audio y microfonía"
  items: EquipoItem[];
  footer: string[];
  bg: string; // ruta en /public
};

export type BriefTecnicoData = {
  portada: { kicker: string; tituloGold: string; tituloWhite: string; lugar: string; fechas: string };
  brief: {
    descripcion: string;
    venue: string;
    tipo: string;
    cliente: string;
    servicio: string;
  };
  equipos: EquipmentSlide[];
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
  equipos: [
    {
      id: "equipo-0",
      tituloGold: "AUDIO Y",
      tituloWhite: "MICROFONÍA",
      label: "Audio y microfonía",
      bg: "images/presentacion/equip-speaker.jpg",
      items: [
        { nombre: "Electro Voice EKX 12P", sub: "Audio · Bocina full range", cant: "x8" },
        { nombre: "Electro Voice EKX 18P", sub: "Audio · Subwoofer", cant: "x4" },
        { nombre: "Shure SLXD B58", sub: "Microfonía · Inalámbrico digital", cant: "x4" },
        { nombre: "Allen & Heath SQ5", sub: "Consola · Mezcla digital principal", cant: "x1" },
      ],
      footer: ["Antenas A y B Shure · Planta Predator 9.5KW", "Centro de carga 3 fases Lite Tek"],
    },
    {
      id: "equipo-1",
      tituloGold: "VIDEO Y",
      tituloWhite: "PANTALLA",
      label: "Video y pantalla",
      bg: "images/presentacion/empresariales/e-proyeccion-mural.jpg",
      items: [
        { nombre: "Pantalla LED Pitch 2.9mm", sub: "Video · Interior · ×18 m²", cant: "x1" },
        { nombre: "Blackmagic ATEM Mini Pro", sub: "Video · Switcher de señal", cant: "x1" },
        { nombre: "Cable HDMI", sub: "Conexión · 5m", cant: "x1" },
      ],
      footer: ["Operador de video presente los 3 días"],
    },
  ],
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

// Fondos de los slides fijos (de /public). Los slides de equipo traen su propio
// fondo (por familia). Al cablear a prod se reemplazan por fotos del evento.
export const PORTADA_BG = "images/presentacion/empresariales/e-sala-pantallas.jpg";
export const BRIEF_BG = "images/presentacion/empresariales/e-auditorio.jpg";
export const NUMEROS_BG = "images/presentacion/empresariales/e-networking.jpg";

// Slides fijos que envuelven a los dinámicos de equipo.
const SLIDE_LABELS: Record<string, string> = {
  portada: "Portada",
  brief: "Brief técnico",
  numeros: "Los números del evento",
};

// Lista ORDENADA de slides de un brief, ya con los slides de equipo dinámicos
// intercalados entre "brief" y "numeros".
export function briefSlides(d: BriefTecnicoData): { id: string; label: string }[] {
  return [
    { id: "portada", label: SLIDE_LABELS.portada },
    { id: "brief", label: SLIDE_LABELS.brief },
    ...d.equipos.map((e) => ({ id: e.id, label: e.label })),
    { id: "numeros", label: SLIDE_LABELS.numeros },
  ];
}

// Fondo (ruta en /public) del slide indicado.
export function briefBg(d: BriefTecnicoData, slide: string): string {
  if (slide === "portada") return PORTADA_BG;
  if (slide === "brief") return BRIEF_BG;
  if (slide === "numeros") return NUMEROS_BG;
  return d.equipos.find((e) => e.id === slide)?.bg ?? PORTADA_BG;
}

// Índice (1-based) del slide para el número gigante de la esquina.
export function briefIndex(d: BriefTecnicoData, slide: string): number {
  const i = briefSlides(d).findIndex((s) => s.id === slide);
  return i >= 0 ? i + 1 : 1;
}

// Lista conceptual estática (solo para la tarjeta del hub; los slides de equipo
// reales dependen del evento).
export const STORY_ORDER = ["portada", "brief", "equipos", "numeros"] as const;
