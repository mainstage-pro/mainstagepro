"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const AREA_LABELS: Record<string, string> = {
  DIRECCION:"Dirección", ADMINISTRACION:"Administración",
  MARKETING:"Marketing", VENTAS:"Ventas", PRODUCCION:"Producción",
};
const ESTADO_LABELS: Record<string, string> = {
  PLANIFICACION:"Planificación", ACTIVO:"Activo",
  EN_PAUSA:"En pausa", COMPLETADO:"Completado", CANCELADO:"Cancelado",
};
const PRIO_LABELS: Record<string, string> = {
  URGENTE:"Urgente", ALTA:"Alta", MEDIA:"Media", BAJA:"Baja",
};

type TareaFase = {
  id: string; titulo: string; estado: string; prioridad: string;
  fecha: string | null; fechaVencimiento: string | null; fechaCompletada: string | null;
  createdAt: string;
  asignadoA: { id: string; name: string } | null;
};

type Fase = {
  id: string; nombre: string; descripcion: string | null;
  orden: number; completada: boolean;
  tareas: TareaFase[];
};

type Proyecto = {
  id: string; nombre: string; descripcion: string | null; area: string;
  estado: string; prioridad: string; porcentajeAvance: number;
  fechaInicio: string | null; fechaFin: string | null;
  lider: { id: string; name: string };
  fases: Fase[];
  tareas: TareaFase[];
};

function EstadoTarea({ estado }: { estado: string }) {
  const cls = estado === "COMPLETADA" ? "text-green-400" : estado === "EN_PROGRESO" ? "text-blue-400" : "text-[#555]";
  const dot = estado === "COMPLETADA" ? "●" : estado === "EN_PROGRESO" ? "◐" : "○";
  return <span className={`text-xs ${cls}`}>{dot}</span>;
}

