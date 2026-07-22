"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { metasTabs } from "./tabs";

export default function MetasLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={metasTabs}>{children}</ModuleTabsLayout>;
}
