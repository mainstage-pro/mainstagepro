"use client";

import PresentacionesGrupo from "@/app/(dashboard)/presentaciones/PresentacionesGrupo";
import { PRESENTACION_CREATIVE } from "@/lib/presentaciones-catalogo";

export default function CreativePresentacionesPage() {
  return <PresentacionesGrupo grupo={{ grupo: "Mainstage Creative", items: [PRESENTACION_CREATIVE] }} />;
}
