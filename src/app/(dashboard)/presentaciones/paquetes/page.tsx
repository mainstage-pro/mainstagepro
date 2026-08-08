"use client";

import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_PAQUETES } from "@/lib/presentaciones-catalogo";

export default function PresentacionesPaquetesTab() {
  return <PresentacionesGrupo grupo={{ grupo: "Paquetes", items: PRESENTACIONES_PAQUETES }} />;
}
