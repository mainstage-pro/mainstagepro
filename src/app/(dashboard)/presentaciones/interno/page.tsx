import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_INTERNO } from "@/lib/presentaciones-catalogo";

export default function PresentacionesInternoTab() {
  return <PresentacionesGrupo grupo={{ grupo: "Interno", items: PRESENTACIONES_INTERNO }} />;
}
