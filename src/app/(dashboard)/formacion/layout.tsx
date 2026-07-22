"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { formacionTabs } from "./tabs";

export default function FormacionLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={formacionTabs}>{children}</ModuleTabsLayout>;
}
