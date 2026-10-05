import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resumirAdvance, equipoDeFecha } from "@/lib/giras";
import GiraResumenClient, { type GiraDetalle, type ShowResumen } from "./GiraResumenClient";

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
          venue: { select: { id: true, nombre: true } },
          riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
          cotizaciones: { select: { estado: true, granTotal: true } },
          _count: { select: { crew: true } },
        },
      },
    },
  });

  if (!gira) notFound();

  const [artistas, clientes, riders, personas, servicios] = await Promise.all([
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
  ]);

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
      shows={shows}
      artistas={artistas}
      clientes={clientes}
      riders={riders}
      personas={personas}
      servicios={servicios}
    />
  );
}
