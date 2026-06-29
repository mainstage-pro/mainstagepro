import ServiciosClient from "./ServiciosClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Servicios de Producción Técnica",
  description: "Soluciones integrales de audio, video, iluminación espectacular, rigging y booths decorativos para eventos corporativos y sociales premium.",
  path: "/presentacion/servicios",
});

export const dynamic = "force-static";

export default function ServiciosPage() {
  return <ServiciosClient />;
}
