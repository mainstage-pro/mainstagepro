import { notFound } from "next/navigation";
import GaleriaTipoClient from "./GaleriaTipoClient";
import { getPresentationMetadata } from "@/lib/metadata";
import { getGaleriaData } from "@/lib/tipos-evento";
import { Metadata } from "next";

const TIPOS = ["musical", "social", "empresarial"] as const;

// Dinámica para sembrar las fotos elegidas en la primera pintura (SSR) y evitar el
// parpadeo/cambio de portada al hidratar.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }): Promise<Metadata> {
  const { tipo } = await params;
  const titleMap: Record<string, string> = {
    musical: "Galería de Eventos Musicales",
    social: "Galería de Eventos Sociales",
    empresarial: "Galería de Eventos Empresariales",
  };
  const descMap: Record<string, string> = {
    musical: "Nuestro trabajo en conciertos, festivales y shows en vivo. Producción audiovisual profesional en Querétaro.",
    social: "Nuestro trabajo en bodas, XV años y celebraciones privadas. Producción audiovisual profesional en Querétaro.",
    empresarial: "Nuestro trabajo en conferencias, lanzamientos y eventos corporativos. Producción audiovisual profesional en Querétaro.",
  };

  return getPresentationMetadata({
    title: titleMap[tipo] || "Galería de Eventos",
    description: descMap[tipo] || "Nuestro trabajo en imágenes. Producción audiovisual profesional en Querétaro.",
    path: `/presentacion/galeria/${tipo}`,
  });
}

export default async function GaleriaTipoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) notFound();
  // Todas las categorías para poder enlazar a las otras galerías desde el pie.
  const { categorias } = await getGaleriaData();
  return <GaleriaTipoClient slug={tipo as (typeof TIPOS)[number]} initialCategorias={categorias} />;
}
