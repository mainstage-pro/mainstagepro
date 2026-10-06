import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INCLUDE_SETLIST } from "@/lib/logistica-gira";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
import SetlistPanel from "@/components/giras/SetlistPanel";

export const dynamic = "force-dynamic";

export default async function SetlistGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true } });
  if (!gira) notFound();

  const setlists = await prisma.giraSetlist.findMany({
    where: { giraId: id },
    orderBy: [{ esBase: "desc" }, { createdAt: "asc" }],
    include: INCLUDE_SETLIST,
  });

  return (
    <div className="ms-page space-y-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ms-h1">Setlist</h1>
          <p className="ms-subtitle">
            El repertorio se teclea una vez en el base, con sus notas de audio, luces y video, y los momentos que no se
            cantan —intro, presentación, pausas— van en la misma lista: son los que parten el show en bloques. El show que
            necesite otro orden o menos tiempo lo copia desde su propio día.
          </p>
        </div>

        {/* El repertorio base de la gira. El de una fecha se baja desde el día
            de ese show, que es donde se copia la variante. */}
        <BotonDocumentoGira
          url={`/api/giras/${id}/documentos/setlist`}
          label="Setlist PDF"
          falta={
            setlists.every((s) => s.canciones.length === 0) ? "capturar el repertorio del base" : null
          }
          className="shrink-0 max-w-xs"
        />
      </div>

      <SetlistPanel giraId={id} alcance="GIRA" setlistsIniciales={setlists} />
    </div>
  );
}
