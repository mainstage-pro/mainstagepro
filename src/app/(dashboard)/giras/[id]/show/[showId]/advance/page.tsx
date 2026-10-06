import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fmtFechaLarga } from "@/lib/giras";
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

  return (
    <div className="ms-page space-y-5 pb-16">
      <div className="flex flex-col gap-1">
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
      />
    </div>
  );
}
