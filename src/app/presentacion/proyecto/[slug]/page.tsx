import { notFound } from "next/navigation";
import { getProyectoBySlug } from "@/lib/proyectos";
import { getPresentationMetadata } from "@/lib/metadata";
import ProyectoClient from "./ProyectoClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let proyecto = null;
  try { proyecto = await getProyectoBySlug(slug); } catch { proyecto = null; }
  if (!proyecto) {
    return getPresentationMetadata({
      title: "Proyecto",
      description: "Proyecto de producción técnica de Mainstage Pro.",
      path: `/presentacion/proyecto/${slug}`,
    });
  }
  return getPresentationMetadata({
    title: proyecto.titulo,
    description: proyecto.resumen ?? "Proyecto de producción técnica de Mainstage Pro.",
    path: `/presentacion/proyecto/${slug}`,
    image: proyecto.portada ?? undefined,
  });
}

export default async function ProyectoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let proyecto = null;
  try { proyecto = await getProyectoBySlug(slug); } catch { proyecto = null; }
  if (!proyecto) notFound();
  return <ProyectoClient proyecto={proyecto} />;
}
