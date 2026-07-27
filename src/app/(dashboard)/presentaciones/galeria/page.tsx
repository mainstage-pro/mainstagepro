"use client";

import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_GALERIA } from "@/lib/presentaciones-catalogo";

export default function PresentacionesGaleriaTab() {
  return <PresentacionesGrupo grupo={{ grupo: "Galería", items: PRESENTACIONES_GALERIA }} />;
}
