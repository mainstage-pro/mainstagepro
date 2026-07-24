"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Repeat, Calendar, Building2,
  ChevronLeft, X, FileText, Camera, Paperclip, Check, Handshake, Link2,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import RecurrenciaInput from "./RecurrenciaInput";

// ── Tipos de registro (los sistemas del hub unificado) ──────────────────────────
type TipoKey = "TAREA" | "PLAN" | "EVENTO" | "PROYECTO" | "TRATO";

const TIPOS: { key: TipoKey; titulo: string; desc: string; Icon: typeof ClipboardList; color: string }[] = [
  { key: "TAREA",    titulo: "Tarea",                          desc: "Una tarea puntual del día a día",        Icon: ClipboardList, color: "#9ca3af" },
  { key: "PLAN",     titulo: "Compromiso de plan de trabajo",  desc: "Una responsabilidad recurrente",          Icon: Repeat,        color: "#34d399" },
  { key: "EVENTO",   titulo: "Tarea de proyecto de evento",    desc: "Ligada a un evento específico",           Icon: Calendar,      color: "#60a5fa" },
  { key: "PROYECTO", titulo: "Tarea de proyecto de empresa",   desc: "Iniciativa interna de la empresa",        Icon: Building2,     color: "#818cf8" },
  { key: "TRATO",    titulo: "Tarea de trato de ventas",       desc: "Ligada a un trato/prospecto",             Icon: Handshake,     color: "#B3985B" },
];

// ── Métodos de comprobación (evidencia de cumplimiento) ─────────────────────────
const COMPROBACIONES: { key: string; label: string; desc: string; Icon: typeof FileText }[] = [
  { key: "NOTA",    label: "Comunicar por escrito", desc: "Una nota o comunicado",    Icon: FileText },
  { key: "FOTO",    label: "Evidencia fotográfica", desc: "Una o varias fotos",       Icon: Camera },
  { key: "ARCHIVO", label: "Reporte, PDF o archivo", desc: "Documento adjunto",       Icon: Paperclip },
];

const PRIORIDADES = [
  { key: "URGENTE", label: "Urgente", color: "#f87171" },
  { key: "ALTA",    label: "Alta",    color: "#fb923c" },
  { key: "MEDIA",   label: "Media",   color: "#B3985B" },
  { key: "BAJA",    label: "Baja",    color: "#555" },
] as const;

// ── Opciones de fuentes (eventos por mes + proyectos internos) ──────────────────
interface EventoOpt { id: string; nombre: string; numeroProyecto: string; estado: string; fechaEvento: string; cliente: string | null }
interface MesGrupo  { clave: string; etiqueta: string; eventos: EventoOpt[] }
interface FaseOpt   { id: string; nombre: string; completada: boolean }
interface InternoOpt { id: string; nombre: string; area: string; estado: string; lider: { id: string; name: string } | null; fases: FaseOpt[] }
interface TratoOpt  { id: string; nombre: string; cliente: string | null; etapa: string }

interface Usuario { id: string; name: string }
interface ArchivoExistente { id: string; nombre: string; url: string; tipo: string | null; tamano: number | null }

// Adjunto pendiente de subir: un archivo local o una URL manual. Se suben tras crear/guardar la tarea.
type Adjunto = { kind: "file"; file: File } | { kind: "url"; url: string; nombre: string };

interface Props {
  open: boolean;
  onClose: () => void;
  usuarios: Usuario[];
  defaultAsignadoId?: string | null;
  defaultArea?: string | null;
  // Proyecto de operaciones al que se adjunta la tarea (cuando se crea dentro de un proyecto).
  proyectoTareaId?: string | null;
  // Sección del proyecto (cuando se crea dentro de una sección específica).
  seccionId?: string | null;
  // Fija el tipo al abrir (p.ej. desde una pestaña del hub). Si se da, se salta el selector.
  tipoInicial?: TipoKey | null;
  // Pre-carga el título (p.ej. al convertir una idea en tarea).
  tituloInicial?: string | null;
  // Fija el proyecto de evento y bloquea el selector (al crear desde el detalle de un proyecto).
  proyectoEventoIdInicial?: string | null;
  proyectoEventoNombre?: string | null;
  // Fija el trato y bloquea el selector (al crear desde el detalle de un trato).
  tratoIdInicial?: string | null;
  tratoNombre?: string | null;
  // Modo edición: si se da, el modal carga esa tarea y guarda con PATCH en vez de crear.
  tareaIdEdicion?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreated: (tarea: any) => void;
}

