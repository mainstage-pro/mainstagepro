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
import { listasPrePatchDelShow } from "@/lib/pre-patch";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
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
      gira: {
        select: {
          id: true,
          nombre: true,
          artistaId: true,
          conPrePatch: true,
          artista: { select: { nombre: true } },
        },
      },
    },
  });

  if (!show) notFound();

  const [rider, invitados, canales, prePatch] = await Promise.all([
    riderMaestroDelShow(showId),
    invitadosDelShow(showId),
    canalesDelShow(showId),
    listasPrePatchDelShow(showId, id),
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
          El rider es el mismo para toda la gira, pero la noche no: se sube el telonero, cae un featuring en la tercera
          canción, el venue solo tiene otro micrófono, aquí el canal de coros no se usa. Esta es la lista de ESTA
          fecha: se edita renglón por renglón sin mover el rider de la gira, y lo que no se anote aquí se descubre el
          día del show.
        </p>
      </div>

      {rider ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="ms-micro min-w-0">
            La base es{" "}
            <Link href={`/giras/artista/${show.gira.artistaId}/rider/${rider.riderId}`} className="ms-link-gold">
              {rider.nombre} (v{rider.version})
            </Link>
            {rider.deLaGira ? ", el rider enganchado a la gira." : ", el rider vigente del artista."} Lo que cambies
            aquí vale solo en esta fecha.
          </p>

          {/* El papel que pide el ingeniero del venue para parchar. Sale de la
              lista unificada, así que lleva los ajustes de esta plaza. */}
          <BotonDocumentoGira
            url={`/api/gira-shows/${show.id}/documentos/input-list`}
            label="Input y output list PDF"
            nota="La lista tal como queda en esta fecha, con lo agregado y lo ajustado aquí."
            className="shrink-0 max-w-xs"
          />
        </div>
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

      <InvitadosShow
        showId={show.id}
        giraId={show.giraId}
        invitadosIniciales={invitados}
        listasIniciales={listas}
        conPrePatch={show.gira.conPrePatch}
        prePatchInicial={prePatch}
      />
    </div>
  );
}
