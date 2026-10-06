import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsearContenido } from "@/lib/site-plan";
import { fmtFechaCorta } from "@/lib/giras";
import ListaSitePlanes, { type FilaPlan, type Plantilla } from "@/components/site-plan/ListaSitePlanes";

export const dynamic = "force-dynamic";

/**
 * El site plan de un proyecto de eventos. Es el mismo módulo que el de una fecha
 * de gira: un festival en un predio necesita exactamente el mismo plano, trazado
 * sobre la foto aérea y en píxeles de la imagen (no en metros).
 */
export default async function SitePlanProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      numeroProyecto: true,
      venueId: true,
      venue: { select: { nombre: true } },
    },
  });
  if (!proyecto) notFound();

  const planes = await prisma.sitePlan.findMany({
    where: { proyectoId: id, activo: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, nombre: true, fondoUrl: true, escalaMPorPx: true, contenido: true, updatedAt: true },
  });

  // Plantillas del venue: planos sin dueño, reusables en cualquier evento del lugar.
  const plantillas = proyecto.venueId
    ? await prisma.sitePlan.findMany({
        where: { venueId: proyecto.venueId, showId: null, proyectoId: null, activo: true },
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
    venue: proyecto.venue?.nombre ?? "Venue",
  }));

  return (
    <div className="flex flex-col">
      <div className="px-4 md:px-6 pt-4 md:pt-6">
        <Link
          href={`/proyectos/${id}`}
          className="ms-micro text-[#666] hover:text-[#B3985B] flex items-center gap-1 w-fit"
        >
          <ChevronLeft size={12} /> {proyecto.nombre || proyecto.numeroProyecto}
        </Link>
      </div>
      <ListaSitePlanes
        proyectoId={id}
        base={`/proyectos/${id}/site-plan`}
        planes={filas}
        plantillas={filasPlantilla}
      />
    </div>
  );
}
