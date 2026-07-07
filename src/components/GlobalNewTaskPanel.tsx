"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { flushSync } from "react-dom";
import { detectarFechaEnTitulo, formatearRecurrencia } from "@/lib/recurrencia";
import DatePicker from "@/components/ui/DatePicker";
import { useToast } from "@/components/Toast";

interface Usuario { id: string; name: string }
interface Proyecto { id: string; nombre: string; color: string | null }

const PRIOS = [
  { key: "URGENTE", label: "Urgente", color: "#f87171" },
  { key: "ALTA",    label: "Alta",    color: "#fb923c" },
  { key: "MEDIA",   label: "Media",   color: "#B3985B" },
  { key: "BAJA",    label: "Baja",    color: "#6b7280" },
] as const;

type Panel = "fecha" | "prioridad" | "proyecto" | "asignar" | null;

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

export default function GlobalNewTaskPanel() {
  const toast = useToast();
  const [open, setOpen]               = useState(false);
  const [titulo, setTitulo]           = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha]             = useState("");
  const [prioridad, setPrioridad]     = useState("MEDIA");
  const [proyectoId, setProyectoId]   = useState("");
  const [asignadoId, setAsignadoId]   = useState("");
  const [panel, setPanel]             = useState<Panel>(null);
  const [detIgnorada, setDetIgnorada] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [keyboardBottom, setKeyboardBottom] = useState(0);
  const [usuarios, setUsuarios]       = useState<Usuario[]>([]);
  const [proyectos, setProyectos]     = useState<Proyecto[]>([]);
  // Two refs: mobile sheet is always in DOM; desktop modal is conditional
  const mobileRef  = useRef<HTMLTextAreaElement>(null);
  const desktopRef = useRef<HTMLTextAreaElement>(null);

  // Event + keyboard listeners
  // flushSync ensures the mobile sheet is visible before focus() — required for iOS keyboard
  useEffect(() => {
    function onOpen() {
      flushSync(() => setOpen(true));
      mobileRef.current?.focus();
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("open-full-task", onOpen);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("open-full-task", onOpen);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // iOS visual viewport — keep bottom sheet above keyboard
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function update() { setKeyboardBottom(Math.max(0, window.innerHeight - vv!.offsetTop - vv!.height)); }
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);

  // Reset + fetch data + focus on open (handles Cmd+K case and desktop modal)
  useEffect(() => {
    if (!open) return;
    setTitulo(""); setDescripcion(""); setFecha(""); setPrioridad("MEDIA");
    setProyectoId(""); setAsignadoId(""); setPanel(null); setDetIgnorada(false);
    setTimeout(() => { mobileRef.current?.focus(); desktopRef.current?.focus(); }, 60);
    Promise.all([
      fetch("/api/usuarios").then(r => r.json()).catch(() => ({ usuarios: [] })),
      fetch("/api/operaciones/proyectos").then(r => r.json()).catch(() => ({ proyectos: [] })),
    ]).then(([usr, proy]) => {
      setUsuarios(usr.usuarios ?? []);
      setProyectos(proy.proyectos ?? []);
    });
  }, [open]);

  // Re-focus after panel closes so keyboard stays visible on mobile
  const prevPanel = useRef<Panel>(null);
  useEffect(() => {
    if (prevPanel.current !== null && panel === null && open) {
      const t = setTimeout(() => { mobileRef.current?.focus(); desktopRef.current?.focus(); }, 80);
      return () => clearTimeout(t);
    }
    prevPanel.current = panel;
  }, [panel, open]);

  const deteccion = useMemo(() => {
    if (detIgnorada || !titulo || fecha) return null;
    const d = detectarFechaEnTitulo(titulo);
    return d.textoDetectado ? d : null;
  }, [titulo, fecha, detIgnorada]);

  function cerrar() { setOpen(false); }

  async function crear() {
    const t = titulo.trim();
    if (!t) { mobileRef.current?.focus(); desktopRef.current?.focus(); return; }
    const tituloFinal = deteccion ? deteccion.tituloLimpio || t : t;
    const fechaFinal  = fecha || deteccion?.fecha || null;
    const recFinal    = fecha ? null : deteccion?.recurrencia || null;
    setSaving(true);
    const res = await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: tituloFinal, descripcion: descripcion.trim() || null, prioridad,
        fecha: fechaFinal, asignadoAId: asignadoId || null, proyectoTareaId: proyectoId || null,
        fechaVencimiento: null, recurrencia: recFinal, seccionId: null, parentId: null, area: "GENERAL",
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al crear tarea"); return; }
    toast.success("Tarea creada");
    cerrar();
  }

  const prio      = PRIOS.find(p => p.key === prioridad)!;
  const proyInfo  = proyectos.find(p => p.id === proyectoId);
  const userInfo  = usuarios.find(u => u.id === asignadoId);
  const hasDate   = !!(fecha || deteccion?.fecha);
  const dateLabel = fecha ? formatDisplay(fecha) : (deteccion?.fecha ? formatDisplay(deteccion.fecha) : null);

  const panelProps = {
    panel, fecha, setFecha, prioridad, setPrioridad, proyectoId, setProyectoId,
    asignadoId, setAsignadoId, proyectos, usuarios, closePanel: () => setPanel(null),
  };

  // Chip buttons — shared between mobile and desktop
  const chips = (
    <>
      <ChipBtn icon={<IconCal />} label={dateLabel ?? "Fecha"} active={hasDate} activeColor="#B3985B"
        isOpen={panel === "fecha"} onClick={() => setPanel(panel === "fecha" ? null : "fecha")} />
      <ChipBtn
        icon={<IconFlag color={prio.color} filled={prioridad !== "MEDIA"} />}
        label={prioridad !== "MEDIA" ? prio.label : "Prioridad"}
        active={prioridad !== "MEDIA"} activeColor={prio.color}
        isOpen={panel === "prioridad"} onClick={() => setPanel(panel === "prioridad" ? null : "prioridad")} />
      {proyectos.length > 0 && (
        <ChipBtn icon={<IconFolder color={proyInfo?.color ?? undefined} />}
          label={proyInfo?.nombre ?? "Proyecto"} active={!!proyInfo} activeColor={proyInfo?.color ?? "#B3985B"}
          isOpen={panel === "proyecto"} onClick={() => setPanel(panel === "proyecto" ? null : "proyecto")} />
      )}
      {usuarios.length > 0 && (
        <ChipBtn icon={<IconUser />} label={userInfo ? userInfo.name.split(" ")[0] : "Asignar"} active={!!userInfo}
          activeColor="#B3985B" isOpen={panel === "asignar"} onClick={() => setPanel(panel === "asignar" ? null : "asignar")} />
      )}
    </>
  );

  return (
    <>
      {/* ── MOBILE: backdrop (separate so sheet can stay in DOM) ── */}
      <div
        className={`fixed inset-0 z-[94] lg:hidden bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={cerrar}
      />

      {/* ── MOBILE: bottom sheet — always in DOM for iOS keyboard focus ── */}
      <div
        className={`fixed inset-x-0 z-[95] lg:hidden bg-[#111] rounded-t-2xl shadow-2xl border-t border-[#1e1e1e] flex flex-col transition-transform duration-200 ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{
          bottom: keyboardBottom > 0 ? `${keyboardBottom}px` : 0,
          maxHeight: "92dvh",
          paddingBottom: keyboardBottom > 0 ? "0px" : "env(safe-area-inset-bottom)",
        }}
        aria-hidden={!open}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + X */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1 shrink-0">
          <div className="w-8" />
          <div className="w-8 h-1 rounded-full bg-[#333]" />
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={cerrar}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#444] hover:text-white hover:bg-[#1e1e1e] transition-all active:scale-95"
            aria-label="Descartar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-4 pt-1 pb-1">
            <textarea
              ref={mobileRef}
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); crear(); } }}
              placeholder="Nombre de la tarea"
              inputMode="text"
              className="w-full bg-transparent text-white text-[17px] placeholder:text-[#444] focus:outline-none resize-none leading-snug"
              rows={titulo.split("\n").length || 1}
            />
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción"
              className="w-full bg-transparent text-[#555] text-sm placeholder:text-[#444] focus:outline-none resize-none leading-snug mt-1"
              rows={1}
            />
          </div>
          {deteccion && (
            <div className="px-4 pb-1">
              <span className="inline-flex items-center gap-1.5 text-[12px] bg-[#B3985B]/10 text-[#B3985B] border border-[#B3985B]/20 rounded-full px-2.5 py-0.5">
                <DetLabel deteccion={deteccion} />
                <button onMouseDown={e => e.preventDefault()} onClick={() => setDetIgnorada(true)}
                  className="text-[#B3985B]/50 hover:text-red-400 ml-0.5">×</button>
              </span>
            </div>
          )}
          {panel && (
            <div className="border-t border-[#1a1a1a] bg-[#0d0d0d]">
              <PanelContent {...panelProps} />
            </div>
          )}
        </div>

        {/* Two-row toolbar */}
        <div className="shrink-0 border-t border-[#1a1a1a] bg-[#111]">
          {/* Row 1: chips */}
          <div className="flex items-center gap-1 px-3 pt-2.5 pb-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {chips}
          </div>
          {/* Row 2: Agregar */}
          <div className="flex items-center justify-end px-3 pb-3">
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={crear}
              disabled={!titulo.trim() || saving}
              className="px-5 py-2 bg-[#B3985B] text-black text-sm font-bold rounded-full transition-all disabled:opacity-25 active:scale-95"
            >
              {saving ? "…" : "Agregar"}
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP: overlay + centered modal ── */}
      {open && (
        <div className="hidden lg:flex fixed inset-0 z-[95] items-start justify-center pt-[10vh] px-4" onClick={cerrar}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xl bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#141414] shrink-0">
              <p className="text-white font-semibold text-sm">Nueva tarea</p>
              <button onClick={cerrar} className="text-[#333] hover:text-white transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              <div className="px-5 pt-4 pb-2">
                <textarea
                  ref={desktopRef}
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); crear(); }
                    if (e.key === "Escape") cerrar();
                  }}
                  placeholder="¿En qué estás trabajando?"
                  className="w-full bg-transparent text-white text-base placeholder:text-[#444] focus:outline-none font-medium resize-none leading-snug"
                  rows={titulo.split("\n").length || 1}
                />
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  onKeyDown={e => { if (e.key === "Escape") cerrar(); }}
                  placeholder="Descripción (opcional)"
                  rows={2}
                  className="w-full bg-transparent text-sm text-[#666] placeholder-[#222] focus:outline-none resize-none leading-relaxed mt-2"
                />
              </div>
              {deteccion && (
                <div className="px-5 pb-2">
                  <span className="inline-flex items-center gap-1.5 text-[12px] bg-[#B3985B]/10 text-[#B3985B] border border-[#B3985B]/20 rounded-md px-2 py-0.5">
                    <DetLabel deteccion={deteccion} />
                    <button onClick={() => setDetIgnorada(true)} className="ml-0.5 text-[#B3985B]/50 hover:text-red-400">×</button>
                  </span>
                </div>
              )}
              {panel && (
                <div className="border-t border-[#111]">
                  <PanelContent {...panelProps} />
                </div>
              )}
            </div>

            {/* Two-row footer */}
            <div className="shrink-0 border-t border-[#141414] bg-[#090909]">
              {/* Row 1: chips */}
              <div className="flex items-center gap-0.5 px-4 pt-3 pb-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {chips}
              </div>
              {/* Row 2: actions */}
              <div className="flex items-center justify-end gap-1 px-4 pb-3">
                <button onClick={cerrar} className="text-xs text-[#444] hover:text-[#888] px-3 py-1.5 rounded-lg hover:bg-[#0f0f0f] transition-all">
                  Cancelar
                </button>
                <button
                  onClick={crear}
                  disabled={!titulo.trim() || saving}
                  className="text-xs font-semibold px-4 py-1.5 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808] transition-all"
                  style={{ boxShadow: titulo.trim() ? "0 0 14px #B3985B30" : "none" }}
                >
                  {saving ? "Creando…" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Panel content ─────────────────────────────────────────────────────────────

interface PanelProps {
  panel: Panel;
  fecha: string; setFecha: (v: string) => void;
  prioridad: string; setPrioridad: (v: string) => void;
  proyectoId: string; setProyectoId: (v: string) => void;
  asignadoId: string; setAsignadoId: (v: string) => void;
  proyectos: Proyecto[]; usuarios: Usuario[];
  closePanel: () => void;
}

function PanelContent({ panel, fecha, setFecha, prioridad, setPrioridad, proyectoId, setProyectoId, asignadoId, setAsignadoId, proyectos, usuarios, closePanel }: PanelProps) {
  const md = (e: React.MouseEvent) => e.preventDefault();

  if (panel === "fecha") return (
    <div className="p-3">
      <div className="flex gap-2 mb-3">
        {[{ label: "Hoy", iso: toISO(new Date()) }, { label: "Mañana", iso: toISO(new Date(Date.now() + 86400000)) }].map(opt => (
          <button key={opt.label} onMouseDown={md} onClick={() => { setFecha(opt.iso); closePanel(); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${fecha === opt.iso ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]" : "border-[#1e1e1e] text-[#666] hover:text-white"}`}>
            {opt.label}
          </button>
        ))}
        {fecha && (
          <button onMouseDown={md} onClick={() => { setFecha(""); closePanel(); }}
            className="px-3 py-2 rounded-xl text-sm border border-[#1e1e1e] text-[#444] hover:text-red-400">
            Quitar
          </button>
        )}
      </div>
      <DatePicker value={fecha} onChange={val => { setFecha(val); if (val) closePanel(); }} size="sm" />
    </div>
  );

  if (panel === "prioridad") return (
    <div className="grid grid-cols-4 gap-1.5 p-3">
      {PRIOS.map(p => (
        <button key={p.key} onMouseDown={md} onClick={() => { setPrioridad(p.key); closePanel(); }}
          className="flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all"
          style={{
            borderColor: prioridad === p.key ? p.color + "60" : "#1a1a1a",
            backgroundColor: prioridad === p.key ? p.color + "15" : "transparent",
            color: prioridad === p.key ? p.color : "#555",
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={prioridad === p.key ? p.color + "40" : "none"} stroke={p.color} strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
          {p.label}
        </button>
      ))}
    </div>
  );

  if (panel === "proyecto") return (
    <div className="max-h-52 overflow-y-auto py-1.5">
      <button onMouseDown={md} onClick={() => { setProyectoId(""); closePanel(); }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${!proyectoId ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-white hover:bg-[#111]"}`}>
        <span className="w-2 h-2 rounded-full bg-[#333] shrink-0" />Bandeja de entrada
      </button>
      {proyectos.map(p => (
        <button key={p.id} onMouseDown={md} onClick={() => { setProyectoId(p.id); closePanel(); }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${proyectoId === p.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-white hover:bg-[#111]"}`}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color ?? "#555" }} />{p.nombre}
        </button>
      ))}
    </div>
  );

  if (panel === "asignar") return (
    <div className="max-h-52 overflow-y-auto py-1.5">
      <button onMouseDown={md} onClick={() => { setAsignadoId(""); closePanel(); }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${!asignadoId ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-white hover:bg-[#111]"}`}>
        <span className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xs text-[#444]">—</span>
        Sin asignar
      </button>
      {usuarios.map(u => (
        <button key={u.id} onMouseDown={md} onClick={() => { setAsignadoId(u.id); closePanel(); }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${asignadoId === u.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-white hover:bg-[#111]"}`}>
          <span className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#222] flex items-center justify-center text-xs text-[#B3985B] font-bold shrink-0">
            {u.name.charAt(0).toUpperCase()}
          </span>{u.name}
        </button>
      ))}
    </div>
  );

  return null;
}

// ── Chip button ───────────────────────────────────────────────────────────────

function ChipBtn({ icon, label, active, activeColor, isOpen, onClick }: {
  icon: React.ReactNode; label: string; active: boolean;
  activeColor: string; isOpen: boolean; onClick: () => void;
}) {
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${isOpen ? "border-[#2a2a2a] bg-[#1a1a1a] text-white" : ""}`}
      style={!isOpen ? (active ? { borderColor: activeColor + "50", backgroundColor: activeColor + "15", color: activeColor } : { borderColor: "#1a1a1a", color: "#444" }) : {}}
    >
      {icon}{label}
    </button>
  );
}

// ── NL detection label ────────────────────────────────────────────────────────

function DetLabel({ deteccion }: { deteccion: { fecha: string | null; recurrencia: string | null } }) {
  if (deteccion.fecha) return <>{formatDisplay(deteccion.fecha)}</>;
  try { return <>{formatearRecurrencia(JSON.parse(deteccion.recurrencia!))}</>; } catch { return null; }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconCal() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function IconFlag({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? color + "28" : "none"} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  );
}

function IconFolder({ color }: { color?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color ?? "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
