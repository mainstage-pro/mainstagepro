// src/lib/pdf-gira/index.ts
//
// El catálogo de documentos que una gira puede emitir. La llave es el segmento
// de URL (interno y público), así que es la misma lista que ve el tour manager
// en la página de Documentos y la que resuelve el portal por token: no hay forma
// de que se desincronicen.

import type { PdfGira } from "./render";
import { generarDaySheet } from "./day-sheet";
import { generarAdvancePlaza } from "./advance";
import { generarListaCanales, generarRiderArtista, riderDeGira } from "./rider";

export type { PdfGira } from "./render";
export { respuestaPdf } from "./render";
export { riderDeGira } from "./rider";

/// SHOW: el documento habla de una plaza concreta (necesita un GiraShow).
/// GIRA: el documento vale para toda la gira (sale del rider maestro).
export type AmbitoDocGira = "SHOW" | "GIRA";

export interface DocumentoGira {
  ambito: AmbitoDocGira;
  label: string;
  descripcion: string;
}

export const DOCUMENTOS_GIRA = {
  "day-sheet": {
    ambito: "SHOW",
    label: "Day sheet",
    descripcion: "La corrida del día, el crew de la plaza y a quién se le marca. Es el que se manda cada mañana.",
  },
  advance: {
    ambito: "SHOW",
    label: "Advance de la plaza",
    descripcion: "Lo que pide el rider contra lo que pone la casa y lo que falta cerrar. Sin costos ni proveedores.",
  },
  rider: {
    ambito: "GIRA",
    label: "Rider técnico",
    descripcion: "El rider del artista con su versión, notas por disciplina e input/output list.",
  },
  "input-list": {
    ambito: "GIRA",
    label: "Input y output list",
    descripcion: "Solo las dos listas de canales, para el ingeniero de la casa.",
  },
} satisfies Record<string, DocumentoGira>;

export type SlugDocGira = keyof typeof DOCUMENTOS_GIRA;

export function esSlugDocGira(slug: string): slug is SlugDocGira {
  return slug in DOCUMENTOS_GIRA;
}

/// Genera el PDF de un documento de plaza. El rider y las listas se resuelven
/// por la gira del show, así que un show puede emitir los cuatro.
export async function generarDocDeShow(slug: SlugDocGira, showId: string, giraId: string): Promise<PdfGira | null> {
  if (slug === "day-sheet") return generarDaySheet(showId);
  if (slug === "advance") return generarAdvancePlaza(showId);
  return generarDocDeGira(slug, giraId);
}

/// Genera el PDF de un documento de gira. Los documentos de plaza no se pueden
/// emitir desde aquí: sin fecha ni foro no dicen nada.
export async function generarDocDeGira(slug: SlugDocGira, giraId: string): Promise<PdfGira | null> {
  if (DOCUMENTOS_GIRA[slug].ambito === "SHOW") return null;
  const resuelto = await riderDeGira(giraId);
  if (!resuelto) return null;
  if (slug === "input-list") return generarListaCanales(resuelto.riderId, resuelto.giraNombre);
  return generarRiderArtista(resuelto.riderId, resuelto.giraNombre);
}
