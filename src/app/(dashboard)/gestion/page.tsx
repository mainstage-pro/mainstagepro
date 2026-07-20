"use client";

import { Suspense } from "react";
import ModuleTabs from "@/components/ModuleTabs";
import CentroOperativoPage from "./resumen/page";
import MiDiaPage from "../plan-trabajo/hoy/page";
import PlanPage from "../plan-trabajo/plan/page";
import RendimientoPage from "../plan-trabajo/rendimiento/page";
import HistorialPage from "../plan-trabajo/historial/page";
import OperacionesPage from "../operaciones/page";
import ProyectosInternosPage from "../proyectos-internos/page";
import BandejaPage from "./bandeja/page";

function PlanTrabajoTabs() {
  return (
    <ModuleTabs
      tabs={[
        { key: "mi-dia", label: "Mi día", accessKey: "plan-trabajo", content: <MiDiaPage /> },
        { key: "plan", label: "Plan", accessKey: "plan-trabajo", content: <PlanPage /> },
        { key: "rendimiento", label: "Rendimiento", accessKey: "plan-trabajo", content: <RendimientoPage /> },
        { key: "historial", label: "Historial", accessKey: "plan-trabajo", content: <Suspense fallback={null}><HistorialPage /></Suspense> },
      ]}
    />
  );
}

export default function GestionOperativaPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "resumen", label: "Centro Operativo", accessKey: "operaciones", content: <CentroOperativoPage /> },
        { key: "plan-trabajo", label: "Plan de trabajo", accessKey: "plan-trabajo", content: <PlanTrabajoTabs /> },
        { key: "tareas", label: "Módulo de tareas", accessKey: "operaciones", content: <Suspense fallback={null}><OperacionesPage /></Suspense> },
        { key: "proyectos", label: "Proyectos internos", accessKey: "proyectos", content: <ProyectosInternosPage /> },
        { key: "bandeja", label: "Bandeja de entrada", accessKey: "operaciones", content: <BandejaPage /> },
      ]}
    />
  );
}
