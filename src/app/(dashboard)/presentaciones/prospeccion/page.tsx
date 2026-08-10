"use client";
import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_PROSPECCION } from "@/lib/presentaciones-catalogo";

export default function PresentacionesProspeccionTab() {
  return <PresentacionesGrupo grupo={{ grupo: "Prospección", items: PRESENTACIONES_PROSPECCION }} />;
}
