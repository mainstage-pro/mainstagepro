/**
 * itinerario-operaciones.ts — Itinerario multi-evento de montaje/operación/desmontaje.
 *
 * A diferencia de cronologia-evento.ts (minuto a minuto, un proyecto), esto agrega
 * VARIOS proyectos en un rango de fechas. Usa los mismos horarios resumidos
 * (horariosResumen) para no desincronizarse de la Logística general del proyecto,
 * pero a diferencia de construirCronologia() SIEMPRE emite cada checkpoint —aunque
 * no tenga hora capturada— para que los huecos sean visibles en el itinerario general.
 */
import { diasEvento, horarioDeDia, fechaISOaDia } from "./fechas-evento";
import { horariosResumen, type ProyectoCronologia, type BloqueTiempo } from "./cronologia-evento";

export type CategoriaCheckpoint = "MONTAJE" | "EVENTO" | "DESMONTAJE";

/**
 * Campos del proyecto que un checkpoint fijo de plantilla puede editar en línea
 * desde el itinerario — la misma escritura que hace la página del proyecto
 * (ver PATCH /api/proyectos/itinerario). `null` = checkpoint de solo lectura
 * (p.ej. los que vienen de un ProyectoBloqueTiempo capturado aparte).
 */
export type CampoEditableItinerario =
  | "llamado"
  | "salidaBodega"
  | "llegadaVenue"
  | "inicioMontaje"
  | "finMontaje"
  | "inicioEvento"
  | "finEvento"
  | "inicioDesmontaje"
  | "finDesmontaje";

export type ItinerarioCheckpoint = {
  fecha: string; // YYYY-MM-DD
  /** "HH:MM" 24h; null = sin capturar (pendiente). */
  hora: string | null;
  horaFin: string | null;
  etiqueta: string;
  categoria: CategoriaCheckpoint;
  /** "Día 2 de 3" — solo en checkpoints de evento de varios días. */
  diaLabel: string | null;
  nota: string | null;
  /** Nota libre capturada desde el Itinerario para este checkpoint; null = sin capturar. */
  notaEditable: string | null;
  responsable: string | null;
  pendiente: boolean;
  /** Orden lógico dentro de su bloque, para cuando no hay hora que lo ordene. */
  orden: number;
  /** Clave de orden cronológico ya resuelta (incluye el "cruce de medianoche"). */
  clave: number;
  /** Campo del proyecto que edita este checkpoint; null = solo lectura. */
  campo: CampoEditableItinerario | null;
};

