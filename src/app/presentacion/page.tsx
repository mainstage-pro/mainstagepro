import PresentacionHomeClient from "./PresentacionHomeClient";
import { getPresentationMetadata } from "@/lib/metadata";
import { getOverrides } from "@/lib/presentacion-overrides";

export const metadata = getPresentationMetadata({
  title: "Mainstage Pro · Producción técnica de eventos",
  description: "Audio, iluminación, video y operadores expertos para eventos musicales, sociales y empresariales. Servicios, inventario, proyectos, galería y cotizador en un solo lugar.",
  path: "/presentacion",
});

// Dinámica para leer los overrides (imágenes/textos elegidos) en el servidor y
// sembrarlos en la primera pintura. Antes era force-static y por eso parpadeaba.
export const dynamic = "force-dynamic";

export default async function PresentacionHomePage() {
  const initialOverrides = await getOverrides().catch(() => ({}));
  return <PresentacionHomeClient initialOverrides={initialOverrides} />;
}
