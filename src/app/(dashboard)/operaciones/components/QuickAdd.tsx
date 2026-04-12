"use client";
import { useState, useRef } from "react";
import { parsearRecurrencia, formatearRecurrencia } from "@/lib/recurrencia";
import DatePicker from "@/components/ui/DatePicker";

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
  </svg>
);
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconFlag = ({ color = "currentColor" }: { color?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24"
    fill={color !== "currentColor" ? color + "28" : "none"}
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);
const IconRepeat = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// ── Prioridad ─────────────────────────────────────────────────────────────────

const PRIORIDADES = [
  { key: "URGENTE", label: "Urgente", color: "#f87171",  short: "P1" },
  { key: "ALTA",    label: "Alta",    color: "#fb923c",  short: "P2" },
  { key: "MEDIA",   label: "Media",   color: "#B3985B",  short: "P3" },
  { key: "BAJA",    label: "Baja",    color: "#555",     short: "P4" },
] as const;

type Prioridad = typeof PRIORIDADES[number]["key"];

// ── Recurrence presets ────────────────────────────────────────────────────────

const REC_PRESETS = [
  { label: "Cada día",    pat: "cada día" },
  { label: "Cada semana", pat: "cada semana" },
  { label: "Cada mes",    pat: "cada mes" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  proyectoTareaId?: string | null;
  seccionId?: string | null;
  parentId?: string | null;
  onAdd: (tarea: {
    titulo: string;
    fecha: string | null;
    fechaVencimiento: string | null;
    prioridad: string;
    recurrencia: string | null;
    proyectoTareaId: string | null;
    seccionId: string | null;
    parentId: string | null;
  }) => void;
  placeholder?: string;
  compact?: boolean;
}

type ActivePanel = "fecha" | "limite" | "prioridad" | null;
type FechaTab    = "especifica" | "recurrente";

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuickAdd({
  proyectoTareaId = null,
  seccionId = null,
  parentId = null,
  onAdd,
  placeholder = "Agregar tarea…",
  compact = false,
}: Props) {
  const [open, setOpen]             = useState(false);
  const [titulo, setTitulo]         = useState("");
  const [fecha, setFecha]           = useState("");
  const [fechaVen, setFechaVen]     = useState("");
  const [prioridad, setPrioridad]   = useState<Prioridad>("MEDIA");
  const [recTexto, setRecTexto]     = useState("");
  const [recurrencia, setRecurrencia] = useState<string | null>(null);
  const [recError, setRecError]     = useState("");
  const [panel, setPanel]           = useState<ActivePanel>(null);
  const [fechaTab, setFechaTab]     = useState<FechaTab>("especifica");
  const titleRef = useRef<HTMLInputElement>(null);

  const prio     = PRIORIDADES.find(p => p.key === prioridad)!;
  const recLabel = recurrencia
    ? (() => { try { return formatearRecurrencia(JSON.parse(recurrencia)); } catch { return ""; } })()
    : null;

  // Has date-type value for the "fecha" button
  const hasFecha  = fechaTab === "especifica" ? !!fecha : !!recLabel;
  const fechaLabel = fechaTab === "especifica" && fecha
    ? formatDisplay(fecha)
    : recLabel ?? "Fecha";

  function formatDisplay(iso: string) {
    const d = new Date(iso + "T00:00:00");
    const t = new Date(); t.setHours(0,0,0,0);
    const m = new Date(t); m.setDate(t.getDate() + 1);
    if (iso === toISO(t))  return "Hoy";
    if (iso === toISO(m))  return "Mañana";
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  }
  function toISO(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function reset() {
    setTitulo(""); setFecha(""); setFechaVen(""); setPrioridad("MEDIA");
    setRecTexto(""); setRecurrencia(null); setRecError("");
    setPanel(null); setFechaTab("especifica"); setOpen(false);
  }

  function submit() {
    if (!titulo.trim()) { titleRef.current?.focus(); return; }
    onAdd({
      titulo: titulo.trim(),
      fecha:           fechaTab === "especifica" ? (fecha || null) : null,
      fechaVencimiento:fechaVen || null,
      prioridad,
      recurrencia:     fechaTab === "recurrente" ? recurrencia : null,
      proyectoTareaId, seccionId, parentId,
    });
    reset();
  }

  function togglePanel(p: ActivePanel) {
    setPanel(prev => prev === p ? null : p);
  }

  function applyRec(txt: string) {
    if (!txt.trim()) { setRecurrencia(null); return; }
    const cfg = parsearRecurrencia(txt.trim());
    if (!cfg) { setRecError("No reconocido. Ej: 'cada lunes', 'cada martes y jueves'"); return; }
    setRecurrencia(JSON.stringify(cfg));
    setRecError("");
    setPanel(null);
  }

  // ── Closed state ────────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => titleRef.current?.focus(), 30); }}
        className={`group w-full flex items-center gap-2.5 px-3 rounded-lg text-[#333] hover:text-[#666] transition-all ${compact ? "py-1.5" : "py-2"}`}
      >
        <span className="flex items-center justify-center w-4 h-4 rounded-full border border-[#222] group-hover:border-[#B3985B]/40 group-hover:text-[#B3985B]/60 transition-colors">
          <IconPlus />
        </span>
        <span className="text-sm">{placeholder}</span>
      </button>
    );
  }

  // ── Open state ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-1 my-2 rounded-xl border border-[#1e1e1e] bg-[#080808] shadow-2xl shadow-black/70 overflow-hidden ring-1 ring-[#B3985B]/8">

      {/* ── Panel: Fecha (específica + recurrente con tabs) ─────────────── */}
      {panel === "fecha" && (
        <div className="border-b border-[#141414]">
          {/* Tabs */}
          <div className="flex border-b border-[#141414]">
            {(["especifica","recurrente"] as FechaTab[]).map(tab => (
              <button key={tab} onClick={() => setFechaTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  fechaTab === tab
                    ? "text-[#B3985B] border-b-2 border-[#B3985B] bg-[#B3985B]/5"
                    : "text-[#444] hover:text-[#888]"
                }`}>
                {tab === "especifica" ? "Fecha específica" : "Fecha recurrente"}
              </button>
            ))}
          </div>

          {fechaTab === "especifica" ? (
            <div className="p-3">
              <DatePicker
                value={fecha}
                onChange={val => { setFecha(val); if (val) setPanel(null); }}
                placeholder="dd/mm/aaaa"
                size="sm"
              />
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {/* Presets */}
              <div className="flex flex-wrap gap-1.5">
                {REC_PRESETS.map(p => {
                  const cfg  = parsearRecurrencia(p.pat);
                  const json = cfg ? JSON.stringify(cfg) : null;
                  return (
                    <button key={p.label} onClick={() => { if (json) { setRecurrencia(json); setRecTexto(""); setPanel(null); } }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        recurrencia === json
                          ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
                          : "border-[#1e1e1e] text-[#555] hover:border-[#252525] hover:text-[#999]"
                      }`}>
                      {p.label}
                    </button>
                  );
                })}
                {recurrencia && (
                  <button onClick={() => { setRecurrencia(null); setRecTexto(""); }}
                    className="px-2.5 py-1 rounded-lg text-xs border border-[#1e1e1e] text-[#444] hover:text-red-400 hover:border-red-900/40 transition-all">
                    Quitar
                  </button>
                )}
              </div>
              {/* Text input */}
              <div className="flex gap-2">
                <input value={recTexto} onChange={e => { setRecTexto(e.target.value); setRecError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") applyRec(recTexto); if (e.key === "Escape") setPanel(null); }}
                  placeholder="cada lunes · cada martes y jueves · cada tercer viernes…"
                  className="flex-1 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#2a2a2a] focus:outline-none focus:border-[#B3985B]/40 transition-colors" />
                <button onClick={() => applyRec(recTexto)}
                  className="px-3 py-1.5 bg-[#161616] hover:bg-[#1e1e1e] text-[#888] hover:text-white text-xs rounded-lg transition-all">
                  OK
                </button>
              </div>
              {recError && <p className="text-[11px] text-red-400">{recError}</p>}
              {/* Preview */}
              {recurrencia && !recError && (
                <p className="text-[11px] text-[#B3985B] flex items-center gap-1">
                  <IconRepeat />
                  {recLabel}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Panel: Fecha límite ──────────────────────────────────────────── */}
      {panel === "limite" && (
        <div className="p-3 border-b border-[#141414]">
          <p className="text-[10px] text-[#444] uppercase tracking-widest mb-2 font-medium">Fecha límite</p>
          <DatePicker
            value={fechaVen}
            onChange={val => { setFechaVen(val); if (val) setPanel(null); }}
            placeholder="dd/mm/aaaa"
            size="sm"
          />
        </div>
      )}

      {/* ── Panel: Prioridad ─────────────────────────────────────────────── */}
      {panel === "prioridad" && (
        <div className="p-3 border-b border-[#141414]">
          <p className="text-[10px] text-[#444] uppercase tracking-widest mb-2.5 font-medium">Prioridad</p>
          <div className="flex gap-2">
            {PRIORIDADES.map(p => (
              <button key={p.key} onClick={() => { setPrioridad(p.key); setPanel(null); }}
                className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all"
                style={{
                  borderColor: prioridad === p.key ? p.color + "80" : "#1a1a1a",
                  backgroundColor: prioridad === p.key ? p.color + "10" : "transparent",
                }}>
                <IconFlag color={p.color} />
                <span className="text-[10px] font-bold" style={{ color: prioridad === p.key ? p.color : "#444" }}>{p.short}</span>
                <span className="text-[9px]" style={{ color: prioridad === p.key ? p.color + "aa" : "#2e2e2e" }}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Title input ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-3.5 pb-2">
        <input
          ref={titleRef}
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) submit();
            if (e.key === "Escape") reset();
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-[15px] text-white placeholder-[#252525] focus:outline-none leading-snug"
        />
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="h-px bg-[#111]" />

      {/* ── Bottom toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-3 py-2">

        {/* Fecha (específica o recurrente) */}
        <ToolbarBtn
          icon={fechaTab === "recurrente" && recurrencia ? <IconRepeat /> : <IconCalendar />}
          label={fechaLabel}
          active={hasFecha}
          activeColor="#B3985B"
          isOpen={panel === "fecha"}
          onClick={() => togglePanel("fecha")}
        />

        {/* Límite */}
        <ToolbarBtn
          icon={<IconClock />}
          label={fechaVen ? formatDisplay(fechaVen) : "Límite"}
          active={!!fechaVen}
          activeColor="#e85d04"
          isOpen={panel === "limite"}
          onClick={() => togglePanel("limite")}
        />

        {/* Prioridad */}
        <ToolbarBtn
          icon={<IconFlag color={prioridad !== "MEDIA" ? prio.color : undefined} />}
          label={prioridad !== "MEDIA" ? prio.short : "P3"}
          active={prioridad !== "MEDIA"}
          activeColor={prio.color}
          isOpen={panel === "prioridad"}
          onClick={() => togglePanel("prioridad")}
        />

        <div className="flex-1" />

        <button onClick={reset}
          className="text-xs text-[#333] hover:text-[#777] px-2.5 py-1.5 rounded-lg hover:bg-[#0f0f0f] transition-all font-medium">
          Cancelar
        </button>

        <button onClick={submit} disabled={!titulo.trim()}
          className="text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all ml-1 disabled:opacity-25 disabled:cursor-not-allowed bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808]"
          style={{ boxShadow: titulo.trim() ? "0 0 14px #B3985B30" : "none" }}>
          Agregar
        </button>
      </div>
    </div>
  );
}

// ── ToolbarBtn ────────────────────────────────────────────────────────────────

function ToolbarBtn({
  icon, label, active, activeColor, isOpen, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  activeColor: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
        isOpen ? "bg-[#151515] text-white" : "hover:bg-[#0f0f0f]"
      }`}
      style={{ color: isOpen ? "white" : active ? activeColor : "#333" }}>
      <span style={{ color: isOpen ? "#888" : active ? activeColor : "#2e2e2e" }}>
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
