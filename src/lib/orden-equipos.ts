import { DISCIPLINA_LABELS } from "@/lib/disciplinaColors";

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
