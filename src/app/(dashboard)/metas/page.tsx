"use client";

import ModuleTabs from "@/components/ModuleTabs";
import ObjetivosPage from "../objetivos/page";
import KpisDashboardPage from "../kpis/page";

export default function MetasPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "objetivos", label: "Objetivos", content: <ObjetivosPage /> },
        { key: "kpis", label: "KPIs", content: <KpisDashboardPage /> },
      ]}
    />
  );
}
