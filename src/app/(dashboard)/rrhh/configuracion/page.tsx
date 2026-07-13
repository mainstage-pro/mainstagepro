import ConfigHub from "@/components/ConfigHub";

export default function RrhhConfiguracionPage() {
  return (
    <ConfigHub
      title="Configuración · Recursos Humanos"
      subtitle="Catálogos base que alimentan reclutamiento (ATS) e incidencias"
      groups={[
        {
          items: [
            { label: "Puestos ideales", description: "Perfiles de rol con habilidades, aptitudes y condiciones laborales", href: "/rrhh/puestos" },
          ],
        },
      ]}
    />
  );
}
