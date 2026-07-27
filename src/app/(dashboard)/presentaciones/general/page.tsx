"use client";

import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_GENERAL } from "@/lib/presentaciones-catalogo";

export default function PresentacionesGeneralTab() {
  return <PresentacionesGrupo grupo={{ grupo: "General", items: PRESENTACIONES_GENERAL }} />;
}
