import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPresentationMetadata } from "@/lib/metadata";
import {
  getPerfilPresentacion,
  slugToPerfilId,
  PERFIL_PRESENTACION_SLUGS,
} from "@/lib/presentacion-perfiles";
import PerfilClient from "./PerfilClient";

export function generateStaticParams() {
  return PERFIL_PRESENTACION_SLUGS.map((slug) => ({ slug }));
}

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getPerfilPresentacion(slugToPerfilId(slug));
  if (!p) return getPresentationMetadata({ title: "Mainstage Pro", description: "Producción técnica de eventos.", path: `/presentacion/perfil/${slug}` });
  return getPresentationMetadata({
    title: `Mainstage Pro · ${p.label}`,
    description: p.copy.sub,
    path: `/presentacion/perfil/${slug}`,
  });
}

export default async function PerfilPresentacionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPerfilPresentacion(slugToPerfilId(slug));
  if (!p) notFound();
  return <PerfilClient p={p} />;
}
