"use client";

import { Suspense } from "react";
import ModuleTabs from "@/components/ModuleTabs";
import CentroOperativoPage from "./resumen/page";
import MiDiaPage from "../plan-trabajo/hoy/page";
import OperacionesPage from "../operaciones/page";
import ProyectosInternosPage from "../proyectos-internos/page";
import BandejaPage from "./bandeja/page";

export default function GestionOperativaPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "resumen", label: "Centro Operativo", accessKey: "operaciones", content: <CentroOperativoPage /> },
        { key: "plan-trabajo", label: "Plan de trabajo", accessKey: "plan-trabajo", content: <MiDiaPage /> },
        { key: "tareas", label: "Módulo de tareas", accessKey: "operaciones", content: <Suspense fallback={null}><OperacionesPage /></Suspense> },
        { key: "proyectos", label: "Proyectos internos", accessKey: "proyectos", content: <ProyectosInternosPage /> },
        { key: "bandeja", label: "Bandeja de entrada", accessKey: "operaciones", content: <BandejaPage /> },
      ]}
    />
  );
}
