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
  type LucideIcon,
} from "lucide-react";

export type PresentacionItem = {
  key: string;
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  audience: string;
};

// Presentaciones que se comparten con clientes. Fuente única para el índice
// interno (/presentaciones) y el índice público compartible (/presentacion).
export const PRESENTACIONES_COMERCIAL: PresentacionItem[] = [
  {
    key: "servicios",
    label: "Servicios",
    desc: "Todo resuelto. Lo que ofrecemos, cómo trabajamos y por qué elegirnos.",
    href: "/presentacion/servicios",
    icon: SlidersHorizontal,
    audience: "Clientes potenciales",
  },
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
  {
    key: "paquetes",
    label: "Paquetes",
    desc: "Paquetes armados para bodas, XV años, conciertos y corporativos. Todo lo que incluye, listo para cotizar.",
    href: "/presentacion/paquetes",
    icon: Gift,
    audience: "Parejas · Familias · Empresas",
  },
  {
    key: "galeria",
    label: "Galería de eventos",
    desc: "Nuestro trabajo en imágenes: musicales, sociales y empresariales.",
    href: "/presentacion/galeria",
    icon: Camera,
    audience: "Clientes · Redes",
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
