"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { directorioTabs } from "./tabs";

export default function DirectorioLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={directorioTabs}>{children}</ModuleTabsLayout>;
}
