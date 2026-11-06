import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

export const serviciosGrupoTabs: ModuleNavTab[] = [
  { href: "/admin/servicios-grupo/pro", label: "Pro", adminOnly: true },
  { href: "/admin/servicios-grupo/live", label: "Live", adminOnly: true },
  { href: "/admin/servicios-grupo/creative", label: "Creative", adminOnly: true },
];
