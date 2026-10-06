import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INCLUDE_CREW, candidatosCrew } from "@/lib/logistica-gira";
import { esGira } from "@/lib/giras";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
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
      tipo: true,
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ms-h1">{esGira(gira.tipo) ? "Crew de la gira" : "Crew del show"}</h1>
          <p className="ms-subtitle">
            {esGira(gira.tipo)
              ? "Quién va, de dónde sale y con qué función. Un renglón sin show viaja toda la gira; uno con show es refuerzo de ese día."
              : "Quién va, de dónde sale y con qué función."}
          </p>
        </div>

        {/* "Crew y contactos" es una sección del libro de gira: el directorio
            se baja recortando el libro, no con otro documento. */}
        <BotonDocumentoGira
          url={`/api/giras/${id}/documentos/libro-gira`}
          query="secciones=crew"
          label="Crew y contactos PDF"
          falta={crew.length === 0 ? "dar de alta a alguien en el crew" : null}
          className="shrink-0 max-w-xs"
        />
      </div>

      <CrewPanel
        giraId={id}
        alcance="GIRA"
        crewInicial={crew}
        personas={candidatos.personas}
        roles={candidatos.roles}
        shows={gira.shows}
      />
    </div>
  );
}
