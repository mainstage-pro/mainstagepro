"use client";

import ModuleTabsLayout from "@/components/ModuleTabsLayout";
import { creativeTabs } from "./tabs";

export default function CreativeLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={creativeTabs}>{children}</ModuleTabsLayout>;
}
