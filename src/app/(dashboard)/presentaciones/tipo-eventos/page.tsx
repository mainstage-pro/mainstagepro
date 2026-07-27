"use client";

import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_EVENTOS } from "@/lib/presentaciones-catalogo";

export default function PresentacionesTipoEventosTab() {
  return <PresentacionesGrupo grupo={{ grupo: "Tipo de eventos", items: PRESENTACIONES_EVENTOS }} />;
}
