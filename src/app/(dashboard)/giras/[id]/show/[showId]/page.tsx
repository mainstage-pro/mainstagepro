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
      venue: true,
      riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
      _count: { select: { crew: true, bloques: true, archivos: true } },
    },
  });

  if (!show || show.giraId !== id) notFound();

  const resumen = resumirAdvance(show.riderLineas);

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
      }
    : null;

  const detalle: ShowDetalle = {
    id: show.id,
    giraId: show.giraId,
    fecha: show.fecha.toISOString(),
    ciudad: show.ciudad,
    venueId: show.venueId,
    venueNombre: show.venue?.nombre ?? null,
    estado: show.estado,
    tipoShow: show.tipoShow,
    aforoEsperado: show.aforoEsperado,
    horaLoadIn: show.horaLoadIn,
    horaMontaje: show.horaMontaje,
    horaLineCheck: show.horaLineCheck,
    horaSoundcheck: show.horaSoundcheck,
    horaDoors: show.horaDoors,
    horaShow: show.horaShow,
    horaFin: show.horaFin,
    horaLoadOut: show.horaLoadOut,
    curfew: show.curfew,
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
    bloques: show._count.bloques,
    archivos: show._count.archivos,
  };

  return <ShowResumenClient show={detalle} venue={venue} advance={resumen} />;
}
