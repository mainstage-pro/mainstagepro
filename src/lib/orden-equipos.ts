import { DISCIPLINA_LABELS, DISCIPLINAS, type Disciplina } from "@/lib/disciplinaColors";
import { rangoParticipacion } from "@/lib/ciclo-pago";

/**
 * Orden único para listas de equipo de un proyecto (pantalla y PDFs):
 * disciplina → categoría → equipo, siguiendo el orden de categorías del
 * inventario (`CategoriaEquipo.orden`).
 *
 * La disciplina se ordena por la primera categoría suya en el inventario, así
 * que reordenar categorías en el inventario reordena también las secciones.
 */
export interface ClaveOrdenEquipo {
  categoria: string | null | undefined;
  orden?: number | null;
  disciplina?: string | null;
  descripcion?: string | null;
}

export interface GrupoCategoriaEquipo<T> {
  categoria: string;
  disciplina: string | null;
  items: T[];
  /** true en el primer grupo de cada disciplina: ahí va su encabezado. */
  abreDisciplina: boolean;
}

const SIN_ORDEN = 9999;

export function etiquetaDisciplina(d: string | null | undefined): string {
  return (d && DISCIPLINA_LABELS[d]) || "Otros";
}

export function agruparEquiposDisciplinaCategoria<T>(
  items: T[],
  clave: (t: T) => ClaveOrdenEquipo,
  sinCategoria = "Sin categoría",
): GrupoCategoriaEquipo<T>[] {
  type Acc = { categoria: string; disciplina: string | null; orden: number; items: { t: T; desc: string }[] };
  const porCat = new Map<string, Acc>();
  for (const t of items) {
    const k = clave(t);
    const cat = k.categoria || sinCategoria;
    let g = porCat.get(cat);
    if (!g) {
      g = { categoria: cat, disciplina: k.disciplina ?? null, orden: k.orden ?? SIN_ORDEN, items: [] };
      porCat.set(cat, g);
    }
    g.items.push({ t, desc: (k.descripcion ?? "").toLowerCase() });
  }

  // Rango de cada disciplina = la categoría suya que va primero en el inventario.
  const rangoDisc = new Map<string, number>();
  for (const g of porCat.values()) {
    const d = g.disciplina ?? "";
    rangoDisc.set(d, Math.min(rangoDisc.get(d) ?? SIN_ORDEN, g.orden));
  }
  const rango = (d: string | null) => (d ? rangoDisc.get(d) ?? SIN_ORDEN : SIN_ORDEN + 1); // "Otros" al final

  const grupos = Array.from(porCat.values()).sort((a, b) =>
    rango(a.disciplina) - rango(b.disciplina)
    || (a.disciplina ?? "").localeCompare(b.disciplina ?? "")
    || a.orden - b.orden
    || a.categoria.localeCompare(b.categoria, "es"),
  );

  let previa: string | null | undefined = undefined;
  return grupos.map(g => {
    const abre = g.disciplina !== previa;
    previa = g.disciplina;
    return {
      categoria: g.categoria,
      disciplina: g.disciplina,
      abreDisciplina: abre,
      items: g.items
        .slice()
        .sort((a, b) => a.desc.localeCompare(b.desc, "es"))
        .map(x => x.t),
    };
  });
}

/**
 * Rango de cada disciplina según el inventario: la posición de su primera
 * categoría. Sirve para ordenar lo que no es equipo (personal) igual que el
 * equipo. Disciplinas sin categoría caen después, en el orden del catálogo.
 */
export function rangoDisciplinas(
  categorias: { orden?: number | null; disciplina?: string | null }[],
): (d: string | null | undefined) => number {
  const min = new Map<string, number>();
  for (const c of categorias) {
    if (!c.disciplina) continue;
    min.set(c.disciplina, Math.min(min.get(c.disciplina) ?? SIN_ORDEN, c.orden ?? SIN_ORDEN));
  }
  const orden = [...DISCIPLINAS].sort((a, b) =>
    (min.get(a) ?? SIN_ORDEN) - (min.get(b) ?? SIN_ORDEN) || DISCIPLINAS.indexOf(a) - DISCIPLINAS.indexOf(b));
  return d => {
    const i = d ? orden.indexOf(d as Disciplina) : -1;
    return i < 0 ? orden.length : i; // sin disciplina → al final
  };
}

/** Agrupa cualquier lista por disciplina, ya en orden de inventario. */
export function agruparPorDisciplina<T>(
  items: T[],
  disciplina: (t: T) => string | null | undefined,
  rango: (d: string | null | undefined) => number,
): { disciplina: string | null; items: T[] }[] {
  const map = new Map<string | null, T[]>();
  for (const t of items) {
    const d = disciplina(t) ?? null;
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(t);
  }
  return [...map.entries()]
    .sort((a, b) => rango(a[0]) - rango(b[0]))
    .map(([d, its]) => ({ disciplina: d, items: its }));
}

/**
 * Personal en secciones jornada → disciplina: montaje, operación y desmontaje
 * primero; dentro de cada jornada las disciplinas en orden de inventario y las
 * personas por nombre. `abreJornada` marca la primera sección de cada jornada.
 */
export function seccionesPersonal<T extends { participacion: string | null; disciplina?: string | null; nombre: string }>(
  items: T[],
  rango: (d: string | null | undefined) => number,
): { participacion: string; disciplina: string | null; abreJornada: boolean; items: T[] }[] {
  const porPart = new Map<string, T[]>();
  for (const t of items) {
    const k = t.participacion ?? "OPERACION";
    if (!porPart.has(k)) porPart.set(k, []);
    porPart.get(k)!.push(t);
  }
  return [...porPart.entries()]
    .sort((a, b) => rangoParticipacion(a[0]) - rangoParticipacion(b[0]))
    .flatMap(([part, delPart]) =>
      agruparPorDisciplina(delPart, t => t.disciplina, rango).map((g, i) => ({
        participacion: part,
        disciplina: g.disciplina,
        abreJornada: i === 0,
        items: [...g.items].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      })));
}
