import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asegurarSetlistDeFecha } from "@/lib/logistica-gira";
import { fmtFechaLarga } from "@/lib/giras";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
import SetlistPanel from "@/components/giras/SetlistPanel";

export const dynamic = "force-dynamic";

export default async function SetlistShowPage({ params }: { params: Promise<{ id: string; showId: string }> }) {
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
      gira: { select: { artista: { select: { nombre: true } } } },
    },
  });
  if (!show) notFound();

  // La fecha abre con su propio repertorio: si todavía no lo tiene se copia del
  // base de la gira al entrar, como el esqueleto de horarios del día.
  const [setlist, invitados] = await Promise.all([
    asegurarSetlistDeFecha(id, showId),
    prisma.showInvitado.findMany({
      where: { showId },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      select: { nombre: true, rol: true },
    }),
  ]);

  const ciudad = show.ciudad ?? show.venue?.ciudad ?? null;

  return (
    <div className="ms-page space-y-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ms-h1">Setlist de la fecha</h1>
          <p className="ms-subtitle">
            {show.gira.artista.nombre} · {fmtFechaLarga(show.fecha)}
            {show.venue?.nombre ? ` · ${show.venue.nombre}` : ""}
            {ciudad ? `, ${ciudad}` : ""}
          </p>
        </div>

        <BotonDocumentoGira
          url={`/api/gira-shows/${show.id}/documentos/setlist`}
          label="Setlist PDF"
          falta={setlist.canciones.length === 0 ? "capturar el repertorio" : null}
          className="shrink-0 max-w-xs"
        />
      </div>

      <SetlistPanel
        giraId={id}
        alcance="SHOW"
        showId={show.id}
        setlistsIniciales={[setlist]}
        invitados={invitados}
      />
    </div>
  );
}
