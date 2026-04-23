"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import DatePicker from "@/components/ui/DatePicker";
import { Combobox } from "@/components/Combobox";

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

interface SubtareaDetalle {
  id: string;
  titulo: string;
  estado: string;
  prioridad: string;
  fecha: string | null;
  _count: { subtareas: number };
}

interface ComentarioDetalle {
  id: string;
  contenido: string;
  createdAt: string;
  autor: { id: string; name: string } | null;
}

interface ArchivoDetalle {
  id: string;
  nombre: string;
  url: string;
  tipo: string | null;
  tamano: number | null;
  createdAt: string;
  subidoPor: { id: string; name: string } | null;
}

interface TareaDetalle extends TareaProyecto {
  recurrencia: string | null;
  etiquetas: string | null;
  subtareas: SubtareaDetalle[];
  comentarios: ComentarioDetalle[];
  archivos: ArchivoDetalle[];
}

interface Usuario {
  id: string;
  name: string;
}

interface Props {
  proyectoId: string;
  proyectoNombre?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIO_FLAGS: { key: string; label: string; color: string }[] = [
  { key: "URGENTE", label: "Urgente", color: "#f87171" },
  { key: "ALTA",    label: "Alta",    color: "#fb923c" },
  { key: "MEDIA",   label: "Media",   color: "#eab308" },
  { key: "BAJA",    label: "Baja",    color: "#6b7280" },
];

const PRIO_CONFIG: Record<string, { ring: string; label: string; badge: string }> = {
  URGENTE: { ring: "border-red-500/60",    label: "Urgente", badge: "bg-red-950/40 text-red-400" },
  ALTA:    { ring: "border-orange-500/60", label: "Alta",    badge: "bg-orange-950/40 text-orange-400" },
  MEDIA:   { ring: "border-[#B3985B]/50",  label: "Media",   badge: "bg-[#B3985B]/10 text-[#B3985B]" },
  BAJA:    { ring: "border-[#2a2a2a]",     label: "Baja",    badge: "bg-[#111] text-gray-500" },
};

const ESTADO_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  PENDIENTE:   { label: "Pendiente",   cls: "bg-gray-800 text-gray-400",       icon: "○" },
  EN_PROGRESO: { label: "En progreso", cls: "bg-blue-950/40 text-blue-400",     icon: "◑" },
  COMPLETADA:  { label: "Completada",  cls: "bg-green-950/40 text-green-400",   icon: "●" },
  CANCELADA:   { label: "Cancelada",   cls: "bg-red-950/30 text-red-400/60",    icon: "✕" },
};

function FlagIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24"
      fill={filled ? color : "none"} stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  );
}

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

