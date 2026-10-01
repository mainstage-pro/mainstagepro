/**
 * Layout cenital de un escenario. Se guarda serializado en
 * `ProyectoEscenario.layout` y solo lo lee el editor: nada del resto del sistema
 * depende de él, así que el formato puede crecer sin romper documentos.
 *
 * Todas las medidas están en metros y el origen (0,0) es la esquina trasera
 * izquierda del escenario visto desde el público.
 */

export type Pieza = {
  id: string;
  tipo: string;
  etiqueta: string;
  /** Si la pieza salió del rider real, el `ProyectoEquipo` del que vino. */
  proyectoEquipoId?: string;
  /** La posición de montaje concreta (PA principal, sidefill…) que esta pieza representa. */
  posicionId?: string;
  /** El `Equipo` de catálogo. Es la llave para que la huella aplique a todo el modelo. */
  equipoId?: string;
  /** Miniatura del catálogo, para dibujar el equipo real en vez de una caja gris. */
  imagenUrl?: string;
  x: number;
  y: number;
  anchoM: number;
  largoM: number;
  /** Grados en sentido del reloj. Libre, no solo múltiplos de 90. */
  rot: number;
  colgado?: boolean;
  /**
   * Peso total de la pieza en kg, congelado al momento de soltarla. No se recalcula:
   * si después cambia el peso del catálogo, el layout guardado no se mueve solo.
   */
  pesoKg?: number;
};

/**
 * Un rectángulo rotulado del plano. Representa una ZONA del evento (escenario,
 * pista, FOH…) o una SUBZONA: la configuración de montaje dentro de esa zona
 * (PA principal, sidefill, tótem…). Las dos salen del rider, pero una vez
 * dibujadas viven en el documento: moverlas no toca el rider.
 */
export type Area = {
  id: string;
  clase: "ZONA" | "SUBZONA";
  /**
   * Llave del grupo del rider que representa, para reencontrar su equipo al abrir
   * el detalle. Las zonas que alguien agregó a mano no corresponden a ningún grupo
   * y la llevan vacía.
   */
  clave: string;
  /** Id de `ZONAS`, `SIN_ZONA`, o `LIBRE_*` para las agregadas a mano. */
  zona: string;
  /** Solo subzonas: la configuración de montaje. */
  funcion?: string;
  etiqueta: string;
  color: string;
  x: number;
  y: number;
  anchoM: number;
  largoM: number;
};

export type LayoutGuardado = { piezas: Pieza[]; areas?: Area[] };

export type ItemPaleta = {
  tipo: string;
  etiqueta: string;
  anchoM: number;
  largoM: number;
  colgado?: boolean;
};

/** Backline genérico: lo que se dibuja aunque no sea equipo nuestro de catálogo. */
export const PALETA_BACKLINE: ItemPaleta[] = [
  { tipo: "TARIMA", etiqueta: "Tarima", anchoM: 2.44, largoM: 1.22 },
  { tipo: "BATERIA", etiqueta: "Batería", anchoM: 2.2, largoM: 2 },
  { tipo: "AMPLI", etiqueta: "Amplificador", anchoM: 0.8, largoM: 0.5 },
  { tipo: "MICRO", etiqueta: "Micrófono", anchoM: 0.4, largoM: 0.4 },
  { tipo: "MONITOR", etiqueta: "Monitor de piso", anchoM: 0.6, largoM: 0.45 },
  { tipo: "TRUSS", etiqueta: "Truss", anchoM: 3, largoM: 0.3, colgado: true },
  { tipo: "FOH", etiqueta: "FOH", anchoM: 2.4, largoM: 1.6 },
  { tipo: "PLANTA", etiqueta: "Planta de luz", anchoM: 0.5, largoM: 0.5 },
  { tipo: "MESA", etiqueta: "Mesa", anchoM: 1.8, largoM: 0.75 },
  { tipo: "PANTALLA", etiqueta: "Pantalla", anchoM: 3, largoM: 0.4 },
];

/** Tamaño por omisión de una pieza del rider cuyo modelo no tiene huella capturada. */
export const TAMANO_RIDER = { anchoM: 0.8, largoM: 0.6 };

export const SNAP_M = 0.25;

export function snap(v: number) {
  return Math.round(v / SNAP_M) * SNAP_M;
}

export function nuevoIdPieza() {
  return `pz_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function nuevoIdArea() {
  return `ar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Caja envolvente de la pieza ya rotada. Con rotación libre la huella real es un
 * rombo; se usa su caja alineada a los ejes porque es lo único que sirve para no
 * dejar que la pieza se salga del escenario.
 */
export function cajaDe(p: Pieza) {
  const rad = (p.rot * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return {
    ancho: p.anchoM * c + p.largoM * s,
    largo: p.anchoM * s + p.largoM * c,
  };
}

export function parsearLayout(raw: string | null | undefined): { piezas: Pieza[]; areas: Area[] } {
  const vacio = { piezas: [] as Pieza[], areas: [] as Area[] };
  if (!raw) return vacio;
  try {
    const d = JSON.parse(raw) as LayoutGuardado | Pieza[];
    const crudas = Array.isArray(d) ? d : d.piezas;
    const piezas = Array.isArray(crudas)
      ? crudas.filter(p => p && typeof p.id === "string").map(p => ({ ...p, rot: Number(p.rot) || 0 }))
      : [];
    const areasCrudas = Array.isArray(d) ? [] : d.areas;
    const areas = Array.isArray(areasCrudas)
      ? areasCrudas.filter(a => a && typeof a.id === "string")
      : [];
    return { piezas, areas };
  } catch {
    return vacio;
  }
}

export function totalesDeLayout(piezas: Pieza[]) {
  let total = 0;
  let colgado = 0;
  for (const p of piezas) {
    const w = p.pesoKg ?? 0;
    total += w;
    if (p.colgado) colgado += w;
  }
  return { total, colgado, piso: total - colgado };
}

/** Cuántas piezas del plano corresponden a una posición de montaje concreta. */
export function colocadasPorPosicion(piezas: Pieza[]) {
  const m = new Map<string, number>();
  for (const p of piezas) {
    if (!p.posicionId) continue;
    m.set(p.posicionId, (m.get(p.posicionId) ?? 0) + 1);
  }
  return m;
}
