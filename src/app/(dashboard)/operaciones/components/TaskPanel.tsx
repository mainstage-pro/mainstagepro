"use client";
import { useState, useEffect, useRef } from "react";
import { formatearRecurrencia, parsearRecurrencia } from "@/lib/recurrencia";
import DatePicker from "@/components/ui/DatePicker";
import QuickAdd from "./QuickAdd";

interface Usuario { id: string; name: string }
interface Proyecto { id: string; nombre: string; color: string | null }
interface Iniciativa { id: string; nombre: string; color: string | null }

interface Subtarea {
  id: string; titulo: string; estado: string; prioridad: string;
  fecha: string | null; fechaVencimiento: string | null;
  _count: { subtareas: number };
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
  tarea: TareaDetalle;
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

const AREAS = ["GENERAL", "VENTAS", "ADMINISTRACION", "PRODUCCION", "MARKETING", "RRHH"];
const PRIOS = ["BAJA", "MEDIA", "ALTA", "URGENTE"];
const PRIO_COLORS: Record<string, string> = { URGENTE: "#f87171", ALTA: "#fb923c", MEDIA: "#eab308", BAJA: "#555" };

function useAutoSave(
  id: string,
  field: string,
  value: string,
  onSave: (id: string, patch: Record<string, unknown>) => void,
  delay = 600
) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prev  = useRef(value);
  useEffect(() => {
    if (value === prev.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSave(id, { [field]: value || null });
      prev.current = value;
    }, delay);
    return () => clearTimeout(timer.current);
  }, [value]);  // eslint-disable-line react-hooks/exhaustive-deps
}

