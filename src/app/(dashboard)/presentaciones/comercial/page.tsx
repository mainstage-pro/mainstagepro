import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_COMERCIAL } from "@/lib/presentaciones-catalogo";

export default function PresentacionesComercialTab() {
  return <PresentacionesGrupo grupo={{ grupo: "Comercial", items: PRESENTACIONES_COMERCIAL }} />;
}
