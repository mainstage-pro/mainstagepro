/**
 * cronologia-evento.ts — Cronología unificada de un proyecto para todos los documentos.
 *
 * Construye una lista de bloques en ORDEN CRONOLÓGICO ESTRICTO:
 *   1. Montaje (si es día aparte: bloque propio antes del evento; si es mismo día:
 *      se antepone a los ítems del Día 1)
 *   2. Día 1 (llamado, inicio, fin)
 *   3. Día 2 ...
 *   N. Día N
 *   N+1. Desmontaje (si es día aparte: bloque propio después del evento; si es mismo
 *      día: se agrega al final del último día)
 *
 * Se apoya en el modelo multi-día (`horariosEvento`) para dar los horarios por día.
 * Todos los PDFs deben usar esto para que la información esté completa y ordenada igual.
 */
import { diasEvento, horarioDeDia, fechaISOaDia } from "./fechas-evento";
import { fmt24to12 } from "./hora";

/** Tipos de fila de `ProyectoBloqueTiempo`. Cada documento filtra por estos. */
export const TIPOS_BLOQUE = ["MONTAJE", "SOUNDCHECK", "PROGRAMA", "PROVEEDOR", "DESMONTAJE"] as const;
export type TipoBloque = (typeof TIPOS_BLOQUE)[number];

/**
 * Qué horarios derivados del proyecto (los que no son filas capturadas) acompañan
 * a los bloques:
 *   COMPLETA — llamado, salida de bodega, llegada, montaje, evento y desmontaje.
 *   EVENTO   — solo inicio y fin de cada día, como anclas del detalle del show.
 *   NINGUNA  — nada derivado; solo las filas capturadas.
 */
export type BaseCronologia = "COMPLETA" | "EVENTO" | "NINGUNA";

/**
 * Las tres cronologías que se leen por separado. Una sola captura, tres lecturas:
 * cada bloque ya sabe qué es, así que nadie recaptura lo mismo en dos lados.
 */
export type VistaCronologia = "LOGISTICA" | "PROVEEDORES" | "OPERACION";

export const VISTAS_CRONOLOGIA: Record<
  VistaCronologia,
  { titulo: string; descripcion: string; tipos: TipoBloque[]; base: BaseCronologia }
> = {
  LOGISTICA: {
    titulo: "Logística general",
    descripcion: "Los trazos gruesos: llamado, salida de bodega, montaje y desmontaje.",
    tipos: ["MONTAJE", "DESMONTAJE"],
    base: "COMPLETA",
  },
  PROVEEDORES: {
    titulo: "Cronología de proveedores",
    descripcion: "Entrega, operación y recolección de cada proveedor externo.",
    tipos: ["PROVEEDOR"],
    base: "NINGUNA",
  },
  OPERACION: {
    titulo: "Operación del evento",
    descripcion: "El correr del show: soundcheck y programa.",
    tipos: ["SOUNDCHECK", "PROGRAMA"],
    base: "EVENTO",
  },
};

/** Fila de `ProyectoBloqueTiempo` tal como viene de la BD. */
export type BloqueTiempo = {
  id: string;
  tipo: string;
  fase: string | null;
  proveedorEventoId: string | null;
  fecha: Date | string | null;
  horaInicio: string | null;
  horaFin: string | null;
  titulo: string;
  detalle: string | null;
  responsable: string | null;
  involucrados: string | null;
  orden: number;
};

export type ItemCronologia = {
  label: string;
  hora: string;
  /** Hora de término cuando el bloque es un rango; ausente si es un instante. */
  horaFin?: string | null;
  /** Fecha corta ("lun 5 jul") cuando aporta contexto; null si es obvia por el bloque. */
  fecha: string | null;
  /** Nota breve al lado (lugar, referencia). */
  nota: string | null;
  /** Ausente o "BASE" = horario del proyecto; lo demás viene de un ProyectoBloqueTiempo. */
  tipo?: TipoBloque | "BASE";
  /** Nombre del proveedor cuando el ítem es tipo PROVEEDOR. */
  proveedor?: string | null;
  responsable?: string | null;
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
  /** true = el montaje es un día adicional (día antes); false = mismo día del evento. */
  montajeDiaAparte?: boolean | null;
  horaSalidaBodega: string | null;
  /** Hora de inicio del desmontaje. */
  horaDesmontaje: string | null;
  /** Duración estimada del desmontaje (hrs) → término aproximado = inicio + duración. */
  duracionDesmontajeHrs?: number | null;
  /** true = el desmontaje es un día adicional (día después); false = mismo día (último día). */
  desmontajeDiaAparte?: boolean | null;
  /** Fecha del desmontaje cuando es día aparte. */
  fechaDesmontaje?: Date | string | null;
  llamadoBodega: Date | string | null;
  lugarLlamado: string | null;
  lugarEvento: string | null;
};

