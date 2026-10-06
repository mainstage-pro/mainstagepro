import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INCLUDE_CREW, INCLUDE_SETLIST, candidatosCrew } from "@/lib/logistica-gira";
import { fmtFechaLarga, ordenarBloques } from "@/lib/giras";
import { SELECT_MOMENTO } from "@/lib/show-momentos";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
import CrewPanel from "@/components/giras/CrewPanel";
import SetlistPanel from "@/components/giras/SetlistPanel";
import DiaShowTabla from "./DiaShowTabla";

export const dynamic = "force-dynamic";

export default async function DiaShowPage({ params }: { params: Promise<{ id: string; showId: string }> }) {
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
      venue: { select: { id: true, nombre: true, ciudad: true } },
      gira: { select: { id: true, nombre: true, artista: { select: { nombre: true } } } },
      momentos: { select: SELECT_MOMENTO, orderBy: { orden: "asc" } },
    },
  });

  if (!show) notFound();

  // El crew del show son los que viajan toda la gira más los refuerzos de ese
  // día: el day sheet se reparte a los dos grupos por igual.
  const [crew, setlists, candidatos] = await Promise.all([
    prisma.giraCrew.findMany({
      where: { giraId: id, activo: true, OR: [{ showId: null }, { showId }] },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: INCLUDE_CREW,
    }),
    prisma.giraSetlist.findMany({
      where: { giraId: id, OR: [{ showId }, { esBase: true }] },
      orderBy: [{ esBase: "desc" }, { createdAt: "asc" }],
      include: INCLUDE_SETLIST,
    }),
    candidatosCrew(id),
  ]);

  const ciudad = show.ciudad ?? show.venue?.ciudad ?? null;

  return (
    <div className="ms-page space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <Link href={`/giras/${id}/show/${showId}`} className="ms-link-gold text-xs">
            ← Resumen del show
          </Link>
          <h1 className="ms-h1">Día del show</h1>
          <p className="ms-subtitle">
            {show.gira.artista.nombre} · {fmtFechaLarga(show.fecha)}
            {show.venue?.nombre ? ` · ${show.venue.nombre}` : ""}
            {ciudad ? `, ${ciudad}` : ""}
          </p>
        </div>

        {/* Lo que se arma en esta pestaña —corrida, crew y a quién se le marca—
            es exactamente el day sheet, así que se baja desde aquí. */}
        <BotonDocumentoGira
          url={`/api/gira-shows/${show.id}/documentos/day-sheet`}
          label="Day sheet PDF"
          falta={show.momentos.length === 0 ? "capturar la corrida del día" : null}
          className="shrink-0 max-w-xs"
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="ms-h2">Corrida del día</h2>
          <p className="ms-meta">
            El day sheet que se reparte: a qué hora pasa cada cosa, quién contesta por ella y dónde. Los momentos
            marcados «ancla» son los mismos que salen como horarios en la ficha del show.
          </p>
        </div>
        <DiaShowTabla showId={show.id} momentosIniciales={ordenarBloques(show.momentos)} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="ms-h2">Quién trabaja este show</h2>
          <p className="ms-meta">
            Los que viajan toda la gira salen aquí solos; lo que agregues sin cambiar el alcance queda como refuerzo de
            este día.
          </p>
        </div>
        <CrewPanel
          giraId={id}
          alcance="SHOW"
          showId={show.id}
          crewInicial={crew}
          personas={candidatos.personas}
          roles={candidatos.roles}
          shows={[{ id: show.id, fecha: show.fecha, ciudad }]}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="ms-h2">Setlist de la noche</h2>
            <p className="ms-meta">
              Si este show toca el repertorio de la gira, se lee el base. Copíalo solo cuando el orden o el tiempo
              cambien.
            </p>
          </div>
          {/* El setlist de la fecha: si este show no capturó el suyo, el PDF
              imprime el base y lo dice. */}
          <BotonDocumentoGira
            url={`/api/gira-shows/${show.id}/documentos/setlist`}
            label="Setlist PDF"
            falta={setlists.every((s) => s.canciones.length === 0) ? "capturar el repertorio" : null}
            className="shrink-0 max-w-xs"
          />
        </div>
        <SetlistPanel giraId={id} alcance="SHOW" showId={show.id} setlistsIniciales={setlists} />
      </section>
    </div>
  );
}
