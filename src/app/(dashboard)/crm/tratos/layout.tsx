"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { tratosTabs } from "./tabs";

export default function TratosLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={tratosTabs}>{children}</ModuleTabsLayout>;
}
