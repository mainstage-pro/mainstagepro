import ConfigHub from "@/components/ConfigHub";

export default function MetasPage() {
  return (
    <ConfigHub
      title="Metas"
      subtitle="Objetivos estratégicos y seguimiento de KPIs"
      groups={[
        {
          items: [
            {
              label: "Objetivos",
              description: "OKRs y metas globales por trimestre",
              href: "/objetivos",
            },
            {
              label: "KPIs",
              description: "Tablero de indicadores clave de desempeño",
              href: "/kpis",
            },
          ],
        },
      ]}
    />
  );
}
