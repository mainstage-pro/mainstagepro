"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const AREA_LABELS: Record<string, string> = {
  DIRECCION:"Dirección", ADMINISTRACION:"Administración",
  MARKETING:"Marketing", VENTAS:"Ventas", PRODUCCION:"Producción",
};

const AREA_COLORS: Record<string, string> = {
  DIRECCION:     "bg-purple-900/30 text-purple-400",
  ADMINISTRACION:"bg-blue-900/30 text-blue-400",
  MARKETING:     "bg-pink-900/30 text-pink-400",
  VENTAS:        "bg-green-900/30 text-green-400",
  PRODUCCION:    "bg-yellow-900/30 text-yellow-400",
};

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
            {Object.entries(AREA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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

export default function ProyectosInternosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [estadoFiltro, setEstado] = useState("ACTIVO");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/proyectos-internos").then(r => r.json()).then(d => {
      setProyectos(d.proyectos ?? []);
      setLoading(false);
    });
  }, []);

  const filtrados = proyectos.filter(p => p.estado === estadoFiltro);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Operaciones</p>
          <h1 className="text-white text-2xl font-bold">Proyectos internos</h1>
          <p className="text-[#555] text-sm mt-1">Mejoras, implementaciones y desarrollo de la empresa</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="shrink-0 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nuevo
        </button>
      </div>

      {/* Filtros por estado */}
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

      {/* Lista */}
      {loading ? (
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
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${AREA_COLORS[p.area] ?? "bg-[#222] text-[#666]"}`}>
                    {AREA_LABELS[p.area] ?? p.area}
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
      )}

      {showModal && (
        <ModalNuevoProyecto
          onSave={p => { setProyectos(prev => [p, ...prev]); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
