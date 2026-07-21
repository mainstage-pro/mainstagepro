import { notFound } from "next/navigation";
import { getServicio, SERVICIOS_DETALLE } from "@/lib/presentacion-servicios";
import { getPresentationMetadata } from "@/lib/metadata";
import ServicioClient from "./ServicioClient";

export function generateStaticParams() {
  return SERVICIOS_DETALLE.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getServicio(slug);
  if (!s) {
    return getPresentationMetadata({
      title: "Servicio",
      description: "Servicios de producción técnica de Mainstage Pro.",
      path: `/presentacion/servicio/${slug}`,
    });
  }
  return getPresentationMetadata({
    title: `${s.title} · Mainstage Pro`,
    description: s.resumen,
    path: `/presentacion/servicio/${s.slug}`,
    image: s.hero,
  });
}

export const dynamic = "force-static";

export default async function ServicioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const servicio = getServicio(slug);
  if (!servicio) notFound();
  return <ServicioClient servicio={servicio} />;
}