export default function TaskPanel({
  tarea, usuarios, proyectos, iniciativas, sessionId,
  onClose, onSave, onComplete, onDelete, onAddSubtarea, onCompleteSubtarea, onDeleteSubtarea,
}: Props) {
  const [titulo, setTitulo]       = useState(tarea.titulo);
  const [descripcion, setDescripcion] = useState(tarea.descripcion ?? "");
  const [notas, setNotas]         = useState(tarea.notas ?? "");
  const [prioridad, setPrioridad] = useState(tarea.prioridad);
  const [area, setArea]           = useState(tarea.area);
  const [asignadoAId, setAsignadoAId] = useState(tarea.asignadoA?.id ?? "");
  const [proyectoId, setProyectoId]   = useState(tarea.proyectoTarea?.id ?? "");
  const [iniciativaId, setIniciativaId] = useState(tarea.iniciativa?.id ?? "");
  const [fecha, setFecha]         = useState(tarea.fecha ? tarea.fecha.substring(0, 10) : "");
  const [fechaVen, setFechaVen]   = useState(tarea.fechaVencimiento ? tarea.fechaVencimiento.substring(0, 10) : "");
  const [recTexto, setRecTexto]   = useState("");
  const [editingRec, setEditingRec] = useState(false);
  const [comentario, setComentario] = useState("");
  const [archivosSubir, setArchivosSubir] = useState<File[]>([]);
  const [urlManual, setUrlManual] = useState("");
  const [nombreManual, setNombreManual] = useState("");
  const [addingUrl, setAddingUrl]  = useState(false);
  const [subtareasLocal, setSubtareasLocal] = useState<Subtarea[]>(tarea.subtareas ?? []);
  const [comentariosLocal, setComentariosLocal] = useState<Comentario[]>(tarea.comentarios ?? []);
  const [archivosLocal, setArchivosLocal] = useState<Archivo[]>(tarea.archivos ?? []);
  const [uploading, setUploading] = useState(false);
  const [showFechaVenPicker, setShowFechaVenPicker] = useState(false);

  // Reset when tarea changes
  useEffect(() => {
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
    setSubtareasLocal(tarea.subtareas ?? []);
    setComentariosLocal(tarea.comentarios ?? []);
    setArchivosLocal(tarea.archivos ?? []);
  }, [tarea.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useAutoSave(tarea.id, "titulo",      titulo,      onSave);
  useAutoSave(tarea.id, "descripcion", descripcion, onSave);
  useAutoSave(tarea.id, "notas",       notas,       onSave);

  function handleSelectChange(field: string, value: string) {
    onSave(tarea.id, { [field]: value || null });
  }

  function handleFechaBlur(field: string, value: string) {
    onSave(tarea.id, { [field]: value || null });
  }

  const recDisplay = (() => {
    if (!tarea.recurrencia) return null;
    try { return formatearRecurrencia(JSON.parse(tarea.recurrencia)); }
    catch { return null; }
  })();

  function applyRecurrencia() {
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
    if (!comentario.trim()) return;
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
    await fetch(`/api/tareas/${tarea.id}/comentarios/${cid}`, { method: "DELETE" });
    setComentariosLocal(prev => prev.filter(c => c.id !== cid));
  }

  async function subirArchivo(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/tareas/${tarea.id}/archivos`, { method: "POST", body: form });
    if (res.ok) {
      const { archivo } = await res.json();
      setArchivosLocal(prev => [archivo, ...prev]);
    }
    setUploading(false);
  }

  async function adjuntarUrl() {
    if (!urlManual.trim()) return;
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
    await fetch(`/api/tareas/${tarea.id}/archivos/${aid}`, { method: "DELETE" });
    setArchivosLocal(prev => prev.filter(a => a.id !== aid));
  }

  const isCompleted = tarea.estado === "COMPLETADA";

  return (
    <aside className="w-96 shrink-0 border-l border-[#1a1a1a] bg-[#0a0a0a] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a] shrink-0">
        {/* Complete button */}
        <button
          onClick={() => onComplete(tarea.id)}
          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
            isCompleted ? "bg-[#444] border-[#444]" : "border-[#444] hover:border-[#B3985B]"
          }`}
        >
          {isCompleted && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
              <path d="M2 6l3 3 5-5"/>
            </svg>
          )}
        </button>

        <div className="flex-1 flex items-center gap-1">
          {/* Breadcrumb */}
          <span className="text-[11px] text-[#555] truncate">
            {tarea.carpeta?.nombre && <>{tarea.carpeta.nombre} › </>}
            {tarea.proyectoTarea?.nombre && <>{tarea.proyectoTarea.nombre} › </>}
            {tarea.seccion?.nombre && <>{tarea.seccion.nombre}</>}
          </span>
        </div>

        <button onClick={() => onDelete(tarea.id)} className="text-[#333] hover:text-red-400 transition-colors p-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
        <button onClick={onClose} className="text-[#333] hover:text-white transition-colors p-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <textarea
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          className="w-full bg-transparent text-white text-lg font-medium resize-none focus:outline-none placeholder-[#444] leading-snug"
          placeholder="Título de la tarea"
          rows={titulo.split("\n").length || 1}
        />

        {/* Description */}
        <textarea
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Descripción…"
          className="w-full bg-transparent text-sm text-[#888] resize-none focus:outline-none placeholder-[#333] leading-relaxed"
          rows={3}
        />

        {/* Meta fields */}
        <div className="space-y-2.5">
          {/* Prioridad + Area */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-0.5">
              <label className="text-[10px] text-[#444] uppercase tracking-wider">Prioridad</label>
              <select value={prioridad} onChange={e => { setPrioridad(e.target.value); handleSelectChange("prioridad", e.target.value); }}
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]">
                {PRIOS.map(p => <option key={p} value={p} style={{ color: PRIO_COLORS[p] }}>{p}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-0.5">
              <label className="text-[10px] text-[#444] uppercase tracking-wider">Área</label>
              <select value={area} onChange={e => { setArea(e.target.value); handleSelectChange("area", e.target.value); }}
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]">
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-0.5">
            <label className="text-[10px] text-[#444] uppercase tracking-wider">Asignado a</label>
            <select value={asignadoAId} onChange={e => { setAsignadoAId(e.target.value); handleSelectChange("asignadoAId", e.target.value); }}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]">
              <option value="">— Sin asignar —</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* Project */}
          <div className="space-y-0.5">
            <label className="text-[10px] text-[#444] uppercase tracking-wider">Proyecto</label>
            <select value={proyectoId} onChange={e => { setProyectoId(e.target.value); handleSelectChange("proyectoTareaId", e.target.value); }}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]">
              <option value="">— Bandeja de entrada —</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {/* Iniciativa */}
          {iniciativas.length > 0 && (
            <div className="space-y-0.5">
              <label className="text-[10px] text-[#444] uppercase tracking-wider">Iniciativa</label>
              <select value={iniciativaId} onChange={e => { setIniciativaId(e.target.value); handleSelectChange("iniciativaId", e.target.value); }}
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]">
                <option value="">— Ninguna —</option>
                {iniciativas.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-0.5">
              <label className="text-[10px] text-[#444] uppercase tracking-wider">Fecha</label>
              <DatePicker
                value={fecha}
                onChange={val => { setFecha(val); handleFechaBlur("fecha", val); }}
                size="sm"
              />
            </div>
            <div className="flex-1 space-y-0.5">
              <label className="text-[10px] text-[#444] uppercase tracking-wider">Fecha límite</label>
              {(fechaVen || showFechaVenPicker) ? (
                <DatePicker
                  value={fechaVen}
                  onChange={val => {
                    setFechaVen(val);
                    handleFechaBlur("fechaVencimiento", val);
                    if (!val) setShowFechaVenPicker(false);
                  }}
                  size="sm"
                  showClear
                />
              ) : (
                <button
                  onClick={() => setShowFechaVenPicker(true)}
                  className="w-full text-left text-xs text-[#333] hover:text-[#B3985B] transition-colors py-1.5 px-2.5"
                >
                  + Agregar
                </button>
              )}
            </div>
          </div>

          {/* Recurrencia */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#444] uppercase tracking-wider">Recurrencia</label>
            {!editingRec ? (
              <button onClick={() => setEditingRec(true)}
                className="flex items-center gap-1.5 text-sm text-[#555] hover:text-white transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
                {recDisplay ? <span className="text-[#B3985B]">{recDisplay}</span> : <span>Sin recurrencia</span>}
              </button>
            ) : (
              <div className="space-y-1">
                <input autoFocus value={recTexto} onChange={e => setRecTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") applyRecurrencia(); if (e.key === "Escape") setEditingRec(false); }}
                  placeholder="cada lunes, cada martes y jueves…"
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]" />
                <div className="flex gap-2 text-xs">
                  <button onClick={applyRecurrencia} className="text-[#B3985B] hover:underline">Aplicar</button>
                  {tarea.recurrencia && <button onClick={() => { onSave(tarea.id, { recurrencia: null }); setEditingRec(false); }} className="text-red-400 hover:underline">Quitar</button>}
                  <button onClick={() => setEditingRec(false)} className="text-[#555] hover:text-white">Cancelar</button>
                </div>
                <p className="text-[10px] text-[#333]">Ej: cada día · cada lunes · cada martes y jueves · cada tercer viernes · cada mes</p>
              </div>
            )}
          </div>
        </div>

        {/* Subtareas */}
        <div className="space-y-1">
          <p className="text-[11px] text-[#444] uppercase tracking-wider font-medium">Subtareas</p>
          {subtareasLocal.map(sub => (
            <div key={sub.id} className="flex items-center gap-2 group py-1 px-2 rounded hover:bg-[#111]">
              <button
                onClick={() => { onCompleteSubtarea(sub.id); setSubtareasLocal(prev => prev.map(s => s.id === sub.id ? { ...s, estado: "COMPLETADA" } : s)); }}
                className={`w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center transition-all ${sub.estado === "COMPLETADA" ? "bg-[#444] border-[#444]" : "border-[#333] hover:border-[#B3985B]"}`}>
                {sub.estado === "COMPLETADA" && (
                  <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                )}
              </button>
              <span className={`text-xs flex-1 ${sub.estado === "COMPLETADA" ? "line-through text-[#444]" : "text-[#c4c4c4]"}`}>{sub.titulo}</span>
              {sub.fecha && <span className="text-[10px] text-[#555]">{new Date(sub.fecha).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}</span>}
              <button onClick={() => { onDeleteSubtarea(sub.id); setSubtareasLocal(prev => prev.filter(s => s.id !== sub.id)); }}
                className="opacity-0 group-hover:opacity-100 text-[#333] hover:text-red-400 transition-all">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
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

        {/* Notas */}
        <div className="space-y-1">
          <label className="text-[10px] text-[#444] uppercase tracking-wider">Notas</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Notas adicionales…"
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded px-3 py-2 text-sm text-[#888] resize-none focus:outline-none focus:border-[#2a2a2a] placeholder-[#333] leading-relaxed"
            rows={4} />
        </div>

        {/* Archivos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-[#444] uppercase tracking-wider">Archivos adjuntos</label>
            <div className="flex gap-2">
              <label className="cursor-pointer text-xs text-[#555] hover:text-[#B3985B] transition-colors">
                <input type="file" multiple className="hidden"
                  onChange={e => { const files = Array.from(e.target.files ?? []); files.forEach(subirArchivo); }}
                />
                ↑ Subir
              </label>
              <button onClick={() => setAddingUrl(!addingUrl)} className="text-xs text-[#555] hover:text-[#B3985B] transition-colors">
                🔗 URL
              </button>
            </div>
          </div>

          {addingUrl && (
            <div className="space-y-1 p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded">
              <input value={urlManual} onChange={e => setUrlManual(e.target.value)} placeholder="https://…"
                className="w-full bg-transparent text-xs text-white placeholder-[#333] focus:outline-none" />
              <input value={nombreManual} onChange={e => setNombreManual(e.target.value)} placeholder="Nombre (opcional)"
                className="w-full bg-transparent text-xs text-white placeholder-[#333] focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={adjuntarUrl} className="text-xs text-[#B3985B] hover:underline">Adjuntar</button>
                <button onClick={() => setAddingUrl(false)} className="text-xs text-[#555] hover:text-white">Cancelar</button>
              </div>
            </div>
          )}

          {uploading && <p className="text-xs text-[#555]">Subiendo…</p>}

          {archivosLocal.map(a => (
            <div key={a.id} className="flex items-center gap-2 group py-1 px-2 rounded hover:bg-[#111]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <a href={a.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-xs text-[#888] hover:text-white truncate">{a.nombre}</a>
              {a.tamano && <span className="text-[10px] text-[#444]">{(a.tamano / 1024).toFixed(0)}KB</span>}
              <button onClick={() => eliminarArchivo(a.id)}
                className="opacity-0 group-hover:opacity-100 text-[#333] hover:text-red-400 transition-all">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}

          {archivosSubir.length > 0 && (
            <p className="text-xs text-[#555]">{archivosSubir.length} archivo(s) seleccionado(s)</p>
          )}
        </div>

        {/* Comentarios */}
        <div className="space-y-3">
          <p className="text-[10px] text-[#444] uppercase tracking-wider">Comentarios</p>
          {comentariosLocal.map(c => (
            <div key={c.id} className="group flex gap-2">
              <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 text-[10px] text-[#B3985B]">
                {c.autor?.name.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#888]">{c.autor?.name ?? "Desconocido"}</span>
                  <span className="text-[10px] text-[#444]">{new Date(c.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {(c.autor?.id === sessionId) && (
                    <button onClick={() => eliminarComentario(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#333] hover:text-red-400 text-xs ml-auto transition-all">✕</button>
                  )}
                </div>
                <p className="text-sm text-[#c4c4c4] whitespace-pre-wrap">{c.contenido}</p>
              </div>
            </div>
          ))}

          <div className="flex gap-2 items-end">
            <textarea value={comentario} onChange={e => setComentario(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarComentario(); } }}
              placeholder="Agrega un comentario… (Enter para enviar)"
              className="flex-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-[#2a2a2a] placeholder-[#333]"
              rows={2} />
            <button onClick={enviarComentario} disabled={!comentario.trim()}
              className="px-3 py-2 bg-[#1a1a1a] text-[#B3985B] text-xs rounded hover:bg-[#222] transition-colors disabled:opacity-30">
              →
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
