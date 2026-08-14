// Plan de capacitación por puesto.
//
// Cada puesto define qué ÁREAS y SUB-ÁREAS de capacitación le tocan a quien lo
// ocupe, y con qué nivel: OBLIGATORIO (indispensable para el puesto) o
// RECOMENDADO (amplía el conocimiento del área). Las asignaciones se derivan del
// área y la sub-área del puesto, pero pueden ajustarse a mano en el editor.
//
// El puente con el catálogo de capacitación es por nombre/slug (no hay FK):
//   - Puesto.area (código)      → CategoriaCapacitacion.slug   (ver slugsDeArea)
//   - Puesto.subArea.nombre     → SesionCapacitacion.subArea   (string idéntico)
//
// Módulo PURO (sin Prisma) para poder usarse en cliente y servidor.

export type NivelCapacitacion = "OBLIGATORIO" | "RECOMENDADO";

export interface CapAsignacion {
  /** Id de CategoriaCapacitacion (área). */
  categoriaId: string;
  /** Nombre de la sub-área (= SesionCapacitacion.subArea); null = área completa. */
  subArea: string | null;
  nivel: NivelCapacitacion;
}

export const NIVEL_LABEL: Record<NivelCapacitacion, string> = {
  OBLIGATORIO: "Obligatorio",
  RECOMENDADO: "Recomendado",
};

/** Área del puesto (código) → posibles slugs de CategoriaCapacitacion. */
export function slugsDeArea(area?: string | null): string[] {
  if (!area) return [];
  const code = area.toUpperCase();
  // VENTAS se rotula "Comercial"; su categoría puede tener cualquiera de los dos slugs.
  const alias: Record<string, string[]> = { VENTAS: ["ventas", "comercial"] };
  return alias[code] ?? [code.toLowerCase()];
}

/** OBLIGATORIO gana sobre RECOMENDADO al fusionar niveles del mismo destino. */
export function nivelMax(a: NivelCapacitacion | undefined, b: NivelCapacitacion): NivelCapacitacion {
  return a === "OBLIGATORIO" || b === "OBLIGATORIO" ? "OBLIGATORIO" : "RECOMENDADO";
}

function esNivel(v: unknown): v is NivelCapacitacion {
  return v === "OBLIGATORIO" || v === "RECOMENDADO";
}

/** Parse seguro de las asignaciones nuevas (JSON en Puesto.capacitacionAsignaciones). */
export function parseCapAsignaciones(s?: string | null): CapAsignacion[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => x && typeof x.categoriaId === "string" && esNivel(x.nivel))
      .map((x) => ({
        categoriaId: x.categoriaId as string,
        subArea: typeof x.subArea === "string" && x.subArea.trim() ? x.subArea.trim() : null,
        nivel: x.nivel as NivelCapacitacion,
      }));
  } catch {
    return [];
  }
}

function parseLegadoIds(s?: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Asignaciones efectivas del puesto: usa las nuevas; si están vacías, cae al
 * legado `onboardingCapacitaciones` (ids de categoría = área completa, obligatorio).
 */
export function asignacionesEfectivas(
  capacitacionAsignaciones?: string | null,
  onboardingCapacitacionesLegado?: string | null,
): CapAsignacion[] {
  const nuevas = parseCapAsignaciones(capacitacionAsignaciones);
  if (nuevas.length) return nuevas;
  return parseLegadoIds(onboardingCapacitacionesLegado).map((categoriaId) => ({
    categoriaId,
    subArea: null,
    nivel: "OBLIGATORIO" as const,
  }));
}

/** Normaliza un nombre para comparar sub-áreas entre taxonomías (puesto vs capacitación). */
export function normalizaNombre(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deriva la asignación por defecto desde el área + sub-área del puesto:
 *   - con sub-área que EXISTE en la capacitación del área → esa sub-área (OBLIGATORIO);
 *   - sin sub-área, o cuya sub-área no tiene contraparte en capacitación → área completa.
 *
 * El maestro de sub-áreas del puesto (PTSubArea) y el de capacitación
 * (SesionCapacitacion.subArea) se escribieron por separado y sus nombres rara vez
 * coinciden; por eso NUNCA inventamos una sub-área: si no hay match real, se marca
 * el área completa (fiel a "si no tienen sub-área asignada, el área completa").
 * Devuelve [] si no hay categoría de capacitación que corresponda al área.
 */
export function derivarAsignacionesDefault(
  area: string | null | undefined,
  subAreaNombre: string | null | undefined,
  categorias: { id: string; slug: string; subAreas?: string[] }[],
): CapAsignacion[] {
  const slugs = slugsDeArea(area);
  const cat = categorias.find((c) => slugs.includes((c.slug || "").toLowerCase()));
  if (!cat) return [];
  const sub = subAreaNombre?.trim();
  if (sub) {
    const match = (cat.subAreas ?? []).find((x) => normalizaNombre(x) === normalizaNombre(sub));
    if (match) return [{ categoriaId: cat.id, subArea: match, nivel: "OBLIGATORIO" }];
  }
  return [{ categoriaId: cat.id, subArea: null, nivel: "OBLIGATORIO" }];
}

/** Clave estable de una asignación para dedup/toggle en UI. */
export function claveAsignacion(categoriaId: string, subArea: string | null): string {
  return `${categoriaId}::${subArea ?? ""}`;
}
