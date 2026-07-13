"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type CapturaItem = {
  id: string;
  contenido: string;
  area: string | null;
  tipo: string | null;
  clasificado: boolean;
  creadoEn: string;
};

const AREAS = ["DIRECCION", "ADMINISTRACION", "MARKETING", "VENTAS", "PRODUCCION"];
const AREA_LABELS: Record<string, string> = {
  DIRECCION: "Dirección",
  ADMINISTRACION: "Administración",
  MARKETING: "Marketing",
  VENTAS: "Comercial",
  PRODUCCION: "Producción",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)       return "Ahora";
  if (diff < 3600)     return `Hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400)    return `Hace ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `Hace ${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function isOld(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() > 3 * 86400 * 1000;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function VistaCapturaRapida({
  onConvertirATarea,
}: {
  onConvertirATarea?: (texto: string) => void;
}) {
  const [items, setItems]           = useState<CapturaItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [texto, setTexto]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [hoverId, setHoverId]       = useState<string | null>(null);
  const [classifyId, setClassifyId] = useState<string | null>(null);
  const [classifyTipo, setClassifyTipo] = useState<string | null>(null);
  const [classifyArea, setClassifyArea] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    const res = await fetch("/api/captura");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!texto.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/captura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: texto.trim() }),
    });
    if (res.ok) {
      setTexto("");
      refresh();
    }
    setSaving(false);
  }

  // ── Classify ───────────────────────────────────────────────────────────────
  async function confirmClassify() {
    if (!classifyId || !classifyTipo) return;
    if (classifyTipo === "tarea") {
      const item = items.find(i => i.id === classifyId);
      if (item && onConvertirATarea) {
        onConvertirATarea(item.contenido);
        await fetch(`/api/captura/${classifyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clasificado: true, tipo: "tarea" }),
        });
      }
    } else if (classifyTipo === "idea") {
      const item = items.find(i => i.id === classifyId);
      if (item) {
        await fetch("/api/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo: item.contenido, area: classifyArea }),
        });
        await fetch(`/api/captura/${classifyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clasificado: true, tipo: "idea", area: classifyArea }),
        });
      }
    } else if (classifyTipo === "iniciativa") {
      const item = items.find(i => i.id === classifyId);
      if (item) {
        await fetch("/api/iniciativas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo: item.contenido, area: classifyArea }),
        });
        await fetch(`/api/captura/${classifyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clasificado: true, tipo: "iniciativa", area: classifyArea }),
        });
      }
    } else {
      await fetch(`/api/captura/${classifyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clasificado: true, tipo: classifyTipo, area: classifyArea }),
      });
    }
    setClassifyId(null);
    setClassifyTipo(null);
    setClassifyArea(null);
    refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/captura/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  }

  // ── Alert ──────────────────────────────────────────────────────────────────
  const oldItems = items.filter(i => isOld(i.creadoEn));

  return (
    <div className="flex flex-col h-full">

      {/* ── Alert — items viejos ────────────────────────────────────────────── */}
      {oldItems.length > 0 && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-[#e8a020]/8 border border-[#e8a020]/20 flex items-center gap-2 shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e8a020" strokeWidth="2" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-[11.5px] text-[#e8a020]/90">
            {oldItems.length} item{oldItems.length > 1 ? "s" : ""} sin clasificar con más de 3 días
          </p>
        </div>
      )}

      {/* ── Input ───────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <form onSubmit={handleSubmit}>
          <div className="relative rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] focus-within:border-[#e8a020]/30 transition-colors">
            <textarea
              ref={inputRef}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              placeholder="Captura una idea, tarea, pensamiento… (Enter para guardar)"
              rows={2}
              className="w-full bg-transparent px-4 pt-3 pb-10 text-[13px] text-white placeholder-[#333] focus:outline-none resize-none leading-relaxed"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
              {texto.trim() && (
                <button
                  type="button"
                  onClick={() => setTexto("")}
                  className="px-2 py-1 text-[11px] text-[#444] hover:text-[#777] transition-colors"
                >
                  Limpiar
                </button>
              )}
              <button
                type="submit"
                disabled={!texto.trim() || saving}
                className="px-3 py-1.5 rounded-lg bg-[#e8a020] hover:bg-[#f0ab2a] disabled:opacity-40 text-[#080808] text-[11px] font-semibold transition-all"
              >
                {saving ? "..." : "Capturar"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          <div className="text-center py-10 text-[#333] text-xs">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-[#333]">Bandeja vacía</p>
            <p className="text-[11px] text-[#222] mt-1">Captura ideas, tareas o pensamientos rápidos aquí</p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="group relative rounded-lg border transition-all cursor-default"
              style={{
                background: "#141414",
                borderColor: hoverId === item.id
                  ? isOld(item.creadoEn) ? "rgba(232,160,32,0.25)" : "rgba(255,255,255,0.10)"
                  : "rgba(255,255,255,0.06)",
                padding: "11px 14px",
              }}
              onMouseEnter={() => setHoverId(item.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <div className="flex items-start gap-3">
                {/* circle */}
                <span
                  className="mt-[2px] shrink-0 rounded-full border"
                  style={{ width: 16, height: 16, borderColor: "rgba(255,255,255,0.12)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] text-[#ddd] leading-snug">{item.contenido}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10.5px] text-[#555]">{timeAgo(item.creadoEn)}</span>
                    {item.area ? (
                      <span className="text-[10px] text-[#444] px-1.5 py-0.5 rounded bg-[#1a1a1a]">
                        {AREA_LABELS[item.area] ?? item.area}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#333]">Sin área</span>
                    )}
                    {isOld(item.creadoEn) && (
                      <span className="text-[10px] text-[#e8a020]/60">⚠ Antiguo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hover actions */}
              {hoverId === item.id && (
                <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-white/[0.04]">
                  {[
                    { key: "idea",       label: "→ Idea",        color: "#a78bfa" },
                    { key: "iniciativa", label: "→ Iniciativa",  color: "#3b82f6" },
                    { key: "tarea",      label: "→ Tarea",       color: "#B3985B" },
                    { key: "backlog",    label: "→ Backlog",     color: "#555" },
                  ].map(a => (
                    <button
                      key={a.key}
                      onClick={() => { setClassifyId(item.id); setClassifyTipo(a.key); }}
                      className="px-2 py-1 rounded text-[10.5px] font-medium transition-all hover:opacity-80"
                      style={{ background: `${a.color}18`, color: a.color, border: `1px solid ${a.color}25` }}
                    >
                      {a.label}
                    </button>
                  ))}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="ml-auto p-1 rounded text-[#2a2a2a] hover:text-[#666] transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Classify Modal ─────────────────────────────────────────────────── */}
      {classifyId && classifyTipo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) { setClassifyId(null); setClassifyTipo(null); } }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#222] bg-[#0e0e0e] p-5 shadow-2xl">
            <p className="text-sm font-semibold text-white mb-1">
              Clasificar como{" "}
              <span style={{ color: classifyTipo === "idea" ? "#a78bfa" : classifyTipo === "iniciativa" ? "#3b82f6" : classifyTipo === "tarea" ? "#B3985B" : "#555" }}>
                {classifyTipo}
              </span>
            </p>
            <p className="text-[12px] text-[#555] mb-4">
              Selecciona el área (opcional) y confirma.
            </p>
            {classifyTipo !== "tarea" && (
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {AREAS.map(a => (
                  <button
                    key={a}
                    onClick={() => setClassifyArea(classifyArea === a ? null : a)}
                    className="px-2 py-1.5 rounded-lg text-[11.5px] transition-all border"
                    style={{
                      background: classifyArea === a ? "#e8a020/12" : "#111",
                      borderColor: classifyArea === a ? "#e8a020/40" : "#222",
                      color: classifyArea === a ? "#e8a020" : "#555",
                    }}
                  >
                    {AREA_LABELS[a]}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setClassifyId(null); setClassifyTipo(null); setClassifyArea(null); }}
                className="flex-1 py-2 rounded-lg border border-[#222] text-[12px] text-[#555] hover:text-[#888] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClassify}
                className="flex-1 py-2 rounded-lg bg-[#e8a020] hover:bg-[#f0ab2a] text-[#080808] text-[12px] font-semibold transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
