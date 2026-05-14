"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TareaR {
  id: string;
  titulo: string;
  prioridad: string;
  fecha: string | null;
  asignadoA:     { id: string; name: string } | null;
  proyectoTarea: { id: string; nombre: string; color: string | null } | null;
}

interface ProyData {
  id: string;
  nombre: string;
  color: string | null;
  carpeta: { id: string; nombre: string } | null;
  counts: {
    hoy: number; vencidas: number; proximas: number;
    sinFecha: number; totalActivas: number; completadasMes: number;
  };
  progress: number;
  tareas: { hoy: TareaR[]; vencidas: TareaR[]; proximas: TareaR[]; sinFecha: TareaR[] };
}

interface Usuario { id: string; name: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIO_DOT: Record<string, string> = {
  URGENTE: "bg-red-500", ALTA: "bg-orange-500", MEDIA: "bg-[#B3985B]", BAJA: "bg-[#444]",
};
const PRIO_OPTS = ["URGENTE", "ALTA", "MEDIA", "BAJA"];
const PRIO_LABEL: Record<string, string> = { URGENTE: "Urgente", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };

function getStatus(p: number) {
  if (p >= 60) return { label: "Excelente",  textCls: "text-emerald-400", barClr: "#10b981" };
  if (p >= 30) return { label: "Regular",    textCls: "text-yellow-400",  barClr: "#eab308" };
  return              { label: "En peligro", textCls: "text-red-400",     barClr: "#ef4444" };
}

function fechaCorta(iso: string) {
  return new Date(iso.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC", day: "numeric", month: "short",
  });
}

// ── TareaRow ──────────────────────────────────────────────────────────────────

function TareaRow({ t, onEdit, onReschedule }: {
  t: TareaR;
  onEdit: (t: TareaR) => void;
  onReschedule: (id: string, fecha: string) => void;
}) {
  const dateRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => onEdit(t)}
      className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-xl hover:bg-[#111] transition-colors group cursor-pointer"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIO_DOT[t.prioridad] ?? PRIO_DOT.BAJA}`} />
      <span className="flex-1 text-sm text-[#bbb] group-hover:text-white truncate leading-snug">
        {t.titulo}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {t.asignadoA && (
          <span className="w-5 h-5 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 text-[10px] text-[#B3985B] flex items-center justify-center font-bold select-none">
            {t.asignadoA.name.charAt(0).toUpperCase()}
          </span>
        )}
        {/* Fecha clickeable */}
        <span
          onClick={e => { e.stopPropagation(); dateRef.current?.showPicker?.(); dateRef.current?.click(); }}
          className="relative text-[11px] text-[#555] hover:text-[#B3985B] hover:bg-[#B3985B]/10 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
          title="Reagendar"
        >
          {t.fecha ? fechaCorta(t.fecha) : <span className="text-[#333] hover:text-[#B3985B]">+ fecha</span>}
          <input
            ref={dateRef}
            type="date"
            defaultValue={t.fecha ? t.fecha.substring(0, 10) : ""}
            onChange={e => { if (e.target.value) onReschedule(t.id, e.target.value); }}
            className="absolute inset-0 opacity-0 w-full cursor-pointer"
            style={{ colorScheme: "dark" }}
          />
        </span>
      </div>
    </div>
  );
}

// ── TaskSection ───────────────────────────────────────────────────────────────

