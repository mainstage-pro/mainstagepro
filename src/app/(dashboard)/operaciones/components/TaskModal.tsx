"use client";
import { useState, useEffect, useRef } from "react";
import { formatearRecurrencia, parsearRecurrencia } from "@/lib/recurrencia";
import DatePicker from "@/components/ui/DatePicker";
import QuickAdd from "./QuickAdd";
import TaskItem, { type TareaItem } from "./TaskItem";

interface Usuario { id: string; name: string }
interface Proyecto { id: string; nombre: string; color: string | null }
interface Iniciativa { id: string; nombre: string; color: string | null }

interface Subtarea {
  id: string; titulo: string; estado: string; prioridad: string;
  fecha: string | null; fechaVencimiento: string | null;
  _count: { subtareas: number };
}

function subtareaToItem(s: Subtarea): TareaItem {
  return {
    id: s.id, titulo: s.titulo, descripcion: null,
    prioridad: s.prioridad, area: "GENERAL", estado: s.estado,
    fecha: s.fecha, fechaVencimiento: s.fechaVencimiento,
    recurrencia: null, proyectoTarea: null, seccion: null, asignadoA: null,
    _count: { subtareas: s._count.subtareas, comentarios: 0, archivos: 0 },
  };
}

interface Comentario {
  id: string; contenido: string; createdAt: string;
  autor: { id: string; name: string } | null;
}
interface Archivo {
  id: string; nombre: string; url: string; tipo: string | null; tamano: number | null;
  createdAt: string; subidoPor: { id: string; name: string } | null;
}

export interface TareaDetalle {
  id: string; titulo: string; descripcion: string | null; prioridad: string;
  area: string; estado: string; notas: string | null; etiquetas: string | null;
  fecha: string | null; fechaVencimiento: string | null; recurrencia: string | null;
  asignadoA: { id: string; name: string } | null;
  proyectoTarea: { id: string; nombre: string; color: string | null } | null;
  seccion: { id: string; nombre: string } | null;
  carpeta: { id: string; nombre: string } | null;
  iniciativa: { id: string; nombre: string; color: string | null } | null;
  subtareas: Subtarea[];
  comentarios: Comentario[];
  archivos: Archivo[];
}

interface Props {
  tarea: TareaDetalle | null;
  loading: boolean;
  usuarios: Usuario[];
  proyectos: Proyecto[];
  iniciativas: Iniciativa[];
  sessionId: string;
  onClose: () => void;
  onSave: (id: string, patch: Record<string, unknown>) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSubtarea: (parentId: string, data: { titulo: string; fecha: string | null; prioridad: string }) => void;
  onCompleteSubtarea: (id: string) => void;
  onDeleteSubtarea: (id: string) => void;
}

const PRIOS: { key: string; label: string; color: string }[] = [
  { key: "URGENTE", label: "Urgente", color: "#f87171" },
  { key: "ALTA",    label: "Alta",    color: "#fb923c" },
  { key: "MEDIA",   label: "Media",   color: "#eab308" },
  { key: "BAJA",    label: "Baja",    color: "#6b7280" },
];

const AREA_LABELS: Record<string, string> = {
  VENTAS: "Ventas", ADMINISTRACION: "Administración", PRODUCCION: "Producción",
  MARKETING: "Marketing", RRHH: "RR.HH.", GENERAL: "General",
};

function FlagIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? color : "none"}
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  );
}

