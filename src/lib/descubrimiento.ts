// Motor de descubrimiento: ordena y filtra las preguntas por la jerarquía
// general → tipo → nicho, y resuelve las preguntas condicionales (una hija solo
// se muestra cuando su padre fue contestado con el valor esperado). Compartido por
// el DiscoveryForm interno y el wizard público del cliente.

export type PreguntaJerarquia = {
  id: string;
  nichos: string | null;
  alcance?: string | null;
  tipoEventoSlug?: string | null;
  bloque?: string | null;
  preguntaPadreId?: string | null;
  condicionValor?: string | null;
  orden?: number;
};

function jsonArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

// Alcance efectivo con retro-compatibilidad: sin columna 'alcance', una pregunta
// sin nichos es general y con nichos es de nicho (lo que hacía el filtro viejo).
function alcanceDe(q: PreguntaJerarquia): "general" | "tipo" | "nicho" {
  if (q.alcance === "general" || q.alcance === "tipo" || q.alcance === "nicho") return q.alcance;
  return jsonArr(q.nichos).length ? "nicho" : "general";
}

const RANK: Record<string, number> = { general: 0, tipo: 1, nicho: 2 };

function norm(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase();
}

/**
 * Devuelve las preguntas visibles para un contexto, ya ordenadas general→tipo→nicho
 * (generales por bloque A/B/C) y con las hijas condicionales insertadas justo debajo
 * de su padre solo cuando la respuesta del padre coincide con condicionValor.
 *
 * @param tipoEvento token legacy en mayúscula (p. ej. "MUSICAL").
 * @param nichoSlug slug del nicho elegido (o vacío).
 * @param respuestas mapa preguntaId → valor de respuesta actual.
 */
export function preguntasVisibles<T extends PreguntaJerarquia>(
  preguntas: T[],
  tipoEvento: string,
  nichoSlug: string,
  respuestas: Record<string, string>
): T[] {
  const tipoUp = (tipoEvento || "").trim().toUpperCase();

  // 1) Aplicables por alcance (sin resolver aún condicionales).
  const aplicaAlcance = (q: T): boolean => {
    const a = alcanceDe(q);
    if (a === "general") return true;
    if (a === "tipo") return !!q.tipoEventoSlug && q.tipoEventoSlug.trim().toUpperCase() === tipoUp;
    const ns = jsonArr(q.nichos);
    return ns.length === 0 || (!!nichoSlug && ns.includes(nichoSlug));
  };

  const padreContestadoOk = (q: T, porId: Map<string, T>): boolean => {
    if (!q.preguntaPadreId) return true;
    const padre = porId.get(q.preguntaPadreId);
    if (!padre || !aplicaAlcance(padre)) return false;
    const resp = respuestas[q.preguntaPadreId];
    if (!resp) return false;
    // Sin condicionValor, basta con que el padre tenga respuesta afirmativa.
    if (!q.condicionValor) return norm(resp) !== "no" && norm(resp) !== "no estoy seguro";
    return norm(resp) === norm(q.condicionValor);
  };

  const porId = new Map(preguntas.map(q => [q.id, q]));
  const visibles = preguntas.filter(q => aplicaAlcance(q) && padreContestadoOk(q, porId));

  // 2) Orden base: alcance, luego bloque (generales), luego orden.
  const base = [...visibles].sort((x, y) => {
    const ra = RANK[alcanceDe(x)] - RANK[alcanceDe(y)];
    if (ra !== 0) return ra;
    const bx = x.bloque || "", by = y.bloque || "";
    if (bx !== by) return bx < by ? -1 : 1;
    return (x.orden ?? 0) - (y.orden ?? 0);
  });

  // 3) Insertar hijas justo debajo de su padre; las que quedaron sueltas van al final
  //    en su posición natural (ya están en `base`, solo reordenamos las hijas).
  const hijasDe = new Map<string, T[]>();
  const raiz: T[] = [];
  for (const q of base) {
    if (q.preguntaPadreId && porId.has(q.preguntaPadreId)) {
      const arr = hijasDe.get(q.preguntaPadreId) || [];
      arr.push(q);
      hijasDe.set(q.preguntaPadreId, arr);
    } else {
      raiz.push(q);
    }
  }
  const out: T[] = [];
  const empujar = (q: T) => {
    out.push(q);
    for (const h of hijasDe.get(q.id) || []) empujar(h);
  };
  for (const q of raiz) empujar(q);
  return out;
}
