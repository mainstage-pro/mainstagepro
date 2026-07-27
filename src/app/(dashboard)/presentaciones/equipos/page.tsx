"use client";

import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_CATEGORIAS } from "@/lib/presentaciones-catalogo";

export default function PresentacionesEquiposTab() {
  return <PresentacionesGrupo grupo={{ grupo: "Equipos", items: PRESENTACIONES_CATEGORIAS }} />;
}
