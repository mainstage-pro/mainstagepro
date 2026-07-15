"use client";

import ModuleTabs from "@/components/ModuleTabs";
import CapacitacionPage from "../capacitacion/page";
import CapacitacionesPage from "../rrhh/capacitaciones/page";

export default function FormacionPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "portal", label: "Portal de capacitación", accessKey: "capacitacion", content: <CapacitacionPage /> },
        { key: "internas", label: "Capacitaciones internas", accessKey: "rrhh-capacitaciones", content: <CapacitacionesPage /> },
      ]}
    />
  );
}
