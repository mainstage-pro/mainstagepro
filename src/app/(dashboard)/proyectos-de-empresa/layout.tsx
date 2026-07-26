"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { proyectosEmpresaTabs } from "./tabs";

export default function ProyectosEmpresaLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={proyectosEmpresaTabs}>{children}</ModuleTabsLayout>;
}
