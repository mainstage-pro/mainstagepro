"use client";

import ModuleTabs from "@/components/ModuleTabs";
import CandidatosPage from "../rrhh/candidatos/page";
import PuestosPage from "../rrhh/puestos/page";
import RrhhConfiguracionPage from "../rrhh/configuracion/page";

export default function ReclutamientoPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "candidatos", label: "Candidatos", accessKey: "rrhh-candidatos", content: <CandidatosPage /> },
        { key: "puestos", label: "Puestos ideales", accessKey: "rrhh-puestos", content: <PuestosPage /> },
        { key: "config", label: "Configuración", accessKey: "rrhh-config", content: <RrhhConfiguracionPage /> },
      ]}
    />
  );
}
