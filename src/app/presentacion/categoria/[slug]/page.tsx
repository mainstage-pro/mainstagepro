import { notFound } from "next/navigation";
import { Metadata } from "next";
import CategoriaClient from "./CategoriaClient";
import { getPresentationMetadata } from "@/lib/metadata";
import {
  PRESENTACION_CATEGORIA_SLUGS,
  getPresentacionCategoria,
} from "@/lib/presentacion-categorias";

export function generateStaticParams() {
  return PRESENTACION_CATEGORIA_SLUGS.map((slug) => ({ slug }));
}

export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cfg = getPresentacionCategoria(slug);
  if (!cfg) return getPresentationMetadata({ title: "Categoría de equipo", description: "Catálogo de equipo profesional de Mainstage Pro.", path: `/presentacion/categoria/${slug}` });
  return getPresentationMetadata({
    title: `${cfg.nombre} — Equipo profesional`,
    description: cfg.heroSub,
    path: `/presentacion/categoria/${slug}`,
  });
}

export default async function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cfg = getPresentacionCategoria(slug);
  if (!cfg) notFound();
  return <CategoriaClient cfg={cfg} />;
}
