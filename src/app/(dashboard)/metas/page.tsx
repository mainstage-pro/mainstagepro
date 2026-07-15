"use client";

import HubTabs from "@/components/HubTabs";
import ObjetivosPage from "../objetivos/page";
import KpisDashboardPage from "../kpis/page";

const TABS = [
  { key: "objetivos", label: "Objetivos" },
  { key: "kpis", label: "KPIs" },
];

export default function MetasHubPage() {
  return (
    <HubTabs basePath="/metas" defaultVista="objetivos" tabs={TABS}>
      {(active) => (
        <>
          {active === "objetivos" && <ObjetivosPage />}
          {active === "kpis" && <KpisDashboardPage />}
        </>
      )}
    </HubTabs>
  );
}
