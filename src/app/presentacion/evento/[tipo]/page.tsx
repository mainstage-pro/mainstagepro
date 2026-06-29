import { notFound } from "next/navigation";
import EventoClient from "./EventoClient";
import { getPresentationMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export function generateStaticParams() {
  return [{ tipo: "musical" }, { tipo: "social" }, { tipo: "empresarial" }];
}

export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }): Promise<Metadata> {
  const { tipo } = await params;
  const labelMap: Record<string, string> = {
    musical: "Eventos Musicales y Conciertos",
    social: "Eventos Sociales y Bodas",
    empresarial: "Eventos Empresariales y Corporativos",
  };
  const descMap: Record<string, string> = {
    musical: "Diseño sonoro de alta presión, iluminación espectacular y rider técnico para conciertos y festivales.",
    social: "Audio premium, iluminación arquitectónica y booths de DJ exclusivos para hacer de tu boda o evento social algo inolvidable.",
    empresarial: "Pantallas LED, microfonía fina y audio de alta claridad para congresos, convenciones y lanzamientos de marca.",
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
  if (!["musical", "social", "empresarial"].includes(tipo)) notFound();
  return <EventoClient tipo={tipo as "musical" | "social" | "empresarial"} />;
}
