import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INCLUDE_CREW, candidatosCrew } from "@/lib/logistica-gira";
import CrewPanel from "@/components/giras/CrewPanel";

export const dynamic = "force-dynamic";

export default async function CrewGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      shows: { orderBy: { fecha: "asc" }, select: { id: true, fecha: true, ciudad: true } },
    },
  });

  if (!gira) notFound();

  const [crew, candidatos] = await Promise.all([
    prisma.giraCrew.findMany({
      where: { giraId: id, activo: true },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: INCLUDE_CREW,
    }),
    candidatosCrew(id),
  ]);

  return (
    <div className="ms-page space-y-5 pb-16">
      <div>
        <h1 className="ms-h1">Crew de la gira</h1>
        <p className="ms-subtitle">
          Quién va, de dónde sale y con qué función. Un renglón sin plaza viaja toda la gira; uno con plaza es refuerzo
          de ese día.
        </p>
      </div>

      <CrewPanel
        giraId={id}
        alcance="GIRA"
        crewInicial={crew}
        personas={candidatos.personas}
        roles={candidatos.roles}
        plazas={gira.shows}
      />
    </div>
  );
}
