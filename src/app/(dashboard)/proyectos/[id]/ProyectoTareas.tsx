"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
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

interface Usuario {
  id: string;
  name: string;
}

interface Props {
  proyectoId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIO_CONFIG: Record<string, { ring: string; dot: string; label: string; badge: string }> = {
  URGENTE: { ring: "border-red-500/60",    dot: "bg-red-500",    label: "Urgente", badge: "bg-red-950/40 text-red-400" },
  ALTA:    { ring: "border-orange-500/60", dot: "bg-orange-500", label: "Alta",    badge: "bg-orange-950/40 text-orange-400" },
  MEDIA:   { ring: "border-[#B3985B]/50",  dot: "bg-[#B3985B]",  label: "Media",   badge: "bg-[#B3985B]/10 text-[#B3985B]" },
  BAJA:    { ring: "border-[#2a2a2a]",     dot: "bg-[#333]",     label: "Baja",    badge: "bg-[#111] text-gray-500" },
};

const ESTADO_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  PENDIENTE:   { label: "Pendiente",    cls: "bg-gray-800 text-gray-400",          icon: "○" },
  EN_PROGRESO: { label: "En progreso",  cls: "bg-blue-950/40 text-blue-400",        icon: "◑" },
  COMPLETADA:  { label: "Completada",   cls: "bg-green-950/40 text-green-400",      icon: "●" },
  CANCELADA:   { label: "Cancelada",    cls: "bg-red-950/30 text-red-400/60",       icon: "✕" },
};

const AREAS = ["PRODUCCION", "LOGISTICA", "MARKETING", "RRHH", "ADMINISTRACION", "GENERAL"];
const PRIOS = ["URGENTE", "ALTA", "MEDIA", "BAJA"];

function formatFecha(iso: string): { label: string; cls: string } {
  const d   = new Date(iso.substring(0, 10) + "T00:00:00");
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const man = new Date(hoy); man.setDate(hoy.getDate() + 1);
  const sem = new Date(hoy); sem.setDate(hoy.getDate() + 7);

  if (d < hoy)  return { label: d.toLocaleDateString("es-MX", { month: "short", day: "numeric" }), cls: "text-red-400 bg-red-950/30" };
  if (d < man)  return { label: "Hoy",    cls: "text-emerald-400 bg-emerald-950/30" };
  if (d < new Date(man.getTime() + 86400000)) return { label: "Mañana", cls: "text-yellow-400 bg-yellow-950/20" };
  if (d <= sem) return { label: d.toLocaleDateString("es-MX", { weekday: "short" }), cls: "text-[#777] bg-[#111]" };
  return { label: d.toLocaleDateString("es-MX", { month: "short", day: "numeric" }), cls: "text-[#666] bg-[#0f0f0f]" };
}

const EMPTY_FORM = {
  titulo: "", descripcion: "", prioridad: "MEDIA", area: "PRODUCCION",
  asignadoAId: "", fecha: "", fechaVencimiento: "", notas: "",
};

