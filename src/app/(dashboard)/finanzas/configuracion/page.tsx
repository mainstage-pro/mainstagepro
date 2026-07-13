import ConfigHub from "@/components/ConfigHub";

export default function FinanzasConfiguracionPage() {
  return (
    <ConfigHub
      title="Configuración · Finanzas"
      subtitle="Catálogos y parámetros base que alimentan movimientos, flujo de efectivo y reportes"
      groups={[
        {
          items: [
            { label: "Categorías", description: "Categorías de ingresos, gastos, transferencias, inversión y retiro", href: "/finanzas/categorias" },
            { label: "Cuentas bancarias", description: "Maestro de cuentas propias y saldos iniciales", href: "/finanzas/cuentas" },
          ],
        },
        {
          title: "Parámetros globales",
          items: [
            { label: "IVA, descuentos y alertas", description: "Tasas, umbrales y días de alerta en Configuración general", href: "/admin/configuracion" },
          ],
        },
      ]}
    />
  );
}
