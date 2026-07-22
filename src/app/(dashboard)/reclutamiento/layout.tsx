"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { reclutamientoTabs } from "./tabs";

export default function ReclutamientoLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={reclutamientoTabs}>{children}</ModuleTabsLayout>;
}
