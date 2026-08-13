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
  if (t.endsWith("ss")) return t; // "truss", "bass": no estemizar la doble s
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

/** Un objetivo candidato para un término, con su puntaje interno de ranking. */
export interface Candidato {
  objetivoId: string;
  tipoObjetivo: TipoObjetivo;
  termino: string;
  /** Puntaje bruto de ranking (suma IDF + señales). Escala relativa, mayor = mejor. */
  val: number;
  /** Puntaje 0..1 de cadena completa (1 = exacta). */
  score: number;
}

export interface Resolucion {
  entradaTermino: string;
  match: GlosarioRow | null;
  /** Puntaje 0..1 de la mejor coincidencia (1 = exacta). Útil para depurar/UI. */
  score: number;
  /** Mejores objetivos distintos, ordenados desc por `val` (incluye al ganador). */
  candidatos: Candidato[];
  /** true cuando el 2º candidato queda muy cerca del 1º (conviene que el humano elija). */
  ambiguo: boolean;
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
  // Unidades y dimensiones: son calificativos del pedido, no la palabra clave del equipo.
  "metro", "metros", "mt", "mts", "cm", "mm", "altura", "alto", "alta", "ancho",
  "largo", "frente", "fondo", "diametro", "pulgada", "pulgadas", "medida", "medidas",
  "tamano", "aprox",
  // Genéricas del pedido que no identifican equipo.
  "servicio", "tipo",
]);

