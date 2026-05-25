"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AreaKey = "admin" | "mkt" | "ventas" | "prod" | "eventos";
type Urgencia = "critico" | "importante" | "revisar" | "none";

interface Incidencia {
  id: string; // client-side only for DnD
  area: AreaKey;
  texto: string;
  urgencia: Urgencia;
  orden: number;
}

interface SessionInfo {
  id: string;
  name: string;
  area: string | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const AREAS: { key: AreaKey; label: string; color: string; badgeClass: string }[] = [
  { key: "admin",   label: "Administración",      color: "#6366f1", badgeClass: "bg-indigo-900/30 text-indigo-300 border-indigo-700/40" },
  { key: "mkt",     label: "Marketing",            color: "#ec4899", badgeClass: "bg-pink-900/30 text-pink-300 border-pink-700/40" },
  { key: "ventas",  label: "Ventas",               color: "#22c55e", badgeClass: "bg-green-900/30 text-green-300 border-green-700/40" },
  { key: "prod",    label: "Producción",            color: "#f59e0b", badgeClass: "bg-amber-900/30 text-amber-300 border-amber-700/40" },
  { key: "eventos", label: "Operación de Eventos",  color: "#B3985B", badgeClass: "bg-[#B3985B]/20 text-[#B3985B] border-[#B3985B]/30" },
];

const URGENCIA_CONFIG: Record<Urgencia, { label: string; emoji: string; borderClass: string; btnClass: string; printClass: string }> = {
  critico:    { label: "Crítico",    emoji: "🔴", borderClass: "border-l-red-500",    btnClass: "bg-red-900/40 border-red-700/50 text-red-300",    printClass: "print-critico" },
  importante: { label: "Importante", emoji: "🟡", borderClass: "border-l-yellow-500", btnClass: "bg-yellow-900/40 border-yellow-700/50 text-yellow-300", printClass: "print-importante" },
  revisar:    { label: "A revisar",  emoji: "🟢", borderClass: "border-l-green-500",  btnClass: "bg-green-900/40 border-green-700/50 text-green-300",  printClass: "print-revisar" },
  none:       { label: "Sin clasificar", emoji: "⚪", borderClass: "border-l-[#333]", btnClass: "bg-[#1a1a1a] border-[#333] text-gray-500", printClass: "" },
};

function getSemanaISO(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function genId() { return Math.random().toString(36).slice(2); }

function sortByUrgencia(items: Incidencia[]): Incidencia[] {
  const priority: Record<Urgencia, number> = { critico: 0, importante: 1, revisar: 2, none: 3 };
  return [...items].sort((a, b) => priority[a.urgencia] - priority[b.urgencia])
    .map((item, i) => ({ ...item, orden: i }));
}

// ─── IncidenciaCard ────────────────────────────────────────────────────────────

function IncidenciaCard({
  item,
  index,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  item: Incidencia;
  index: number;
  onUpdate: (id: string, field: keyof Incidencia, value: string | number) => void;
  onRemove: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetId: string) => void;
  isDragging: boolean;
}) {
  const cfg = URGENCIA_CONFIG[item.urgencia];

  return (
    <div
      draggable
      onDragStart={() => onDragStart(item.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
      onDrop={(e) => { e.preventDefault(); onDrop(item.id); }}
      className={`group flex items-start gap-2 bg-[#0d0d0d] border border-[#2a2a2a] border-l-4 ${cfg.borderClass} rounded-lg px-3 py-2.5 transition-all ${
        isDragging ? "opacity-40 scale-95" : "opacity-100"
      } ${item.urgencia === "none" ? "print:hidden" : ""} ${cfg.printClass}`}
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing text-gray-700 hover:text-gray-500 transition-colors mt-0.5 shrink-0 print:hidden">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/>
          <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
          <circle cx="3" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/>
        </svg>
      </div>

      {/* Number */}
      <span className="text-gray-700 text-xs w-4 shrink-0 mt-0.5">{index + 1}.</span>

      {/* Text */}
      <textarea
        value={item.texto}
        onChange={(e) => onUpdate(item.id, "texto", e.target.value)}
        rows={1}
        className="flex-1 bg-transparent text-gray-300 text-xs resize-none focus:outline-none leading-relaxed print:text-black print:text-sm"
        style={{ minHeight: "1.5rem", height: "auto" }}
        onInput={(e) => {
          const t = e.target as HTMLTextAreaElement;
          t.style.height = "auto";
          t.style.height = t.scrollHeight + "px";
        }}
      />

      {/* Urgencia buttons */}
      <div className="flex gap-1 shrink-0 print:hidden">
        {(["critico", "importante", "revisar"] as Urgencia[]).map((u) => (
          <button
            key={u}
            type="button"
            title={URGENCIA_CONFIG[u].label}
            onClick={() => onUpdate(item.id, "urgencia", u === item.urgencia ? "none" : u)}
            className={`w-5 h-5 rounded text-[9px] border transition-all ${
              item.urgencia === u
                ? URGENCIA_CONFIG[u].btnClass
                : "bg-[#1a1a1a] border-[#333] text-gray-700 hover:border-[#444]"
            }`}
          >
            {URGENCIA_CONFIG[u].emoji}
          </button>
        ))}
      </div>

      {/* Print urgency label */}
      <span className="hidden print:inline text-xs font-semibold ml-2">
        {item.urgencia !== "none" ? `[${URGENCIA_CONFIG[item.urgencia].label}]` : ""}
      </span>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="text-gray-700 hover:text-red-400 transition-colors text-base leading-none shrink-0 print:hidden"
      >
        ×
      </button>
    </div>
  );
}

// ─── AreaSection ───────────────────────────────────────────────────────────────

function AreaSection({
  area,
  items,
  onAdd,
  onUpdate,
  onRemove,
  onSort,
  onDragStart,
  onDrop,
  dragOverArea,
  setDragOverArea,
  draggingId,
}: {
  area: typeof AREAS[number];
  items: Incidencia[];
  onAdd: (area: AreaKey, texto: string) => void;
  onUpdate: (id: string, field: keyof Incidencia, value: string | number) => void;
  onRemove: (id: string) => void;
  onSort: (area: AreaKey) => void;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string, area: AreaKey) => void;
  dragOverArea: string | null;
  setDragOverArea: (id: string | null) => void;
  draggingId: string | null;
}) {
  const [newText, setNewText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (!newText.trim()) return;
    onAdd(area.key, newText.trim());
    setNewText("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden print:border-black print:border">
      {/* Area header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e] print:border-black">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0 print:hidden"
            style={{ backgroundColor: area.color }}
          />
          <h3 className="text-white font-semibold text-sm print:text-black print:font-bold">{area.label}</h3>
          {items.length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${area.badgeClass} print:hidden`}>
              {items.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSort(area.key)}
          className="text-[10px] text-gray-600 hover:text-[#B3985B] transition-colors print:hidden"
          title="Ordenar por urgencia"
        >
          ↑ Ordenar por urgencia
        </button>
      </div>

      {/* Incidencias */}
      <div className="p-3 space-y-2">
        {items.length === 0 && (
          <p className="text-gray-700 text-xs italic px-1 py-1 print:hidden">Sin incidencias registradas</p>
        )}
        {items.map((item, i) => (
          <IncidenciaCard
            key={item.id}
            item={item}
            index={i}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onDragStart={onDragStart}
            onDragOver={(e) => { e.preventDefault(); setDragOverArea(item.id); }}
            onDrop={(targetId) => onDrop(targetId, area.key)}
            isDragging={draggingId === item.id}
          />
        ))}

        {/* Add input */}
        <div className="flex items-center gap-2 mt-2 print:hidden">
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            placeholder={`Agregar incidencia en ${area.label}...`}
            className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B] transition-colors placeholder:text-gray-700"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="text-xs text-[#B3985B]/70 hover:text-[#B3985B] disabled:opacity-30 transition-colors px-2 py-2"
          >
            + Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NuevaIncidenciaPage() {
  const router = useRouter();
  const toast = useToast();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const semana = getSemanaISO();
  const anio = new Date().getFullYear();
  const fechaStr = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.id) setSession({ id: d.id, name: d.name, area: d.area ?? null });
        else router.push(`/login?redirect=/formularios/incidencias-semanales/nuevo`);
      })
      .catch(() => router.push(`/login?redirect=/formularios/incidencias-semanales/nuevo`));
  }, []); // eslint-disable-line

