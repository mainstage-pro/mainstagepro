"use client";

import ModuleTabs from "@/components/ModuleTabs";
import PersonalInternoPage from "../rrhh/personal/page";
import NominaPage from "../rrhh/nomina/page";
import AsistenciaPage from "../rrhh/asistencia/page";
import EvaluacionesPage from "../rrhh/evaluaciones/page";
import SatisfaccionPage from "../rrhh/satisfaccion/page";

export default function PersonalPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "personal", label: "Personal interno", accessKey: "rrhh-personal", content: <PersonalInternoPage /> },
        { key: "nomina", label: "Nómina", accessKey: "rrhh-nomina", content: <NominaPage /> },
        { key: "asistencia", label: "Asistencia", accessKey: "rrhh-asistencia", content: <AsistenciaPage /> },
        { key: "evaluaciones", label: "Evaluaciones", accessKey: "rrhh-evaluaciones", content: <EvaluacionesPage /> },
        { key: "satisfaccion", label: "Satisfacción equipo", accessKey: "rrhh-satisfaccion", content: <SatisfaccionPage /> },
      ]}
    />
  );
}
