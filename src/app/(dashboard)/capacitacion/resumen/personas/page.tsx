"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Clock } from "lucide-react";
import { useResumen, fmtTiempo, fmtFecha, Aviso, Skeleton, type Registro, type Intento } from "../ResumenData";

export default function PersonasPage() {
  const { data, loading, error } = useResumen();
  const [expandido, setExpandido] = useState<string | null>(null);

  const porNombre = useMemo(() => {
    const cursos = new Map<string, Registro[]>();
    const intentos = new Map<string, Intento[]>();
    if (data) {
      for (const r of data.registros) {
        const arr = cursos.get(r.usuario.name) ?? []; arr.push(r); cursos.set(r.usuario.name, arr);
      }
      for (const h of data.historial) {
        const arr = intentos.get(h.usuario) ?? []; arr.push(h); intentos.set(h.usuario, arr);
      }
    }
    return { cursos, intentos };
  }, [data]);

  if (error === "forbidden") return <Aviso>Sin permiso para ver el panel.</Aviso>;
  if (error) return <Aviso>No se pudo cargar el panel.</Aviso>;
  if (loading || !data) return <Skeleton />;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#1e1e1e" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "#6b7280" }} className="text-xs text-left">
            <th className="px-4 py-3 font-medium">Persona</th>
            <th className="px-4 py-3 font-medium">Área</th>
            <th className="px-4 py-3 font-medium text-center">Completadas</th>
            <th className="px-4 py-3 font-medium text-center">En progreso</th>
            <th className="px-4 py-3 font-medium text-center">Promedio</th>
            <th className="px-4 py-3 font-medium text-right">Tiempo</th>
          </tr>
        </thead>
        <tbody>
          {data.porUsuario.map((u) => {
            const abierto = expandido === u.id;
            const cursos = porNombre.cursos.get(u.nombre) ?? [];
            const intentos = porNombre.intentos.get(u.nombre) ?? [];
            return (
              <React.Fragment key={u.id}>
                <tr className="border-t cursor-pointer hover:bg-[#151515] transition-colors" style={{ borderColor: "#1a1a1a" }} onClick={() => setExpandido(abierto ? null : u.id)}>
                  <td className="px-4 py-3 text-white whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <ChevronDown size={13} className={`transition-transform ${abierto ? "rotate-180" : ""}`} style={{ color: "#4b5563" }} />
                      {u.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#9ca3af" }}>{u.area ?? "—"}</td>
                  <td className="px-4 py-3 text-center" style={{ color: "#22c55e" }}>{u.completadas}</td>
                  <td className="px-4 py-3 text-center" style={{ color: "#F59E0B" }}>{u.enProgreso}</td>
                  <td className="px-4 py-3 text-center font-mono" style={{ color: u.promedio == null ? "#4b5563" : "#c9a96a" }}>{u.promedio == null ? "—" : `${u.promedio}%`}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "#9ca3af" }}>{fmtTiempo(u.segundos)}</td>
                </tr>
                {abierto && (
                  <tr style={{ background: "#0d0d0d" }}>
                    <td colSpan={6} className="px-4 py-4">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>Cursos tomados ({cursos.length})</p>
                          {cursos.length === 0 ? <p className="text-xs" style={{ color: "#4b5563" }}>Ninguno todavía.</p> : (
                            <div className="space-y-1.5">
                              {cursos.map((c, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="inline-flex items-center gap-2 min-w-0" style={{ color: "#d1d5db" }}>
                                    {c.categoria && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.categoria.color }} />}
                                    <span className="truncate">{c.sesionTitulo}</span>
                                  </span>
                                  <span className="flex items-center gap-2 shrink-0">
                                    {c.estado === "completado"
                                      ? <CheckCircle2 size={12} style={{ color: "#22c55e" }} />
                                      : <Clock size={12} style={{ color: "#F59E0B" }} />}
                                    <span className="font-mono" style={{ color: "#6b7280" }}>{fmtTiempo(c.segundos)}</span>
                                    {c.calificacion != null && <span className="font-mono" style={{ color: c.aprobado ? "#22c55e" : "#EF4444" }}>{c.calificacion}%</span>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>Intentos de evaluación ({intentos.length})</p>
                          {intentos.length === 0 ? <p className="text-xs" style={{ color: "#4b5563" }}>Ninguno todavía.</p> : (
                            <div className="space-y-1.5">
                              {intentos.map((h, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="truncate" style={{ color: "#d1d5db" }}>{h.sesionTitulo}</span>
                                  <span className="flex items-center gap-2 shrink-0">
                                    <span style={{ color: "#4b5563" }}>{fmtFecha(h.creadoEn)}</span>
                                    <span className="font-mono" style={{ color: h.aprobado ? "#22c55e" : "#EF4444" }}>{h.calificacion}%</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {data.porUsuario.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-xs" style={{ color: "#4b5563" }}>Nadie ha tomado capacitaciones aún.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
