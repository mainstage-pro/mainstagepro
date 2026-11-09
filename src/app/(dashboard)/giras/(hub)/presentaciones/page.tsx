"use client";

import PresentacionesGrupo from "@/app/(dashboard)/presentaciones/PresentacionesGrupo";
import { PRESENTACION_LIVE } from "@/lib/presentaciones-catalogo";

export default function GirasPresentacionesPage() {
  return <PresentacionesGrupo grupo={{ grupo: "Mainstage Live", items: [PRESENTACION_LIVE] }} />;
}
