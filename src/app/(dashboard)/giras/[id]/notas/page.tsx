import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { showEvaluacionTieneContenido, giraEvaluacionTieneContenido, type GiraShowEvaluacionData, type GiraEvaluacionData } from "@/lib/gira-evaluacion";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
import NotasGiraPanel from "@/components/giras/NotasGiraPanel";

export const dynamic = "force-dynamic";

export default async function NotasGiraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      evaluacion: true,
      shows: { select: { evaluacion: true } },
    },
  });
  if (!gira) notFound();

  const hayNotasDeShow = gira.shows.some((s) => showEvaluacionTieneContenido(s.evaluacion as GiraShowEvaluacionData | null));
  const hayContenido = hayNotasDeShow || giraEvaluacionTieneContenido(gira.evaluacion as GiraEvaluacionData | null);

  return (
    <div className="ms-page space-y-4 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ms-h1">Notas y aprendizajes</h1>
          <p className="ms-subtitle">Autocrítica general de {gira.nombre}. El detalle de cada fecha vive en la pestaña Notas de cada show.</p>
        </div>
        <BotonDocumentoGira
          url={`/api/giras/${id}/documentos/notas-aprendizajes`}
          label="Generar documento"
          falta={hayContenido ? null : "notas capturadas aquí o en algún show"}
        />
      </div>

      <NotasGiraPanel giraId={id} />
    </div>
  );
}
