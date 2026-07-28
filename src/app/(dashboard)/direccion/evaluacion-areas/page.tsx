"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ClipboardCheck, ChevronLeft, ChevronRight, Check, ArrowLeft } from "lucide-react";
import {
  AREAS_EVALUABLES,
  DIMENSIONES_AREA,
  labelArea,
  labelMes,
  mesActual,
  nivelResultado,
  type CalifDimension,
} from "@/lib/evaluacion-area";

type EvalArea = {
  id?: string;
  area: string;
  mes: string;
  calificaciones: Record<string, number | null>;
  notas: Record<string, string>;
  comentario: string;
  finalizada: boolean;
  finalizadaEn: string | null;
  actualizadoEn?: string | null;
};

const GOLD = "#B3985B";

function promedio(calif: Record<string, number | null>): number | null {
  const vals = DIMENSIONES_AREA.map((d) => calif?.[d.id]).filter((v): v is number => typeof v === "number" && v > 0);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function navMes(mes: string, delta: number) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function EvaluacionAreasPage() {
  const [mes, setMes] = useState(mesActual());
  const [evaluaciones, setEvaluaciones] = useState<EvalArea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (m: string) => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/direccion/evaluacion-area?mes=${m}`);
      if (res.status === 403) {
        setError("Solo dirección puede ver esta sección.");
        setEvaluaciones([]);
        return;
      }
      const json = await res.json();
      setEvaluaciones(json.evaluaciones ?? []);
    } catch {
      setError("No se pudo cargar la información.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(mes);
  }, [mes, cargar]);

  const actualizarLocal = (area: string, patch: Partial<EvalArea>) => {
    setEvaluaciones((prev) => prev.map((e) => (e.area === area ? { ...e, ...patch } : e)));
  };

  const setCalif = (area: string, dim: string, valor: number) => {
    const ev = evaluaciones.find((e) => e.area === area);
    if (!ev || ev.finalizada) return;
    actualizarLocal(area, { calificaciones: { ...ev.calificaciones, [dim]: valor } });
  };

  const setNota = (area: string, dim: string, texto: string) => {
    const ev = evaluaciones.find((e) => e.area === area);
    if (!ev) return;
    actualizarLocal(area, { notas: { ...ev.notas, [dim]: texto } });
  };

  const guardar = async (area: string, finalizar?: boolean) => {
    const ev = evaluaciones.find((e) => e.area === area);
    if (!ev) return;
    setGuardando(area);
    setError(null);
    try {
      const res = await fetch("/api/direccion/evaluacion-area", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          mes,
          calificaciones: ev.calificaciones,
          notas: ev.notas,
          comentario: ev.comentario,
          finalizar,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar.");
        return;
      }
      actualizarLocal(area, json.evaluacion);
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/direccion/reportes" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/80 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Centro de reportes
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6" style={{ color: GOLD }} />
            Evaluación de áreas
          </h1>
          <p className="text-sm text-white/50 mt-0.5">
            Dirección califica la operación mensual de cada área, con base en su reporte de resultados.
          </p>
        </div>
        {/* Selector de mes */}
        <div className="flex items-center gap-2 ms-card px-2 py-1.5 rounded-lg self-start">
          <button onClick={() => setMes((m) => navMes(m, -1))} className="p-1 hover:text-white text-white/60">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium capitalize min-w-[9rem] text-center">{labelMes(mes)}</span>
          <button
            onClick={() => setMes((m) => navMes(m, 1))}
            disabled={mes >= mesActual()}
            className="p-1 hover:text-white text-white/60 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <div className="ms-card rounded-lg p-3 text-sm text-red-300 border border-red-500/30">{error}</div>}

      {cargando ? (
        <div className="text-white/40 text-sm py-10 text-center">Cargando…</div>
      ) : (
        <div className="space-y-3">
          {AREAS_EVALUABLES.map(({ id }) => {
            const ev = evaluaciones.find((e) => e.area === id);
            if (!ev) return null;
            const prom = promedio(ev.calificaciones);
            const nivel = nivelResultado(prom);
            const abiertaEsta = abierta === id;
            const calificadas = DIMENSIONES_AREA.filter((d) => typeof ev.calificaciones[d.id] === "number" && (ev.calificaciones[d.id] as number) > 0).length;
            return (
              <div key={id} className="ms-card rounded-xl overflow-hidden">
                {/* Fila resumen */}
                <button
                  onClick={() => setAbierta(abiertaEsta ? null : id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {labelArea(id)}
                      {ev.finalizada && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Finalizada
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {calificadas}/{DIMENSIONES_AREA.length} dimensiones calificadas
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-semibold" style={{ color: nivel.color }}>
                        {prom != null ? prom.toFixed(1) : "—"}
                      </div>
                      <div className="text-[10px]" style={{ color: nivel.color }}>{nivel.label}</div>
                    </div>
                    {abiertaEsta ? <ChevronLeft className="w-4 h-4 text-white/30 rotate-90" /> : <ChevronRight className="w-4 h-4 text-white/30 rotate-90" />}
                  </div>
                </button>

                {/* Detalle */}
                {abiertaEsta && (
                  <div className="border-t border-white/5 p-4 space-y-4">
                    {DIMENSIONES_AREA.map((dim: CalifDimension) => (
                      <div key={dim.id} className="space-y-1.5">
                        <div>
                          <div className="text-sm font-medium">{dim.label}</div>
                          <div className="text-xs text-white/40">{dim.desc}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((n) => {
                            const activo = ev.calificaciones[dim.id] === n;
                            return (
                              <button
                                key={n}
                                disabled={ev.finalizada}
                                onClick={() => setCalif(id, dim.id, n)}
                                className="w-9 h-9 rounded-md text-sm font-medium transition disabled:cursor-not-allowed"
                                style={{
                                  background: activo ? GOLD : "rgba(255,255,255,0.04)",
                                  color: activo ? "#111" : "rgba(255,255,255,0.6)",
                                }}
                              >
                                {n}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          disabled={ev.finalizada}
                          value={ev.notas[dim.id] ?? ""}
                          onChange={(e) => setNota(id, dim.id, e.target.value)}
                          placeholder="Nota (opcional)"
                          className="w-full bg-white/[0.03] border border-white/10 rounded-md px-2.5 py-1.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 disabled:opacity-50"
                        />
                      </div>
                    ))}

                    {/* Conclusión */}
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Conclusión de dirección</div>
                      <textarea
                        disabled={ev.finalizada}
                        value={ev.comentario}
                        onChange={(e) => actualizarLocal(id, { comentario: e.target.value })}
                        rows={3}
                        placeholder="Comentario global sobre el desempeño del área este mes…"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-md px-2.5 py-2 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 disabled:opacity-50"
                      />
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {ev.finalizada ? (
                        <button
                          onClick={() => guardar(id, false)}
                          disabled={guardando === id}
                          className="text-sm px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 disabled:opacity-50"
                        >
                          Reabrir
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => guardar(id)}
                            disabled={guardando === id}
                            className="text-sm px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/80 disabled:opacity-50"
                          >
                            {guardando === id ? "Guardando…" : "Guardar"}
                          </button>
                          <button
                            onClick={() => guardar(id, true)}
                            disabled={guardando === id || calificadas < DIMENSIONES_AREA.length}
                            className="text-sm px-3 py-1.5 rounded-md font-medium disabled:opacity-40"
                            style={{ background: GOLD, color: "#111" }}
                          >
                            Finalizar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
