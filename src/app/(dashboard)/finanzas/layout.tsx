"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { finanzasTabs } from "./tabs";

export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={finanzasTabs}>{children}</ModuleTabsLayout>;
}
