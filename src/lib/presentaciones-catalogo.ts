import {
  SlidersHorizontal,
  Compass,
  Palette,
  Music,
  Wine,
  Building2,
  Camera,
  Handshake,
  Package,
  Gift,
  Speaker,
  Lightbulb,
  Monitor,
  Disc3,
  Layers,
  Zap,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { PRESENTACION_CATEGORIAS } from "@/lib/presentacion-categorias";

export type PresentacionItem = {
  key: string;
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  audience: string;
};

// Presentaciones generales: servicios y catálogo de inventario.
export const PRESENTACIONES_GENERAL: PresentacionItem[] = [
  {
    key: "servicios",
    label: "Servicios",
    desc: "Todo resuelto. Lo que ofrecemos, cómo trabajamos y por qué elegirnos.",
    href: "/presentacion/servicios",
    icon: SlidersHorizontal,
    audience: "Clientes potenciales",
  },
  {
    key: "paquetes",
    label: "Paquetes",
    desc: "Paquetes armados para bodas, XV años, conciertos y corporativos. Todo lo que incluye, listo para cotizar.",
    href: "/presentacion/paquetes",
    icon: Gift,
    audience: "Parejas · Familias · Empresas",
  },
  {
    key: "inventario",
    label: "Inventario de equipo",
    desc: "Catálogo completo del inventario audiovisual, lista de precios y cotizador.",
    href: "/presentacion/inventario",
    icon: Package,
    audience: "Clientes · Equipo",
  },
];

// Presentación central compartible: es el índice público /presentacion, ahora
// presentado como tarjeta dentro del módulo (antes era un banner aparte).
export const PRESENTACION_CENTRAL: PresentacionItem = {
  key: "central",
  label: "Presentación Mainstage Pro",
  desc: "Un solo link que agrupa todas las presentaciones comerciales. Nada interno se muestra aquí.",
  href: "/presentacion",
  icon: Globe,
  audience: "Clientes potenciales",
};

// Items del tab "General" del módulo de presentaciones. Desacoplado de
// PRESENTACIONES_GENERAL (que alimenta el índice público /presentacion) para
// poder ajustar la vista interna sin alterar lo que ven los clientes.
export const PRESENTACIONES_MODULO_GENERAL: PresentacionItem[] = [
  PRESENTACION_CENTRAL,
  {
    key: "inventario",
    label: "Inventario de equipo",
    desc: "Catálogo completo del inventario audiovisual, lista de precios y cotizador.",
    href: "/presentacion/inventario",
    icon: Package,
    audience: "Clientes · Equipo",
  },
];

// Presentaciones de paquetes armados, una por tipo de evento. Muestran los
// paquetes base ya configurados, listos para compartir con el cliente.
export const PRESENTACIONES_PAQUETES: PresentacionItem[] = [
  {
    key: "paquetes-todos",
    label: "Todos los paquetes",
    desc: "Vitrina completa con las tres categorías de paquetes armados en una sola página.",
    href: "/presentacion/paquetes",
    icon: Gift,
    audience: "Clientes potenciales",
  },
  {
    key: "paquetes-social",
    label: "Paquetes sociales",
    desc: "Paquetes armados para bodas, XV años y fiestas. Todo lo que incluye cada uno, listo para cotizar.",
    href: "/presentacion/paquetes/social",
    icon: Wine,
    audience: "Parejas · Familias",
  },
  {
    key: "paquetes-musical",
    label: "Paquetes musicales",
    desc: "Paquetes armados para conciertos, festivales y DJ. Todo lo que incluye cada uno, listo para cotizar.",
    href: "/presentacion/paquetes/musical",
    icon: Music,
    audience: "Promotores · Artistas",
  },
  {
    key: "paquetes-empresarial",
    label: "Paquetes empresariales",
    desc: "Paquetes armados para congresos, lanzamientos y corporativos. Todo lo que incluye cada uno, listo para cotizar.",
    href: "/presentacion/paquetes/empresarial",
    icon: Building2,
    audience: "Empresas · Agencias",
  },
];

// Presentaciones por tipo de evento.
export const PRESENTACIONES_EVENTOS: PresentacionItem[] = [
  {
    key: "musical",
    label: "Eventos musicales",
    desc: "Conciertos, festivales, DJ sets y showcases. Audio, iluminación y video para shows en vivo.",
    href: "/presentacion/evento/musical",
    icon: Music,
    audience: "Promotores · Artistas",
  },
  {
    key: "social",
    label: "Eventos sociales",
    desc: "Bodas, XV años, fiestas privadas. La producción que hace memorables los momentos que importan.",
    href: "/presentacion/evento/social",
    icon: Wine,
    audience: "Parejas · Familias",
  },
  {
    key: "empresarial",
    label: "Eventos empresariales",
    desc: "Conferencias, lanzamientos, corporativos. La imagen de tu empresa cuidada en cada detalle técnico.",
    href: "/presentacion/evento/empresarial",
    icon: Building2,
    audience: "Empresas · Agencias",
  },
];

// Galería de eventos. La primera es el índice (lleva a las tres galerías);
// después las individuales por tipo, en el orden musical → social → empresarial.
export const PRESENTACIONES_GALERIA: PresentacionItem[] = [
  {
    key: "galeria",
    label: "Galería de eventos",
    desc: "Un solo link que agrupa las tres galerías: musicales, sociales y empresariales.",
    href: "/presentacion/galeria",
    icon: Camera,
    audience: "Clientes · Redes",
  },
  {
    key: "galeria-musical",
    label: "Galería musical",
    desc: "Conciertos, festivales y shows en vivo. Nuestro trabajo musical en fotos reales.",
    href: "/presentacion/galeria/musical",
    icon: Music,
    audience: "Promotores · Artistas",
  },
  {
    key: "galeria-social",
    label: "Galería social",
    desc: "Bodas, XV años y celebraciones. Nuestro trabajo social en fotos reales.",
    href: "/presentacion/galeria/social",
    icon: Wine,
    audience: "Parejas · Familias",
  },
  {
    key: "galeria-empresarial",
    label: "Galería empresarial",
    desc: "Conferencias, lanzamientos y corporativos. Nuestro trabajo empresarial en fotos reales.",
    href: "/presentacion/galeria/empresarial",
    icon: Building2,
    audience: "Empresas · Agencias",
  },
];

// Unión de todas las presentaciones comerciales. Fuente única para el índice
// público compartible (/presentacion). Solo el índice de galería se lista aquí
// (las individuales cuelgan de él) para no saturar la portada pública.
export const PRESENTACIONES_COMERCIAL: PresentacionItem[] = [
  ...PRESENTACIONES_GENERAL,
  ...PRESENTACIONES_EVENTOS,
  PRESENTACIONES_GALERIA[0],
];

// Presentaciones para uso interno (equipo, agencias, candidatos). Nunca se
// listan en el índice público.
export const PRESENTACIONES_INTERNO: PresentacionItem[] = [
  {
    key: "alineacion",
    label: "Alineación de equipo 2026",
    desc: "Propósito, visión, misión, valores, principios y mentalidad Mainstage.",
    href: "/presentacion/alineacion-2026",
    icon: Compass,
    audience: "Equipo interno",
  },
  {
    key: "brandbook",
    label: "Brandbook",
    desc: "Identidad visual: logotipo, paleta de color, tipografía, tono de voz y guía de uso de marca.",
    href: "/presentacion/brandbook",
    icon: Palette,
    audience: "Equipo · Agencias",
  },
  {
    key: "equipo",
    label: "Únete al equipo",
    desc: "Por qué trabajar en Mainstage Pro, valores, beneficios y proceso de integración.",
    href: "/presentacion/equipo",
    icon: Handshake,
    audience: "Candidatos",
  },
];

// Iconos por macro-categoría de equipo (slug de presentacion-categorias).
const CATEGORIA_ICONS: Record<string, LucideIcon> = {
  audio: Speaker,
  iluminacion: Lightbulb,
  video: Monitor,
  dj: Disc3,
  escenarios: Layers,
  energia: Zap,
};

// Presentaciones por categoría de equipo (audio, iluminación, video, dj,
// escenarios, energía). Derivadas de PRESENTACION_CATEGORIAS para no duplicar
// la taxonomía. Se muestran en su propia pestaña "Categoría de equipos".
export const PRESENTACIONES_CATEGORIAS: PresentacionItem[] = PRESENTACION_CATEGORIAS.map((c) => ({
  key: `cat-${c.slug}`,
  label: c.nombre,
  desc: c.heroSub,
  href: `/presentacion/categoria/${c.slug}`,
  icon: CATEGORIA_ICONS[c.slug] ?? Package,
  audience: "Clientes · Equipo",
}));
