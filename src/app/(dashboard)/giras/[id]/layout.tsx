import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avanceGira, esGira, fmtRango } from "@/lib/giras";
import CabeceraGira from "./CabeceraGira";
import type { EnlaceSub } from "./SubNav";

export const dynamic = "force-dynamic";

export default async function GiraLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
      artistaId: true,
      artista: { select: { nombre: true } },
      shows: {
        orderBy: { fecha: "asc" },
        select: { fecha: true, riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } } },
      },
    },
  });

  if (!gira) notFound();

  const resumen = avanceGira(gira.shows);

  // El rango de la cabecera prefiere las fechas capturadas, pero si están vacías
  // se lee de los shows: la gira nunca debe verse "sin fechas" si ya tiene shows.
  const rango =
    gira.fechaInicio || gira.fechaFin
      ? fmtRango(gira.fechaInicio, gira.fechaFin)
      : gira.shows.length
        ? fmtRango(gira.shows[0].fecha, gira.shows[gira.shows.length - 1].fecha)
        : "Sin fechas";

  const tour = esGira(gira.tipo);

  const enlaces: EnlaceSub[] = [
    { href: `/giras/${id}`, label: "Resumen", llave: "resumen", exacto: true },
    { href: `/giras/${id}/propuestas`, label: "Propuestas", llave: "propuestas" },
    { href: `/giras/${id}/shows`, label: tour ? "Shows" : "Show", llave: "shows" },
    { href: `/giras/${id}/advance`, label: "Advance", llave: "advance" },
    { href: `/giras/${id}/pendientes`, label: "Pendientes", llave: "pendientes" },
    { href: `/giras/${id}/crew`, label: "Crew", llave: "crew" },
    { href: `/giras/${id}/logistica`, label: "Viajes y hotel", llave: "logistica" },
    { href: `/giras/${id}/setlist`, label: "Setlist", llave: "setlist" },
    { href: `/giras/${id}/canales`, label: "Lista base", llave: "canales" },
    { href: `/giras/${id}/documentos`, label: "Documentos", llave: "documentos" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <CabeceraGira
        giraId={id}
        nombre={gira.nombre}
        tipo={gira.tipo}
        artistaId={gira.artistaId}
        artista={gira.artista.nombre}
        rango={rango}
        estado={gira.estado}
        shows={gira.shows.length}
        avance={resumen.avance}
        semaforo={resumen.semaforo}
        enlaces={enlaces}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