/** Extrae tokens significativos (sin stopwords), conservando dígitos. */
function tokens(t: string): string[] {
  return normalizarTermino(t)
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Expande un token de modelo separando el prefijo de letras del número:
 * "ekx12p" → ["ekx12p","ekx","12p"]. Así "ekx12p" (junta) casa con "ekx 12p"
 * (separada en el glosario) y el número de modelo puede desambiguar.
 */
function expandir(tok: string): string[] {
  const out = new Set([tok]);
  const m = tok.match(/^([a-z]+)(\d[a-z0-9]*)$/);
  if (m) {
    if (m[1].length >= 2) out.add(m[1]);
    out.add(m[2]);
  }
  return [...out];
}

/**
 * Tokens finales para el match por palabra clave: sin stopwords, singularizados
 * y con los modelos expandidos. Se usa igual para el pedido y para cada término.
 */
function prep(t: string): string[] {
  const out = new Set<string>();
  for (const w of tokens(t)) for (const e of expandir(singular(w))) out.add(e);
  return [...out];
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
  const rowTokens = new Set(prep(row.termino));
  best = Math.max(best, jaccard(entTokens, rowTokens) * 0.9);

  return best;
}

function esNumero(t: string): boolean {
  return /^\d+$/.test(t);
}

/**
 * ¿La frase es lo bastante específica para APRENDERLA como término fijo?
 * Sí cuando tiene ≥2 palabras de contenido o incluye un número de modelo (dígito).
 * Las genéricas de una sola palabra ("bocina", "luz") NO se aprenden para no
 * encasillarlas a un modelo: seguirán mostrando el selector de desambiguación.
 */
export function esFraseEspecifica(frase: string): boolean {
  const norm = normalizarTermino(frase);
  if (/\d/.test(norm)) return true;
  return tokens(norm).length >= 2;
}

/**
 * Resuelve una lista de términos coloquiales contra el glosario cargado.
 *
 * Estrategia por PALABRA CLAVE (la que pidió el usuario): cada palabra significativa
 * del pedido —singularizada— vota por las filas del glosario que la contienen como
 * token. Así "bocinas ev" activa "bocina ev 12p" aunque el término guardado tenga
 * calificativos, y "4 beam" activa "beam 280".
 *
 * Cada palabra vota con un peso IDF (rareza): palabras distintivas como "truss", "beam"
 * o "chauvet" pesan más que términos comunes, y las coincidencias difusas (typos) valen
 * menos que las exactas. Así "trusses de 3 metros de altura" cae en un truss y no en una
 * estructura solo por compartir "metros"/"altura". Ante empate gana el mayor peso.
 *
 * Se exige al menos una palabra de CONTENIDO coincidente (los números por sí solos no
 * bastan) o, en su defecto, una coincidencia fuerte de cadena completa (≥0.55).
 */
export function resolverTerminos(
  terminos: string[],
  glosario: GlosarioRow[]
): Resolucion[] {
  const UMBRAL_CADENA = 0.55;

  // Índice de filas con sus tokens singularizados y modelos expandidos (una sola pasada).
  const filas = glosario.map((row) => {
    const toks = prep(row.termino);
    return { row, toks, set: new Set(toks) };
  });

  // Frecuencia documental por token → IDF: palabras raras pesan más que las comunes.
  const N = filas.length;
  const df = new Map<string, number>();
  for (const f of filas) for (const t of f.set) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t: string) => Math.log((N + 1) / ((df.get(t) ?? 0) + 1)) + 0.5;

  // Margen de ambigüedad: si el 2º objetivo distinto queda al ≥72% del puntaje del
  // 1º, no hay ganador claro y conviene que el humano elija (bandera `ambiguo`).
  const RATIO_AMBIGUO = 0.72;

  return terminos.map((entrada) => {
    const inTokens = prep(entrada).filter((t) => t.length > 1);
    const inSet = new Set(inTokens);

    // Mejor puntaje por OBJETIVO distinto (no por término): así los candidatos son
    // equipos/roles diferentes, no varias formas del mismo objeto.
    const porObjetivo = new Map<string, { row: GlosarioRow; val: number; score: number }>();

    for (const f of filas) {
      // Votos ponderados por IDF: token exacto vale su IDF; difuso (typo) vale menos.
      let peso = 0;
      let matchedContenido = 0;
      for (const it of inTokens) {
        if (f.set.has(it)) {
          peso += idf(it);
          if (!esNumero(it)) matchedContenido++;
          continue;
        }
        if (esNumero(it) || it.length < 4) continue;
        let mejorSim = 0;
        let mejorIdf = 0;
        for (const rt of f.set) {
          if (rt.length < 4) continue;
          const s = similitud(it, rt);
          if (s >= 0.82 && s > mejorSim) {
            mejorSim = s;
            mejorIdf = idf(rt);
          }
        }
        if (mejorSim) {
          peso += mejorIdf * mejorSim * 0.7; // penaliza el match difuso frente al exacto
          matchedContenido++;
        }
      }

      const cadena = puntuar(entrada, inSet, f.row); // señal fina de cadena completa
      const cobertura = inTokens.length ? (matchedContenido / inTokens.length) * 0.5 : 0;

      // Los votos IDF dominan; cadena/cobertura/peso solo afinan el desempate.
      const val = peso + cadena + cobertura + f.row.peso * 0.001;

      const resolvible = matchedContenido >= 1 || cadena >= UMBRAL_CADENA;
      if (!resolvible) continue;
      const prev = porObjetivo.get(f.row.objetivoId);
      if (!prev || val > prev.val) porObjetivo.set(f.row.objetivoId, { row: f.row, val, score: cadena });
    }

    const ordenados = [...porObjetivo.values()].sort((a, b) => b.val - a.val);
    const match = ordenados[0]?.row ?? null;
    const mejorScore = ordenados[0]?.score ?? 0;
    const candidatos: Candidato[] = ordenados.slice(0, 4).map((c) => ({
      objetivoId: c.row.objetivoId,
      tipoObjetivo: c.row.tipoObjetivo,
      termino: c.row.termino,
      val: c.val,
      score: c.score,
    }));
    // Ambiguo solo si el ganador no es una coincidencia exacta/casi-exacta de cadena
    // y hay un segundo objetivo muy cerca en puntaje.
    const ambiguo =
      ordenados.length >= 2 &&
      mejorScore < 0.9 &&
      ordenados[1].val >= ordenados[0].val * RATIO_AMBIGUO;

    return { entradaTermino: entrada, match, score: mejorScore, candidatos, ambiguo };
  });
}
