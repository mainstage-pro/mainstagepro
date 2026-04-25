import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { validarTokenPresentacion } from "@/lib/presentacion-token";
import { getConfigJSON } from "@/lib/config";
import PresentacionClient from "./PresentacionClient";
import PresentacionRentaClient from "./PresentacionRentaClient";

export const dynamic = "force-dynamic";

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

  const defaultNiveles = [
    { nivel: 1, nombre: "Base",        tagline: "Visibilidad esencial",  pct: 5,  destacado: false, beneficios: ["Logo en materiales digitales del evento","1 mención en redes sociales","2 a 4 accesos al evento","Acceso a métricas de alcance post-evento"] },
    { nivel: 2, nombre: "Estratégico", tagline: "Máximo alcance",        pct: 10, destacado: true,  beneficios: ["Logo en materiales digitales y físicos","3 menciones en redes + etiqueta en contenido","4 a 8 accesos al evento","Repost en @mainstagepro","Reporte de métricas detallado"] },
    { nivel: 3, nombre: "Premium",     tagline: "Presencia total",       pct: 12, destacado: false, beneficios: ["Logo destacado en todos los materiales","Cobertura completa en redes sociales","6 a 12 accesos al evento","Video recap con branding","Reporte ejecutivo de impacto"] },
  ];
  const tradeNiveles = await getConfigJSON("trade.niveles", defaultNiveles);

  if (cotizacion.tipoServicio === "RENTA") {
    return <PresentacionRentaClient cotizacion={data} />;
  }

  return <PresentacionClient cotizacion={data} tradeNiveles={tradeNiveles} />;
}
