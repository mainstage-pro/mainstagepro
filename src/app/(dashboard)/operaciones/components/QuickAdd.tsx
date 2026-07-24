"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { formatearRecurrencia, detectarFechaEnTitulo } from "@/lib/recurrencia";
import DatePicker from "@/components/ui/DatePicker";
import RecurrenciaPicker from "./RecurrenciaPicker";

// ── Icons ──────────────────────────────────────────────────────────────────────

const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconFlag = ({ color = "currentColor" }: { color?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24"
    fill={color !== "currentColor" ? color + "28" : "none"}
    stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);
const IconRepeat = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);
const IconFolder = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconUser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIORIDADES = [
  { key: "URGENTE", label: "Urgente", color: "#f87171",  short: "P1" },
  { key: "ALTA",    label: "Alta",    color: "#fb923c",  short: "P2" },
  { key: "MEDIA",   label: "Media",   color: "#B3985B",  short: "P3" },
  { key: "BAJA",    label: "Baja",    color: "#555",     short: "P4" },
] as const;

const AREAS = [
  { key: "GENERAL",       label: "General"     },
  { key: "VENTAS",        label: "Comercial"    },
  { key: "ADMINISTRACION",label: "Adm."         },
  { key: "PRODUCCION",    label: "Producción"   },
  { key: "MARKETING",     label: "Marketing"    },
  { key: "RRHH",          label: "RR.HH."       },
] as const;

type Prioridad  = typeof PRIORIDADES[number]["key"];
type Area       = typeof AREAS[number]["key"];
type ActivePanel = "fecha" | "recurrente" | "limite" | "prioridad" | "proyecto" | "area" | "asignado" | null;

// ── Props ──────────────────────────────────────────────────────────────────────

export interface ProyectoOption { id: string; nombre: string; color: string | null }
export interface UsuarioOption  { id: string; name: string }

type RequiredField = "fecha" | "asignado" | "proyecto";

interface Props {
  proyectoTareaId?: string | null;
  seccionId?: string | null;
  parentId?: string | null;
  proyectos?: ProyectoOption[];
  usuarios?: UsuarioOption[];
  triggerOpen?: number;
  requiredFields?: RequiredField[];
  defaultAsignadoId?: string | null;
  onAdd: (tarea: {
    titulo: string;
    descripcion: string | null;
    fecha: string | null;
    fechaVencimiento: string | null;
    prioridad: string;
    area: string;
    recurrencia: string | null;
    proyectoTareaId: string | null;
    seccionId: string | null;
    parentId: string | null;
    asignadoAId: string | null;
  }) => void;
  placeholder?: string;
  compact?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDisplay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const t = new Date(); t.setHours(0,0,0,0);
  const m = new Date(t); m.setDate(t.getDate() + 1);
  if (iso === toISO(t)) return "Hoy";
  if (iso === toISO(m)) return "Mañana";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function QuickAdd({
  proyectoTareaId = null,
  seccionId = null,
  parentId = null,
  proyectos = [],
  usuarios = [],
  triggerOpen,
  requiredFields = [],
  defaultAsignadoId = null,
  onAdd,
  placeholder = "Agregar tarea…",
  compact = false,
}: Props) {
  const [open, setOpen]               = useState(false);
  const [titulo, setTitulo]           = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha]             = useState("");
  const [fechaVen, setFechaVen]       = useState("");
  const [prioridad, setPrioridad]     = useState<Prioridad>("MEDIA");
  const [area, setArea]               = useState<Area>("GENERAL");
  const [proyectoSel, setProyectoSel] = useState<string | null>(proyectoTareaId);
  const [asignadoSel, setAsignadoSel] = useState<string | null>(defaultAsignadoId);
  const [reqError, setReqError]       = useState<string | null>(null);
  const [recurrencia, setRecurrencia] = useState<string | null>(null);
  const [panel, setPanel]             = useState<ActivePanel>(null);
  const [detIgnorada, setDetIgnorada] = useState(false);
  // ── Paste-as-tasks: derived from textarea value (no interception needed)
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef  = useRef<HTMLTextAreaElement>(null);
  // pastedLines: lines read directly from clipboard on paste event
  const [pastedLines, setPastedLines] = useState<string[] | null>(null);

