// Datos de la serie "Inventario de equipos". Fichas de equipo (audio, video,
// iluminación) directo del inventario. Muestra precargada (renderable sin BD);
// al cablear se arma desde Equipo + CategoriaEquipo en build.ts.

import type { EditableField } from "../overrides";
import { ARROBA, TELEFONO } from "../servicios/data";

export type EquipoSlide = {
  id: string; // "equipo-<cuid>"
  badge: string; // esquina (referencias: "EQUIPO EN RENTA")
  label: string; // para el hub/preview
  tituloGold: string; // marca
  tituloWhite: string; // modelo
  descripcion: string;
  specs: string[]; // categoría, voltaje, amperaje… (chips)
  bg: string; // ruta /public, URL de Blob o data URL de la foto
};

export type InventarioData = {
  portada: { kicker: string; tituloGold: string; tituloWhite: string; tagline: string; bg: string };
  equipos: EquipoSlide[];
  cierre: { tituloGold: string; tituloWhite: string; telefono: string; arroba: string; bg: string };
};

export const INVENTARIO_MUESTRA: InventarioData = {
  portada: {
    kicker: "EQUIPO PROFESIONAL EN RENTA",
    tituloGold: "NUESTRO",
    tituloWhite: "INVENTARIO",
    tagline: "Audio, iluminación y video de marcas líderes, listo para tu evento.",
    bg: "images/presentacion/equip-speaker.jpg",
  },
  equipos: [
    {
      id: "equipo-muestra-1",
      badge: "EQUIPO EN RENTA",
      label: "Line Array",
      tituloGold: "LINE",
      tituloWhite: "ARRAY",
      descripcion: "Sistema de refuerzo sonoro de alto rendimiento para recintos medianos y grandes.",
      specs: ["Audio", "220 V", "Potencia profesional"],
      bg: "images/presentacion/equip-speaker.jpg",
    },
    {
      id: "equipo-muestra-2",
      badge: "EQUIPO EN RENTA",
      label: "Cabezas móviles",
      tituloGold: "CABEZAS",
      tituloWhite: "MÓVILES",
      descripcion: "Iluminación robótica para diseños dinámicos y efectos en vivo.",
      specs: ["Iluminación", "110 V", "Beam · Spot · Wash"],
      bg: "images/presentacion/musicales/DSC07491.jpg",
    },
    {
      id: "equipo-muestra-3",
      badge: "EQUIPO EN RENTA",
      label: "Pantalla LED",
      tituloGold: "PANTALLA",
      tituloWhite: "LED",
      descripcion: "Muro de video modular de alta resolución para pantallas de gran formato.",
      specs: ["Video", "220 V", "Alta resolución"],
      bg: "images/presentacion/empresariales/e-sala-pantallas.jpg",
    },
  ],
  cierre: {
    tituloGold: "RENTA",
    tituloWhite: "CON NOSOTROS",
    telefono: TELEFONO,
    arroba: ARROBA,
    bg: "images/presentacion/empresariales/e-auditorio.jpg",
  },
};

export function inventarioSlides(d: InventarioData): { id: string; label: string }[] {
  return [
    { id: "portada", label: "Portada" },
    ...d.equipos.map((e) => ({ id: e.id, label: e.label })),
    { id: "cierre", label: "Cierre / contacto" },
  ];
}

export function inventarioBg(d: InventarioData, slide: string): string {
  if (slide === "portada") return d.portada.bg;
  if (slide === "cierre") return d.cierre.bg;
  return d.equipos.find((e) => e.id === slide)?.bg ?? d.portada.bg;
}

export function inventarioEditableFields(d: InventarioData): EditableField[] {
  const f: EditableField[] = [];
  const add = (path: string, label: string, slideId: string, slideLabel: string, kind: EditableField["kind"] = "text") =>
    f.push({ path, label, slideId, slideLabel, kind });

  add("portada.kicker", "Kicker", "portada", "Portada");
  add("portada.tituloGold", "Título (dorado)", "portada", "Portada");
  add("portada.tituloWhite", "Título (blanco)", "portada", "Portada");
  add("portada.tagline", "Tagline", "portada", "Portada", "textarea");

  d.equipos.forEach((eq, i) => {
    add(`equipos.${i}.tituloGold`, "Marca (dorado)", eq.id, eq.label);
    add(`equipos.${i}.tituloWhite`, "Modelo (blanco)", eq.id, eq.label);
    add(`equipos.${i}.descripcion`, "Descripción", eq.id, eq.label, "textarea");
    add(`equipos.${i}.specs`, "Specs (uno por línea)", eq.id, eq.label, "lines");
  });

  add("cierre.tituloGold", "Título (dorado)", "cierre", "Cierre / contacto");
  add("cierre.tituloWhite", "Título (blanco)", "cierre", "Cierre / contacto");
  add("cierre.telefono", "Teléfono", "cierre", "Cierre / contacto");
  add("cierre.arroba", "Usuario / arroba", "cierre", "Cierre / contacto");

  return f;
}

export const INVENTARIO_STORY_ORDER = ["portada", "equipos", "cierre"] as const;
