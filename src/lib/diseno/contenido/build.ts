import { CONTENIDO_MUESTRA, ideaToData, playlistOrdenada, type ContenidoData } from "./data";
import { ideaPorId, poolIdeas } from "./inventario";

// Arma los datos de UNA pieza de contenido. Recibe el id de la idea (param
// `pieza`). Resuelve primero las ideas curadas y luego el inventario real. Si no
// llega o no existe, usa la primera del calendario (pool completo).
export async function buildContenidoData(pieza?: string | null): Promise<ContenidoData> {
  const idea = (await ideaPorId(pieza)) ?? playlistOrdenada(await poolIdeas())[0] ?? null;
  return idea ? ideaToData(idea) : CONTENIDO_MUESTRA;
}