/** Parsea el JSON de notasItinerario a un mapa { [campo]: nota }. */
export function parseNotasItinerario(json: string | null | undefined): Partial<Record<CampoEditableItinerario, string>> {
  if (!json) return {};
  try {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    const out: Partial<Record<CampoEditableItinerario, string>> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k as CampoEditableItinerario] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function minutos(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

const RANGO_CATEGORIA: Record<CategoriaCheckpoint, number> = { MONTAJE: 0, EVENTO: 1_000_000, DESMONTAJE: 10_000_000 };
/** Techo generoso para la hora/hora envuelta (máx. real ~2880); los pendientes se van siempre después. */
const CLAVE_PENDIENTE_BASE = 3000;

/**
 * Minuto de cada hora del bloque, tal como transcurre la jornada: la primera hora
 * capturada (en orden de aparición, no la numéricamente menor) abre el bloque; lo
 * que caiga antes de ella es madrugada del día siguiente y se envuelve (+1440).
 * Sin hora → Infinity (se resuelve aparte, al final del bloque). Mismo criterio que
 * `ordenarPorReloj` en cronologia-evento.ts, aplicado aquí por bloque (montaje/día/desmontaje).
 */
function minutosConAncla(horas: (string | null)[]): number[] {
  const mins = horas.map((h) => minutos(h));
  const ancla = mins.find((m) => m != null);
  return mins.map((m) => {
    if (m == null) return Infinity;
    if (ancla == null) return m;
    return m < ancla ? m + 1440 : m;
  });
}

/** Resuelve `clave` de cada checkpoint de un mismo bloque (muta el array in-place). */
function asignarClaves(items: ItinerarioCheckpoint[], base: number): ItinerarioCheckpoint[] {
  const valores = minutosConAncla(items.map((it) => it.hora));
  items.forEach((it, i) => {
    it.clave = base + (valores[i] === Infinity ? CLAVE_PENDIENTE_BASE + it.orden : valores[i]);
  });
  return items;
}

function horaValida(v: string | null | undefined): string | null {
  return v && /^\d{1,2}:\d{2}$/.test(v.trim()) ? v.trim() : null;
}

function checkpoint(
  fecha: string,
  categoria: CategoriaCheckpoint,
  etiqueta: string,
  orden: number,
  opts: {
    hora?: string | null;
    horaFin?: string | null;
    nota?: string | null;
    notaEditable?: string | null;
    responsable?: string | null;
    diaLabel?: string | null;
    campo?: CampoEditableItinerario | null;
  } = {},
): ItinerarioCheckpoint {
  const hora = horaValida(opts.hora);
  return {
    fecha,
    hora,
    horaFin: horaValida(opts.horaFin),
    etiqueta,
    categoria,
    diaLabel: opts.diaLabel ?? null,
    nota: opts.nota ?? null,
    notaEditable: opts.notaEditable ?? null,
    responsable: opts.responsable ?? null,
    pendiente: !hora,
    orden,
    clave: 0,
    campo: opts.campo ?? null,
  };
}

/**
 * Checkpoints (montaje, evento, desmontaje) de un proyecto, SIEMPRE completos:
 * si un dato no se ha capturado en el proyecto, el checkpoint sale igual, marcado
 * `pendiente`, para que el hueco sea visible en el itinerario general.
 * `bloques` son las filas de ProyectoBloqueTiempo (solo SOUNDCHECK/PROGRAMA) del proyecto.
 */
export function checkpointsDeProyecto(p: ProyectoCronologia, bloques: BloqueTiempo[] = []): ItinerarioCheckpoint[] {
  const dias = diasEvento(p.fechaEvento, p.fechasEvento);
  const h = horariosResumen(p);
  const notas = parseNotasItinerario(p.notasItinerario);
  const out: ItinerarioCheckpoint[] = [];

  const llamadoFecha = p.llamadoBodega ? fechaISOaDia(p.llamadoBodega) : null;
  const montajeFecha = p.fechaMontaje ? fechaISOaDia(p.fechaMontaje) : llamadoFecha;
  const montajeDiaAparte = p.montajeDiaAparte === true && !!montajeFecha && montajeFecha !== dias[0];
  const fechaMontaje = montajeDiaAparte ? montajeFecha! : dias[0];

  const bloqueMontaje = [
    checkpoint(fechaMontaje, "MONTAJE", "Llamado", 0, {
      hora: h.llamadoBodega,
      nota: p.lugarLlamado,
      notaEditable: notas.llamado,
      campo: "llamado",
    }),
    checkpoint(fechaMontaje, "MONTAJE", "Salida de bodega", 1, {
      hora: h.salidaBodega,
      nota: p.puntoSalidaBodega,
      notaEditable: notas.salidaBodega,
      campo: "salidaBodega",
    }),
    checkpoint(fechaMontaje, "MONTAJE", "Llegada al venue", 2, {
      hora: h.llegadaVenue,
      nota: p.lugarEvento,
      notaEditable: notas.llegadaVenue,
      campo: "llegadaVenue",
    }),
    checkpoint(fechaMontaje, "MONTAJE", "Inicio de montaje", 3, {
      hora: h.inicioMontaje,
      notaEditable: notas.inicioMontaje,
      campo: "inicioMontaje",
    }),
    checkpoint(fechaMontaje, "MONTAJE", "Fin de montaje (aprox.)", 4, {
      hora: h.finMontaje,
      notaEditable: notas.finMontaje,
      campo: "finMontaje",
    }),
  ];
  out.push(...asignarClaves(bloqueMontaje, RANGO_CATEGORIA.MONTAJE));

  dias.forEach((fecha, i) => {
    const hd = horarioDeDia(fecha, i, dias, p.horariosEvento, {
      inicio: p.horaInicioEvento,
      fin: p.horaFinEvento,
      llamado: null,
      montaje: null,
    });
    const diaLabel = dias.length > 1 ? `Día ${i + 1} de ${dias.length}` : null;
    const bloqueDia: ItinerarioCheckpoint[] = [
      checkpoint(fecha, "EVENTO", "Inicio del evento", 0, {
        hora: hd.inicio,
        nota: p.lugarEvento,
        notaEditable: notas.inicioEvento,
        diaLabel,
        campo: "inicioEvento",
      }),
    ];
    bloques
      .filter((b) => (b.fecha ? fechaISOaDia(b.fecha) : dias[0]) === fecha)
      .sort((a, b) => a.orden - b.orden)
      .forEach((b, j) => {
        bloqueDia.push(
          checkpoint(fecha, "EVENTO", b.titulo, j + 1, {
            hora: b.horaInicio,
            horaFin: b.horaFin,
            nota: b.detalle || b.involucrados,
            responsable: b.responsable,
            diaLabel,
          }),
        );
      });
    bloqueDia.push(
      checkpoint(fecha, "EVENTO", "Fin del evento", 99, {
        hora: hd.fin,
        notaEditable: notas.finEvento,
        diaLabel,
        campo: "finEvento",
      }),
    );
    // Offset por día (10 000 c/u) para que los días no se entrecrucen entre sí.
    out.push(...asignarClaves(bloqueDia, RANGO_CATEGORIA.EVENTO + i * 10_000));
  });

  const desmontajeFecha = p.fechaDesmontaje ? fechaISOaDia(p.fechaDesmontaje) : null;
  const desmontajeDiaAparte =
    p.desmontajeDiaAparte === true && !!desmontajeFecha && desmontajeFecha !== dias[dias.length - 1];
  const fechaDesmontaje = desmontajeDiaAparte ? desmontajeFecha! : dias[dias.length - 1];
  const bloqueDesmontaje = [
    checkpoint(fechaDesmontaje, "DESMONTAJE", "Inicio de desmontaje", 0, {
      hora: h.inicioDesmontaje,
      notaEditable: notas.inicioDesmontaje,
      campo: "inicioDesmontaje",
    }),
    checkpoint(fechaDesmontaje, "DESMONTAJE", "Fin de desmontaje (aprox.)", 1, {
      hora: h.finDesmontaje,
      notaEditable: notas.finDesmontaje,
      campo: "finDesmontaje",
    }),
  ];
  out.push(...asignarClaves(bloqueDesmontaje, RANGO_CATEGORIA.DESMONTAJE));

  return out;
}

/** Primer y último día en que el proyecto ocupa la agenda (monta, opera o desmonta). */
export function ventanaProyecto(p: ProyectoCronologia): { inicio: string; fin: string } | null {
  const fechas = checkpointsDeProyecto(p)
    .map((c) => c.fecha)
    .sort();
  if (!fechas.length) return null;
  return { inicio: fechas[0], fin: fechas[fechas.length - 1] };
}

export type ResponsableFuente = {
  personal: { coordinaEnSitio: boolean; tecnico: { nombre: string } | null }[];
  responsables: string | null;
  encargado: { name: string } | null;
};

/** Responsable en sitio → responsable de producción del proyecto → encargado administrativo. */
export function responsableDeProyecto(p: ResponsableFuente): string | null {
  const coordinador = p.personal.find((pp) => pp.coordinaEnSitio && pp.tecnico?.nombre);
  if (coordinador?.tecnico?.nombre) return coordinador.tecnico.nombre;
  if (p.responsables) {
    try {
      const resp = JSON.parse(p.responsables) as { produccion?: { nombre?: string } };
      if (resp.produccion?.nombre) return resp.produccion.nombre;
    } catch {
      /* ignore */
    }
  }
  return p.encargado?.name ?? null;
}

export type ItinerarioEvento = {
  proyectoId: string;
  numeroProyecto: string;
  nombre: string;
  estado: string;
  clienteNombre: string;
  lugarEvento: string | null;
  responsable: string | null;
  notasOperativas: string | null;
  checkpoints: ItinerarioCheckpoint[];
};

/** Un renglón del itinerario: un checkpoint de un evento, ya aplanado para agrupar por fecha. */
export type ItinerarioRenglon = ItinerarioCheckpoint & {
  proyectoId: string;
  numeroProyecto: string;
  nombre: string;
  estado: string;
  clienteNombre: string;
  responsable: string | null;
  notasOperativas: string | null;
};

/** Aplana los eventos a renglones y los deja agrupables/ordenables por fecha. */
export function renglonesDeItinerario(eventos: ItinerarioEvento[]): ItinerarioRenglon[] {
  const renglones = eventos.flatMap((ev) =>
    ev.checkpoints.map((c) => ({
      ...c,
      proyectoId: ev.proyectoId,
      numeroProyecto: ev.numeroProyecto,
      nombre: ev.nombre,
      estado: ev.estado,
      clienteNombre: ev.clienteNombre,
      responsable: ev.responsable,
      notasOperativas: ev.notasOperativas,
    })),
  );
  return renglones.sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.clave - b.clave || a.nombre.localeCompare(b.nombre),
  );
}

/** Los checkpoints de un mismo proyecto en un día, agrupados para mostrarse como una sola tarjeta/bloque. */
export type GrupoEvento = {
  proyectoId: string;
  numeroProyecto: string;
  nombre: string;
  estado: string;
  clienteNombre: string;
  responsable: string | null;
  notasOperativas: string | null;
  checkpoints: ItinerarioRenglon[];
};

/** Agrupa renglones (ya de un solo día) por proyecto, en orden de primera aparición. */
export function agruparPorEvento(renglones: ItinerarioRenglon[]): GrupoEvento[] {
  const mapa = new Map<string, GrupoEvento>();
  const orden: string[] = [];
  renglones.forEach((r) => {
    if (!mapa.has(r.proyectoId)) {
      mapa.set(r.proyectoId, {
        proyectoId: r.proyectoId,
        numeroProyecto: r.numeroProyecto,
        nombre: r.nombre,
        estado: r.estado,
        clienteNombre: r.clienteNombre,
        responsable: r.responsable,
        notasOperativas: r.notasOperativas,
        checkpoints: [],
      });
      orden.push(r.proyectoId);
    }
    mapa.get(r.proyectoId)!.checkpoints.push(r);
  });
  return orden.map((id) => mapa.get(id)!);
}

/** Agrupa renglones por fecha (YYYY-MM-DD), en orden, con sus eventos ya agrupados. */
export function porDia(
  renglones: ItinerarioRenglon[],
): { fecha: string; renglones: ItinerarioRenglon[]; grupos: GrupoEvento[] }[] {
  const mapa = new Map<string, ItinerarioRenglon[]>();
  renglones.forEach((r) => {
    mapa.set(r.fecha, [...(mapa.get(r.fecha) ?? []), r]);
  });
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, renglones]) => ({ fecha, renglones, grupos: agruparPorEvento(renglones) }));
}

