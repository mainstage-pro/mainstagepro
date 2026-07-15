"use client";

import ModuleTabs from "@/components/ModuleTabs";
import InventarioActivosPage from "../admin/valuacion/page";
import AnalisisInventarioPage from "../inventario/analisis/page";

export default function ActivosPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "valuacion", label: "Inventario de activos", accessKey: "inventario-activos-admin", adminOnly: true, content: <InventarioActivosPage /> },
        { key: "analisis", label: "Análisis de uso de equipo", accessKey: "inv-analisis", content: <AnalisisInventarioPage /> },
      ]}
    />
  );
}
