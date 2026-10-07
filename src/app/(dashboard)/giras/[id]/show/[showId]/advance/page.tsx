import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fmtFechaLarga } from "@/lib/giras";
import { panelDelShow } from "@/lib/advance-gira";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
import AdvanceDisciplinas from "./AdvanceDisciplinas";

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
      venue: { select: { nombre: true, ciudad: true } },
      gira: { select: { nombre: true, artista: { select: { nombre: true } } } },
      _count: { select: { repartos: true } },
    },
  });

  if (!show) notFound();

  const panel = await panelDelShow(show.id);
  if (!panel) notFound();

  const ciudad = show.ciudad ?? show.venue?.ciudad ?? null;

  return (
    <div className="ms-page space-y-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <Link href={`/giras/${show.giraId}/advance`} className="ms-link-gold text-xs">
            ← Advance de toda la gira
          </Link>
          <h1 className="ms-h1">Advance técnico</h1>
          <p className="ms-subtitle">
            {show.gira.artista.nombre} · {show.gira.nombre} · {fmtFechaLarga(show.fecha)}
            {show.venue?.nombre ? ` · ${show.venue.nombre}` : ""}
            {ciudad ? `, ${ciudad}` : ""}
          </p>
          <p className="ms-micro text-[#8b8f97]">
            Un renglón por bloque del departamento, no por caja: lo que se negocia con el jefe técnico del foro es «el
            PA y la consola los pones tú, la microfonía la traemos».
          </p>
        </div>

        <BotonDocumentoGira
          url={`/api/gira-shows/${show.id}/documentos/advance`}
          label="Advance PDF"
          falta={show._count.repartos === 0 ? "repartir al menos un departamento" : null}
          className="shrink-0 max-w-xs"
        />
      </div>

      <AdvanceDisciplinas showId={show.id} giraId={show.giraId} panel={panel} />
    </div>
  );
}
