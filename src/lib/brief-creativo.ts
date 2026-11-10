// Fuente única del brief técnico de descubrimiento de Mainstage Creative:
// 5 secciones / 16 puntos, reusada por el formulario interno (vendedor) y el
// wizard público (cliente, por `ProyectoCreativo.formToken`). No fija precio
// ni nivel A/AA/AAA — eso lo sigue haciendo `fixtureCountEstimado` + `urgente`
// (src/lib/propuesta-servicio.ts). Este brief es insumo para que el equipo de
// diseño sepa qué construir.

export type TipoCampoBrief = "texto" | "textarea" | "chips" | "toggle" | "colores" | "referencias";

export interface OpcionChip {
  id: string;
  label: string;
}

export interface CampoBrief {
  id: string;
  label: string;
  ayuda?: string;
  tipo: TipoCampoBrief;
  placeholder?: string;
  opciones?: OpcionChip[]; // para tipo "chips"
  multiple?: boolean; // chips: selección múltiple vs única
  mostrarSi?: { campoId: string; valor: string }; // condicional simple, un solo campo
}

export interface SeccionBrief {
  id: string;
  titulo: string;
  icono: "ClipboardList" | "Palette" | "Settings2" | "Music4" | "Handshake";
  descripcion: string;
  campos: CampoBrief[];
}

export const SECCIONES_BRIEF: SeccionBrief[] = [
  {
    id: "proyecto",
    titulo: "Proyecto",
    icono: "ClipboardList",
    descripcion: "Lo básico: qué es, cuándo y dónde.",
    campos: [
      {
        id: "formato",
        label: "¿Es un show o una gira?",
        tipo: "chips",
        opciones: [{ id: "SHOW", label: "Show" }, { id: "GIRA", label: "Gira" }],
      },
      {
        id: "adaptaVenues",
        label: "¿El diseño debe adaptarse a venues de distintos tamaños?",
        tipo: "toggle",
        mostrarSi: { campoId: "formato", valor: "GIRA" },
      },
      {
        id: "tipoEventoMusical",
        label: "Tipo de evento musical",
        tipo: "chips",
        opciones: [
          { id: "CONCIERTO", label: "Concierto" },
          { id: "FESTIVAL", label: "Festival" },
          { id: "SHOWCASE_CORPORATIVO", label: "Showcase / corporativo" },
          { id: "PRIVADO", label: "Privado" },
          { id: "OTRO", label: "Otro" },
        ],
      },
      {
        id: "fechas",
        label: "Fecha o fechas",
        tipo: "texto",
        placeholder: "Ej. 14 de marzo, 2026",
      },
      {
        id: "venue",
        label: "Venue o venues",
        ayuda: "Medidas del escenario, altura, puntos de colgado y equipo que ya tiene el venue.",
        tipo: "textarea",
        placeholder: "Describe cada venue con el mayor detalle posible…",
      },
      {
        id: "duracionSet",
        label: "Duración del set",
        ayuda: "Y si hay teloneros.",
        tipo: "texto",
        placeholder: "Ej. 90 min, 1 telonero de 20 min",
      },
    ],
  },
  {
    id: "concepto",
    titulo: "Concepto",
    icono: "Palette",
    descripcion: "La historia que cuenta el show y cómo se ve.",
    campos: [
      {
        id: "narrativa",
        label: "Narrativa del show",
        ayuda: "Qué historia cuenta y qué debe sentir el público.",
        tipo: "textarea",
      },
      {
        id: "estiloConceptual",
        label: "Estilo conceptual",
        tipo: "chips",
        opciones: [
          { id: "MINIMALISTA", label: "Minimalista / geométrico" },
          { id: "FUTURISTA", label: "Futurista" },
          { id: "TEATRAL", label: "Teatral" },
          { id: "INMERSIVO", label: "Inmersivo" },
          { id: "TRADICIONAL", label: "Tradicional" },
        ],
      },
      {
        id: "colorimetria",
        label: "Colorimetría",
        ayuda: "Paleta y colores principales.",
        tipo: "colores",
      },
      {
        id: "referencias",
        label: "Referencias y material del artista",
        ayuda: "Shows que le gustan, arte del álbum, logo. Pega links o sube archivos.",
        tipo: "referencias",
      },
    ],
  },
  {
    id: "produccion",
    titulo: "Producción",
    icono: "Settings2",
    descripcion: "El equipo y los efectos que necesita el show.",
    campos: [
      {
        id: "categoriasEquipo",
        label: "Categorías de equipo",
        tipo: "chips",
        multiple: true,
        opciones: [
          { id: "AUDIO", label: "Audio" },
          { id: "ILUMINACION", label: "Iluminación" },
          { id: "PANTALLAS", label: "Pantallas" },
          { id: "RISERS", label: "Risers" },
          { id: "BACKLINE", label: "Backline" },
        ],
      },
      {
        id: "descubrimientoDetallado",
        label: "Descubrimiento detallado",
        ayuda: "Iluminación a piso, colgada, alrededor del venue e ideas específicas.",
        tipo: "textarea",
      },
      {
        id: "efectosEspeciales",
        label: "Escenografía y efectos especiales",
        tipo: "chips",
        multiple: true,
        opciones: [
          { id: "CO2", label: "CO2" },
          { id: "PIROTECNIA", label: "Pirotecnia" },
          { id: "CONFETI", label: "Confeti" },
          { id: "LASER", label: "Láser" },
          { id: "HUMO", label: "Humo" },
        ],
      },
      {
        id: "contenidoPantallas",
        label: "Contenido para pantallas",
        ayuda: "¿Quién lo produce?",
        tipo: "texto",
      },
    ],
  },
  {
    id: "show",
    titulo: "Show",
    icono: "Music4",
    descripcion: "El recorrido del set en vivo.",
    campos: [
      {
        id: "setlist",
        label: "Set list con momentos clave",
        ayuda: "Intro, picos, baladas, cierre.",
        tipo: "textarea",
      },
    ],
  },
  {
    id: "proceso",
    titulo: "Proceso",
    icono: "Handshake",
    descripcion: "Presupuesto y entregables.",
    campos: [
      {
        id: "presupuesto",
        label: "Presupuesto o rango",
        tipo: "texto",
      },
      {
        id: "entregables",
        label: "Entregables",
        ayuda: "Fecha de entrega y quién aprueba.",
        tipo: "textarea",
      },
    ],
  },
];

export type RespuestasBrief = Record<string, string | string[] | boolean | undefined>;

export function parseBriefDetalle(raw: string | null | undefined): RespuestasBrief {
  if (!raw) return {};
  try {
    const d = JSON.parse(raw);
    return d && typeof d === "object" ? d : {};
  } catch {
    return {};
  }
}

export function serializeBriefDetalle(respuestas: RespuestasBrief): string | null {
  const limpio = Object.fromEntries(
    Object.entries(respuestas).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)),
  );
  return Object.keys(limpio).length ? JSON.stringify(limpio) : null;
}

// Para saber si vale la pena mostrar "Brief sin capturar" en los paneles de resumen.
export function briefEstaVacio(raw: string | null | undefined): boolean {
  return Object.keys(parseBriefDetalle(raw)).length === 0;
}
