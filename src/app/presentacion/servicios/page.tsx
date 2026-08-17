import ServiciosClient from "./ServiciosClient";
import { getPresentationMetadata } from "@/lib/metadata";
import { getTiposEventoMaterial } from "@/lib/tipos-evento";

export const metadata = getPresentationMetadata({
  title: "Servicios de Producción Técnica",
  description: "Soluciones integrales de audio, video, iluminación espectacular, rigging y booths decorativos para eventos corporativos y sociales premium.",
  path: "/presentacion/servicios",
});

// Dinámica para resolver las portadas de los tipos de evento en el servidor: si
// se resuelven en el cliente, el hero parpadea con la imagen local de fallback.
export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const initialTipos = await getTiposEventoMaterial().catch(() => []);
  return <ServiciosClient initialTipos={initialTipos} />;
}