// ─── TareaRow ─────────────────────────────────────────────────────────────────
function TareaRow({
  tarea,
  onToggleEstado,
  onEdit,
  onDelete,
}: {
  tarea: TareaProyecto;
  onToggleEstado: (id: string, next: string) => void;
  onEdit: (t: TareaProyecto) => void;
  onDelete: (id: string) => void;
}) {
  const prio   = PRIO_CONFIG[tarea.prioridad]  ?? PRIO_CONFIG.MEDIA;
  const estado = ESTADO_CONFIG[tarea.estado]   ?? ESTADO_CONFIG.PENDIENTE;
  const isCompleted = tarea.estado === "COMPLETADA";

  function nextEstado() {
    const cycle: Record<string, string> = {
      PENDIENTE: "EN_PROGRESO",
      EN_PROGRESO: "COMPLETADA",
      COMPLETADA: "PENDIENTE",
    };
    onToggleEstado(tarea.id, cycle[tarea.estado] ?? "PENDIENTE");
  }

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 rounded-xl border transition-all cursor-default ${
        isCompleted
          ? "bg-[#0d0d0d] border-[#1a1a1a] opacity-60"
          : `bg-[#111] border-[#1e1e1e] hover:border-[#2a2a2a] ${prio.ring}`
      }`}
    >
      {/* Estado toggle */}
      <button
        onClick={nextEstado}
        title={`Estado: ${estado.label} — clic para avanzar`}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isCompleted
            ? "border-green-500 bg-green-500/20 text-green-400 text-[10px]"
            : "border-[#333] hover:border-[#B3985B] text-transparent hover:text-[#B3985B] text-[10px]"
        }`}
      >
        {isCompleted ? "✓" : ""}
      </button>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${isCompleted ? "line-through text-gray-600" : "text-white"}`}>
            {tarea.titulo}
          </p>
          {/* Acciones */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => onEdit(tarea)}
              className="text-[10px] text-gray-500 hover:text-[#B3985B] px-1.5 py-0.5 rounded transition-colors"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(tarea.id)}
              className="text-[10px] text-gray-600 hover:text-red-400 px-1.5 py-0.5 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {tarea.descripcion && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{tarea.descripcion}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          {/* Estado badge */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${estado.cls}`}>
            {estado.icon} {estado.label}
          </span>

          {/* Prioridad */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${prio.badge}`}>
            {prio.label}
          </span>

          {/* Fecha */}
          {tarea.fecha && (() => {
            const { label, cls } = formatFecha(tarea.fecha);
            return (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
                📅 {label}
              </span>
            );
          })()}

          {/* Asignado */}
          {tarea.asignadoA && (
            <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#1a1a1a] font-medium">
              👤 {tarea.asignadoA.name}
            </span>
          )}

          {/* Counters */}
          {tarea._count.subtareas > 0 && (
            <span className="text-[10px] text-gray-600 px-2 py-0.5 rounded-full bg-[#111]">
              ⤷ {tarea._count.subtareas}
            </span>
          )}
          {tarea._count.comentarios > 0 && (
            <span className="text-[10px] text-gray-600 px-2 py-0.5 rounded-full bg-[#111]">
              💬 {tarea._count.comentarios}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TareaDrawer ──────────────────────────────────────────────────────────────
function TareaDrawer({
  tarea,
  usuarios,
  proyectoId,
  onClose,
  onSaved,
}: {
  tarea: TareaProyecto | null;
  usuarios: Usuario[];
  proyectoId: string;
  onClose: () => void;
  onSaved: (t: TareaProyecto) => void;
}) {
  const isNew = !tarea;
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tarea) {
      setForm({
        titulo:           tarea.titulo,
        descripcion:      tarea.descripcion ?? "",
        prioridad:        tarea.prioridad,
        area:             tarea.area,
        asignadoAId:      tarea.asignadoA?.id ?? "",
        fecha:            tarea.fecha ? tarea.fecha.substring(0, 10) : "",
        fechaVencimiento: tarea.fechaVencimiento ? tarea.fechaVencimiento.substring(0, 10) : "",
        notas:            tarea.notas ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [tarea]);

  async function save() {
    if (!form.titulo.trim()) return;
    setSaving(true);
    try {
      let res: Response;
      if (isNew) {
        res = await fetch(`/api/proyectos/${proyectoId}/tareas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo:           form.titulo,
            descripcion:      form.descripcion || null,
            prioridad:        form.prioridad,
            area:             form.area,
            asignadoAId:      form.asignadoAId || null,
            fecha:            form.fecha || null,
            fechaVencimiento: form.fechaVencimiento || null,
            notas:            form.notas || null,
          }),
        });
      } else {
        res = await fetch(`/api/tareas/${tarea!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo:           form.titulo,
            descripcion:      form.descripcion || null,
            prioridad:        form.prioridad,
            area:             form.area,
            asignadoAId:      form.asignadoAId || null,
            fecha:            form.fecha || null,
            fechaVencimiento: form.fechaVencimiento || null,
            notas:            form.notas || null,
          }),
        });
      }
      if (res.ok) {
        const data = await res.json();
        onSaved(data.tarea);
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#B3985B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors";
  const labelCls = "text-[11px] text-gray-500 uppercase tracking-wide mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <h3 className="text-white font-semibold text-sm">
            {isNew ? "Nueva tarea del proyecto" : "Editar tarea"}
          </h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Título */}
          <div>
            <label className={labelCls}>Título</label>
            <input
              className={inputCls}
              placeholder="¿Qué hay que hacer?"
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && save()}
              autoFocus
            />
          </div>

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              className={inputCls + " resize-none"}
              rows={2}
              placeholder="Detalles opcionales..."
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            />
          </div>

          {/* Prioridad + Área */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prioridad</label>
              <div className="flex flex-wrap gap-1.5">
                {PRIOS.map(p => {
                  const cfg = PRIO_CONFIG[p];
                  return (
                    <button
                      key={p}
                      onClick={() => setForm(f => ({ ...f, prioridad: p }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all font-medium ${
                        form.prioridad === p
                          ? `${cfg.badge} ${cfg.ring} border`
                          : "border-[#2a2a2a] text-gray-600 hover:border-[#3a3a3a]"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={labelCls}>Área</label>
              <select
                className={inputCls}
                value={form.area}
                onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
              >
                {AREAS.map(a => (
                  <option key={a} value={a}>{a.charAt(0) + a.slice(1).toLowerCase().replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Asignado + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Asignado a</label>
              <select
                className={inputCls}
                value={form.asignadoAId}
                onChange={e => setForm(f => ({ ...f, asignadoAId: e.target.value }))}
              >
                <option value="">Sin asignar</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha / Plazo</label>
              <input
                type="date"
                className={inputCls}
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls}>Notas internas</label>
            <textarea
              className={inputCls + " resize-none"}
              rows={2}
              placeholder="Notas adicionales..."
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 hover:text-white text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !form.titulo.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-40 text-black font-semibold text-sm transition-colors"
          >
            {saving ? "Guardando…" : isNew ? "Crear tarea" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProyectoTareas({ proyectoId }: Props) {
  const [tareas, setTareas]       = useState<TareaProyecto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [editingTarea, setEditingTarea] = useState<TareaProyecto | null>(null);
  const [quickInput, setQuickInput]     = useState("");
  const [addingQuick, setAddingQuick]   = useState(false);
  const [filterEstado, setFilterEstado] = useState<string>("activas");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/tareas`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTareas(data.tareas ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    load();
    fetch("/api/usuarios").then(r => r.json()).then(d => setUsuarios(d.usuarios ?? []));
  }, [load]);

  async function toggleEstado(id: string, next: string) {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, estado: next } : t));
    await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: next }),
    });
  }

  async function deleteTarea(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setTareas(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/tareas/${id}`, { method: "DELETE" });
  }

  async function quickAdd(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !quickInput.trim()) return;
    setAddingQuick(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/tareas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: quickInput.trim(), prioridad: "MEDIA", area: "PRODUCCION" }),
      });
      if (res.ok) {
        const data = await res.json();
        setTareas(prev => [...prev, data.tarea]);
        setQuickInput("");
      }
    } finally {
      setAddingQuick(false);
    }
  }

  function openNew() {
    setEditingTarea(null);
    setDrawerOpen(true);
  }

  function openEdit(t: TareaProyecto) {
    setEditingTarea(t);
    setDrawerOpen(true);
  }

  function onSaved(t: TareaProyecto) {
    setTareas(prev => {
      const exists = prev.find(x => x.id === t.id);
      return exists ? prev.map(x => x.id === t.id ? t : x) : [...prev, t];
    });
    setDrawerOpen(false);
    setEditingTarea(null);
  }

  // Filter
  const tareasFiltradas = tareas.filter(t => {
    if (filterEstado === "activas")    return t.estado !== "COMPLETADA" && t.estado !== "CANCELADA";
    if (filterEstado === "completadas") return t.estado === "COMPLETADA";
    return true;
  });

  // Stats
  const total       = tareas.filter(t => t.estado !== "CANCELADA").length;
  const completadas = tareas.filter(t => t.estado === "COMPLETADA").length;
  const pct         = total > 0 ? Math.round((completadas / total) * 100) : 0;
  const urgentes    = tareas.filter(t => t.prioridad === "URGENTE" && t.estado !== "COMPLETADA").length;
  const enProgreso  = tareas.filter(t => t.estado === "EN_PROGRESO").length;

  return (
    <div className="space-y-4">
      {/* ── Header con stats ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-base">Tareas del proyecto</h3>
            <p className="text-gray-500 text-xs mt-0.5">Gestiona las tareas específicas de este evento</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96e] text-black text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Nueva tarea
          </button>
        </div>

        {/* Stats */}
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{completadas}/{total} completadas</span>
              <span className={pct === 100 ? "text-green-400 font-semibold" : "text-[#B3985B]"}>{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : "bg-[#B3985B]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex gap-3 mt-1">
              {enProgreso > 0 && (
                <span className="text-[10px] text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded-full">◑ {enProgreso} en progreso</span>
              )}
              {urgentes > 0 && (
                <span className="text-[10px] text-red-400 bg-red-950/30 px-2 py-0.5 rounded-full">⚡ {urgentes} urgente{urgentes > 1 ? "s" : ""}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Quick add ── */}
      <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-4 py-2.5">
        <span className="text-gray-600 text-sm">+</span>
        <input
          className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
          placeholder="Escribe una tarea rápida y presiona Enter…"
          value={quickInput}
          onChange={e => setQuickInput(e.target.value)}
          onKeyDown={quickAdd}
          disabled={addingQuick}
        />
        {addingQuick && <span className="text-[10px] text-gray-600 animate-pulse">Guardando…</span>}
      </div>

      {/* ── Filters ── */}
      {total > 0 && (
        <div className="flex items-center gap-1">
          {(["activas", "completadas", "todas"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterEstado(f)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                filterEstado === f
                  ? "bg-[#1e1e1e] text-white"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {f === "activas" ? "Activas" : f === "completadas" ? "Completadas" : "Todas"}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-gray-600">{tareasFiltradas.length} tarea{tareasFiltradas.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* ── Lista de tareas ── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tareasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          {total === 0 ? (
            <div className="space-y-2">
              <div className="text-4xl">📋</div>
              <p className="text-sm">Sin tareas aún</p>
              <p className="text-xs">Agrega la primera tarea para este proyecto</p>
            </div>
          ) : (
            <p className="text-sm">Sin tareas {filterEstado === "completadas" ? "completadas" : "activas"}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {tareasFiltradas.map(t => (
            <TareaRow
              key={t.id}
              tarea={t}
              onToggleEstado={toggleEstado}
              onEdit={openEdit}
              onDelete={deleteTarea}
            />
          ))}
        </div>
      )}

      {/* ── Drawer ── */}
      {drawerOpen && (
        <TareaDrawer
          tarea={editingTarea}
          usuarios={usuarios}
          proyectoId={proyectoId}
          onClose={() => { setDrawerOpen(false); setEditingTarea(null); }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
