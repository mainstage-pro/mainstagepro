import ConfigHub from "@/components/ConfigHub";

export default function RrhhConfiguracionPage() {
  return (
    <ConfigHub
      title="Configuración · Recursos Humanos"
      subtitle="Catálogos base que alimentan reclutamiento (ATS) e incidencias"
      groups={[
        {
          items: [
            { label: "Puestos", description: "Perfiles de puesto y condiciones laborales (Dirección → Organización)", href: "/organizacion/puestos" },
          ],
        },
      ]}
    />
  );
}
