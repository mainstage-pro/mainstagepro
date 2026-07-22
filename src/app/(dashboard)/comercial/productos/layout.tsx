"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { comercialProductosTabs } from "./tabs";

export default function ComercialProductosLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={comercialProductosTabs}>{children}</ModuleTabsLayout>;
}
