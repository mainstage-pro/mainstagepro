"use client";

import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_MODULO_GENERAL } from "@/lib/presentaciones-catalogo";

export default function PresentacionesGeneralTab() {
  return <PresentacionesGrupo grupo={{ grupo: "General", items: PRESENTACIONES_MODULO_GENERAL }} />;
}
