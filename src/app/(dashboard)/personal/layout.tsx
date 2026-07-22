"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { personalTabs } from "./tabs";

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={personalTabs}>{children}</ModuleTabsLayout>;
}
