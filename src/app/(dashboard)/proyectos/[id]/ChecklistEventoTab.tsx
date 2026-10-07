"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, User, ClipboardList } from "lucide-react";
import NuevaTareaModal from "../../operaciones/components/NuevaTareaModal";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface TareaProyecto {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  area: string;
  estado: string;
  fecha: string | null;
  fechaVencimiento: string | null;
  notas: string | null;
  asignadoA: { id: string; name: string } | null;
  creadoPor: { id: string; name: string } | null;
  _count: { subtareas: number; comentarios: number; archivos: number };
}

export interface Usuario { id: string; name: string; }


const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#f87171", ALTA: "#fb923c", MEDIA: "#B3985B", BAJA: "#555",
};

function fechaCorta(iso: string): string {
  return new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

// ─── Componente principal ───────────────────────────────────────────────────────
export default function ChecklistEventoTab({
  proyectoId, proyectoNombre, usuarios,
}: {
  proyectoId: string;
  proyectoNombre: string;
  usuarios: Usuario[];
}) {
  const [tareas, setTareas]   = useState<TareaProyecto[]>([]);
  const [loading, setLoading] = useState(true);
  // Mismo modal "Tarea de proyecto de evento" que en Gestión Operativa.
  const [modal, setModal] = useState<{ mode: "crear" } | { mode: "editar"; tareaId: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/tareas`, { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setTareas(d.tareas ?? []); }
    } finally { setLoading(false); }
  }, [proyectoId]);

  useEffect(() => { load(); }, [load]);

  const completadas = useMemo(() => tareas.filter(t => t.estado === "COMPLETADA").length, [tareas]);

  async function toggle(e: React.MouseEvent, t: TareaProyecto) {
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
    }
  }

  // Alta/edición confirmada en el modal → refleja la tarea en la lista.
  function upsertTarea(t: TareaProyecto) {
    setTareas(prev => {
      const i = prev.findIndex(x => x.id === t.id);
      if (i >= 0) { const c = [...prev]; c[i] = { ...c[i], ...t }; return c; }
      return [...prev, t];
    });
  }

  const pct = tareas.length > 0 ? Math.round((completadas / tareas.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ── Alta de tarea (mismo modal de Gestión Operativa) ── */}
      <button
        onClick={() => setModal({ mode: "crear" })}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all text-sm font-medium"
      >
        <span className="w-5 h-5 rounded-full bg-[#B3985B]/15 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
        Nueva tarea
      </button>

      {/* ── Encabezado + progreso ── */}
      <div className="ms-card rounded-2xl p-5">
        <div className="mb-3">
          <h3 className="text-white font-semibold text-base">Tareas del proyecto</h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Haz clic en una tarea para abrirla y editarla (responsable, fecha, evidencia). Aparece para su responsable en Gestión Operativa por proyecto.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{completadas}/{tareas.length} completadas</span>
            <span className={pct === 100 && tareas.length > 0 ? "text-green-400 font-semibold" : "text-[#B3985B]"}>{pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 && tareas.length > 0 ? "bg-green-500" : "bg-[#B3985B]"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 ms-card animate-pulse rounded-2xl" />)}</div>
      ) : tareas.length === 0 ? (
        <div className="ms-card rounded-2xl p-8 text-center text-gray-500">
          <ClipboardList strokeWidth={1.5} className="w-9 h-9 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">Este proyecto todavía no tiene tareas. Agrega la primera con el recuadro de arriba.</p>
        </div>
      ) : (
        <div className="ms-card rounded-2xl overflow-hidden divide-y divide-[#141414]">
          {tareas.map(t => {
            const done = t.estado === "COMPLETADA";
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

      {/* ── Mismo modal "Tarea de proyecto de evento" de Gestión Operativa ── */}
      {modal && (
        <NuevaTareaModal
          open
          onClose={() => { setModal(null); load(); }}
          usuarios={usuarios}
          tipoInicial="EVENTO"
          proyectoEventoIdInicial={proyectoId}
          proyectoEventoNombre={proyectoNombre}
          tareaIdEdicion={modal.mode === "editar" ? modal.tareaId : null}
          onCreated={(t) => upsertTarea(t as TareaProyecto)}
          onDeleted={(id) => setTareas(prev => prev.filter(x => x.id !== id))}
        />
      )}
    </div>
  );
}