function TaskSection({ icon, label, count, tasks, badgeCls, emptyMsg, onEdit, onReschedule }: {
  icon: React.ReactNode; label: string; count: number;
  tasks: TareaR[]; badgeCls: string; emptyMsg: string;
  onEdit: (t: TareaR) => void;
  onReschedule: (id: string, fecha: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 mb-1.5 w-full group">
        <span className="text-[#444] group-hover:text-[#666] transition-colors">{icon}</span>
        <span className="text-xs text-[#555] uppercase tracking-widest font-semibold group-hover:text-[#888] transition-colors">
          {label}
        </span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>{count}</span>
        <svg className={`w-3 h-3 text-[#333] ml-auto transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        count === 0
          ? <p className="text-sm text-[#2a2a2a] pl-1 pb-1">{emptyMsg}</p>
          : tasks.map(t => <TareaRow key={t.id} t={t} onEdit={onEdit} onReschedule={onReschedule} />)
      )}
    </div>
  );
}

// ── EditModal ─────────────────────────────────────────────────────────────────

function EditModal({ tarea, onClose, onSave }: {
  tarea: TareaR;
  onClose: () => void;
  onSave: (id: string, titulo: string, fecha: string, prioridad: string) => Promise<void>;
}) {
  const [titulo,    setTitulo]    = useState(tarea.titulo);
  const [fecha,     setFecha]     = useState(tarea.fecha ? tarea.fecha.substring(0, 10) : "");
  const [prioridad, setPrioridad] = useState(tarea.prioridad);
  const [saving,    setSaving]    = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(tarea.id, titulo.trim() || tarea.titulo, fecha, prioridad);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-5 w-full max-w-md space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Editar tarea</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div>
          <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Título</label>
          <input
            value={titulo} onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
            autoFocus
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Fecha</label>
            <input
              type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Prioridad</label>
            <div className="flex flex-col gap-1">
              {PRIO_OPTS.map(p => (
                <button key={p} onClick={() => setPrioridad(p)}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors ${prioridad === p ? "bg-[#1e1e1e] text-white" : "text-[#555] hover:text-white"}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIO_DOT[p]}`} />
                  {PRIO_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-xl bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm transition-colors disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <Link href={`/operaciones?open=${tarea.id}`}
            className="px-3 py-2 border border-[#333] text-[#666] hover:text-white text-xs rounded-xl transition-colors flex items-center">
            Abrir →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {[0,1,2,3].map(i => <div key={i} className="h-7 w-20 bg-[#1a1a1a] rounded-full animate-pulse" />)}
      </div>
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
        {[0,1,2,3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-28 bg-[#1a1a1a] rounded animate-pulse" />
            <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full animate-pulse" />
            <div className="h-3 w-10 bg-[#1a1a1a] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[0,1,2,3].map(i => <div key={i} className="h-28 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl animate-pulse" />)}
      </div>
    </div>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

const IconSun = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconAlert = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconCal = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconDots = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────

export default function GestionTareasWidget() {
  const [proyectos, setProyectos] = useState<ProyData[] | null>(null);
  const [usuarios,  setUsuarios]  = useState<Usuario[]>([]);
  const [selUser,   setSelUser]   = useState<string | null>(null);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [editTask,  setEditTask]  = useState<TareaR | null>(null);

  useEffect(() => {
    fetch("/api/usuarios").then(r => r.json()).then(d => { if (d.usuarios) setUsuarios(d.usuarios); });
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = selUser
      ? `/api/dashboard/tareas-proyectos?usuarioId=${selUser}`
      : "/api/dashboard/tareas-proyectos";
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.proyectos) {
          setProyectos(d.proyectos);
          setSelected(prev => {
            if (!prev && d.proyectos.length > 0) return d.proyectos[0].id;
            const stillExists = d.proyectos.find((p: ProyData) => p.id === prev);
            return stillExists ? prev : (d.proyectos[0]?.id ?? null);
          });
        }
        setLoading(false);
      });
  }, [selUser]);

  function updateTareaLocal(id: string, changes: Partial<TareaR>) {
    setProyectos(prev => prev ? prev.map(p => {
      const upd = (arr: TareaR[]) => arr.map(t => t.id === id ? { ...t, ...changes } : t);
      return { ...p, tareas: { hoy: upd(p.tareas.hoy), vencidas: upd(p.tareas.vencidas), proximas: upd(p.tareas.proximas), sinFecha: upd(p.tareas.sinFecha) } };
    }) : null);
  }

  async function saveEdit(id: string, titulo: string, fecha: string, prioridad: string) {
    await fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, fecha: fecha || null, prioridad }),
    });
    updateTareaLocal(id, { titulo, fecha: fecha || null, prioridad });
    setEditTask(null);
  }

  async function reschedule(id: string, fecha: string) {
    await fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha }),
    });
    updateTareaLocal(id, { fecha });
  }

  if (!proyectos) return <Skeleton />;

  const selData = proyectos.find(p => p.id === selected);

  return (
    <div className="space-y-5">

      {/* ── Filtro por usuario ──────────────────────────────────────────── */}
      {usuarios.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-[#444] uppercase tracking-widest font-semibold shrink-0">Ver por:</span>
          <button
            onClick={() => setSelUser(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              !selUser
                ? "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/30"
                : "text-[#555] border-[#1e1e1e] hover:text-white hover:border-[#333]"
            }`}
          >
            Todos
          </button>
          {usuarios.map(u => (
            <button
              key={u.id}
              onClick={() => setSelUser(selUser === u.id ? null : u.id)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                selUser === u.id
                  ? "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/30"
                  : "text-[#555] border-[#1e1e1e] hover:text-white hover:border-[#333]"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                selUser === u.id ? "bg-[#B3985B]/20 text-[#B3985B]" : "bg-[#1a1a1a] text-[#444]"
              }`}>
                {u.name.charAt(0).toUpperCase()}
              </span>
              {u.name.split(" ")[0]}
            </button>
          ))}
          {loading && (
            <span className="w-4 h-4 border border-[#222] border-t-[#B3985B] rounded-full animate-spin ml-1" />
          )}
        </div>
      )}

      {proyectos.length === 0 ? (
        <div className="text-center py-10 text-[#444] text-sm">
          {selUser ? "Sin tareas asignadas a este usuario en proyectos activos" : "Sin proyectos activos"}
        </div>
      ) : (
        <>
          {/* ── Barras de progreso ────────────────────────────────────────── */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5">
            <p className="text-[11px] text-[#444] uppercase tracking-widest font-semibold mb-4">
              Avance este mes — tareas completadas
            </p>
            <div className="space-y-3.5 max-h-52 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(179,152,91,0.2) transparent" }}>
              {proyectos.map(p => {
                const status = getStatus(p.progress);
                const isSel  = selected === p.id;
                return (
                  <button key={p.id} onClick={() => setSelected(p.id)}
                    className="w-full flex items-center gap-4 group"
                  >
                    <span className={`text-sm transition-colors w-36 text-left shrink-0 truncate ${isSel ? "text-white font-medium" : "text-[#666] group-hover:text-white"}`}>
                      {p.nombre}
                    </span>
                    <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${p.progress}%`, backgroundColor: p.color ?? status.barClr }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-white w-10 text-right shrink-0 tabular-nums">
                      {p.progress}%
                    </span>
                    <span className={`text-xs font-medium w-20 text-left shrink-0 ${status.textCls}`}>
                      {status.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Tarjetas por proyecto (compactas) ────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
            {proyectos.map(p => {
              const status = getStatus(p.progress);
              const isSel  = selected === p.id;
              return (
                <button key={p.id} onClick={() => setSelected(p.id)}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-all duration-150 ${
                    isSel
                      ? "bg-[#111] border-[#2a2a2a] shadow-lg"
                      : "bg-[#0a0a0a] border-[#161616] hover:border-[#242424] hover:bg-[#0d0d0d]"
                  }`}
                  style={isSel && p.color ? { borderColor: p.color + "40" } : undefined}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? "#555" }} />
                    <span className="text-[12px] font-semibold text-white truncate">{p.nombre}</span>
                  </div>
                  {p.carpeta && (
                    <p className="text-[10px] text-[#333] mb-1 truncate pl-[14px]">{p.carpeta.nombre}</p>
                  )}
                  <div className="flex items-baseline gap-1.5 mt-1.5 mb-1">
                    <span className={`text-xl font-bold leading-none ${status.textCls}`}>{p.progress}%</span>
                    <span className={`text-[10px] font-medium ${status.textCls}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.counts.completadasMes > 0 && (
                      <span className="text-[10px] text-[#444]">{p.counts.completadasMes} listas</span>
                    )}
                    {p.counts.vencidas > 0 && (
                      <span className="text-[10px] text-red-400 font-semibold">{p.counts.vencidas} venc.</span>
                    )}
                    {p.counts.hoy > 0 && (
                      <span className="text-[10px] text-emerald-400">{p.counts.hoy} hoy</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Detalle del proyecto seleccionado ────────────────────────── */}
          {selData && (
            <div
              key={selected}
              className="bg-[#0a0a0a] border rounded-2xl overflow-hidden"
              style={{ borderColor: (selData.color ?? "#2a2a2a") + "30" }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#141414]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selData.color ?? "#555" }} />
                  <span className="font-semibold text-white truncate">{selData.nombre}</span>
                  {selData.carpeta && (
                    <span className="text-[10px] text-[#444] bg-[#111] px-2 py-0.5 rounded-full shrink-0">
                      {selData.carpeta.nombre}
                    </span>
                  )}
                  <span className="text-[#3a3a3a] text-sm shrink-0 hidden md:inline">
                    {selData.counts.totalActivas} activas · {selData.counts.completadasMes} completadas este mes
                  </span>
                </div>
                <Link href="/operaciones" className="text-xs text-[#B3985B] hover:underline shrink-0 ml-4">
                  Ver en Gestión →
                </Link>
              </div>

              <div className="px-6 py-5 space-y-6">
                <TaskSection icon={IconSun} label="Para hoy"
                  count={selData.counts.hoy} tasks={selData.tareas.hoy}
                  badgeCls="bg-emerald-950/40 text-emerald-400" emptyMsg="Sin tareas para hoy"
                  onEdit={setEditTask} onReschedule={reschedule} />

                <TaskSection icon={IconAlert} label="Vencidas"
                  count={selData.counts.vencidas} tasks={selData.tareas.vencidas}
                  badgeCls="bg-red-950/40 text-red-400" emptyMsg="Sin tareas vencidas ✓"
                  onEdit={setEditTask} onReschedule={reschedule} />

                <TaskSection icon={IconCal} label="Próximas 14 días"
                  count={selData.counts.proximas} tasks={selData.tareas.proximas}
                  badgeCls="bg-[#1a1a1a] text-[#888]" emptyMsg="Sin tareas programadas en los próximos 14 días"
                  onEdit={setEditTask} onReschedule={reschedule} />

                {selData.counts.sinFecha > 0 && (
                  <TaskSection icon={IconDots} label="Sin programar"
                    count={selData.counts.sinFecha} tasks={selData.tareas.sinFecha}
                    badgeCls="bg-[#1a1a1a] text-[#555]" emptyMsg=""
                    onEdit={setEditTask} onReschedule={reschedule} />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal de edición ─────────────────────────────────────────────── */}
      {editTask && (
        <EditModal
          tarea={editTask}
          onClose={() => setEditTask(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}
