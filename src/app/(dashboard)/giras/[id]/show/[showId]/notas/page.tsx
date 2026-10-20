import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtFechaLarga } from "@/lib/giras";
import { parseGiraShowEvaluacion, showEvaluacionTieneContenido } from "@/lib/gira-evaluacion";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
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
      evaluacion: true,
      venue: { select: { nombre: true, ciudad: true } },
      gira: { select: { nombre: true } },
    },
  });
  if (!show) notFound();

  const ciudad = show.ciudad ?? show.venue?.ciudad ?? null;
  const hayContenido = showEvaluacionTieneContenido(parseGiraShowEvaluacion(show.evaluacion));

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
        <div className="flex flex-col items-end gap-2 shrink-0">
          <BotonDocumentoGira
            url={`/api/gira-shows/${show.id}/documentos/notas-show`}
            label="Generar documento"
            falta={hayContenido ? null : "hallazgos o comentarios capturados aquí"}
          />
          <Link href={`/giras/${id}/notas`} className="text-[11px] text-[#666] hover:text-[#B3985B]">
            Ver la autocrítica de toda la gira →
          </Link>
        </div>
      </div>

      <NotasShowPanel showId={show.id} />
    </div>
  );
}
