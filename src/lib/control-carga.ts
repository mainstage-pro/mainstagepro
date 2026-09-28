/**
 * control-carga.ts — Control de Carga del proyecto.
 *
 * Un "pase" es una pasada física de verificación: SALIDA (bodega → evento) o
 * RETORNO (evento → bodega). Los renglones se congelan al abrir el pase: un
 * cambio posterior en el listado del proyecto no debe reescribir lo que alguien
 * ya verificó con el equipo en la mano.
 *
 * El retorno no se arma del listado del proyecto sino de lo que realmente salió,
 * para que la pregunta que contesta sea "¿regresó todo lo que se subió?".
 */

export const TIPOS_PASE = ["SALIDA", "RETORNO"] as const;
export type TipoPase = (typeof TIPOS_PASE)[number];

export const PASE_LABEL: Record<TipoPase, string> = {
  SALIDA: "Salida de bodega",
  RETORNO: "Retorno a bodega",
};

export const PASE_DESCRIPCION: Record<TipoPase, string> = {
  SALIDA: "Marca cada equipo y accesorio conforme sube a la camioneta.",
  RETORNO: "Marca lo que baja de la camioneta. Lo que no aparezca queda como faltante.",
};

/**
 * Cada pase es un lugar del portal, no un estado interno: la salida y el retorno
 * tienen su propia dirección para que la navegación de abajo pueda llevarte
 * directo y el botón de "atrás" del teléfono haga lo que se espera.
 */
export const RUTA_PASE: Record<TipoPase, string> = { SALIDA: "salida", RETORNO: "retorno" };

export function tipoDesdeRuta(segmento: string): TipoPase | null {
  const s = segmento.toLowerCase();
  return s === "salida" ? "SALIDA" : s === "retorno" ? "RETORNO" : null;
}

export const ESTADOS_ITEM = ["PENDIENTE", "OK", "FALTANTE", "DANADO"] as const;
export type EstadoItemCarga = (typeof ESTADOS_ITEM)[number];

export const ESTADO_ITEM_LABEL: Record<string, string> = {
  PENDIENTE: "Sin revisar",
  OK: "Completo",
  FALTANTE: "Faltante",
  DANADO: "Dañado",
};

export type ItemCargaSnapshot = {
  proyectoEquipoId: string | null;
  riderAccesorioId: string | null;
  equipoId: string | null;
  esAccesorio: boolean;
  descripcion: string;
  categoria: string | null;
  cantidadEsperada: number;
  orden: number;
};

/** Forma mínima de ProyectoEquipo que necesita el armado de renglones. */
export type EquipoParaCarga = {
  id: string;
  equipoId: string | null;
  cantidad: number;
  equipo: {
    descripcion: string;
    marca: string | null;
    modelo: string | null;
    categoria: { nombre: string } | null;
  } | null;
  riderAccesorios: { id: string; nombre: string; cantidad: number }[];
};

/** Forma de los renglones ya guardados de un pase, para armar el retorno. */
export type ItemCargaGuardado = {
  proyectoEquipoId: string | null;
  riderAccesorioId: string | null;
  equipoId: string | null;
  esAccesorio: boolean;
  descripcion: string;
  categoria: string | null;
  cantidadVerificada: number;
  estado: string;
  orden: number;
};

export function nombreEquipo(e: EquipoParaCarga["equipo"]): string {
  if (!e) return "Equipo";
  return [e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion;
}

/**
 * Renglones de un pase de SALIDA: todo el equipo del proyecto con sus accesorios,
 * en el orden en que conviene cargarlo (agrupado por categoría).
 */
export function itemsDesdeEquipos(
  equipos: EquipoParaCarga[],
  extras: { descripcion: string; cantidad: number }[] = []
): ItemCargaSnapshot[] {
  const items: ItemCargaSnapshot[] = [];
  let orden = 0;

  for (const pe of equipos) {
    const categoria = pe.equipo?.categoria?.nombre ?? "General";
    items.push({
      proyectoEquipoId: pe.id,
      riderAccesorioId: null,
      equipoId: pe.equipoId,
      esAccesorio: false,
      descripcion: pe.equipo?.descripcion ?? nombreEquipo(pe.equipo),
      categoria,
      cantidadEsperada: pe.cantidad,
      orden: orden++,
    });
    for (const acc of pe.riderAccesorios) {
      items.push({
        proyectoEquipoId: pe.id,
        riderAccesorioId: acc.id,
        equipoId: null,
        esAccesorio: true,
        descripcion: acc.nombre,
        categoria,
        cantidadEsperada: acc.cantidad,
        orden: orden++,
      });
    }
  }

  for (const ex of extras) {
    items.push({
      proyectoEquipoId: null,
      riderAccesorioId: null,
      equipoId: null,
      esAccesorio: false,
      descripcion: ex.descripcion,
      categoria: "Fuera de cotización",
      cantidadEsperada: ex.cantidad || 1,
      orden: orden++,
    });
  }

  return items;
}

/**
 * Renglones de un pase de RETORNO: lo que físicamente salió, sumando las
 * cantidades verificadas de los pases de salida ya cerrados. Lo marcado como
 * faltante en la salida nunca subió, así que no se espera de vuelta.
 */
export function itemsParaRetorno(itemsDeSalidas: ItemCargaGuardado[]): ItemCargaSnapshot[] {
  const acumulado = new Map<string, ItemCargaSnapshot>();

  for (const it of itemsDeSalidas) {
    if (it.estado === "PENDIENTE" || it.estado === "FALTANTE") continue;
    const clave = it.riderAccesorioId ?? it.proyectoEquipoId ?? `libre:${it.descripcion}`;
    const previo = acumulado.get(clave);
    if (previo) {
      previo.cantidadEsperada += it.cantidadVerificada;
      continue;
    }
    acumulado.set(clave, {
      proyectoEquipoId: it.proyectoEquipoId,
      riderAccesorioId: it.riderAccesorioId,
      equipoId: it.equipoId,
      esAccesorio: it.esAccesorio,
      descripcion: it.descripcion,
      categoria: it.categoria,
      cantidadEsperada: it.cantidadVerificada,
      orden: it.orden,
    });
  }

  return [...acumulado.values()]
    .filter((i) => i.cantidadEsperada > 0)
    .sort((a, b) => a.orden - b.orden)
    .map((i, idx) => ({ ...i, orden: idx }));
}

export type AvanceCarga = {
  total: number;
  revisados: number;
  completos: number;
  faltantes: number;
  danados: number;
  pct: number;
};

export function avanceCarga(items: { estado: string }[]): AvanceCarga {
  const total = items.length;
  const completos = items.filter((i) => i.estado === "OK").length;
  const faltantes = items.filter((i) => i.estado === "FALTANTE").length;
  const danados = items.filter((i) => i.estado === "DANADO").length;
  const revisados = completos + faltantes + danados;
  return {
    total,
    revisados,
    completos,
    faltantes,
    danados,
    pct: total === 0 ? 0 : Math.round((revisados / total) * 100),
  };
}

/** Agrupa los renglones por categoría conservando el orden de carga. */
export function agruparPorCategoria<T extends { categoria: string | null; orden: number }>(
  items: T[]
): { categoria: string; items: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const it of [...items].sort((a, b) => a.orden - b.orden)) {
    const cat = it.categoria ?? "General";
    const lista = grupos.get(cat);
    if (lista) lista.push(it);
    else grupos.set(cat, [it]);
  }
  return [...grupos.entries()].map(([categoria, items]) => ({ categoria, items }));
}

