"use client";

import React, { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { colorBloque, iconoArea, subAreaSlug } from "@/lib/capacitacion-ui";
import { ArrowLeft, Plus, X, CheckCircle2, ChevronRight } from "lucide-react";

interface Sesion {
  id: string;
  numero: number;
  titulo: string;
  bloque: string;
  bloqueLetra: string;
  subArea: string | null;
  descripcion: string;
  duracion: number;
  categoria: { id: string; nombre: string; slug: string; color: string } | null;
  versionActual: number | null;
  tieneContenido: boolean;
  tieneEvaluacion: boolean;
  estadoUsuario: "no-iniciado" | "en-progreso" | "completado";
  segundosUsuario: number;
  calificacion: number | null;
  aprobado: boolean | null;
}

export default function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [areaInfo, setAreaInfo] = useState<{ id: string; nombre: string; color: string; icono: string } | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(false);
    try {
      const [rs, rc] = await Promise.all([
        fetch(`/api/capacitacion?categoria=${slug}`, { cache: "no-store" }),
        fetch(`/api/capacitacion/categorias`, { cache: "no-store" }),
      ]);
      if (!rs.ok || !rc.ok) throw new Error();
      const ds = await rs.json();
      const dc = await rc.json();
      setSesiones(ds.sesiones ?? []);
      setPuedeEditar(!!ds.puedeEditar);
      const a = (dc.categorias ?? []).find((x: { slug: string }) => x.slug === slug);
      if (a) setAreaInfo({ id: a.id, nombre: a.nombre, color: a.color, icono: a.icono });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [slug]);

  // Agrupa por sub-área del plan de trabajo; si el tema no la tiene, cae en su bloque.
  const bySubArea = useMemo(() => {
    const map = new Map<string, { letra: string; nombre: string; slug: string; total: number; completadas: number }>();
    for (const s of sesiones) {
      const nombre = s.subArea?.trim() || s.bloque;
      if (!map.has(nombre)) map.set(nombre, { letra: s.bloqueLetra, nombre, slug: subAreaSlug(nombre), total: 0, completadas: 0 });
      const g = map.get(nombre)!;
      g.total++;
      if (s.estadoUsuario === "completado") g.completadas++;
    }
    return Array.from(map.values());
  }, [sesiones]);

  const color = areaInfo?.color ?? "#c9a96a";
  const Icon = iconoArea(areaInfo?.icono ?? "GraduationCap");

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/capacitacion" className="inline-flex items-center gap-1.5 text-xs mb-6 transition-colors hover:text-white" style={{ color: "#6b7280" }}>
          <ArrowLeft size={14} /> Todas las áreas
        </Link>

        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}1a`, border: `1px solid ${color}33` }}>
              <Icon size={26} style={{ color }} />
            </div>
            <div>
              <h1 className="ms-h1 tracking-tight">{areaInfo?.nombre ?? "Área"}</h1>
              <p className="text-sm" style={{ color: "#6b7280" }}>{sesiones.length} {sesiones.length === 1 ? "capacitación" : "capacitaciones"}</p>
            </div>
          </div>
          {puedeEditar && areaInfo && (
            <button onClick={() => setCreando(true)} className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg" style={{ background: "#c9a96a", color: "#000" }}>
              <Plus size={15} /> Capacitación
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "#111" }} />)}</div>
        ) : error ? (
          <div className="rounded-xl border p-10 text-center" style={{ background: "#111", borderColor: "#262626" }}>
            <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>No se pudo cargar esta área.</p>
            <button onClick={cargar} className="text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#c9a96a", color: "#000" }}>Reintentar</button>
          </div>
        ) : sesiones.length === 0 ? (
          <div className="rounded-xl border p-10 text-center" style={{ background: "#111", borderColor: "#262626" }}>
            <p className="text-sm" style={{ color: "#6b7280" }}>Aún no hay capacitaciones en esta área.</p>
            {puedeEditar && <p className="text-xs mt-1" style={{ color: "#4b5563" }}>Crea la primera con el botón de arriba.</p>}
          </div>
        ) : (
          <>
            <p className="text-xs mb-4" style={{ color: "#6b7280" }}>Elige una sub-área para ver sus capacitaciones.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bySubArea.map((g) => {
                const c = colorBloque(g.letra);
                const pct = g.total ? Math.round((g.completadas / g.total) * 100) : 0;
                return (
                  <Link key={g.nombre} href={`/capacitacion/area/${slug}/${g.slug}`} className="group block">
                    <div className="relative h-full rounded-2xl border p-5 transition-all duration-200 hover:border-[#3a3a3a] overflow-hidden"
                      style={{ background: "#111", borderColor: "#262626" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: c, opacity: 0.85 }} />
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: `${c}1a`, border: `1px solid ${c}33`, color: c }}>
                          {g.nombre.trim().charAt(0).toUpperCase()}
                        </div>
                        <ChevronRight size={18} className="mt-2 transition-transform group-hover:translate-x-0.5" style={{ color: "#4b5563" }} />
                      </div>
                      <h3 className="text-sm font-semibold text-white leading-snug mb-1 group-hover:text-[#c9a96a] transition-colors">
                        {g.nombre}
                      </h3>
                      <span className="text-[11px]" style={{ color: "#6b7280" }}>
                        {g.total} {g.total === 1 ? "curso" : "cursos"}
                        {g.completadas > 0 && (
                          <span className="inline-flex items-center gap-1 ml-2" style={{ color: "#22c55e" }}>
                            <CheckCircle2 size={11} /> {g.completadas}
                          </span>
                        )}
                      </span>
                      <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: c }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {creando && areaInfo && (
        <ModalCapacitacion areaId={areaInfo.id} subAreas={bySubArea.map((g) => g.nombre)} onClose={() => setCreando(false)} onCreada={() => { setCreando(false); cargar(); }} />
      )}
    </div>
  );
}

function ModalCapacitacion({ areaId, subAreas, onClose, onCreada }: { areaId: string; subAreas: string[]; onClose: () => void; onCreada: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [subArea, setSubArea] = useState(subAreas[0] ?? "");
  const [duracion, setDuracion] = useState(60);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!titulo.trim() || guardando) return;
    setGuardando(true);
    const sa = subArea.trim();
    const r = await fetch("/api/capacitacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, descripcion, categoriaId: areaId, subArea: sa || null, bloque: sa || "General", bloqueLetra: "A", duracion }),
    });
    setGuardando(false);
    if (r.ok) onCreada();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: "#111", borderColor: "#262626" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nueva capacitación</h2>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
        </div>

        <label className="block text-xs mb-1.5" style={{ color: "#6b7280" }}>Título</label>
        <input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)}
          className="w-full mb-4 bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a96a]" />

        <label className="block text-xs mb-1.5" style={{ color: "#6b7280" }}>Descripción · Qué vas a aprender</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
          className="w-full mb-4 bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a96a] resize-none" />

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="col-span-2">
            <label className="block text-xs mb-1.5" style={{ color: "#6b7280" }}>Sub-área</label>
            <input list="subareas-list" value={subArea} onChange={(e) => setSubArea(e.target.value)} placeholder="Ej: Coordinación de Producción"
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a96a]" />
            <datalist id="subareas-list">
              {subAreas.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#6b7280" }}>Duración (min)</label>
            <input type="number" min={5} value={duracion} onChange={(e) => setDuracion(Number(e.target.value) || 60)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-[#c9a96a]" />
          </div>
        </div>

        <button onClick={guardar} disabled={!titulo.trim() || guardando} className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: "#c9a96a", color: "#000" }}>
          {guardando ? "Creando…" : "Crear capacitación"}
        </button>
        <p className="text-[11px] text-center mt-3" style={{ color: "#4b5563" }}>Luego abre "Editar" para cargar el contenido y generar la presentación.</p>
      </div>
    </div>
  );
}
