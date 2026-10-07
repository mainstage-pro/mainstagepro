import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resumirAdvance } from "@/lib/giras";
import ShowResumenClient, { type ShowDetalle, type VenueFicha } from "./ShowResumenClient";

export const dynamic = "force-dynamic";

export default async function ShowResumenPage({ params }: { params: Promise<{ id: string; showId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, showId } = await params;

  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    include: {
      venue: { include: { _count: { select: { inventario: true } } } },
      gira: {
        select: {
          artistaId: true,
          rider: { select: { id: true, nombre: true, version: true } },
        },
      },
      repartos: { select: { prioridad: true, estado: true, cubiertoPor: true } },
      proyecto: { select: { id: true, numeroProyecto: true } },
      cotizaciones: {
        select: {
          id: true,
          numeroCotizacion: true,
          nombreCotizacion: true,
          estado: true,
          granTotal: true,
          proyecto: { select: { id: true, numeroProyecto: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { crew: true, momentos: true, archivos: true } },
    },
  });

  if (!show || show.giraId !== id) notFound();

  const resumen = resumirAdvance(show.repartos);

  // El directorio del artista es la única fuente de personas: el promotor de la
  // fecha se elige de aquí para que la siguiente fecha con el mismo promotor no
  // lo vuelva a capturar, y para que corregir su celular lo corrija en todas.
  const personas = await prisma.artistaPersona.findMany({
    where: { artistaId: show.gira.artistaId, activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, rol: true, telefono: true, email: true },
  });

  // Si la gira no tiene rider amarrado se ofrece el vigente del artista, marcado
  // como tal: es contra ese documento que se lee la ficha técnica del foro.
  const riderArtista = show.gira.rider
    ? null
    : await prisma.artistaRider.findFirst({
        where: { artistaId: show.gira.artistaId, activo: true, esActivo: true },
        select: { id: true, nombre: true, version: true },
      });
  const rider = show.gira.rider
    ? { ...show.gira.rider, deLaGira: true }
    : riderArtista
      ? { ...riderArtista, deLaGira: false }
      : null;

  const venue: VenueFicha | null = show.venue
    ? {
        id: show.venue.id,
        nombre: show.venue.nombre,
        ciudad: show.venue.ciudad,
        estado: show.venue.estado,
        direccion: show.venue.direccion,
        linkMaps: show.venue.linkMaps,
        capacidadPersonas: show.venue.capacidadPersonas,
        medidasEscenario: show.venue.medidasEscenario,
        alturaRejaM: show.venue.alturaRejaM,
        voltajeDisponible: show.venue.voltajeDisponible,
        amperajeTotal: show.venue.amperajeTotal,
        fases: show.venue.fases,
        ubicacionTablero: show.venue.ubicacionTablero,
        accesoEscenario: show.venue.accesoEscenario,
        accesoVehicular: show.venue.accesoVehicular,
        puntoDescarga: show.venue.puntoDescarga,
        horarioCarga: show.venue.horarioCarga,
        camerinos: show.venue.camerinos,
        restriccionDecibeles: show.venue.restriccionDecibeles,
        restriccionHorario: show.venue.restriccionHorario,
        restriccionInstalacion: show.venue.restriccionInstalacion,
        contactoTecnicoNombre: show.venue.contactoTecnicoNombre,
        contactoTecnicoTelefono: show.venue.contactoTecnicoTelefono,
        contactoTecnicoEmail: show.venue.contactoTecnicoEmail,
        riderCasaUrl: show.venue.riderCasaUrl,
        notasTecnicas: show.venue.notasTecnicas,
        conceptos: show.venue._count.inventario,
      }
    : null;

  const detalle: ShowDetalle = {
    id: show.id,
    giraId: show.giraId,
    artistaId: show.gira.artistaId,
    rider,
    fecha: show.fecha.toISOString(),
    ciudad: show.ciudad,
    venueId: show.venueId,
    venueNombre: show.venue?.nombre ?? null,
    estado: show.estado,
    tipoShow: show.tipoShow,
    aforoEsperado: show.aforoEsperado,
    promotorPersonaId: show.promotorPersonaId,
    promotorNombre: show.promotorNombre,
    promotorContacto: show.promotorContacto,
    promotorTelefono: show.promotorTelefono,
    promotorEmail: show.promotorEmail,
    contactoCasaNombre: show.contactoCasaNombre,
    contactoCasaTelefono: show.contactoCasaTelefono,
    contactoCasaEmail: show.contactoCasaEmail,
    notas: show.notas,
    riderEnviadoEn: show.riderEnviadoEn?.toISOString() ?? null,
    advanceCerradoEn: show.advanceCerradoEn?.toISOString() ?? null,
    crew: show._count.crew,
    momentos: show._count.momentos,
    archivos: show._count.archivos,
    proyecto: show.proyecto,
    cotizaciones: show.cotizaciones.map((c) => ({
      id: c.id,
      numeroCotizacion: c.numeroCotizacion,
      nombreCotizacion: c.nombreCotizacion,
      estado: c.estado,
      granTotal: c.granTotal,
      proyecto: c.proyecto,
    })),
  };

  return <ShowResumenClient show={detalle} venue={venue} advance={resumen} personas={personas} />;
}
