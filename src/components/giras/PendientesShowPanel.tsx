"use client";

import ListaPendientes, { usePendientesGira, type Usuario } from "./ListaPendientes";

/**
 * Los pendientes de una sola fecha. Lee las tareas de la gira y se queda nada
 * más con las que traen este `giraShowId`: lo general de la gira se lleva en la
 * pestaña de la gira, aquí no estorba.
 */
export default function PendientesShowPanel({
  giraId, giraNombre, showId, showLabel, usuarios,
}: {
  giraId: string;
  giraNombre: string;
  showId: string;
  showLabel: string;
  usuarios: Usuario[];
}) {
  const { tareas, crear, alternar, upsert, quitar } = usePendientesGira(giraId);

  return (
    <div className="ms-card overflow-hidden">
      <ListaPendientes
        giraId={giraId}
        giraNombre={giraNombre}
        showId={showId}
        showLabel={showLabel}
        usuarios={usuarios}
        tareas={tareas.filter(t => t.giraShowId === showId)}
        crear={crear}
        alternar={alternar}
        upsert={upsert}
        quitar={quitar}
      />
    </div>
  );
}
