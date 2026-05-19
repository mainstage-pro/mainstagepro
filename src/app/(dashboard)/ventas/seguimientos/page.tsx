"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Trato = { id: string; nombreEvento: string | null; cliente: { nombre: string; empresa: string | null } };

type Seguimiento = {
  id: string;
  tipo: string;
  numero: number | null;
  canal: string;
  titulo: string;
  nota: string | null;
  notaResultado: string | null;
  fechaProgramada: string;
  fechaCompletado: string | null;
  completado: boolean;
  tratoId: string;
  trato: Trato;
};

type TratoEnRevision = {
  id: string;
  etapa: string;
  nombreEvento: string | null;
  createdAt: string;
  clienteNombre: string;
  clienteEmpresa: string | null;
};

type TratoSinMovimiento = {
  id: string;
  etapa: string;
  nombreEvento: string | null;
  createdAt: string;
  etapaCambiadaEn: string | null;
  cliente: { nombre: string; empresa: string | null };
  seguimientos: { fechaCompletado: string | null }[];
};

function nextTuesdayOrThursday() {
  const d = new Date();
  const day = d.getDay();
  const daysUntilTue = (2 - day + 7) % 7 || 7;
  const daysUntilThu = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + Math.min(daysUntilTue, daysUntilThu));
  return d.toISOString().substring(0, 10);
}

function fmtDias(isoDate: string) {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

const CANAL_ICON: Record<string, string> = {
  whatsapp: "📱",
  llamada: "📞",
  reunion: "🤝",
};

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  llamada: "Llamada",
  reunion: "Reunión",
};

function fmtFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function BadgeTipo({ tipo, numero }: { tipo: string; numero: number | null }) {
  if (tipo === "auto" && numero) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-800/40 font-semibold">
        Seg {numero}
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#666] border border-[#2a2a2a] font-semibold">
      Manual
    </span>
  );
}

function TratoRevisionCard({ t, onResuelto }: { t: TratoEnRevision; onResuelto: () => void }) {
  const [loading, setLoading] = useState(false);

  async function resolver(accion: "continuar" | "nurturing" | "perder") {
    setLoading(true);
    await fetch("/api/tratos/en-revision", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tratoId: t.id, accion }),
    });
    setLoading(false);
    onResuelto();
  }

  return (
    <div className="bg-[#111] border border-orange-900/30 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-900/20 text-orange-400 border border-orange-900/30 font-semibold">
              En revisión
            </span>
            <span className="text-[10px] text-[#555] uppercase tracking-wider">
              {t.etapa === "DESCUBRIMIENTO" ? "Descubrimiento" : "Oportunidad"}
            </span>
          </div>
          <p className="text-white text-sm font-medium">{t.clienteNombre}</p>
          {t.nombreEvento && <p className="text-[#666] text-xs">{t.nombreEvento}</p>}
        </div>
        <Link href={`/crm/tratos/${t.id}`} className="text-[#B3985B] text-xs hover:underline shrink-0">Ver →</Link>
      </div>
      <p className="text-[#666] text-xs mb-3">Los 3 seguimientos automáticos se completaron sin cierre. ¿Qué hacemos con este trato?</p>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => resolver("continuar")}
          disabled={loading}
          className="flex-1 min-w-[80px] py-1.5 rounded-lg text-xs font-semibold bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:border-[#B3985B] transition-colors disabled:opacity-40"
        >
          Continuar prospecto
        </button>
        <button
          onClick={() => resolver("nurturing")}
          disabled={loading}
          className="flex-1 min-w-[80px] py-1.5 rounded-lg text-xs font-semibold bg-[#1a1a1a] border border-[#2a2a2a] text-blue-400 hover:border-blue-700 transition-colors disabled:opacity-40"
        >
          Pasar a nurturing
        </button>
        <button
          onClick={() => resolver("perder")}
          disabled={loading}
          className="flex-1 min-w-[80px] py-1.5 rounded-lg text-xs font-semibold bg-[#1a1a1a] border border-[#2a2a2a] text-red-400 hover:border-red-700 transition-colors disabled:opacity-40"
        >
          Marcar perdido
        </button>
      </div>
    </div>
  );
}

