import ConfigHub from "@/components/ConfigHub";

export default function MarketingConfiguracionPage() {
  return (
    <ConfigHub
      title="Configuración · Marketing"
      subtitle="Catálogos base que alimentan el calendario y el kanban de contenido"
      groups={[
        {
          items: [
            { label: "Tipos de contenido", description: "Formatos, plataformas, frecuencia y recurrencia de publicaciones", href: "/marketing/contenidos" },
          ],
        },
      ]}
    />
  );
}
