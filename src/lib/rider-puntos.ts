// src/lib/rider-puntos.ts
//
// Los puntos del rider: lo que se le pregunta al venue y al promotor fecha por
// fecha y se contesta cumple / no cumple.
//
// Un punto es una sección del rider, no un equipo. Un rider trae ochenta
// renglones de marca y modelo; cotejar ochenta renglones en cinco fechas no se
// hace, y partirlo así obliga a revisar equipo por equipo cuando lo que se
// negocia es el punto completo. Los puntos son los que el documento plantea, con
// su texto a la vista para resolverlos y para cambiarlos si llega un contrarider.
//
// Nada se inventa ni se guarda aquí: el punto es el texto que ya está en el
// rider, derivado en el momento.

import { SECCIONES_RIDER, leerSeccionesExtra } from "@/lib/giras";

export interface PuntoRider {
  /// Estable entre resiembras del checklist: identifica el punto, no su texto.
  llave: string;
  titulo: string;
  contenido: string;
}

/// Los campos de texto del rider de los que sale un punto, en el orden en que
/// se imprimen. Sirve para el `select` de Prisma.
export const CAMPOS_TEXTO_RIDER = [
  "requerimientosGenerales",
  ...SECCIONES_RIDER.flatMap((s) => s.notas.map((n) => n.campo)),
] as const;

/// Lo que hace falta leer del rider para derivar sus puntos.
export const SELECT_PUNTOS_RIDER = {
  seccionesExtra: true,
  ...Object.fromEntries(CAMPOS_TEXTO_RIDER.map((c) => [c, true])),
} as const;

export function puntosDelRider(rider: Record<string, unknown>): PuntoRider[] {
  const puntos: PuntoRider[] = [];

  function agregar(llave: string, titulo: string, valor: unknown) {
    const contenido = typeof valor === "string" ? valor.trim() : "";
    if (contenido) puntos.push({ llave: `rider-${llave}`, titulo, contenido });
  }

  agregar("requerimientosGenerales", "Requerimientos generales", rider.requerimientosGenerales);
  for (const s of SECCIONES_RIDER) {
    for (const n of s.notas) {
      agregar(n.campo, n.label ? `${s.titulo} — ${n.label}` : s.titulo, rider[n.campo]);
    }
  }
  for (const x of leerSeccionesExtra(rider.seccionesExtra)) {
    agregar(`x-${x.id}`, x.titulo.trim() || "Sección del rider", x.contenido);
  }

  return puntos;
}
