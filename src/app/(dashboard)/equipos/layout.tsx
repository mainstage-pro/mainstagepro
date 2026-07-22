"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { equiposTabs } from "./tabs";

export default function EquiposLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={equiposTabs}>{children}</ModuleTabsLayout>;
}
