"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { contenidoTabs } from "./tabs";

export default function ContenidoLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={contenidoTabs}>{children}</ModuleTabsLayout>;
}
