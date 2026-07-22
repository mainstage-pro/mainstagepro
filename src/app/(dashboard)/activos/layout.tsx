"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { activosTabs } from "./tabs";

export default function ActivosLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={activosTabs}>{children}</ModuleTabsLayout>;
}
