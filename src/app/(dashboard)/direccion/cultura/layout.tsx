"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { culturaTabs } from "./tabs";

export default function CulturaLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={culturaTabs}>{children}</ModuleTabsLayout>;
}
