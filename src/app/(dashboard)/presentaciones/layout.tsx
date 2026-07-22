"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { presentacionesTabs } from "./tabs";

export default function PresentacionesLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={presentacionesTabs}>{children}</ModuleTabsLayout>;
}
