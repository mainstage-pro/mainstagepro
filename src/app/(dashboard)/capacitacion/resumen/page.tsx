"use client";

import React from "react";
import { CheckCircle2, Clock, Users, GraduationCap, Award, FileWarning } from "lucide-react";
import { useResumen, fmtTiempo, Aviso, Skeleton } from "./ResumenData";

export default function PanoramaPage() {
  const { data, loading, error } = useResumen();

  if (error === "forbidden") return <Aviso>Sin permiso para ver el panel.</Aviso>;
  if (error) return <Aviso>No se pudo cargar el panel.</Aviso>;
  if (loading || !data) return <Skeleton />;

  const { porUsuario, registros, historial, porArea, porCurso } = data;
  const completadas = registros.filter((r) => r.estado === "completado").length;
  const enProgreso = registros.filter((r) => r.estado !== "completado").length;
  const tiempoTotal = porUsuario.reduce((a, u) => a + u.segundos, 0);
  const aprobados = historial.filter((h) => h.aprobado).length;
  const tasaAprob = historial.length ? Math.round((aprobados / historial.length) * 100) : null;
  const sinContenido = porCurso.filter((c) => !c.tieneContenido).length;

  const recientes = registros.slice(0, 12);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Metric icon={<Users size={15} style={{ color: "#c9a96a" }} />} label="Personas activas" value={porUsuario.length} />
        <Metric icon={<CheckCircle2 size={15} style={{ color: "#22c55e" }} />} label="Completadas" value={completadas} />
        <Metric icon={<Clock size={15} style={{ color: "#F59E0B" }} />} label="En progreso" value={enProgreso} />
        <Metric icon={<GraduationCap size={15} style={{ color: "#6366F1" }} />} label="Evaluaciones" value={historial.length} />
        <Metric icon={<Award size={15} style={{ color: "#22c55e" }} />} label="Aprobación" value={tasaAprob === null ? "—" : `${tasaAprob}%`} />
        <Metric icon={<Clock size={15} style={{ color: "#c9a96a" }} />} label="Tiempo total" value={fmtTiempo(tiempoTotal)} />
      </div>

      {sinContenido > 0 && (
        <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: "#14100a", borderColor: "#3a2f1a" }}>
          <FileWarning size={18} style={{ color: "#F59E0B" }} className="shrink-0" />
          <p className="text-xs" style={{ color: "#d1b98a" }}>
            {sinContenido} curso{sinContenido === 1 ? "" : "s"} sin contenido todavía. Se pueden tomar como lección desde su esqueleto, pero conviene enriquecerlos.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Avance por área</h2>
        <div className="space-y-2">
          {porArea.map((a) => {
            const pct = a.cursos ? Math.round((a.conContenido / a.cursos) * 100) : 0;
            return (
              <div key={a.slug} className="rounded-xl border p-4" style={{ background: "#111", borderColor: "#1e1e1e" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />{a.nombre}
                  </span>
                  <span className="text-[11px]" style={{ color: "#6b7280" }}>
                    {a.cursos} cursos · {a.conEval} con examen · {a.completadas} completadas
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: a.color }} />
                  </div>
                  <span className="text-[11px] font-mono w-24 text-right" style={{ color: "#6b7280" }}>{a.conContenido}/{a.cursos} listos</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
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
              {recientes.map((r, i) => (
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
              {recientes.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-xs" style={{ color: "#4b5563" }}>Sin actividad todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "#111", borderColor: "#1e1e1e" }}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[11px]" style={{ color: "#6b7280" }}>{label}</span></div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
