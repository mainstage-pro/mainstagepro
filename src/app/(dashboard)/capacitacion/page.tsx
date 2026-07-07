"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Sesion {
  id: string;
  numero: number;
  titulo: string;
  bloque: string;
  bloqueLetra: string;
  descripcion: string;
  semana: number;
  fechaProgramada: string | null;
  duracion: number;
  impartidor: string;
  estado: string;
  notas: string | null;
  versionActual: number | null;
  ultimaGeneracion: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BLOQUE_COLORS: Record<string, string> = {
  A: "#6366F1", B: "#10B981", C: "#F59E0B",
  D: "#3B82F6", E: "#8B5CF6", F: "#EC4899",
  G: "#EF4444", H: "#14B8A6", I: "#c9a96a",
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:        { label: "Pendiente",       color: "#6b7280", bg: "#1a1a1a" },
  "en-preparacion": { label: "En preparación",  color: "#F59E0B", bg: "#1c1500" },
  lista:            { label: "Lista",            color: "#22c55e", bg: "#0a1f0a" },
  impartida:        { label: "Impartida",        color: "#c9a96a", bg: "#1a1200" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function padNum(n: number) { return String(n).padStart(2, "0"); }

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

// ─── SessionCard ─────────────────────────────────────────────────────────────

function SesionCard({ s }: { s: Sesion }) {
  const bloqueColor = BLOQUE_COLORS[s.bloqueLetra] ?? "#6b7280";
  const estado = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.pendiente;
  const fecha = formatDate(s.fechaProgramada);

  return (
    <Link href={`/capacitacion/${s.id}`} className="block group">
      <div
        className="relative h-full rounded-xl border transition-all duration-200 flex flex-col overflow-hidden hover:-translate-y-0.5"
        style={{
          background: "#111111",
          borderColor: "#262626",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: bloqueColor, opacity: 0.8 }} />

        <div className="p-4 flex flex-col gap-3 flex-1">
          {/* Top row: bloque badge + version */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: `${bloqueColor}22`, color: bloqueColor, border: `1px solid ${bloqueColor}44` }}
            >
              {s.bloque}
            </span>
            {s.versionActual !== null && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#c9a96a22", color: "#c9a96a" }}>
                v{s.versionActual}
              </span>
            )}
          </div>

          {/* Número + título */}
          <div>
            <p className="text-[11px] font-mono mb-1" style={{ color: "#c9a96a" }}>{padNum(s.numero)}</p>
            <h3 className="text-sm font-semibold leading-snug text-white group-hover:text-[#c9a96a] transition-colors line-clamp-2">
              {s.titulo}
            </h3>
          </div>

          {/* Descripción */}
          <p className="text-xs leading-relaxed line-clamp-2 flex-1" style={{ color: "#6b7280" }}>
            {s.descripcion}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: "#1e1e1e" }}>
            {/* Estado */}
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: estado.bg, color: estado.color }}
            >
              {estado.label}
            </span>

            {/* Fecha o duración */}
            {fecha ? (
              <span className="text-[10px]" style={{ color: "#4b5563" }}>{fecha}</span>
            ) : (
              <span className="text-[10px]" style={{ color: "#374151" }}>{s.duracion} min</span>
            )}
          </div>
        </div>

        {/* Preparar CTA */}
        <div className="px-4 pb-4">
          <div
            className="w-full py-1.5 rounded-lg text-xs font-medium text-center transition-all duration-200 opacity-0 group-hover:opacity-100"
            style={{ background: "#c9a96a", color: "#000" }}
          >
            Preparar sesión →
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Bloque separator ─────────────────────────────────────────────────────────

function BloqueSeparador({ bloque, letra }: { bloque: string; letra: string }) {
  const color = BLOQUE_COLORS[letra] ?? "#6b7280";
  return (
    <div className="col-span-full flex items-center gap-3 mt-4 mb-2">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
        {bloque}
      </p>
      <div className="flex-1 h-px" style={{ background: `${color}30` }} />
    </div>
  );
}

