"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type IdeaItem = {
  id: string;
  titulo: string;
  nota: string | null;
  area: string | null;
  tipo: string | null;
  estado: string;
  convertidaA: string | null;
  creadoEn: string;
  usuario: { id: string; name: string } | null;
};

const TIPOS = [
  { key: null,          label: "Todas" },
  { key: "negocio",     label: "Negocio" },
  { key: "operacion",   label: "Operación" },
  { key: "plataforma",  label: "Plataforma" },
  { key: "estrategia",  label: "Estrategia" },
];

const AREAS = ["DIRECCION", "ADMINISTRACION", "MARKETING", "VENTAS", "PRODUCCION"];
const AREA_LABELS: Record<string, string> = {
  DIRECCION: "Dirección", ADMINISTRACION: "Administración",
  MARKETING: "Marketing",  VENTAS: "Ventas", PRODUCCION: "Producción",
};

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return `Hace ${diff}d`;
}

// ── Idea Card ─────────────────────────────────────────────────────────────────
function IdeaCard({
  idea,
  onRefresh,
  onConvertirATarea,
}: {
  idea: IdeaItem;
  onRefresh: () => void;
  onConvertirATarea?: (texto: string) => void;
}) {
  const [hovered, setHovered]   = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function convertirAIniciativa() {
    await fetch("/api/iniciativas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: idea.titulo, area: idea.area }),
    });
    await fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "convertida" }),
    });
    onRefresh();
  }

  async function descartar() {
    if (!confirm(`¿Descartar "${idea.titulo}"?`)) return;
    await fetch(`/api/ideas/${idea.id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div
      className="rounded-lg transition-all cursor-pointer"
      style={{
        background: "#141414",
        border: `0.5px solid ${hovered ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.07)"}`,
        borderLeft: "2px solid #a78bfa",
        padding: "12px 14px",
        marginBottom: 6,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] text-[#ddd] leading-snug">{idea.titulo}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10.5px] text-[#555]">{timeAgo(idea.creadoEn)}</span>
            {idea.area && (
              <span className="text-[10px] text-[#555] px-1.5 py-0.5 rounded bg-[#1a1a1a]">
                {AREA_LABELS[idea.area] ?? idea.area}
              </span>
            )}
            {idea.tipo && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#a78bfa18", color: "#a78bfa" }}>
                {idea.tipo}
              </span>
            )}
          </div>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"
          className="shrink-0 mt-0.5 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Expanded: nota + actions */}
      {expanded && (
        <div onClick={e => e.stopPropagation()}>
          {idea.nota && (
            <p className="text-[12px] text-[#666] mt-2.5 leading-relaxed whitespace-pre-wrap">{idea.nota}</p>
          )}
          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/[0.04]">
            <button
              onClick={convertirAIniciativa}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{ background: "#3b82f618", color: "#3b82f6", border: "1px solid #3b82f625" }}
            >
              → Iniciativa
            </button>
            {onConvertirATarea && (
              <button
                onClick={() => {
                  onConvertirATarea(idea.titulo);
                  fetch(`/api/ideas/${idea.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ estado: "convertida" }),
                  }).then(onRefresh);
                }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{ background: "#B3985B18", color: "#B3985B", border: "1px solid #B3985B25" }}
              >
                → Tarea
              </button>
            )}
            <button
              onClick={descartar}
              className="ml-auto px-2.5 py-1.5 rounded-lg text-[11px] transition-all text-[#555] hover:text-[#888]"
              style={{ border: "1px solid #222" }}
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dialog Nueva Idea ─────────────────────────────────────────────────────────
function DialogNuevaIdea({
  onClose,
  onSaved,
  defaultTitulo,
}: {
  onClose: () => void;
  onSaved: () => void;
  defaultTitulo?: string;
}) {
  const [titulo, setTitulo] = useState(defaultTitulo ?? "");
  const [nota,   setNota]   = useState("");
  const [area,   setArea]   = useState("");
  const [tipo,   setTipo]   = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!titulo.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: titulo.trim(), nota: nota.trim() || null, area: area || null, tipo: tipo || null }),
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
          <h2 className="text-sm font-semibold text-white">Nueva Idea</h2>
          <button onClick={onClose} className="text-[#333] hover:text-[#777] transition-colors text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <input
            autoFocus
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) submit(); if (e.key === "Escape") onClose(); }}
            placeholder="Título de la idea *"
            className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-[#333] focus:outline-none focus:border-[#a78bfa]/40 transition-colors"
          />
          <textarea
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Nota o descripción (opcional)"
            rows={3}
            className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-[12.5px] text-white placeholder-[#333] focus:outline-none focus:border-[#a78bfa]/40 resize-none transition-colors"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={area}
              onChange={e => setArea(e.target.value)}
              className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-[12px] text-[#aaa] focus:outline-none focus:border-[#a78bfa]/30 transition-colors"
            >
              <option value="">Área…</option>
              {AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
            </select>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-[12px] text-[#aaa] focus:outline-none focus:border-[#a78bfa]/30 transition-colors"
            >
              <option value="">Tipo…</option>
              {["negocio", "operacion", "plataforma", "estrategia"].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
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
            style={{ background: "#a78bfa", color: "#fff" }}
          >
            {saving ? "Guardando…" : "Guardar idea"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function VistaIdeas({ onConvertirATarea }: { onConvertirATarea?: (texto: string) => void }) {
  const [ideas, setIdeas]         = useState<IdeaItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const refresh = useCallback(async () => {
    const url = new URL("/api/ideas", window.location.origin);
    url.searchParams.set("estado", "activa");
    const res = await fetch(url.toString());
    if (res.ok) setIdeas(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = filtroTipo ? ideas.filter(i => i.tipo === filtroTipo) : ideas;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 shrink-0 flex items-center justify-between">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TIPOS.map(t => (
            <button
              key={t.key ?? "all"}
              onClick={() => setFiltroTipo(t.key)}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
              style={{
                background: filtroTipo === t.key ? "#a78bfa" : "#111",
                color: filtroTipo === t.key ? "#fff" : "#555",
                border: `1px solid ${filtroTipo === t.key ? "#a78bfa" : "#1e1e1e"}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all ml-2"
          style={{ background: "#a78bfa18", color: "#a78bfa", border: "1px solid #a78bfa25" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva idea
        </button>
      </div>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          <div className="text-center py-10 text-[#333] text-xs">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-[#333]">Sin ideas activas</p>
            <p className="text-[11px] text-[#222] mt-1">Las ideas convertidas o descartadas no aparecen aquí</p>
          </div>
        ) : (
          filtered.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onRefresh={refresh}
              onConvertirATarea={onConvertirATarea}
            />
          ))
        )}
      </div>

      {/* ── Dialog ──────────────────────────────────────────────────────────── */}
      {showDialog && (
        <DialogNuevaIdea
          onClose={() => setShowDialog(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
