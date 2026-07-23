import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { validarTokenPresentacion } from "@/lib/presentacion-token";
import { getConfigJSON } from "@/lib/config";
import PresentacionClient from "./PresentacionClient";
import PresentacionRentaClient from "./PresentacionRentaClient";
import { getPresentationMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ cotizacionId: string }>;
  searchParams: Promise<{ token?: string }>;
}): Promise<Metadata> {
  const { cotizacionId } = await params;
  const { token } = await searchParams;

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    select: {
      nombreEvento: true,
      nombreCotizacion: true,
      numeroCotizacion: true,
      tipoServicio: true,
      cliente: { select: { nombre: true } },
      lineas: {
        where: { NOT: { equipo: null } },
        take: 1,
        select: { equipo: { select: { imagenUrl: true } } },
      },
    },
  });

  if (!cotizacion) {
    return getPresentationMetadata({
      title: "Propuesta de Producción",
      description: "Propuesta de producción y cotización de servicios para tu evento.",
      path: `/presentacion/${cotizacionId}${token ? `?token=${token}` : ""}`,
    });
  }

  const name = cotizacion.nombreEvento || cotizacion.nombreCotizacion || `Cotización ${cotizacion.numeroCotizacion}`;
  const serviceType = cotizacion.tipoServicio === "RENTA" ? "Renta de Equipo" : "Producción Técnica";
  const title = `Propuesta: ${name}`;
  const description = `Propuesta personalizada de ${serviceType} para ${cotizacion.cliente.nombre}. Consulta el equipamiento y diseño propuesto por Mainstage Pro.`;
  const image = cotizacion.lineas[0]?.equipo?.imagenUrl || null;

  return getPresentationMetadata({
    title,
    description,
    path: `/presentacion/${cotizacionId}${token ? `?token=${token}` : ""}`,
    image,
  });
}

export default async function PresentacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ cotizacionId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { cotizacionId } = await params;
  const { token } = await searchParams;

  if (!validarTokenPresentacion(cotizacionId, token)) notFound();

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      cliente: {
        select: { nombre: true, empresa: true, telefono: true, correo: true },
      },
      trato: { select: { tipoEvento: true, ideasReferencias: true, tradeCalificado: true } },
      lineas: {
        orderBy: { orden: "asc" },
        include: {
          equipo: {
            select: {
              categoria: { select: { nombre: true } },
              imagenUrl: true,
            },
          },
        },
      },
    },
  });

  if (!cotizacion) notFound();

  const data = {
    ...cotizacion,
    fechaEvento: cotizacion.fechaEvento?.toISOString() ?? null,
    createdAt: cotizacion.createdAt.toISOString(),
    updatedAt: cotizacion.updatedAt.toISOString(),
    fechaEnvio: cotizacion.fechaEnvio?.toISOString() ?? null,
    fechaVencimiento: cotizacion.fechaVencimiento?.toISOString() ?? null,
  };

  // Galerías vivas por tipo de evento (FotoTipoEvento, gestionables por UI).
  // El tipoEvento viene en MAYÚSCULAS; TipoEvento.slug en minúsculas.
  const slug = (cotizacion.trato?.tipoEvento ?? cotizacion.tipoEvento ?? "").toLowerCase().trim();
  const tipoEvento = slug
    ? await prisma.tipoEvento.findUnique({
        where: { slug },
        include: { fotos: { orderBy: { orden: "asc" } } },
      })
    : null;
  const galeriaFotos = (tipoEvento?.fotos ?? []).map((f) => ({
    id: f.id,
    url: f.url,
    caption: f.caption,
    orden: f.orden,
    destacada: f.destacada,
  }));
  const heroFotos = galeriaFotos.filter((f) => f.destacada);

  const defaultNiveles = [
    { nivel: 1, nombre: "Base",        tagline: "Visibilidad esencial",  pct: 5,  destacado: false, beneficios: ["Logo en materiales digitales del evento","1 mención en redes sociales","2 a 4 accesos al evento","Acceso a métricas de alcance post-evento"] },
    { nivel: 2, nombre: "Estratégico", tagline: "Máximo alcance",        pct: 10, destacado: true,  beneficios: ["Logo en materiales digitales y físicos","3 menciones en redes + etiqueta en contenido","4 a 8 accesos al evento","Repost en @mainstagepro","Reporte de métricas detallado"] },
    { nivel: 3, nombre: "Premium",     tagline: "Presencia total",       pct: 12, destacado: false, beneficios: ["Logo destacado en todos los materiales","Cobertura completa en redes sociales","6 a 12 accesos al evento","Video recap con branding","Reporte ejecutivo de impacto"] },
  ];
  const tradeNiveles = await getConfigJSON("trade.niveles", defaultNiveles);

  if (cotizacion.tipoServicio === "RENTA") {
    return <PresentacionRentaClient cotizacion={data} token={token} galeriaFotos={galeriaFotos} heroFotos={heroFotos} />;
  }

  return <PresentacionClient cotizacion={data} tradeNiveles={tradeNiveles} token={token} galeriaFotos={galeriaFotos} heroFotos={heroFotos} />;
}
