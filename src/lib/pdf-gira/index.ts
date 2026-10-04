// src/lib/pdf-gira/index.ts
//
// El catálogo de documentos que una gira puede emitir. La llave es el segmento
// de URL (interno y público), así que es la misma lista que ve el tour manager
// en la página de Documentos y la que resuelve el portal por token: no hay forma
// de que se desincronicen.

import type { PdfGira } from "./render";
import { generarDaySheet } from "./day-sheet";
import { generarAdvanceShow } from "./advance";
import { generarListaCanales, generarRiderArtista, riderDeGira } from "./rider";
import { generarLibroGira, parseSecciones } from "./libro";

export type { PdfGira } from "./render";
export { respuestaPdf } from "./render";
export { riderDeGira } from "./rider";
export { parseSecciones } from "./libro";

/// SHOW: el documento habla de un show concreto (necesita un GiraShow).
/// GIRA: el documento vale para toda la gira (sale del rider maestro).
export type AmbitoDocGira = "SHOW" | "GIRA";

export interface DocumentoGira {
  ambito: AmbitoDocGira;
  label: string;
  descripcion: string;
  /// El documento acepta `?secciones=` para recortar lo que imprime. Solo el
  /// libro: los demás son de una pieza y recortarlos no significa nada.
  modular?: boolean;
}

export const DOCUMENTOS_GIRA = {
  "libro-gira": {
    ambito: "GIRA",
    label: "Libro de gira",
    descripcion:
      "El documento maestro: routing, crew y contactos, logística y rooming, repertorio, estado del advance y pendientes. Las secciones se eligen al descargarlo.",
    modular: true,
  },
  "day-sheet": {
    ambito: "SHOW",
    label: "Day sheet",
    descripcion: "La corrida del día, el crew del show y a quién se le marca. Es el que se manda cada mañana.",
  },
  advance: {
    ambito: "SHOW",
    label: "Advance del show",
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

/// Genera el PDF de un documento de show. El rider, las listas y el libro se
/// resuelven por la gira del show, así que un show puede emitir todos.
export async function generarDocDeShow(
  slug: SlugDocGira,
  showId: string,
  giraId: string,
  secciones?: string | null,
): Promise<PdfGira | null> {
  if (slug === "day-sheet") return generarDaySheet(showId);
  if (slug === "advance") return generarAdvanceShow(showId);
  return generarDocDeGira(slug, giraId, secciones);
}

/// Genera el PDF de un documento de gira. Los documentos de show no se pueden
/// emitir desde aquí: sin fecha ni foro no dicen nada.
export async function generarDocDeGira(
  slug: SlugDocGira,
  giraId: string,
  secciones?: string | null,
): Promise<PdfGira | null> {
  if (DOCUMENTOS_GIRA[slug].ambito === "SHOW") return null;
  if (slug === "libro-gira") return generarLibroGira(giraId, parseSecciones(secciones));

  // El rider y las listas salen del rider maestro; sin rider no hay documento.
  const resuelto = await riderDeGira(giraId);
  if (!resuelto) return null;
  if (slug === "input-list") return generarListaCanales(resuelto.riderId, resuelto.giraNombre);
  return generarRiderArtista(resuelto.riderId, resuelto.giraNombre);
}
