"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { serviciosGrupoTabs } from "./tabs";

export default function ServiciosGrupoLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={serviciosGrupoTabs}>{children}</ModuleTabsLayout>;
}