// ─── CalendarItem ─────────────────────────────────────────────────────────────

function CalendarioItem({ s, onDateChange }: { s: Sesion; onDateChange: (id: string, fecha: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(s.fechaProgramada ? s.fechaProgramada.split("T")[0] : "");
  const bloqueColor = BLOQUE_COLORS[s.bloqueLetra] ?? "#6b7280";

  async function save(v: string) {
    setEditing(false);
    const fecha = v || null;
    onDateChange(s.id, fecha ? new Date(v + "T10:00:00").toISOString() : null);
    await fetch(`/api/capacitacion/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fechaProgramada: fecha ? new Date(v + "T10:00:00").toISOString() : null }),
    });
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors hover:border-[#333]"
      style={{ background: "#111", borderColor: "#1e1e1e" }}
    >
      <span className="text-xs font-mono w-5 shrink-0" style={{ color: "#c9a96a" }}>{padNum(s.numero)}</span>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: bloqueColor }} />
      <span className="flex-1 text-sm text-white truncate">{s.titulo}</span>
      {editing ? (
        <input
          type="date"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => save(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(value); if (e.key === "Escape") setEditing(false); }}
          className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#c9a96a]"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-3 py-1 rounded-lg border transition-colors hover:border-[#c9a96a] hover:text-[#c9a96a]"
          style={{ borderColor: "#262626", color: s.fechaProgramada ? "#c9a96a" : "#374151" }}
        >
          {s.fechaProgramada ? formatDate(s.fechaProgramada) : "Sin programar"}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CapacitacionPage() {
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"programa" | "calendario">("programa");

  useEffect(() => {
    fetch("/api/capacitacion")
      .then((r) => r.json())
      .then((data) => { setSesiones(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleDateChange(id: string, fecha: string | null) {
    setSesiones((prev) => prev.map((s) => s.id === id ? { ...s, fechaProgramada: fecha } : s));
  }

  const completadas = useMemo(() => sesiones.filter((s) => s.estado === "impartida").length, [sesiones]);

  // Group by bloque for separator rendering
  const byBloque = useMemo(() => {
    const result: { letra: string; nombre: string; sesiones: Sesion[] }[] = [];
    for (const s of sesiones) {
      const last = result[result.length - 1];
      if (!last || last.letra !== s.bloqueLetra) {
        result.push({ letra: s.bloqueLetra, nombre: s.bloque, sesiones: [s] });
      } else {
        last.sesiones.push(s);
      }
    }
    return result;
  }, [sesiones]);

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight mb-1">Capacitación</h1>
              <p className="text-sm" style={{ color: "#6b7280" }}>
                Módulo Fundacional · 24 sesiones · Miércoles 10:00 am
              </p>
            </div>
            <span
              className="text-sm font-semibold px-3 py-1.5 rounded-full border"
              style={{ background: "#1a1200", color: "#c9a96a", borderColor: "#c9a96a44" }}
            >
              {loading ? "—" : completadas} / 24 completadas
            </span>
          </div>

          {/* Progress bar */}
          {!loading && (
            <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(completadas / 24) * 100}%`, background: "#c9a96a" }}
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: "#111" }}>
          {(["programa", "calendario"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize"
              style={
                activeTab === tab
                  ? { background: "#1a1a1a", color: "#fff" }
                  : { color: "#6b7280" }
              }
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-xl animate-pulse" style={{ background: "#111" }} />
            ))}
          </div>
        )}

        {/* Tab: Programa */}
        {!loading && activeTab === "programa" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {byBloque.map((grupo) => (
              <React.Fragment key={grupo.letra}>
                <BloqueSeparador bloque={grupo.nombre} letra={grupo.letra} />
                {grupo.sesiones.map((s) => (
                  <SesionCard key={s.id} s={s} />
                ))}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Tab: Calendario */}
        {!loading && activeTab === "calendario" && (
          <div className="space-y-2 max-w-3xl">
            {sesiones.map((s) => (
              <CalendarioItem key={s.id} s={s} onDateChange={handleDateChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
