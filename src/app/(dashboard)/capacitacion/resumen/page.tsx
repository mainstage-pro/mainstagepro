"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Users, GraduationCap } from "lucide-react";

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
interface Intento {
  usuario: string;
  area: string | null;
  sesionTitulo: string;
  categoria: { nombre: string; color: string } | null;
  calificacion: number;
  aprobado: boolean;
  minAprobar: number;
  creadoEn: string;
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
            <div className="flex items-center justify-between gap-3 mt-8 mb-3">
              <h2 className="text-sm font-semibold text-white">Historial de evaluaciones</h2>
              {personas.length > 0 && (
                <select
                  value={filtroPersona}
                  onChange={(e) => setFiltroPersona(e.target.value)}
                  className="bg-[#0a0a0a] border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c9a96a]"
                  style={{ borderColor: "#262626" }}
                >
                  <option value="">Todas las personas</option>
                  {personas.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
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
                    <tr key={i} className="border-t" style={{ borderColor: "#1a1a1a" }}>
                      <td className="px-4 py-3 text-white whitespace-nowrap">{h.usuario}</td>
                      <td className="px-4 py-3" style={{ color: "#d1d5db" }}>
                        <span className="inline-flex items-center gap-2">
                          {h.categoria && <span className="w-2 h-2 rounded-full" style={{ background: h.categoria.color }} />}
                          {h.sesionTitulo}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "#9ca3af" }}>{fmtFecha(h.creadoEn)}</td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: h.aprobado ? "#22c55e" : "#EF4444" }}>{h.calificacion}%</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: h.aprobado ? "#0a1f0a" : "#1f0a0a", color: h.aprobado ? "#22c55e" : "#EF4444" }}>
                          {h.aprobado ? "Aprobó" : "No aprobó"}
                        </span>
                      </td>
                    </tr>
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