export default function ProyectoInternoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading]   = useState(true);
  const [editNombre, setEditNombre] = useState(false);
  const [nombre, setNombre]     = useState("");
  const [addingFase, setAddFase] = useState(false);
  const [faseName, setFaseName] = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetch(`/api/proyectos-internos/${id}`)
      .then(r => r.json())
      .then(d => {
        setProyecto(d.proyecto);
        setNombre(d.proyecto?.nombre ?? "");
        setLoading(false);
      });
  }, [id]);

  async function patchProyecto(data: Record<string, unknown>) {
    const res = await fetch(`/api/proyectos-internos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const d = await res.json();
      setProyecto(prev => prev ? { ...prev, ...d.proyecto } : null);
    }
  }

  async function toggleFase(faseId: string, completada: boolean) {
    await fetch(`/api/proyectos-internos/${id}/fases/${faseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completada }),
    });
    setProyecto(prev => prev ? {
      ...prev,
      fases: prev.fases.map(f => f.id === faseId ? { ...f, completada } : f),
    } : null);
    // Recalcular progreso
    if (proyecto) {
      const total = proyecto.fases.length;
      const hechas = proyecto.fases.filter(f => f.id === faseId ? completada : f.completada).length;
      const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
      await patchProyecto({ porcentajeAvance: pct });
    }
  }

  async function addFase() {
    if (!faseName) return;
    setSaving(true);
    const res = await fetch(`/api/proyectos-internos/${id}/fases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: faseName }),
    });
    if (res.ok) {
      const d = await res.json();
      setProyecto(prev => prev ? { ...prev, fases: [...prev.fases, { ...d.fase, tareas: [] }] } : null);
      setFaseName(""); setAddFase(false);
    }
    setSaving(false);
  }

  if (loading) return <div className="p-6 text-[#444] text-sm">Cargando...</div>;
  if (!proyecto) return <div className="p-6 text-[#444] text-sm">Proyecto no encontrado.</div>;

  const allTareas = [...proyecto.tareas, ...proyecto.fases.flatMap(f => f.tareas)];
  const totalT = allTareas.length;
  const doneT  = allTareas.filter(t => t.estado === "COMPLETADA").length;
  const pctT   = totalT > 0 ? Math.round((doneT / totalT) * 100) : proyecto.porcentajeAvance;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#444]">
        <Link href="/proyectos-internos" className="hover:text-[#B3985B] transition-colors">Proyectos internos</Link>
        <span>/</span>
        <span className="text-white">{proyecto.nombre}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editNombre ? (
            <div className="flex items-center gap-2">
              <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
                className="text-xl font-bold bg-transparent border-b border-[#B3985B] text-white outline-none flex-1"
                onKeyDown={async e => {
                  if (e.key === "Enter") { await patchProyecto({ nombre }); setEditNombre(false); }
                  if (e.key === "Escape") { setNombre(proyecto.nombre); setEditNombre(false); }
                }}
              />
              <button onClick={async () => { await patchProyecto({ nombre }); setEditNombre(false); }}
                className="text-xs text-[#B3985B] hover:underline">Guardar</button>
            </div>
          ) : (
            <h1 className="text-white text-2xl font-bold cursor-pointer hover:text-[#ccc] transition-colors"
              onClick={() => setEditNombre(true)}>
              {proyecto.nombre}
            </h1>
          )}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[#555] text-sm">{AREA_LABELS[proyecto.area] ?? proyecto.area}</span>
            <span className="text-[#333]">·</span>
            <span className="text-[#555] text-sm">Líder: {proyecto.lider.name}</span>
            {proyecto.fechaInicio && (
              <>
                <span className="text-[#333]">·</span>
                <span className="text-[#555] text-sm">Inicio: {new Date(proyecto.fechaInicio).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</span>
              </>
            )}
          </div>
        </div>

        {/* Estado y prioridad */}
        <div className="flex gap-2 shrink-0">
          <select value={proyecto.estado} onChange={e => patchProyecto({ estado: e.target.value })}
            className="bg-[#111] border border-[#1a1a1a] rounded-lg px-2 py-1 text-xs text-white">
            {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={proyecto.prioridad} onChange={e => patchProyecto({ prioridad: e.target.value })}
            className="bg-[#111] border border-[#1a1a1a] rounded-lg px-2 py-1 text-xs text-white">
            {Object.entries(PRIO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Progreso */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[#555] uppercase tracking-wider font-semibold">Progreso general</p>
          <span className="text-lg font-bold text-white">{pctT}%</span>
        </div>
        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div className="h-full bg-[#B3985B] rounded-full transition-all" style={{ width: `${pctT}%` }} />
        </div>
        {totalT > 0 && (
          <p className="text-xs text-[#444] mt-1">{doneT} de {totalT} tareas completadas</p>
        )}
      </div>

      {/* Fases */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Fases</h2>
          <button onClick={() => setAddFase(true)} className="text-xs text-[#B3985B] hover:underline">+ Agregar fase</button>
        </div>

        {proyecto.fases.length === 0 && !addingFase && (
          <p className="text-[#444] text-sm">Sin fases definidas. <button onClick={() => setAddFase(true)} className="text-[#B3985B] hover:underline">Agregar una fase</button></p>
        )}

        {proyecto.fases.map((fase, idx) => (
          <div key={fase.id} className={`bg-[#111] border rounded-xl overflow-hidden ${fase.completada ? "border-green-900/30 opacity-70" : "border-[#1a1a1a]"}`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => toggleFase(fase.id, !fase.completada)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  fase.completada ? "border-green-500 bg-green-500/20" : "border-[#333] hover:border-[#B3985B]"
                }`}>
                {fase.completada && <span className="text-green-400 text-[10px]">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${fase.completada ? "line-through text-[#444]" : "text-white"}`}>
                  Fase {idx + 1} — {fase.nombre}
                </p>
                {fase.tareas.length > 0 && (
                  <p className="text-xs text-[#555] mt-0.5">
                    {fase.tareas.filter(t => t.estado === "COMPLETADA").length}/{fase.tareas.length} tareas
                  </p>
                )}
              </div>
            </div>

            {fase.tareas.length > 0 && (
              <div className="border-t border-[#1a1a1a] divide-y divide-[#0f0f0f]">
                {fase.tareas.map(t => (
                  <div key={t.id} className="flex items-center gap-2 px-4 py-2">
                    <EstadoTarea estado={t.estado} />
                    <p className={`text-xs flex-1 ${t.estado === "COMPLETADA" ? "line-through text-[#333]" : "text-[#aaa]"}`}>{t.titulo}</p>
                    {t.asignadoA && (
                      <span className="text-[10px] text-[#555] shrink-0">{t.asignadoA.name}</span>
                    )}
                    {t.fechaVencimiento && (
                      <span className="text-[10px] text-[#555] shrink-0">
                        {new Date(t.fechaVencimiento).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {addingFase && (
          <div className="flex gap-2">
            <input autoFocus value={faseName} onChange={e => setFaseName(e.target.value)}
              placeholder="Nombre de la fase"
              onKeyDown={e => { if (e.key === "Enter") addFase(); if (e.key === "Escape") setAddFase(false); }}
              className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333]" />
            <button onClick={addFase} disabled={saving || !faseName}
              className="px-3 py-2 bg-[#B3985B] text-black text-xs font-semibold rounded-lg disabled:opacity-40">
              {saving ? "..." : "Agregar"}
            </button>
            <button onClick={() => setAddFase(false)} className="px-3 py-2 text-[#555] hover:text-white text-xs transition-colors">
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Tareas sin fase */}
      {proyecto.tareas.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-white font-semibold">Tareas generales</h2>
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl divide-y divide-[#0f0f0f]">
            {proyecto.tareas.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-4 py-2.5">
                <EstadoTarea estado={t.estado} />
                <p className={`text-sm flex-1 ${t.estado === "COMPLETADA" ? "line-through text-[#333]" : "text-[#aaa]"}`}>{t.titulo}</p>
                {t.asignadoA && <span className="text-[10px] text-[#555]">{t.asignadoA.name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Descripción */}
      {proyecto.descripcion && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">
          <p className="text-[11px] text-[#555] uppercase tracking-wider mb-2">Descripción</p>
          <p className="text-sm text-[#666] leading-relaxed whitespace-pre-wrap">{proyecto.descripcion}</p>
        </div>
      )}
    </div>
  );
}
