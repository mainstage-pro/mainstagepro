"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { publicidadTabs } from "./tabs";

export default function PublicidadLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={publicidadTabs}>{children}</ModuleTabsLayout>;
}
