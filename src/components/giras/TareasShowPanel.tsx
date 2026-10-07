"use client";

import ListaTareasGira, { useTareasGira, type Usuario } from "./ListaTareasGira";

/**
 * Las tareas de una sola fecha. Lee las tareas de la gira y se queda nada más
 * con las que traen este `giraShowId`: lo general de la gira se lleva en la
 * pestaña de la gira, aquí no estorba.
 */
export default function TareasShowPanel({
  giraId, giraNombre, showId, showLabel, usuarios,
}: {
  giraId: string;
  giraNombre: string;
  showId: string;
  showLabel: string;
  usuarios: Usuario[];
}) {
  const { tareas, alternar, upsert, quitar, eliminar } = useTareasGira(giraId);

  return (
    <ListaTareasGira
      giraId={giraId}
      giraNombre={giraNombre}
      showId={showId}
      showLabel={showLabel}
      usuarios={usuarios}
      tareas={tareas.filter(t => t.giraShowId === showId)}
      alternar={alternar}
      upsert={upsert}
      quitar={quitar}
      eliminar={eliminar}
    />
  );
}
