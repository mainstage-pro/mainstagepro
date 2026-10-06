import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsearContenido } from "@/lib/site-plan";
import { fmtFechaCorta } from "@/lib/giras";
import ListaSitePlanes, { type FilaPlan, type Plantilla } from "@/components/site-plan/ListaSitePlanes";

export const dynamic = "force-dynamic";

export default async function SitePlanShowPage({
  params,
}: {
  params: Promise<{ id: string; showId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, showId } = await params;

  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, giraId: true, venueId: true, venue: { select: { nombre: true } } },
  });
  if (!show || show.giraId !== id) notFound();

  const planes = await prisma.sitePlan.findMany({
    where: { showId, activo: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, nombre: true, fondoUrl: true, escalaMPorPx: true, contenido: true, updatedAt: true },
  });

  // Plantillas del venue: planos sin dueño, reusables en cualquier fecha del lugar.
  const plantillas = show.venueId
    ? await prisma.sitePlan.findMany({
        where: { venueId: show.venueId, showId: null, proyectoId: null, activo: true },
        orderBy: { updatedAt: "desc" },
        select: { id: true, nombre: true },
      })
    : [];

  const filas: FilaPlan[] = planes.map(p => ({
    id: p.id,
    nombre: p.nombre,
    fondoUrl: p.fondoUrl,
    escalaMPorPx: p.escalaMPorPx,
    objetos: parsearContenido(p.contenido).objetos.length,
    actualizado: fmtFechaCorta(p.updatedAt),
  }));

  const filasPlantilla: Plantilla[] = plantillas.map(p => ({
    id: p.id,
    nombre: p.nombre,
    venue: show.venue?.nombre ?? "Venue",
  }));

  return (
    <ListaSitePlanes
      showId={showId}
      base={`/giras/${id}/show/${showId}/site-plan`}
      planes={filas}
      plantillas={filasPlantilla}
    />
  );
}
