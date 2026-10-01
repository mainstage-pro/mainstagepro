/**
 * Consumo eléctrico del evento, derivado del equipo que ya está en el rider.
 *
 * El catálogo guarda los amperes por unidad. Un equipo que acepta 110 y 220
 * guarda un dato por voltaje, porque a 220 jala la mitad de corriente; cuál de
 * los dos se usa lo decide el proyecto (ProyectoEquipo.voltajeUso), no el catálogo.
 *
 * Los amperes de 110 y de 220 NO se suman entre sí: son dos líneas distintas y
 * cada una se contrata aparte. Lo único que sí es sumable es la potencia (W = A × V),
 * y ese es el número con el que se dimensiona una planta.
 */

export type Voltaje = "110" | "220";

export type EquipoElectrico = {
  amperajeRequerido?: number | null;
  amperajeRequerido220?: number | null;
  voltajeRequerido?: string | null;
};

/** El equipo acepta los dos voltajes, así que alguien tiene que elegir. */
export function aceptaAmbosVoltajes(equipo: EquipoElectrico): boolean {
  return equipo.voltajeRequerido === "AMBOS";
}

/** A qué voltaje se conecta: el del catálogo, o el elegido para el evento si acepta ambos. */
export function voltajeEfectivo(equipo: EquipoElectrico, voltajeUso?: string | null): Voltaje {
  if (aceptaAmbosVoltajes(equipo)) return voltajeUso === "220" ? "220" : "110";
  return equipo.voltajeRequerido === "220" ? "220" : "110";
}

/** Amperes por unidad al voltaje que se va a usar. null = nadie lo ha capturado. */
export function amperajeUnitario(equipo: EquipoElectrico, voltajeUso?: string | null): number | null {
  if (aceptaAmbosVoltajes(equipo) && voltajeEfectivo(equipo, voltajeUso) === "220") {
    return equipo.amperajeRequerido220 ?? null;
  }
  return equipo.amperajeRequerido ?? null;
}

export type ItemConsumo = {
  id: string;
  equipoId: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  voltajeUso?: string | null;
  equipo: EquipoElectrico;
};

export type FilaConsumo = {
  id: string;
  equipoId: string;
  nombre: string;
  cantidad: number;
  voltaje: Voltaje;
  aceptaAmbos: boolean;
  amperajeUnitario: number | null;
  amperajeTotal: number;
  watts: number;
};

export type Carga = { amperaje110: number; amperaje220: number; watts: number; sinDato: number };

export type GrupoConsumo = Carga & { categoria: string; filas: FilaConsumo[] };

const CARGA_CERO: Carga = { amperaje110: 0, amperaje220: 0, watts: 0, sinDato: 0 };

function fila(item: ItemConsumo): FilaConsumo {
  const voltaje = voltajeEfectivo(item.equipo, item.voltajeUso);
  const unitario = amperajeUnitario(item.equipo, item.voltajeUso);
  const amperajeTotal = (unitario ?? 0) * item.cantidad;
  return {
    id: item.id,
    equipoId: item.equipoId,
    nombre: item.nombre,
    cantidad: item.cantidad,
    voltaje,
    aceptaAmbos: aceptaAmbosVoltajes(item.equipo),
    amperajeUnitario: unitario,
    amperajeTotal,
    watts: amperajeTotal * Number(voltaje),
  };
}

function acumular(carga: Carga, f: FilaConsumo): void {
  if (f.amperajeUnitario == null) {
    carga.sinDato += f.cantidad;
    return;
  }
  if (f.voltaje === "220") carga.amperaje220 += f.amperajeTotal;
  else carga.amperaje110 += f.amperajeTotal;
  carga.watts += f.watts;
}

/** Consumo agrupado por categoría de equipo, en el orden en que llegan los items. */
export function consumoPorCategoria(items: ItemConsumo[]): GrupoConsumo[] {
  const grupos = new Map<string, GrupoConsumo>();
  for (const item of items) {
    const categoria = item.categoria || "Sin categoría";
    if (!grupos.has(categoria)) grupos.set(categoria, { categoria, filas: [], ...CARGA_CERO });
    const grupo = grupos.get(categoria)!;
    const f = fila(item);
    grupo.filas.push(f);
    acumular(grupo, f);
  }
  return [...grupos.values()];
}

export function cargaTotal(grupos: GrupoConsumo[]): Carga {
  return grupos.reduce(
    (acc, g) => ({
      amperaje110: acc.amperaje110 + g.amperaje110,
      amperaje220: acc.amperaje220 + g.amperaje220,
      watts: acc.watts + g.watts,
      sinDato: acc.sinDato + g.sinDato,
    }),
    { ...CARGA_CERO },
  );
}
