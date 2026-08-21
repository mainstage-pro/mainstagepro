import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

export const finanzasTabs: ModuleNavTab[] = [
  { href: "/finanzas/cobros-pagos", label: "Cobros y pagos", accessKey: "finanzas-cobros" },
  { href: "/finanzas/flujo-cuentas", label: "Flujo de cuentas", accessKey: "finanzas-flujo" },
  { href: "/finanzas/programacion", label: "Programación semanal", accessKey: "finanzas-cobros" },
  { href: "/finanzas/pagos-personal", label: "Pagos a personal", accessKey: "finanzas-pagos-personal" },
  { href: "/finanzas/movimientos", label: "Movimientos", accessKey: "finanzas-movimientos" },
  { href: "/finanzas/caja-chica", label: "Caja chica", accessKey: "finanzas-caja-chica" },
  { href: "/finanzas/cuentas", label: "Cuentas bancarias", accessKey: "finanzas-movimientos" },
  { href: "/finanzas/pasivos", label: "Pasivos y deudas", accessKey: "finanzas-pasivos", adminOnly: true },
  { href: "/finanzas/repartos", label: "Reparto de utilidades", accessKey: "finanzas-repartos", adminOnly: true },
  { href: "/finanzas/configuracion", label: "Configuración", accessKey: "finanzas-config", adminOnly: true },
];
