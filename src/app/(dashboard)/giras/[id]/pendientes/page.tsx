import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { esGira } from "@/lib/giras";
import { sembrarChecklistGira } from "@/lib/gira-checklist";
import PendientesGiraPanel from "@/components/giras/PendientesGiraPanel";

export const dynamic = "force-dynamic";

/**
 * El tablero del advance: el checklist de qué hay que arrancarle a management, al
 * venue y al promotor, más los pendientes que se capturan a mano. Los pendientes
 * son tareas normales (tipoOrigen GIRA), así que se ven igual en Gestión Operativa
 * una vez que tienen fecha y responsable.
 */
export default async function PendientesGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      shows: {
        orderBy: { fecha: "asc" },
        select: { id: true, fecha: true, ciudad: true, venue: { select: { nombre: true } } },
      },
    },
  });

  if (!gira) notFound();

  const [items, usuarios] = await Promise.all([
    sembrarChecklistGira(id),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const tour = esGira(gira.tipo);

  return (
    <div className="ms-page space-y-5 pb-16">
      <div>
        <h1 className="ms-h1">Pendientes y checklist del advance</h1>
        <p className="ms-subtitle">
          {tour
            ? "Los puntos del rider del artista, fecha por fecha, y lo que falta arrancarle a management, al venue y al promotor. Un renglón de la gira se pide una vez; uno de la fecha se coteja con cada venue."
            : "Los puntos del rider del artista y lo que falta arrancarle a management, al venue y al promotor antes de la fecha."}
        </p>
      </div>

      <PendientesGiraPanel
        giraId={id}
        giraNombre={gira.nombre}
        esTour={tour}
        shows={gira.shows.map(s => ({
          id: s.id,
          fecha: s.fecha.toISOString(),
          ciudad: s.ciudad,
          venue: s.venue?.nombre ?? null,
        }))}
        itemsIniciales={items.map(i => ({
          id: i.id,
          showId: i.showId,
          frente: i.frente,
          item: i.item,
          detalle: i.detalle,
          llave: i.llave,
          estado: i.estado,
          responsable: i.responsable,
          notas: i.notas,
        }))}
        usuarios={usuarios.map(u => ({ id: u.id, name: u.name ?? "Sin nombre" }))}
      />
    </div>
  );
}
