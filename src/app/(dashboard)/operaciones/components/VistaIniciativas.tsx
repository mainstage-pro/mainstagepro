"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Subtarea = { id: string; titulo: string; completada: boolean; orden: number; };
type IniciativaItem = {
  id: string;
  titulo: string;
  descripcion: string | null;
  area: string | null;
  responsable: string | null;
  estado: string;
  fechaLimite: string | null;
  notas: string | null;
  subtareas: Subtarea[];
  creadoEn: string;
  usuario: { id: string; name: string } | null;
};

const ESTADOS = [
  { key: null,            label: "Todas",        color: "#555" },
  { key: "en_ejecucion",  label: "En ejecución", color: "#22c55e" },
  { key: "planeando",     label: "Planeando",    color: "#a78bfa" },
  { key: "pausada",       label: "Pausadas",      color: "#555" },
  { key: "completada",    label: "Completadas",   color: "#22c55e" },
];

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  planeando:    { label: "Planeando",     color: "#a78bfa" },
  en_ejecucion: { label: "En ejecución",  color: "#22c55e" },
  pausada:      { label: "Pausada",       color: "#444" },
  completada:   { label: "Completada",    color: "#22c55e" },
};

const AREAS = ["DIRECCION", "ADMINISTRACION", "MARKETING", "VENTAS", "PRODUCCION"];
const AREA_LABELS: Record<string, string> = {
  DIRECCION: "Dirección", ADMINISTRACION: "Administración",
  MARKETING: "Marketing",  VENTAS: "Ventas", PRODUCCION: "Producción",
};

function progressColor(estado: string) {
  if (estado === "completada")    return "#22c55e";
  if (estado === "en_ejecucion")  return "#3b82f6";
  if (estado === "planeando")     return "#a78bfa";
  return "#444";
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
}

