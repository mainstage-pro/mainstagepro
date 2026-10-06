import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LayoutEscenario from "@/components/proyectos/LayoutEscenario";
import MedidasPlot from "./MedidasPlot";

export const dynamic = "force-dynamic";

/**
 * El stage plot de la fecha se dibuja con el MISMO editor que el escenario de un
 * proyecto de eventos: el formato guardado es idéntico (`{ piezas, areas }`), lo
 * único que cambia es a qué endpoint se autoguarda. Aquí no hay rider detrás —el
 * del artista se coteja en el advance, no se acomoda en metros— así que el editor
 * entra sin banco de equipos: se dibuja con el backline y zonas a mano.
 */
export default async function StagePlotEditorPage({
  params,
}: {
  params: Promise<{ id: string; showId: string; plotId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, showId, plotId } = await params;

  const plot = await prisma.showStagePlot.findFirst({
    where: { id: plotId, showId },
    select: {
      id: true,
      nombre: true,
      anchoM: true,
      largoM: true,
      alturaM: true,
      layout: true,
      notas: true,
      show: { select: { giraId: true } },
    },
  });
  if (!plot || plot.show.giraId !== id) notFound();

  return (
    <div className="p-4 md:p-6 flex flex-col gap-3">
      <Link
        href={`/giras/${id}/show/${showId}/stage-plot`}
        className="ms-micro text-[#666] hover:text-[#B3985B] flex items-center gap-1 w-fit"
      >
        <ChevronLeft size={12} /> Stage plots de la fecha
      </Link>

      <div>
        <h1 className="ms-h1">{plot.nombre}</h1>
        <p className="ms-subtitle">
          Planta del escenario de esta plaza, vista desde el público. Lo que coloques se guarda solo.
        </p>
      </div>

      <MedidasPlot
        plotId={plot.id}
        anchoM={plot.anchoM}
        largoM={plot.largoM}
        alturaM={plot.alturaM}
      />

      {plot.notas ? (
        <p className="ms-micro text-[#666] whitespace-pre-wrap">{plot.notas}</p>
      ) : null}

      <LayoutEscenario
        api={{ guardar: `/api/show-stage-plots/${plot.id}` }}
        nombre={plot.nombre}
        anchoM={plot.anchoM}
        largoM={plot.largoM}
        layoutInicial={plot.layout}
        rider={[]}
      />
    </div>
  );
}
