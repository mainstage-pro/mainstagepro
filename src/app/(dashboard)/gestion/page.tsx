"use client";

import { Suspense } from "react";
import ModuleTabs from "@/components/ModuleTabs";
import OperacionesPage from "../operaciones/page";
import ProyectosInternosPage from "../proyectos-internos/page";
import { VistaGestionResumen } from "../operaciones/components/VistaGestionResumen";

export default function GestionOperativaPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "tareas", label: "Gestión Operativa", accessKey: "operaciones", content: <Suspense fallback={null}><OperacionesPage /></Suspense> },
        { key: "proyectos", label: "Proyectos internos", accessKey: "proyectos", content: <ProyectosInternosPage /> },
        { key: "resumen", label: "Resumen de gestión", accessKey: "operaciones", content: <div className="h-[calc(100vh-8rem)]"><VistaGestionResumen /></div> },
      ]}
    />
  );
}
