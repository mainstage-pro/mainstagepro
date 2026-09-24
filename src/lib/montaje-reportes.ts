/**
 * Reportes derivados del plan de montaje.
 *
 * Todo sale de las posiciones que el coordinador ya capturó: nadie vuelve a
 * teclear nada. De ahí salen el plan por disciplina, el requerimiento eléctrico
 * por zona, el resumen de rigging y el orden de carga.
 */

import { getEquipoDisplayName } from "./equipoNombre";
import { labelConfiguracion, labelSoporte, labelZona, ordenDisciplina, ordenZona, soporteEsRigging } from "./montaje-vocabulario";

export type EquipoConPosiciones = {
  tipo?: string;
  cantidad: number;
  equipo: {
    descripcion: string | null;
    marca: string | null;
    modelo: string | null;
    amperajeRequerido?: number | null;
    voltajeRequerido?: string | null;
    categoria: { nombre: string; disciplina?: string | null } | null;
  };
  posiciones?: {
    cantidad: number;
    funcion: string | null;
    soporte: string | null;
    zona: string | null;
    alturaM: number | null;
    notas: string | null;
  }[];
};

export type PosicionResumible = {
  cantidad: number;
  funcion: string | null;
  soporte: string | null;
  zona: string | null;
  alturaM: number | null;
};

/**
 * Una línea de texto con el montaje de un equipo, para incrustarla en los
 * documentos que ya listan equipos sin convertirlos en un plano técnico:
 * "2 PA principal · Tripié · Escenario   ·   4 Monitor de piso · Piso · Escenario"
 */
export function resumenMontaje(
  posiciones: PosicionResumible[] | null | undefined,
  categoria?: string | null,
  disciplina?: string | null,
): string {
  if (!posiciones?.length) return "";
  return posiciones
    .map((p) => {
      const partes = [
        labelConfiguracion(p.funcion, categoria, disciplina),
        labelSoporte(p.soporte, categoria, disciplina),
        labelZona(p.zona),
        p.alturaM ? `${p.alturaM} m` : "",
      ].filter(Boolean);
      return partes.length ? `${p.cantidad} ${partes.join(" · ")}` : "";
    })
    .filter(Boolean)
    .join("   ·   ");
}

export type PosicionPlana = {
  nombre: string;
  categoria: string;
  disciplina: string;
  cantidad: number;
  configuracion: string;
  soporte: string;
  zona: string;
  alturaM: number | null;
  notas: string | null;
  amperajeUnitario: number;
  voltaje: string;
  esRigging: boolean;
};

export function aplanarPosiciones(equipos: EquipoConPosiciones[]): PosicionPlana[] {
  const filas: PosicionPlana[] = [];
  for (const e of equipos) {
    const categoria = e.equipo.categoria?.nombre ?? "Sin categoría";
    const disciplina = e.equipo.categoria?.disciplina ?? "PRODUCCION";
    for (const p of e.posiciones ?? []) {
      filas.push({
        nombre: getEquipoDisplayName(e.equipo),
        categoria,
        disciplina,
        cantidad: p.cantidad,
        configuracion: labelConfiguracion(p.funcion, categoria, disciplina),
        soporte: labelSoporte(p.soporte, categoria, disciplina),
        zona: labelZona(p.zona) || "Sin zona",
        alturaM: p.alturaM,
        notas: p.notas,
        amperajeUnitario: e.equipo.amperajeRequerido ?? 0,
        voltaje: e.equipo.voltajeRequerido ?? "110",
        esRigging: soporteEsRigging(p.soporte, categoria, disciplina),
      });
    }
  }
  return filas;
}

// ─────────────────────────────────────────────────────────────────────────────

export type GrupoDisciplina = { disciplina: string; zonas: { zona: string; posiciones: PosicionPlana[] }[] };