export default function NuevaTareaModal({
  open, onClose, usuarios, defaultAsignadoId = null, defaultArea = null,
  proyectoTareaId = null, seccionId = null, tipoInicial = null, tituloInicial = null,
  proyectoEventoIdInicial = null, proyectoEventoNombre = null,
  tratoIdInicial = null, tratoNombre = null, tareaIdEdicion = null, onCreated,
}: Props) {
  const [tipo, setTipo]           = useState<TipoKey | null>(null);
  const [titulo, setTitulo]       = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState<string>("MEDIA");
  const [area, setArea]           = useState<string>(defaultArea || "GENERAL");
  const [asignadoId, setAsignadoId] = useState<string | null>(defaultAsignadoId);
  const [fecha, setFecha]         = useState("");
  const [fechaVen, setFechaVen]   = useState("");
  const [recurrencia, setRecurrencia] = useState<string | null>(null);
  const [comprobacion, setComprobacion] = useState<string>("");
  const [proyectoEventoId, setProyectoEventoId] = useState<string | null>(null);
  const [proyectoInternoId, setProyectoInternoId] = useState<string | null>(null);
  const [tratoId, setTratoId]     = useState<string | null>(null);
  const [faseId, setFaseId]       = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);

  // ── Adjuntos: archivos/URLs que se suben tras crear o guardar la tarea ──
  const [adjuntos, setAdjuntos]   = useState<Adjunto[]>([]);
  const [archivosExistentes, setArchivosExistentes] = useState<ArchivoExistente[]>([]);
  const [addingUrl, setAddingUrl] = useState(false);
  const [urlManual, setUrlManual] = useState("");
  const [nombreManual, setNombreManual] = useState("");
  const [subiendoAdjuntos, setSubiendoAdjuntos] = useState(false);

  const [eventosPorMes, setEventosPorMes] = useState<MesGrupo[]>([]);
  const [internos, setInternos]           = useState<InternoOpt[]>([]);
  const [tratos, setTratos]               = useState<TratoOpt[]>([]);
  const [loadingOpts, setLoadingOpts]     = useState(false);
  const [loadingEdit, setLoadingEdit]     = useState(false);

  const modoEdicion = !!tareaIdEdicion;

  // Reset al abrir/cerrar
  useEffect(() => {
    if (open) {
      setTipo(tipoInicial ?? null);
      setTitulo(tituloInicial ?? ""); setDescripcion(""); setPrioridad("MEDIA");
      setArea(defaultArea || "GENERAL"); setAsignadoId(defaultAsignadoId);
      setFecha(""); setFechaVen(""); setRecurrencia(null); setComprobacion("");
      setProyectoEventoId(proyectoEventoIdInicial ?? null); setProyectoInternoId(null); setFaseId(null);
      setTratoId(tratoIdInicial ?? null);
      setError(null); setSaving(false);
      setAdjuntos([]); setArchivosExistentes([]); setAddingUrl(false); setUrlManual(""); setNombreManual("");
    }
  }, [open, tipoInicial, tituloInicial, defaultArea, defaultAsignadoId, proyectoEventoIdInicial, tratoIdInicial]);

  // Modo edición: carga la tarea y precarga los campos (corre después del reset).
  useEffect(() => {
    if (!open || !tareaIdEdicion) return;
    setLoadingEdit(true);
    fetch(`/api/tareas/${tareaIdEdicion}`)
      .then(r => r.json())
      .then(d => {
        const t = d.tarea;
        if (!t) return;
        setTipo((t.tratoId ? "TRATO" : (t.tipoOrigen as TipoKey)) ?? "EVENTO");
        setTitulo(t.titulo ?? "");
        setDescripcion(t.descripcion ?? "");
        setPrioridad(t.prioridad ?? "MEDIA");
        setArea(t.area ?? "GENERAL");
        setAsignadoId(t.asignadoAId ?? t.asignadoA?.id ?? null);
        setFecha(t.fecha ? String(t.fecha).substring(0, 10) : "");
        setFechaVen(t.fechaVencimiento ? String(t.fechaVencimiento).substring(0, 10) : "");
        setComprobacion(t.tipoEvidencia ?? "");
        setTratoId(t.tratoId ?? tratoIdInicial ?? null);
        setProyectoEventoId(t.proyectoEventoId ?? null);
        setArchivosExistentes(t.archivos ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingEdit(false));
  }, [open, tareaIdEdicion]);

  // Carga las fuentes (eventos/proyectos internos) la primera vez que se necesitan
  useEffect(() => {
    if (!open) return;
    const necesitaOpts =
      (!proyectoEventoIdInicial && (tipo === "EVENTO" || tipo === "PROYECTO")) ||
      (!tratoIdInicial && tipo === "TRATO");
    if (necesitaOpts && eventosPorMes.length === 0 && internos.length === 0 && tratos.length === 0 && !loadingOpts) {
      setLoadingOpts(true);
      fetch("/api/tareas/opciones")
        .then(r => r.json())
        .then(d => {
          setEventosPorMes(d.eventosPorMes ?? []);
          setInternos(d.proyectosInternos ?? []);
          setTratos(d.tratos ?? []);
        })
        .catch(() => {})
        .finally(() => setLoadingOpts(false));
    }
  }, [open, tipo, eventosPorMes.length, internos.length, tratos.length, loadingOpts, proyectoEventoIdInicial, tratoIdInicial]);

  const internoSel = useMemo(() => internos.find(p => p.id === proyectoInternoId) ?? null, [internos, proyectoInternoId]);

  // Al elegir un proyecto interno, hereda su área
  useEffect(() => {
    if (internoSel) { setArea(internoSel.area); setFaseId(null); }
  }, [internoSel]);

  if (!open) return null;

  const tipoDef = TIPOS.find(t => t.key === tipo);

  function agregarUrl() {
    const u = urlManual.trim();
    if (!u) return;
    setAdjuntos(prev => [...prev, { kind: "url", url: u, nombre: nombreManual.trim() || u.split("/").pop() || "archivo" }]);
    setUrlManual(""); setNombreManual(""); setAddingUrl(false);
  }

  // Sube los adjuntos en espera a una tarea ya creada/guardada (endpoint requiere id).
  async function subirAdjuntos(tareaId: string) {
    if (adjuntos.length === 0) return;
    setSubiendoAdjuntos(true);
    for (const a of adjuntos) {
      const form = new FormData();
      if (a.kind === "file") form.append("file", a.file);
      else { form.append("url", a.url); form.append("nombre", a.nombre); }
      try { await fetch(`/api/tareas/${tareaId}/archivos`, { method: "POST", body: form }); } catch { /* no bloquea el guardado */ }
    }
    setSubiendoAdjuntos(false);
  }

  async function submit() {
    if (!tipo) return;
    if (!titulo.trim()) { setError("El título es obligatorio"); return; }
    if (tipo === "PLAN" && !recurrencia) { setError("Un compromiso de plan de trabajo debe ser recurrente."); return; }
    if (tipo === "EVENTO" && !proyectoEventoId) { setError("Selecciona el evento correspondiente."); return; }
    if (tipo === "PROYECTO" && !proyectoInternoId) { setError("Selecciona el proyecto de empresa."); return; }
    if (tipo === "TRATO" && !tratoId) { setError("Selecciona el trato correspondiente."); return; }

    setSaving(true);
    setError(null);

    // ── Modo edición: PATCH sobre la tarea existente ──────────────────────────
    if (modoEdicion) {
      try {
        const res = await fetch(`/api/tareas/${tareaIdEdicion}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: titulo.trim(),
            descripcion: descripcion.trim() || null,
            prioridad,
            area,
            asignadoAId: asignadoId || null,
            fecha: fecha || null,
            fechaVencimiento: fechaVen || null,
            tipoEvidencia: comprobacion || null,
            requiereEvidencia: !!comprobacion,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { setError(json.error ?? "No se pudo guardar la tarea"); setSaving(false); return; }
        await subirAdjuntos(tareaIdEdicion!);
        onCreated(json.tarea);
        onClose();
      } catch {
        setError("Error de red. Intenta de nuevo.");
        setSaving(false);
      }
      return;
    }

    const payload = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      prioridad,
      area,
      asignadoAId: asignadoId || null,
      fecha: recurrencia ? null : (fecha || null),
      fechaVencimiento: fechaVen || null,
      recurrencia: recurrencia || null,
      tipoOrigen: tipo,
      proyectoTareaId: proyectoTareaId || null,
      seccionId: seccionId || null,
      proyectoEventoId: tipo === "EVENTO" ? proyectoEventoId : null,
      proyectoInternoId: tipo === "PROYECTO" ? proyectoInternoId : null,
      faseInternaId: tipo === "PROYECTO" ? (faseId || null) : null,
      tratoId: tipo === "TRATO" ? tratoId : null,
      tipoEvidencia: comprobacion || null,
      requiereEvidencia: !!comprobacion,
    };
    try {
      const res = await fetch("/api/tareas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? "No se pudo crear la tarea"); setSaving(false); return; }
      if (json.tarea?.id) await subirAdjuntos(json.tarea.id);
      onCreated(json.tarea);
      onClose();
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg my-auto rounded-2xl border border-[#1c1c1c] bg-[#0a0a0a] shadow-2xl shadow-black/80 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#141414]">
          {tipo && !tipoInicial && (
            <button onClick={() => setTipo(null)} className="text-[#555] hover:text-white transition-colors -ml-1">
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">
              {tipo ? tipoDef?.titulo : "Nueva tarea"}
            </h2>
            <p className="text-[11px] text-[#555] truncate">
              {tipo ? tipoDef?.desc : "¿Qué vas a registrar?"}
            </p>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Paso 1: selector de tipo ───────────────────────────────────── */}
        {!tipo && (
          <div className="p-3 grid grid-cols-1 gap-2">
            {TIPOS.map(t => (
              <button key={t.key} onClick={() => setTipo(t.key)}
                className="group flex items-center gap-3.5 px-4 py-3 rounded-xl border border-[#161616] bg-[#0d0d0d] hover:bg-[#111] hover:border-[#262626] transition-all text-left">
                <span className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors"
                  style={{ backgroundColor: t.color + "18", color: t.color }}>
                  <t.Icon size={19} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-white">{t.titulo}</span>
                  <span className="block text-[11px] text-[#666]">{t.desc}</span>
                </span>
                <ChevronLeft size={16} className="text-[#333] rotate-180 group-hover:text-[#666] transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* ── Paso 2: formulario por tipo ────────────────────────────────── */}
        {tipo && modoEdicion && loadingEdit && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border border-[#333] border-t-[#B3985B] rounded-full animate-spin" />
          </div>
        )}
        {tipo && !(modoEdicion && loadingEdit) && (
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Título */}
            <div>
              <textarea autoFocus value={titulo} rows={1}
                onChange={e => { setTitulo(e.target.value); setError(null); }}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                placeholder="¿Qué hay que hacer?"
                className="w-full bg-transparent text-[16px] text-white placeholder-[#333] focus:outline-none leading-snug resize-none" />
              <textarea value={descripcion}
                onChange={e => { setDescripcion(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                placeholder="Descripción (opcional)"
                rows={1}
                className="w-full bg-transparent text-[13px] text-[#777] placeholder-[#2a2a2a] focus:outline-none leading-snug resize-none overflow-hidden" />
            </div>

            {/* Fuente específica del tipo */}
            {tipo === "EVENTO" && (
              <Campo label="Evento">
                {proyectoEventoIdInicial ? (
                  <div className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white/80 flex items-center gap-2">
                    <Calendar size={14} className="text-[#60a5fa] shrink-0" />
                    <span className="truncate">{proyectoEventoNombre ?? "Este proyecto"}</span>
                  </div>
                ) : loadingOpts ? <Cargando /> : (
                  <select value={proyectoEventoId ?? ""} onChange={e => setProyectoEventoId(e.target.value || null)}
                    className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#B3985B]/40">
                    <option value="">Selecciona un evento…</option>
                    {eventosPorMes.map(g => (
                      <optgroup key={g.clave} label={g.etiqueta}>
                        {g.eventos.map(ev => (
                          <option key={ev.id} value={ev.id}>
                            {ev.nombre}{ev.cliente ? ` · ${ev.cliente}` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
                {!proyectoEventoIdInicial && !loadingOpts && eventosPorMes.length === 0 && (
                  <p className="text-[11px] text-[#555] mt-1">No hay eventos activos.</p>
                )}
              </Campo>
            )}

            {tipo === "PROYECTO" && (
              <>
                <Campo label="Proyecto de empresa">
                  {loadingOpts ? <Cargando /> : (
                    <select value={proyectoInternoId ?? ""} onChange={e => setProyectoInternoId(e.target.value || null)}
                      className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#B3985B]/40">
                      <option value="">Selecciona un proyecto…</option>
                      {internos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  )}
                  {!loadingOpts && internos.length === 0 && (
                    <p className="text-[11px] text-[#555] mt-1">No hay proyectos de empresa activos.</p>
                  )}
                </Campo>
                {internoSel && internoSel.fases.length > 0 && (
                  <Campo label="Fase (opcional)">
                    <select value={faseId ?? ""} onChange={e => setFaseId(e.target.value || null)}
                      className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#B3985B]/40">
                      <option value="">Sin fase</option>
                      {internoSel.fases.map(f => (
                        <option key={f.id} value={f.id}>{f.nombre}{f.completada ? " ✓" : ""}</option>
                      ))}
                    </select>
                  </Campo>
                )}
              </>
            )}

            {tipo === "TRATO" && (
              <Campo label="Trato">
                {tratoIdInicial ? (
                  <div className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white/80 flex items-center gap-2">
                    <Handshake size={14} className="text-[#B3985B] shrink-0" />
                    <span className="truncate">{tratoNombre ?? "Este trato"}</span>
                  </div>
                ) : loadingOpts ? <Cargando /> : (
                  <select value={tratoId ?? ""} onChange={e => setTratoId(e.target.value || null)}
                    className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#B3985B]/40">
                    <option value="">Selecciona un trato…</option>
                    {tratos.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}{t.cliente ? ` · ${t.cliente}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {!tratoIdInicial && !loadingOpts && tratos.length === 0 && (
                  <p className="text-[11px] text-[#555] mt-1">No hay tratos activos.</p>
                )}
              </Campo>
            )}

            {/* Programación: recurrencia (PLAN) o fecha */}
            {tipo === "PLAN" ? (
              <Campo label="Recurrencia (obligatoria)">
                <RecurrenciaInput value={recurrencia} onChange={(raw) => { setRecurrencia(raw); setError(null); }} />
              </Campo>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Fecha">
                  <DatePicker value={fecha} onChange={setFecha} placeholder="dd/mm/aaaa" size="sm" />
                </Campo>
                <Campo label="Límite">
                  <DatePicker value={fechaVen} onChange={setFechaVen} placeholder="dd/mm/aaaa" size="sm" />
                </Campo>
              </div>
            )}

            {/* Prioridad */}
            <Campo label="Prioridad">
              <div className="flex gap-1.5">
                {PRIORIDADES.map(p => (
                  <button key={p.key} onClick={() => setPrioridad(p.key)}
                    className="flex-1 px-2 py-1.5 rounded-lg border text-[12px] font-medium transition-all"
                    style={{
                      borderColor: prioridad === p.key ? p.color + "60" : "#1a1a1a",
                      backgroundColor: prioridad === p.key ? p.color + "12" : "transparent",
                      color: prioridad === p.key ? p.color : "#555",
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </Campo>

            {/* Responsable */}
            {usuarios.length > 0 && (
              <Campo label="Responsable">
                <select value={asignadoId ?? ""} onChange={e => setAsignadoId(e.target.value || null)}
                  className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#B3985B]/40">
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Campo>
            )}

            {/* Método de comprobación */}
            <Campo label="Comprobación de cumplimiento">
              <div className="grid grid-cols-1 gap-1.5">
                {COMPROBACIONES.map(c => {
                  const activo = comprobacion === c.key;
                  return (
                    <button key={c.key} onClick={() => setComprobacion(activo ? "" : c.key)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${
                        activo ? "border-[#B3985B]/40 bg-[#B3985B]/8" : "border-[#161616] hover:border-[#242424]"
                      }`}>
                      <c.Icon size={15} className={activo ? "text-[#B3985B]" : "text-[#555]"} />
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[12.5px] ${activo ? "text-white" : "text-[#aaa]"}`}>{c.label}</span>
                        <span className="block text-[10.5px] text-[#555]">{c.desc}</span>
                      </span>
                      {activo && <Check size={15} className="text-[#B3985B]" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10.5px] text-[#555] mt-1.5">
                Al completarla, la evidencia se envía por WhatsApp al grupo del área y luego se verifica.
              </p>
            </Campo>

            {/* Archivos adjuntos */}
            <Campo label="Archivos">
              <div className="flex gap-3 mb-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-[12px] text-[#888] hover:text-[#B3985B] transition-colors">
                  <Paperclip size={13} /> Subir archivo
                  <input type="file" multiple className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      setAdjuntos(prev => [...prev, ...files.map(f => ({ kind: "file" as const, file: f }))]);
                      e.target.value = "";
                    }} />
                </label>
                <button type="button" onClick={() => setAddingUrl(v => !v)}
                  className="inline-flex items-center gap-1.5 text-[12px] text-[#888] hover:text-[#B3985B] transition-colors">
                  <Link2 size={13} /> Enlace
                </button>
              </div>

              {addingUrl && (
                <div className="mb-2 space-y-1 p-3 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg">
                  <input value={urlManual} onChange={e => setUrlManual(e.target.value)} placeholder="https://…"
                    className="w-full bg-transparent text-[12px] text-white placeholder-[#333] focus:outline-none" />
                  <input value={nombreManual} onChange={e => setNombreManual(e.target.value)} placeholder="Nombre (opcional)"
                    className="w-full bg-transparent text-[12px] text-white placeholder-[#333] focus:outline-none" />
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={agregarUrl} className="text-[12px] text-[#B3985B] hover:underline">Agregar</button>
                    <button type="button" onClick={() => setAddingUrl(false)} className="text-[12px] text-[#555] hover:text-white">Cancelar</button>
                  </div>
                </div>
              )}

              {(adjuntos.length > 0 || archivosExistentes.length > 0) ? (
                <div className="space-y-1">
                  {archivosExistentes.map(a => (
                    <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#111] text-[12px] text-[#888] hover:text-white">
                      <FileText size={12} className="shrink-0 text-[#555]" />
                      <span className="flex-1 truncate">{a.nombre}</span>
                    </a>
                  ))}
                  {adjuntos.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#111] text-[12px] text-[#999]">
                      {a.kind === "file"
                        ? <Paperclip size={12} className="shrink-0 text-[#555]" />
                        : <Link2 size={12} className="shrink-0 text-[#555]" />}
                      <span className="flex-1 truncate">{a.kind === "file" ? a.file.name : a.nombre}</span>
                      <button type="button" onClick={() => setAdjuntos(prev => prev.filter((_, j) => j !== i))}
                        className="text-[#333] hover:text-red-400 transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#444]">Sin archivos adjuntos</p>
              )}
            </Campo>

            {error && (
              <p className="text-[12px] text-red-400 flex items-center gap-1.5">
                <X size={13} /> {error}
              </p>
            )}
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {tipo && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#141414] bg-[#080808]">
            <button onClick={onClose} className="text-[12px] text-[#555] hover:text-white px-3 py-1.5 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={submit} disabled={saving || subiendoAdjuntos || !titulo.trim()}
              className="text-[12px] font-semibold px-4 py-1.5 rounded-lg bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              {subiendoAdjuntos ? "Subiendo archivos…" : modoEdicion ? (saving ? "Guardando…" : "Guardar cambios") : (saving ? "Creando…" : "Crear tarea")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────────
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[#666] uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
function Cargando() {
  return <div className="h-9 rounded-lg bg-[#0f0f0f] border border-[#1a1a1a] animate-pulse" />;
}
