"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { girasTabs } from "./tabs";

export default function GirasLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={girasTabs}>{children}</ModuleTabsLayout>;
}
