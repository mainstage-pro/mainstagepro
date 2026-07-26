"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, User, GitBranch } from "lucide-react";
import NuevaTareaModal from "../../../operaciones/components/NuevaTareaModal";
import { etapaInternaLabel } from "@/lib/proceso/valores";

// Tareas ad-hoc de un trato de ventas. Mismo patrón que la sección de tareas de
// un proyecto de evento (ChecklistEventoTab), aquí ligadas al trato en vez del
// proyecto. Se ven y editan también desde Gestión Operativa (vista Tratos).
export interface TareaTrato {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  area: string;
  estado: string;
  fecha: string | null;
  fechaVencimiento: string | null;
  notas: string | null;
  etiquetas: string | null;
  asignadoA: { id: string; name: string } | null;
  creadoPor: { id: string; name: string } | null;
  _count: { subtareas: number; comentarios: number; archivos: number };
}

// Extrae el paso del proceso (subetapa) de las etiquetas JSON de la tarea, si lo
// tiene. Las tareas por defecto de cada subetapa llevan la etiqueta "subetapa:X".
function pasoProceso(etiquetas: string | null): string | null {
  if (!etiquetas) return null;
  try {
    const arr = JSON.parse(etiquetas) as unknown;
    if (!Array.isArray(arr)) return null;
    const tag = arr.find((e): e is string => typeof e === "string" && e.startsWith("subetapa:"));
    if (!tag) return null;
    const label = etapaInternaLabel(tag.slice("subetapa:".length));
    return label === "—" ? null : label;
  } catch { return null; }
}

interface Usuario { id: string; name: string; }

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#f87171", ALTA: "#fb923c", MEDIA: "#B3985B", BAJA: "#555",
};

function fechaCorta(iso: string): string {
  return new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

export default function TareasTratoTab({
  tratoId, tratoNombre, usuarios, onSubetapaChange,
}: {
  tratoId: string;
  tratoNombre: string;
  usuarios: Usuario[];
  onSubetapaChange?: () => void;
}) {
  const [tareas, setTareas]   = useState<TareaTrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<{ mode: "crear" } | { mode: "editar"; tareaId: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tratos/${tratoId}/tareas`, { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setTareas(d.tareas ?? []); }
    } finally { setLoading(false); }
  }, [tratoId]);

  useEffect(() => { load(); }, [load]);

  async function toggle(e: React.MouseEvent, t: TareaTrato) {
    e.stopPropagation();
    const next = t.estado === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    setTareas(prev => prev.map(x => x.id === t.id ? { ...x, estado: next } : x));
    const res = await fetch(`/api/tareas/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: next }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setTareas(prev => prev.map(x => x.id === t.id ? { ...x, estado: t.estado } : x));
      if (d?.error) alert(d.error);
      return;
    }
    // Si completar esta tarea hizo avanzar la subetapa, recarga la lista (aparecen
    // las tareas por defecto de la nueva subetapa) y avisa al detalle del trato.
    const d = await res.json().catch(() => ({}));
    if (d?.subetapaAvanzada) { load(); onSubetapaChange?.(); }
  }

  function upsertTarea(t: TareaTrato) {
    setTareas(prev => {
      const i = prev.findIndex(x => x.id === t.id);
      if (i >= 0) { const c = [...prev]; c[i] = { ...c[i], ...t }; return c; }
      return [...prev, t];
    });
  }

  const activas    = tareas.filter(t => t.estado !== "COMPLETADA");
  const completadas = tareas.filter(t => t.estado === "COMPLETADA");

  return (
    <div className="space-y-4">
      <button
        onClick={() => setModal({ mode: "crear" })}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all text-sm font-medium"
      >
        <span className="w-5 h-5 rounded-full bg-[#B3985B]/15 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
        Nueva tarea del trato
      </button>

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 bg-[#0d0d0d] border border-[#1a1a1a] animate-pulse rounded-2xl" />)}</div>
      ) : tareas.length === 0 ? (
        <p className="text-center text-xs text-[#555] py-6">Sin tareas para este trato todavía.</p>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#141414]">
          {[...activas, ...completadas].map(t => {
            const done = t.estado === "COMPLETADA";
            const paso = pasoProceso(t.etiquetas);
            return (
              <div
                key={t.id}
                onClick={() => setModal({ mode: "editar", tareaId: t.id })}
                className="group flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-[#0f0f0f] transition-colors"
              >
                <button
                  onClick={(e) => toggle(e, t)}
                  title={done ? "Marcar como pendiente" : "Marcar como completada"}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    done ? "border-green-500 bg-green-500/20 text-green-400 text-[10px]"
                         : "border-[#333] hover:border-[#B3985B] text-transparent"
                  }`}
                >
                  {done ? "✓" : ""}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${done ? "line-through text-gray-600" : "text-white"} transition-colors`}>
                    {t.titulo}
                  </p>
                  <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                    {paso && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-300/80 px-2 py-0.5 rounded-full bg-blue-950/30 border border-blue-800/30 font-medium">
                        <GitBranch strokeWidth={1.75} className="w-3 h-3" /> {paso}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ color: PRIO_COLOR[t.prioridad] ?? "#555", background: (PRIO_COLOR[t.prioridad] ?? "#555") + "18" }}>
                      {t.prioridad.charAt(0) + t.prioridad.slice(1).toLowerCase()}
                    </span>
                    {t.asignadoA ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a] font-medium">
                        <User strokeWidth={1.75} className="w-3 h-3" /> {t.asignadoA.name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-yellow-500/70 px-2 py-0.5 rounded-full bg-yellow-950/20 font-medium">Sin asignar</span>
                    )}
                    {t.fecha && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#111] font-medium">
                        <Calendar strokeWidth={1.75} className="w-3 h-3" /> {fechaCorta(t.fecha)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 self-center text-[11px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</span>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <NuevaTareaModal
          open
          onClose={() => { setModal(null); load(); }}
          usuarios={usuarios}
          tipoInicial="TRATO"
          tratoIdInicial={tratoId}
          tratoNombre={tratoNombre}
          tareaIdEdicion={modal.mode === "editar" ? modal.tareaId : null}
          onCreated={(t) => upsertTarea(t as TareaTrato)}
        />
      )}
    </div>
  );
}
