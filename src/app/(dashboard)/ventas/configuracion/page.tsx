import ConfigHub from "@/components/ConfigHub";

export default function VentasConfiguracionPage() {
  return (
    <ConfigHub
      title="Configuración · Comercial"
      subtitle="Comisiones, vendedores y plantillas que alimentan el cotizador y los reportes de venta"
      groups={[
        {
          title: "Comisiones y equipo de ventas",
          items: [
            { label: "Comisiones y metas", description: "Porcentajes por origen, ramp-up y meta diaria de prospección", href: "/ventas/config" },
            { label: "Vendedores", description: "Alta de vendedores y fecha de inicio para ramp-up", href: "/ventas/vendedores" },
          ],
        },
        {
          title: "Catálogos comerciales",
          items: [
            { label: "Tipos de evento", description: "Categorías de evento con fotos y descripciones que alimentan galerías y presentaciones", href: "/ventas/configuracion/tipos-evento" },
          ],
        },
        {
          title: "Plantillas de cotización",
          items: [
            { label: "Plantillas de cotización", description: "Combos de líneas, precios y vigencia reutilizables al cotizar", href: "/cotizaciones/plantillas" },
          ],
        },
        {
          title: "Parámetros globales",
          items: [
            { label: "Precios y descuentos", description: "IVA, viabilidad, descuentos por volumen y multidía en Configuración general", href: "/admin/configuracion" },
          ],
        },
      ]}
    />
  );
}
