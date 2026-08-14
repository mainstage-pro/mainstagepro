"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { iconoArea, ICONO_OPCIONES, COLOR_OPCIONES, ICONOS } from "@/lib/capacitacion-ui";
import { BarChart3, Plus, X } from "lucide-react";

interface Area {
  id: string;
  nombre: string;
  slug: string;
  color: string;
  icono: string;
  orden: number;
  total: number;
  completadas: number;
}

type Nivel = "OBLIGATORIO" | "RECOMENDADO";
interface MiPlan {
  porAreaSlug: Record<string, Nivel>;
  porSubArea: Record<string, Nivel>;
}

// Badge de nivel para el usuario logueado (obligatorio > recomendado).
function NivelBadge({ nivel }: { nivel: Nivel }) {
  const o = nivel === "OBLIGATORIO";
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={o
        ? { background: "#B3985B22", color: "#c9a96a", border: "1px solid #B3985B55" }
        : { background: "#0ea5e922", color: "#7dd3fc", border: "1px solid #0ea5e955" }}>
      {o ? "Obligatorio" : "Recomendado"}
    </span>
  );
}

export default function PortalCapacitacionPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeVerResumen, setPuedeVerResumen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creando, setCreando] = useState(false);
  const [miPlan, setMiPlan] = useState<MiPlan | null>(null);

  // Nivel del área para el usuario: el del área completa, o el más alto de sus sub-áreas.
  function nivelDeArea(slug: string): Nivel | null {
    if (!miPlan) return null;
    if (miPlan.porAreaSlug[slug] === "OBLIGATORIO") return "OBLIGATORIO";
    let sub: Nivel | null = miPlan.porAreaSlug[slug] ?? null;
    for (const k of Object.keys(miPlan.porSubArea)) {
      if (!k.startsWith(`${slug}::`)) continue;
      if (miPlan.porSubArea[k] === "OBLIGATORIO") return "OBLIGATORIO";
      sub = sub ?? "RECOMENDADO";
    }
    return sub;
  }

  async function cargar() {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/capacitacion/categorias", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const data = await r.json();
      setAreas(data.categorias ?? []);
      setPuedeEditar(!!data.puedeEditar);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    fetch("/api/capacitacion/mi-plan", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setMiPlan({ porAreaSlug: d.porAreaSlug ?? {}, porSubArea: d.porSubArea ?? {} }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(me => {
        const nombre = (me?.name ?? "").toLowerCase();
        setPuedeVerResumen(["mauricio", "emiliano"].some(n => nombre.includes(n)));
      })
      .catch(() => {});
  }, []);

  const totalGlobal = areas.reduce((a, c) => a + c.total, 0);
  const completadasGlobal = areas.reduce((a, c) => a + c.completadas, 0);

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="ms-h1 tracking-tight mb-1">Capacitación</h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Portal de aprendizaje del equipo · elige un área para ver sus capacitaciones
            </p>
          </div>
          <div className="flex items-center gap-2">
            {puedeVerResumen && (
              <Link
                href="/capacitacion/resumen"
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-colors hover:border-[#c9a96a]"
                style={{ borderColor: "#262626", color: "#c9a96a" }}
              >
                <BarChart3 size={15} /> Resumen
              </Link>
            )}
            {puedeEditar && (
              <button
                onClick={() => setCreando(true)}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg"
                style={{ background: "#c9a96a", color: "#000" }}
              >
                <Plus size={15} /> Área
              </button>
            )}
          </div>
        </div>

        {/* Progreso global del usuario */}
        {!loading && totalGlobal > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "#6b7280" }}>Tu avance total</span>
              <span className="text-xs font-semibold" style={{ color: "#c9a96a" }}>
                {completadasGlobal} / {totalGlobal} completadas
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${totalGlobal ? (completadasGlobal / totalGlobal) * 100 : 0}%`, background: "#c9a96a" }} />
            </div>
          </div>
        )}

        {/* Lista de áreas (vista de filas) */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#111" }} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border p-10 text-center" style={{ background: "#111", borderColor: "#262626" }}>
            <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>No se pudieron cargar las áreas.</p>
            <button onClick={cargar} className="text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#c9a96a", color: "#000" }}>
              Reintentar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {areas.map((a) => {
              const Icon = iconoArea(a.icono);
              const pct = a.total ? Math.round((a.completadas / a.total) * 100) : 0;
              return (
                <Link key={a.id} href={`/capacitacion/area/${a.slug}`} className="group block">
                  <div className="relative flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 hover:border-[#3a3a3a] overflow-hidden"
                    style={{ background: "#111", borderColor: "#262626" }}>
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 3, background: a.color, opacity: 0.85 }} />
                    <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center"
                      style={{ background: `${a.color}1a`, border: `1px solid ${a.color}33` }}>
                      <Icon size={20} style={{ color: a.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-white group-hover:text-[#c9a96a] transition-colors truncate">
                          {a.nombre}
                        </h3>
                        {(() => { const n = nivelDeArea(a.slug); return n ? <NivelBadge nivel={n} /> : null; })()}
                      </div>
                      <span className="text-[11px]" style={{ color: "#6b7280" }}>
                        {a.total} {a.total === 1 ? "curso" : "cursos"}
                      </span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 w-48 shrink-0">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: a.color }} />
                      </div>
                    </div>
                    <span className="text-[11px] font-mono shrink-0 w-12 text-right" style={{ color: "#6b7280" }}>
                      {a.completadas}/{a.total}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {creando && <ModalArea onClose={() => setCreando(false)} onCreada={() => { setCreando(false); cargar(); }} />}
    </div>
  );
}

// ── Modal para crear un área nueva ────────────────────────────────────────────
function ModalArea({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(COLOR_OPCIONES[0]);
  const [icono, setIcono] = useState("GraduationCap");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim() || guardando) return;
    setGuardando(true);
    const r = await fetch("/api/capacitacion/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, color, icono }),
    });
    setGuardando(false);
    if (r.ok) onCreada();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: "#111", borderColor: "#262626" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nueva área</h2>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
        </div>

        <label className="block text-xs mb-1.5" style={{ color: "#6b7280" }}>Nombre</label>
        <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Audio · JBL"
          className="w-full mb-4 bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a96a]" />

        <label className="block text-xs mb-1.5" style={{ color: "#6b7280" }}>Color</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {COLOR_OPCIONES.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full transition-transform"
              style={{ background: c, outline: color === c ? "2px solid #fff" : "none", outlineOffset: 2, transform: color === c ? "scale(1.1)" : "none" }} />
          ))}
        </div>

        <label className="block text-xs mb-1.5" style={{ color: "#6b7280" }}>Ícono</label>
        <div className="grid grid-cols-8 gap-2 mb-6">
          {ICONO_OPCIONES.map((name) => {
            const Icon = ICONOS[name];
            return (
              <button key={name} onClick={() => setIcono(name)} className="aspect-square rounded-lg flex items-center justify-center border transition-colors"
                style={{ background: icono === name ? `${color}1a` : "#0a0a0a", borderColor: icono === name ? color : "#262626" }}>
                <Icon size={16} style={{ color: icono === name ? color : "#6b7280" }} />
              </button>
            );
          })}
        </div>

        <button onClick={guardar} disabled={!nombre.trim() || guardando}
          className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
          style={{ background: "#c9a96a", color: "#000" }}>
          {guardando ? "Creando…" : "Crear área"}
        </button>
      </div>
    </div>
  );
}
