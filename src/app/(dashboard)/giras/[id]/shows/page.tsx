import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resumirAdvance } from "@/lib/giras";
import ShowsClient, { type ShowEditable } from "./ShowsClient";

export const dynamic = "force-dynamic";

export default async function GiraShowsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      shows: {
        orderBy: [{ fecha: "asc" }, { orden: "asc" }],
        include: {
          venue: { select: { id: true, nombre: true, ciudad: true, estado: true, capacidadPersonas: true } },
          riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
          _count: { select: { crew: true, momentos: true } },
        },
      },
    },
  });

  if (!gira) notFound();

  const shows: ShowEditable[] = gira.shows.map((s) => {
    const resumen = resumirAdvance(s.riderLineas);
    return {
      id: s.id,
      fecha: s.fecha.toISOString(),
      ciudad: s.ciudad,
      venueId: s.venueId,
      venueNombre: s.venue?.nombre ?? null,
      venueCapacidad: s.venue?.capacidadPersonas ?? null,
      estado: s.estado,
      tipoShow: s.tipoShow,
      aforoEsperado: s.aforoEsperado,
      promotorNombre: s.promotorNombre,
      promotorContacto: s.promotorContacto,
      promotorTelefono: s.promotorTelefono,
      promotorEmail: s.promotorEmail,
      contactoCasaNombre: s.contactoCasaNombre,
      contactoCasaTelefono: s.contactoCasaTelefono,
      contactoCasaEmail: s.contactoCasaEmail,
      notas: s.notas,
      riderEnviado: !!s.riderEnviadoEn,
      crew: s._count.crew,
      momentos: s._count.momentos,
      renglones: resumen.total,
      avance: resumen.avance,
      semaforo: resumen.semaforo,
      indispensablesAbiertos: resumen.indispensablesTotal - resumen.indispensablesResueltas,
    };
  });

  return <ShowsClient giraId={gira.id} shows={shows} />;
}
