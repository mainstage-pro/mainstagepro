// Datos de la serie "Tipos de evento Mainstage". Muestra precargada (renderable
// sin BD) con los 4 tipos y sus nichos. Al cablear, se arma desde el catálogo
// real (TipoEvento + Nicho + FotoTipoEvento) en build.ts.

import type { EditableField } from "../overrides";
import { TELEFONO, ARROBA } from "../servicios/data";

export type TipoEventoSlide = {
  id: string; // "tipo-musical", …
  badge: string;
  label: string;
  tituloGold: string;
  tituloWhite: string;
  descripcion: string;
  nichos: string[]; // nombres de nicho (chips)
  bg: string; // ruta en /public
};

export type TiposEventoData = {
  portada: { kicker: string; tituloGold: string; tituloWhite: string; tagline: string; bg: string };
  tipos: TipoEventoSlide[];
  cierre: { tituloGold: string; tituloWhite: string; telefono: string; arroba: string; bg: string };
};

export const TIPOS_EVENTO_MUESTRA: TiposEventoData = {
  portada: {
    kicker: "PRODUCCIÓN PARA CADA EVENTO",
    tituloGold: "TIPOS DE",
    tituloWhite: "EVENTO",
    tagline: "De un concierto a una boda o un congreso: montamos la producción técnica que cada evento necesita.",
    bg: "images/presentacion/musicales/Musicales-037.jpg",
  },
  tipos: [
    {
      id: "tipo-musical",
      badge: "EVENTOS MUSICALES",
      label: "Musical",
      tituloGold: "EVENTOS",
      tituloWhite: "MUSICALES",
      descripcion: "Audio e iluminación de concierto para que la música se sienta.",
      nichos: ["Concierto", "Festival", "Música electrónica", "Presentación musical", "Tocada / Bar"],
      bg: "images/presentacion/musicales/DSC07491.jpg",
    },
    {
      id: "tipo-social",
      badge: "EVENTOS SOCIALES",
      label: "Social",
      tituloGold: "EVENTOS",
      tituloWhite: "SOCIALES",
      descripcion: "La producción que vuelve inolvidable tu celebración.",
      nichos: ["Boda", "XV Años", "Bautizo", "Cumpleaños", "Fiesta privada", "Graduación"],
      bg: "images/presentacion/sociales/s-boda-elegante.jpg",
    },
    {
      id: "tipo-empresarial",
      badge: "EVENTOS EMPRESARIALES",
      label: "Empresarial",
      tituloGold: "EVENTOS",
      tituloWhite: "EMPRESARIALES",
      descripcion: "Tecnología impecable para eventos de marca y corporativos.",
      nichos: ["Congreso / Convención", "Lanzamiento de producto", "Junta anual", "Expo / Stand", "Capacitación"],
      bg: "images/presentacion/empresariales/e-auditorio.jpg",
    },
    {
      id: "tipo-otro",
      badge: "EVENTOS ESPECIALES",
      label: "Otro",
      tituloGold: "EVENTOS",
      tituloWhite: "ESPECIALES",
      descripcion: "¿Algo distinto? Diseñamos la producción a la medida de tu evento.",
      nichos: ["Activaciones", "Desfiles", "Deportivos", "Culturales"],
      bg: "images/presentacion/empresariales/e-carpa-led.jpg",
    },
  ],
  cierre: {
    tituloGold: "CUÉNTANOS",
    tituloWhite: "TU EVENTO",
    telefono: TELEFONO,
    arroba: ARROBA,
    bg: "images/presentacion/sociales/s-hacienda-iluminada.jpg",
  },
};

export function tiposEventoSlides(d: TiposEventoData): { id: string; label: string }[] {
  return [
    { id: "portada", label: "Portada" },
    ...d.tipos.map((t) => ({ id: t.id, label: t.label })),
    { id: "cierre", label: "Cierre / contacto" },
  ];
}

export function tiposEventoBg(d: TiposEventoData, slide: string): string {
  if (slide === "portada") return d.portada.bg;
  if (slide === "cierre") return d.cierre.bg;
  return d.tipos.find((t) => t.id === slide)?.bg ?? d.portada.bg;
}

export function tiposEventoEditableFields(d: TiposEventoData): EditableField[] {
  const f: EditableField[] = [];
  const add = (path: string, label: string, slideId: string, slideLabel: string, kind: EditableField["kind"] = "text") =>
    f.push({ path, label, slideId, slideLabel, kind });

  add("portada.kicker", "Kicker", "portada", "Portada");
  add("portada.tituloGold", "Título (dorado)", "portada", "Portada");
  add("portada.tituloWhite", "Título (blanco)", "portada", "Portada");
  add("portada.tagline", "Tagline", "portada", "Portada", "textarea");

  d.tipos.forEach((t, i) => {
    add(`tipos.${i}.tituloGold`, "Título (dorado)", t.id, t.label);
    add(`tipos.${i}.tituloWhite`, "Título (blanco)", t.id, t.label);
    add(`tipos.${i}.descripcion`, "Descripción", t.id, t.label, "textarea");
    add(`tipos.${i}.nichos`, "Nichos (uno por línea)", t.id, t.label, "lines");
  });

  add("cierre.tituloGold", "Título (dorado)", "cierre", "Cierre / contacto");
  add("cierre.tituloWhite", "Título (blanco)", "cierre", "Cierre / contacto");
  add("cierre.telefono", "Teléfono", "cierre", "Cierre / contacto");
  add("cierre.arroba", "Usuario / arroba", "cierre", "Cierre / contacto");

  return f;
}

export const TIPOS_EVENTO_STORY_ORDER = ["portada", "tipos", "cierre"] as const;