function SinMovimientoCard({ t }: { t: TratoSinMovimiento }) {
  const refDate = t.seguimientos[0]?.fechaCompletado ?? t.etapaCambiadaEn ?? t.createdAt;
  const dias = fmtDias(refDate);
  return (
    <Link
      href={`/crm/tratos/${t.id}`}
      className="flex items-center gap-4 bg-[#111] border border-red-900/30 rounded-xl p-4 hover:border-red-700/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/20 text-red-400 border border-red-900/30 font-semibold">
            Sin seguimiento
          </span>
          <span className="text-[10px] text-[#555] uppercase tracking-wider">
            {t.etapa === "DESCUBRIMIENTO" ? "Descubrimiento" : "Oportunidad"}
          </span>
        </div>
        <p className="text-white text-sm font-medium truncate">{t.cliente.nombre}</p>
        {t.nombreEvento && <p className="text-[#666] text-xs truncate">{t.nombreEvento}</p>}
        {t.seguimientos[0]?.fechaCompletado && (
          <p className="text-[#444] text-[11px] mt-1">Último contacto: {fmtFechaCorta(t.seguimientos[0].fechaCompletado)}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-red-400 text-xl font-bold">{dias}d</p>
        <p className="text-[#555] text-[10px]">sin contacto</p>
      </div>
    </Link>
  );
}

function ModalPropuesta({
  tratoId,
  fecha,
  setFecha,
  canal,
  setCanal,
  onSave,
  onSkip,
}: {
  tratoId: string;
  fecha: string;
  setFecha: (f: string) => void;
  canal: string;
  setCanal: (c: string) => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!fecha) return;
    setSaving(true);
    await fetch("/api/seguimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tratoId,
        titulo: "Seguimiento",
        canal,
        fechaProgramada: new Date(`${fecha}T10:00:00`).toISOString(),
      }),
    });
    setSaving(false);
    onSave();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onSkip()}
    >
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 w-full max-w-sm">
        <p className="text-white font-semibold mb-1">¿Agendar siguiente contacto?</p>
        <p className="text-[#666] text-xs mb-5">Se sugiere el próximo martes o jueves.</p>

        <div className="space-y-4">
          <div>
            <label className="text-[#666] text-xs uppercase tracking-wider block mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>

          <div>
            <label className="text-[#666] text-xs uppercase tracking-wider block mb-1">Canal</label>
            <div className="flex gap-2">
              {["whatsapp", "llamada", "reunion"].map(c => (
                <button
                  key={c}
                  onClick={() => setCanal(c)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    canal === c
                      ? "bg-[#B3985B] border-[#B3985B] text-black"
                      : "bg-[#0d0d0d] border-[#2a2a2a] text-[#666] hover:text-white"
                  }`}
                >
                  {CANAL_ICON[c]} {CANAL_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onSkip}
              className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[#2a2a2a] text-[#555] hover:text-white transition-colors"
            >
              Omitir
            </button>
            <button
              onClick={save}
              disabled={saving || !fecha}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black transition-colors"
            >
              {saving ? "…" : "Agendar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeguimientoCard({
  seg,
  onComplete,
  onDelete,
}: {
  seg: Seguimiento;
  onComplete: (id: string, nota: string) => void;
  onDelete: (id: string) => void;
}) {
  const [marcando, setMarcando] = useState(false);
  const [notaRes, setNotaRes] = useState("");

  return (
    <div className={`bg-[#111] border border-[#1e1e1e] rounded-xl p-4 flex gap-4 ${seg.completado ? "opacity-50" : ""}`}>
      {/* Canal icon */}
      <div className="text-xl shrink-0 mt-0.5">{CANAL_ICON[seg.canal] ?? "📋"}</div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <BadgeTipo tipo={seg.tipo} numero={seg.numero} />
          <span className="text-[10px] text-[#555] uppercase tracking-wider">{CANAL_LABEL[seg.canal] ?? seg.canal}</span>
        </div>

        <p className="text-white text-sm font-medium mb-0.5">{seg.titulo}</p>

        {/* Cliente / trato */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[#B3985B] text-xs font-medium">{seg.trato.cliente.nombre}</span>
          {seg.trato.nombreEvento && (
            <>
              <span className="text-[#333] text-xs">·</span>
              <span className="text-[#666] text-xs truncate">{seg.trato.nombreEvento}</span>
            </>
          )}
        </div>

        {/* Nota */}
        {seg.nota && !seg.nota.startsWith("Seguimiento automático") && (
          <p className="text-[#6b7280] text-xs mb-2 italic">{seg.nota}</p>
        )}

        {/* Fecha */}
        <p className="text-[#555] text-[11px] mb-3">{fmtFecha(seg.fechaProgramada)}</p>

        {/* Nota resultado si ya completado */}
        {seg.completado && seg.notaResultado && (
          <p className="text-green-400/70 text-xs italic mb-2">✓ {seg.notaResultado}</p>
        )}

        {/* Acciones */}
        {!seg.completado && (
          <>
            {marcando ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={notaRes}
                  onChange={e => setNotaRes(e.target.value)}
                  placeholder="Nota del resultado (opcional)"
                  className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                  onKeyDown={e => { if (e.key === "Enter") onComplete(seg.id, notaRes); if (e.key === "Escape") setMarcando(false); }}
                />
                <button
                  onClick={() => onComplete(seg.id, notaRes)}
                  className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded font-semibold transition-colors"
                >
                  Guardar
                </button>
                <button onClick={() => setMarcando(false)} className="text-xs text-[#555] hover:text-white transition-colors">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMarcando(true)}
                  className="text-xs bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  ✓ Marcar hecho
                </button>
                <Link
                  href={`/crm/tratos/${seg.tratoId}`}
                  className="text-xs text-[#B3985B] hover:underline"
                >
                  Ver trato →
                </Link>
                <button
                  onClick={() => onDelete(seg.id)}
                  className="text-xs text-[#333] hover:text-red-400 transition-colors ml-auto"
                >
                  ✕
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GroupSection({
  title,
  color,
  segs,
  onComplete,
  onDelete,
}: {
  title: string;
  color: string;
  segs: Seguimiento[];
  onComplete: (id: string, nota: string) => void;
  onDelete: (id: string) => void;
}) {
  if (segs.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{title}</h2>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${color} bg-current bg-opacity-10 border border-current border-opacity-20`} style={{ opacity: 1 }}>
          {segs.length}
        </span>
        <div className="flex-1 h-px bg-[#1a1a1a]" />
      </div>
      <div className="space-y-2 mb-6">
        {segs.map(s => (
          <SeguimientoCard key={s.id} seg={s} onComplete={onComplete} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// Modal para agregar seguimiento manual
function ModalNuevo({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [tratos, setTratos] = useState<{ id: string; nombreEvento: string | null; cliente: { nombre: string } }[]>([]);
  const [tratoId, setTratoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  const [canal, setCanal] = useState("whatsapp");
  const [fecha, setFecha] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().substring(0, 10);
  });
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
    const fechaProgramada = new Date(`${fecha}T${hora}:00`);
    await fetch("/api/seguimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tratoId, titulo, nota, canal, fechaProgramada: fechaProgramada.toISOString() }),
    });
    setSaving(false);
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Nuevo seguimiento manual</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[#666] text-xs uppercase tracking-wider block mb-1">Trato</label>
            <select
              value={tratoId}
              onChange={e => setTratoId(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            >
              <option value="">Seleccionar trato…</option>
              {tratos.map(t => (
                <option key={t.id} value={t.id}>
                  {t.cliente.nombre}{t.nombreEvento ? ` · ${t.nombreEvento}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[#666] text-xs uppercase tracking-wider block mb-1">Título</label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="ej: Llamar para confirmar fecha"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[#666] text-xs uppercase tracking-wider block mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <div>
              <label className="text-[#666] text-xs uppercase tracking-wider block mb-1">Hora</label>
              <input
                type="time"
                value={hora}
                onChange={e => setHora(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>
          </div>

          <div>
            <label className="text-[#666] text-xs uppercase tracking-wider block mb-1">Canal</label>
            <div className="flex gap-2">
              {["whatsapp", "llamada", "reunion"].map(c => (
                <button
                  key={c}
                  onClick={() => setCanal(c)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${canal === c ? "bg-[#B3985B] border-[#B3985B] text-black" : "bg-[#0d0d0d] border-[#2a2a2a] text-[#666] hover:text-white"}`}
                >
                  {CANAL_ICON[c]} {CANAL_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[#666] text-xs uppercase tracking-wider block mb-1">Nota (opcional)</label>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={2}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
            />
          </div>

          <button
            onClick={save}
            disabled={saving || !tratoId || !titulo}
            className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving ? "Guardando…" : "Agregar seguimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SeguimientosPage() {
  const [todos, setTodos] = useState<Seguimiento[]>([]);
  const [sinMovimiento, setSinMovimiento] = useState<TratoSinMovimiento[]>([]);
  const [enRevision, setEnRevision] = useState<TratoEnRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [propuestaSig, setPropuestaSig] = useState<{ segId: string; tratoId: string } | null>(null);
  const [propuestaFecha, setPropuestaFecha] = useState("");
  const [propuestaCanal, setPropuestaCanal] = useState("whatsapp");

  const load = useCallback(async () => {
    const urls = [
      "/api/seguimientos?filtro=vencidos",
      "/api/seguimientos?filtro=hoy",
      "/api/seguimientos?filtro=semana",
      "/api/seguimientos?filtro=completados-hoy",
    ];
    const [results, sinMov, revision] = await Promise.all([
      Promise.all(urls.map(u => fetch(u).then(r => r.json()))),
      fetch("/api/tratos/sin-seguimiento").then(r => r.json()).catch(() => ({ tratos: [] })),
      fetch("/api/tratos/en-revision").then(r => r.json()).catch(() => ({ tratos: [] })),
    ]);
    const combined: Seguimiento[] = [
      ...results[0].seguimientos,
      ...results[1].seguimientos,
      ...results[2].seguimientos,
      ...results[3].seguimientos,
    ];
    // Dedup
    const seen = new Set<string>();
    setTodos(combined.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; }));
    setSinMovimiento(sinMov.tratos ?? []);
    setEnRevision(revision.tratos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleComplete(id: string, notaResultado: string) {
    await fetch(`/api/seguimientos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completado: true, notaResultado: notaResultado || null }),
    });
    const seg = todos.find(s => s.id === id);
    if (seg) {
      setPropuestaSig({ segId: id, tratoId: seg.tratoId });
      setPropuestaFecha(nextTuesdayOrThursday());
      setPropuestaCanal("whatsapp");
    }
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/seguimientos/${id}`, { method: "DELETE" });
    load();
  }

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const semana = new Date(hoy); semana.setDate(hoy.getDate() + 7);

  const vencidos       = todos.filter(s => !s.completado && new Date(s.fechaProgramada) < hoy);
  const hoySegs        = todos.filter(s => !s.completado && new Date(s.fechaProgramada) >= hoy && new Date(s.fechaProgramada) < manana);
  const semanaSegs     = todos.filter(s => !s.completado && new Date(s.fechaProgramada) >= manana && new Date(s.fechaProgramada) < semana);
  const completadosHoy = todos.filter(s => s.completado);

  // Filtro por tipo
  const filtrados = (segs: Seguimiento[]) => {
    if (filtro === "todos" || filtro === "vencidos" || filtro === "hoy" || filtro === "semana") return segs;
    if (filtro === "auto") return segs.filter(s => s.tipo === "auto");
    if (filtro === "manual") return segs.filter(s => s.tipo === "manual");
    return segs;
  };

  // Filtro global por pill
  const filtroSecciones = () => {
    if (filtro === "vencidos") return { vencidos, hoy: [], semana: [], comp: [] };
    if (filtro === "hoy") return { vencidos: [], hoy: hoySegs, semana: [], comp: [] };
    if (filtro === "semana") return { vencidos: [], hoy: [], semana: semanaSegs, comp: [] };
    return {
      vencidos: filtrados(vencidos),
      hoy: filtrados(hoySegs),
      semana: filtrados(semanaSegs),
      comp: filtrados(completadosHoy),
    };
  };
  const { vencidos: vSec, hoy: hSec, semana: sSec, comp: cSec } = filtroSecciones();

  const total = vencidos.length + hoySegs.length + semanaSegs.length;

  const PILLS = [
    { key: "todos", label: "Todos" },
    { key: "vencidos", label: `Vencidos${vencidos.length > 0 ? ` (${vencidos.length})` : ""}` },
    { key: "hoy", label: `Hoy${hoySegs.length > 0 ? ` (${hoySegs.length})` : ""}` },
    { key: "semana", label: "Esta semana" },
    { key: "auto", label: "Automáticos" },
    { key: "manual", label: "Manuales" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Seguimientos</h1>
        {!loading && (
          <p className="text-[#555] text-sm flex flex-wrap gap-x-1">
            {vencidos.length > 0 && <span className="text-red-400 font-medium">{vencidos.length} vencidos</span>}
            {vencidos.length > 0 && hoySegs.length > 0 && <span className="text-[#333]">·</span>}
            {hoySegs.length > 0 && <span className="text-[#B3985B] font-medium">{hoySegs.length} hoy</span>}
            {(vencidos.length > 0 || hoySegs.length > 0) && semanaSegs.length > 0 && <span className="text-[#333]">·</span>}
            {semanaSegs.length > 0 && <span className="text-[#6b7280]">{semanaSegs.length} esta semana</span>}
            {sinMovimiento.length > 0 && (
              <>
                {(vencidos.length > 0 || hoySegs.length > 0 || semanaSegs.length > 0) && <span className="text-[#333]">·</span>}
                <span className="text-red-400 font-medium">{sinMovimiento.length} sin movimiento</span>
              </>
            )}
            {total === 0 && sinMovimiento.length === 0 && <span className="text-green-400">Todo al día ✓</span>}
          </p>
        )}
      </div>

      {/* Métricas */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Vencidos", val: vencidos.length, color: "text-red-400", bg: "bg-red-900/10 border-red-900/30" },
            { label: "Hoy", val: hoySegs.length, color: "text-[#B3985B]", bg: "bg-[#B3985B]/10 border-[#B3985B]/20" },
            { label: "Esta semana", val: semanaSegs.length, color: "text-blue-400", bg: "bg-blue-900/10 border-blue-900/30" },
            { label: "Total activos", val: total, color: "text-[#6b7280]", bg: "bg-[#111] border-[#1e1e1e]" },
          ].map(m => (
            <div key={m.label} className={`${m.bg} border rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-bold ${m.color}`}>{m.val}</p>
              <p className="text-[#555] text-[11px] mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-6">
        {PILLS.map(p => (
          <button
            key={p.key}
            onClick={() => setFiltro(p.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
              filtro === p.key
                ? "bg-[#B3985B] border-[#B3985B] text-black"
                : "bg-[#111] border-[#222] text-[#666] hover:text-white hover:border-[#333]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[#555] text-sm text-center py-12">Cargando seguimientos…</div>
      ) : (
        <>
          <GroupSection title="Vencidos" color="text-red-400" segs={vSec} onComplete={handleComplete} onDelete={handleDelete} />
          <GroupSection title="Hoy" color="text-[#B3985B]" segs={hSec} onComplete={handleComplete} onDelete={handleDelete} />
          <GroupSection title="Esta semana" color="text-blue-400" segs={sSec} onComplete={handleComplete} onDelete={handleDelete} />
          <GroupSection title="Completados hoy" color="text-green-400" segs={cSec} onComplete={handleComplete} onDelete={handleDelete} />

          {/* Bloque 7 — tratos en revisión (3 seguimientos auto sin cierre) */}
          {enRevision.length > 0 && filtro === "todos" && (
            <div className="mt-2">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-orange-400">Requieren decisión</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-orange-400 bg-orange-900/20 border border-orange-900/30">
                  {enRevision.length}
                </span>
                <div className="flex-1 h-px bg-[#1a1a1a]" />
              </div>
              <div className="space-y-2 mb-6">
                {enRevision.map(t => (
                  <TratoRevisionCard key={t.id} t={t} onResuelto={load} />
                ))}
              </div>
            </div>
          )}

          {/* Bloque 5 — tratos sin actividad en 7+ días */}
          {sinMovimiento.length > 0 && filtro === "todos" && (
            <div className="mt-2">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400">Sin seguimiento</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-red-400 bg-red-900/20 border border-red-900/30">
                  {sinMovimiento.length}
                </span>
                <div className="flex-1 h-px bg-[#1a1a1a]" />
              </div>
              <div className="space-y-2 mb-6">
                {sinMovimiento.map(t => (
                  <SinMovimientoCard key={t.id} t={t} />
                ))}
              </div>
            </div>
          )}

          {vSec.length === 0 && hSec.length === 0 && sSec.length === 0 && cSec.length === 0 && sinMovimiento.length === 0 && enRevision.length === 0 && (
            <div className="text-center py-16 text-[#333]">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-[#555]">Sin seguimientos en esta vista</p>
            </div>
          )}
        </>
      )}

      {/* Botón flotante */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-4 py-3 rounded-xl shadow-lg text-sm transition-colors"
        >
          + Seguimiento
        </button>
      </div>

      {showModal && <ModalNuevo onClose={() => setShowModal(false)} onSave={load} />}

      {/* Bloque 6 — propuesta de siguiente seguimiento */}
      {propuestaSig && (
        <ModalPropuesta
          tratoId={propuestaSig.tratoId}
          fecha={propuestaFecha}
          setFecha={setPropuestaFecha}
          canal={propuestaCanal}
          setCanal={setPropuestaCanal}
          onSave={() => { setPropuestaSig(null); load(); }}
          onSkip={() => setPropuestaSig(null)}
        />
      )}
    </div>
  );
}
