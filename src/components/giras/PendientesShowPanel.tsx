"use client";

import ChecklistAdvance, { type ItemChecklist } from "./ChecklistAdvance";
import ListaPendientes, { usePendientesGira, type Usuario } from "./ListaPendientes";

/**
 * Los pendientes de una sola fecha. Lee las tareas de la gira y se queda nada
 * más con las que traen este `giraShowId`: lo general de la gira se lleva en la
 * pestaña de la gira, aquí no estorba.
 */
export default function PendientesShowPanel({
  giraId, giraNombre, showId, showLabel, usuarios, itemsIniciales,
}: {
  giraId: string;
  giraNombre: string;
  showId: string;
  showLabel: string;
  usuarios: Usuario[];
  itemsIniciales: ItemChecklist[];
}) {
  const { tareas, refrescar, crear, alternar } = usePendientesGira(giraId);

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
        refrescar={refrescar}
      />
      <ChecklistAdvance
        giraId={giraId}
        showId={showId}
        itemsIniciales={itemsIniciales}
        etiqueta="Checklist del advance de esta fecha"
      />
    </div>
  );
}
