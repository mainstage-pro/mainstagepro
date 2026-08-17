import { notFound } from "next/navigation";
import PaquetesClient from "../PaquetesClient";
import { getPresentationMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const dynamic = "force-static";

const TIPOS: Record<string, { label: string; desc: string }> = {
  social: { label: "Sociales", desc: "Paquetes de producción técnica para bodas, XV años y fiestas. Todo lo que incluye cada paquete, listo para cotizar." },
  musical: { label: "Musicales", desc: "Paquetes de producción técnica para conciertos, festivales y eventos con DJ. Todo lo que incluye cada paquete, listo para cotizar." },
  empresarial: { label: "Empresariales", desc: "Paquetes de producción técnica para congresos, lanzamientos y eventos corporativos. Todo lo que incluye cada paquete, listo para cotizar." },
  otro: { label: "Otros Eventos", desc: "Paquetes de producción técnica para eventos deportivos, teatro, comedia y ruedas de prensa. Todo lo que incluye cada paquete, listo para cotizar." },
};

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }): Promise<Metadata> {
  const { tipo } = await params;
  const info = TIPOS[tipo.toLowerCase()];
  if (!info) return getPresentationMetadata({ title: "Paquetes", description: "Paquetes de producción técnica.", path: `/presentacion/paquetes/${tipo}` });
  return getPresentationMetadata({
    title: `Paquetes ${info.label}`,
    description: info.desc,
    path: `/presentacion/paquetes/${tipo.toLowerCase()}`,
  });
}

export function generateStaticParams() {
  return Object.keys(TIPOS).map((tipo) => ({ tipo }));
}

export default async function PaquetesTipoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!TIPOS[tipo.toLowerCase()]) notFound();
  return <PaquetesClient defaultTab={tipo.toUpperCase()} />;
}
