import type { BriefTecnicoData } from "./data";
import { fetchProyectoFacts } from "./from-proyecto";
import { buildDraft } from "./facts";
import { pulirConIA } from "./ia";

// Orquesta el brief de un proyecto real: hechos → draft determinista → pulido IA.
// Cachea por proyectoId (en memoria del proceso) para no re-pegarle a la BD ni a
// la IA en cada story de la misma serie. Devuelve null si el proyecto no existe.
const cache = new Map<string, { data: BriefTecnicoData; ts: number }>();
const TTL_MS = 10 * 60 * 1000;

export async function buildBriefTecnicoData(proyectoId: string): Promise<BriefTecnicoData | null> {
  const hit = cache.get(proyectoId);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data;

  const facts = await fetchProyectoFacts(proyectoId);
  if (!facts) return null;

  const draft = buildDraft(facts);
  const data = await pulirConIA(facts, draft);

  cache.set(proyectoId, { data, ts: Date.now() });
  return data;
}
