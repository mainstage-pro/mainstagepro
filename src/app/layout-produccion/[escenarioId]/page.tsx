import { notFound } from "next/navigation";
import type { Metadata } from "next";
import LayoutProduccionPublico from "@/components/proyectos/LayoutProduccionPublico";
import { construirDocumentoLayout } from "@/lib/layout-produccion";
import { validarTokenLayout } from "@/lib/layout-token";

type Props = {
  params: Promise<{ escenarioId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { escenarioId } = await params;
  const { token } = await searchParams;
  if (!validarTokenLayout(escenarioId, token)) return { title: "Layout de producción" };
  const doc = await construirDocumentoLayout(escenarioId);
  if (!doc) return { title: "Layout de producción" };
  return {
    title: `${doc.escenario.nombre} · Layout de producción`,
    description: `${doc.proyecto.nombre} — ${doc.totales.unidades} unidades en ${doc.totales.zonas} zonas.`,
    robots: { index: false, follow: false },
  };
}

export default async function LayoutProduccionPage({ params, searchParams }: Props) {
  const { escenarioId } = await params;
  const { token } = await searchParams;
  if (!validarTokenLayout(escenarioId, token)) notFound();

  const doc = await construirDocumentoLayout(escenarioId);
  if (!doc) notFound();

  return <LayoutProduccionPublico doc={doc} />;
}
