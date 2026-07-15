"use client";

import ModuleTabs from "@/components/ModuleTabs";
import CobrosPagosPage from "./cobros-pagos/page";
import PagosPersonalPage from "./pagos-personal/page";
import MovimientosPage from "./movimientos/page";
import CajaChicaPage from "./caja-chica/page";
import CuentasPage from "./cuentas/page";
import PasivosPage from "./pasivos/page";
import RepartosPage from "./repartos/page";
import ConfiguracionPage from "./configuracion/page";

export default function FinanzasPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "cobros", label: "Cobros y pagos", accessKey: "finanzas-cobros", content: <CobrosPagosPage view="cobros" /> },
        { key: "programacion", label: "Programación semanal", accessKey: "finanzas-cobros", content: <CobrosPagosPage view="programacion" /> },
        { key: "pagos-personal", label: "Pagos a personal", accessKey: "finanzas-pagos-personal", content: <PagosPersonalPage /> },
        { key: "movimientos", label: "Movimientos", accessKey: "finanzas-movimientos", content: <MovimientosPage /> },
        { key: "caja-chica", label: "Caja chica", accessKey: "finanzas-caja-chica", content: <CajaChicaPage /> },
        { key: "cuentas", label: "Cuentas bancarias", accessKey: "finanzas-movimientos", content: <CuentasPage /> },
        { key: "pasivos", label: "Pasivos y deudas", accessKey: "finanzas-pasivos", adminOnly: true, content: <PasivosPage /> },
        { key: "repartos", label: "Reparto de utilidades", accessKey: "finanzas-repartos", adminOnly: true, content: <RepartosPage /> },
        { key: "config", label: "Configuración", accessKey: "finanzas-config", adminOnly: true, content: <ConfiguracionPage /> },
      ]}
    />
  );
}
