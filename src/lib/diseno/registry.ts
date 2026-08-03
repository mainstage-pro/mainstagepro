import { STORY_ORDER } from "./brief-tecnico/data";

// ── Registro de plantillas de diseño ─────────────────────────────────────────
// Metadatos PUROS (sin next/og, prisma ni IA): seguro de importar desde páginas
// y componentes. Las funciones de render/datos viven en renderers.ts (server).
// Agregar un diseño nuevo = registrar aquí su metadata + su renderer allá.

export type DesignCategoria = "Estrategia" | "Servicios" | "Eventos" | "Inventario" | "Contenido";

export const CATEGORIAS: { key: DesignCategoria; label: string }[] = [
  { key: "Estrategia", label: "Estrategia" },
  { key: "Servicios", label: "Servicios" },
  { key: "Eventos", label: "Tipos de evento" },
  { key: "Inventario", label: "Inventario" },
  { key: "Contenido", label: "Contenido" },
];

export type DesignSlide = { id: string; label: string };

export type DesignTemplateMeta = {
  id: string;
  nombre: string;
  categoria: DesignCategoria;
  descripcion: string;
  formato: string; // ej. "Story · 1080×1920"
  slides: DesignSlide[]; // vacío mientras no esté construida
  disponible: boolean; // false = en el roadmap, aún sin construir
  fuente: string; // módulo del que jala datos
  href?: string; // página propia de la plantilla (si tiene)
};

const BRIEF_LABELS: Record<string, string> = {
  portada: "Portada",
  brief: "Brief técnico",
  equipos: "Equipo por categoría (dinámico)",
  numeros: "Los números del evento",
};

export const TEMPLATES: DesignTemplateMeta[] = [
  {
    id: "brief-tecnico",
    nombre: "Brief Técnico de evento",
    categoria: "Estrategia",
    descripcion:
      "Serie de 5 stories con el desglose técnico de un evento: portada, brief, audio, video y números.",
    formato: "Story · 1080×1920",
    slides: STORY_ORDER.map((s) => ({ id: s, label: BRIEF_LABELS[s] ?? s })),
    disponible: true,
    fuente: "Proyectos",
    href: "/marketing/diseno/brief-tecnico",
  },
  {
    id: "servicios-mainstage",
    nombre: "Servicios Mainstage",
    categoria: "Servicios",
    descripcion: "Piezas que presentan cada servicio de producción técnica que ofrecemos.",
    formato: "Story · 1080×1920",
    slides: [],
    disponible: false,
    fuente: "Comercial · Productos y paquetes",
  },
  {
    id: "tipos-evento",
    nombre: "Tipos de evento Mainstage",
    categoria: "Eventos",
    descripcion: "Piezas por tipo de evento que atendemos (empresarial, social, musical…).",
    formato: "Story · 1080×1920",
    slides: [],
    disponible: false,
    fuente: "Ventas · Tipos de evento",
  },
  {
    id: "inventario-equipos",
    nombre: "Inventario de equipos",
    categoria: "Inventario",
    descripcion: "Fichas de equipo (audio, video, iluminación) directo del inventario.",
    formato: "Story · 1080×1920",
    slides: [],
    disponible: false,
    fuente: "Inventario",
  },
  {
    id: "contenido-informativo",
    nombre: "Contenido informativo",
    categoria: "Contenido",
    descripcion:
      "Calendario de contenido ligado a servicios, tipos de evento e inventario. Genera hasta un año de piezas.",
    formato: "Story · 1080×1920",
    slides: [],
    disponible: false,
    fuente: "Servicios · Eventos · Inventario",
  },
  {
    id: "contenido-campanas",
    nombre: "Contenido para campañas",
    categoria: "Contenido",
    descripcion: "Piezas para campañas de publicidad y promociones puntuales.",
    formato: "Story · 1080×1920",
    slides: [],
    disponible: false,
    fuente: "Marketing · Publicidad",
  },
];

export function getTemplate(id: string): DesignTemplateMeta | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export function templatesPorCategoria(cat: DesignCategoria): DesignTemplateMeta[] {
  return TEMPLATES.filter((t) => t.categoria === cat);
}