// ─── TareaRow ─────────────────────────────────────────────────────────────────
function TareaRow({
  tarea,
  onToggleEstado,
  onOpen,
  onDelete,
}: {
  tarea: TareaProyecto;
  onToggleEstado: (id: string, next: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const prio   = PRIO_CONFIG[tarea.prioridad]  ?? PRIO_CONFIG.MEDIA;
  const estado = ESTADO_CONFIG[tarea.estado]   ?? ESTADO_CONFIG.PENDIENTE;
  const isCompleted = tarea.estado === "COMPLETADA";

  function nextEstado(e: React.MouseEvent) {
    e.stopPropagation();
    const cycle: Record<string, string> = {
      PENDIENTE: "EN_PROGRESO", EN_PROGRESO: "COMPLETADA", COMPLETADA: "PENDIENTE",
    };
    onToggleEstado(tarea.id, cycle[tarea.estado] ?? "PENDIENTE");
  }

  return (
    <div
      onClick={() => onOpen(tarea.id)}
      className={`group flex items-start gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
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
          <button
            onClick={e => { e.stopPropagation(); onDelete(tarea.id); }}
            className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-600 hover:text-red-400 px-1.5 py-0.5 rounded transition-all flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {tarea.descripcion && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{tarea.descripcion}</p>
        )}

        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${estado.cls}`}>
            {estado.icon} {estado.label}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${prio.badge}`}>
            {prio.label}
          </span>
          {tarea.fecha && (() => {
            const { label, cls } = formatFecha(tarea.fecha!);
            return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>📅 {label}</span>;
          })()}
          {tarea.asignadoA && (
            <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#1a1a1a] font-medium">
              👤 {tarea.asignadoA.name}
            </span>
          )}
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

// ─── ProyectoTaskModal ────────────────────────────────────────────────────────
function ProyectoTaskModal({
  tareaId,
  proyectoId,
  proyectoNombre,
  usuarios,
  onClose,
  onSaved,
  onDeleted,
}: {
  tareaId: string | null;
  proyectoId: string;
  proyectoNombre: string;
  usuarios: Usuario[];
  onClose: () => void;
  onSaved: (t: TareaProyecto, isNew: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const [activeId, setActiveId]           = useState<string | null>(tareaId);
  const [detalle, setDetalle]             = useState<TareaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(tareaId !== null);

  const [titulo, setTitulo]           = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [notas, setNotas]             = useState("");
  const [prioridad, setPrioridad]     = useState("MEDIA");
  const [asignadoAId, setAsignadoAId] = useState("");
  const [fecha, setFecha]             = useState("");
  const [fechaVen, setFechaVen]       = useState("");
  const [showFechaVenPicker, setShowFechaVenPicker] = useState(false);
  const [dirty, setDirty]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [creating, setCreating]       = useState(false);

  const [subtareasLocal, setSubtareasLocal]   = useState<SubtareaDetalle[]>([]);
  const [quickSubtarea, setQuickSubtarea]     = useState("");
  const [addingSubtarea, setAddingSubtarea]   = useState(false);
  const [comentariosLocal, setComentariosLocal] = useState<ComentarioDetalle[]>([]);
  const [comentario, setComentario]           = useState("");
  const [archivosLocal, setArchivosLocal]     = useState<ArchivoDetalle[]>([]);
  const [uploading, setUploading]             = useState(false);
  const [addingUrl, setAddingUrl]             = useState(false);
  const [urlManual, setUrlManual]             = useState("");
  const [nombreManual, setNombreManual]       = useState("");

  const titleRef  = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId) {
      setLoadingDetalle(false);
      setTimeout(() => titleRef.current?.focus(), 80);
      return;
    }
    setLoadingDetalle(true);
    fetch(`/api/tareas/${activeId}`)
      .then(r => r.json())
      .then(data => {
        const t = data.tarea as TareaDetalle;
        setDetalle(t);
        setTitulo(t.titulo);
        setDescripcion(t.descripcion ?? "");
        setNotas(t.notas ?? "");
        setPrioridad(t.prioridad);
        setAsignadoAId(t.asignadoA?.id ?? "");
        setFecha(t.fecha ? t.fecha.substring(0, 10) : "");
        setFechaVen(t.fechaVencimiento ? t.fechaVencimiento.substring(0, 10) : "");
        setSubtareasLocal(t.subtareas ?? []);
        setComentariosLocal(t.comentarios ?? []);
        setArchivosLocal(t.archivos ?? []);
        setDirty(false);
        setTimeout(() => titleRef.current?.focus(), 80);
      })
      .catch(() => {})
      .finally(() => setLoadingDetalle(false));
  }, [activeId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mark = () => setDirty(true);
  const inEditMode = activeId !== null;
  const isCompleted = detalle?.estado === "COMPLETADA";

  async function handleCreate() {
    if (!titulo.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/tareas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descripcion: descripcion || null,
          prioridad,
          asignadoAId: asignadoAId || null,
          fecha: fecha || null,
          notas: notas || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSaved(data.tarea, true);
        setActiveId(data.tarea.id);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!activeId || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tareas/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo:           titulo           || null,
          descripcion:      descripcion      || null,
          notas:            notas            || null,
          prioridad,
          asignadoAId:      asignadoAId      || null,
          fecha:            fecha            || null,
          fechaVencimiento: fechaVen         || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetalle(prev => prev ? { ...prev, ...data.tarea } : null);
        onSaved(data.tarea, false);
        setDirty(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!activeId || !detalle) return;
    const next = isCompleted ? "PENDIENTE" : "COMPLETADA";
    const res = await fetch(`/api/tareas/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: next }),
    });
    if (res.ok) {
      const data = await res.json();
      setDetalle(prev => prev ? { ...prev, estado: data.tarea.estado } : null);
      onSaved(data.tarea, false);
    }
  }

  async function handleEstadoChange(est: string) {
    if (!activeId) return;
    const res = await fetch(`/api/tareas/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: est }),
    });
    if (res.ok) {
      const data = await res.json();
      setDetalle(prev => prev ? { ...prev, estado: data.tarea.estado } : null);
      onSaved(data.tarea, false);
    }
  }

  async function handleDelete() {
    if (!activeId || !confirm("¿Eliminar esta tarea?")) return;
    await fetch(`/api/tareas/${activeId}`, { method: "DELETE" });
    onDeleted(activeId);
    onClose();
  }

  async function addSubtarea(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !quickSubtarea.trim() || !activeId) return;
    setAddingSubtarea(true);
    try {
      const res = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: quickSubtarea.trim(),
          parentId: activeId,
          prioridad: "MEDIA",
          area: "PRODUCCION",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubtareasLocal(prev => [...prev, {
          id: data.tarea.id, titulo: data.tarea.titulo,
          estado: data.tarea.estado, prioridad: data.tarea.prioridad,
          fecha: data.tarea.fecha, _count: { subtareas: 0 },
        }]);
        setQuickSubtarea("");
      }
    } finally {
      setAddingSubtarea(false);
    }
  }

  async function completeSubtarea(sub: SubtareaDetalle) {
    const next = sub.estado === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    await fetch(`/api/tareas/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: next }),
    });
    setSubtareasLocal(prev => prev.map(s => s.id === sub.id ? { ...s, estado: next } : s));
  }

  async function deleteSubtarea(id: string) {
    await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    setSubtareasLocal(prev => prev.filter(s => s.id !== id));
  }

  async function enviarComentario() {
    if (!activeId || !comentario.trim()) return;
    const res = await fetch(`/api/tareas/${activeId}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: comentario }),
    });
    if (res.ok) {
      const data = await res.json();
      setComentariosLocal(prev => [...prev, data.comentario]);
      setComentario("");
    }
  }

  async function subirArchivo(file: File) {
    if (!activeId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/tareas/${activeId}/archivos`, { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        setArchivosLocal(prev => [data.archivo, ...prev]);
      } else {
        alert(data.error ?? "Error al subir archivo");
      }
    } catch {
      alert("Error de conexión al subir archivo");
    } finally {
      setUploading(false);
    }
  }

  async function adjuntarUrl() {
    if (!activeId || !urlManual.trim()) return;
    const form = new FormData();
    form.append("url", urlManual.trim());
    form.append("nombre", nombreManual.trim() || urlManual.split("/").pop() || "archivo");
    const res = await fetch(`/api/tareas/${activeId}/archivos`, { method: "POST", body: form });
    if (res.ok) {
      const { archivo } = await res.json();
      setArchivosLocal(prev => [archivo, ...prev]);
      setUrlManual(""); setNombreManual(""); setAddingUrl(false);
    }
  }

  async function eliminarArchivo(aid: string) {
    if (!activeId) return;
    await fetch(`/api/tareas/${activeId}/archivos/${aid}`, { method: "DELETE" });
    setArchivosLocal(prev => prev.filter(a => a.id !== aid));
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl flex flex-col shadow-2xl overflow-hidden">

        {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#1a1a1a] shrink-0">
          <button
            onClick={inEditMode ? handleComplete : undefined}
            disabled={!inEditMode}
            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
              isCompleted
                ? "bg-[#B3985B] border-[#B3985B]"
                : inEditMode
                  ? "border-[#333] hover:border-[#B3985B]"
                  : "border-[#222] opacity-30"
            }`}
          >
            {isCompleted && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M2 6l3 3 5-5"/>
              </svg>
            )}
          </button>

          <div className="flex-1 flex items-center gap-1 min-w-0 overflow-hidden">
            <span className="text-[11px] text-[#444] truncate">
              <span className="text-[#B3985B]/70">Proyectos</span>
              <span className="text-[#2a2a2a]"> › </span>
              <span className="text-[#555]">{proyectoNombre}</span>
              <span className="text-[#2a2a2a]"> › </span>
              <span className="text-[#444]">{inEditMode ? "Tareas" : "Nueva tarea"}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                dirty && inEditMode
                  ? "bg-[#B3985B]/15 border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/25"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            {inEditMode && (
              <button
                onClick={handleDelete}
                className="w-7 h-7 flex items-center justify-center rounded text-[#333] hover:text-red-400 hover:bg-red-950/20 transition-all"
                title="Eliminar tarea"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded text-[#333] hover:text-white hover:bg-[#1a1a1a] transition-all"
              title="Cerrar"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────────────── */}
        {loadingDetalle ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border border-[#333] border-t-[#B3985B] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_240px]">

            {/* ── LEFT COLUMN ───────────────────────────────────────────── */}
            <div className="md:overflow-y-auto p-5 space-y-5 border-b md:border-b-0 md:border-r border-[#141414]">

              {/* Title */}
              <textarea
                ref={titleRef}
                value={titulo}
                onChange={e => { setTitulo(e.target.value); mark(); }}
                placeholder="Título de la tarea"
                className="w-full bg-transparent text-white text-xl font-semibold resize-none focus:outline-none placeholder-[#2a2a2a] leading-snug"
                rows={titulo.split("\n").length || 1}
              />

              {/* Description */}
              <textarea
                value={descripcion}
                onChange={e => { setDescripcion(e.target.value); mark(); }}
                placeholder="Añade una descripción…"
                className="w-full bg-transparent text-sm text-[#777] resize-none focus:outline-none placeholder-[#2a2a2a] leading-relaxed"
                rows={3}
              />

              {/* Subtasks — edit mode only */}
              {inEditMode && (
                <div>
                  <p className="text-[11px] text-[#444] uppercase tracking-widest font-semibold mb-2">Subtareas</p>
                  {subtareasLocal.map(sub => (
                    <div key={sub.id} className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#111] mb-0.5">
                      <button
                        onClick={() => completeSubtarea(sub)}
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          sub.estado === "COMPLETADA"
                            ? "bg-green-500/20 border-green-500 text-green-400 text-[9px]"
                            : "border-[#333] hover:border-[#B3985B] text-transparent text-[9px]"
                        }`}
                      >
                        {sub.estado === "COMPLETADA" ? "✓" : ""}
                      </button>
                      <span className={`flex-1 text-sm ${sub.estado === "COMPLETADA" ? "line-through text-gray-600" : "text-[#c4c4c4]"}`}>
                        {sub.titulo}
                      </span>
                      {sub.fecha && (() => {
                        const { label, cls } = formatFecha(sub.fecha!);
                        return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
                      })()}
                      <button
                        onClick={() => deleteSubtarea(sub.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#333] hover:text-red-400 transition-all"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[#333] text-xs">+</span>
                    <input
                      value={quickSubtarea}
                      onChange={e => setQuickSubtarea(e.target.value)}
                      onKeyDown={addSubtarea}
                      placeholder="Agregar subtarea…"
                      disabled={addingSubtarea}
                      className="flex-1 bg-transparent text-sm text-white placeholder-[#2a2a2a] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-[11px] text-[#444] uppercase tracking-widest font-semibold mb-2">Notas</p>
                <textarea
                  value={notas}
                  onChange={e => { setNotas(e.target.value); mark(); }}
                  placeholder="Notas adicionales…"
                  className="w-full bg-[#080808] border border-[#1a1a1a] rounded-xl px-3 py-2.5 text-sm text-[#888] resize-none focus:outline-none focus:border-[#2a2a2a] placeholder-[#2a2a2a] leading-relaxed"
                  rows={4}
                />
              </div>

              {/* Files — edit mode only */}
              {inEditMode && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-[#444] uppercase tracking-widest font-semibold">Archivos</p>
                    <div className="flex gap-3">
                      <label className="cursor-pointer text-xs text-[#555] hover:text-[#B3985B] transition-colors">
                        <input type="file" multiple className="hidden"
                          onChange={e => { Array.from(e.target.files ?? []).forEach(subirArchivo); }} />
                        ↑ Subir
                      </label>
                      <button onClick={() => setAddingUrl(!addingUrl)} className="text-xs text-[#555] hover:text-[#B3985B] transition-colors">
                        🔗 URL
                      </button>
                    </div>
                  </div>

                  {addingUrl && (
                    <div className="mb-2 space-y-1 p-3 bg-[#080808] border border-[#1a1a1a] rounded-xl">
                      <input value={urlManual} onChange={e => setUrlManual(e.target.value)} placeholder="https://…"
                        className="w-full bg-transparent text-xs text-white placeholder-[#333] focus:outline-none" />
                      <input value={nombreManual} onChange={e => setNombreManual(e.target.value)} placeholder="Nombre (opcional)"
                        className="w-full bg-transparent text-xs text-white placeholder-[#333] focus:outline-none" />
                      <div className="flex gap-2 pt-1">
                        <button onClick={adjuntarUrl} className="text-xs text-[#B3985B] hover:underline">Adjuntar</button>
                        <button onClick={() => setAddingUrl(false)} className="text-xs text-[#555] hover:text-white">Cancelar</button>
                      </div>
                    </div>
                  )}

                  {uploading && <p className="text-xs text-[#555] mb-1">Subiendo…</p>}

                  {archivosLocal.length === 0 && !uploading ? (
                    <p className="text-xs text-[#2a2a2a] py-1">Sin archivos adjuntos</p>
                  ) : (
                    <div className="space-y-1">
                      {archivosLocal.map(a => (
                        <div key={a.id} className="flex items-center gap-2 group py-1.5 px-2 rounded-lg hover:bg-[#111]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <a href={a.url} target="_blank" rel="noopener noreferrer"
                            className="flex-1 text-xs text-[#888] hover:text-white truncate">{a.nombre}</a>
                          {a.tamano && <span className="text-[11px] text-[#444]">{(a.tamano / 1024).toFixed(0)}KB</span>}
                          <button onClick={() => eliminarArchivo(a.id)}
                            className="opacity-0 group-hover:opacity-100 text-[#333] hover:text-red-400 transition-all">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Comments — edit mode only */}
              {inEditMode && (
                <div>
                  <p className="text-[11px] text-[#444] uppercase tracking-widest font-semibold mb-3">Comentarios</p>
                  {comentariosLocal.length === 0 && (
                    <p className="text-xs text-[#2a2a2a] mb-3">Sin comentarios aún</p>
                  )}
                  {comentariosLocal.map(c => (
                    <div key={c.id} className="group flex gap-3 mb-4">
                      <div className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 text-[11px] font-semibold text-[#B3985B]">
                        {c.autor?.name.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[#888]">{c.autor?.name ?? "Desconocido"}</span>
                          <span className="text-[11px] text-[#333]">
                            {new Date(c.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-[#c4c4c4] whitespace-pre-wrap">{c.contenido}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 items-end mt-2">
                    <textarea
                      value={comentario}
                      onChange={e => setComentario(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarComentario(); } }}
                      placeholder="Escribe un comentario… (Enter para enviar)"
                      className="flex-1 bg-[#080808] border border-[#1a1a1a] rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-[#2a2a2a] placeholder-[#2a2a2a]"
                      rows={2}
                    />
                    <button
                      onClick={enviarComentario}
                      disabled={!comentario.trim()}
                      className="px-3 py-2 bg-[#1a1a1a] text-[#B3985B] text-xs rounded-xl hover:bg-[#222] transition-colors disabled:opacity-30"
                    >→</button>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN ──────────────────────────────────────────── */}
            <div className="md:overflow-y-auto p-4 space-y-5 bg-[#090909]">

              {/* Priority */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-2">Prioridad</p>
                <div className="grid grid-cols-2 gap-1">
                  {PRIO_FLAGS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => { setPrioridad(p.key); mark(); }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        prioridad === p.key
                          ? "border-transparent text-white"
                          : "border-[#1a1a1a] text-[#444] hover:text-[#777] hover:border-[#2a2a2a]"
                      }`}
                      style={prioridad === p.key ? { background: p.color + "22", borderColor: p.color + "55" } : {}}
                    >
                      <FlagIcon color={p.color} filled={prioridad === p.key} />
                      <span style={prioridad === p.key ? { color: p.color } : {}}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignee */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Asignado a</p>
                <Combobox
                  value={asignadoAId}
                  onChange={v => { setAsignadoAId(v); mark(); }}
                  options={[{ value: "", label: "— Sin asignar —" }, ...usuarios.map(u => ({ value: u.id, label: u.name }))]}
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>

              {/* Fecha */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-2">Fecha</p>
                <div className="space-y-2">
                  <DatePicker value={fecha} onChange={val => { setFecha(val); mark(); }} size="sm" />
                  {(fechaVen || showFechaVenPicker) ? (
                    <DatePicker
                      value={fechaVen}
                      onChange={val => { setFechaVen(val); mark(); if (!val) setShowFechaVenPicker(false); }}
                      size="sm" showClear placeholder="Fecha límite"
                    />
                  ) : (
                    <button onClick={() => setShowFechaVenPicker(true)}
                      className="text-xs text-[#333] hover:text-[#666] transition-colors">
                      + Fecha límite
                    </button>
                  )}
                </div>
              </div>

              {/* Estado — edit mode only */}
              {inEditMode && (
                <div>
                  <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Estado</p>
                  <div className="flex flex-wrap gap-1">
                    {(["PENDIENTE", "EN_PROGRESO", "COMPLETADA", "CANCELADA"] as const).map(est => {
                      const colors: Record<string, string> = {
                        PENDIENTE: "#6b7280", EN_PROGRESO: "#3b82f6",
                        COMPLETADA: "#22c55e", CANCELADA: "#ef4444",
                      };
                      const labels: Record<string, string> = {
                        PENDIENTE: "Pendiente", EN_PROGRESO: "En progreso",
                        COMPLETADA: "Completada", CANCELADA: "Cancelada",
                      };
                      const isActive = detalle?.estado === est;
                      return (
                        <button
                          key={est}
                          onClick={() => handleEstadoChange(est)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                            isActive ? "border-transparent" : "border-[#1a1a1a] text-[#444] hover:text-[#666]"
                          }`}
                          style={isActive ? { background: colors[est] + "22", borderColor: colors[est] + "55", color: colors[est] } : {}}
                        >
                          {labels[est]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Create button — create mode only */}
              {!inEditMode && (
                <button
                  onClick={handleCreate}
                  disabled={creating || !titulo.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-40 text-black font-semibold text-sm transition-colors"
                >
                  {creating ? "Creando…" : "Crear tarea"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProyectoTareas({ proyectoId, proyectoNombre = "Proyecto" }: Props) {
  const [tareas, setTareas]             = useState<TareaProyecto[]>([]);
  const [loading, setLoading]           = useState(true);
  const [usuarios, setUsuarios]         = useState<Usuario[]>([]);
  const [modalOpen, setModalOpen]       = useState(false);
  const [modalTareaId, setModalTareaId] = useState<string | null>(null);
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
    setModalTareaId(null);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    setModalTareaId(id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalTareaId(null);
  }

  function onSaved(t: TareaProyecto, isNew: boolean) {
    if (isNew) {
      setTareas(prev => [...prev, t]);
    } else {
      setTareas(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x));
    }
  }

  function onDeleted(id: string) {
    setTareas(prev => prev.filter(t => t.id !== id));
  }

  const tareasFiltradas = tareas.filter(t => {
    if (filterEstado === "activas")     return t.estado !== "COMPLETADA" && t.estado !== "CANCELADA";
    if (filterEstado === "completadas") return t.estado === "COMPLETADA";
    return true;
  });

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
                filterEstado === f ? "bg-[#1e1e1e] text-white" : "text-gray-600 hover:text-gray-400"
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
              onOpen={openEdit}
              onDelete={deleteTarea}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {modalOpen && (
        <ProyectoTaskModal
          tareaId={modalTareaId}
          proyectoId={proyectoId}
          proyectoNombre={proyectoNombre}
          usuarios={usuarios}
          onClose={closeModal}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
