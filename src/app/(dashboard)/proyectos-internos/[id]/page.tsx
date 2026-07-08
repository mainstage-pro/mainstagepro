"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

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

type TareaItem = {
  id: string; titulo: string; estado: string; prioridad: string;
  fechaVencimiento: string | null;
  asignadoA: { id: string; name: string } | null;
};

type Proyecto = {
  id: string; nombre: string; descripcion: string | null; area: string;
  estado: string; prioridad: string; porcentajeAvance: number;
  fechaInicio: string | null; fechaFin: string | null;
  tareas: TareaItem[];
};

function EstadoTarea({ estado }: { estado: string }) {
  const cls = estado === "COMPLETADA" ? "text-green-400" : estado === "EN_PROGRESO" ? "text-blue-400" : "text-[#555]";
  const dot = estado === "COMPLETADA" ? "●" : estado === "EN_PROGRESO" ? "◐" : "○";
  return <span className={`text-xs ${cls}`}>{dot}</span>;
}

export default function ProyectoInternoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading]   = useState(true);
  const [editNombre, setEditNombre] = useState(false);
  const [nombre, setNombre]     = useState("");
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

  if (loading) return <div className="p-6 text-[#444] text-sm">Cargando...</div>;
  if (!proyecto) return <div className="p-6 text-[#444] text-sm">Proyecto no encontrado.</div>;

  const totalT = proyecto.tareas.length;
  const doneT  = proyecto.tareas.filter(t => t.estado === "COMPLETADA").length;
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

      {/* Tareas */}
      <div className="space-y-2">
        <h2 className="text-white font-semibold">Tareas</h2>
        {proyecto.tareas.length === 0 ? (
          <p className="text-[#444] text-sm">Sin tareas. Crea tareas desde Gestión Operativa vinculando este proyecto.</p>
        ) : (
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl divide-y divide-[#0f0f0f]">
            {proyecto.tareas.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-4 py-2.5">
                <EstadoTarea estado={t.estado} />
                <p className={`text-sm flex-1 ${t.estado === "COMPLETADA" ? "line-through text-[#333]" : "text-[#aaa]"}`}>{t.titulo}</p>
                {t.asignadoA && <span className="text-[10px] text-[#555]">{t.asignadoA.name}</span>}
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

      {/* Descripción */}
      {proyecto.descripcion && (
        <div className="ms-card-deep p-4">
          <p className="text-[11px] text-[#555] uppercase tracking-wider mb-2">Descripción</p>
          <p className="text-sm text-[#666] leading-relaxed whitespace-pre-wrap">{proyecto.descripcion}</p>
        </div>
      )}
    </div>
  );
}