/** Paleta tenue (acento + fondo) para diferenciar eventos; se recicla si hay más eventos que colores. */
export const PALETA_EVENTOS: { accent: string; bg: string }[] = [
  { accent: "#B3985B", bg: "#F7F0DE" }, // oro (marca)
  { accent: "#2563EB", bg: "#E4ECFB" }, // azul
  { accent: "#059669", bg: "#DEF2EA" }, // verde
  { accent: "#DB2777", bg: "#FBE4ED" }, // rosa
  { accent: "#7C3AED", bg: "#EBE3FB" }, // violeta
  { accent: "#D97706", bg: "#FBEBD6" }, // ámbar
  { accent: "#0891B2", bg: "#DBF1F5" }, // cian
  { accent: "#DC2626", bg: "#FBE1E1" }, // rojo
];

/** Asigna un color estable por proyecto, en orden de primera aparición en `eventos`. */
export function mapaColoresEventos(
  eventos: { proyectoId: string }[],
): Record<string, { accent: string; bg: string }> {
  const mapa: Record<string, { accent: string; bg: string }> = {};
  let i = 0;
  eventos.forEach((ev) => {
    if (mapa[ev.proyectoId]) return;
    mapa[ev.proyectoId] = PALETA_EVENTOS[i % PALETA_EVENTOS.length];
    i++;
  });
  return mapa;
}
