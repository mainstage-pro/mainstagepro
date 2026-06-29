import AlineacionClient from "./AlineacionClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Alineación y Logística del Evento",
  description: "Consulta la planeación y logística de montaje, horarios y distribución de personal técnico del evento de Mainstage Pro.",
  path: "/presentacion/alineacion",
});

export const dynamic = "force-static";

export default function AlineacionPage() {
  return <AlineacionClient />;
}
