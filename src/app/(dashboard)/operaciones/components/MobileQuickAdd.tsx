"use client";
import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { parsearRecurrencia, detectarFechaEnTitulo, formatearRecurrencia } from "@/lib/recurrencia";
import DatePicker from "@/components/ui/DatePicker";

interface ProyectoOption { id: string; nombre: string; color: string | null }
interface UsuarioOption  { id: string; name: string }

interface Props {
  open: boolean;
  onClose: () => void;
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
  proyectos?: ProyectoOption[];
  usuarios?: UsuarioOption[];
  defaultProyectoId?: string | null;
}

const PRIOS = [
  { key: "URGENTE", label: "Urgente", color: "#f87171" },
  { key: "ALTA",    label: "Alta",    color: "#fb923c" },
  { key: "MEDIA",   label: "Media",   color: "#B3985B" },
  { key: "BAJA",    label: "Baja",    color: "#6b7280" },
] as const;

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

type Panel = "fecha" | "prioridad" | "proyecto" | "asignar" | null;

export interface MobileQuickAddHandle { focus: () => void }

const MobileQuickAdd = forwardRef<MobileQuickAddHandle, Props>(function MobileQuickAdd(
  { open, onClose, onAdd, proyectos = [], usuarios = [], defaultProyectoId = null }, ref
) {
  const [titulo, setTitulo]         = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha]           = useState("");
  const [prioridad, setPrioridad]   = useState("MEDIA");
  const [proyectoId, setProyectoId] = useState<string | null>(defaultProyectoId);
  const [asignadoId, setAsignadoId] = useState<string | null>(null);
  const [panel, setPanel]           = useState<Panel>(null);
  const [detIgnorada, setDetIgnorada] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Expose focus() to parent so FAB can call it synchronously from click handler
  useImperativeHandle(ref, () => ({
    focus: () => titleRef.current?.focus(),
  }));

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setTitulo(""); setDescripcion(""); setFecha("");
      setPrioridad("MEDIA"); setProyectoId(defaultProyectoId);
      setAsignadoId(null); setPanel(null); setDetIgnorada(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);

  const deteccion = useMemo(() => {
    if (detIgnorada || !titulo || fecha) return null;
    const d = detectarFechaEnTitulo(titulo);
    return d.textoDetectado ? d : null;
  }, [titulo, fecha, detIgnorada]);

  function submit() {
    if (!titulo.trim()) { titleRef.current?.focus(); return; }
    const tituloFinal = deteccion ? deteccion.tituloLimpio || titulo.trim() : titulo.trim();
    const fechaFinal  = fecha || deteccion?.fecha || null;
    const recFinal    = fecha ? null : deteccion?.recurrencia || null;
    onAdd({
      titulo: tituloFinal, fecha: fechaFinal, fechaVencimiento: null,
      prioridad, area: "GENERAL", recurrencia: recFinal,
      proyectoTareaId: proyectoId, seccionId: null, parentId: null,
      asignadoAId: asignadoId,
    });
    onClose();
  }

  const prio      = PRIOS.find(p => p.key === prioridad)!;
  const proyInfo  = proyectos.find(p => p.id === proyectoId);
  const userInfo  = usuarios.find(u => u.id === asignadoId);
  const hasDate   = !!(fecha || deteccion?.fecha);
  const dateLabel = fecha ? formatDisplay(fecha) : (deteccion?.fecha ? formatDisplay(deteccion.fecha) : null);

  return (
    <>
      {/* Backdrop — only visible when open */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Bottom sheet — always in DOM so focus() works from FAB click handler */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 md:hidden bg-[#111] rounded-t-2xl shadow-2xl border-t border-[#1e1e1e] overflow-hidden transition-transform duration-200 ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-hidden={!open}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-8 h-1 rounded-full bg-[#333]" />
        </div>

        {/* Input area */}
        <div className="px-4 pt-2 pb-1">
          <textarea
            ref={titleRef}
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Nombre de la tarea"
            className="w-full bg-transparent text-white text-[17px] placeholder-[#3a3a3a] focus:outline-none resize-none leading-snug"
            rows={titulo.split("\n").length || 1}
          />
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción"
            className="w-full bg-transparent text-[#555] text-sm placeholder-[#2a2a2a] focus:outline-none resize-none leading-snug mt-1"
            rows={1}
          />
        </div>

        {/* Natural language date chip */}
        {deteccion && (
          <div className="px-4 pb-1">
            <span className="inline-flex items-center gap-1.5 text-[12px] bg-[#B3985B]/10 text-[#B3985B] border border-[#B3985B]/20 rounded-full px-2.5 py-0.5">
              {deteccion.fecha ? formatDisplay(deteccion.fecha) : (
                (() => { try { return formatearRecurrencia(JSON.parse(deteccion.recurrencia!)); } catch { return ""; } })()
              )}
              <button onClick={() => setDetIgnorada(true)} className="text-[#B3985B]/50 hover:text-red-400 ml-0.5">×</button>
            </span>
          </div>
        )}

        {/* Chips toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-t border-[#1a1a1a] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {/* Fecha */}
          <ChipBtn
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            label={dateLabel ?? "Fecha"}
            active={hasDate}
            activeColor="#B3985B"
            isOpen={panel === "fecha"}
            onClick={() => setPanel(panel === "fecha" ? null : "fecha")}
          />

          {/* Prioridad */}
          <ChipBtn
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill={prioridad !== "BAJA" ? prio.color + "30" : "none"} stroke={prioridad !== "BAJA" ? prio.color : "#555"} strokeWidth="1.5" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>}
            label={prioridad !== "MEDIA" ? prio.label : "Prioridad"}
            active={prioridad !== "MEDIA"}
            activeColor={prio.color}
            isOpen={panel === "prioridad"}
            onClick={() => setPanel(panel === "prioridad" ? null : "prioridad")}
          />

          {/* Proyecto */}
          {proyectos.length > 0 && (
            <ChipBtn
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={proyInfo?.color ?? "currentColor"} strokeWidth="1.5" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
              label={proyInfo?.nombre ?? "Proyecto"}
              active={!!proyInfo}
              activeColor={proyInfo?.color ?? "#B3985B"}
              isOpen={panel === "proyecto"}
              onClick={() => setPanel(panel === "proyecto" ? null : "proyecto")}
            />
          )}

          {/* Asignar */}
          {usuarios.length > 0 && (
            <ChipBtn
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
              label={userInfo ? userInfo.name.split(" ")[0] : "Asignar"}
              active={!!userInfo}
              activeColor="#B3985B"
              isOpen={panel === "asignar"}
              onClick={() => setPanel(panel === "asignar" ? null : "asignar")}
            />
          )}

          <div className="flex-1" />

          {/* Agregar button */}
          <button
            onClick={submit}
            disabled={!titulo.trim()}
            className="shrink-0 px-4 py-1.5 bg-[#B3985B] text-black text-sm font-bold rounded-full transition-all disabled:opacity-25"
          >
            Agregar
          </button>
        </div>

        {/* Panel expandible */}
        {panel && (
          <div className="border-t border-[#1a1a1a] bg-[#0d0d0d]">

            {panel === "fecha" && (
              <div className="p-3">
                <div className="flex gap-2 mb-3">
                  {[
                    { label: "Hoy",    iso: toISO(new Date()) },
                    { label: "Mañana", iso: toISO(new Date(Date.now() + 86400000)) },
                  ].map(opt => (
                    <button key={opt.label} onClick={() => { setFecha(opt.iso); setPanel(null); }}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        fecha === opt.iso
                          ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
                          : "border-[#1e1e1e] text-[#666] hover:text-white"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                  {fecha && (
                    <button onClick={() => { setFecha(""); setPanel(null); }}
                      className="px-3 py-2 rounded-xl text-sm border border-[#1e1e1e] text-[#444] hover:text-red-400">
                      Quitar
                    </button>
                  )}
                </div>
                <DatePicker value={fecha} onChange={val => { setFecha(val); if (val) setPanel(null); }} size="sm" />
              </div>
            )}

            {panel === "prioridad" && (
              <div className="grid grid-cols-4 gap-1.5 p-3">
                {PRIOS.map(p => (
                  <button key={p.key} onClick={() => { setPrioridad(p.key); setPanel(null); }}
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
            )}

            {panel === "proyecto" && (
              <div className="max-h-52 overflow-y-auto py-1.5">
                <button onClick={() => { setProyectoId(null); setPanel(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${!proyectoId ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-white hover:bg-[#111]"}`}>
                  <span className="w-2 h-2 rounded-full bg-[#333] shrink-0" />
                  Bandeja de entrada
                </button>
                {proyectos.map(p => (
                  <button key={p.id} onClick={() => { setProyectoId(p.id); setPanel(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${proyectoId === p.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-white hover:bg-[#111]"}`}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color ?? "#555" }} />
                    {p.nombre}
                  </button>
                ))}
              </div>
            )}

            {panel === "asignar" && (
              <div className="max-h-52 overflow-y-auto py-1.5">
                <button onClick={() => { setAsignadoId(null); setPanel(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${!asignadoId ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-white hover:bg-[#111]"}`}>
                  <span className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xs text-[#444]">—</span>
                  Sin asignar
                </button>
                {usuarios.map(u => (
                  <button key={u.id} onClick={() => { setAsignadoId(u.id); setPanel(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${asignadoId === u.id ? "text-[#B3985B] bg-[#B3985B]/5" : "text-[#555] hover:text-white hover:bg-[#111]"}`}>
                    <span className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#222] flex items-center justify-center text-xs text-[#B3985B] font-bold shrink-0">
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
    </>
  );
});

export default MobileQuickAdd;

function ChipBtn({ icon, label, active, activeColor, isOpen, onClick }: {
  icon: React.ReactNode; label: string; active: boolean;
  activeColor: string; isOpen: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
        isOpen ? "border-[#2a2a2a] bg-[#1a1a1a] text-white" : ""
      }`}
      style={
        !isOpen
          ? active
            ? { borderColor: activeColor + "50", backgroundColor: activeColor + "15", color: activeColor }
            : { borderColor: "#1a1a1a", color: "#444" }
          : {}
      }
    >
      {icon}
      {label}
    </button>
  );
}
