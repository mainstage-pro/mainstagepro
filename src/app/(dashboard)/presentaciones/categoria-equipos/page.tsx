"use client";

import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_CATEGORIAS } from "@/lib/presentaciones-catalogo";

export default function PresentacionesCategoriaEquiposTab() {
  return <PresentacionesGrupo grupo={{ grupo: "Categoría de equipos", items: PRESENTACIONES_CATEGORIAS }} />;
}
