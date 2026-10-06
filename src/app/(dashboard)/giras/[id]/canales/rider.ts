import { prisma } from "@/lib/prisma";
import { riderDeGira } from "@/lib/rider-de-gira";

/**
 * El rider cuyas listas se editan desde la gira: el que la gira trae enganchado
 * o, si no trae ninguno, el vigente del artista (misma regla que el advance y
 * los documentos). No hay listas propias de la gira a propósito: la input y la
 * output list son del artista, y lo que cambia por fecha son los canales del
 * show (`ShowCanal`), que se capturan en «Invitados y canales».
 */
export async function riderEditableDeGira(giraId: string) {
  const gira = await prisma.gira.findUnique({
    where: { id: giraId },
    select: { artistaId: true, riderId: true, artista: { select: { nombre: true } } },
  });
  if (!gira) return null;

  const elegido = await riderDeGira(giraId);
  if (!elegido) return null;

  const rider = await prisma.artistaRider.findUnique({
    where: { id: elegido.riderId },
    select: {
      id: true,
      nombre: true,
      version: true,
      contexto: true,
      origen: true,
      canalesMinimos: true,
      mixesMonitor: true,
    },
  });
  if (!rider) return null;

  return {
    ...rider,
    artistaId: gira.artistaId,
    artistaNombre: gira.artista.nombre,
    enganchado: gira.riderId === rider.id,
  };
}

/// Las otras versiones del artista que sí tienen canales de ese tipo, para poder
/// importarlas sin salir de la gira.
export async function origenesDeImportacion(artistaId: string, riderId: string, tipo: "INPUT" | "OUTPUT") {
  const otras = await prisma.artistaRider.findMany({
    where: { artistaId, activo: true, id: { not: riderId }, canales: { some: { tipo } } },
    orderBy: { version: "desc" },
    select: {
      id: true,
      nombre: true,
      version: true,
      contexto: true,
      _count: { select: { canales: { where: { tipo } } } },
    },
  });
  return otras.map((o) => ({
    id: o.id,
    nombre: o.nombre,
    version: o.version,
    contexto: o.contexto,
    canales: o._count.canales,
  }));
}
