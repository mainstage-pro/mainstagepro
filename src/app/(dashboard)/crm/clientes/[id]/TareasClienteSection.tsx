"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, User, Repeat } from "lucide-react";
import NuevaTareaModal from "../../../operaciones/components/NuevaTareaModal";
import { formatearRecurrencia, type RecurrenciaConfig } from "@/lib/recurrencia";

// Tareas de atención específica del cliente (tipoOrigen CLIENTE): recurrencia de
// eventos, cumpleaños, fechas especiales. Nacen aquí y aparecen en Gestión Operativa
// (Hoy) el día que toque según su recurrencia/fecha, con el tag del nombre del cliente.
interface TareaCliente {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  fecha: string | null;
  recurrencia: string | null;
  asignadoA: { id: string; name: string } | null;
}

interface Usuario { id: string; name: string }

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#f87171", ALTA: "#fb923c", MEDIA: "#B3985B", BAJA: "#555",
};

function fechaCorta(iso: string): string {
  return new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

function recurrenciaTexto(raw: string | null): string | null {
  if (!raw) return null;
  try { return formatearRecurrencia(JSON.parse(raw) as RecurrenciaConfig); } catch { return null; }
}

export default function TareasClienteSection({
  clienteId, clienteNombre, usuarios,
}: {
  clienteId: string;
  clienteNombre: string;
  usuarios: Usuario[];
}) {
  const [tareas, setTareas]   = useState<TareaCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<{ mode: "crear" } | { mode: "editar"; tareaId: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/tareas`, { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setTareas(d.tareas ?? []); }
    } finally { setLoading(false); }
  }, [clienteId]);

  useEffect(() => { load(); }, [load]);

  async function toggle(e: React.MouseEvent, t: TareaCliente) {
    e.stopPropagation();
    const next = t.estado === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    setTareas(prev => prev.map(x => x.id === t.id ? { ...x, estado: next } : x));
    const res = await fetch(`/api/tareas/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: next }),
    });
    if (!res.ok) {
      setTareas(prev => prev.map(x => x.id === t.id ? { ...x, estado: t.estado } : x));
      return;
    }
    // Al completar una recurrente el servidor la reagenda: recargamos para reflejar la nueva fecha.
    if (next === "COMPLETADA" && t.recurrencia) { load(); }
  }

  function upsertTarea(t: TareaCliente) {
    setTareas(prev => {
      const i = prev.findIndex(x => x.id === t.id);
      if (i >= 0) { const c = [...prev]; c[i] = { ...c[i], ...t }; return c; }
      return [...prev, t];
    });
  }

  return (
    <div className="ms-card p-5">
      <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Tareas</h2>

      <button
        onClick={() => setModal({ mode: "crear" })}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all text-sm font-medium mb-4"
      >
        <span className="w-5 h-5 rounded-full bg-[#B3985B]/15 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
        Nueva tarea del cliente
      </button>

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 bg-[#0d0d0d] border border-[#1a1a1a] animate-pulse rounded-2xl" />)}</div>
      ) : tareas.length === 0 ? (
        <p className="text-center text-xs text-[#555] py-4">Sin tareas para este cliente. Agrega cumpleaños, aniversarios o recordatorios de atención.</p>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#141414]">
          {tareas.map(t => {
            const done = t.estado === "COMPLETADA";
            const rec = recurrenciaTexto(t.recurrencia);
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
                    {rec ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#f472b6] px-2 py-0.5 rounded-full bg-[#f472b6]/12 font-medium">
                        <Repeat strokeWidth={1.75} className="w-3 h-3" /> {rec}
                      </span>
                    ) : t.fecha ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#111] font-medium">
                        <Calendar strokeWidth={1.75} className="w-3 h-3" /> {fechaCorta(t.fecha)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#555] px-2 py-0.5 rounded-full bg-[#111] font-medium">Sin agendar</span>
                    )}
                    {t.asignadoA && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a] font-medium">
                        <User strokeWidth={1.75} className="w-3 h-3" /> {t.asignadoA.name}
                      </span>
                    )}
                  </div>
                </div>
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
          defaultArea="VENTAS"
          tipoInicial="CLIENTE"
          clienteIdInicial={clienteId}
          clienteNombre={clienteNombre}
          tareaIdEdicion={modal.mode === "editar" ? modal.tareaId : null}
          onCreated={(t) => upsertTarea(t as TareaCliente)}
        />
      )}
    </div>
  );
}
