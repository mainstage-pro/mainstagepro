"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { EtapaInternaBar } from "@/components/crm/EtapaInternaBar";
import { etapaInternaLabel } from "@/lib/etapasInternas";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Seguimiento = {
  id: string;
  tipo: string;
  numero: number | null;
  etapa: string | null;
  canal: string;
  titulo: string;
  nota: string | null;
  notaResultado: string | null;
  fechaProgramada: string;
  fechaCompletado: string | null;
  completado: boolean;
  tratoId: string;
  trato: {
    id: string;
    nombreEvento: string | null;
    fechaEventoEstimada: string | null;
    etapa: string;
    etapaInterna: string | null;
    cliente: { nombre: string; empresa: string | null };
  };
};

type TratoEnRevision = {
  id: string; etapa: string; nombreEvento: string | null;
  createdAt: string; clienteNombre: string; clienteEmpresa: string | null;
};

type TratoSinMovimiento = {
  id: string; etapa: string; nombreEvento: string | null;
  createdAt: string; etapaCambiadaEn: string | null;
  cliente: { nombre: string; empresa: string | null };
  seguimientos: { fechaCompletado: string | null }[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtFechaCorta(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function fmtFechaMedia(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}

function fmtMes(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function mesKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextTuesdayOrThursday(): string {
  const d = new Date();
  const day = d.getDay();
  const dtu = (2 - day + 7) % 7 || 7;
  const dth = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + Math.min(dtu, dth));
  return d.toISOString().substring(0, 10);
}

const CANAL_ICON: Record<string, string> = { whatsapp: "📱", llamada: "📞", reunion: "🤝" };
const CANAL_LABEL: Record<string, string> = { whatsapp: "WhatsApp", llamada: "Llamada", reunion: "Reunión" };
const ETAPA_BADGE: Record<string, { label: string; cls: string }> = {
  LEAD:           { label: "Prospección",    cls: "bg-amber-900/20 text-amber-400" },
  DESCUBRIMIENTO: { label: "Descubrimiento", cls: "bg-blue-900/20 text-blue-400" },
  OPORTUNIDAD:    { label: "Oportunidad",    cls: "bg-violet-900/20 text-violet-400" },
  VENTA_CERRADA:  { label: "Cerrada",        cls: "bg-emerald-900/20 text-emerald-400" },
  VENTA_PERDIDA:  { label: "Perdida",        cls: "bg-red-900/20 text-red-400" },
};

// ─── ModalReprogramar ──────────────────────────────────────────────────────────

function ModalReprogramar({ segId, onClose, onSaved }: {
  segId: string; onClose: () => void; onSaved: () => void;
}) {
  const [fecha, setFecha] = useState(nextTuesdayOrThursday());
  const [hora, setHora] = useState("10:00");
  const [canal, setCanal] = useState("whatsapp");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!fecha) return;
    setSaving(true);
    await fetch(`/api/seguimientos/${segId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fechaProgramada: new Date(`${fecha}T${hora}:00`).toISOString(), canal }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ms-card rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-sm">Reprogramar seguimiento</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white">✕</button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Nueva fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Hora</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          <div>
            <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Canal</label>
            <div className="flex gap-2">
              {["whatsapp", "llamada", "reunion"].map(c => (
                <button key={c} onClick={() => setCanal(c)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${canal === c ? "bg-[#B3985B] border-[#B3985B] text-black" : "bg-[#0d0d0d] border-[#2a2a2a] text-[#666] hover:text-white"}`}>
                  {CANAL_ICON[c]} {CANAL_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[#2a2a2a] text-[#555] hover:text-white">
              Cancelar
            </button>
            <button onClick={save} disabled={saving || !fecha}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black">
              {saving ? "Guardando…" : "Reprogramar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ModalNuevo ────────────────────────────────────────────────────────────────

function ModalNuevo({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [tratos, setTratos] = useState<{ id: string; nombreEvento: string | null; cliente: { nombre: string } }[]>([]);
  const [tratoId, setTratoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  const [canal, setCanal] = useState("whatsapp");
  const [fecha, setFecha] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().substring(0, 10); });
  const [hora, setHora] = useState("10:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/tratos?etapa=DESCUBRIMIENTO,OPORTUNIDAD&limit=100")
      .then(r => r.ok ? r.json() : { tratos: [] })
      .then(d => setTratos(d.tratos ?? []));
  }, []);

  async function save() {
    if (!tratoId || !titulo) return;
    setSaving(true);
    await fetch("/api/seguimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tratoId, titulo, nota, canal, fechaProgramada: new Date(`${fecha}T${hora}:00`).toISOString() }),
    });
    setSaving(false);
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ms-card rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Nuevo seguimiento</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Trato</label>
            <select value={tratoId} onChange={e => setTratoId(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
              <option value="">Seleccionar trato…</option>
              {tratos.map(t => (
                <option key={t.id} value={t.id}>{t.cliente.nombre}{t.nombreEvento ? ` · ${t.nombreEvento}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Título</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="ej: Llamar para confirmar fecha"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Hora</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          <div>
            <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Canal</label>
            <div className="flex gap-2">
              {["whatsapp", "llamada", "reunion"].map(c => (
                <button key={c} onClick={() => setCanal(c)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${canal === c ? "bg-[#B3985B] border-[#B3985B] text-black" : "bg-[#0d0d0d] border-[#2a2a2a] text-[#666] hover:text-white"}`}>
                  {CANAL_ICON[c]} {CANAL_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[#555] text-[10px] uppercase tracking-wider block mb-1.5">Nota (opcional)</label>
            <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
          </div>
          <button onClick={save} disabled={saving || !tratoId || !titulo}
            className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold py-2.5 rounded-xl text-sm">
            {saving ? "Guardando…" : "Agregar seguimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SeguimientoRow ────────────────────────────────────────────────────────────

function SeguimientoRow({ s, onComplete, onReprogramar, onDelete }: {
  s: Seguimiento;
  onComplete: (id: string, nota: string) => void;
  onReprogramar: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [completando, setCompletando] = useState(false);
  const [nota, setNota] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (completando) inputRef.current?.focus(); }, [completando]);

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy); mañana.setDate(hoy.getDate() + 1);
  const fSeg = new Date(s.fechaProgramada);
  const esVencido = !s.completado && fSeg < hoy;
  const esHoy = !s.completado && fSeg >= hoy && fSeg < mañana;

  const dotColor = s.completado ? "bg-green-500" : esVencido ? "bg-red-500" : esHoy ? "bg-yellow-400" : "bg-[#333]";

  if (completando) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#111] bg-[#161616]">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        <input ref={inputRef} value={nota} onChange={e => setNota(e.target.value)}
          placeholder="Nota del resultado (opcional)…"
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
          onKeyDown={e => {
            if (e.key === "Enter") { onComplete(s.id, nota); setCompletando(false); }
            if (e.key === "Escape") setCompletando(false);
          }} />
        <button onClick={() => { onComplete(s.id, nota); setCompletando(false); }}
          className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded font-semibold whitespace-nowrap">
          Guardar ✓
        </button>
        <button onClick={() => setCompletando(false)} className="text-[#555] hover:text-white text-xs px-1">✕</button>
      </div>
    );
  }

  return (
    <div className={`group flex items-center border-b border-[#111] last:border-0 transition-colors ${s.completado ? "opacity-50 hover:opacity-70" : esVencido ? "hover:bg-red-950/10" : "hover:bg-[#0c0c0c]"}`}>

      {/* Dot */}
      <div className="w-8 shrink-0 flex justify-center py-3">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      </div>

      {/* COL 1 · Cliente */}
      <div className="flex-[2] min-w-0 py-2.5 pr-3">
        <p className={`text-[13px] font-semibold truncate leading-tight ${s.completado ? "text-[#555] line-through" : "text-white"}`}>
          {s.trato.cliente.nombre}
        </p>
        {s.trato.cliente.empresa && (
          <p className="text-[10px] text-[#3a3a3a] truncate mt-0.5">{s.trato.cliente.empresa}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          {s.trato.etapa && ETAPA_BADGE[s.trato.etapa] && (
            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${ETAPA_BADGE[s.trato.etapa].cls}`}>
              {ETAPA_BADGE[s.trato.etapa].label}
            </span>
          )}
          {etapaInternaLabel(s.trato.etapa, s.trato.etapaInterna) && (
            <span className="text-[9px] text-[#666] truncate">
              · {etapaInternaLabel(s.trato.etapa, s.trato.etapaInterna)}
            </span>
          )}
        </div>
        <div className="mt-1.5 max-w-[160px]">
          <EtapaInternaBar etapa={s.trato.etapa} etapaInterna={s.trato.etapaInterna} showLabel={false} />
        </div>
      </div>

      {/* COL 2 · Proyecto */}
      <div className="hidden sm:block flex-[2] min-w-0 pr-3 py-2.5">
        <p className="text-[12px] text-[#777] truncate leading-tight">
          {s.trato.nombreEvento || <span className="text-[#333] italic">Sin nombre de evento</span>}
        </p>
        <p className="text-[10px] text-[#444] mt-0.5 truncate">{s.titulo}</p>
      </div>

      {/* COL 3 · Canal */}
      <div className="hidden md:flex w-[90px] shrink-0 pr-3 items-center gap-1 py-2.5">
        <span className="text-sm">{CANAL_ICON[s.canal] ?? "📋"}</span>
        <span className="text-[11px] text-[#555]">{CANAL_LABEL[s.canal] ?? s.canal}</span>
      </div>

      {/* COL 4 · Fecha del seguimiento */}
      <div className="hidden lg:block w-[120px] shrink-0 pr-3 py-2.5">
        <span className={`text-[11px] font-medium leading-tight block ${esVencido ? "text-red-400" : esHoy ? "text-yellow-400" : "text-[#666]"}`}>
          {fmtFechaMedia(s.fechaProgramada)}
        </span>
        {esVencido && <span className="text-[9px] text-red-500/60 mt-0.5 block">vencido</span>}
        {esHoy && <span className="text-[9px] text-yellow-500/70 mt-0.5 block">hoy</span>}
      </div>

      {/* COL 5 · Fecha del evento */}
      <div className="hidden xl:block w-[95px] shrink-0 pr-3 py-2.5">
        <span className="text-[11px] text-[#555]">{fmtFechaCorta(s.trato.fechaEventoEstimada)}</span>
      </div>

      {/* COL 6 · Estado */}
      <div className="hidden md:flex w-[90px] shrink-0 pr-3 py-2.5 items-center">
        {s.completado ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-900/30">Completado</span>
        ) : esVencido ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-900/30">Vencido</span>
        ) : esHoy ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-900/30">Hoy</span>
        ) : (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#555] border border-[#2a2a2a]">Pendiente</span>
        )}
      </div>

      {/* Acciones hover */}
      <div className="flex items-center gap-1 w-[116px] shrink-0 justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {!s.completado && (
          <button onClick={() => setCompletando(true)}
            className="text-[10px] px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-green-400 hover:border-green-900/40 transition-colors whitespace-nowrap">
            ✓ Hecho
          </button>
        )}
        {!s.completado && (
          <button onClick={() => onReprogramar(s.id)}
            title="Reprogramar"
            className="text-[11px] px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-colors">
            ↻
          </button>
        )}
        <Link href={`/crm/tratos/${s.tratoId}`}
          className="text-[10px] px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] transition-colors">
          →
        </Link>
        <button onClick={() => onDelete(s.id)}
          className="text-[#222] hover:text-red-500/60 transition-colors p-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── MesSection ────────────────────────────────────────────────────────────────

function MesSection({ mesLabel, activos, pasados, onComplete, onReprogramar, onDelete }: {
  mesLabel: string;
  activos: Seguimiento[];
  pasados: Seguimiento[];
  onComplete: (id: string, nota: string) => void;
  onReprogramar: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const total = activos.length + pasados.length;

  return (
    <div className="mb-4">
      <button onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-3 w-full text-left py-2 mb-0 group">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B3985B] capitalize">
          {mesLabel}
        </h2>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#B3985B]/10 border border-[#B3985B]/20 text-[#B3985B] font-semibold">
          {total}
        </span>
        <div className="flex-1 h-px bg-[#1a1a1a]" />
        <svg className={`w-3 h-3 text-[#444] transition-transform ${collapsed ? "" : "rotate-180"}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>

      {!collapsed && (
        <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
          {activos.length > 0 && (
            <>
              {pasados.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-[#0a0a0a] border-b border-[#111]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B3985B]/60 shrink-0" />
                  <span className="text-[9px] text-[#555] uppercase tracking-wider font-semibold">Activos · {activos.length}</span>
                </div>
              )}
              {activos.map(s => (
                <SeguimientoRow key={s.id} s={s} onComplete={onComplete} onReprogramar={onReprogramar} onDelete={onDelete} />
              ))}
            </>
          )}
          {pasados.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#0a0a0a] border-b border-[#111] border-t border-t-[#151515]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#333] shrink-0" />
                <span className="text-[9px] text-[#444] uppercase tracking-wider font-semibold">Pasados · {pasados.length}</span>
              </div>
              {pasados.map(s => (
                <SeguimientoRow key={s.id} s={s} onComplete={onComplete} onReprogramar={onReprogramar} onDelete={onDelete} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function SeguimientosPage() {
  const [todos, setTodos] = useState<Seguimiento[]>([]);
  const [sinMovimiento, setSinMovimiento] = useState<TratoSinMovimiento[]>([]);
  const [enRevision, setEnRevision] = useState<TratoEnRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [reprogramandoId, setReprogramandoId] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"pendientes" | "completados" | "todos">("pendientes");
  const [busqueda, setBusqueda] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resAll, sinMov, revision] = await Promise.all([
        fetch("/api/seguimientos").then(r => r.json()),
        fetch("/api/tratos/sin-seguimiento").then(r => r.json()).catch(() => ({ tratos: [] })),
        fetch("/api/tratos/en-revision").then(r => r.json()).catch(() => ({ tratos: [] })),
      ]);
      setTodos(resAll.seguimientos ?? []);
      setSinMovimiento(sinMov.tratos ?? []);
      setEnRevision(revision.tratos ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleComplete(id: string, nota: string) {
    await fetch(`/api/seguimientos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completado: true, notaResultado: nota || null }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este seguimiento?")) return;
    await fetch(`/api/seguimientos/${id}`, { method: "DELETE" });
    load();
  }

  // ── Filtrado ────────────────────────────────────────────────────────────────
  const filtrados = todos.filter(s => {
    if (filtroEstado === "pendientes" && s.completado) return false;
    if (filtroEstado === "completados" && !s.completado) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!s.trato.cliente.nombre.toLowerCase().includes(q) && !(s.trato.nombreEvento ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Agrupación por mes de fechaEventoEstimada ───────────────────────────────────────
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const conFecha = filtrados.filter(s => s.trato.fechaEventoEstimada);
  const sinFecha = filtrados.filter(s => !s.trato.fechaEventoEstimada);

  const grupos = new Map<string, { label: string; activos: Seguimiento[]; pasados: Seguimiento[] }>();
  for (const s of conFecha) {
    const key = mesKey(s.trato.fechaEventoEstimada!);
    if (!grupos.has(key)) grupos.set(key, { label: fmtMes(s.trato.fechaEventoEstimada!), activos: [], pasados: [] });
    const g = grupos.get(key)!;
    new Date(s.trato.fechaEventoEstimada!) >= hoy ? g.activos.push(s) : g.pasados.push(s);
  }
  for (const g of grupos.values()) {
    g.activos.sort((a, b) => new Date(a.trato.fechaEventoEstimada!).getTime() - new Date(b.trato.fechaEventoEstimada!).getTime());
    g.pasados.sort((a, b) => new Date(b.trato.fechaEventoEstimada!).getTime() - new Date(a.trato.fechaEventoEstimada!).getTime());
  }
  const gruposOrdenados = Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b));

  // ── Métricas ────────────────────────────────────────────────────────────────
  const pendientesTotales = todos.filter(s => !s.completado).length;
  const vencidos = todos.filter(s => !s.completado && new Date(s.fechaProgramada) < hoy).length;
  const hoyCount = todos.filter(s => {
    const f = new Date(s.fechaProgramada);
    const m = new Date(hoy); m.setDate(hoy.getDate() + 1);
    return !s.completado && f >= hoy && f < m;
  }).length;

  const ESTADO_PILLS = [
    { key: "pendientes", label: `Pendientes${pendientesTotales > 0 ? ` (${pendientesTotales})` : ""}` },
    { key: "completados", label: "Completados" },
    { key: "todos", label: "Todos" },
  ] as const;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="ms-h1">Seguimientos</h1>
          <p className="ms-subtitle">
            {!loading && (
              <>
                {vencidos > 0 && <span className="text-red-400 font-medium">{vencidos} vencidos · </span>}
                {hoyCount > 0 && <span className="text-[#B3985B] font-medium">{hoyCount} hoy · </span>}
                <span>{pendientesTotales} pendientes</span>
              </>
            )}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="ms-btn-primary">
          + Seguimiento
        </button>
      </div>

      {/* Métricas */}
      {!loading && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-5">
          {[
            { label: "Vencidos", val: vencidos, color: vencidos > 0 ? "text-red-400" : "text-green-400", bg: vencidos > 0 ? "bg-red-900/10 border-red-900/30" : "bg-green-900/10 border-green-900/30" },
            { label: "Hoy", val: hoyCount, color: "text-[#B3985B]", bg: "bg-[#B3985B]/10 border-[#B3985B]/20" },
            { label: "Pendientes", val: pendientesTotales, color: "text-[#6b7280]", bg: "bg-[#111] border-[#1e1e1e]" },
            { label: "Sin movimiento", val: sinMovimiento.length, color: sinMovimiento.length > 0 ? "text-orange-400" : "text-[#444]", bg: sinMovimiento.length > 0 ? "bg-orange-900/10 border-orange-900/30" : "bg-[#111] border-[#1e1e1e]" },
            { label: "En revisión", val: enRevision.length, color: enRevision.length > 0 ? "text-purple-400" : "text-[#444]", bg: enRevision.length > 0 ? "bg-purple-900/10 border-purple-900/30" : "bg-[#111] border-[#1e1e1e]" },
          ].map(m => (
            <div key={m.label} className={`${m.bg} border rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-bold ${m.color}`}>{m.val}</p>
              <p className="text-[#555] text-[10px] mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex gap-1 ms-card p-1">
          {ESTADO_PILLS.map(p => (
            <button key={p.key} onClick={() => setFiltroEstado(p.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filtroEstado === p.key ? "bg-[#B3985B] text-black" : "text-[#555] hover:text-white"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar cliente o proyecto…"
            className="w-full pl-9 pr-8 py-2 bg-[#111] border border-[#1e1e1e] rounded-lg text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50 transition-colors" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-[#444] text-sm">Cargando seguimientos…</div>
      ) : filtrados.length === 0 ? (
        <div className="py-16 text-center border border-[#1a1a1a] border-dashed rounded-xl">
          <p className="text-[#444] text-sm">{busqueda ? "Sin resultados para esa búsqueda" : "No hay seguimientos en esta vista"}</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="hidden md:flex items-center px-0 mb-1 text-[9px] uppercase tracking-[0.14em] text-[#2a2a2a]">
            <div className="w-8 shrink-0" />
            <div className="flex-[2] min-w-0 pr-3">Cliente</div>
            <div className="hidden sm:block flex-[2] min-w-0 pr-3">Proyecto</div>
            <div className="hidden md:block w-[90px] shrink-0 pr-3">Canal</div>
            <div className="hidden lg:block w-[120px] shrink-0 pr-3">F. seguimiento</div>
            <div className="hidden xl:block w-[95px] shrink-0 pr-3">F. evento</div>
            <div className="hidden md:block w-[90px] shrink-0 pr-3">Estado</div>
            <div className="w-[116px] shrink-0" />
          </div>

          {/* Grupos por mes */}
          {gruposOrdenados.map(([key, g]) =>
            (g.activos.length > 0 || g.pasados.length > 0) ? (
              <MesSection
                key={key}
                mesLabel={g.label}
                activos={g.activos}
                pasados={g.pasados}
                onComplete={handleComplete}
                onReprogramar={id => setReprogramandoId(id)}
                onDelete={handleDelete}
              />
            ) : null
          )}

          {/* Sin fecha de evento */}
          {sinFecha.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-3 py-2 mb-0">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#555]">Sin fecha de evento</h2>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] font-semibold">{sinFecha.length}</span>
                <div className="flex-1 h-px bg-[#1a1a1a]" />
              </div>
              <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
                {sinFecha.map(s => (
                  <SeguimientoRow key={s.id} s={s}
                    onComplete={handleComplete}
                    onReprogramar={id => setReprogramandoId(id)}
                    onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modales */}
      {showModal && <ModalNuevo onClose={() => setShowModal(false)} onSave={load} />}
      {reprogramandoId && (
        <ModalReprogramar
          segId={reprogramandoId}
          onClose={() => setReprogramandoId(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
