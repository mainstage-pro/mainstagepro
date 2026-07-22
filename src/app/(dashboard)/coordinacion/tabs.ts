import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

export const coordinacionTabs: ModuleNavTab[] = [
  { href: "/coordinacion/juntas", label: "Juntas", accessKey: "juntas" },
  { href: "/coordinacion/vision-semanal", label: "Visión semanal", accessKey: "vision-semanal" },
  { href: "/coordinacion/formularios", label: "Formularios", accessKey: "formularios", adminOnly: true },
];
