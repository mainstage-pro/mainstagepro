"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { gestionTabs } from "./tabs";

export default function GestionLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={gestionTabs}>{children}</ModuleTabsLayout>;
}
