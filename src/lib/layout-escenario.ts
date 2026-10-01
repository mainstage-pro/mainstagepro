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
  x: number;
  y: number;
  anchoM: number;
  largoM: number;
  rot: 0 | 90 | 180 | 270;
  colgado?: boolean;
  /**
   * Peso total de la pieza en kg, congelado al momento de soltarla. No se recalcula:
   * si después cambia el peso del catálogo, el layout guardado no se mueve solo.
   */
  pesoKg?: number;
};

export type LayoutGuardado = { piezas: Pieza[] };

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

/** Tamaño por omisión de una pieza que viene del rider y no tiene medidas propias. */
export const TAMANO_RIDER = { anchoM: 0.8, largoM: 0.6 };

export const SNAP_M = 0.25;

export function snap(v: number) {
  return Math.round(v / SNAP_M) * SNAP_M;
}

export function nuevoIdPieza() {
  return `pz_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Caja de la pieza ya rotada: a 90°/270° se intercambian ancho y fondo. */
export function cajaDe(p: Pieza) {
  const girada = p.rot === 90 || p.rot === 270;
  return { ancho: girada ? p.largoM : p.anchoM, largo: girada ? p.anchoM : p.largoM };
}

export function parsearLayout(raw: string | null | undefined): Pieza[] {
  if (!raw) return [];
  try {
    const d = JSON.parse(raw) as LayoutGuardado | Pieza[];
    const piezas = Array.isArray(d) ? d : d.piezas;
    return Array.isArray(piezas) ? piezas.filter(p => p && typeof p.id === "string") : [];
  } catch {
    return [];
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
