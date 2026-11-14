// src/lib/proyecto-evento.ts
//
// Un trato puede tener varias cotizaciones aprobadas y cada una se vuelve su propio
// proyecto. Todos heredan el nombre del trato ("Damian Lazarus"), así que en una
// lista se ven idénticos. Lo que los distingue es el nombre del evento en su
// cotización ("Evento 2", "Planta de luz main"). Aquí vive ese criterio para que la
// agenda del resumen y la lista de proyectos lo apliquen igual.

export interface CotizacionEvento {
  numeroCotizacion?: string | null;
  nombreCotizacion?: string | null;
  nombreEvento?: string | null;
}

/** Nombre del evento tal como está en su cotización (puede repetir el del proyecto). */
export function nombreDeCotizacion(cot: CotizacionEvento | null | undefined): string | null {
  return (cot?.nombreCotizacion || cot?.nombreEvento || "").trim() || null;
}

/** Nombre del evento según su cotización, o null si solo repite el del proyecto. */
export function nombreEventoCotizacion(
  nombreProyecto: string,
  cot: CotizacionEvento | null | undefined,
): string | null {
  const n = nombreDeCotizacion(cot);
  if (!n) return null;
  return n.toLowerCase() === nombreProyecto.trim().toLowerCase() ? null : n;
}

export type BloqueTrato<T> =
  | { tipo: "solo"; item: T }
  | { tipo: "trato"; tratoId: string; items: T[] };

/**
 * Junta los proyectos que vienen del mismo trato, sin alterar el orden de la lista:
 * el grupo aparece donde está su primer proyecto y conserva el orden interno. Un
 * trato con un solo proyecto en la lista se queda como renglón normal.
 */
export function agruparPorTrato<T extends { tratoId?: string | null }>(items: T[]): BloqueTrato<T>[] {
  const conteo = new Map<string, number>();
  for (const it of items) if (it.tratoId) conteo.set(it.tratoId, (conteo.get(it.tratoId) ?? 0) + 1);

  const bloques: BloqueTrato<T>[] = [];
  const grupos = new Map<string, T[]>();
  for (const it of items) {
    const t = it.tratoId;
    if (!t || (conteo.get(t) ?? 0) < 2) {
      bloques.push({ tipo: "solo", item: it });
      continue;
    }
    const existente = grupos.get(t);
    if (existente) {
      existente.push(it);
    } else {
      const nuevo = [it];
      grupos.set(t, nuevo);
      bloques.push({ tipo: "trato", tratoId: t, items: nuevo });
    }
  }
  return bloques;
}
