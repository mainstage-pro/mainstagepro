"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Users, GraduationCap, ChevronDown, XCircle } from "lucide-react";

interface PorUsuario { nombre: string; area: string | null; completadas: number; enProgreso: number; segundos: number; }
interface Registro {
  usuario: { name: string; email: string; area: string | null };
  sesionTitulo: string;
  sesionNumero: number;
  categoria: { nombre: string; color: string } | null;
  estado: string;
  segundos: number;
  completadoEn: string | null;
  calificacion: number | null;
  aprobado: boolean | null;
}
interface DetalleItem { pregunta: string; elegida: string; correcta: string; ok: boolean }
interface Intento {
  usuario: string;
  area: string | null;
  sesionTitulo: string;
  categoria: { nombre: string; color: string } | null;
  calificacion: number;
  aprobado: boolean;
  minAprobar: number;
  creadoEn: string;
  aciertos: number;
  total: number;
  detalle: DetalleItem[];
}

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function fmtTiempo(seg: number) {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function ResumenPage() {
  const [porUsuario, setPorUsuario] = useState<PorUsuario[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [historial, setHistorial] = useState<Intento[]>([]);
  const [filtroPersona, setFiltroPersona] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/capacitacion/resumen")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setPorUsuario(d.porUsuario ?? []); setRegistros(d.registros ?? []); setHistorial(d.historial ?? []); setLoading(false); })
      .catch(() => { setErr(true); setLoading(false); });
  }, []);

  const totalCompletadas = registros.filter((r) => r.estado === "completado").length;
  const totalEnProgreso = registros.filter((r) => r.estado !== "completado").length;

  const personas = useMemo(() => Array.from(new Set(historial.map((h) => h.usuario))).sort(), [historial]);
  const historialFiltrado = useMemo(
    () => (filtroPersona ? historial.filter((h) => h.usuario === filtroPersona) : historial),
    [historial, filtroPersona],
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

  if (err) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}><p className="text-sm" style={{ color: "#6b7280" }}>Sin permiso para ver el resumen.</p></div>;

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/capacitacion" className="inline-flex items-center gap-1.5 text-xs mb-6 transition-colors hover:text-white" style={{ color: "#6b7280" }}>
          <ArrowLeft size={14} /> Portal de capacitación
        </Link>

        <h1 className="ms-h1 tracking-tight mb-1">Resumen de capacitaciones</h1>
        <p className="text-sm mb-8" style={{ color: "#6b7280" }}>Quién tomó qué, cuánto tardó y su calificación</p>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "#111" }} />)}</div>
        ) : (
          <>
            {/* Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <Metric icon={<CheckCircle2 size={16} style={{ color: "#22c55e" }} />} label="Completadas" value={totalCompletadas} />
              <Metric icon={<Clock size={16} style={{ color: "#F59E0B" }} />} label="En progreso" value={totalEnProgreso} />
              <Metric icon={<Users size={16} style={{ color: "#c9a96a" }} />} label="Personas activas" value={porUsuario.length} />
              <Metric icon={<GraduationCap size={16} style={{ color: "#6366F1" }} />} label="Evaluaciones" value={historial.length} />
            </div>

            {/* Por persona */}
            <h2 className="text-sm font-semibold text-white mb-3">Por persona</h2>
            <div className="rounded-xl border overflow-hidden mb-8" style={{ background: "#111", borderColor: "#1e1e1e" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "#6b7280" }} className="text-xs text-left">
                    <th className="px-4 py-3 font-medium">Persona</th>
                    <th className="px-4 py-3 font-medium">Área</th>
                    <th className="px-4 py-3 font-medium text-center">Completadas</th>
                    <th className="px-4 py-3 font-medium text-center">En progreso</th>
                    <th className="px-4 py-3 font-medium text-right">Tiempo total</th>
                  </tr>
                </thead>
                <tbody>
                  {porUsuario.map((u, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "#1a1a1a" }}>
                      <td className="px-4 py-3 text-white">{u.nombre}</td>
                      <td className="px-4 py-3" style={{ color: "#9ca3af" }}>{u.area ?? "—"}</td>
                      <td className="px-4 py-3 text-center" style={{ color: "#22c55e" }}>{u.completadas}</td>
                      <td className="px-4 py-3 text-center" style={{ color: "#F59E0B" }}>{u.enProgreso}</td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: "#c9a96a" }}>{fmtTiempo(u.segundos)}</td>
                    </tr>
                  ))}
                  {porUsuario.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-xs" style={{ color: "#4b5563" }}>Nadie ha tomado capacitaciones aún.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Detalle */}
            <h2 className="text-sm font-semibold text-white mb-3">Actividad reciente</h2>
            <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#1e1e1e" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "#6b7280" }} className="text-xs text-left">
                    <th className="px-4 py-3 font-medium">Persona</th>
                    <th className="px-4 py-3 font-medium">Capacitación</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Tiempo</th>
                    <th className="px-4 py-3 font-medium text-right">Calif.</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "#1a1a1a" }}>
                      <td className="px-4 py-3 text-white whitespace-nowrap">{r.usuario.name}</td>
                      <td className="px-4 py-3" style={{ color: "#d1d5db" }}>
                        <span className="inline-flex items-center gap-2">
                          {r.categoria && <span className="w-2 h-2 rounded-full" style={{ background: r.categoria.color }} />}
                          {r.sesionTitulo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: r.estado === "completado" ? "#0a1f0a" : "#1c1500", color: r.estado === "completado" ? "#22c55e" : "#F59E0B" }}>
                          {r.estado === "completado" ? "Completada" : "En progreso"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: "#9ca3af" }}>{fmtTiempo(r.segundos)}</td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: r.calificacion == null ? "#4b5563" : r.aprobado ? "#22c55e" : "#EF4444" }}>
                        {r.calificacion == null ? "—" : `${r.calificacion}%`}
                      </td>
                    </tr>
                  ))}
                  {registros.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-xs" style={{ color: "#4b5563" }}>Sin actividad todavía.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Historial de evaluaciones por usuario */}
            <div className="flex items-center justify-between gap-3 mt-8 mb-3 flex-wrap">
              <h2 className="text-sm font-semibold text-white">Historial de evaluaciones</h2>
              <div className="flex items-center gap-2">
                {personas.length > 0 && (
                  <select
                    value={filtroPersona}
                    onChange={(e) => { setFiltroPersona(e.target.value); setExpandido(null); }}
                    className="bg-[#0a0a0a] border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c9a96a]"
                    style={{ borderColor: "#262626" }}
                  >
                    <option value="">Todas las personas</option>
                    {personas.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
                {historialFiltrado.length > 0 && (
                  <button
                    onClick={exportarCSV}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:border-[#c9a96a] hover:text-[#c9a96a]"
                    style={{ borderColor: "#262626", color: "#9ca3af" }}
                  >
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
                      <tr
                        className="border-t cursor-pointer hover:bg-[#151515] transition-colors"
                        style={{ borderColor: "#1a1a1a" }}
                        onClick={() => h.total > 0 && setExpandido(expandido === i ? null : i)}
                      >
                        <td className="px-4 py-3 text-white whitespace-nowrap">{h.usuario}</td>
                        <td className="px-4 py-3" style={{ color: "#d1d5db" }}>
                          <span className="inline-flex items-center gap-2">
                            {h.categoria && <span className="w-2 h-2 rounded-full" style={{ background: h.categoria.color }} />}
                            {h.sesionTitulo}
                            {h.total > 0 && (
                              <ChevronDown size={13} className={`transition-transform ${expandido === i ? "rotate-180" : ""}`} style={{ color: "#4b5563" }} />
                            )}
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
                                  {d.ok
                                    ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: "#22c55e" }} />
                                    : <XCircle size={14} className="shrink-0 mt-0.5" style={{ color: "#EF4444" }} />}
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
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "#111", borderColor: "#1e1e1e" }}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs" style={{ color: "#6b7280" }}>{label}</span></div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
