import ConfigHub from "@/components/ConfigHub";

export default function ProduccionConfiguracionPage() {
  return (
    <ConfigHub
      title="Configuración · Producción"
      subtitle="Catálogos maestros que alimentan cotizaciones, proyectos e inventario"
      groups={[
        {
          title: "Tabuladores y personal",
          items: [
            { label: "Tabulador de freelancers", description: "Tarifas por rol y nivel AAA / AA / A para personal freelance", href: "/catalogo/roles" },
            { label: "Técnicos freelance", description: "Directorio de técnicos con disciplinas, nivel y zona", href: "/catalogo/tecnicos" },
          ],
        },
        {
          title: "Directorios base",
          items: [
            { label: "Proveedores", description: "Proveedores de renta de equipo externo y su portal", href: "/catalogo/proveedores" },
            { label: "Empresas", description: "Empresas cliente / proveedor con datos fiscales", href: "/catalogo/empresas" },
            { label: "Venues", description: "Recintos con ficha técnica (eléctrica, acceso, restricciones)", href: "/catalogo/venues" },
          ],
        },
        {
          title: "Inventario",
          items: [
            { label: "Inventario de equipos", description: "Catálogo maestro de equipos propios y externos", href: "/inventario/maestro" },
            { label: "Plantillas de checklist de bodega", description: "Ítems del checklist semanal por categoría", href: "/inventario/bodega/templates" },
          ],
        },
      ]}
    />
  );
}
