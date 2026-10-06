import { prisma } from "@/lib/prisma";
import { crearTratoParaCotizacion } from "@/lib/trato-auto";
import { datosCopiaCotizacion, siguienteNumeroCotizacion } from "@/lib/cotizacion-copia";

export interface ShowParaCotizar {
  id: string;
  fecha: Date;
  ciudad: string | null;
  venueId: string | null;
  venue: { nombre: string } | null;
}

export interface GiraParaCotizar {
  id: string;
  nombre: string;
  clienteId: string | null;
  tratoId: string | null;
  artista: { nombre: string };
}

export const SELECT_SHOW_COTIZAR = {
  id: true,
  fecha: true,
  ciudad: true,
  venueId: true,
  venue: { select: { nombre: true } },
} as const;

export const SELECT_GIRA_COTIZAR = {
  id: true,
  nombre: true,
  clienteId: true,
  tratoId: true,
  artista: { select: { nombre: true } },
} as const;

/// Cómo se llama la plaza en el nombre de la cotización: el venue si ya se eligió
/// del catálogo, si no la ciudad, y como último recurso el día.
export function plazaDeShow(show: ShowParaCotizar): string {
  return show.venue?.nombre ?? show.ciudad ?? show.fecha.toISOString().slice(0, 10);
}

/// Toda cotización va ligada a un trato. Una gira suele nacer sin trato, así que
/// el primer cotizar abre uno y lo guarda en la gira: las fechas siguientes
/// cuelgan del mismo y el tour se ve como una sola oportunidad en el pipeline.
export async function tratoDeGira(gira: GiraParaCotizar, usuarioId: string): Promise<string | null> {
  if (gira.tratoId) return gira.tratoId;
  if (!gira.clienteId) return null;

  const tratoId = await crearTratoParaCotizacion({
    clienteId: gira.clienteId,
    vendedorId: usuarioId,
    tipoEvento: "MUSICAL",
    nombreEvento: gira.nombre,
  });
  await prisma.gira.update({ where: { id: gira.id }, data: { tratoId } });
  return tratoId;
}

/// Cabecera de la cotización según a qué se ancla. Sin show es la del tour: no
/// lleva fecha ni venue porque cubre todas las plazas.
export function cabeceraDeCotizacion(gira: GiraParaCotizar, show: ShowParaCotizar | null) {
  if (!show) {
    return {
      nombreCotizacion: `${gira.artista.nombre} — toda la gira`,
      nombreEvento: gira.nombre,
      fechaEvento: null,
      venueId: null,
      lugarEvento: null,
      giraId: gira.id,
      giraShowId: null,
    };
  }
  const plaza = plazaDeShow(show);
  return {
    nombreCotizacion: `${gira.artista.nombre} — ${plaza}`,
    nombreEvento: `${gira.nombre} — ${plaza}`,
    fechaEvento: show.fecha,
    venueId: show.venueId,
    lugarEvento: show.venue?.nombre ?? null,
    giraId: gira.id,
    giraShowId: show.id,
  };
}

/// Abre una cotización de equipo en blanco para la gira o para una de sus fechas.
export async function crearCotizacionDeGira(
  gira: GiraParaCotizar,
  show: ShowParaCotizar | null,
  usuarioId: string,
) {
  const tratoId = await tratoDeGira(gira, usuarioId);

  return prisma.cotizacion.create({
    data: {
      numeroCotizacion: await siguienteNumeroCotizacion(),
      estado: "BORRADOR",
      clienteId: gira.clienteId!,
      tratoId,
      creadaPorId: usuarioId,
      tipoEvento: "MUSICAL",
      ...cabeceraDeCotizacion(gira, show),
    },
    select: { id: true, numeroCotizacion: true },
  });
}

/// Baja la cotización base del tour a una fecha: mismo equipo y mismos precios,
/// con la fecha y el venue de la plaza. Una fecha por llamada, a propósito.
export async function copiarCotizacionAFecha(
  cotizacionId: string,
  gira: GiraParaCotizar,
  show: ShowParaCotizar | null,
  usuarioId: string,
) {
  const original = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: { lineas: true },
  });
  if (!original) return null;

  const tratoId = await tratoDeGira(gira, usuarioId);

  return prisma.cotizacion.create({
    data: datosCopiaCotizacion(original, {
      numeroCotizacion: await siguienteNumeroCotizacion(),
      creadaPorId: usuarioId,
      tratoId,
      ...cabeceraDeCotizacion(gira, show),
    }),
    select: { id: true, numeroCotizacion: true },
  });
}