/** "HH:MM" (UTC, 24h canónico) desde un DateTime; null si no hay. */
function horaDeDateTime(dt: Date | string | null | undefined): string | null {
  if (!dt) return null;
  try {
    return new Date(dt).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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

/** Convierte "HH:MM" a 12 hrs con AM/PM. Deja intactos valores no numéricos (p.ej. "Por definir" o ya formateados). */
function horaAmPm(hhmm: string | null): string | null {
  if (!hhmm) return hhmm;
  if (!/^\d{1,2}:\d{2}$/.test(hhmm.trim())) return hhmm;
  return fmt24to12(hhmm.trim()) || hhmm;
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

/** Convierte una fila de ProyectoBloqueTiempo en un ítem de la cronología. */
function bloqueAItem(b: BloqueTiempo, nombreProveedor?: string | null): ItemCronologia {
  const fase = b.fase ? b.fase.charAt(0) + b.fase.slice(1).toLowerCase() : null;
  const label = b.tipo === "PROVEEDOR" && fase ? `${fase} — ${nombreProveedor ?? b.titulo}` : b.titulo;
  return {
    label,
    hora: b.horaInicio || "Por definir",
    horaFin: b.horaFin,
    fecha: null,
    nota: b.detalle || b.involucrados || null,
    tipo: (b.tipo as TipoBloque) ?? "PROGRAMA",
    proveedor: b.tipo === "PROVEEDOR" ? nombreProveedor ?? null : null,
    responsable: b.responsable,
  };
}

/**
 * Construye la cronología ordenada del proyecto.
 * @param opts.interno  true (default) incluye logística de bodega (llamado, salida, desmontaje).
 *                      false = versión cliente: solo montaje en venue y horarios de cada día.
 * @param opts.bloques  Filas de ProyectoBloqueTiempo del proyecto. Se intercalan en el día
 *                      que les toca, entre el inicio y el fin del evento.
 * @param opts.tipos    Qué tipos de bloque incluir. Sin esto, entran todos. Es el filtro con
 *                      el que cada documento se queda solo con lo suyo (ej. solo SOUNDCHECK).
 * @param opts.nombresProveedor  id de ProveedorEvento → nombre, para etiquetar sus ventanas.
 * @param opts.base     Qué horarios derivados del proyecto acompañan a los bloques.
 *                      Sin esto entran todos (COMPLETA).
 */
export function construirCronologia(
  p: ProyectoCronologia,
  opts?: {
    interno?: boolean;
    bloques?: BloqueTiempo[];
    tipos?: TipoBloque[];
    nombresProveedor?: Record<string, string>;
    base?: BaseCronologia;
  },
): BloqueCronologia[] {
  const interno = opts?.interno ?? true;
  const base = opts?.base ?? "COMPLETA";
  // Los horarios derivados del proyecto (llamado, salida, montaje) solo acompañan a la
  // logística; las otras vistas se quedan con lo capturado para no repetir lo mismo.
  const conLogistica = base === "COMPLETA";
  const conEvento = base !== "NINGUNA";
  const dias = diasEvento(p.fechaEvento, p.fechasEvento);
  const bloques: BloqueCronologia[] = [];
  // Día (ISO) de cada bloque ya emitido, para saber dónde intercalar los rescatados.
  const claves: string[] = [];
  const agregar = (clave: string, bloque: BloqueCronologia) => {
    bloques.push(bloque);
    claves.push(clave);
  };

  // ── Bloques de tiempo capturados, agrupados por día ──
  const permitidos = opts?.tipos ?? [...TIPOS_BLOQUE];
  const extras = (opts?.bloques ?? [])
    .filter((b) => permitidos.includes(b.tipo as TipoBloque))
    .sort((a, b) => a.orden - b.orden);
  const nombres = opts?.nombresProveedor ?? {};
  const diaDeBloque = (b: BloqueTiempo) => (b.fecha ? fechaISOaDia(b.fecha) : dias[0]);
  // Un bloque puede caer en un día que ningún encabezado cubre (ej. el proveedor que
  // entrega dos días antes); se rescatan al final para que nada quede invisible.
  const colocados = new Set<string>();
  const itemsExtra = (dia: string, tipos: TipoBloque[]): ItemCronologia[] =>
    extras
      .filter((b) => tipos.includes(b.tipo as TipoBloque) && diaDeBloque(b) === dia)
      .map((b) => {
        colocados.add(b.id);
        return bloqueAItem(b, b.proveedorEventoId ? nombres[b.proveedorEventoId] : null);
      });

  const montajeDiaAparte = p.montajeDiaAparte === true;
  const desmontajeDiaAparte = p.desmontajeDiaAparte === true;

  // ── Ítems de montaje ──
  // Orden cronológico: llamado en bodega → salida de bodega → llegada al venue →
  // inicio de montaje → término aproximado de montaje.
  const llamadoHora = horaDeDateTime(p.llamadoBodega);
  const llamadoFecha = p.llamadoBodega ? fechaISOaDia(p.llamadoBodega) : null;
  const montajeFecha = p.fechaMontaje ? fechaISOaDia(p.fechaMontaje) : llamadoFecha;
  const terminoMontaje = sumarHoras(p.horaInicioMontaje, p.duracionMontajeHrs);
  const itemsMontaje: ItemCronologia[] = [];
  if (conLogistica && interno && (llamadoHora || p.lugarLlamado)) {
    itemsMontaje.push({
      label: "Llamado en bodega",
      hora: llamadoHora ?? "Por definir",
      // Solo mostramos la fecha del llamado si el montaje es día aparte (contexto distinto al día del evento).
      fecha: montajeDiaAparte ? fechaCorta(llamadoFecha ?? montajeFecha) : null,
      nota: p.lugarLlamado,
    });
  }
  if (conLogistica && interno && p.horaSalidaBodega) {
    itemsMontaje.push({ label: "Salida de bodega", hora: p.horaSalidaBodega, fecha: null, nota: null });
  }
  if (conLogistica && p.horaMontaje) {
    itemsMontaje.push({ label: "Llegada al venue", hora: p.horaMontaje, fecha: null, nota: p.lugarEvento });
  }
  if (conLogistica && p.horaInicioMontaje) {
    itemsMontaje.push({
      label: "Inicio de montaje",
      hora: p.horaInicioMontaje,
      fecha: null,
      nota: p.horaMontaje ? null : p.lugarEvento,
    });
  }
  const diaMontaje = (montajeDiaAparte ? montajeFecha : null) ?? dias[0];
  itemsMontaje.push(...itemsExtra(diaMontaje, ["MONTAJE"]));
  if (conLogistica && terminoMontaje) {
    itemsMontaje.push({ label: "Término aprox. de montaje", hora: terminoMontaje, fecha: null, nota: null });
  }

  // ── Ítems de desmontaje (solo interno) ──
  const terminoDesmontaje = sumarHoras(p.horaDesmontaje, p.duracionDesmontajeHrs);
  const desmontajeFecha = p.fechaDesmontaje ? fechaISOaDia(p.fechaDesmontaje) : null;
  const itemsDesmontaje: ItemCronologia[] = [];
  if (conLogistica && interno && p.horaDesmontaje) {
    itemsDesmontaje.push({ label: "Inicio de desmontaje", hora: p.horaDesmontaje, fecha: null, nota: null });
  }
  if (interno) {
    const diaDesmontaje = (desmontajeDiaAparte ? desmontajeFecha : null) ?? dias[dias.length - 1];
    itemsDesmontaje.push(...itemsExtra(diaDesmontaje, ["DESMONTAJE"]));
  }
  if (conLogistica && interno && terminoDesmontaje) {
    itemsDesmontaje.push({ label: "Término aprox. de desmontaje", hora: terminoDesmontaje, fecha: null, nota: null });
  }

  // ── Montaje como día adicional (antes de los días del evento) ──
  if (montajeDiaAparte && itemsMontaje.length) {
    agregar(montajeFecha ?? dias[0], { titulo: "Montaje", subtitulo: fechaCorta(montajeFecha), items: itemsMontaje });
  }

  // ── Bloques por día del evento ──
  const ultimoDia = dias.length - 1;
  // Llamado base para el día 1:
  //  - Montaje día aparte → el día 1 (día del evento) muestra su llamado desde llamadoBodega,
  //    sin duplicar, porque el bloque "Montaje" va en otro día.
  //  - Montaje el mismo día → null: el llamado ya se antepone al día 1 dentro de itemsMontaje
  //    ("Llamado en bodega"), así que no se repite.
  const baseLlamadoDia1 = montajeDiaAparte ? llamadoHora : null;
  dias.forEach((fecha, i) => {
    const h = horarioDeDia(fecha, i, dias, p.horariosEvento, {
      inicio: p.horaInicioEvento,
      fin: p.horaFinEvento,
      llamado: baseLlamadoDia1,
      montaje: null,
    });
    const items: ItemCronologia[] = [];
    // Montaje el mismo día → se antepone al día 1 (no cuenta como día adicional).
    if (!montajeDiaAparte && i === 0) {
      items.push(...itemsMontaje);
    }
    if (conLogistica && interno && h.llamado) {
      items.push({ label: "Llamado", hora: h.llamado, fecha: null, nota: p.lugarLlamado });
    }
    if (conLogistica && interno && i > 0 && h.aplicaMontaje && h.montaje) {
      items.push({ label: "Montaje", hora: h.montaje, fecha: null, nota: p.lugarEvento });
    }
    if (conEvento && h.inicio) {
      items.push({ label: "Inicio del evento", hora: h.inicio, fecha: null, nota: p.lugarEvento });
    }
    // El detalle del día (soundcheck, programa, ventanas de proveedor) vive entre el
    // inicio y el fin del evento, que es donde ocurre.
    items.push(...itemsExtra(fecha, interno ? ["SOUNDCHECK", "PROGRAMA", "PROVEEDOR"] : ["PROGRAMA"]));
    if (conEvento && h.fin) {
      items.push({ label: "Fin del evento", hora: h.fin, fecha: null, nota: null });
    }
    // Desmontaje el mismo día → se agrega al final del último día del evento.
    if (!desmontajeDiaAparte && i === ultimoDia) {
      items.push(...itemsDesmontaje);
    }
    if (items.length) {
      agregar(fecha, {
        titulo: dias.length > 1 ? `Día ${i + 1}` : "Día del evento",
        subtitulo: fechaCorta(fecha),
        items,
      });
    }
  });

  // ── Desmontaje como día adicional (después de los días del evento) ──
  if (desmontajeDiaAparte && itemsDesmontaje.length) {
    agregar(desmontajeFecha ?? dias[dias.length - 1], {
      titulo: "Desmontaje",
      subtitulo: fechaCorta(desmontajeFecha),
      items: itemsDesmontaje,
    });
  }

  // ── Rescate: bloques en días que ningún encabezado cubrió ──
  // Típico del proveedor que entrega dos días antes o recoge al día siguiente.
  const sueltos = extras.filter((b) => !colocados.has(b.id) && (interno || b.tipo === "PROGRAMA"));
  const porDia = new Map<string, BloqueTiempo[]>();
  sueltos.forEach((b) => {
    const dia = diaDeBloque(b);
    porDia.set(dia, [...(porDia.get(dia) ?? []), b]);
  });
  [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([dia, filas]) => {
      const bloque: BloqueCronologia = {
        titulo: dia < dias[0] ? "Antes del evento" : "Después del evento",
        subtitulo: fechaCorta(dia),
        items: filas.map((b) => bloqueAItem(b, b.proveedorEventoId ? nombres[b.proveedorEventoId] : null)),
      };
      const pos = claves.findIndex((c) => c > dia);
      if (pos === -1) {
        bloques.push(bloque);
        claves.push(dia);
      } else {
        bloques.splice(pos, 0, bloque);
        claves.splice(pos, 0, dia);
      }
    });

  bloques.forEach((b) => b.items.forEach((it) => {
    it.hora = horaAmPm(it.hora) ?? it.hora;
    if (it.horaFin) it.horaFin = horaAmPm(it.horaFin);
  }));

  return bloques;
}
