"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const AREA_LABELS: Record<string, string> = {
  DIRECCION:"Dirección", ADMINISTRACION:"Administración",
  MARKETING:"Marketing", VENTAS:"Ventas", PRODUCCION:"Producción",
};

const ESTADO_COLS = [
  { estado: "PLANIFICACION", label: "Planificación", color: "border-blue-800/60",   badge: "bg-blue-900/20 text-blue-400" },
  { estado: "ACTIVO",        label: "Activo",        color: "border-yellow-700/60", badge: "bg-yellow-900/20 text-yellow-400" },
  { estado: "EN_PAUSA",      label: "En pausa",      color: "border-gray-700/60",   badge: "bg-gray-800 text-gray-400" },
  { estado: "COMPLETADO",    label: "Completado",    color: "border-green-800/60",  badge: "bg-green-900/20 text-green-400" },
];

const PRIO_COLORS: Record<string, string> = {
  URGENTE: "text-red-400", ALTA: "text-orange-400", MEDIA: "text-[#B3985B]", BAJA: "text-[#555]",
};

type Proyecto = {
  id: string; nombre: string; descripcion: string | null; area: string;
  estado: string; prioridad: string; porcentajeAvance: number;
  fechaInicio: string | null; fechaFin: string | null;
  lider: { id: string; name: string };
  fases: { id: string; nombre: string; completada: boolean; _count: { tareas: number } }[];
  _count: { tareas: number };
};

function ModalNuevoProyecto({ onSave, onClose }: {
  onSave: (p: Proyecto) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nombre: "", descripcion: "", area: "DIRECCION", prioridad: "MEDIA",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.nombre) return;
    setSaving(true);
    const res = await fetch("/api/proyectos-internos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, descripcion: form.descripcion || null }),
    });
    if (res.ok) {
      const d = await res.json();
      onSave(d.proyecto);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-semibold">Nuevo proyecto interno</h2>

        <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          autoFocus placeholder="Nombre del proyecto *"
          onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#333]" />

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

        <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          rows={2} placeholder="Descripción (opcional)"
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] resize-none" />

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#555] hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.nombre}
            className="px-4 py-2 bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-40">
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
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/proyectos-internos").then(r => r.json()).then(d => {
      setProyectos(d.proyectos ?? []);
      setLoading(false);
    });
  }, []);

  async function moverEstado(id: string, estado: string) {
    await fetch(`/api/proyectos-internos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    setProyectos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
  }

  const cols = ESTADO_COLS.filter(c => c.estado !== "COMPLETADO");
  const completados = proyectos.filter(p => p.estado === "COMPLETADO");

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Operaciones</p>
          <h1 className="text-white text-2xl font-bold">Proyectos internos</h1>
          <p className="text-[#555] text-sm mt-1">Mejoras, implementaciones y desarrollo de la empresa</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="shrink-0 bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nuevo proyecto
        </button>
      </div>

      {loading ? (
        <p className="text-[#444] text-sm">Cargando...</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto flex-1 min-h-0 pb-4">
          {cols.map(col => {
            const colProyectos = proyectos.filter(p => p.estado === col.estado);
            const ESTADOS_ORDEN = ["PLANIFICACION", "ACTIVO", "EN_PAUSA", "COMPLETADO"];
            return (
              <div key={col.estado} className={`shrink-0 w-72 flex flex-col gap-3 bg-[#0d0d0d] border ${col.color} rounded-xl p-3`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.badge}`}>{col.label}</span>
                  <span className="text-[#333] text-xs">{colProyectos.length}</span>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto">
                  {colProyectos.map(p => {
                    const fasesTotal = p.fases.length;
                    const fasesCompletas = p.fases.filter(f => f.completada).length;
                    const idx = ESTADOS_ORDEN.indexOf(p.estado);
                    const prev = idx > 0 ? ESTADOS_ORDEN[idx - 1] : null;
                    const next = idx < ESTADOS_ORDEN.length - 1 ? ESTADOS_ORDEN[idx + 1] : null;

                    return (
                      <div key={p.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 hover:border-[#2a2a2a] transition-colors">
                        <Link href={`/proyectos-internos/${p.id}`} className="block space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-white text-sm font-medium leading-snug flex-1">{p.nombre}</p>
                            <span className={`text-[10px] font-medium shrink-0 ${PRIO_COLORS[p.prioridad]}`}>{p.prioridad.charAt(0)}</span>
                          </div>
                          <p className="text-[11px] text-[#555]">{AREA_LABELS[p.area] ?? p.area}</p>

                          {p.porcentajeAvance > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-[#444]">Avance</span>
                                <span className="text-[10px] text-[#555]">{p.porcentajeAvance}%</span>
                              </div>
                              <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                                <div className="h-full bg-[#B3985B] rounded-full transition-all" style={{ width: `${p.porcentajeAvance}%` }} />
                              </div>
                            </div>
                          )}

                          {fasesTotal > 0 && (
                            <p className="text-[10px] text-[#444]">{fasesCompletas}/{fasesTotal} fases</p>
                          )}
                        </Link>

                        <div className="flex gap-1 mt-2 pt-2 border-t border-[#1a1a1a]">
                          {prev && (
                            <button onClick={() => moverEstado(p.id, prev)}
                              className="flex-1 text-[10px] text-[#444] hover:text-white transition-colors text-left">
                              ← {ESTADO_COLS.find(c => c.estado === prev)?.label}
                            </button>
                          )}
                          {next && (
                            <button onClick={() => moverEstado(p.id, next)}
                              className="flex-1 text-[10px] text-[#B3985B] hover:text-[#c4a96b] transition-colors text-right">
                              {ESTADO_COLS.find(c => c.estado === next)?.label} →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colProyectos.length === 0 && (
                    <p className="text-[#333] text-xs text-center py-4">Sin proyectos</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Columna completados */}
          {completados.length > 0 && (
            <div className="shrink-0 w-72 flex flex-col gap-3 bg-[#0d0d0d] border border-green-900/30 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-900/20 text-green-400">Completados</span>
                <span className="text-[#333] text-xs">{completados.length}</span>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto">
                {completados.map(p => (
                  <Link key={p.id} href={`/proyectos-internos/${p.id}`}
                    className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 opacity-60 hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium">{p.nombre}</p>
                    <p className="text-[11px] text-[#555] mt-0.5">{p.lider.name} · ✓ 100%</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