  // Strip common list prefixes: "1. ", "- ", "* ", "• ", "[ ] ", "[x] ", etc.
  function cleanLine(raw: string): string {
    return raw.trim()
      .replace(/^(\[[ x]\]\s*|\d+[.)\s]+|[-*•–—] +)/, "")
      .trim();
  }

  // Open and focus when parent triggers (e.g. sidebar "Nueva tarea" button)
  useEffect(() => {
    if (!triggerOpen) return;
    setOpen(true);
    setTimeout(() => titleRef.current?.focus(), 30);
  }, [triggerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize textarea height after every titulo change
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "0px";           // collapse first so scrollHeight is accurate
    el.style.height = el.scrollHeight + "px";
  }, [titulo]);

  // Natural language date detection — only active when no date manually set
  const deteccion = useMemo(() => {
    if (detIgnorada || !titulo || fecha || recurrencia) return null;
    const d = detectarFechaEnTitulo(titulo.split("\n")[0]); // use first line only
    return d.textoDetectado ? d : null;
  }, [titulo, fecha, recurrencia, detIgnorada]);

  // List detection — when textarea has ≥2 non-empty lines
  const listLines = useMemo(() => {
    if (!titulo.includes("\n")) return null;
    const lines = titulo.split("\n").map(cleanLine).filter(l => l.length > 0);
    return lines.length >= 2 ? lines : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo]);

  // Combined: clipboard-parsed (paste) OR textarea-typed multiline
  const detectedLines = pastedLines ?? listLines;

  const prio     = PRIORIDADES.find(p => p.key === prioridad)!;
  const areaDef  = AREAS.find(a => a.key === area)!;
  const recLabel = recurrencia
    ? (() => { try { return formatearRecurrencia(JSON.parse(recurrencia)); } catch { return ""; } })()
    : null;
  const proyectoInfo = proyectos.find(p => p.id === proyectoSel);
  const usuarioInfo  = usuarios.find(u => u.id === asignadoSel);

  function resetFields() {
    setTitulo(""); setDescripcion(""); setFecha(""); setFechaVen(""); setPrioridad("MEDIA"); setArea("GENERAL");
    setProyectoSel(proyectoTareaId); setAsignadoSel(defaultAsignadoId);
    setRecurrencia(null); setReqError(null);
    setPanel(null); setDetIgnorada(false); setPastedLines(null);
  }

  const REQ_LABELS: Record<RequiredField, string> = { fecha: "fecha", proyecto: "área", asignado: "responsable" };
  // Devuelve los campos obligatorios que aún faltan (fechaOk permite forzar null en modo lote)
  function camposFaltantes(fechaOk: boolean): RequiredField[] {
    const m: RequiredField[] = [];
    if (requiredFields.includes("fecha")    && !fechaOk)      m.push("fecha");
    if (requiredFields.includes("proyecto") && !proyectoSel)  m.push("proyecto");
    if (requiredFields.includes("asignado") && !asignadoSel)  m.push("asignado");
    return m;
  }

  function reset() {
    resetFields();
    setOpen(false);
  }

  function submit() {
    const firstLine = listLines ? listLines[0] : titulo.trim();
    if (!firstLine) { titleRef.current?.focus(); return; }
    const tituloFinal = deteccion ? deteccion.tituloLimpio || firstLine : firstLine;
    // If recurrencia is set, fecha is cleared (mutually exclusive)
    const fechaFinal  = recurrencia ? null : (fecha || (deteccion?.fecha ?? null));
    const recFinal    = recurrencia ?? (fecha ? null : (deteccion?.recurrencia ?? null));
    const missing = camposFaltantes(!!fechaFinal);
    if (missing.length) {
      setReqError("Falta indicar " + missing.map(m => REQ_LABELS[m]).join(", "));
      setPanel(missing[0]);
      return;
    }
    setReqError(null);
    onAdd({
      titulo:           tituloFinal,
      descripcion:      descripcion.trim() || null,
      fecha:            fechaFinal,
      fechaVencimiento: fechaVen || null,
      prioridad,
      area,
      recurrencia:      recFinal,
      proyectoTareaId:  proyectoSel,
      seccionId,
      parentId,
      asignadoAId:      asignadoSel,
    });
    resetFields();
    setTimeout(() => titleRef.current?.focus(), 10);
  }

  function submitAll() {
    if (!detectedLines) return;
    // En modo lote no hay fecha por línea: si la fecha es obligatoria, forzar alta individual
    const missing = camposFaltantes(!requiredFields.includes("fecha"));
    if (missing.length) {
      setReqError(
        requiredFields.includes("fecha")
          ? "Agrega las tareas una por una para asignarles fecha, responsable y área"
          : "Falta indicar " + missing.map(m => REQ_LABELS[m]).join(", "),
      );
      if (missing[0] !== "fecha") setPanel(missing[0]);
      return;
    }
    setReqError(null);
    detectedLines.forEach(line => {
      onAdd({
        titulo: line,
        descripcion: null,
        fecha: null,
        fechaVencimiento: null,
        prioridad,
        area,
        recurrencia: null,
        proyectoTareaId: proyectoSel,
        seccionId,
        parentId,
        asignadoAId: asignadoSel,
      });
    });
    resetFields();
    setOpen(false);
  }

  function togglePanel(p: ActivePanel) { setPanel(prev => prev === p ? null : p); }

  // ── Closed state ─────────────────────────────────────────────────────────────
  if (!open) return (
    <button type="button"
      onClick={() => { setOpen(true); setTimeout(() => titleRef.current?.focus(), 30); }}
      className={`group w-full flex items-center gap-2.5 px-3 rounded-lg text-[#333] hover:text-[#666] transition-all ${compact ? "py-1.5" : "py-2"}`}
    >
      <span className="flex items-center justify-center w-4 h-4 rounded-full border border-[#222] group-hover:border-[#B3985B]/40 group-hover:text-[#B3985B]/60 transition-colors">
        <IconPlus />
      </span>
      <span className="text-sm">{placeholder}</span>
    </button>
  );

  // ── Open state ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-1 my-2 rounded-xl border border-[#1e1e1e] bg-[#080808] shadow-2xl shadow-black/70 overflow-hidden ring-1 ring-[#B3985B]/8">

      {/* ── Title textarea (auto-resize, Enter submits, Shift+Enter = newline) ── */}
      <div className="px-4 pt-3.5 pb-1">
        <div className="relative">
          {/* Inline highlight overlay (mirror) — subraya el token detectado estilo Todoist */}
          {deteccion?.textoDetectado && (() => {
            const tok = deteccion.textoDetectado!;
            const idx = titulo.toLowerCase().indexOf(tok.toLowerCase());
            if (idx < 0) return null;
            return (
              <div aria-hidden
                className="absolute inset-0 pointer-events-none text-[16px] leading-snug whitespace-pre-wrap break-words text-transparent select-none">
                {titulo.slice(0, idx)}
                <span className="rounded-[3px] bg-[#B3985B]/15 box-decoration-clone underline decoration-[#B3985B] decoration-2 underline-offset-2">
                  {titulo.slice(idx, idx + tok.length)}
                </span>
                {titulo.slice(idx + tok.length)}
              </div>
            );
          })()}
          <textarea
            ref={titleRef}
            autoFocus
            value={titulo}
            rows={1}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
              if (e.key === "Escape") reset();
              if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                descRef.current?.focus();
              }
            }}
            onPaste={e => {
              // Read raw clipboard text to detect lines (works even if textarea collapses newlines)
              const text = e.clipboardData.getData("text");
              const lines = text
                .split(/\r?\n|\r|\u2028|\u2029/)
                .map(cleanLine)
                .filter(l => l.length > 0);
              if (lines.length >= 2) {
                // Don't prevent default — let text paste normally into textarea
                // Just store the parsed lines for the banner
                setPastedLines(lines);
              } else {
                setPastedLines(null);
              }
            }}
            placeholder={placeholder}
            className="relative w-full bg-transparent text-[16px] text-white placeholder-[#252525] focus:outline-none leading-snug resize-none"
          />
        </div>
      </div>

      {/* ── Description input ────────────────────────────────────────────── */}
      <div className="px-4 pb-2.5">
        <textarea
          ref={descRef}
          value={descripcion}
          onChange={e => { setDescripcion(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
          onKeyDown={e => { if (e.key === "Escape") reset(); }}
          placeholder="Descripción (opcional)"
          rows={1}
          className="w-full bg-transparent text-[13px] text-[#666] placeholder-[#252525] focus:outline-none leading-snug resize-none overflow-hidden"
        />
      </div>

      {/* ── Detection chip ───────────────────────────────────────────────── */}
      {deteccion && (
        <div className="flex items-center gap-1.5 px-4 pb-2">
          <span className="flex items-center gap-1.5 text-[12px] bg-[#B3985B]/10 text-[#B3985B] border border-[#B3985B]/20 rounded-md px-2 py-0.5">
            {deteccion.recurrencia ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            )}
            {deteccion.recurrencia
              ? (() => { try { return formatearRecurrencia(JSON.parse(deteccion.recurrencia!)); } catch { return ""; } })()
              : deteccion.fecha ? formatDisplay(deteccion.fecha) : ""}
            <button type="button" onClick={() => setDetIgnorada(true)}
              className="ml-0.5 text-[#B3985B]/50 hover:text-red-400 transition-colors leading-none">
              ×
            </button>
          </span>
        </div>
      )}

      {/* ── List detected banner ─────────────────────────────────────────────── */}
      {detectedLines && (
        <div className="mx-4 mb-2 rounded-lg border border-[#B3985B]/20 bg-[#B3985B]/5 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#B3985B]/15 text-[#B3985B] shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <circle cx="3" cy="6" r="1" fill="currentColor"/>
                  <circle cx="3" cy="12" r="1" fill="currentColor"/>
                  <circle cx="3" cy="18" r="1" fill="currentColor"/>
                </svg>
              </span>
              <p className="text-[12px] text-[#B3985B] font-medium">
                Se detectaron {detectedLines.length} tareas
              </p>
            </div>
          </div>
          {/* Preview (scrollable) */}
          <div className="border-t border-[#B3985B]/10 max-h-32 overflow-y-auto">
            {detectedLines.map((line, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-1 border-b border-[#B3985B]/[0.07] last:border-0">
                <span className="w-[10px] h-[10px] shrink-0 rounded-full border border-[#B3985B]/30" />
                <span className="text-[12px] text-[#999] leading-snug truncate">{line}</span>
              </div>
            ))}
          </div>
          {/* Actions */}
          <div className="flex gap-1.5 px-3 py-2 border-t border-[#B3985B]/10">
            <button type="button"
              onClick={submitAll}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808] text-[12px] font-semibold transition-all"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Agregar {detectedLines.length} tareas
            </button>
            <button type="button"
              onClick={submit}
              className="flex-1 py-1.5 rounded-md border border-[#B3985B]/20 text-[#B3985B]/70 hover:text-[#B3985B] hover:border-[#B3985B]/40 text-[12px] transition-all"
            >
              Agregar como 1 sola
            </button>
          </div>
        </div>
      )}




      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="h-px bg-[#111]" />

      {/* ── Bottom toolbar (two rows) ───────────────────────────────────────── */}
      <div>
        {/* Row 1: chips */}
        <div className="flex items-center gap-0.5 px-3 pt-1.5 pb-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <ToolbarBtn icon={<IconCalendar />}
            label={fecha ? formatDisplay(fecha) : "Fecha"} active={!!fecha} activeColor="#B3985B"
            required={requiredFields.includes("fecha") && !fecha && !recurrencia}
            isOpen={panel === "fecha"} onClick={() => { if (recurrencia) { setRecurrencia(null); } togglePanel("fecha"); }} />

          <ToolbarBtn icon={<IconRepeat />}
            label={recLabel ?? "Recurrente"} active={!!recurrencia} activeColor="#B3985B"
            isOpen={panel === "recurrente"} onClick={() => { if (fecha) setFecha(""); togglePanel("recurrente"); }} />

          <ToolbarBtn icon={<IconClock />}
            label={fechaVen ? formatDisplay(fechaVen) : "Límite"} active={!!fechaVen} activeColor="#e85d04"
            isOpen={panel === "limite"} onClick={() => togglePanel("limite")} />

          <ToolbarBtn icon={<IconFlag color={prioridad !== "MEDIA" ? prio.color : undefined} />}
            label={prioridad !== "MEDIA" ? prio.label : "Prioridad"} active={prioridad !== "MEDIA"} activeColor={prio.color}
            isOpen={panel === "prioridad"} onClick={() => togglePanel("prioridad")} />

          {!compact && (
            <>
              <ToolbarBtn icon={<IconFolder />}
                label={proyectoInfo?.nombre ?? "Área"} active={!!proyectoInfo} activeColor="#B3985B"
                required={requiredFields.includes("proyecto") && !proyectoSel}
                isOpen={panel === "proyecto"} onClick={() => togglePanel("proyecto")} />

              {usuarios.length > 0 && (
                <ToolbarBtn icon={<IconUser />}
                  label={usuarioInfo?.name.split(" ")[0] ?? "Asignar"} active={!!usuarioInfo} activeColor="#B3985B"
                  required={requiredFields.includes("asignado") && !asignadoSel}
                  isOpen={panel === "asignado"} onClick={() => togglePanel("asignado")} />
              )}
            </>
          )}
        </div>

        {/* Row 2: actions */}
        <div className="flex items-center justify-end gap-1 px-3 pb-2">
          {reqError && (
            <span className="mr-auto flex items-center gap-1 text-[11px] text-red-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {reqError}
            </span>
          )}
          <button type="button" onClick={reset}
            className="text-xs text-[#333] hover:text-[#777] px-2 py-1 rounded-lg hover:bg-[#0f0f0f] transition-all">
            Cancelar
          </button>
          <button type="button" onClick={submit} disabled={!titulo.trim()}
            className="text-xs font-semibold px-3 py-1 rounded-lg transition-all disabled:opacity-25 disabled:cursor-not-allowed bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808]"
            style={{ boxShadow: titulo.trim() ? "0 0 14px #B3985B30" : "none" }}>
            Agregar
          </button>
        </div>
      </div>

      {/* ── Panels (below toolbar) ───────────────────────────────────────── */}
      {panel && (
        <div className="border-t border-[#111]">

          {/* Fecha fija — calendar opens directly */}
          {panel === "fecha" && (
            <div className="p-2.5">
              <DatePicker value={fecha} onChange={val => { setFecha(val); if (val) setPanel(null); }} placeholder="dd/mm/aaaa" size="sm" autoOpen />
            </div>
          )}

          {/* Recurrente */}
          {panel === "recurrente" && (
            <div className="p-2.5">
              <RecurrenciaPicker
                value={recurrencia}
                onChange={(json) => { setRecurrencia(json); if (!json) setPanel(null); }}
                onClose={() => setPanel(null)}
              />
            </div>
          )}

          {/* Fecha límite */}
          {panel === "limite" && (
            <div className="p-2.5">
              <DatePicker value={fechaVen} onChange={val => { setFechaVen(val); if (val) setPanel(null); }} placeholder="dd/mm/aaaa" size="sm" />
            </div>
          )}

          {/* Prioridad — fila compacta */}
          {panel === "prioridad" && (
            <div className="flex gap-1 px-2.5 py-2">
              {PRIORIDADES.map(p => (
                <button type="button" key={p.key} onClick={() => { setPrioridad(p.key); setPanel(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-[12px] font-medium transition-all"
                  style={{
                    borderColor: prioridad === p.key ? p.color + "60" : "#1a1a1a",
                    backgroundColor: prioridad === p.key ? p.color + "12" : "transparent",
                    color: prioridad === p.key ? p.color : "#444",
                  }}>
                  <IconFlag color={p.color} />
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Proyecto */}
          {panel === "proyecto" && (
            <div className="max-h-40 overflow-y-auto py-1">
              <button type="button" onClick={() => { setProyectoSel(null); setPanel(null); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${!proyectoSel ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#333] shrink-0" />
                Bandeja de entrada
              </button>
              {proyectos.map(p => (
                <button type="button" key={p.id} onClick={() => { setProyectoSel(p.id); setPanel(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${proyectoSel === p.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"}`}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color ?? "#555" }} />
                  {p.nombre}
                </button>
              ))}
            </div>
          )}

          {/* Asignado */}
          {panel === "asignado" && usuarios.length > 0 && (
            <div className="max-h-36 overflow-y-auto py-1">
              <button type="button" onClick={() => { setAsignadoSel(null); setPanel(null); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${!asignadoSel ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"}`}>
                <span className="w-4 h-4 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[10px] text-[#444]">—</span>
                Sin asignar
              </button>
              {usuarios.map(u => (
                <button type="button" key={u.id} onClick={() => { setAsignadoSel(u.id); setPanel(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${asignadoSel === u.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"}`}>
                  <span className="w-4 h-4 rounded-full bg-[#1a1a1a] border border-[#222] flex items-center justify-center text-[10px] text-[#B3985B] font-medium shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  {u.name}
                </button>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── ToolbarBtn ────────────────────────────────────────────────────────────────

function ToolbarBtn({ icon, label, active, activeColor, isOpen, onClick, required = false }: {
  icon: React.ReactNode; label: string; active: boolean;
  activeColor: string; isOpen: boolean; onClick: () => void; required?: boolean;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${isOpen ? "bg-[#151515] text-white" : "hover:bg-[#0f0f0f]"} ${required ? "ring-1 ring-red-500/30" : ""}`}
      style={{ color: isOpen ? "white" : active ? activeColor : required ? "#f87171" : "#333" }}>
      <span style={{ color: isOpen ? "#888" : active ? activeColor : required ? "#f87171" : "#2e2e2e" }}>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
      {required && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />}
    </button>
  );
}
