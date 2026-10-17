import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtFechaLarga } from "@/lib/giras";
import NotasShowPanel from "@/components/giras/NotasShowPanel";

export const dynamic = "force-dynamic";

export default async function NotasShowPage({
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
      fecha: true,
      ciudad: true,
      venue: { select: { nombre: true, ciudad: true } },
      gira: { select: { nombre: true } },
    },
  });
  if (!show) notFound();

  const ciudad = show.ciudad ?? show.venue?.ciudad ?? null;

  return (
    <div className="ms-page space-y-4 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ms-h1">Notas y aprendizajes</h1>
          <p className="ms-subtitle">
            {ciudad ?? "Esta fecha"} · {fmtFechaLarga(show.fecha)}
            {show.venue?.nombre ? ` · ${show.venue.nombre}` : ""}
          </p>
        </div>
        <Link
          href={`/giras/${id}/notas`}
          className="shrink-0 text-[11px] text-[#666] hover:text-[#B3985B]"
        >
          Ver la autocrítica de toda la gira →
        </Link>
      </div>

      <NotasShowPanel showId={show.id} />
    </div>
  );
}
