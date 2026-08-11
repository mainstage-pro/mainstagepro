import { notFound } from "next/navigation";
import { getServicio } from "@/lib/presentacion-servicios";
import { getServicioMaterial } from "@/lib/tipos-servicio";
import { getPresentationMetadata } from "@/lib/metadata";
import { getOverrides } from "@/lib/presentacion-overrides";
import ServicioClient from "./ServicioClient";

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

// Dinámica para sembrar los overrides (imágenes/textos elegidos) en la primera
// pintura desde el servidor y evitar el parpadeo de las imágenes de fallback.
export const dynamic = "force-dynamic";

export default async function ServicioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const servicio = getServicio(slug);
  if (!servicio) notFound();
  // Portada + galería del catálogo (BD) y overrides, sembrados por SSR.
  const [initialOverrides, material] = await Promise.all([
    getOverrides().catch(() => ({})),
    getServicioMaterial(slug).catch(() => null),
  ]);
  return (
    <ServicioClient
      servicio={servicio}
      initialOverrides={initialOverrides}
      fotos={material?.fotos ?? []}
      portada={material?.portada ?? null}
    />
  );
}