export default function TaskModal({
  tarea, loading, usuarios, proyectos, iniciativas, sessionId,
  onClose, onSave, onComplete, onDelete, onAddSubtarea, onCompleteSubtarea, onDeleteSubtarea,
}: Props) {
  const [titulo, setTitulo]           = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [notas, setNotas]             = useState("");
  const [prioridad, setPrioridad]     = useState("MEDIA");
  const [area, setArea]               = useState("GENERAL");
  const [asignadoAId, setAsignadoAId] = useState("");
  const [proyectoId, setProyectoId]   = useState("");
  const [iniciativaId, setIniciativaId] = useState("");
  const [fecha, setFecha]             = useState("");
  const [fechaVen, setFechaVen]       = useState("");
  const [recTexto, setRecTexto]       = useState("");
  const [editingRec, setEditingRec]   = useState(false);
  const [comentario, setComentario]   = useState("");
  const [addingUrl, setAddingUrl]     = useState(false);
  const [urlManual, setUrlManual]     = useState("");
  const [nombreManual, setNombreManual] = useState("");
  const [subtareasLocal, setSubtareasLocal] = useState<Subtarea[]>([]);
  const [comentariosLocal, setComentariosLocal] = useState<Comentario[]>([]);
  const [archivosLocal, setArchivosLocal] = useState<Archivo[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [showFechaVenPicker, setShowFechaVenPicker] = useState(false);
  const [dirty, setDirty]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when task changes
  useEffect(() => {
    if (!tarea) return;
    setTitulo(tarea.titulo);
    setDescripcion(tarea.descripcion ?? "");
    setNotas(tarea.notas ?? "");
    setPrioridad(tarea.prioridad);
    setArea(tarea.area);
    setAsignadoAId(tarea.asignadoA?.id ?? "");
    setProyectoId(tarea.proyectoTarea?.id ?? "");
    setIniciativaId(tarea.iniciativa?.id ?? "");
    setFecha(tarea.fecha ? tarea.fecha.substring(0, 10) : "");
    setFechaVen(tarea.fechaVencimiento ? tarea.fechaVencimiento.substring(0, 10) : "");
    setShowFechaVenPicker(false);
    setEditingRec(false);
    setRecTexto("");
    setDirty(false);
    setSubtareasLocal(tarea.subtareas ?? []);
    setComentariosLocal(tarea.comentarios ?? []);
    setArchivosLocal(tarea.archivos ?? []);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [tarea?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: Escape closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!tarea && !loading) return null;

  async function handleSave() {
    if (!tarea) return;
    setSaving(true);
    await onSave(tarea.id, {
      titulo:           titulo           || null,
      descripcion:      descripcion      || null,
      notas:            notas            || null,
      prioridad,
      asignadoAId:      asignadoAId      || null,
      proyectoTareaId:  proyectoId       || null,
      iniciativaId:     iniciativaId     || null,
      fecha:            fecha            || null,
      fechaVencimiento: fechaVen         || null,
    });
    setSaving(false);
    setDirty(false);
  }

  function mark() { setDirty(true); }

  const recDisplay = (() => {
    if (!tarea?.recurrencia) return null;
    try { return formatearRecurrencia(JSON.parse(tarea.recurrencia)); }
    catch { return null; }
  })();

  function applyRecurrencia() {
    if (!tarea) return;
    if (!recTexto.trim()) {
      onSave(tarea.id, { recurrencia: null });
      setEditingRec(false);
      return;
    }
    const cfg = parsearRecurrencia(recTexto.trim());
    if (!cfg) return;
    onSave(tarea.id, { recurrencia: JSON.stringify(cfg) });
    setEditingRec(false);
    setRecTexto("");
  }

  async function enviarComentario() {
    if (!tarea || !comentario.trim()) return;
    const res = await fetch(`/api/tareas/${tarea.id}/comentarios`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: comentario }),
    });
    if (res.ok) {
      const { comentario: c } = await res.json();
      setComentariosLocal(prev => [...prev, c]);
      setComentario("");
    }
  }

  async function eliminarComentario(cid: string) {
    if (!tarea) return;
    await fetch(`/api/tareas/${tarea.id}/comentarios/${cid}`, { method: "DELETE" });
    setComentariosLocal(prev => prev.filter(c => c.id !== cid));
  }

  async function subirArchivo(file: File) {
    if (!tarea) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/tareas/${tarea.id}/archivos`, { method: "POST", body: form });
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
    if (!tarea || !urlManual.trim()) return;
    const form = new FormData();
    form.append("url", urlManual.trim());
    form.append("nombre", nombreManual.trim() || urlManual.split("/").pop() || "archivo");
    const res = await fetch(`/api/tareas/${tarea.id}/archivos`, { method: "POST", body: form });
    if (res.ok) {
      const { archivo } = await res.json();
      setArchivosLocal(prev => [archivo, ...prev]);
      setUrlManual(""); setNombreManual(""); setAddingUrl(false);
    }
  }

  async function eliminarArchivo(aid: string) {
    if (!tarea) return;
    await fetch(`/api/tareas/${tarea.id}/archivos/${aid}`, { method: "DELETE" });
    setArchivosLocal(prev => prev.filter(a => a.id !== aid));
  }

  const isCompleted = tarea?.estado === "COMPLETADA";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl flex flex-col shadow-2xl overflow-hidden">

        {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#1a1a1a] shrink-0">
          {/* Complete circle */}
          <button
            onClick={() => tarea && onComplete(tarea.id)}
            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
              isCompleted
                ? "bg-[#B3985B] border-[#B3985B]"
                : "border-[#333] hover:border-[#B3985B]"
            }`}
          >
            {isCompleted && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M2 6l3 3 5-5"/>
              </svg>
            )}
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 flex items-center gap-1 min-w-0 overflow-hidden">
            {tarea && (
              <span className="text-[11px] text-[#444] truncate">
                {tarea.carpeta?.nombre && <span>{tarea.carpeta.nombre} <span className="text-[#2a2a2a]">›</span> </span>}
                {tarea.proyectoTarea && (
                  <span style={{ color: tarea.proyectoTarea.color ?? "#555" }}>
                    {tarea.proyectoTarea.nombre}
                    {tarea.seccion && <span className="text-[#333]"> › {tarea.seccion.nombre}</span>}
                  </span>
                )}
                {!tarea.proyectoTarea && <span className="text-[#333]">Bandeja de entrada</span>}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                dirty
                  ? "bg-[#B3985B]/15 border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/25"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={() => tarea && onDelete(tarea.id)}
              className="w-7 h-7 flex items-center justify-center rounded text-[#333] hover:text-red-400 hover:bg-red-950/20 transition-all"
              title="Eliminar tarea"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
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

        {/* ── BODY ──────────────────────────────────────────────────────────── */}
        {loading || !tarea ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border border-[#333] border-t-[#B3985B] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_240px]">

            {/* ── LEFT COLUMN: main content ───────────────────────────────── */}
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

              {/* ── Subtareas ── */}
              <div>
                <p className="text-[11px] text-[#444] uppercase tracking-widest font-semibold mb-2">Subtareas</p>
                {subtareasLocal.map(sub => (
                  <TaskItem
                    key={sub.id}
                    tarea={subtareaToItem(sub)}
                    isSelected={false}
                    onComplete={() => {
                      onCompleteSubtarea(sub.id);
                      setSubtareasLocal(prev => prev.map(s => s.id === sub.id ? { ...s, estado: "COMPLETADA" } : s));
                    }}
                    onSelect={() => {}}
                    onDelete={() => {
                      onDeleteSubtarea(sub.id);
                      setSubtareasLocal(prev => prev.filter(s => s.id !== sub.id));
                    }}
                    onDateChange={(id, field, val) => {
                      onSave(id, { [field]: val || null });
                      setSubtareasLocal(prev => prev.map(s => s.id === id ? { ...s, [field]: val || null } : s));
                    }}
                  />
                ))}
                <QuickAdd
                  parentId={tarea.id}
                  compact
                  placeholder="Agregar subtarea…"
                  onAdd={(d) => {
                    const t = { titulo: d.titulo, fecha: d.fecha, prioridad: d.prioridad };
                    onAddSubtarea(tarea.id, t);
                    setSubtareasLocal(prev => [...prev, {
                      id: `tmp-${Date.now()}`, titulo: d.titulo, estado: "PENDIENTE",
                      prioridad: d.prioridad, fecha: d.fecha, fechaVencimiento: null, _count: { subtareas: 0 }
                    }]);
                  }}
                />
              </div>

              {/* ── Notas ── */}
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

              {/* ── Archivos ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-[#444] uppercase tracking-widest font-semibold">Archivos</p>
                  <div className="flex gap-3">
                    <label className="cursor-pointer text-xs text-[#555] hover:text-[#B3985B] transition-colors">
                      <input type="file" multiple className="hidden"
                        onChange={e => { Array.from(e.target.files ?? []).forEach(subirArchivo); }}
                      />
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

              {/* ── Comentarios ── */}
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
                        {c.autor?.id === sessionId && (
                          <button onClick={() => eliminarComentario(c.id)}
                            className="opacity-0 group-hover:opacity-100 ml-auto text-[#333] hover:text-red-400 text-xs transition-all">✕</button>
                        )}
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
            </div>

            {/* ── RIGHT COLUMN: metadata ───────────────────────────────────── */}
            <div className="md:overflow-y-auto p-4 space-y-5 bg-[#090909]">

              {/* Prioridad */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-2">Prioridad</p>
                <div className="grid grid-cols-2 gap-1">
                  {PRIOS.map(p => (
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

              {/* Asignado a */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Asignado a</p>
                <select
                  value={asignadoAId}
                  onChange={e => { setAsignadoAId(e.target.value); mark(); }}
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="">— Sin asignar —</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              {/* Proyecto */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Proyecto</p>
                <select
                  value={proyectoId}
                  onChange={e => { setProyectoId(e.target.value); mark(); }}
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="">— Bandeja de entrada —</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              {/* Iniciativa */}
              {iniciativas.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Iniciativa</p>
                  <select
                    value={iniciativaId}
                    onChange={e => { setIniciativaId(e.target.value); mark(); }}
                    className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                  >
                    <option value="">— Ninguna —</option>
                    {iniciativas.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </div>
              )}

              {/* Fecha / Recurrencia */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-2">Fecha</p>

                {/* Toggle tabs */}
                <div className="flex rounded-lg overflow-hidden border border-[#1a1a1a] mb-3">
                  <button
                    onClick={() => {
                      if (tarea.recurrencia) onSave(tarea.id, { recurrencia: null });
                      setEditingRec(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-all ${
                      !tarea.recurrencia ? "bg-[#1a1a1a] text-white" : "text-[#444] hover:text-[#777]"
                    }`}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Fija
                  </button>
                  <div className="w-px bg-[#1a1a1a]" />
                  <button
                    onClick={() => setEditingRec(true)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-all ${
                      tarea.recurrencia || editingRec ? "bg-[#1a1a1a] text-[#B3985B]" : "text-[#444] hover:text-[#777]"
                    }`}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                      <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                    Recurrente
                  </button>
                </div>

                {/* Fecha fija panel */}
                {!editingRec && !tarea.recurrencia && (
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
                )}

                {/* Recurrencia activa */}
                {!editingRec && tarea.recurrencia && (
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2" strokeLinecap="round">
                      <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                      <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                    <span className="text-xs text-[#B3985B] flex-1">{recDisplay}</span>
                    <button onClick={() => onSave(tarea.id, { recurrencia: null })}
                      className="text-[#444] hover:text-red-400 transition-colors">✕</button>
                  </div>
                )}

                {/* Editor de recurrencia */}
                {editingRec && (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      value={recTexto}
                      onChange={e => setRecTexto(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") applyRecurrencia(); if (e.key === "Escape") setEditingRec(false); }}
                      placeholder="cada lunes · cada mes…"
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-2 text-xs text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]"
                    />
                    <div className="flex gap-3 text-xs">
                      <button onClick={applyRecurrencia} className="text-[#B3985B] hover:underline font-medium">Aplicar</button>
                      <button onClick={() => setEditingRec(false)} className="text-[#555] hover:text-white">Cancelar</button>
                    </div>
                    <p className="text-[10px] text-[#2a2a2a]">Ej: cada día · cada lunes · cada martes y jueves</p>
                  </div>
                )}
              </div>

              {/* Estado */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Estado</p>
                <div className="flex flex-wrap gap-1">
                  {(["PENDIENTE","EN_PROGRESO","COMPLETADA","CANCELADA"] as const).map(est => {
                    const colors: Record<string, string> = {
                      PENDIENTE: "#6b7280", EN_PROGRESO: "#3b82f6",
                      COMPLETADA: "#22c55e", CANCELADA: "#ef4444",
                    };
                    const labels: Record<string, string> = {
                      PENDIENTE: "Pendiente", EN_PROGRESO: "En progreso",
                      COMPLETADA: "Completada", CANCELADA: "Cancelada",
                    };
                    const isActive = tarea.estado === est;
                    return (
                      <button
                        key={est}
                        onClick={() => onSave(tarea.id, { estado: est })}
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

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
