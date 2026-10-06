import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fmtFechaLarga } from "@/lib/giras";
import { riderDeLaGira } from "@/lib/advance-gira";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
import AdvanceTabla from "./AdvanceTabla";

export const dynamic = "force-dynamic";

export default async function AdvanceShowPage({
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
      estado: true,
      advanceCerradoEn: true,
      venue: { select: { id: true, nombre: true, ciudad: true, _count: { select: { inventario: true } } } },
      gira: {
        select: {
          id: true,
          nombre: true,
          riderId: true,
          artista: { select: { id: true, nombre: true } },
        },
      },
      riderLineas: {
        orderBy: [{ disciplina: "asc" }, { orden: "asc" }],
        include: {
          riderLinea: {
            select: { id: true, concepto: true, cantidad: true, prioridad: true, preferido: true, aceptables: true },
          },
        },
      },
    },
  });

  if (!show) notFound();

  const ciudad = show.ciudad ?? show.venue?.ciudad ?? null;

  // Lo que el rider pide pero se decidió que no se coteja con la casa. No tiene
  // renglón de trabajo en ninguna fecha, así que se lee del rider directo.
  const rider = await riderDeLaGira({ riderId: show.gira.riderId, artistaId: show.gira.artista.id });
  const fuera = rider
    ? await prisma.artistaRiderLinea.findMany({
        where: { riderId: rider.id, enAdvance: false },
        orderBy: [{ disciplina: "asc" }, { orden: "asc" }],
        select: { id: true, disciplina: true, concepto: true, cantidad: true },
      })
    : [];

  return (
    <div className="ms-page space-y-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <Link href={`/giras/${show.giraId}/advance`} className="ms-link-gold text-xs">
            ← Advance consolidado
          </Link>
          <h1 className="ms-h1">Advance técnico</h1>
          <p className="ms-subtitle">
            {show.gira.artista.nombre} · {show.gira.nombre} · {fmtFechaLarga(show.fecha)}
            {show.venue?.nombre ? ` · ${show.venue.nombre}` : ""}
            {ciudad ? `, ${ciudad}` : ""}
          </p>
        </div>

        {/* El papel de esta misma pestaña: lo que pide el rider contra lo que
            pone la casa. Sin renglones cotejados no hay nada que imprimir. */}
        <BotonDocumentoGira
          url={`/api/gira-shows/${show.id}/documentos/advance`}
          label="Advance PDF"
          falta={show.riderLineas.length === 0 ? "armar el advance desde el rider maestro" : null}
          className="shrink-0 max-w-xs"
        />
      </div>

      <AdvanceTabla
        showId={show.id}
        giraId={show.giraId}
        venue={
          show.venue
            ? { id: show.venue.id, nombre: show.venue.nombre, itemsInventario: show.venue._count.inventario }
            : null
        }
        tieneRider={!!show.gira.riderId}
        lineasIniciales={show.riderLineas}
        fueraIniciales={fuera}
      />
    </div>
  );
}
