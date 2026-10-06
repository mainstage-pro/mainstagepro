"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPin } from "lucide-react";
import ListaPendientes, {
  abiertos,
  fechaCorta,
  usePendientesGira,
  type Usuario,
} from "./ListaPendientes";

export interface ShowLigero {
  id: string;
  fecha: string;
  ciudad: string | null;
  venue: string | null;
}

/**
 * Los pendientes de la gira en dos niveles: lo general, que vale para todos los
 * venues, y una fecha por renglón para lo que cada casa contesta distinto. Solo
 * entra lo que se escribe a mano — nada se siembra.
 */
export default function PendientesGiraPanel({
  giraId, giraNombre, esTour, shows, usuarios,
}: {
  giraId: string;
  giraNombre: string;
  esTour: boolean;
  shows: ShowLigero[];
  usuarios: Usuario[];
}) {
  const { tareas, refrescar, crear, alternar } = usePendientesGira(giraId);
  // Las fechas nacen colapsadas: con 5 shows, abrir todo es ilegible.
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const venues = useMemo(
    () => new Set(shows.map(s => s.venue ?? s.ciudad).filter(Boolean)).size,
    [shows],
  );

  function toggleShow(id: string) {
    setExpandidos(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const tareasDeGira = tareas.filter(t => !t.giraShowId);

  return (
    <div className="space-y-6">
      {/* ── General: lo que vale para todas las fechas ───────────────────────── */}
      <section className="space-y-2">
        <div>
          <h2 className="ms-h2">{esTour ? "General de la gira" : "Del show"}</h2>
          <p className="ms-subtitle">
            {esTour
              ? `Lo que se pide una vez y sirve para ${venues === 1 ? "el venue" : `los ${venues} venues`}.`
              : "Lo que hay que cerrar antes de la fecha."}
          </p>
        </div>

        <div className="ms-card overflow-hidden">
          <ListaPendientes
            giraId={giraId}
            giraNombre={giraNombre}
            showId={null}
            showLabel={null}
            usuarios={usuarios}
            tareas={tareasDeGira}
            crear={crear}
            alternar={alternar}
            refrescar={refrescar}
          />
        </div>
      </section>

      {/* ── Por fecha ─────────────────────────────────────────────────────────── */}
      {shows.length > 0 && (
        <section className="space-y-2">
          <div>
            <h2 className="ms-h2">Por fecha</h2>
            <p className="ms-subtitle">
              Cada casa y cada promotor responden distinto: esto se controla venue por venue.
            </p>
          </div>

          {shows.map(s => {
            const tareasShow = tareas.filter(t => t.giraShowId === s.id);
            const vivos = abiertos(tareasShow).length;
            const abierto = expandidos.has(s.id);
            const etiquetaFecha = `${fechaCorta(s.fecha)}${s.ciudad ? ` · ${s.ciudad}` : ""}`;

            return (
              <div key={s.id} className="ms-card overflow-hidden">
                <button
                  onClick={() => toggleShow(s.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#141414] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{etiquetaFecha}</p>
                    {s.venue && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#666] mt-0.5">
                        <MapPin strokeWidth={1.75} className="w-3 h-3" /> {s.venue}
                      </span>
                    )}
                  </div>
                  <span className={`shrink-0 text-[11px] ${vivos > 0 ? "text-[#B3985B]" : "text-[#444]"}`}>
                    {vivos > 0 ? `${vivos} pendiente${vivos !== 1 ? "s" : ""}` : "Sin pendientes"}
                  </span>
                  <ChevronDown strokeWidth={2}
                    className={`w-4 h-4 text-[#444] shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`} />
                </button>

                {abierto && (
                  <div className="border-t border-[#141414]">
                    <ListaPendientes
                      giraId={giraId}
                      giraNombre={giraNombre}
                      showId={s.id}
                      showLabel={etiquetaFecha}
                      usuarios={usuarios}
                      tareas={tareasShow}
                      crear={crear}
                      alternar={alternar}
                      refrescar={refrescar}
                    />
                    <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-[#141414]">
                      <Link
                        href={`/giras/${giraId}/show/${s.id}/pendientes`}
                        className="text-[11px] text-[#B3985B] hover:underline"
                      >
                        Abrir la fecha →
                      </Link>
                      <Link
                        href={`/giras/${giraId}/show/${s.id}/advance`}
                        className="text-[11px] text-[#666] hover:text-[#B3985B]"
                      >
                        Advance técnico
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
