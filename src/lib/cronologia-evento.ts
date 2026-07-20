/**
 * cronologia-evento.ts — Cronología unificada de un proyecto para todos los documentos.
 *
 * Construye una lista de bloques en ORDEN CRONOLÓGICO ESTRICTO:
 *   1. Montaje y logística (llamado, salida de bodega, montaje, desmontaje)
 *   2. Día 1 (llamado, inicio, fin)
 *   3. Día 2 ...
 *   N. Día N
 *
 * Se apoya en el modelo multi-día (`horariosEvento`) para dar los horarios por día.
 * Todos los PDFs deben usar esto para que la información esté completa y ordenada igual.
 */
import { diasEvento, horarioDeDia, fechaISOaDia } from "./fechas-evento";

export type ItemCronologia = {
  label: string;
  hora: string;
  /** Fecha corta ("lun 5 jul") cuando aporta contexto; null si es obvia por el bloque. */
  fecha: string | null;
  /** Nota breve al lado (lugar, referencia). */
  nota: string | null;
};

export type BloqueCronologia = {
  titulo: string;
  /** Fecha del bloque (encabezado). */
  subtitulo: string | null;
  items: ItemCronologia[];
};

export type ProyectoCronologia = {
  fechaEvento: Date | string | null;
  fechasEvento: string | null;
  horariosEvento: string | null;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
  fechaMontaje: Date | string | null;
  horaInicioMontaje: string | null;
  horaSalidaBodega: string | null;
  horaDesmontaje: string | null;
  llamadoBodega: Date | string | null;
  lugarLlamado: string | null;
  lugarEvento: string | null;
};

/** "HH:MM" (UTC) desde un DateTime; null si no hay. */
function horaDeDateTime(dt: Date | string | null | undefined): string | null {
  if (!dt) return null;
  try {
    return new Date(dt).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  } catch {
    return null;
  }
}

/** "lun 5 jul" desde "YYYY-MM-DD" | Date | ISO. */
function fechaCorta(fecha: string | Date | null | undefined): string | null {
  if (!fecha) return null;
  const iso =
    typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ? `${fecha}T12:00:00.000Z`
      : fecha;
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return null;
  }
}

/**
 * Construye la cronología ordenada del proyecto.
 * @param opts.interno  true (default) incluye logística de bodega (llamado, salida, desmontaje).
 *                      false = versión cliente: solo montaje en venue y horarios de cada día.
 */
export function construirCronologia(
  p: ProyectoCronologia,
  opts?: { interno?: boolean },
): BloqueCronologia[] {
  const interno = opts?.interno ?? true;
  const dias = diasEvento(p.fechaEvento, p.fechasEvento);
  const bloques: BloqueCronologia[] = [];

  // ── Bloque 1: Montaje y logística ──
  const llamadoHora = horaDeDateTime(p.llamadoBodega);
  const llamadoFecha = p.llamadoBodega ? fechaISOaDia(p.llamadoBodega) : null;
  const montajeFecha = p.fechaMontaje ? fechaISOaDia(p.fechaMontaje) : llamadoFecha;
  const itemsMontaje: ItemCronologia[] = [];

  if (interno && (llamadoHora || p.lugarLlamado)) {
    itemsMontaje.push({
      label: "Llamado",
      hora: llamadoHora ?? "Por definir",
      fecha: fechaCorta(llamadoFecha ?? montajeFecha),
      nota: p.lugarLlamado,
    });
  }
  if (interno && p.horaSalidaBodega) {
    itemsMontaje.push({
      label: "Salida de bodega",
      hora: p.horaSalidaBodega,
      fecha: null,
      nota: null,
    });
  }
  if (p.horaInicioMontaje) {
    itemsMontaje.push({
      label: "Montaje en venue",
      hora: p.horaInicioMontaje,
      fecha: null,
      nota: p.lugarEvento,
    });
  }
  if (interno && p.horaDesmontaje) {
    itemsMontaje.push({
      label: "Desmontaje",
      hora: p.horaDesmontaje,
      fecha: null,
      nota: null,
    });
  }
  if (itemsMontaje.length) {
    bloques.push({
      titulo: "Montaje y logística",
      subtitulo: fechaCorta(montajeFecha),
      items: itemsMontaje,
    });
  }

  // ── Bloques por día del evento ──
  dias.forEach((fecha, i) => {
    // base.llamado/montaje = null → el día 1 no hereda el llamado de bodega (ya va en Montaje).
    const h = horarioDeDia(fecha, i, dias, p.horariosEvento, {
      inicio: p.horaInicioEvento,
      fin: p.horaFinEvento,
      llamado: null,
      montaje: null,
    });
    const items: ItemCronologia[] = [];
    if (interno && h.llamado) {
      items.push({ label: "Llamado", hora: h.llamado, fecha: null, nota: null });
    }
    if (interno && i > 0 && h.aplicaMontaje && h.montaje) {
      items.push({ label: "Montaje", hora: h.montaje, fecha: null, nota: p.lugarEvento });
    }
    if (h.inicio) {
      items.push({ label: "Inicio del evento", hora: h.inicio, fecha: null, nota: p.lugarEvento });
    }
    if (h.fin) {
      items.push({ label: "Fin del evento", hora: h.fin, fecha: null, nota: null });
    }
    if (items.length) {
      bloques.push({
        titulo: dias.length > 1 ? `Día ${i + 1}` : "Día del evento",
        subtitulo: fechaCorta(fecha),
        items,
      });
    }
  });

  return bloques;
}
