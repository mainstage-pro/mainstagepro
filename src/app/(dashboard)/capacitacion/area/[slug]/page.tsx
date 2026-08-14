"use client";

import React, { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { colorBloque, iconoArea } from "@/lib/capacitacion-ui";
import { ArrowLeft, Plus, X, Play, RotateCcw, CheckCircle2, Pencil, Clock, Trash2 } from "lucide-react";

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

const ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  "no-iniciado": { label: "Sin iniciar", color: "#6b7280", bg: "#1a1a1a" },
  "en-progreso": { label: "En progreso", color: "#F59E0B", bg: "#1c1500" },
  completado: { label: "Completada", color: "#22c55e", bg: "#0a1f0a" },
};

export default function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
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
    const map = new Map<string, { letra: string; nombre: string; sesiones: Sesion[] }>();
    for (const s of sesiones) {
      const nombre = s.subArea?.trim() || s.bloque;
      if (!map.has(nombre)) map.set(nombre, { letra: s.bloqueLetra, nombre, sesiones: [] });
      map.get(nombre)!.sesiones.push(s);
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
          <div className="space-y-6">
            {bySubArea.map((g) => {
              const c = colorBloque(g.letra);
              return (
                <div key={g.nombre}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: c }}>{g.nombre}</p>
                    <div className="flex-1 h-px" style={{ background: `${c}30` }} />
                  </div>
                  <div className="space-y-2">
                    {g.sesiones.map((s) => <SesionRow key={s.id} s={s} puedeEditar={puedeEditar} onTomar={() => router.push(`/capacitacion/${s.id}/tomar`)} onEliminada={cargar} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {creando && areaInfo && (
        <ModalCapacitacion areaId={areaInfo.id} onClose={() => setCreando(false)} onCreada={() => { setCreando(false); cargar(); }} />
      )}
    </div>
  );
}

function SesionRow({ s, puedeEditar, onTomar, onEliminada }: { s: Sesion; puedeEditar: boolean; onTomar: () => void; onEliminada: () => void }) {
  const est = ESTADO[s.estadoUsuario];
  const c = colorBloque(s.bloqueLetra);
  const [eliminando, setEliminando] = useState(false);

  async function eliminar() {
    if (eliminando) return;
    if (!confirm(`¿Eliminar "${s.titulo}"? Se borrarán su contenido, evaluación y el progreso de todos. No se puede deshacer.`)) return;
    setEliminando(true);
    const r = await fetch(`/api/capacitacion/${s.id}`, { method: "DELETE" });
    if (r.ok) onEliminada();
    else { setEliminando(false); alert("No se pudo eliminar."); }
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors hover:border-[#333]" style={{ background: "#111", borderColor: "#1e1e1e" }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white truncate">{s.titulo}</h3>
          {s.estadoUsuario === "completado" && <CheckCircle2 size={14} style={{ color: "#22c55e" }} />}
        </div>
        <p className="text-xs truncate" style={{ color: "#6b7280" }}>{s.descripcion || "Sin descripción"}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: est.bg, color: est.color }}>
          {est.label}{s.estadoUsuario === "completado" && s.calificacion !== null ? ` · ${s.calificacion}%` : ""}
        </span>
        <span className="hidden sm:flex items-center gap-1 text-[11px]" style={{ color: "#4b5563" }}><Clock size={11} /> {s.duracion}m</span>

        {!s.tieneContenido ? (
          <span className="text-[11px] px-2 py-1 rounded-lg" style={{ color: "#4b5563" }}>Sin contenido</span>
        ) : s.estadoUsuario === "completado" ? (
          <button onClick={onTomar} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:border-[#c9a96a] hover:text-[#c9a96a]" style={{ borderColor: "#262626", color: "#9ca3af" }}>
            <RotateCcw size={13} /> Repasar
          </button>
        ) : (
          <button onClick={onTomar} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: "#c9a96a", color: "#000" }}>
            <Play size={13} /> {s.estadoUsuario === "en-progreso" ? "Continuar" : "Tomar"}
          </button>
        )}

        {puedeEditar && (
          <Link href={`/capacitacion/${s.id}`} className="text-[#6b7280] hover:text-white p-1" title="Editar contenido"><Pencil size={14} /></Link>
        )}
        {puedeEditar && (
          <button onClick={eliminar} disabled={eliminando} className="text-[#6b7280] hover:text-[#EF4444] p-1 disabled:opacity-40" title="Eliminar capacitación"><Trash2 size={14} /></button>
        )}
      </div>
    </div>
  );
}

function ModalCapacitacion({ areaId, onClose, onCreada }: { areaId: string; onClose: () => void; onCreada: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [bloqueLetra, setBloqueLetra] = useState("A");
  const [bloqueNombre, setBloqueNombre] = useState("");
  const [duracion, setDuracion] = useState(60);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!titulo.trim() || guardando) return;
    setGuardando(true);
    const bloque = bloqueNombre.trim() ? `Bloque ${bloqueLetra} · ${bloqueNombre.trim()}` : `Bloque ${bloqueLetra}`;
    const r = await fetch("/api/capacitacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, descripcion, categoriaId: areaId, bloque, bloqueLetra, duracion }),
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

        <label className="block text-xs mb-1.5" style={{ color: "#6b7280" }}>Descripción</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
          className="w-full mb-4 bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a96a] resize-none" />

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#6b7280" }}>Bloque</label>
            <input value={bloqueLetra} onChange={(e) => setBloqueLetra(e.target.value.toUpperCase().slice(0, 1))} maxLength={1}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-[#c9a96a]" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs mb-1.5" style={{ color: "#6b7280" }}>Tema del bloque</label>
            <input value={bloqueNombre} onChange={(e) => setBloqueNombre(e.target.value)} placeholder="Opcional"
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a96a]" />
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
