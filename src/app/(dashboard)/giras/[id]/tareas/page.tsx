import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { esGira } from "@/lib/giras";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
import TareasGiraPanel from "@/components/giras/TareasGiraPanel";

export const dynamic = "force-dynamic";

/**
 * Las tareas de la gira: lo general arriba y una fecha por renglón abajo.
 * Son tareas normales (tipoOrigen GIRA), así que se ven igual en Gestión
 * Operativa una vez que tienen fecha y responsable. Nada se siembra: solo entra
 * lo que se escribe aquí.
 */
export default async function TareasGiraPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [cuantos, usuarios] = await Promise.all([
    prisma.tarea.count({ where: { giraId: id, parentId: null, estado: { not: "CANCELADA" } } }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const tour = esGira(gira.tipo);

  return (
    <div className="ms-page space-y-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ms-h1">Tareas</h1>
          <p className="ms-subtitle">
            {tour
              ? "Lo general de la gira arriba y una fecha por renglón abajo. Cada tarea se abre para asignar responsable, fecha y evidencia."
              : "Lo que falta cerrar antes de la fecha. Cada tarea se abre para asignar responsable, fecha y evidencia."}
          </p>
        </div>

        {/* La lista de tareas es una sección del libro de gira: se recorta en
            vez de inventar otro documento. */}
        <BotonDocumentoGira
          url={`/api/giras/${id}/documentos/libro-gira`}
          query="secciones=pendientes"
          label="Tareas PDF"
          falta={cuantos === 0 ? "capturar al menos una tarea" : null}
          className="shrink-0 max-w-xs"
        />
      </div>

      <TareasGiraPanel
        giraId={id}
        giraNombre={gira.nombre}
        esTour={tour}
        shows={gira.shows.map(s => ({
          id: s.id,
          fecha: s.fecha.toISOString(),
          ciudad: s.ciudad,
          venue: s.venue?.nombre ?? null,
        }))}
        usuarios={usuarios.map(u => ({ id: u.id, name: u.name ?? "Sin nombre" }))}
      />
    </div>
  );
}
