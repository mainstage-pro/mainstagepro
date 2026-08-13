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
  /** Puntaje 0..1 de la mejor coincidencia (1 = exacta). Útil para depurar/UI. */
  score: number;
}

/** Distancia de edición (Levenshtein) entre dos cadenas cortas. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Similitud 0..1 basada en Levenshtein normalizado por la longitud mayor. */
function similitud(a: string, b: string): number {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  return 1 - levenshtein(a, b) / max;
}

const STOPWORDS = new Set([
  "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o", "con",
  "sin", "para", "por", "del", "al", "en", "a", "que", "su", "sus", "mi",
]);

/** Extrae tokens significativos (sin stopwords), conservando dígitos. */
function tokens(t: string): string[] {
  return normalizarTermino(t)
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/** Índice de Jaccard entre dos conjuntos de tokens. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Puntúa qué tan bien la entrada del usuario refiere al término del glosario.
 * Combina varias señales amplias y devuelve la mayor (0..1):
 *  - exacto normalizado (1.0) y singular (0.97)
 *  - inclusión de subcadena en cualquier dirección (0.85)
 *  - solape de palabras / Jaccard de tokens (hasta 0.9)
 *  - similitud difusa por Levenshtein para typos (peso 0.8)
 */
function puntuar(entrada: string, entTokens: Set<string>, row: GlosarioRow): number {
  const rowNorm = row.termino; // ya está normalizado al guardarse
  let best = 0;

  for (const cand of variantesLookup(entrada)) {
    if (cand === rowNorm) return 1;
    if (singular(cand) === singular(rowNorm)) best = Math.max(best, 0.97);
    // inclusión de subcadena (evita falsos por 1-2 letras)
    if (cand.length >= 3 && rowNorm.length >= 3) {
      if (rowNorm.includes(cand) || cand.includes(rowNorm)) best = Math.max(best, 0.85);
    }
    best = Math.max(best, similitud(cand, rowNorm) * 0.8);
  }

  // solape de palabras: útil para términos multi-palabra ("cabeza movil beam")
  const rowTokens = new Set(tokens(row.termino));
  best = Math.max(best, jaccard(entTokens, rowTokens) * 0.9);

  return best;
}

/**
 * Resuelve una lista de términos coloquiales contra el glosario cargado.
 * Usa el glosario como referencia AMPLIA: exacto/singular como señales fuertes,
 * más inclusión de subcadena, solape de palabras y similitud difusa (typos).
 * Se acepta el mejor candidato por encima de un umbral moderado; ante empate gana el mayor peso.
 */
export function resolverTerminos(
  terminos: string[],
  glosario: GlosarioRow[]
): Resolucion[] {
  const UMBRAL = 0.55;

  return terminos.map((entrada) => {
    const entTokens = new Set(tokens(entrada));
    let mejor: GlosarioRow | null = null;
    let mejorScore = 0;

    for (const row of glosario) {
      const s = puntuar(entrada, entTokens, row);
      if (s > mejorScore || (s === mejorScore && mejor && row.peso > mejor.peso)) {
        mejorScore = s;
        mejor = row;
      }
    }

    if (mejor && mejorScore >= UMBRAL) {
      return { entradaTermino: entrada, match: mejor, score: mejorScore };
    }
    return { entradaTermino: entrada, match: null, score: mejorScore };
  });
}
