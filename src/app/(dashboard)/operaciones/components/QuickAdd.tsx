"use client";
import { useState, useRef, useMemo } from "react";
import { parsearRecurrencia, formatearRecurrencia, detectarFechaEnTitulo } from "@/lib/recurrencia";
import DatePicker from "@/components/ui/DatePicker";

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
const IconTag = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
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
  { key: "VENTAS",        label: "Ventas"       },
  { key: "ADMINISTRACION",label: "Adm."         },
  { key: "PRODUCCION",    label: "Producción"   },
  { key: "MARKETING",     label: "Marketing"    },
  { key: "RRHH",          label: "RR.HH."       },
] as const;

const REC_PRESETS = [
  { label: "Cada día",    pat: "cada día" },
  { label: "Cada semana", pat: "cada semana" },
  { label: "Cada mes",    pat: "cada mes" },
];

type Prioridad  = typeof PRIORIDADES[number]["key"];
type Area       = typeof AREAS[number]["key"];
type ActivePanel = "fecha" | "limite" | "prioridad" | "proyecto" | "area" | "asignado" | null;
type FechaTab   = "especifica" | "recurrente";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface ProyectoOption { id: string; nombre: string; color: string | null }
export interface UsuarioOption  { id: string; name: string }

interface Props {
  proyectoTareaId?: string | null;
  seccionId?: string | null;
  parentId?: string | null;
  proyectos?: ProyectoOption[];
  usuarios?: UsuarioOption[];
  onAdd: (tarea: {
    titulo: string;
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
  onAdd,
  placeholder = "Agregar tarea…",
  compact = false,
}: Props) {
  const [open, setOpen]               = useState(false);
  const [titulo, setTitulo]           = useState("");
  const [fecha, setFecha]             = useState("");
  const [fechaVen, setFechaVen]       = useState("");
  const [prioridad, setPrioridad]     = useState<Prioridad>("MEDIA");
  const [area, setArea]               = useState<Area>("GENERAL");
  const [proyectoSel, setProyectoSel] = useState<string | null>(proyectoTareaId);
  const [asignadoSel, setAsignadoSel] = useState<string | null>(null);
  const [recTexto, setRecTexto]       = useState("");
  const [recurrencia, setRecurrencia] = useState<string | null>(null);
  const [recError, setRecError]       = useState("");
  const [panel, setPanel]             = useState<ActivePanel>(null);
  const [fechaTab, setFechaTab]       = useState<FechaTab>("especifica");
  const [detIgnorada, setDetIgnorada] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Natural language date detection — only active when no date manually set
  const deteccion = useMemo(() => {
    if (detIgnorada || !titulo || fecha || recurrencia) return null;
    const d = detectarFechaEnTitulo(titulo);
    return d.textoDetectado ? d : null;
  }, [titulo, fecha, recurrencia, detIgnorada]);

  const prio     = PRIORIDADES.find(p => p.key === prioridad)!;
  const areaDef  = AREAS.find(a => a.key === area)!;
  const recLabel = recurrencia
    ? (() => { try { return formatearRecurrencia(JSON.parse(recurrencia)); } catch { return ""; } })()
    : null;
  const hasFecha     = fechaTab === "especifica" ? !!fecha : !!recLabel;
  const fechaLabel   = fechaTab === "especifica" && fecha ? formatDisplay(fecha) : recLabel ?? "Fecha";
  const proyectoInfo = proyectos.find(p => p.id === proyectoSel);
  const usuarioInfo  = usuarios.find(u => u.id === asignadoSel);

  function reset() {
    setTitulo(""); setFecha(""); setFechaVen(""); setPrioridad("MEDIA"); setArea("GENERAL");
    setProyectoSel(proyectoTareaId); setAsignadoSel(null);
    setRecTexto(""); setRecurrencia(null); setRecError("");
    setPanel(null); setFechaTab("especifica"); setDetIgnorada(false); setOpen(false);
  }

  function submit() {
    if (!titulo.trim()) { titleRef.current?.focus(); return; }
    // Apply natural language detection if no manual date set and not dismissed
    const tituloFinal    = deteccion ? deteccion.tituloLimpio || titulo.trim() : titulo.trim();
    const fechaFinal     = fecha || (deteccion?.fecha ?? null);
    const recFinal       = fechaTab === "recurrente" ? recurrencia : (deteccion?.recurrencia ?? null);
    onAdd({
      titulo:           tituloFinal,
      fecha:            fechaTab === "especifica" ? fechaFinal : null,
      fechaVencimiento: fechaVen || null,
      prioridad,
      area,
      recurrencia:      recFinal,
      proyectoTareaId:  proyectoSel,
      seccionId,
      parentId,
      asignadoAId:      asignadoSel,
    });
    reset();
  }

  function togglePanel(p: ActivePanel) { setPanel(prev => prev === p ? null : p); }

  function applyRec(txt: string) {
    if (!txt.trim()) { setRecurrencia(null); return; }
    const cfg = parsearRecurrencia(txt.trim());
    if (!cfg) { setRecError("No reconocido. Ej: 'cada lunes', 'cada martes y jueves'"); return; }
    setRecurrencia(JSON.stringify(cfg));
    setRecError("");
    setPanel(null);
  }

  // ── Closed state ─────────────────────────────────────────────────────────────
  if (!open) return (
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

  // ── Open state ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-1 my-2 rounded-xl border border-[#1e1e1e] bg-[#080808] shadow-2xl shadow-black/70 overflow-hidden ring-1 ring-[#B3985B]/8">

      {/* ── Title input ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-3.5 pb-2.5">
        <input
          ref={titleRef}
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) submit(); if (e.key === "Escape") reset(); }}
          placeholder={placeholder}
          className="w-full bg-transparent text-[15px] text-white placeholder-[#252525] focus:outline-none leading-snug"
        />
      </div>

      {/* ── Detection chip ───────────────────────────────────────────────── */}
      {deteccion && (
        <div className="flex items-center gap-1.5 px-4 pb-2">
          <span className="flex items-center gap-1.5 text-[11px] bg-[#B3985B]/10 text-[#B3985B] border border-[#B3985B]/20 rounded-md px-2 py-0.5">
            {deteccion.recurrencia ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            )}
            {deteccion.recurrencia
              ? (() => { try { return formatearRecurrencia(JSON.parse(deteccion.recurrencia!)); } catch { return ""; } })()
              : deteccion.fecha ? formatDisplay(deteccion.fecha) : ""}
            <button onClick={() => setDetIgnorada(true)}
              className="ml-0.5 text-[#B3985B]/50 hover:text-red-400 transition-colors leading-none">
              ×
            </button>
          </span>
        </div>
      )}

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="h-px bg-[#111]" />

      {/* ── Bottom toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 flex-wrap">
        <ToolbarBtn icon={fechaTab === "recurrente" && recurrencia ? <IconRepeat /> : <IconCalendar />}
          label={fechaLabel} active={hasFecha} activeColor="#B3985B"
          isOpen={panel === "fecha"} onClick={() => togglePanel("fecha")} />

        <ToolbarBtn icon={<IconClock />}
          label={fechaVen ? formatDisplay(fechaVen) : "Límite"} active={!!fechaVen} activeColor="#e85d04"
          isOpen={panel === "limite"} onClick={() => togglePanel("limite")} />

        <ToolbarBtn icon={<IconFlag color={prioridad !== "MEDIA" ? prio.color : undefined} />}
          label={prioridad !== "MEDIA" ? prio.label : "Prioridad"} active={prioridad !== "MEDIA"} activeColor={prio.color}
          isOpen={panel === "prioridad"} onClick={() => togglePanel("prioridad")} />

        {!compact && (
          <>
            <ToolbarBtn icon={<IconFolder />}
              label={proyectoInfo?.nombre ?? "Proyecto"} active={!!proyectoInfo} activeColor="#B3985B"
              isOpen={panel === "proyecto"} onClick={() => togglePanel("proyecto")} />

            <ToolbarBtn icon={<IconTag />}
              label={area !== "GENERAL" ? areaDef.label : "Área"} active={area !== "GENERAL"} activeColor="#B3985B"
              isOpen={panel === "area"} onClick={() => togglePanel("area")} />

            {usuarios.length > 0 && (
              <ToolbarBtn icon={<IconUser />}
                label={usuarioInfo?.name.split(" ")[0] ?? "Asignar"} active={!!usuarioInfo} activeColor="#B3985B"
                isOpen={panel === "asignado"} onClick={() => togglePanel("asignado")} />
            )}
          </>
        )}

        <div className="flex-1" />
        <button onClick={reset}
          className="text-xs text-[#333] hover:text-[#777] px-2 py-1 rounded-lg hover:bg-[#0f0f0f] transition-all">
          Cancelar
        </button>
        <button onClick={submit} disabled={!titulo.trim()}
          className="text-xs font-semibold px-3 py-1 rounded-lg transition-all ml-1 disabled:opacity-25 disabled:cursor-not-allowed bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808]"
          style={{ boxShadow: titulo.trim() ? "0 0 14px #B3985B30" : "none" }}>
          Agregar
        </button>
      </div>

      {/* ── Panels (below toolbar) ───────────────────────────────────────── */}
      {panel && (
        <div className="border-t border-[#111]">

          {/* Fecha */}
          {panel === "fecha" && (
            <div>
              <div className="flex border-b border-[#111]">
                {(["especifica","recurrente"] as FechaTab[]).map(tab => (
                  <button key={tab} onClick={() => setFechaTab(tab)}
                    className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                      fechaTab === tab ? "text-[#B3985B] border-b border-[#B3985B]" : "text-[#3a3a3a] hover:text-[#777]"
                    }`}>
                    {tab === "especifica" ? "Específica" : "Recurrente"}
                  </button>
                ))}
              </div>
              {fechaTab === "especifica" ? (
                <div className="p-2.5">
                  <DatePicker value={fecha} onChange={val => { setFecha(val); if (val) setPanel(null); }} placeholder="dd/mm/aaaa" size="sm" />
                </div>
              ) : (
                <div className="p-2.5 space-y-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {REC_PRESETS.map(p => {
                      const cfg = parsearRecurrencia(p.pat);
                      const json = cfg ? JSON.stringify(cfg) : null;
                      return (
                        <button key={p.label} onClick={() => { if (json) { setRecurrencia(json); setRecTexto(""); setPanel(null); } }}
                          className={`px-2 py-0.5 rounded text-[11px] border transition-all ${
                            recurrencia === json ? "bg-[#B3985B]/15 border-[#B3985B]/30 text-[#B3985B]" : "border-[#1e1e1e] text-[#444] hover:text-[#888]"
                          }`}>{p.label}</button>
                      );
                    })}
                    {recurrencia && (
                      <button onClick={() => { setRecurrencia(null); setRecTexto(""); }}
                        className="px-2 py-0.5 rounded text-[11px] border border-[#1e1e1e] text-[#444] hover:text-red-400 transition-all">✕</button>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input value={recTexto} onChange={e => { setRecTexto(e.target.value); setRecError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") applyRec(recTexto); if (e.key === "Escape") setPanel(null); }}
                      placeholder="cada lunes · cada martes y jueves…"
                      className="flex-1 bg-[#0f0f0f] border border-[#1e1e1e] rounded px-2 py-1 text-[11px] text-white placeholder-[#2a2a2a] focus:outline-none focus:border-[#B3985B]/40" />
                    <button onClick={() => applyRec(recTexto)}
                      className="px-2 py-1 bg-[#161616] hover:bg-[#1e1e1e] text-[#666] hover:text-white text-[11px] rounded transition-all">OK</button>
                  </div>
                  {recError && <p className="text-[10px] text-red-400">{recError}</p>}
                  {recurrencia && !recError && (
                    <p className="text-[10px] text-[#B3985B] flex items-center gap-1"><IconRepeat />{recLabel}</p>
                  )}
                </div>
              )}
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
                <button key={p.key} onClick={() => { setPrioridad(p.key); setPanel(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all"
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
              <button onClick={() => { setProyectoSel(null); setPanel(null); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${!proyectoSel ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#333] shrink-0" />
                Bandeja de entrada
              </button>
              {proyectos.map(p => (
                <button key={p.id} onClick={() => { setProyectoSel(p.id); setPanel(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${proyectoSel === p.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"}`}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color ?? "#555" }} />
                  {p.nombre}
                </button>
              ))}
            </div>
          )}

          {/* Área */}
          {panel === "area" && (
            <div className="flex flex-wrap gap-1 px-2.5 py-2">
              {AREAS.map(a => (
                <button key={a.key} onClick={() => { setArea(a.key); setPanel(null); }}
                  className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                    area === a.key ? "bg-[#B3985B]/12 border-[#B3985B]/30 text-[#B3985B]" : "border-[#1a1a1a] text-[#444] hover:text-[#888]"
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* Asignado */}
          {panel === "asignado" && usuarios.length > 0 && (
            <div className="max-h-36 overflow-y-auto py-1">
              <button onClick={() => { setAsignadoSel(null); setPanel(null); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${!asignadoSel ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"}`}>
                <span className="w-4 h-4 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[9px] text-[#444]">—</span>
                Sin asignar
              </button>
              {usuarios.map(u => (
                <button key={u.id} onClick={() => { setAsignadoSel(u.id); setPanel(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${asignadoSel === u.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-[#bbb] hover:bg-[#0f0f0f]"}`}>
                  <span className="w-4 h-4 rounded-full bg-[#1a1a1a] border border-[#222] flex items-center justify-center text-[9px] text-[#B3985B] font-medium shrink-0">
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

function ToolbarBtn({ icon, label, active, activeColor, isOpen, onClick }: {
  icon: React.ReactNode; label: string; active: boolean;
  activeColor: string; isOpen: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${isOpen ? "bg-[#151515] text-white" : "hover:bg-[#0f0f0f]"}`}
      style={{ color: isOpen ? "white" : active ? activeColor : "#333" }}>
      <span style={{ color: isOpen ? "#888" : active ? activeColor : "#2e2e2e" }}>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
