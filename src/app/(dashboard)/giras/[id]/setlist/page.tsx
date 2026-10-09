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

  // Solo el repertorio de la gira: el de cada noche se lee y se ajusta en la
  // pestaña Setlist de su fecha, que es donde se opera. Las fechas se traen
  // para poder marcar aquí a cuáles va cada renglón.
  const [setlists, shows] = await Promise.all([
    prisma.giraSetlist.findMany({
      where: { giraId: id, showId: null },
      orderBy: [{ esBase: "desc" }, { createdAt: "asc" }],
      include: INCLUDE_SETLIST,
    }),
    prisma.giraShow.findMany({
      where: { giraId: id },
      orderBy: { fecha: "asc" },
      select: { id: true, fecha: true, ciudad: true },
    }),
  ]);

  return (
    <div className="ms-page space-y-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ms-h1">Setlist base</h1>
          <p className="ms-subtitle">
            El repertorio se teclea una vez aquí, con sus notas de audio, luces, video y las generales, y los momentos
            que no se cantan —intro, presentación, pausas— van en la misma lista: son los que parten el show en
            bloques. Aquí está todo lo de la gira; si una canción es de una sola noche márcalo en la columna Fechas y
            solo esa fecha la recibe.
          </p>
        </div>

        {/* El repertorio base de la gira. El de una fecha se baja desde la
            pestaña Setlist de ese show. */}
        <BotonDocumentoGira
          url={`/api/giras/${id}/documentos/setlist`}
          label="Setlist PDF"
          falta={
            setlists.every((s) => s.canciones.length === 0) ? "capturar el repertorio del base" : null
          }
          className="shrink-0 max-w-xs"
        />
      </div>

      <SetlistPanel giraId={id} alcance="GIRA" setlistsIniciales={setlists} shows={shows} />
    </div>
  );
}
