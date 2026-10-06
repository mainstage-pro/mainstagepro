"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, User } from "lucide-react";
import NuevaTareaModal from "../../app/(dashboard)/operaciones/components/NuevaTareaModal";

export interface PendienteGira {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  fecha: string | null;
  giraShowId: string | null;
  asignadoA: { id: string; name: string } | null;
}

export interface Usuario {
  id: string;
  name: string;
}

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#f87171",
  ALTA: "#fb923c",
  MEDIA: "#B3985B",
  BAJA: "#555",
};

export function fechaCorta(iso: string): string {
  return new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export const abiertos = (lista: PendienteGira[]) => lista.filter((t) => t.estado !== "COMPLETADA");

/**
 * Los pendientes de una gira, con el alcance como filtro: `giraShowId` nulo son
 * los de toda la gira y con valor los de una sola fecha. Son tareas normales
 * (tipoOrigen GIRA), así que llegan a Gestión Operativa en cuanto se les pone
 * fecha y responsable.
 */
export function usePendientesGira(giraId: string) {
  const [tareas, setTareas] = useState<PendienteGira[]>([]);

  const refrescar = useCallback(async () => {
    const res = await fetch(`/api/giras/${giraId}/tareas`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setTareas(d.tareas ?? []);
    }
  }, [giraId]);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  const crear = useCallback(
    async (titulo: string, giraShowId: string | null) => {
      const res = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, giraId, giraShowId, tipoOrigen: "GIRA", area: "PRODUCCION" }),
      });
      if (res.ok) {
        const d = await res.json();
        setTareas((prev) => [...prev, d.tarea]);
      }
    },
    [giraId],
  );

  const alternar = useCallback(async (t: PendienteGira) => {
    const estado = t.estado === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    setTareas((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado } : x)));
    const res = await fetch(`/api/tareas/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) setTareas((prev) => prev.map((x) => (x.id === t.id ? t : x)));
  }, []);

  return { tareas, refrescar, crear, alternar };
}

/**
 * La lista llana de un alcance: palomita para cerrar, clic para abrir el detalle
 * y un renglón al final para capturar el siguiente. Nada más — el advance ya
 * tiene su propia pantalla para lo que se coteja contra el venue.
 */
export default function ListaPendientes({
  giraId,
  giraNombre,
  showId,
  showLabel,
  usuarios,
  tareas,
  crear,
  alternar,
  refrescar,
}: {
  giraId: string;
  giraNombre: string;
  showId: string | null;
  showLabel: string | null;
  usuarios: Usuario[];
  tareas: PendienteGira[];
  crear: (titulo: string, showId: string | null) => Promise<void>;
  alternar: (t: PendienteGira) => Promise<void>;
  refrescar: () => Promise<void>;
}) {
  const [nuevo, setNuevo] = useState("");
  const [verCerrados, setVerCerrados] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const vivos = tareas.filter((t) => t.estado !== "COMPLETADA");
  const cerrados = tareas.filter((t) => t.estado === "COMPLETADA");
  const visibles = verCerrados ? [...vivos, ...cerrados] : vivos;

  return (
    <div>
      <div className="divide-y divide-[#141414]">
        {visibles.map((t) => {
          const hecho = t.estado === "COMPLETADA";
          return (
            <div key={t.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#0f0f0f] transition-colors">
              <button
                onClick={() => alternar(t)}
                title={hecho ? "Reabrir" : "Marcar listo"}
                className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] transition-all"
                style={{
                  borderColor: hecho ? "#22c55e" : (PRIO_COLOR[t.prioridad] ?? "#555"),
                  background: hecho ? "#22c55e33" : "transparent",
                  color: "#22c55e",
                }}
              >
                {hecho ? "✓" : ""}
              </button>

              <button onClick={() => setEditando(t.id)} className="flex-1 min-w-0 text-left">
                <p className={`text-[13px] leading-snug ${hecho ? "text-gray-600 line-through" : "text-white"}`}>
                  {t.titulo}
                </p>
                {(t.asignadoA || t.fecha) && (
                  <div className="flex items-center flex-wrap gap-1.5 mt-1">
                    {t.asignadoA && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a]">
                        <User strokeWidth={1.75} className="w-3 h-3" /> {t.asignadoA.name}
                      </span>
                    )}
                    {t.fecha && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#111]">
                        <Calendar strokeWidth={1.75} className="w-3 h-3" /> {fechaCorta(t.fecha)}
                      </span>
                    )}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 px-4 py-2 border-t border-[#141414]">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nuevo.trim()) {
              crear(nuevo.trim(), showId);
              setNuevo("");
            }
          }}
          placeholder={showId ? "Pendiente de esta fecha y Enter…" : "Pendiente de la gira y Enter…"}
          className="flex-1 min-w-0 bg-transparent text-[12px] text-white placeholder:text-[#3a3a3a] focus:outline-none py-1"
        />
        {cerrados.length > 0 && (
          <button
            onClick={() => setVerCerrados((v) => !v)}
            className="shrink-0 text-[10px] text-[#555] hover:text-gray-300 whitespace-nowrap"
          >
            {verCerrados ? "Ocultar" : "Ver"} {cerrados.length} listo{cerrados.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {editando && (
        <NuevaTareaModal
          open
          onClose={() => {
            setEditando(null);
            refrescar();
          }}
          usuarios={usuarios}
          tipoInicial="GIRA"
          giraIdInicial={giraId}
          giraNombre={giraNombre}
          giraShowIdInicial={showId}
          giraShowLabel={showLabel}
          tareaIdEdicion={editando}
          onCreated={() => refrescar()}
        />
      )}
    </div>
  );
}
