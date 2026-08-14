import { CAMPANA_MUESTRA, briefToData, decodeBrief, type CampanaData } from "./data";

// El creativo de campaña se arma del brief que viaja en la URL (base64). Sin brief
// se usa la muestra. No toca BD: el brief lo captura el usuario en el formulario.
export async function buildCampanaData(brief?: string | null): Promise<CampanaData> {
  const b = decodeBrief(brief);
  return b ? briefToData(b) : CAMPANA_MUESTRA;
}
