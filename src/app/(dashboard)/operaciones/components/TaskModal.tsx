"use client";
import { useState, useEffect, useRef } from "react";
import DatePicker from "@/components/ui/DatePicker";
import RecurrenciaPicker from "./RecurrenciaPicker";
import QuickAdd from "./QuickAdd";
import TaskItem, { type TareaItem } from "./TaskItem";
import { Combobox } from "@/components/Combobox";
import { AREAS, AREA_LABELS } from "@/lib/gestion";
import { useToast } from "@/components/Toast";
import { Link2, Camera, Paperclip, FileText, ExternalLink, ChevronDown, ChevronRight, ShieldCheck, ClipboardCheck, AlertTriangle } from "lucide-react";
import AccesoDirectoField from "./AccesoDirectoField";

// ── Bloque 5: tag de origen (mismo esquema que TaskItem) ──
const TIPO_ORIGEN: Record<string, { label: string; color: string; bg: string; border: string }> = {
  TAREA:    { label: "Tarea",    color: "#9ca3af", bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.30)" },
  PLAN:     { label: "Plan",     color: "#B3985B", bg: "rgba(179,152,91,0.12)",  border: "rgba(179,152,91,0.35)" },
  PROYECTO: { label: "Proyecto", color: "#818cf8", bg: "rgba(99,102,241,0.14)",  border: "rgba(99,102,241,0.35)" },
  EVENTO:   { label: "Evento",   color: "#60a5fa", bg: "rgba(59,130,246,0.14)",  border: "rgba(59,130,246,0.35)" },
  TRATO:    { label: "Trato",    color: "#2dd4bf", bg: "rgba(45,212,191,0.12)",  border: "rgba(45,212,191,0.35)" },
};

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
    fecha: s.fecha,
    recurrencia: null, proyectoTarea: null, seccion: null, asignadoA: null,
    _count: { subtareas: s._count.subtareas, comentarios: 0, archivos: 0 },
    createdAt: new Date().toISOString(), fechaCompletada: null,
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
  colaboradores?: { usuario: { id: string; name: string } }[] | null;
  proyectoTarea: { id: string; nombre: string; color: string | null } | null;
  seccion: { id: string; nombre: string } | null;
  carpeta: { id: string; nombre: string } | null;
  iniciativa: { id: string; nombre: string; color: string | null } | null;
  subtareas: Subtarea[];
  comentarios: Comentario[];
  archivos: Archivo[];
  // ── Capa aditiva (Bloque 3): evidencia, ficha del estándar y acceso a módulo ──
  tipoOrigen?: string | null;
  requiereEvidencia?: boolean | null;
  tipoEvidencia?: string | null;
  evidenciaNota?: string | null;
  estadoVerificacion?: string | null;
  motivoRechazo?: string | null;
  evidenciaEnviadaAt?: string | null;
  evidenciaEnviadaCanal?: string | null;
  porqueSeHace?: string | null;
  estandarMinimo?: string | null;
  siNoSeHace?: string | null;
  cuando?: string | null;
  moduloDestino?: string | null;
  moduloTexto?: string | null;
  moduloDisponible?: boolean | null;
  esAccionCampo?: boolean | null;
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

function FlagIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? color : "none"}
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TaskModal({
  tarea, loading, usuarios, proyectos, iniciativas, sessionId,
  onClose, onSave, onComplete, onDelete, onAddSubtarea, onCompleteSubtarea, onDeleteSubtarea,
}: Props) {
  const toast = useToast();

  // ── Existing state ──
  const [titulo, setTitulo]           = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [notas, setNotas]             = useState("");
  const [prioridad, setPrioridad]     = useState("MEDIA");
  const [area, setArea]               = useState("GENERAL");
  const [asignadoAId, setAsignadoAId] = useState("");
  const [coResponsables, setCoResponsables] = useState<string[]>([]);
  const [proyectoId, setProyectoId]   = useState("");
  const [iniciativaId, setIniciativaId] = useState("");
  const [fecha, setFecha]             = useState("");
  const [fechaVen, setFechaVen]       = useState("");
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
  // ── Bloque 3: evidencia + ficha ──
  const [evidenciaNota, setEvidenciaNota] = useState("");
  const [tipoOrigen, setTipoOrigen]   = useState("TAREA");
  const [fichaOpen, setFichaOpen]     = useState(false);
  const [savingNota, setSavingNota]   = useState(false);
  // ── Configuración de evidencia (editable en los 4 sistemas) ──
  const [requiereEvidencia, setRequiereEvidencia] = useState(false);
  const [tipoEvidencia, setTipoEvidencia] = useState<string | null>(null);
  // ── Acceso directo: módulo interno o enlace externo (editable) ──
  const [moduloDestino, setModuloDestino] = useState("");
  const [moduloTexto, setModuloTexto] = useState("");
  // ── Envío de evidencia al grupo (WhatsApp) ──
  const [enviandoGrupo, setEnviandoGrupo] = useState(false);
  const [evidenciaEnviadaAt, setEvidenciaEnviadaAt] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef   = useRef<HTMLTextAreaElement>(null);
  const descRef    = useRef<HTMLTextAreaElement>(null);

  function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return; el.style.height = "auto"; el.style.height = el.scrollHeight + "px";
  }

  // ── Reset state when task changes ──
  useEffect(() => {
    if (!tarea) return;
    setTitulo(tarea.titulo);
    setDescripcion(tarea.descripcion ?? "");
    setNotas(tarea.notas ?? "");
    setPrioridad(tarea.prioridad);
    setArea(tarea.area ?? "GENERAL");
    setAsignadoAId(tarea.asignadoA?.id ?? "");
    setCoResponsables((tarea.colaboradores ?? []).map(c => c.usuario.id));
    setProyectoId(tarea.proyectoTarea?.id ?? "");
    setIniciativaId(tarea.iniciativa?.id ?? "");
    setFecha(tarea.fecha ? tarea.fecha.substring(0, 10) : "");
    setFechaVen(tarea.fechaVencimiento ? tarea.fechaVencimiento.substring(0, 10) : "");
    setShowFechaVenPicker(false);
    setEditingRec(false);
    setDirty(false);
    setSubtareasLocal(tarea.subtareas ?? []);
    setComentariosLocal(tarea.comentarios ?? []);
    setArchivosLocal(tarea.archivos ?? []);
    setEvidenciaNota(tarea.evidenciaNota ?? "");
    setTipoOrigen(tarea.tipoOrigen ?? "TAREA");
    setRequiereEvidencia(!!tarea.requiereEvidencia);
    setTipoEvidencia(tarea.tipoEvidencia ?? null);
    setModuloDestino(tarea.moduloDestino ?? "");
    setModuloTexto(tarea.moduloTexto ?? "");
    setEvidenciaEnviadaAt(tarea.evidenciaEnviadaAt ?? null);
    setFichaOpen(false);

    setTimeout(() => titleRef.current?.focus(), 80);
  }, [tarea?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { autoResize(titleRef.current); }, [titulo]);
  useEffect(() => { autoResize(descRef.current);  }, [descripcion]);

  // ── Keyboard: Escape closes ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
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
      area,
      asignadoAId:      asignadoAId      || null,
      colaboradorIds:   coResponsables.filter(id => id !== asignadoAId),
      proyectoTareaId:  proyectoId       || null,
      iniciativaId:     iniciativaId     || null,
      fecha:            fecha            || null,
      fechaVencimiento: fechaVen         || null,
    });
    setSaving(false);
    setDirty(false);
  }

  function mark() { setDirty(true); }

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
    const res = await fetch(`/api/tareas/${tarea.id}/comentarios/${cid}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
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
      if (res.ok) setArchivosLocal(prev => [data.archivo, ...prev]);
      else alert(data.error ?? "Error al subir archivo");
    } catch { alert("Error de conexión al subir archivo"); }
    finally { setUploading(false); }
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
    const res = await fetch(`/api/tareas/${tarea.id}/archivos/${aid}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    setArchivosLocal(prev => prev.filter(a => a.id !== aid));
  }

  // ── Bloque 3: guardar nota de evidencia (persistir sin cerrar modal) ──
  async function guardarNota() {
    if (!tarea) return;
    setSavingNota(true);
    try {
      await fetch(`/api/tareas/${tarea.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidenciaNota: evidenciaNota || null }),
      });
    } finally { setSavingNota(false); }
  }

  // ── Cambiar configuración de evidencia (persiste de inmediato) ──
  function toggleRequiereEvidencia(next: boolean) {
    if (!tarea) return;
    setRequiereEvidencia(next);
    onSave(tarea.id, { requiereEvidencia: next });
  }
  function cambiarTipoEvidencia(next: string | null) {
    if (!tarea) return;
    setTipoEvidencia(next);
    onSave(tarea.id, { tipoEvidencia: next });
  }
  // ── Convertir el sistema operativo de la tarea (ej. Tarea → Plan de trabajo) ──
  function cambiarTipoOrigen(next: string) {
    if (!tarea || next === tipoOrigen) return;
    setTipoOrigen(next);
    onSave(tarea.id, { tipoOrigen: next });
    toast.success(`Convertida a ${TIPO_ORIGEN[next]?.label ?? next}`);
  }
  // ── Acceso directo: persistir destino + texto ──
  function guardarAcceso(destino: string, texto: string) {
    if (!tarea) return;
    setModuloDestino(destino);
    setModuloTexto(texto);
    onSave(tarea.id, {
      moduloDestino: destino || null,
      moduloTexto: texto || null,
      moduloDisponible: true,
    });
  }
  function limpiarAcceso() {
    if (!tarea) return;
    setModuloDestino("");
    setModuloTexto("");
    onSave(tarea.id, { moduloDestino: null, moduloTexto: null });
  }
  // ── Enviar evidencia al grupo de WhatsApp ──
  async function enviarAlGrupo() {
    if (!tarea) return;
    setEnviandoGrupo(true);
    try {
      const res = await fetch(`/api/tareas/${tarea.id}/enviar-evidencia`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Error al enviar la evidencia"); return; }
      setEvidenciaEnviadaAt(new Date().toISOString());
      if (data.waUrl) window.open(data.waUrl, "_blank", "noopener,noreferrer");
      toast.success(data.grupoConfigurado ? "Abriendo el grupo de WhatsApp…" : "Abriendo WhatsApp con el mensaje…");
    } catch {
      toast.error("Error de conexión al enviar la evidencia");
    } finally {
      setEnviandoGrupo(false);
    }
  }

  const isCompleted = tarea?.estado === "COMPLETADA";

  // ── Bloque 3: evidencia — ¿está cumplido el requisito para completar? ──
  const tieneImagen = archivosLocal.some(a => (a.tipo ?? "").toLowerCase().startsWith("image/"));
  const tieneArchivo = archivosLocal.length > 0;
  const notaValida = evidenciaNota.trim().length >= 10;

  let evidenciaCumplida = true;
  let evidenciaFalta = "";
  if (requiereEvidencia && !isCompleted) {
    switch (tipoEvidencia) {
      case "FOTO":
        evidenciaCumplida = tieneImagen;
        evidenciaFalta = "Adjunta al menos una foto para poder completar.";
        break;
      case "ARCHIVO":
        evidenciaCumplida = tieneArchivo;
        evidenciaFalta = "Adjunta al menos un archivo para poder completar.";
        break;
      case "NOTA":
        evidenciaCumplida = notaValida;
        evidenciaFalta = "Escribe una nota de evidencia (mínimo 10 caracteres).";
        break;
      case "ENLACE_MODULO":
        evidenciaCumplida = notaValida || tieneArchivo;
        evidenciaFalta = "Confirma con una nota (mínimo 10 caracteres) o adjunta un archivo.";
        break;
      default:
        evidenciaCumplida = notaValida || tieneArchivo;
        evidenciaFalta = "Agrega evidencia (nota o archivo) para completar.";
    }
  }
  const bloqueaCompletar = requiereEvidencia && !isCompleted && !evidenciaCumplida;

  // Wrapper: al completar, primero persiste la nota (si aplica) y luego completa
  async function handleComplete() {
    if (!tarea) return;
    if (bloqueaCompletar) { toast.error(evidenciaFalta); return; }
    if (requiereEvidencia && evidenciaNota !== (tarea.evidenciaNota ?? "")) {
      await guardarNota();
    }
    onComplete(tarea.id);
  }

  // ── Bloque 3: ficha del estándar — sólo si hay al menos un dato ──
  const tieneFicha = !!(tarea?.porqueSeHace || tarea?.estandarMinimo || tarea?.siNoSeHace || tarea?.cuando);
  const fichaReadonly = tipoOrigen === "PLAN";

  // ── Bloque 3: acceso directo a módulo / enlace externo ──
  const moduloUrl = moduloDestino || null;
  const moduloEsExterno = /^https?:\/\//i.test(moduloDestino);
  const moduloLabel = moduloTexto || (moduloEsExterno ? "Abrir enlace" : "Abrir módulo");

  const EVIDENCIA_LABEL: Record<string, string> = {
    FOTO: "Foto", ARCHIVO: "Archivo", NOTA: "Nota", ENLACE_MODULO: "Confirmación / enlace",
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl flex flex-col shadow-2xl overflow-hidden">

        {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#1a1a1a] shrink-0">
          <button
            onClick={handleComplete}
            title={bloqueaCompletar ? evidenciaFalta : isCompleted ? "Completada" : "Marcar completada"}
            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
              isCompleted ? "bg-[#B3985B] border-[#B3985B]"
                : bloqueaCompletar ? "border-[#2a2a2a] opacity-60 cursor-not-allowed"
                : "border-[#333] hover:border-[#B3985B]"
            }`}
          >
            {isCompleted && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M2 6l3 3 5-5"/>
              </svg>
            )}
          </button>

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

            {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
            <div className="md:overflow-y-auto p-5 space-y-4 border-b md:border-b-0 md:border-r border-[#141414]">

              {/* ── Tipo de tarea (convertible entre sistemas) ── */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Si está ligada a una entidad (Evento/Proyecto/Trato), se muestra
                    su tipo actual; convertirla a Tarea/Plan la desliga de la entidad. */}
                {(tipoOrigen === "EVENTO" || tipoOrigen === "PROYECTO" || tipoOrigen === "TRATO") && TIPO_ORIGEN[tipoOrigen] && (
                  <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md select-none"
                    style={{
                      color: TIPO_ORIGEN[tipoOrigen].color,
                      backgroundColor: TIPO_ORIGEN[tipoOrigen].bg,
                      border: `1px solid ${TIPO_ORIGEN[tipoOrigen].border}`,
                    }}>
                    {TIPO_ORIGEN[tipoOrigen].label}
                  </span>
                )}
                {(["TAREA", "PLAN"] as const).map(t => {
                  const activo = tipoOrigen === t;
                  const cfg = TIPO_ORIGEN[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => cambiarTipoOrigen(t)}
                      className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md transition-all"
                      style={activo
                        ? { color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }
                        : { color: "#555", backgroundColor: "transparent", border: "1px solid #1f1f1f" }}
                      title={t === "PLAN" ? "Tarea de plan de trabajo" : "Tarea normal"}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {/* Title */}
              <textarea
                ref={titleRef}
                value={titulo}
                onChange={e => { setTitulo(e.target.value); mark(); autoResize(e.target); }}
                placeholder="Título de la tarea"
                className="w-full bg-transparent text-white text-xl font-semibold resize-none overflow-hidden focus:outline-none placeholder:text-[#444] leading-snug"
                rows={1}
              />

              {/* Description — label: ¿Qué hay que hacer? */}
              <div>
                <p className="text-[10px] text-[#333] uppercase tracking-widest font-semibold mb-1.5">
                  ¿Qué hay que hacer?
                </p>
                <textarea
                  ref={descRef}
                  value={descripcion}
                  onChange={e => { setDescripcion(e.target.value); mark(); autoResize(e.target); }}
                  placeholder="Añade una descripción…"
                  className="w-full bg-transparent text-sm text-[#777] resize-none overflow-hidden focus:outline-none placeholder:text-[#444] leading-relaxed"
                  rows={1}
                />
              </div>

              {/* ── Acceso directo a módulo (Bloque 3) ── */}
              {moduloUrl && (
                <a
                  href={moduloUrl}
                  target={moduloEsExterno ? "_blank" : undefined}
                  rel={moduloEsExterno ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/20 transition-all group"
                >
                  <ExternalLink strokeWidth={2} className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium flex-1">{moduloLabel}</span>
                  <ChevronRight strokeWidth={2} className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                </a>
              )}

              {/* ── Evidencia rechazada (Bloque 4) ── */}
              {tarea.estadoVerificacion === "RECHAZADA" && !isCompleted && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-950/30 border border-red-500/30">
                  <AlertTriangle strokeWidth={2} className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-red-400">Evidencia rechazada</p>
                    <p className="text-xs text-red-200/90 leading-relaxed mt-1 whitespace-pre-wrap">
                      {tarea.motivoRechazo || "Vuelve a completar la tarea con nueva evidencia."}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Ficha del estándar (Bloque 3) ── */}
              {tieneFicha && (
                <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setFichaOpen(o => !o)}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-[#0a0a0a] hover:bg-[#111] transition-colors"
                  >
                    <ClipboardCheck strokeWidth={1.75} className="w-3.5 h-3.5 text-[#B3985B]" />
                    <span className="text-[11px] uppercase tracking-widest font-semibold text-[#888]">Ficha del estándar</span>
                    {fichaReadonly && <span className="text-[9px] text-[#444] border border-[#222] rounded px-1.5 py-0.5">Solo lectura</span>}
                    {fichaOpen
                      ? <ChevronDown strokeWidth={2} className="w-3.5 h-3.5 text-[#444] ml-auto" />
                      : <ChevronRight strokeWidth={2} className="w-3.5 h-3.5 text-[#444] ml-auto" />}
                  </button>
                  {fichaOpen && (
                    <div className="px-3.5 py-3 space-y-3 border-t border-[#1a1a1a]">
                      {tarea.cuando && (
                        <div>
                          <p className="text-[9px] text-[#555] uppercase tracking-widest font-semibold mb-0.5">Cuándo</p>
                          <p className="text-xs text-[#aaa] leading-relaxed whitespace-pre-wrap">{tarea.cuando}</p>
                        </div>
                      )}
                      {tarea.porqueSeHace && (
                        <div>
                          <p className="text-[9px] text-[#555] uppercase tracking-widest font-semibold mb-0.5">Por qué se hace</p>
                          <p className="text-xs text-[#aaa] leading-relaxed whitespace-pre-wrap">{tarea.porqueSeHace}</p>
                        </div>
                      )}
                      {tarea.estandarMinimo && (
                        <div>
                          <p className="text-[9px] text-[#555] uppercase tracking-widest font-semibold mb-0.5">Estándar mínimo</p>
                          <p className="text-xs text-[#aaa] leading-relaxed whitespace-pre-wrap">{tarea.estandarMinimo}</p>
                        </div>
                      )}
                      {tarea.siNoSeHace && (
                        <div>
                          <p className="text-[9px] text-[#555] uppercase tracking-widest font-semibold mb-0.5">Si no se hace</p>
                          <p className="text-xs text-[#aaa] leading-relaxed whitespace-pre-wrap">{tarea.siNoSeHace}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Evidencia requerida (Bloque 3) ── */}
              {requiereEvidencia && (
                <div className={`border rounded-xl p-3.5 ${evidenciaCumplida ? "border-[#1f2f1f] bg-[#0a0f0a]" : "border-[#B3985B]/25 bg-[#B3985B]/5"}`}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <ShieldCheck strokeWidth={1.75} className={`w-3.5 h-3.5 ${evidenciaCumplida ? "text-green-500" : "text-[#B3985B]"}`} />
                    <span className="text-[11px] uppercase tracking-widest font-semibold text-[#aaa]">Evidencia requerida</span>
                    {tipoEvidencia && (
                      <span className="text-[9px] text-[#B3985B] border border-[#B3985B]/30 rounded px-1.5 py-0.5">
                        {EVIDENCIA_LABEL[tipoEvidencia] ?? tipoEvidencia}
                      </span>
                    )}
                  </div>

                  {/* FOTO / ARCHIVO → subida */}
                  {(tipoEvidencia === "FOTO" || tipoEvidencia === "ARCHIVO" || tipoEvidencia === "ENLACE_MODULO" || !tipoEvidencia) && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {tipoEvidencia === "FOTO" ? (
                          <>
                            <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#ccc] hover:border-[#B3985B]/40 transition-all">
                              <Camera strokeWidth={1.75} className="w-3.5 h-3.5" /> Tomar foto
                              <input type="file" accept="image/*" capture="environment" className="hidden"
                                onChange={e => { Array.from(e.target.files ?? []).forEach(subirArchivo); e.target.value = ""; }} />
                            </label>
                            <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#ccc] hover:border-[#B3985B]/40 transition-all">
                              <Paperclip strokeWidth={1.75} className="w-3.5 h-3.5" /> Galería
                              <input type="file" accept="image/*" multiple className="hidden"
                                onChange={e => { Array.from(e.target.files ?? []).forEach(subirArchivo); e.target.value = ""; }} />
                            </label>
                          </>
                        ) : (
                          <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#ccc] hover:border-[#B3985B]/40 transition-all">
                            <Paperclip strokeWidth={1.75} className="w-3.5 h-3.5" /> Adjuntar archivo
                            <input type="file" multiple className="hidden"
                              onChange={e => { Array.from(e.target.files ?? []).forEach(subirArchivo); e.target.value = ""; }} />
                          </label>
                        )}
                      </div>
                      {uploading && <p className="text-[11px] text-[#555]">Subiendo…</p>}
                      {/* Miniaturas de imágenes / lista de archivos */}
                      {archivosLocal.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {archivosLocal.map(a => (
                            (a.tipo ?? "").toLowerCase().startsWith("image/") ? (
                              <div key={a.id} className="relative group w-14 h-14">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <a href={a.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full rounded-lg overflow-hidden border border-[#222]">
                                  <img src={a.url} alt={a.nombre} className="w-full h-full object-cover" />
                                </a>
                                <button type="button" onClick={() => eliminarArchivo(a.id)}
                                  title="Borrar evidencia"
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div key={a.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#111] border border-[#222] text-[11px] text-[#999] max-w-[160px]">
                                <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 min-w-0 hover:text-white">
                                  <FileText strokeWidth={1.75} className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{a.nombre}</span>
                                </a>
                                <button type="button" onClick={() => eliminarArchivo(a.id)}
                                  title="Borrar evidencia"
                                  className="shrink-0 text-red-500 hover:text-red-400 text-[11px] leading-none">
                                  ✕
                                </button>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* NOTA / ENLACE_MODULO → textarea */}
                  {(tipoEvidencia === "NOTA" || tipoEvidencia === "ENLACE_MODULO" || !tipoEvidencia) && (
                    <div className={tipoEvidencia === "ENLACE_MODULO" || !tipoEvidencia ? "mt-2" : ""}>
                      <textarea
                        value={evidenciaNota}
                        onChange={e => setEvidenciaNota(e.target.value)}
                        onBlur={() => { if (evidenciaNota !== (tarea.evidenciaNota ?? "")) guardarNota(); }}
                        placeholder={tipoEvidencia === "ENLACE_MODULO" ? "Confirma qué hiciste en el módulo (mín. 10 caracteres)…" : "Escribe la nota de evidencia (mín. 10 caracteres)…"}
                        className="w-full bg-[#080808] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-[#B3985B]/40 placeholder:text-[#444]"
                        rows={2}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-[10px] ${notaValida ? "text-green-600" : "text-[#555]"}`}>
                          {evidenciaNota.trim().length}/10 caracteres
                        </span>
                        {savingNota && <span className="text-[10px] text-[#555]">Guardando…</span>}
                      </div>
                    </div>
                  )}

                  {/* Estado del gate */}
                  {!isCompleted && (
                    <p className={`text-[11px] mt-2.5 ${evidenciaCumplida ? "text-green-600" : "text-[#B3985B]"}`}>
                      {evidenciaCumplida ? "✓ Evidencia lista — ya puedes completar la tarea." : evidenciaFalta}
                    </p>
                  )}

                  {/* Enviar al grupo (WhatsApp) */}
                  <div className="mt-3 pt-3 border-t border-[#1a1a1a]/60">
                    <button
                      onClick={enviarAlGrupo}
                      disabled={enviandoGrupo || !evidenciaCumplida}
                      title={!evidenciaCumplida ? evidenciaFalta : "Enviar la evidencia al grupo"}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#111] border border-[#25502f] text-xs font-medium text-[#4ade80] hover:bg-[#0f1f14] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.3-1.38a9.87 9.87 0 004.69 1.19h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0012.04 2zm5.8 14.15c-.24.68-1.42 1.3-1.95 1.34-.5.05-.98.24-3.3-.69-2.78-1.1-4.55-3.96-4.69-4.15-.14-.19-1.13-1.5-1.13-2.86 0-1.36.72-2.03.97-2.31.24-.28.53-.35.71-.35l.5.01c.16.01.38-.06.59.45.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48l-.42.49c-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.69-.81.88-1.09.19-.28.37-.23.62-.14.25.09 1.61.76 1.89.9.28.14.46.21.53.33.07.12.07.68-.17 1.36z"/></svg>
                      {enviandoGrupo ? "Abriendo…" : evidenciaEnviadaAt ? "Reenviar al grupo" : "Enviar al grupo"}
                    </button>
                    {evidenciaEnviadaAt && (
                      <p className="text-[10px] text-green-600/80 mt-1.5 text-center">
                        ✓ Enviado {new Date(evidenciaEnviadaAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Subtareas ── */}
              <div className="border-t border-[#141414] pt-3">
                <p className="text-[11px] text-[#444] uppercase tracking-widest font-semibold mb-2">Subtareas</p>
                {subtareasLocal.map(sub => (
                  <TaskItem
                    key={sub.id}
                    tarea={subtareaToItem(sub)}
                    isSelected={false}
                    users={usuarios}
                    onAssign={(id, userId) => {
                      onSave(id, { asignadoAId: userId || null });
                      setSubtareasLocal(prev => prev.map(s => s.id === id ? {
                        ...s,
                        asignadoA: userId ? (usuarios.find(u => u.id === userId) ?? null) : null
                      } : s));
                    }}
                    onComplete={() => {
                      onCompleteSubtarea(sub.id);
                      setSubtareasLocal(prev => prev.map(s => s.id === sub.id ? { ...s, estado: "COMPLETADA" } : s));
                    }}
                    onSelect={() => {}}
                    onDelete={() => {
                      onDeleteSubtarea(sub.id);
                      setSubtareasLocal(prev => prev.filter(s => s.id !== sub.id));
                    }}
                    onDateChange={(id, val) => {
                      onSave(id, { fecha: val || null });
                      setSubtareasLocal(prev => prev.map(s => s.id === id ? { ...s, fecha: val || null } : s));
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

              {/* ── Archivos ── */}
              <div className="border-t border-[#141414] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-[#444] uppercase tracking-widest font-semibold">Archivos</p>
                  <div className="flex gap-3">
                    <label className="cursor-pointer text-xs text-[#555] hover:text-[#B3985B] transition-colors">
                      <input type="file" multiple className="hidden"
                        onChange={e => { Array.from(e.target.files ?? []).forEach(subirArchivo); }} />
                      ↑ Subir
                    </label>
                    <button onClick={() => setAddingUrl(!addingUrl)} className="inline-flex items-center gap-1 text-xs text-[#555] hover:text-[#B3985B] transition-colors">
                      <Link2 strokeWidth={1.75} className="w-3 h-3" /> URL
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
              <div className="border-t border-[#141414] pt-3">
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
                    className="flex-1 bg-[#080808] border border-[#1a1a1a] rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-[#2a2a2a] placeholder:text-[#444]"
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
                <Combobox
                  value={asignadoAId}
                  onChange={v => { setAsignadoAId(v); mark(); }}
                  options={[{ value: "", label: "— Sin asignar —" }, ...usuarios.map(u => ({ value: u.id, label: u.name }))]}
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>

              {/* Co-responsables (apoyan; el responsable primario da el check) */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Co-responsables</p>
                {coResponsables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {coResponsables.map(cid => {
                      const u = usuarios.find(x => x.id === cid);
                      return (
                        <span key={cid} className="inline-flex items-center gap-1 bg-[#151515] border border-[#2a2a2a] rounded-full pl-2 pr-1 py-0.5 text-[11px] text-[#ccc]">
                          {u?.name ?? "—"}
                          <button
                            type="button"
                            onClick={() => { setCoResponsables(prev => prev.filter(x => x !== cid)); mark(); }}
                            className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-[#777] hover:text-white hover:bg-[#2a2a2a]"
                          >×</button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <Combobox
                  value=""
                  onChange={v => { if (v) { setCoResponsables(prev => prev.includes(v) ? prev : [...prev, v]); mark(); } }}
                  options={[
                    { value: "", label: "+ Agregar co-responsable" },
                    ...usuarios
                      .filter(u => u.id !== asignadoAId && !coResponsables.includes(u.id))
                      .map(u => ({ value: u.id, label: u.name })),
                  ]}
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>

              {/* Proyecto */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Proyecto</p>
                <Combobox
                  value={proyectoId}
                  onChange={v => { setProyectoId(v); mark(); }}
                  options={[{ value: "", label: "— Bandeja de entrada —" }, ...proyectos.map(p => ({ value: p.id, label: p.nombre }))]}
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>

              {/* Área */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Área</p>
                <Combobox
                  value={area}
                  onChange={v => { setArea(v || "GENERAL"); mark(); }}
                  options={[{ value: "GENERAL", label: "— Sin área (Otras) —" }, ...AREAS.map(a => ({ value: a, label: AREA_LABELS[a] }))]}
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>

              {/* Iniciativa */}
              {iniciativas.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-1.5">Iniciativa</p>
                  <Combobox
                    value={iniciativaId}
                    onChange={v => { setIniciativaId(v); mark(); }}
                    options={[{ value: "", label: "— Ninguna —" }, ...iniciativas.map(i => ({ value: i.id, label: i.nombre }))]}
                    className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
              )}

              {/* Evidencia — configuración (editable en los 4 sistemas) */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-2">Evidencia</p>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <button
                    type="button"
                    onClick={() => toggleRequiereEvidencia(!requiereEvidencia)}
                    className={`w-8 h-[18px] rounded-full transition-colors relative shrink-0 ${requiereEvidencia ? "bg-[#B3985B]" : "bg-[#222]"}`}
                  >
                    <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${requiereEvidencia ? "left-[15px]" : "left-0.5"}`} />
                  </button>
                  <span className="text-xs text-[#999]">Requiere evidencia</span>
                </label>
                {requiereEvidencia && (
                  <select
                    value={tipoEvidencia ?? ""}
                    onChange={e => cambiarTipoEvidencia(e.target.value || null)}
                    className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]"
                  >
                    <option value="">Nota o archivo</option>
                    <option value="FOTO">Foto</option>
                    <option value="ARCHIVO">Archivo</option>
                    <option value="NOTA">Nota</option>
                    <option value="ENLACE_MODULO">Confirmación / enlace</option>
                  </select>
                )}
              </div>

              {/* Acceso directo — módulo del sidebar (+ sección) o enlace externo */}
              <AccesoDirectoField
                destino={moduloDestino}
                texto={moduloTexto}
                onChange={(d, t) => guardarAcceso(d, t)}
                onClear={limpiarAcceso}
              />

              {/* Fecha / Recurrencia */}
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold mb-2">Fecha</p>

                <div className="flex rounded-lg overflow-hidden border border-[#1a1a1a] mb-3">
                  <button
                    onClick={() => { if (tarea.recurrencia) onSave(tarea.id, { recurrencia: null }); setEditingRec(false); }}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-all ${
                      !tarea.recurrencia ? "bg-[#1a1a1a] text-white" : "text-[#444] hover:text-[#777]"
                    }`}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
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

                {!editingRec && !tarea.recurrencia ? (
                  <div className="space-y-2">
                    <DatePicker value={fecha} onChange={val => { setFecha(val); mark(); }} size="sm" />
                    {(fechaVen || showFechaVenPicker) ? (
                      <DatePicker value={fechaVen} onChange={val => { setFechaVen(val); mark(); if (!val) setShowFechaVenPicker(false); }}
                        size="sm" showClear placeholder="Fecha límite" />
                    ) : (
                      <button onClick={() => setShowFechaVenPicker(true)}
                        className="text-xs text-[#333] hover:text-[#666] transition-colors">
                        + Fecha límite
                      </button>
                    )}
                  </div>
                ) : (
                  <RecurrenciaPicker
                    value={tarea.recurrencia}
                    onChange={json => {
                      onSave(tarea.id, { recurrencia: json });
                      toast.success(json ? "Recurrencia guardada" : "Recurrencia eliminada");
                      if (!json) setEditingRec(false);
                    }}
                    onClose={() => setEditingRec(false)}
                  />
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
