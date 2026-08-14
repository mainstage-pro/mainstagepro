"use client";

import React, { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { colorBloque, iconoArea, subAreaSlug } from "@/lib/capacitacion-ui";
import { ArrowLeft, Play, RotateCcw, CheckCircle2, Pencil, Clock, Trash2, Sparkles } from "lucide-react";

interface Sesion {
  id: string;
  numero: number;
  titulo: string;
  bloque: string;
  bloqueLetra: string;
  subArea: string | null;
  descripcion: string;
  duracion: number;
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

export default function SubAreaPage({ params }: { params: Promise<{ slug: string; sub: string }> }) {
  const { slug, sub } = use(params);
  const router = useRouter();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [areaInfo, setAreaInfo] = useState<{ nombre: string; color: string; icono: string } | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      if (a) setAreaInfo({ nombre: a.nombre, color: a.color, icono: a.icono });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [slug]);

  const { nombreSub, sesionesSub } = useMemo(() => {
    const filtradas = sesiones.filter((s) => subAreaSlug(s.subArea?.trim() || s.bloque) === sub);
    const nombre = filtradas[0]?.subArea?.trim() || filtradas[0]?.bloque || "Sub-área";
    return { nombreSub: nombre, sesionesSub: filtradas };
  }, [sesiones, sub]);

  const completadas = sesionesSub.filter((s) => s.estadoUsuario === "completado").length;
  const letra = sesionesSub[0]?.bloqueLetra ?? "A";
  const c = colorBloque(letra);
  const Icon = iconoArea(areaInfo?.icono ?? "GraduationCap");

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href={`/capacitacion/area/${slug}`} className="inline-flex items-center gap-1.5 text-xs mb-6 transition-colors hover:text-white" style={{ color: "#6b7280" }}>
          <ArrowLeft size={14} /> {areaInfo?.nombre ?? "Área"}
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${c}1a`, border: `1px solid ${c}33` }}>
            <Icon size={26} style={{ color: c }} />
          </div>
          <div>
            <h1 className="ms-h1 tracking-tight">{nombreSub}</h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              {sesionesSub.length} {sesionesSub.length === 1 ? "capacitación" : "capacitaciones"}
              {completadas > 0 && <span style={{ color: "#22c55e" }}> · {completadas} completada{completadas === 1 ? "" : "s"}</span>}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "#111" }} />)}</div>
        ) : error ? (
          <div className="rounded-xl border p-10 text-center" style={{ background: "#111", borderColor: "#262626" }}>
            <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>No se pudo cargar esta sub-área.</p>
            <button onClick={cargar} className="text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#c9a96a", color: "#000" }}>Reintentar</button>
          </div>
        ) : sesionesSub.length === 0 ? (
          <div className="rounded-xl border p-10 text-center" style={{ background: "#111", borderColor: "#262626" }}>
            <p className="text-sm" style={{ color: "#6b7280" }}>No hay capacitaciones en esta sub-área.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sesionesSub.map((s) => (
              <SesionRow key={s.id} s={s} letra={letra} puedeEditar={puedeEditar} onTomar={() => router.push(`/capacitacion/${s.id}/tomar`)} onEliminada={cargar} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SesionRow({ s, letra, puedeEditar, onTomar, onEliminada }: { s: Sesion; letra: string; puedeEditar: boolean; onTomar: () => void; onEliminada: () => void }) {
  const est = ESTADO[s.estadoUsuario];
  const c = colorBloque(letra);
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
    <div className="rounded-2xl border transition-colors hover:border-[#333] overflow-hidden" style={{ background: "#111", borderColor: "#1e1e1e" }}>
      <div className="flex flex-col sm:flex-row">
        {/* Columna: título + estado */}
        <div className="flex-1 min-w-0 p-4 sm:border-r" style={{ borderColor: "#1a1a1a" }}>
          <div className="flex items-start gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: c }} />
            <h3 className="text-sm font-semibold text-white leading-snug">{s.titulo}</h3>
            {s.estadoUsuario === "completado" && <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: "#22c55e" }} />}
          </div>
          <div className="flex items-center gap-3 pl-4">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: est.bg, color: est.color }}>
              {est.label}{s.estadoUsuario === "completado" && s.calificacion !== null ? ` · ${s.calificacion}%` : ""}
            </span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "#4b5563" }}><Clock size={11} /> {s.duracion}m</span>
          </div>
        </div>

        {/* Columna: qué vas a aprender */}
        <div className="flex-1 min-w-0 p-4 sm:border-r" style={{ borderColor: "#1a1a1a" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={11} style={{ color: c }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: c }}>Qué vas a aprender</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
            {s.descripcion?.trim() || "Sin descripción todavía."}
          </p>
        </div>

        {/* Columna: acciones */}
        <div className="flex items-center justify-end gap-2 p-4 shrink-0 sm:w-56">
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
    </div>
  );
}
