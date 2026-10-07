"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, User, Paperclip, MessageSquare, ShieldCheck, Trash2, ClipboardList } from "lucide-react";
import NuevaTareaModal from "../../app/(dashboard)/operaciones/components/NuevaTareaModal";

export interface TareaGira {
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

export const abiertos = (lista: TareaGira[]) => lista.filter((t) => t.estado !== "COMPLETADA");

/**
 * Las tareas de una gira, con el alcance como filtro: `giraShowId` nulo son las
 * de toda la gira y con valor las de una sola fecha. Son tareas normales
 * (tipoOrigen GIRA), así que llegan a Gestión Operativa en cuanto tienen fecha
 * y responsable.
 */
export function useTareasGira(giraId: string) {
  const [tareas, setTareas] = useState<TareaGira[]>([]);

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

  const alternar = useCallback(async (t: TareaGira) => {
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
  const upsert = useCallback((t: TareaGira) => {
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

  const eliminar = useCallback(async (id: string) => {
    const res = await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error === "Sin permiso"
        ? "Solo quien la creó (o un administrador) puede borrarla."
        : (d.error ?? "No se pudo borrar la tarea"));
      return;
    }
    setTareas((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { tareas, refrescar, alternar, upsert, quitar, eliminar };
}

/**
 * Las tareas de un alcance, con la misma vista que las del proyecto de evento:
 * el botón abre la ventana de la tarea, el renglón se pica para editarla y la
 * palomita la cierra.
 */
export default function ListaTareasGira({
  giraId,
  giraNombre,
  showId,
  showLabel,
  usuarios,
  tareas,
  upsert,
  quitar,
  alternar,
  eliminar,
  tarjeta = true,
}: {
  giraId: string;
  giraNombre: string;
  showId: string | null;
  showLabel: string | null;
  usuarios: Usuario[];
  tareas: TareaGira[];
  upsert: (t: TareaGira) => void;
  quitar: (id: string) => void;
  alternar: (t: TareaGira) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
  tarjeta?: boolean;
}) {
  const [verCerradas, setVerCerradas] = useState(false);
  const [modal, setModal] = useState<{ modo: "crear" } | { modo: "editar"; id: string } | null>(null);
  const [porBorrar, setPorBorrar] = useState<string | null>(null);

  const vivas = tareas.filter((t) => t.estado !== "COMPLETADA");
  const cerradas = tareas.filter((t) => t.estado === "COMPLETADA");
  const visibles = verCerradas ? [...vivas, ...cerradas] : vivas;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setModal({ modo: "crear" })}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all text-sm font-medium"
      >
        <span className="w-5 h-5 rounded-full bg-[#B3985B]/15 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        Nueva tarea
      </button>

      {tareas.length === 0 ? (
        <div className={`${tarjeta ? "ms-card rounded-2xl" : ""} p-6 text-center text-gray-500`}>
          <ClipboardList strokeWidth={1.5} className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">
            {showId
              ? "Esta fecha todavía no tiene tareas. Agrega la primera con el botón de arriba."
              : "Esta gira todavía no tiene tareas. Agrega la primera con el botón de arriba."}
          </p>
        </div>
      ) : (
        <div className={tarjeta ? "ms-card rounded-2xl overflow-hidden" : ""}>
          <div className="divide-y divide-[#141414]">
            {visibles.map((t) => {
              const hecha = t.estado === "COMPLETADA";
              const adjuntos = t._count?.archivos ?? 0;
              const comentarios = t._count?.comentarios ?? 0;
              return (
                <div
                  key={t.id}
                  onClick={() => setModal({ modo: "editar", id: t.id })}
                  className="group flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#0f0f0f] transition-colors"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); alternar(t); }}
                    title={hecha ? "Reabrir" : "Marcar completada"}
                    className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] transition-all"
                    style={{
                      borderColor: hecha ? "#22c55e" : (PRIO_COLOR[t.prioridad] ?? "#555"),
                      background: hecha ? "#22c55e33" : "transparent",
                      color: "#22c55e",
                    }}
                  >
                    {hecha ? "✓" : ""}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] leading-snug ${hecha ? "text-gray-600 line-through" : "text-white"}`}>
                      {t.titulo}
                    </p>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
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

                  {porBorrar === t.id ? (
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0 self-center flex items-center gap-2">
                      <span className="text-[11px] text-[#888]">¿Borrarla?</span>
                      <button
                        onClick={() => { setPorBorrar(null); eliminar(t.id); }}
                        className="text-[11px] font-semibold text-red-400 hover:text-red-300"
                      >
                        Sí
                      </button>
                      <button onClick={() => setPorBorrar(null)} className="text-[11px] text-[#555] hover:text-white">
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="shrink-0 self-center flex items-center gap-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <span className="text-[11px] text-[#555]">Abrir →</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPorBorrar(t.id); }}
                        title="Borrar la tarea"
                        className="text-[#444] hover:text-red-400 transition-colors"
                      >
                        <Trash2 strokeWidth={1.75} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {cerradas.length > 0 && (
            <button
              onClick={() => setVerCerradas((v) => !v)}
              className="w-full px-4 py-2 border-t border-[#141414] text-[11px] text-[#555] hover:text-gray-300 text-left"
            >
              {verCerradas ? "Ocultar" : "Ver"} {cerradas.length} completada{cerradas.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

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
          onCreated={(t) => upsert(t as TareaGira)}
          onDeleted={quitar}
        />
      )}
    </div>
  );
}
