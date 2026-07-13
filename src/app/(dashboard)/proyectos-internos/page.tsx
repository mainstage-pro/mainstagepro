"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AREAS, AREA_LABELS, areaLabel, areaChipClass } from "@/lib/gestion";

const ESTADO_LABELS: Record<string, string> = {
  PLANIFICACION:"Planificación", ACTIVO:"Activo", EN_PAUSA:"En pausa", COMPLETADO:"Completado",
};

const ESTADO_ORDER = ["PLANIFICACION","ACTIVO","EN_PAUSA","COMPLETADO"];

type Proyecto = {
  id: string; nombre: string; descripcion: string | null; area: string;
  estado: string; prioridad: string; porcentajeAvance: number;
  fechaInicio: string | null; fechaFin: string | null;
  lider: { id: string; name: string };
  fases: { id: string; nombre: string; completada: boolean; _count: { tareas: number } }[];
  _count: { tareas: number };
};

function ModalNuevoProyecto({ onSave, onClose }: {
  onSave: (p: Proyecto) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({ nombre: "", area: "DIRECCION", prioridad: "MEDIA" });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const res = await fetch("/api/proyectos-internos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, nombre: form.nombre.trim() }),
    });
    if (res.ok) { const d = await res.json(); onSave(d.proyecto); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-semibold text-sm">Nuevo proyecto interno</h2>

        <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          autoFocus placeholder="Nombre del proyecto *"
          onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50" />

        <div className="grid grid-cols-2 gap-2">
          <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
            className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white">
            {AREAS.map((k) => <option key={k} value={k}>{AREA_LABELS[k]}</option>)}
          </select>
          <select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
            className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white">
            <option value="URGENTE">Urgente</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#555] hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.nombre.trim()}
            className="px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-40">
            {saving ? "Creando..." : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

const ESTADO_DOT: Record<string, string> = {
  PLANIFICACION: "#a78bfa", ACTIVO: "#4ade80", EN_PAUSA: "#e8a020", COMPLETADO: "#555",
};

function KanbanBoard({ proyectos, onMove }: {
  proyectos: Proyecto[];
  onMove: (id: string, estado: string) => void;
}) {
  const [dragId, setDragId]   = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
      {ESTADO_ORDER.map(estado => {
        const cards = proyectos.filter(p => p.estado === estado);
        return (
          <div key={estado} className="w-64 shrink-0"
            onDragOver={e => { e.preventDefault(); setOverCol(estado); }}
            onDragLeave={() => setOverCol(c => c === estado ? null : c)}
            onDrop={() => {
              if (dragId) onMove(dragId, estado);
              setDragId(null); setOverCol(null);
            }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1a1a1a] bg-white/[0.02] mb-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_DOT[estado] }} />
              <span className="text-xs font-semibold text-[#ccc]">{ESTADO_LABELS[estado]}</span>
              <span className="ml-auto text-[10px] text-[#555]">{cards.length}</span>
            </div>
            <div className={`space-y-2 min-h-[80px] rounded-lg p-1 transition-colors ${
              overCol === estado ? "bg-[#B3985B]/5 ring-1 ring-[#B3985B]/20" : ""
            }`}>
              {cards.map(p => {
                const fasesTotal = p.fases.length;
                const fasesCompletas = p.fases.filter(f => f.completada).length;
                return (
                  <div key={p.id} draggable
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    className={`rounded-lg border border-white/[0.08] bg-white/[0.025] p-3 cursor-grab active:cursor-grabbing transition-opacity ${
                      dragId === p.id ? "opacity-40" : ""
                    }`}>
                    <Link href={`/proyectos-internos/${p.id}`} className="block" onClick={e => { if (dragId) e.preventDefault(); }}>
                      <p className="text-[13px] text-white leading-snug mb-2">{p.nombre}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium ${areaChipClass(p.area)}`}>
                          {areaLabel(p.area)}
                        </span>
                        {fasesTotal > 0 && <span className="text-[10px] text-[#555]">{fasesCompletas}/{fasesTotal} fases</span>}
                      </div>
                      {p.porcentajeAvance > 0 && (
                        <div className="mt-2 h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                          <div className="h-full rounded-full bg-[#B3985B]" style={{ width: `${p.porcentajeAvance}%` }} />
                        </div>
                      )}
                    </Link>
                  </div>
                );
              })}
              {cards.length === 0 && (
                <p className="text-center text-[11px] text-[#2a2a2a] py-4">Vacío</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProyectosInternosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [estadoFiltro, setEstado] = useState("ACTIVO");
  const [showModal, setShowModal] = useState(false);
  const [vista, setVista]         = useState<"lista" | "kanban">("kanban");

  useEffect(() => {
    fetch("/api/proyectos-internos").then(r => r.json()).then(d => {
      setProyectos(d.proyectos ?? []);
      setLoading(false);
    });
  }, []);

  async function moverProyecto(id: string, estado: string) {
    setProyectos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    await fetch(`/api/proyectos-internos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
  }

  const filtrados = proyectos.filter(p => p.estado === estadoFiltro);

  return (
    <div className={`p-4 md:p-6 ${vista === "kanban" ? "max-w-6xl" : "max-w-3xl"} mx-auto space-y-5`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Gestión Operativa</p>
          <h1 className="text-white text-2xl font-bold">Proyectos internos</h1>
          <p className="text-[#555] text-sm mt-1">Mejoras, implementaciones y desarrollo de la empresa</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="shrink-0 ms-btn-primary">
          + Nuevo
        </button>
      </div>

      {/* Toggle de vista */}
      <div className="ms-tabs w-fit">
        {(["kanban", "lista"] as const).map(v => (
          <button key={v} onClick={() => setVista(v)}
            className={`capitalize text-xs ${vista === v ? "ms-tab-active" : "ms-tab"}`}>
            {v}
          </button>
        ))}
      </div>

      {/* Filtros por estado (solo lista) */}
      {vista === "lista" && (
        <div className="flex gap-2 flex-wrap">
          {ESTADO_ORDER.map(e => (
            <button key={e} onClick={() => setEstado(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                estadoFiltro === e ? "bg-[#B3985B] text-black" : "bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-white"
              }`}>
              {ESTADO_LABELS[e]}
              <span className="ml-1.5 text-[10px] opacity-60">
                {proyectos.filter(p => p.estado === e).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Kanban */}
      {vista === "kanban" && !loading && (
        <KanbanBoard proyectos={proyectos} onMove={moverProyecto} />
      )}

      {/* Lista */}
      {vista === "lista" && (loading ? (
        <p className="text-[#444] text-sm">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#333] text-sm">Sin proyectos {ESTADO_LABELS[estadoFiltro]?.toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-px">
          {filtrados.map(p => {
            const fasesTotal    = p.fases.length;
            const fasesCompletas= p.fases.filter(f => f.completada).length;

            return (
              <Link key={p.id} href={`/proyectos-internos/${p.id}`}
                className="flex items-center gap-3 px-1 py-2.5 rounded-xl hover:bg-[#0d0d0d] group transition-colors">
                {/* Círculo / avance */}
                <div className="shrink-0 relative w-5 h-5">
                  {p.porcentajeAvance > 0 ? (
                    <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                      <circle cx="10" cy="10" r="8" fill="none" stroke="#B3985B" strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 8}`}
                        strokeDashoffset={`${2 * Math.PI * 8 * (1 - p.porcentajeAvance / 100)}`}
                        strokeLinecap="round" />
                    </svg>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[#2a2a2a] group-hover:border-[#B3985B]/40 transition-colors" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white">{p.nombre}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${areaChipClass(p.area)}`}>
                    {areaLabel(p.area)}
                  </span>
                  {fasesTotal > 0 && (
                    <span className="text-[11px] text-[#444]">{fasesCompletas}/{fasesTotal} fases</span>
                  )}
                  {p.porcentajeAvance > 0 && (
                    <span className="text-[11px] text-[#555]">{p.porcentajeAvance}%</span>
                  )}
                </div>

                {/* Flecha */}
                <span className="shrink-0 opacity-0 group-hover:opacity-100 text-[#555] text-xs transition-opacity">→</span>
              </Link>
            );
          })}
        </div>
      ))}

      {showModal && (
        <ModalNuevoProyecto
          onSave={p => { setProyectos(prev => [p, ...prev]); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
