import ModuleTabsLayout, { type ModuleNavTab } from "@/components/ModuleTabsLayout";

const TABS: ModuleNavTab[] = [
  { href: "/calendarios/eventos", label: "Eventos", accessKey: "calendario" },
  { href: "/calendarios/administrativo", label: "Administrativo", accessKey: "calendario" },
  { href: "/calendarios/comercial", label: "Comercial", accessKey: "calendario" },
  { href: "/calendarios/fechas-especiales", label: "Fechas especiales", accessKey: "calendario" },
  { href: "/calendarios/festividades", label: "Festividades MX", accessKey: "calendario" },
];

export default function CalendariosLayout({ children }: { children: React.ReactNode }) {
  return <ModuleTabsLayout tabs={TABS}>{children}</ModuleTabsLayout>;
}
