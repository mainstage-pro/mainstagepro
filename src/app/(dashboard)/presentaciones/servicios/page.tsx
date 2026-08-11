"use client";

import PresentacionesGrupo from "../PresentacionesGrupo";
import { PRESENTACIONES_SERVICIOS } from "@/lib/presentaciones-catalogo";

export default function PresentacionesServiciosTab() {
  return <PresentacionesGrupo grupo={{ grupo: "Servicios", items: PRESENTACIONES_SERVICIOS }} />;
}
