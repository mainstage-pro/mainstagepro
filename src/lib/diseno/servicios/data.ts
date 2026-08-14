// Datos de la serie "Servicios Mainstage". Muestra precargada (renderable sin BD)
// con la voz y el criterio de las referencias. Al cablear, se arma desde el
// catálogo real (TipoServicio + FotoTipoServicio) en build.ts.

import type { EditableField } from "../overrides";

export type ServicioSlide = {
  id: string; // "servicio-renta", …
  badge: string; // etiqueta de esquina (referencias: "SERVICIOS MAINSTAGE")
  label: string; // para el hub/preview
  tituloGold: string;
  tituloWhite: string;
  descripcion: string;
  bullets: string[]; // qué incluye (checklist)
  bg: string; // ruta en /public
};

export type ServiciosData = {
  portada: { kicker: string; tituloGold: string; tituloWhite: string; tagline: string; bg: string };
  servicios: ServicioSlide[];
  cierre: { tituloGold: string; tituloWhite: string; telefono: string; arroba: string; bg: string };
};

export const TELEFONO = "446-143-2565";
export const ARROBA = "@mainstagepro";

export const SERVICIOS_MUESTRA: ServiciosData = {
  portada: {
    kicker: "PRODUCCIÓN DE EVENTOS",
    tituloGold: "SERVICIOS",
    tituloWhite: "MAINSTAGE",
    tagline: "Audio, iluminación y video profesional para que tu evento se vea y se escuche impecable.",
    bg: "images/presentacion/empresariales/e-sala-pantallas.jpg",
  },
  servicios: [
    {
      id: "servicio-renta",
      badge: "SERVICIOS MAINSTAGE",
      label: "Renta de equipo",
      tituloGold: "RENTA",
      tituloWhite: "DE EQUIPO",
      descripcion: "El equipo profesional que necesitas, entregado y listo para operar.",
      bullets: ["Audio, iluminación y video", "Marcas profesionales", "Entrega e instalación", "Respaldo técnico"],
      bg: "images/presentacion/equip-speaker.jpg",
    },
    {
      id: "servicio-produccion-tecnica",
      badge: "SERVICIOS MAINSTAGE",
      label: "Producción técnica",
      tituloGold: "PRODUCCIÓN",
      tituloWhite: "TÉCNICA",
      descripcion: "Diseñamos y operamos toda la parte técnica de tu evento, de principio a fin.",
      bullets: ["Diseño de audio y video", "Montaje y operación", "Técnicos en sitio", "Coordinación integral"],
      bg: "images/presentacion/empresariales/e-auditorio.jpg",
    },
    {
      id: "servicio-direccion-tecnica",
      badge: "SERVICIOS MAINSTAGE",
      label: "Dirección técnica",
      tituloGold: "DIRECCIÓN",
      tituloWhite: "TÉCNICA",
      descripcion: "Un director técnico que garantiza que todo salga perfecto el día del evento.",
      bullets: ["Planeación previa", "Rider y logística", "Supervisión en vivo", "Un solo responsable"],
      bg: "images/presentacion/empresariales/e-networking.jpg",
    },
  ],
  cierre: {
    tituloGold: "HAGAMOS",
    tituloWhite: "TU EVENTO",
    telefono: TELEFONO,
    arroba: ARROBA,
    bg: "images/presentacion/musicales/DSC07491.jpg",
  },
};

export function serviciosSlides(d: ServiciosData): { id: string; label: string }[] {
  return [
    { id: "portada", label: "Portada" },
    ...d.servicios.map((s) => ({ id: s.id, label: s.label })),
    { id: "cierre", label: "Cierre / contacto" },
  ];
}

export function serviciosBg(d: ServiciosData, slide: string): string {
  if (slide === "portada") return d.portada.bg;
  if (slide === "cierre") return d.cierre.bg;
  return d.servicios.find((s) => s.id === slide)?.bg ?? d.portada.bg;
}

export function serviciosEditableFields(d: ServiciosData): EditableField[] {
  const f: EditableField[] = [];
  const add = (path: string, label: string, slideId: string, slideLabel: string, kind: EditableField["kind"] = "text") =>
    f.push({ path, label, slideId, slideLabel, kind });

  add("portada.kicker", "Kicker", "portada", "Portada");
  add("portada.tituloGold", "Título (dorado)", "portada", "Portada");
  add("portada.tituloWhite", "Título (blanco)", "portada", "Portada");
  add("portada.tagline", "Tagline", "portada", "Portada", "textarea");

  d.servicios.forEach((sv, i) => {
    add(`servicios.${i}.tituloGold`, "Título (dorado)", sv.id, sv.label);
    add(`servicios.${i}.tituloWhite`, "Título (blanco)", sv.id, sv.label);
    add(`servicios.${i}.descripcion`, "Descripción", sv.id, sv.label, "textarea");
    add(`servicios.${i}.bullets`, "Incluye (uno por línea)", sv.id, sv.label, "lines");
  });

  add("cierre.tituloGold", "Título (dorado)", "cierre", "Cierre / contacto");
  add("cierre.tituloWhite", "Título (blanco)", "cierre", "Cierre / contacto");
  add("cierre.telefono", "Teléfono", "cierre", "Cierre / contacto");
  add("cierre.arroba", "Usuario / arroba", "cierre", "Cierre / contacto");

  return f;
}

export const SERVICIOS_STORY_ORDER = ["portada", "servicios", "cierre"] as const;
