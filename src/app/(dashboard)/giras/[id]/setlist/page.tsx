import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INCLUDE_SETLIST } from "@/lib/logistica-gira";
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
      <div>
        <h1 className="ms-h1">Setlist</h1>
        <p className="ms-subtitle">
          El repertorio se teclea una vez en el base, con sus notas de audio, luces y video. El show que necesite otro
          orden o menos tiempo lo copia desde su propio día.
        </p>
      </div>

      <SetlistPanel giraId={id} alcance="GIRA" setlistsIniciales={setlists} />
    </div>
  );
}
