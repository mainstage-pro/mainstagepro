"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { coordinacionTabs } from "./tabs";

export default function CoordinacionLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={coordinacionTabs}>{children}</ModuleTabsLayout>;
}
