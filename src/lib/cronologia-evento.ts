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
  /** Hora de llegada al venue para montar. */
  horaMontaje: string | null;
  /** Hora en que arranca el montaje ya en el venue. */
  horaInicioMontaje: string | null;
  /** Duración estimada del montaje (hrs) → término aproximado = inicio + duración. */
  duracionMontajeHrs: number | null;
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

/** Suma horas (float) a una hora "HH:MM"; devuelve "HH:MM" o null. */
function sumarHoras(hhmm: string | null | undefined, horas: number | null | undefined): string | null {
  if (!hhmm || horas == null || !isFinite(horas)) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]) + Math.round(horas * 60);
  const min = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
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
  // Orden cronológico del día de montaje: llamado en bodega → salida de bodega →
  // llegada al venue → inicio de montaje → término aproximado de montaje → desmontaje.
  const llamadoHora = horaDeDateTime(p.llamadoBodega);
  const llamadoFecha = p.llamadoBodega ? fechaISOaDia(p.llamadoBodega) : null;
  const montajeFecha = p.fechaMontaje ? fechaISOaDia(p.fechaMontaje) : llamadoFecha;
  const terminoMontaje = sumarHoras(p.horaInicioMontaje, p.duracionMontajeHrs);
  const itemsMontaje: ItemCronologia[] = [];

  if (interno && (llamadoHora || p.lugarLlamado)) {
    itemsMontaje.push({
      label: "Llamado en bodega",
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
  if (p.horaMontaje) {
    itemsMontaje.push({
      label: "Llegada al venue",
      hora: p.horaMontaje,
      fecha: null,
      nota: p.lugarEvento,
    });
  }
  if (p.horaInicioMontaje) {
    itemsMontaje.push({
      label: "Inicio de montaje",
      hora: p.horaInicioMontaje,
      fecha: null,
      nota: p.horaMontaje ? null : p.lugarEvento,
    });
  }
  if (terminoMontaje) {
    itemsMontaje.push({
      label: "Término aprox. de montaje",
      hora: terminoMontaje,
      fecha: null,
      nota: null,
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
      items.push({ label: "Llamado", hora: h.llamado, fecha: null, nota: p.lugarLlamado });
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
