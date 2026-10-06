import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsearLayout } from "@/lib/layout-escenario";
import { fmtFechaCorta } from "@/lib/giras";
import ListaStagePlots, { type FilaPlot } from "./ListaStagePlots";

export const dynamic = "force-dynamic";

export default async function StagePlotShowPage({
  params,
}: {
  params: Promise<{ id: string; showId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, showId } = await params;

  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, giraId: true, venue: { select: { medidasEscenario: true } } },
  });
  if (!show || show.giraId !== id) notFound();

  const plots = await prisma.showStagePlot.findMany({
    where: { showId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      nombre: true,
      anchoM: true,
      largoM: true,
      alturaM: true,
      notas: true,
      layout: true,
      updatedAt: true,
    },
  });

  const filas: FilaPlot[] = plots.map(p => ({
    id: p.id,
    nombre: p.nombre,
    anchoM: p.anchoM,
    largoM: p.largoM,
    alturaM: p.alturaM,
    notas: p.notas,
    piezas: parsearLayout(p.layout).piezas.length,
    actualizado: fmtFechaCorta(p.updatedAt),
  }));

  return (
    <ListaStagePlots
      showId={showId}
      base={`/giras/${id}/show/${showId}/stage-plot`}
      medidasVenue={show.venue?.medidasEscenario ?? null}
      plots={filas}
    />
  );
}