/** De qué lado se reporta una falla según el pase en que se detectó. */
export function origenFallaDePase(tipo: string): string {
  return tipo === "SALIDA" ? "BODEGA" : "EVENTO";
}

/** Lo mínimo que necesita el portal para saber en qué punto va la carga. */
export type PaseResumen = { id: string; tipo: string; estado: string };

/**
 * Qué toca hacer ahora con la carga.
 *
 * Nadie en la camioneta debería elegir entre "salida" y "retorno": el orden es
 * el mismo siempre y el sistema ya sabe en cuál va. Esto colapsa esa decisión en
 * un solo botón que dice lo que va a pasar al tocarlo.
 */
export type SiguientePase =
  | { accion: "CONTINUAR"; cargaId: string; tipo: TipoPase; titulo: string; detalle: string }
  | { accion: "ABRIR"; tipo: TipoPase; titulo: string; detalle: string }
  | { accion: "COMPLETO"; titulo: string; detalle: string };

export function siguientePase(pases: PaseResumen[]): SiguientePase {
  // Un pase a medias gana sobre todo lo demás: es trabajo que alguien dejó abierto.
  const enCurso = [...pases].reverse().find((p) => p.estado === "EN_CURSO");
  if (enCurso) {
    const tipo = (enCurso.tipo === "RETORNO" ? "RETORNO" : "SALIDA") as TipoPase;
    return {
      accion: "CONTINUAR",
      cargaId: enCurso.id,
      tipo,
      titulo: tipo === "SALIDA" ? "Seguir cargando la camioneta" : "Seguir revisando el regreso",
      detalle: PASE_DESCRIPCION[tipo],
    };
  }

  const salidas = pases.filter((p) => p.tipo === "SALIDA");
  if (salidas.length === 0) {
    return {
      accion: "ABRIR",
      tipo: "SALIDA",
      titulo: "Empezar la carga",
      detalle: PASE_DESCRIPCION.SALIDA,
    };
  }

  const retornos = pases.filter((p) => p.tipo === "RETORNO");
  if (retornos.length === 0) {
    return {
      accion: "ABRIR",
      tipo: "RETORNO",
      titulo: "Revisar el regreso",
      detalle: PASE_DESCRIPCION.RETORNO,
    };
  }

  return {
    accion: "COMPLETO",
    titulo: "Carga cerrada",
    detalle: "Salida y retorno quedaron registrados. Puedes consultarlos o abrir otro viaje.",
  };
}

/**
 * Qué enseñar al entrar a "Salida" o a "Retorno".
 *
 * Quien llega a una de esas páginas quiere el pase vivo; si ya no hay ninguno
 * abierto, quiere ver el último —cómo quedó— y no una pantalla vacía que le
 * pida abrir otro. Los demás se ofrecen aparte, para los viajes repetidos.
 */
export type PaseListado = { id: string; tipo: string; estado: string; createdAt: string };

export function paseVisible<T extends PaseListado>(
  pases: T[],
  tipo: TipoPase,
  preferido?: string | null
): { activo: T | null; delTipo: T[] } {
  const delTipo = pases
    .filter((p) => p.tipo === tipo)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const elegido =
    (preferido ? delTipo.find((p) => p.id === preferido) : null) ??
    [...delTipo].reverse().find((p) => p.estado === "EN_CURSO") ??
    delTipo[delTipo.length - 1] ??
    null;

  return { activo: elegido, delTipo };
}

/** Resumen de una pasada para el rótulo de la navegación: corto, cabe en 375 px. */
export function estadoCortoDePase(
  pase: { estado: string; avance: { revisados: number; total: number } } | null
): string {
  if (!pase) return "Sin abrir";
  if (pase.estado === "CERRADA") return "Cerrado";
  return `${pase.avance.revisados}/${pase.avance.total}`;
}
