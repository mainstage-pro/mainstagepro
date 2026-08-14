import { CONTENIDO_MUESTRA, getIdea, ideaToData, playlistOrdenada, type ContenidoData } from "./data";

// Arma los datos de UNA pieza de contenido. Recibe el id de la idea (param
// `pieza`). Si no llega o no existe, usa la primera del calendario. Es contenido
// curado en repo: no toca BD, así que es instantáneo y determinista.
export async function buildContenidoData(pieza?: string | null): Promise<ContenidoData> {
  const idea = getIdea(pieza) ?? playlistOrdenada()[0] ?? null;
  return idea ? ideaToData(idea) : CONTENIDO_MUESTRA;
}
