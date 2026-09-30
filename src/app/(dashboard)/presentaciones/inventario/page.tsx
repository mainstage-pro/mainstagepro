"use client";

import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_MODULO_INVENTARIO } from "@/lib/presentaciones-catalogo";

export default function PresentacionesInventarioTab() {
  return <PresentacionesGrupo grupo={{ grupo: "Inventario", items: PRESENTACIONES_MODULO_INVENTARIO }} />;
}
