import { prisma } from "@/lib/prisma";
import { ensureGlosarioTabla } from "@/lib/migraciones-lazy";

export type TipoObjetivo = "EQUIPO" | "ACCESORIO" | "ROL_TECNICO";

export interface GlosarioRow {
  id: string;
  termino: string;
  original: string;
  tipoObjetivo: TipoObjetivo;
  objetivoId: string;
  peso: number;
  fuente: string;
  activo: boolean;
}

/**
 * Normaliza un término coloquial a su forma canónica de búsqueda:
 * minúsculas, sin acentos/diéresis, sin signos, espacios colapsados.
 * NO singulariza (eso lo hace `variantesLookup`), para preservar el término tal cual.
 */
export function normalizarTermino(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // signos → espacio
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Singular aproximado en español para el fallback de búsqueda.
 * "bocinas"→"bocina", "bajos"→"bajo", "beams"→"beam", "luces"→"luz" (aprox "luce").
 * Es heurístico: solo se usa como candidato adicional, nunca como término almacenado.
 */
function singular(t: string): string {
  if (t.length <= 3) return t;
  if (t.endsWith("es")) return t.slice(0, -2);
  if (t.endsWith("s")) return t.slice(0, -1);
  return t;
}

/**
 * Genera los candidatos de búsqueda para un término, en orden de preferencia:
 * exacto normalizado, luego su singular. Sin duplicados.
 */
export function variantesLookup(texto: string): string[] {
  const base = normalizarTermino(texto);
  const cands = [base, singular(base)];
  return [...new Set(cands.filter(Boolean))];
}

/** Carga todo el glosario activo en memoria (tablas de pocos miles de filas). */
export async function cargarGlosario(): Promise<GlosarioRow[]> {
  await ensureGlosarioTabla();
  const rows = await prisma.$queryRawUnsafe<GlosarioRow[]>(
    `SELECT id, termino, original, "tipoObjetivo", "objetivoId", peso, fuente, activo
       FROM glosario_terminos WHERE activo = true`
  );
  return rows;
}

export interface Resolucion {
  entradaTermino: string;
  match: GlosarioRow | null;
}

/**
 * Resuelve una lista de términos coloquiales contra el glosario cargado.
 * Para cada término prueba: exacto normalizado → singular. Ante empate gana el mayor peso.
 */
export function resolverTerminos(
  terminos: string[],
  glosario: GlosarioRow[]
): Resolucion[] {
  const index = new Map<string, GlosarioRow>();
  for (const row of glosario) {
    const prev = index.get(row.termino);
    if (!prev || row.peso > prev.peso) index.set(row.termino, row);
  }

  return terminos.map((entrada) => {
    for (const cand of variantesLookup(entrada)) {
      const hit = index.get(cand);
      if (hit) return { entradaTermino: entrada, match: hit };
    }
    return { entradaTermino: entrada, match: null };
  });
}
