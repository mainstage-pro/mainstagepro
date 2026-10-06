import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtFechaLarga } from "@/lib/giras";
import {
  canalesDelShow,
  invitadosDelShow,
  riderMaestroDelShow,
  unificarCanales,
} from "@/lib/show-canales";
import InvitadosShow from "@/components/giras/InvitadosShow";

export const dynamic = "force-dynamic";

/**
 * Quién se sube al escenario en esta fecha y qué canales consume.
 *
 * El rider maestro define la lista de canales de toda la gira; lo que esta fecha
 * trae encima —el telonero, el featuring, el presentador— no está en ningún lado
 * hasta que se captura aquí. La lista real de la noche es la del rider más estos.
 */
export default async function InvitadosShowPage({
  params,
}: {
  params: Promise<{ id: string; showId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, showId } = await params;

  const show = await prisma.giraShow.findFirst({
    where: { id: showId, giraId: id },
    select: {
      id: true,
      giraId: true,
      fecha: true,
      ciudad: true,
      venue: { select: { nombre: true, ciudad: true } },
      gira: { select: { id: true, nombre: true, artistaId: true, artista: { select: { nombre: true } } } },
    },
  });

  if (!show) notFound();

  const [rider, invitados, canales] = await Promise.all([
    riderMaestroDelShow(showId),
    invitadosDelShow(showId),
    canalesDelShow(showId),
  ]);

  const listas = unificarCanales(rider?.canales ?? [], canales, invitados);
  const ciudad = show.ciudad ?? show.venue?.ciudad ?? null;

  return (
    <div className="ms-page space-y-6 pb-16">
      <div className="flex flex-col gap-1">
        <Link href={`/giras/${id}/show/${showId}`} className="ms-link-gold text-xs">
          ← Resumen del show
        </Link>
        <h1 className="ms-h1">Invitados y canales de la fecha</h1>
        <p className="ms-subtitle">
          {show.gira.artista.nombre} · {fmtFechaLarga(show.fecha)}
          {show.venue?.nombre ? ` · ${show.venue.nombre}` : ""}
          {ciudad ? `, ${ciudad}` : ""}
        </p>
        <p className="ms-meta max-w-3xl">
          El rider maestro es el mismo para toda la gira. Lo que cambia de plaza en plaza es quién más se sube: el
          telonero, el featuring que cae en la tercera canción, el presentador. Cada uno consume canales de consola que
          el rider no contempla, y si no se anotan aquí se descubren el día del show.
        </p>
      </div>

      {rider ? (
        <p className="ms-micro">
          Se numera a continuación de{" "}
          <Link href={`/giras/artista/${show.gira.artistaId}/rider/${rider.riderId}`} className="ms-link-gold">
            {rider.nombre} (v{rider.version})
          </Link>
          {rider.deLaGira ? ", el rider enganchado a la gira." : ", el rider vigente del artista."}
        </p>
      ) : (
        <div className="ms-card-deep p-3">
          <p className="ms-label mb-1 text-amber-300">Sin rider maestro</p>
          <p className="ms-meta">
            Esta gira no trae rider enganchado y el artista no tiene uno vigente, así que la numeración de los canales
            de esta fecha arranca en 1 y la lista de abajo está incompleta: le falta la base. Engancha el rider antes
            de capturar los canales de los invitados — los que ya estén capturados se recorren al siguiente cambio.
          </p>
        </div>
      )}

      <InvitadosShow showId={show.id} invitadosIniciales={invitados} listasIniciales={listas} />
    </div>
  );
}