/** Plan de montaje: disciplina → zona → posiciones, en orden real de montaje. */
export function planPorDisciplina(filas: PosicionPlana[]): GrupoDisciplina[] {
  const porDisc = new Map<string, Map<string, PosicionPlana[]>>();
  for (const f of filas) {
    if (!porDisc.has(f.disciplina)) porDisc.set(f.disciplina, new Map());
    const zonas = porDisc.get(f.disciplina)!;
    if (!zonas.has(f.zona)) zonas.set(f.zona, []);
    zonas.get(f.zona)!.push(f);
  }

  return [...porDisc.entries()]
    .sort((a, b) => ordenDisciplina(a[0]) - ordenDisciplina(b[0]))
    .map(([disciplina, zonas]) => ({
      disciplina,
      zonas: [...zonas.entries()]
        .sort((a, b) => ordenZona(a[0]) - ordenZona(b[0]))
        .map(([zona, posiciones]) => ({ zona, posiciones })),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────

export type CargaZona = { zona: string; amperaje110: number; amperaje220: number; total: number; sinDato: number };

/**
 * Requerimiento eléctrico por zona. Suma amperaje × cantidad de cada posición.
 * `sinDato` cuenta las piezas cuyo equipo no tiene amperaje capturado — sirve
 * para saber qué tan confiable es el número antes de negociar con el venue.
 */
export function cargaElectricaPorZona(filas: PosicionPlana[]): CargaZona[] {
  const mapa = new Map<string, CargaZona>();
  for (const f of filas) {
    if (!mapa.has(f.zona)) mapa.set(f.zona, { zona: f.zona, amperaje110: 0, amperaje220: 0, total: 0, sinDato: 0 });
    const z = mapa.get(f.zona)!;
    if (!f.amperajeUnitario) {
      z.sinDato += f.cantidad;
      continue;
    }
    const carga = f.amperajeUnitario * f.cantidad;
    if (f.voltaje === "220") z.amperaje220 += carga;
    else z.amperaje110 += carga;
    z.total += carga;
  }
  return [...mapa.values()].sort((a, b) => ordenZona(a.zona) - ordenZona(b.zona));
}

export function cargaElectricaTotal(zonas: CargaZona[]) {
  return zonas.reduce(
    (acc, z) => ({
      amperaje110: acc.amperaje110 + z.amperaje110,
      amperaje220: acc.amperaje220 + z.amperaje220,
      total: acc.total + z.total,
      sinDato: acc.sinDato + z.sinDato,
    }),
    { amperaje110: 0, amperaje220: 0, total: 0, sinDato: 0 },
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export type PuntoRigging = { zona: string; nombre: string; cantidad: number; soporte: string; alturaM: number | null };

/** Todo lo que cuelga: el dato que evita sorpresas al llegar al venue. */
export function resumenRigging(filas: PosicionPlana[]): PuntoRigging[] {
  return filas
    .filter((f) => f.esRigging)
    .map((f) => ({ zona: f.zona, nombre: f.nombre, cantidad: f.cantidad, soporte: f.soporte, alturaM: f.alturaM }))
    .sort((a, b) => ordenZona(a.zona) - ordenZona(b.zona));
}

// ─────────────────────────────────────────────────────────────────────────────

export type BloqueCarga = { disciplina: string; items: { nombre: string; cantidad: number; destinos: string }[] };

/**
 * Orden de carga: lo que se monta primero se sube al camión al último, así que
 * el camión se carga en orden inverso al montaje.
 */
export function ordenDeCarga(equipos: EquipoConPosiciones[]): BloqueCarga[] {
  const porDisc = new Map<string, Map<string, { nombre: string; cantidad: number; zonas: Set<string> }>>();

  for (const e of equipos) {
    const disciplina = e.equipo.categoria?.disciplina ?? "PRODUCCION";
    const nombre = getEquipoDisplayName(e.equipo);
    if (!porDisc.has(disciplina)) porDisc.set(disciplina, new Map());
    const items = porDisc.get(disciplina)!;
    if (!items.has(nombre)) items.set(nombre, { nombre, cantidad: 0, zonas: new Set() });
    const item = items.get(nombre)!;
    item.cantidad += e.cantidad;
    for (const p of e.posiciones ?? []) {
      const z = labelZona(p.zona);
      if (z) item.zonas.add(z);
    }
  }

  return [...porDisc.entries()]
    .sort((a, b) => ordenDisciplina(b[0]) - ordenDisciplina(a[0]))
    .map(([disciplina, items]) => ({
      disciplina,
      items: [...items.values()]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, destinos: [...i.zonas].join(", ") })),
    }));
}