// ── Iniciativa Card ───────────────────────────────────────────────────────────
function IniciativaCard({
  ini,
  onRefresh,
}: {
  ini: IniciativaItem;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded]     = useState(false);
  const [hovered, setHovered]       = useState(false);
  const [nuevoSub, setNuevoSub]     = useState("");
  const [addingSub, setAddingSub]   = useState(false);
  const [notas, setNotas]           = useState(ini.notas ?? "");
  const notasTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subInputRef                 = useRef<HTMLInputElement>(null);

  const total     = ini.subtareas.length;
  const done      = ini.subtareas.filter(s => s.completada).length;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;

  async function toggleSub(s: Subtarea) {
    await fetch(`/api/iniciativas/${ini.id}/subtareas/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completada: !s.completada }),
    });
    onRefresh();
  }

  async function deleteSub(s: Subtarea) {
    await fetch(`/api/iniciativas/${ini.id}/subtareas/${s.id}`, { method: "DELETE" });
    onRefresh();
  }

  async function addSub() {
    if (!nuevoSub.trim()) return;
    setAddingSub(true);
    await fetch(`/api/iniciativas/${ini.id}/subtareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: nuevoSub.trim() }),
    });
    setNuevoSub("");
    setAddingSub(false);
    onRefresh();
    setTimeout(() => subInputRef.current?.focus(), 50);
  }

  async function changeEstado(estado: string) {
    await fetch(`/api/iniciativas/${ini.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    onRefresh();
  }

  function handleNotasChange(val: string) {
    setNotas(val);
    if (notasTimer.current) clearTimeout(notasTimer.current);
    notasTimer.current = setTimeout(() => {
      fetch(`/api/iniciativas/${ini.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas: val }),
      });
    }, 800);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${ini.titulo}"?`)) return;
    await fetch(`/api/iniciativas/${ini.id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div
      className="rounded-lg transition-all"
      style={{
        background: "#141414",
        border: `0.5px solid ${hovered ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.07)"}`,
        borderLeft: "2px solid #3b82f6",
        marginBottom: 6,
        overflow: "hidden",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Card Header ─── */}
      <div
        className="flex items-start gap-3 cursor-pointer"
        style={{ padding: "12px 14px" }}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12.5px] text-[#ddd] leading-snug">{ini.titulo}</p>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{
                background: `${ESTADO_CONFIG[ini.estado]?.color ?? "#555"}18`,
                color: ESTADO_CONFIG[ini.estado]?.color ?? "#555",
              }}
            >
              {ESTADO_CONFIG[ini.estado]?.label ?? ini.estado}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {ini.area && (
              <span className="text-[10px] text-[#555] px-1.5 py-0.5 rounded bg-[#1a1a1a]">
                {AREA_LABELS[ini.area] ?? ini.area}
              </span>
            )}
            {ini.responsable && (
              <span className="text-[10.5px] text-[#555]">👤 {ini.responsable}</span>
            )}
            {ini.fechaLimite && (
              <span className="text-[10.5px] text-[#555]">📅 {formatDate(ini.fechaLimite)}</span>
            )}
          </div>
          {/* Progress bar */}
          {total > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-[3px] rounded-full" style={{ background: "#222" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: progressColor(ini.estado) }}
                />
              </div>
              <span className="text-[10px] text-[#555]">{done}/{total}</span>
            </div>
          )}
        </div>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"
          className="shrink-0 mt-0.5 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* ── Expanded ─── */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.04]" onClick={e => e.stopPropagation()}>

          {/* Estado inline */}
          <div className="flex items-center gap-1.5 mt-3 mb-3">
            <span className="text-[10.5px] text-[#444]">Estado:</span>
            {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
              <button
                key={k}
                onClick={() => changeEstado(k)}
                className="px-2 py-0.5 rounded text-[10.5px] transition-all"
                style={{
                  background: ini.estado === k ? `${v.color}18` : "transparent",
                  color: ini.estado === k ? v.color : "#444",
                  border: `1px solid ${ini.estado === k ? `${v.color}30` : "#1e1e1e"}`,
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Descripcion */}
          {ini.descripcion && (
            <p className="text-[12px] text-[#666] mb-3 leading-relaxed">{ini.descripcion}</p>
          )}

          {/* Subtareas */}
          <p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest mb-2">Subtareas</p>
          <div className="space-y-1 mb-2">
            {ini.subtareas.map(s => (
              <div key={s.id} className="flex items-center gap-2 group/sub">
                <button
                  onClick={() => toggleSub(s)}
                  className="shrink-0 flex items-center justify-center rounded-full border transition-all"
                  style={{
                    width: 16, height: 16,
                    borderColor: s.completada ? "#3b82f6" : "rgba(255,255,255,0.14)",
                    background: s.completada ? "#3b82f620" : "transparent",
                  }}
                >
                  {s.completada && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
                <span
                  className="flex-1 text-[12px] leading-snug"
                  style={{ color: s.completada ? "#444" : "#bbb", textDecoration: s.completada ? "line-through" : "none" }}
                >
                  {s.titulo}
                </span>
                <button
                  onClick={() => deleteSub(s)}
                  className="opacity-0 group-hover/sub:opacity-100 text-[#333] hover:text-[#777] transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add subtarea */}
          <div className="flex items-center gap-2 mt-1">
            <input
              ref={subInputRef}
              value={nuevoSub}
              onChange={e => setNuevoSub(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addSub(); }}
              placeholder="+ Agregar subtarea"
              className="flex-1 bg-transparent text-[12px] text-[#aaa] placeholder-[#2a2a2a] focus:outline-none"
            />
            {nuevoSub && (
              <button
                onClick={addSub}
                disabled={addingSub}
                className="text-[11px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
              >
                {addingSub ? "…" : "Agregar"}
              </button>
            )}
          </div>

          {/* Notas */}
          <p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest mt-3 mb-1.5">Notas</p>
          <textarea
            value={notas}
            onChange={e => handleNotasChange(e.target.value)}
            placeholder="Notas libres…"
            rows={3}
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-[12px] text-[#888] placeholder-[#222] focus:outline-none focus:border-[#3b82f6]/20 resize-none transition-colors"
          />

          {/* Eliminar */}
          <button
            onClick={handleDelete}
            className="mt-2 text-[10.5px] text-[#2a2a2a] hover:text-[#e05252] transition-colors"
          >
            Eliminar iniciativa
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dialog Nueva Iniciativa ───────────────────────────────────────────────────
function DialogNuevaIniciativa({
  onClose,
  onSaved,
  defaultTitulo,
}: {
  onClose: () => void;
  onSaved: () => void;
  defaultTitulo?: string;
}) {
  const [titulo,      setTitulo]      = useState(defaultTitulo ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [area,        setArea]        = useState("");
  const [responsable, setResponsable] = useState("");
  const [estado,      setEstado]      = useState("planeando");
  const [fechaLimite, setFechaLimite] = useState("");
  const [saving,      setSaving]      = useState(false);

  async function submit() {
    if (!titulo.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/iniciativas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        area:        area        || null,
        responsable: responsable || null,
        estado,
        fechaLimite: fechaLimite || null,
      }),
    });
    if (res.ok) { onSaved(); onClose(); }
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#222] bg-[#0c0c0c] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Nueva Iniciativa</h2>
          <button onClick={onClose} className="text-[#333] hover:text-[#777] transition-colors text-xl leading-none">×</button>
        </div>

        <div className="space-y-2.5">
          <input
            autoFocus
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape") onClose(); }}
            placeholder="Título de la iniciativa *"
            className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-[#333] focus:outline-none focus:border-[#3b82f6]/40 transition-colors"
          />
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-[12.5px] text-white placeholder-[#333] focus:outline-none focus:border-[#3b82f6]/40 resize-none transition-colors"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={area}
              onChange={e => setArea(e.target.value)}
              className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-[12px] text-[#aaa] focus:outline-none transition-colors"
            >
              <option value="">Área…</option>
              {AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
            </select>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value)}
              className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-[12px] text-[#aaa] focus:outline-none transition-colors"
            >
              {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={responsable}
              onChange={e => setResponsable(e.target.value)}
              placeholder="Responsable"
              className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-[12px] text-[#aaa] placeholder-[#333] focus:outline-none transition-colors"
            />
            <input
              type="date"
              value={fechaLimite}
              onChange={e => setFechaLimite(e.target.value)}
              className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-[12px] text-[#aaa] focus:outline-none transition-colors"
              style={{ colorScheme: "dark" }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#222] text-[12px] text-[#555] hover:text-[#888] transition-colors">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!titulo.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40"
            style={{ background: "#3b82f6", color: "#fff" }}
          >
            {saving ? "Guardando…" : "Crear iniciativa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function VistaIniciativas() {
  const [items, setItems]           = useState<IniciativaItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filtro, setFiltro]         = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/iniciativas");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = filtro ? items.filter(i => i.estado === filtro) : items;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 shrink-0 flex items-center justify-between">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {ESTADOS.map(e => (
            <button
              key={e.key ?? "all"}
              onClick={() => setFiltro(e.key)}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
              style={{
                background: filtro === e.key ? "#3b82f6" : "#111",
                color: filtro === e.key ? "#fff" : "#555",
                border: `1px solid ${filtro === e.key ? "#3b82f6" : "#1e1e1e"}`,
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all ml-2"
          style={{ background: "#3b82f618", color: "#3b82f6", border: "1px solid #3b82f625" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva iniciativa
        </button>
      </div>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          <div className="text-center py-10 text-[#333] text-xs">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-[#333]">Sin iniciativas</p>
            <p className="text-[11px] text-[#222] mt-1">Crea tu primera iniciativa con el botón de arriba</p>
          </div>
        ) : (
          filtered.map(ini => (
            <IniciativaCard key={ini.id} ini={ini} onRefresh={refresh} />
          ))
        )}
      </div>

      {/* ── Dialog ──────────────────────────────────────────────────────────── */}
      {showDialog && (
        <DialogNuevaIniciativa
          onClose={() => setShowDialog(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
