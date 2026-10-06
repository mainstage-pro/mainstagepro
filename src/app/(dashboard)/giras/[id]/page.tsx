import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resumirAdvance, equipoDeFecha } from "@/lib/giras";
// Misma regla de resolución del rider que usan los generadores de PDF: el
// enganchado a la gira y, si no hay, el vigente del artista. Se importa en vez
// de repetirse para que el resumen nunca anuncie un rider distinto al que
// imprime el documento.
import { riderDeGira } from "@/lib/rider-de-gira";
import GiraResumenClient, {
  type GiraDetalle,
  type RiderDeLaGira,
  type ShowResumen,
  type VenueRider,
} from "./GiraResumenClient";

export const dynamic = "force-dynamic";

export default async function GiraResumenPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    include: {
      artista: { select: { id: true, nombre: true, tipoFormacion: true, integrantesNum: true } },
      cliente: { select: { id: true, nombre: true, empresa: true } },
      contactoPrincipal: { select: { id: true, nombre: true, rol: true, telefono: true, email: true } },
      rider: {
        select: {
          id: true,
          nombre: true,
          version: true,
          esActivo: true,
          formacion: true,
          canalesMinimos: true,
          mixesMonitor: true,
          tiempoSoundcheckMin: true,
          _count: { select: { lineas: true, canales: true } },
        },
      },
      shows: {
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          fecha: true,
          ciudad: true,
          estado: true,
          tipoShow: true,
          riderEnviadoEn: true,
          venue: {
            select: {
              id: true,
              nombre: true,
              ciudad: true,
              // Lo que el catálogo guarda de la casa: el rider de casa es un
              // archivo subido a la ficha, no un PDF que generemos nosotros.
              riderCasaUrl: true,
              medidasEscenario: true,
              notasTecnicas: true,
              contactoTecnicoNombre: true,
            },
          },
          riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
          cotizaciones: { select: { estado: true, granTotal: true } },
          _count: { select: { crew: true } },
        },
      },
    },
  });

  if (!gira) notFound();

  const [artistas, clientes, riders, personas, servicios, resuelto, ridersCasa] = await Promise.all([
    prisma.artista.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.cliente.findMany({ select: { id: true, nombre: true, empresa: true }, orderBy: { nombre: "asc" }, take: 400 }),
    prisma.artistaRider.findMany({
      where: { artistaId: gira.artistaId, activo: true },
      select: { id: true, nombre: true, version: true, esActivo: true },
      orderBy: { version: "desc" },
    }),
    prisma.artistaPersona.findMany({
      where: { artistaId: gira.artistaId, activo: true },
      select: { id: true, nombre: true, rol: true, telefono: true, email: true },
      orderBy: [{ esContactoClave: "desc" }, { orden: "asc" }, { nombre: "asc" }],
    }),
    prisma.servicioPM.findMany({
      where: { activo: true },
      select: { clave: true, nombre: true, categoria: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    }),
    riderDeGira(id),
    // El rider de la casa muchas veces llega por correo y se sube al archivero
    // en vez de a la ficha del venue: las dos fuentes valen igual.
    prisma.giraArchivo.findMany({
      where: { giraId: id, tipo: "RIDER_CASA" },
      orderBy: { createdAt: "desc" },
      select: { id: true, nombre: true, url: true, show: { select: { venueId: true } } },
    }),
  ]);

  // El rider que se va a imprimir. Si no se puede describir (versión y nombre)
  // no se ofrece: un botón sin saber qué baja es peor que no tenerlo.
  const filaRider =
    riders.find((r) => r.id === resuelto?.riderId) ??
    (resuelto && gira.rider?.id === resuelto.riderId ? gira.rider : null);

  const riderDoc: RiderDeLaGira | null =
    resuelto && filaRider
      ? {
          id: filaRider.id,
          nombre: filaRider.nombre,
          version: filaRider.version,
          esActivo: filaRider.esActivo,
          /// No está enganchado al registro: se cayó al vigente del artista.
          heredado: resuelto.riderId !== gira.riderId,
        }
      : null;

  // Un venue por lugar, no por fecha: tres noches en el mismo foro comparten
  // rider de casa.
  const porVenue = new Map<string, VenueRider>();
  for (const s of gira.shows) {
    if (!s.venue) continue;
    const previo = porVenue.get(s.venue.id);
    if (previo) {
      previo.shows += 1;
      continue;
    }
    porVenue.set(s.venue.id, {
      id: s.venue.id,
      nombre: s.venue.nombre,
      ciudad: s.venue.ciudad,
      shows: 1,
      riderCasaUrl: s.venue.riderCasaUrl,
      // Hay ficha técnica capturada aunque nadie haya subido el documento.
      conFichaTecnica: !!(s.venue.medidasEscenario || s.venue.notasTecnicas || s.venue.contactoTecnicoNombre),
      archivos: [],
    });
  }
  for (const a of ridersCasa) {
    const v = a.show?.venueId ? porVenue.get(a.show.venueId) : null;
    if (v) v.archivos.push({ id: a.id, nombre: a.nombre, url: a.url });
  }
  const venues = [...porVenue.values()];

  const shows: ShowResumen[] = gira.shows.map((s) => {
    const resumen = resumirAdvance(s.riderLineas);
    const equipo = equipoDeFecha(s.cotizaciones);
    return {
      id: s.id,
      equipoTotal: equipo.total,
      equipoCotizaciones: equipo.cotizaciones,
      equipoCerrado: equipo.cerrada,
      fecha: s.fecha.toISOString(),
      ciudad: s.ciudad,
      venue: s.venue?.nombre ?? null,
      estado: s.estado,
      tipoShow: s.tipoShow,
      riderEnviado: !!s.riderEnviadoEn,
      crew: s._count.crew,
      avance: resumen.avance,
      semaforo: resumen.semaforo,
      indispensablesAbiertos: resumen.indispensablesTotal - resumen.indispensablesResueltas,
      renglones: resumen.total,
    };
  });

  const detalle: GiraDetalle = {
    id: gira.id,
    nombre: gira.nombre,
    tipo: gira.tipo,
    estado: gira.estado,
    fechaInicio: gira.fechaInicio?.toISOString() ?? null,
    fechaFin: gira.fechaFin?.toISOString() ?? null,
    artistaId: gira.artistaId,
    artistaNombre: gira.artista.nombre,
    clienteId: gira.clienteId,
    riderId: gira.riderId,
    contactoPrincipalId: gira.contactoPrincipalId,
    rolMainstage: gira.rolMainstage,
    moneda: gira.moneda,
    notas: gira.notas,
    rider: gira.rider
      ? {
          id: gira.rider.id,
          nombre: gira.rider.nombre,
          version: gira.rider.version,
          esActivo: gira.rider.esActivo,
          formacion: gira.rider.formacion,
          canalesMinimos: gira.rider.canalesMinimos,
          mixesMonitor: gira.rider.mixesMonitor,
          tiempoSoundcheckMin: gira.rider.tiempoSoundcheckMin,
          lineas: gira.rider._count.lineas,
          canales: gira.rider._count.canales,
        }
      : null,
  };

  return (
    <GiraResumenClient
      gira={detalle}
      riderDoc={riderDoc}
      venues={venues}
      shows={shows}
      artistas={artistas}
      clientes={clientes}
      riders={riders}
      personas={personas}
      servicios={servicios}
    />
  );
}
