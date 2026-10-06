import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CotizacionesGiraClient from "./CotizacionesGiraClient";

export const dynamic = "force-dynamic";

const SELECT_COTIZACION = {
  id: true,
  numeroCotizacion: true,
  nombreCotizacion: true,
  estado: true,
  granTotal: true,
  createdAt: true,
  _count: { select: { lineas: true } },
} as const;

export default async function CotizacionesDeGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      moneda: true,
      clienteId: true,
      cliente: { select: { nombre: true, empresa: true } },
      artista: { select: { nombre: true } },
      shows: {
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          fecha: true,
          ciudad: true,
          estado: true,
          proyectoId: true,
          venue: { select: { nombre: true } },
          cotizaciones: { select: SELECT_COTIZACION, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!gira) notFound();

  // Las del tour: giraId puesto y sin fecha. Son la base de la que se copia.
  const base = await prisma.cotizacion.findMany({
    where: { giraId: id, giraShowId: null },
    select: SELECT_COTIZACION,
    orderBy: { createdAt: "asc" },
  });

  const serializa = (c: (typeof base)[number]) => ({
    id: c.id,
    numeroCotizacion: c.numeroCotizacion,
    nombreCotizacion: c.nombreCotizacion,
    estado: c.estado,
    granTotal: c.granTotal,
    lineas: c._count.lineas,
  });

  return (
    <CotizacionesGiraClient
      giraId={gira.id}
      giraNombre={gira.nombre}
      tipo={gira.tipo}
      moneda={gira.moneda}
      artista={gira.artista.nombre}
      cliente={gira.cliente ? gira.cliente.empresa || gira.cliente.nombre : null}
      sinCliente={!gira.clienteId}
      base={base.map(serializa)}
      shows={gira.shows.map((s) => ({
        id: s.id,
        fecha: s.fecha.toISOString(),
        plaza: s.venue?.nombre ?? s.ciudad ?? null,
        estado: s.estado,
        tieneProyecto: Boolean(s.proyectoId),
        cotizaciones: s.cotizaciones.map(serializa),
      }))}
    />
  );
}