  // ── Incidencias CRUD ──────────────────────────────────────────────────────

  const addIncidencia = useCallback((area: AreaKey, texto: string) => {
    const areaItems = incidencias.filter(i => i.area === area);
    setIncidencias(prev => [...prev, {
      id: genId(),
      area,
      texto,
      urgencia: "none",
      orden: areaItems.length,
    }]);
  }, [incidencias]);

  const updateIncidencia = useCallback((id: string, field: keyof Incidencia, value: string | number) => {
    setIncidencias(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }, []);

  const removeIncidencia = useCallback((id: string) => {
    setIncidencias(prev => prev.filter(i => i.id !== id));
  }, []);

  const sortAreaByUrgencia = useCallback((area: AreaKey) => {
    setIncidencias(prev => {
      const others = prev.filter(i => i.area !== area);
      const sorted = sortByUrgencia(prev.filter(i => i.area === area));
      return [...others, ...sorted];
    });
  }, []);

  const sortAllByUrgencia = useCallback(() => {
    setIncidencias(prev => {
      return AREAS.flatMap(a => sortByUrgencia(prev.filter(i => i.area === a.key)));
    });
  }, []);

  // ── Drag & Drop (same area only) ──────────────────────────────────────────

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDrop = useCallback((targetId: string, area: AreaKey) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    const draggingItem = incidencias.find(i => i.id === draggingId);
    if (!draggingItem || draggingItem.area !== area) { setDraggingId(null); return; }

    setIncidencias(prev => {
      const areaItems = prev.filter(i => i.area === area);
      const others = prev.filter(i => i.area !== area);
      const fromIdx = areaItems.findIndex(i => i.id === draggingId);
      const toIdx = areaItems.findIndex(i => i.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const reordered = [...areaItems];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      const updated = reordered.map((item, i) => ({ ...item, orden: i }));
      return [...others, ...updated];
    });
    setDraggingId(null);
    setDragOverId(null);
  }, [draggingId, incidencias]);

  // ── Guardar ───────────────────────────────────────────────────────────────

  async function handleGuardar() {
    if (!session) { toast.error("Debes estar autenticado"); return; }
    setGuardando(true);
    try {
      const payload = incidencias
        .filter(i => i.texto.trim())
        .map(({ area, texto, urgencia, orden }) => ({ area, texto, urgencia, orden }));

      const res = await fetch("/api/formularios/incidencias-semanales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semana, anio, incidencias: payload }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al guardar");
        return;
      }
      toast.success("¡Incidencias guardadas correctamente! 📋");
      setTimeout(() => router.push("/formularios/incidencias-semanales"), 800);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setGuardando(false);
    }
  }

