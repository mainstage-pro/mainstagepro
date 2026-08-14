"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useResumen, Aviso, Skeleton } from "../ResumenData";

export default function CursosPage() {
  const { data, loading, error } = useResumen();
  const [area, setArea] = useState("");
  const [soloSinContenido, setSoloSinContenido] = useState(false);

  const areas = useMemo(() => (data ? Array.from(new Set(data.porCurso.map((c) => c.area).filter(Boolean))) as string[] : []), [data]);
  const cursos = useMemo(() => {
    if (!data) return [];
    return data.porCurso.filter((c) =>
      (area ? c.area === area : true) && (soloSinContenido ? !c.tienePresentacion : true),
    );
  }, [data, area, soloSinContenido]);

  if (error === "forbidden") return <Aviso>Sin permiso para ver el panel.</Aviso>;
  if (error) return <Aviso>No se pudo cargar el panel.</Aviso>;
  if (loading || !data) return <Skeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={area} onChange={(e) => setArea(e.target.value)}
          className="bg-[#0a0a0a] border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c9a96a]" style={{ borderColor: "#262626" }}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => setSoloSinContenido((v) => !v)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: soloSinContenido ? "#c9a96a" : "#262626", color: soloSinContenido ? "#c9a96a" : "#9ca3af" }}>
          Solo sin presentación
        </button>
        <span className="text-xs ml-auto" style={{ color: "#6b7280" }}>{cursos.length} cursos</span>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#1e1e1e" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: "#6b7280" }} className="text-xs text-left">
              <th className="px-4 py-3 font-medium">Curso</th>
              <th className="px-4 py-3 font-medium">Área / sub-área</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-center">Personas</th>
              <th className="px-4 py-3 font-medium text-center">Completadas</th>
              <th className="px-4 py-3 font-medium text-center">Promedio</th>
              <th className="px-4 py-3 font-medium text-right">Duración</th>
            </tr>
          </thead>
          <tbody>
            {cursos.map((c) => (
              <tr key={c.id} className="border-t hover:bg-[#151515] transition-colors" style={{ borderColor: "#1a1a1a" }}>
                <td className="px-4 py-3">
                  <Link href={`/capacitacion/${c.id}`} className="inline-flex items-center gap-2 text-white hover:text-[#c9a96a] transition-colors">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.areaColor }} />
                    {c.titulo}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#9ca3af" }}>{c.area} · {c.subArea}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Badge on={c.tienePresentacion} label={c.tienePresentacion ? "Presentación" : c.tieneContenido ? "Esqueleto" : "Vacío"} tone={c.tienePresentacion ? "green" : c.tieneContenido ? "amber" : "gray"} />
                    {c.tieneEvaluacion && <Badge on label="Examen" tone="indigo" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-mono" style={{ color: "#9ca3af" }}>{c.personas}</td>
                <td className="px-4 py-3 text-center font-mono" style={{ color: c.completadas > 0 ? "#22c55e" : "#4b5563" }}>{c.completadas}</td>
                <td className="px-4 py-3 text-center font-mono" style={{ color: c.califPromedio == null ? "#4b5563" : "#c9a96a" }}>{c.califPromedio == null ? "—" : `${c.califPromedio}%`}</td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: "#6b7280" }}>{c.duracion}m</td>
              </tr>
            ))}
            {cursos.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-xs" style={{ color: "#4b5563" }}>Sin cursos que coincidan.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ on, label, tone }: { on: boolean; label: string; tone: "green" | "amber" | "indigo" | "gray" }) {
  const c = {
    green: { bg: "#0a1f0a", fg: "#22c55e" },
    amber: { bg: "#1c1500", fg: "#F59E0B" },
    indigo: { bg: "#12122b", fg: "#818cf8" },
    gray: { bg: "#1a1a1a", fg: "#6b7280" },
  }[tone];
  return <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: c.bg, color: c.fg, opacity: on ? 1 : 0.9 }}>{label}</span>;
}
