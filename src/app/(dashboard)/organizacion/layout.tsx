"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { organizacionTabs } from "./tabs";

export default function OrganizacionLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={organizacionTabs}>{children}</ModuleTabsLayout>;
}
