"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { useResumen, fmtFecha, Aviso, Skeleton } from "../ResumenData";

export default function EvaluacionesPage() {
  const { data, loading, error } = useResumen();
  const [filtroPersona, setFiltroPersona] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);

  const personas = useMemo(() => (data ? Array.from(new Set(data.historial.map((h) => h.usuario))).sort() : []), [data]);
  const historialFiltrado = useMemo(
    () => (data ? (filtroPersona ? data.historial.filter((h) => h.usuario === filtroPersona) : data.historial) : []),
    [data, filtroPersona],
  );

  function exportarCSV() {
    const headers = ["Persona", "Area", "Capacitacion", "Fecha", "Calificacion", "MinAprobar", "Resultado", "Aciertos", "Total"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const filas = historialFiltrado.map((h) => [
      h.usuario, h.area ?? "", h.sesionTitulo, new Date(h.creadoEn).toISOString(),
      `${h.calificacion}%`, `${h.minAprobar}%`, h.aprobado ? "Aprobo" : "No aprobo", h.aciertos, h.total,
    ].map(esc).join(","));
    const csv = [headers.map(esc).join(","), ...filas].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evaluaciones${filtroPersona ? "-" + filtroPersona.replace(/\s+/g, "-").toLowerCase() : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error === "forbidden") return <Aviso>Sin permiso para ver el panel.</Aviso>;
  if (error) return <Aviso>No se pudo cargar el panel.</Aviso>;
  if (loading || !data) return <Skeleton />;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-white">Historial de evaluaciones</h2>
          <div className="flex items-center gap-2">
            {personas.length > 0 && (
              <select value={filtroPersona} onChange={(e) => { setFiltroPersona(e.target.value); setExpandido(null); }}
                className="bg-[#0a0a0a] border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c9a96a]" style={{ borderColor: "#262626" }}>
                <option value="">Todas las personas</option>
                {personas.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {historialFiltrado.length > 0 && (
              <button onClick={exportarCSV} className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:border-[#c9a96a] hover:text-[#c9a96a]" style={{ borderColor: "#262626", color: "#9ca3af" }}>
                Exportar CSV
              </button>
            )}
          </div>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#1e1e1e" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "#6b7280" }} className="text-xs text-left">
                <th className="px-4 py-3 font-medium">Persona</th>
                <th className="px-4 py-3 font-medium">Capacitación</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-right">Calif.</th>
                <th className="px-4 py-3 font-medium text-right">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {historialFiltrado.map((h, i) => (
                <React.Fragment key={i}>
                  <tr className="border-t cursor-pointer hover:bg-[#151515] transition-colors" style={{ borderColor: "#1a1a1a" }} onClick={() => h.total > 0 && setExpandido(expandido === i ? null : i)}>
                    <td className="px-4 py-3 text-white whitespace-nowrap">{h.usuario}</td>
                    <td className="px-4 py-3" style={{ color: "#d1d5db" }}>
                      <span className="inline-flex items-center gap-2">
                        {h.categoria && <span className="w-2 h-2 rounded-full" style={{ background: h.categoria.color }} />}
                        {h.sesionTitulo}
                        {h.total > 0 && <ChevronDown size={13} className={`transition-transform ${expandido === i ? "rotate-180" : ""}`} style={{ color: "#4b5563" }} />}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "#9ca3af" }}>{fmtFecha(h.creadoEn)}</td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: h.aprobado ? "#22c55e" : "#EF4444" }}>
                      {h.calificacion}%{h.total > 0 && <span className="text-[10px] ml-1" style={{ color: "#4b5563" }}>({h.aciertos}/{h.total})</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: h.aprobado ? "#0a1f0a" : "#1f0a0a", color: h.aprobado ? "#22c55e" : "#EF4444" }}>
                        {h.aprobado ? "Aprobó" : "No aprobó"}
                      </span>
                    </td>
                  </tr>
                  {expandido === i && h.detalle.length > 0 && (
                    <tr style={{ background: "#0d0d0d" }}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="space-y-2">
                          {h.detalle.map((d, j) => (
                            <div key={j} className="flex items-start gap-2 text-xs">
                              {d.ok ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: "#22c55e" }} /> : <XCircle size={14} className="shrink-0 mt-0.5" style={{ color: "#EF4444" }} />}
                              <div className="min-w-0">
                                <p className="text-white leading-snug">{j + 1}. {d.pregunta}</p>
                                <p style={{ color: d.ok ? "#22c55e" : "#EF4444" }}>Respondió: {d.elegida}</p>
                                {!d.ok && <p style={{ color: "#22c55e" }}>Correcta: {d.correcta}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {historialFiltrado.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-xs" style={{ color: "#4b5563" }}>Aún no hay intentos de evaluación.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white mb-1">Preguntas más falladas</h2>
        <p className="text-xs mb-3" style={{ color: "#6b7280" }}>Dónde falla el equipo — señal de qué contenido no está quedando claro.</p>
        <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#1e1e1e" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "#6b7280" }} className="text-xs text-left">
                <th className="px-4 py-3 font-medium">Pregunta</th>
                <th className="px-4 py-3 font-medium">Capacitación</th>
                <th className="px-4 py-3 font-medium text-right">Fallos</th>
                <th className="px-4 py-3 font-medium text-right">Tasa</th>
              </tr>
            </thead>
            <tbody>
              {data.preguntasFalladas.map((p, i) => (
                <tr key={i} className="border-t" style={{ borderColor: "#1a1a1a" }}>
                  <td className="px-4 py-3" style={{ color: "#d1d5db" }}>{p.pregunta}</td>
                  <td className="px-4 py-3" style={{ color: "#9ca3af" }}>
                    <span className="inline-flex items-center gap-2">
                      {p.categoria && <span className="w-2 h-2 rounded-full" style={{ background: p.categoria.color }} />}
                      {p.sesionTitulo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "#9ca3af" }}>{p.fallos}/{p.total}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: p.tasaFallo >= 50 ? "#EF4444" : "#F59E0B" }}>{p.tasaFallo}%</td>
                </tr>
              ))}
              {data.preguntasFalladas.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs" style={{ color: "#4b5563" }}>Sin datos suficientes todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
