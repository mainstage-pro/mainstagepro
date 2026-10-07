"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, User, Paperclip, MessageSquare, ShieldCheck } from "lucide-react";
import NuevaTareaModal from "../../app/(dashboard)/operaciones/components/NuevaTareaModal";

export interface PendienteGira {
  id: string;
  titulo: string;
  descripcion?: string | null;
  prioridad: string;
  estado: string;
  fecha: string | null;
  fechaVencimiento?: string | null;
  giraShowId: string | null;
  requiereEvidencia?: boolean;
  asignadoA: { id: string; name: string } | null;
  _count?: { subtareas: number; comentarios: number; archivos: number };
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

  // El modal devuelve la tarea ya guardada: se refleja sin recargar la lista.
  const upsert = useCallback((t: PendienteGira) => {
    setTareas((prev) => {
      const i = prev.findIndex((x) => x.id === t.id);
      if (i < 0) return [...prev, t];
      const copia = [...prev];
      copia[i] = { ...copia[i], ...t };
      return copia;
    });
  }, []);

  const quitar = useCallback((id: string) => {
    setTareas((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { tareas, refrescar, crear, alternar, upsert, quitar };
}

/**
 * La lista de un alcance, con la misma vista que las tareas del proyecto de
 * evento: palomita para cerrar, clic para abrir la tarea completa (responsable,
 * fechas, evidencia, borrar) y un renglón al final para capturar rápido.
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
  upsert,
  quitar,
}: {
  giraId: string;
  giraNombre: string;
  showId: string | null;
  showLabel: string | null;
  usuarios: Usuario[];
  tareas: PendienteGira[];
  crear: (titulo: string, showId: string | null) => Promise<void>;
  alternar: (t: PendienteGira) => Promise<void>;
  upsert: (t: PendienteGira) => void;
  quitar: (id: string) => void;
}) {
  const [nuevo, setNuevo] = useState("");
  const [verCerrados, setVerCerrados] = useState(false);
  const [modal, setModal] = useState<{ modo: "crear" } | { modo: "editar"; id: string } | null>(null);

  const vivos = tareas.filter((t) => t.estado !== "COMPLETADA");
  const cerrados = tareas.filter((t) => t.estado === "COMPLETADA");
  const visibles = verCerrados ? [...vivos, ...cerrados] : vivos;

  return (
    <div>
      <div className="divide-y divide-[#141414]">
        {visibles.map((t) => {
          const hecho = t.estado === "COMPLETADA";
          const adjuntos = t._count?.archivos ?? 0;
          const comentarios = t._count?.comentarios ?? 0;
          return (
            <div
              key={t.id}
              onClick={() => setModal({ modo: "editar", id: t.id })}
              className="group flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#0f0f0f] transition-colors"
            >
              <button
                onClick={(e) => { e.stopPropagation(); alternar(t); }}
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

              <div className="flex-1 min-w-0">
                <p className={`text-[13px] leading-snug ${hecho ? "text-gray-600 line-through" : "text-white"}`}>
                  {t.titulo}
                </p>
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      color: PRIO_COLOR[t.prioridad] ?? "#555",
                      background: (PRIO_COLOR[t.prioridad] ?? "#555") + "18",
                    }}
                  >
                    {t.prioridad.charAt(0) + t.prioridad.slice(1).toLowerCase()}
                  </span>
                  {t.asignadoA ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a] font-medium">
                      <User strokeWidth={1.75} className="w-3 h-3" /> {t.asignadoA.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-yellow-500/70 px-2 py-0.5 rounded-full bg-yellow-950/20 font-medium">
                      Sin asignar
                    </span>
                  )}
                  {t.fecha && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#111] font-medium">
                      <Calendar strokeWidth={1.75} className="w-3 h-3" /> {fechaCorta(t.fecha)}
                    </span>
                  )}
                  {t.requiereEvidencia && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#B3985B] px-2 py-0.5 rounded-full bg-[#B3985B]/10 font-medium">
                      <ShieldCheck strokeWidth={1.75} className="w-3 h-3" /> Con comprobación
                    </span>
                  )}
                  {adjuntos > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                      <Paperclip strokeWidth={1.75} className="w-3 h-3" /> {adjuntos}
                    </span>
                  )}
                  {comentarios > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                      <MessageSquare strokeWidth={1.75} className="w-3 h-3" /> {comentarios}
                    </span>
                  )}
                </div>
              </div>

              <span className="shrink-0 self-center text-[11px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity">
                Abrir →
              </span>
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
        <button
          onClick={() => setModal({ modo: "crear" })}
          title="Capturar el pendiente con responsable, fechas y comprobación"
          className="shrink-0 text-[10px] text-[#666] hover:text-[#B3985B] whitespace-nowrap transition-colors"
        >
          + Con detalle
        </button>
        {cerrados.length > 0 && (
          <button
            onClick={() => setVerCerrados((v) => !v)}
            className="shrink-0 text-[10px] text-[#555] hover:text-gray-300 whitespace-nowrap"
          >
            {verCerrados ? "Ocultar" : "Ver"} {cerrados.length} listo{cerrados.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {modal && (
        <NuevaTareaModal
          open
          onClose={() => setModal(null)}
          usuarios={usuarios}
          tipoInicial="GIRA"
          giraIdInicial={giraId}
          giraNombre={giraNombre}
          giraShowIdInicial={showId}
          giraShowLabel={showLabel}
          tareaIdEdicion={modal.modo === "editar" ? modal.id : null}
          onCreated={(t) => upsert(t as PendienteGira)}
          onDeleted={quitar}
        />
      )}
    </div>
  );
}
