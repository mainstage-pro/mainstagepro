import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { validarTokenPresentacion } from "@/lib/presentacion-token";
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
      trato: { select: { tipoEvento: true, ideasReferencias: true } },
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

  if (cotizacion.tipoServicio === "RENTA") {
    return <PresentacionRentaClient cotizacion={data} />;
  }

  return <PresentacionClient cotizacion={data} />;
}
