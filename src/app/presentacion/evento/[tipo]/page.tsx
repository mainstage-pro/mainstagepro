import { notFound } from "next/navigation";
import EventoClient from "./EventoClient";
import { getPresentationMetadata } from "@/lib/metadata";
import { getOverrides } from "@/lib/presentacion-overrides";
import { getTiposEventoMaterial } from "@/lib/tipos-evento";
import { Metadata } from "next";

// Dinámica para sembrar los overrides (imágenes/textos elegidos) en la primera
// pintura desde el servidor y evitar el parpadeo de las imágenes de fallback.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }): Promise<Metadata> {
  const { tipo } = await params;
  const labelMap: Record<string, string> = {
    musical: "Eventos Musicales y Conciertos",
    social: "Eventos Sociales y Bodas",
    empresarial: "Eventos Empresariales y Corporativos",
    otro: "Otros Eventos: Deportivos, Teatro, Comedia y Prensa",
  };
  const descMap: Record<string, string> = {
    musical: "Diseño sonoro de alta presión, iluminación espectacular y rider técnico para conciertos y festivales.",
    social: "Audio premium, iluminación arquitectónica y booths de DJ exclusivos para hacer de tu boda o evento social algo inolvidable.",
    empresarial: "Pantallas LED, microfonía fina y audio de alta claridad para congresos, convenciones y lanzamientos de marca.",
    otro: "Producción técnica para eventos deportivos, teatro, comedia y ruedas de prensa. Audio inteligible, iluminación por escena y transmisión, en cualquier sede.",
  };

  const title = labelMap[tipo] || "Producción de Eventos";
  const description = descMap[tipo] || "Soluciones profesionales de producción técnica de Mainstage Pro.";

  return getPresentationMetadata({
    title,
    description,
    path: `/presentacion/evento/${tipo}`,
  });
}

export default async function EventoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!["musical", "social", "empresarial", "otro"].includes(tipo)) notFound();
  const [initialOverrides, initialTipos] = await Promise.all([
    getOverrides().catch(() => ({})),
    getTiposEventoMaterial().catch(() => []),
  ]);
  return <EventoClient tipo={tipo as "musical" | "social" | "empresarial" | "otro"} initialOverrides={initialOverrides} initialTipos={initialTipos} />;
}
