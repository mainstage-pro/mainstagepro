"use client";
import { useState, useRef, useCallback } from "react";
import { parsearRecurrencia, formatearRecurrencia } from "@/lib/recurrencia";

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconFlag = ({ color = "currentColor" }: { color?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={color !== "currentColor" ? color + "33" : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
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

// ── Priority config ────────────────────────────────────────────────────────────

const PRIORIDADES = [
  { key: "URGENTE", label: "Urgente", color: "#f87171", short: "P1" },
  { key: "ALTA",    label: "Alta",    color: "#fb923c", short: "P2" },
  { key: "MEDIA",   label: "Media",   color: "#B3985B", short: "P3" },
  { key: "BAJA",    label: "Baja",    color: "#555",    short: "P4" },
] as const;

type Prioridad = typeof PRIORIDADES[number]["key"];

// ── Date helpers ──────────────────────────────────────────────────────────────

function today()    { return new Date().toISOString().substring(0, 10); }
function tomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().substring(0, 10); }
function nextWeek() { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().substring(0, 10); }

function labelFecha(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const t = today();
  const tom = tomorrow();
  if (iso === t)   return "Hoy";
  if (iso === tom) return "Mañana";
  return d.toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

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

type ActivePanel = "fecha" | "limite" | "prioridad" | "recurrencia" | null;

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
  const titleRef = useRef<HTMLInputElement>(null);

  const prio = PRIORIDADES.find(p => p.key === prioridad)!;

  function reset() {
    setTitulo(""); setFecha(""); setFechaVen(""); setPrioridad("MEDIA");
    setRecTexto(""); setRecurrencia(null); setRecError(""); setPanel(null); setOpen(false);
  }

  function submit() {
    if (!titulo.trim()) { titleRef.current?.focus(); return; }
    onAdd({
      titulo: titulo.trim(), fecha: fecha || null,
      fechaVencimiento: fechaVen || null, prioridad, recurrencia,
      proyectoTareaId, seccionId, parentId,
    });
    reset();
  }

  function togglePanel(p: ActivePanel) {
    setPanel(prev => prev === p ? null : p);
  }

  function applyRec() {
    if (!recTexto.trim()) { setRecurrencia(null); setPanel(null); return; }
    const cfg = parsearRecurrencia(recTexto.trim());
    if (!cfg) { setRecError("Patrón no reconocido. Ej: 'cada lunes', 'cada martes y jueves'"); return; }
    setRecurrencia(JSON.stringify(cfg));
    setRecError("");
    setPanel(null);
  }

  const recLabel = recurrencia
    ? (() => { try { return formatearRecurrencia(JSON.parse(recurrencia)); } catch { return "Repetir"; } })()
    : null;

  // ── Closed ─────────────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => titleRef.current?.focus(), 30); }}
        className={`group w-full flex items-center gap-2.5 px-3 rounded-lg text-[#3a3a3a] hover:text-[#666] transition-all ${
          compact ? "py-1.5" : "py-2"
        }`}
      >
        <span className="flex items-center justify-center w-4 h-4 rounded-full border border-[#2a2a2a] group-hover:border-[#B3985B]/50 group-hover:text-[#B3985B]/70 transition-colors">
          <IconPlus />
        </span>
        <span className="text-sm">{placeholder}</span>
      </button>
    );
  }

  // ── Open ───────────────────────────────────────────────────────────────────
  return (
    <div className="mx-1 my-2 rounded-xl border border-[#1e1e1e] bg-[#0a0a0a] shadow-2xl shadow-black/60 overflow-hidden ring-1 ring-[#B3985B]/10">

      {/* ── Active panel ─────────────────────────────────────────────────── */}
      {panel === "fecha" && (
        <div className="px-4 py-3 border-b border-[#141414]">
          <p className="text-[10px] text-[#444] uppercase tracking-widest mb-2 font-medium">Fecha de inicio</p>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {[
              { label: "Hoy",       val: today() },
              { label: "Mañana",    val: tomorrow() },
              { label: "Esta semana", val: nextWeek() },
            ].map(opt => (
              <button key={opt.label} onClick={() => { setFecha(opt.val); setPanel(null); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  fecha === opt.val
                    ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
                    : "border-[#1e1e1e] text-[#555] hover:border-[#2a2a2a] hover:text-[#999]"
                }`}>
                {opt.label}
              </button>
            ))}
            {fecha && (
              <button onClick={() => { setFecha(""); setPanel(null); }}
                className="px-2.5 py-1 rounded-lg text-xs border border-[#1e1e1e] text-[#444] hover:text-red-400 hover:border-red-900/50 transition-all">
                Quitar
              </button>
            )}
          </div>
          <input
            type="date" value={fecha}
            onChange={e => setFecha(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") setPanel(null); if (e.key === "Escape") setPanel(null); }}
            className="w-full bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#B3985B]/50 transition-colors"
          />
        </div>
      )}

      {panel === "limite" && (
        <div className="px-4 py-3 border-b border-[#141414]">
          <p className="text-[10px] text-[#444] uppercase tracking-widest mb-2 font-medium">Fecha límite</p>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {[
              { label: "Hoy",    val: today() },
              { label: "Mañana", val: tomorrow() },
              { label: "1 semana", val: nextWeek() },
            ].map(opt => (
              <button key={opt.label} onClick={() => { setFechaVen(opt.val); setPanel(null); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  fechaVen === opt.val
                    ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
                    : "border-[#1e1e1e] text-[#555] hover:border-[#2a2a2a] hover:text-[#999]"
                }`}>
                {opt.label}
              </button>
            ))}
            {fechaVen && (
              <button onClick={() => { setFechaVen(""); setPanel(null); }}
                className="px-2.5 py-1 rounded-lg text-xs border border-[#1e1e1e] text-[#444] hover:text-red-400 hover:border-red-900/50 transition-all">
                Quitar
              </button>
            )}
          </div>
          <input
            type="date" value={fechaVen}
            onChange={e => setFechaVen(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") setPanel(null); if (e.key === "Escape") setPanel(null); }}
            className="w-full bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#B3985B]/50 transition-colors"
          />
        </div>
      )}

      {panel === "prioridad" && (
        <div className="px-4 py-3 border-b border-[#141414]">
          <p className="text-[10px] text-[#444] uppercase tracking-widest mb-2 font-medium">Prioridad</p>
          <div className="flex gap-2">
            {PRIORIDADES.map(p => (
              <button key={p.key} onClick={() => { setPrioridad(p.key); setPanel(null); }}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl border transition-all ${
                  prioridad === p.key
                    ? "border-opacity-60 bg-opacity-10"
                    : "border-[#1a1a1a] hover:border-[#282828]"
                }`}
                style={{
                  borderColor: prioridad === p.key ? p.color : undefined,
                  backgroundColor: prioridad === p.key ? p.color + "12" : undefined,
                }}>
                <IconFlag color={p.color} />
                <span className="text-[10px] font-medium" style={{ color: prioridad === p.key ? p.color : "#555" }}>{p.short}</span>
                <span className="text-[9px]" style={{ color: prioridad === p.key ? p.color + "cc" : "#3a3a3a" }}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === "recurrencia" && (
        <div className="px-4 py-3 border-b border-[#141414]">
          <p className="text-[10px] text-[#444] uppercase tracking-widest mb-2 font-medium">Recurrencia</p>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {[
              { label: "Cada día",    val: "cada día" },
              { label: "Cada semana", val: "cada semana" },
              { label: "Cada mes",    val: "cada mes" },
            ].map(opt => {
              const cfg = parsearRecurrencia(opt.val);
              const json = cfg ? JSON.stringify(cfg) : null;
              return (
                <button key={opt.label} onClick={() => { if (json) { setRecurrencia(json); setRecTexto(""); setPanel(null); } }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    recurrencia === json
                      ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
                      : "border-[#1e1e1e] text-[#555] hover:border-[#2a2a2a] hover:text-[#999]"
                  }`}>
                  {opt.label}
                </button>
              );
            })}
            {recurrencia && (
              <button onClick={() => { setRecurrencia(null); setRecTexto(""); setPanel(null); }}
                className="px-2.5 py-1 rounded-lg text-xs border border-[#1e1e1e] text-[#444] hover:text-red-400 hover:border-red-900/50 transition-all">
                Quitar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input value={recTexto} onChange={e => { setRecTexto(e.target.value); setRecError(""); }}
              onKeyDown={e => { if (e.key === "Enter") applyRec(); if (e.key === "Escape") setPanel(null); }}
              placeholder='cada lunes · cada martes y jueves · cada tercer viernes…'
              className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#B3985B]/50 transition-colors" />
            <button onClick={applyRec}
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] text-[#888] hover:text-white text-xs rounded-lg transition-all">
              OK
            </button>
          </div>
          {recError && <p className="text-[11px] text-red-400 mt-1.5">{recError}</p>}
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
          className="w-full bg-transparent text-[15px] text-white placeholder-[#2e2e2e] focus:outline-none leading-snug"
        />
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="h-px bg-[#141414] mx-0" />

      {/* ── Bottom toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-3 py-2">

        {/* Fecha */}
        <ToolbarBtn
          icon={<IconCalendar />}
          label={fecha ? labelFecha(fecha) : "Fecha"}
          active={!!fecha}
          activeColor="#B3985B"
          isOpen={panel === "fecha"}
          onClick={() => togglePanel("fecha")}
        />

        {/* Límite */}
        <ToolbarBtn
          icon={<IconClock />}
          label={fechaVen ? labelFecha(fechaVen) : "Límite"}
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

        {/* Recurrencia */}
        <ToolbarBtn
          icon={<IconRepeat />}
          label={recLabel ?? "Repetir"}
          active={!!recurrencia}
          activeColor="#B3985B"
          isOpen={panel === "recurrencia"}
          onClick={() => togglePanel("recurrencia")}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cancel */}
        <button onClick={reset}
          className="text-xs text-[#3a3a3a] hover:text-[#888] px-2.5 py-1.5 rounded-lg hover:bg-[#111] transition-all font-medium">
          Cancelar
        </button>

        {/* Submit */}
        <button onClick={submit} disabled={!titulo.trim()}
          className="text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all ml-1 disabled:opacity-30 disabled:cursor-not-allowed bg-[#B3985B] hover:bg-[#c9aa6a] text-[#0a0a0a]"
          style={{ boxShadow: titulo.trim() ? "0 0 12px #B3985B33" : "none" }}>
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
        isOpen
          ? "bg-[#1a1a1a] text-white"
          : active
          ? "hover:bg-[#151515]"
          : "text-[#3a3a3a] hover:text-[#777] hover:bg-[#111]"
      }`}
      style={active && !isOpen ? { color: activeColor } : undefined}>
      <span style={active ? { color: isOpen ? "white" : activeColor } : { color: isOpen ? "#888" : "#3a3a3a" }}>
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
