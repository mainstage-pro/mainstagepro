// Qué rider se usa en una gira. Vive aparte de `src/lib/pdf-gira/` porque esto
// es una consulta, no un documento: la pestaña de resumen necesita el dato y
// leerlo desde ahí le arrastraba `@react-pdf/renderer` al bundle del servidor.

import { prisma } from "@/lib/prisma";

/// Resuelve el rider a imprimir desde una gira: el enganchado o, en su defecto,
/// el vigente del artista. Con riders por contexto puede haber varios vigentes a
/// la vez, así que se prefiere el general y, si no hay, el más reciente: la gira
/// que quiera el de festival lo engancha explícitamente.
export async function riderDeGira(giraId: string): Promise<{ riderId: string; giraNombre: string } | null> {
  const gira = await prisma.gira.findUnique({
    where: { id: giraId },
    select: { nombre: true, riderId: true, artistaId: true },
  });
  if (!gira) return null;
  if (gira.riderId) return { riderId: gira.riderId, giraNombre: gira.nombre };

  const vigentes = await prisma.artistaRider.findMany({
    where: { artistaId: gira.artistaId, activo: true, esActivo: true },
    orderBy: { version: "desc" },
    select: { id: true, contexto: true },
  });
  const elegido = vigentes.find((r) => r.contexto === "GENERAL") ?? vigentes[0];
  return elegido ? { riderId: elegido.id, giraNombre: gira.nombre } : null;
}