  // ── Print ─────────────────────────────────────────────────────────────────

  function handlePrint() { window.print(); }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const total = incidencias.filter(i => i.texto.trim()).length;
  const criticas = incidencias.filter(i => i.urgencia === "critico").length;

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#B3985B] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print-critico { border-left-color: #ef4444 !important; border-left-width: 4px !important; background: #fff5f5 !important; }
          .print-importante { border-left-color: #eab308 !important; border-left-width: 4px !important; background: #fefce8 !important; }
          .print-revisar { border-left-color: #22c55e !important; border-left-width: 4px !important; background: #f0fdf4 !important; }
          * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .print\\:text-black { color: black !important; }
          .print\\:border-black { border-color: #ccc !important; }
          .print\\:font-bold { font-weight: 700 !important; }
          .print\\:inline { display: inline !important; }
          .print\\:text-sm { font-size: 0.875rem !important; }
        }
      `}</style>

      <div className="min-h-screen bg-[#0a0a0a]">

        {/* Print header (hidden on screen) */}
        <div className="hidden print:block px-8 py-6 border-b border-gray-300 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xl font-bold text-black">Mainstage Pro</p>
              <p className="text-base font-semibold text-black mt-1">Registro de Incidencias Semanales</p>
              <p className="text-sm text-gray-600 mt-0.5">Semana {semana} · {anio} — {fechaStr}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-black">{session.name}</p>
              {session.area && <p className="text-sm text-gray-600">{session.area}</p>}
              <p className="text-xs text-gray-500 mt-1">{total} incidencia{total !== 1 ? "s" : ""} · {criticas} crítica{criticas !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-sm inline-block" style={{ printColorAdjust: "exact" }} />Crítico</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-400 rounded-sm inline-block" style={{ printColorAdjust: "exact" }} />Importante</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-sm inline-block" style={{ printColorAdjust: "exact" }} />A revisar</span>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 print:px-8 print:py-0 print:max-w-none">

          {/* Screen header */}
          <div className="print:hidden">
            <div className="flex items-center gap-2 mb-1 text-[10px]">
              <Link href="/formularios" className="text-gray-600 hover:text-[#B3985B] transition-colors">Formularios</Link>
              <span className="text-gray-700">/</span>
              <Link href="/formularios/incidencias-semanales" className="text-gray-600 hover:text-[#B3985B] transition-colors">Incidencias</Link>
              <span className="text-gray-700">/</span>
              <span className="text-gray-500">Nuevo</span>
            </div>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-white">Registro de Incidencias Semanales</h1>
                <p className="text-gray-500 text-xs mt-1">Semana <span className="text-[#B3985B] font-semibold">{semana}</span> · {anio} — {fechaStr}</p>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={sortAllByUrgencia}
                  className="text-xs text-gray-400 border border-[#2a2a2a] hover:border-[#444] px-3 py-2 rounded-lg transition-colors"
                >
                  ↑ Ordenar todo
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="text-xs text-gray-400 border border-[#2a2a2a] hover:border-[#444] px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={handleGuardar}
                  disabled={guardando || total === 0}
                  className="text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-40 disabled:cursor-not-allowed text-black px-4 py-2 rounded-lg transition-colors"
                >
                  {guardando ? "Guardando..." : `Guardar (${total})`}
                </button>
              </div>
            </div>

            {/* User strip */}
            <div className="mt-4 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 flex items-center justify-center text-[#B3985B] font-bold text-sm shrink-0">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{session.name}</p>
                <p className="text-gray-500 text-xs">{session.area ?? "Sin área"}</p>
              </div>
              {total > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">{total} incidencias</span>
                  {criticas > 0 && (
                    <span className="text-[10px] text-red-400 bg-red-900/20 border border-red-900/30 px-2 py-0.5 rounded-full">🔴 {criticas} críticas</span>
                  )}
                </div>
              )}
            </div>

            {/* Urgencia legend */}
            <div className="mt-3 flex items-center gap-4 px-1">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Leyenda:</p>
              {(["critico", "importante", "revisar"] as Urgencia[]).map(u => (
                <span key={u} className="flex items-center gap-1 text-[10px] text-gray-500">
                  {URGENCIA_CONFIG[u].emoji} {URGENCIA_CONFIG[u].label}
                </span>
              ))}
            </div>
          </div>

          {/* Area sections */}
          {AREAS.map((area) => {
            const areaItems = incidencias
              .filter(i => i.area === area.key)
              .sort((a, b) => a.orden - b.orden);
            return (
              <AreaSection
                key={area.key}
                area={area}
                items={areaItems}
                onAdd={addIncidencia}
                onUpdate={updateIncidencia}
                onRemove={removeIncidencia}
                onSort={sortAreaByUrgencia}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                dragOverArea={dragOverId}
                setDragOverArea={setDragOverId}
                draggingId={draggingId}
              />
            );
          })}

          {/* Bottom save */}
          <div className="pb-8 print:hidden">
            <button
              type="button"
              onClick={handleGuardar}
              disabled={guardando || total === 0}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-colors text-sm"
            >
              {guardando ? "Guardando..." : total === 0 ? "Agrega al menos una incidencia" : `Guardar registro (${total} incidencias) ✓`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
