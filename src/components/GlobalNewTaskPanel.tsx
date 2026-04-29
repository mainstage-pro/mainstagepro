"use client";
import { useState, useRef, useEffect } from "react";
import DatePicker from "@/components/ui/DatePicker";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";

interface Usuario { id: string; name: string }
interface Proyecto { id: string; nombre: string; color: string | null }
interface Comentario {
  id: string; contenido: string; createdAt: string;
  autor: { id: string; name: string } | null;
}
interface Archivo {
  id: string; nombre: string; url: string; tipo: string | null; tamano: number | null;
  createdAt: string; subidoPor: { id: string; name: string } | null;
}

const PRIOS = [
  { key: "URGENTE", label: "Urgente", color: "#f87171" },
  { key: "ALTA",    label: "Alta",    color: "#fb923c" },
  { key: "MEDIA",   label: "Media",   color: "#eab308" },
  { key: "BAJA",    label: "Baja",    color: "#6b7280" },
];

export default function GlobalNewTaskPanel() {
  const toast = useToast();
  const [open, setOpen]               = useState(false);
  const [phase, setPhase]             = useState<"create" | "edit">("create");
  const [tareaId, setTareaId]         = useState<string | null>(null);

  // Form fields
  const [titulo, setTitulo]           = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad]     = useState("MEDIA");
  const [asignadoAId, setAsignadoAId] = useState("");
  const [proyectoId, setProyectoId]   = useState("");
  const [fecha, setFecha]             = useState("");
  const [dirty, setDirty]             = useState(false);
  const [saving, setSaving]           = useState(false);

  // Lists
  const [usuarios, setUsuarios]       = useState<Usuario[]>([]);
  const [proyectos, setProyectos]     = useState<Proyecto[]>([]);

  // Files & comments (phase edit)
  const [archivos, setArchivos]       = useState<Archivo[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [comentario, setComentario]   = useState("");
  const [uploading, setUploading]     = useState(false);
  const [addingUrl, setAddingUrl]     = useState(false);
  const [urlManual, setUrlManual]     = useState("");
  const [nombreManual, setNombreManual] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onOpen() { setOpen(true); setPhase("create"); }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => { if (!o) setPhase("create"); return !o; });
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("open-full-task", onOpen);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("open-full-task", onOpen);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 60);
    Promise.all([
      fetch("/api/usuarios").then(r => r.json()).catch(() => ({ usuarios: [] })),
      fetch("/api/operaciones/proyectos").then(r => r.json()).catch(() => ({ proyectos: [] })),
    ]).then(([usr, proy]) => {
      setUsuarios(usr.usuarios ?? []);
      setProyectos(proy.proyectos ?? []);
    });
  }, [open]);

  function reset() {
    setTitulo(""); setDescripcion(""); setPrioridad("MEDIA");
    setAsignadoAId(""); setProyectoId(""); setFecha("");
    setDirty(false); setTareaId(null);
    setArchivos([]); setComentarios([]); setComentario("");
    setAddingUrl(false); setUrlManual(""); setNombreManual("");
    setPhase("create");
  }

  function cerrar() { setOpen(false); reset(); }

  async function crear() {
    const t = titulo.trim();
    if (!t) return;
    setSaving(true);
    const res = await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: t,
        descripcion: descripcion.trim() || null,
        prioridad,
        asignadoAId: asignadoAId || null,
        proyectoTareaId: proyectoId || null,
        fecha: fecha || null,
        fechaVencimiento: null,
        recurrencia: null,
        seccionId: null,
        parentId: null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al crear tarea");
      return;
    }
    const { tarea } = await res.json();
    setTareaId(tarea.id);
    setPhase("edit");
    toast.success("Tarea creada");
  }

  async function guardar() {
    if (!tareaId || !dirty) return;
    setSaving(true);
    const res = await fetch(`/api/tareas/${tareaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: titulo.trim() || null,
        descripcion: descripcion.trim() || null,
        prioridad,
        asignadoAId: asignadoAId || null,
        proyectoTareaId: proyectoId || null,
        fecha: fecha || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    setDirty(false);
    toast.success("Cambios guardados");
  }

  async function enviarComentario() {
    if (!tareaId || !comentario.trim()) return;
    const res = await fetch(`/api/tareas/${tareaId}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: comentario }),
    });
    if (!res.ok) {
      toast.error("Error al enviar comentario");
      return;
    }
    const { comentario: c } = await res.json();
    setComentarios(prev => [...prev, c]);
    setComentario("");
  }

  async function eliminarComentario(cid: string) {
    if (!tareaId) return;
    const res = await fetch(`/api/tareas/${tareaId}/comentarios/${cid}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Error al eliminar comentario");
      return;
    }
    setComentarios(prev => prev.filter(c => c.id !== cid));
  }

  async function subirArchivo(file: File) {
    if (!tareaId) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/tareas/${tareaId}/archivos`, { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      setArchivos(prev => [data.archivo, ...prev]);
    } else {
      toast.error(data.error ?? "Error al subir archivo");
    }
  }

  async function adjuntarUrl() {
    if (!tareaId || !urlManual.trim()) return;
    const form = new FormData();
    form.append("url", urlManual.trim());
    form.append("nombre", nombreManual.trim() || urlManual.split("/").pop() || "archivo");
    const res = await fetch(`/api/tareas/${tareaId}/archivos`, { method: "POST", body: form });
    if (!res.ok) {
      toast.error("Error al adjuntar URL");
      return;
    }
    const { archivo } = await res.json();
    setArchivos(prev => [archivo, ...prev]);
    setUrlManual(""); setNombreManual(""); setAddingUrl(false);
  }

  async function eliminarArchivo(aid: string) {
    if (!tareaId) return;
    const res = await fetch(`/api/tareas/${tareaId}/archivos/${aid}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Error al eliminar archivo");
      return;
    }
    setArchivos(prev => prev.filter(a => a.id !== aid));
  }

  if (!open) return null;

  const proyectoNombre = proyectoId
    ? (proyectos.find(p => p.id === proyectoId)?.nombre ?? "Proyecto")
    : "Bandeja de entrada";

  const mark = () => setDirty(true);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center pt-[10vh] px-4"
      onClick={cerrar}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#141414] shrink-0">
          <div className="flex items-center gap-2">
            {phase === "edit" && (
              <span className="w-2 h-2 rounded-full bg-[#22c55e] shrink-0" />
            )}
            <p className="text-white font-semibold text-sm">
              {phase === "create" ? "Nueva tarea" : titulo || "Tarea creada"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {phase === "edit" && dirty && (
              <button
                onClick={guardar}
                disabled={saving}
                className="px-3 py-1 text-xs font-medium bg-[#B3985B]/15 border border-[#B3985B]/40 text-[#B3985B] rounded-lg hover:bg-[#B3985B]/25 transition-all disabled:opacity-40"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            )}
            <button onClick={cerrar} className="text-[#333] hover:text-white transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {/* Título */}
            <input
              ref={inputRef}
              value={titulo}
              onChange={e => { setTitulo(e.target.value); if (phase === "edit") mark(); }}
              onKeyDown={e => { if (e.key === "Escape") cerrar(); }}
              placeholder="¿En qué estás trabajando?"
              className="w-full bg-transparent text-white text-base placeholder-[#2a2a2a] focus:outline-none font-medium"
            />

            {/* Descripción */}
            <textarea
              value={descripcion}
              onChange={e => { setDescripcion(e.target.value); if (phase === "edit") mark(); }}
              onKeyDown={e => { if (e.key === "Escape") cerrar(); }}
              placeholder="Descripción (opcional)"
              rows={2}
              className="w-full bg-transparent text-sm text-[#777] placeholder-[#222] focus:outline-none resize-none leading-relaxed"
            />

            <div className="border-t border-[#111] pt-4 grid grid-cols-2 gap-4">
              {/* Asignado a */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Responsable</p>
                <Combobox
                  value={asignadoAId}
                  onChange={v => { setAsignadoAId(v); if (phase === "edit") mark(); }}
                  options={[{ value: "", label: "— Sin asignar —" }, ...usuarios.map(u => ({ value: u.id, label: u.name }))]}
                  className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>

              {/* Proyecto */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Proyecto</p>
                <Combobox
                  value={proyectoId}
                  onChange={v => { setProyectoId(v); if (phase === "edit") mark(); }}
                  options={[{ value: "", label: "— Bandeja de entrada —" }, ...proyectos.map(p => ({ value: p.id, label: p.nombre }))]}
                  className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>

              {/* Fecha */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Fecha</p>
                <DatePicker value={fecha} onChange={v => { setFecha(v); if (phase === "edit") mark(); }} size="sm" />
              </div>

              {/* Prioridad */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Prioridad</p>
                <div className="grid grid-cols-2 gap-1">
                  {PRIOS.map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => { setPrioridad(p.key); if (phase === "edit") mark(); }}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                        prioridad === p.key
                          ? "border-transparent"
                          : "border-[#1a1a1a] text-[#444] hover:text-[#666]"
                      }`}
                      style={prioridad === p.key ? { background: p.color + "22", borderColor: p.color + "55", color: p.color } : {}}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Files & Comments — only after task is created ── */}
            {phase === "edit" && (
              <>
                {/* Archivos */}
                <div className="border-t border-[#111] pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold">Archivos</p>
                    <div className="flex gap-3">
                      <label className="cursor-pointer text-xs text-[#555] hover:text-[#B3985B] transition-colors">
                        <input type="file" multiple className="hidden"
                          onChange={e => { Array.from(e.target.files ?? []).forEach(subirArchivo); e.target.value = ""; }}
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

                  {archivos.length === 0 && !uploading ? (
                    <p className="text-xs text-[#2a2a2a] py-1">Sin archivos adjuntos</p>
                  ) : (
                    <div className="space-y-1">
                      {archivos.map(a => (
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

                {/* Comentarios */}
                <div className="border-t border-[#111] pt-4">
                  <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-3">Comentarios</p>
                  {comentarios.length === 0 && (
                    <p className="text-xs text-[#2a2a2a] mb-3">Sin comentarios aún</p>
                  )}
                  {comentarios.map(c => (
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
                          <button onClick={() => eliminarComentario(c.id)}
                            className="opacity-0 group-hover:opacity-100 ml-auto text-[#333] hover:text-red-400 text-xs transition-all">✕</button>
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
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#141414] bg-[#090909] shrink-0">
          <p className="text-[11px] text-[#333]">{proyectoNombre}</p>
          <div className="flex gap-2">
            <button
              onClick={cerrar}
              className="px-3 py-1.5 text-xs text-[#444] hover:text-[#888] transition-colors"
            >
              {phase === "edit" ? "Cerrar" : "Cancelar"}
            </button>
            {phase === "create" && (
              <button
                onClick={crear}
                disabled={!titulo.trim() || saving}
                className="px-4 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded-lg hover:bg-[#c9aa6a] disabled:opacity-40 transition-all"
              >
                {saving ? "Creando…" : "Crear tarea"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
