"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { proyectosTabs } from "./tabs";

export default function ProyectosLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={proyectosTabs}>{children}</ModuleTabsLayout>;
}
