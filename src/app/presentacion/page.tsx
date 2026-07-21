import PresentacionHomeClient from "./PresentacionHomeClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Mainstage Pro · Producción técnica de eventos",
  description: "Audio, iluminación, video y operadores expertos para eventos musicales, sociales y empresariales. Servicios, inventario, proyectos, galería y cotizador en un solo lugar.",
  path: "/presentacion",
});

export const dynamic = "force-static";

export default function PresentacionHomePage() {
  return <PresentacionHomeClient />;
}
