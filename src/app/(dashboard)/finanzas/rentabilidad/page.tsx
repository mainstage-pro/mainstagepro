"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Proyecto = {
  id: string;
  nombre: string;
  numero: string | null;
  tipoEvento: string | null;
  tipoServicio: string | null;
  fechaEvento: string | null;
  mes: string | null;
  clienteNombre: string;
  clienteEmpresa: string | null;
  granTotal: number;
  cobrado: number;
  costoTotal: number;
  utilidad: number;
  margen: number;
  utilidadPronosticada: number | null;
  margenPronosticado: number | null;
  estado: string;
};

type TipoEvento = {
  tipoEvento: string;
  count: number;
  ingresos: number;
  costos: number;
  utilidad: number;
  margenPromedio: number;
};

type RentabilidadData = {
  proyectos: Proyecto[];
  porTipoEvento: TipoEvento[];
  kpis: {
    totalProyectos: number;
    totalIngresos: number;
    totalCostos: number;
    totalUtilidad: number;
    margenGlobal: number;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}
function margenColor(m: number) {
  if (m >= 40) return "text-emerald-400";
  if (m >= 25) return "text-[#c9a96a]";
  if (m >= 10) return "text-yellow-400";
  return "text-red-400";
}
function margenBg(m: number) {
  if (m >= 40) return "bg-emerald-500";
  if (m >= 25) return "bg-[#c9a96a]";
  if (m >= 10) return "bg-yellow-400";
  return "bg-red-500";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RentabilidadPage() {
  const [meses, setMeses] = useState("12");
  const [data, setData] = useState<RentabilidadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState("");
  const [ordenar, setOrdenar] = useState<"fecha" | "margen" | "utilidad">("fecha");

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/finanzas/rentabilidad?meses=${m}`);
      const d = await r.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(meses); }, [meses, load]);

  const proyectosFiltrados = (data?.proyectos ?? [])
    .filter(p => {
      if (!buscar) return true;
      const q = buscar.toLowerCase();
      return p.nombre.toLowerCase().includes(q)
        || p.clienteNombre.toLowerCase().includes(q)
        || (p.numero ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (ordenar === "margen")   return b.margen - a.margen;
      if (ordenar === "utilidad") return b.utilidad - a.utilidad;
      return (b.fechaEvento ?? "").localeCompare(a.fechaEvento ?? "");
    });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">Rentabilidad por Evento</h1>
            <p className="text-xs text-gray-500 mt-0.5">Margen real por proyecto completado o en curso</p>
          </div>
          <select
            value={meses}
            onChange={e => setMeses(e.target.value)}
            className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a96a]/50"
          >
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Últimos 12 meses</option>
            <option value="24">Últimos 24 meses</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#c9a96a]/30 border-t-[#c9a96a] rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="px-6 py-6 space-y-6">

          {/* Métricas globales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="ms-card px-5 py-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Proyectos</p>
              <p className="ms-h1">{data.kpis.totalProyectos}</p>
            </div>
            <div className="ms-card px-5 py-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Ingresos cobrados</p>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{fmt(data.kpis.totalIngresos)}</p>
            </div>
            <div className="ms-card px-5 py-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Utilidad total</p>
              <p className={`text-2xl font-bold tabular-nums ${data.kpis.totalUtilidad >= 0 ? "text-white" : "text-red-400"}`}>
                {fmt(data.kpis.totalUtilidad)}
              </p>
            </div>
            <div className="ms-card px-5 py-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Margen promedio</p>
              <p className={`text-2xl font-bold tabular-nums ${margenColor(data.kpis.margenGlobal)}`}>
                {fmtPct(data.kpis.margenGlobal)}
              </p>
            </div>
          </div>

          {/* Por tipo de evento */}
          {data.porTipoEvento.length > 0 && (
            <div className="ms-table-wrapper">
              <div className="px-4 py-3 border-b border-[#1a1a1a]">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Por tipo de evento</h3>
              </div>
              <div className="divide-y divide-[#161616]">
                {data.porTipoEvento.map(t => (
                  <div key={t.tipoEvento} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-sm font-medium text-white">{t.tipoEvento}</p>
                        <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded">{t.count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 bg-[#1e1e1e] rounded-full flex-1">
                          <div
                            className={`h-full rounded-full ${margenBg(t.margenPromedio)}`}
                            style={{ width: `${Math.max(0, Math.min(100, t.margenPromedio))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${margenColor(t.margenPromedio)}`}>{fmtPct(t.margenPromedio)}</p>
                      <p className="text-[10px] text-gray-600">{fmt(t.utilidad)} utilidad</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtros tabla */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Buscar evento o cliente..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a96a]/40 w-64"
            />
            <div className="flex gap-1 ms-card rounded-lg p-1">
              {(["fecha", "margen", "utilidad"] as const).map(o => (
                <button
                  key={o}
                  onClick={() => setOrdenar(o)}
                  className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                    ordenar === o ? "bg-[#1e1e1e] text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {{ fecha: "Por fecha", margen: "Por margen", utilidad: "Por utilidad" }[o]}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-gray-600">{proyectosFiltrados.length} evento(s)</span>
          </div>

          {/* Tabla de proyectos */}
          <div className="ms-table-wrapper">
            <div className="divide-y divide-[#161616]">
              {proyectosFiltrados.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-8">Sin resultados</p>
              ) : proyectosFiltrados.map(p => (
                <div key={p.id} className="px-4 py-4 hover:bg-[#141414] transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Margen real visual */}
                    <div className="flex flex-col items-center shrink-0 w-14">
                      <span className={`text-sm font-bold tabular-nums ${margenColor(p.margen)}`}>{fmtPct(p.margen)}</span>
                      <div className="h-1 bg-[#1e1e1e] rounded-full w-full mt-1">
                        <div
                          className={`h-full rounded-full ${margenBg(p.margen)}`}
                          style={{ width: `${Math.max(0, Math.min(100, p.margen))}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-600 mt-0.5">real</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.numero && <span className="text-[10px] text-gray-600">#{p.numero}</span>}
                        <p className="text-sm font-medium text-white truncate">{p.nombre}</p>
                        {p.tipoEvento && (
                          <span className="text-[9px] bg-[#1e1e1e] text-gray-500 px-1.5 py-0.5 rounded">{p.tipoEvento}</span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                          p.estado === 'COMPLETADO' ? 'bg-emerald-900/30 text-emerald-500' : 'bg-blue-900/30 text-blue-400'
                        }`}>{p.estado === 'COMPLETADO' ? 'Completado' : 'En curso'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <p className="text-[10px] text-gray-500">{p.clienteNombre}{p.clienteEmpresa ? ` · ${p.clienteEmpresa}` : ""}</p>
                        {p.fechaEvento && (
                          <p className="text-[10px] text-gray-600">{fmtFecha(p.fechaEvento)}</p>
                        )}
                      </div>

                      {/* Pronosticado vs Real */}
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        {/* Pronosticado */}
                        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2">
                          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Pronosticado</p>
                          {p.utilidadPronosticada !== null ? (
                            <>
                              <p className={`text-[12px] font-bold tabular-nums ${
                                p.utilidadPronosticada >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>{fmt(p.utilidadPronosticada)}</p>
                              <p className="text-[10px] text-gray-500">
                                {p.margenPronosticado !== null ? `${p.margenPronosticado.toFixed(1)}% margen` : ''}
                              </p>
                            </>
                          ) : (
                            <p className="text-[11px] text-gray-600">Sin cotización</p>
                          )}
                        </div>
                        {/* Real */}
                        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2">
                          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Real</p>
                          <p className={`text-[12px] font-bold tabular-nums ${
                            p.utilidad >= 0 ? 'text-white' : 'text-red-400'
                          }`}>{fmt(p.utilidad)}</p>
                          <p className="text-[10px] text-gray-500">
                            {p.margen.toFixed(1)}% margen
                          </p>
                        </div>
                      </div>

                      {/* Delta pronosticado vs real */}
                      {p.utilidadPronosticada !== null && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {(() => {
                            const delta = p.utilidad - p.utilidadPronosticada;
                            const isPositive = delta >= 0;
                            return (
                              <>
                                <span className={`text-[10px] font-semibold tabular-nums ${
                                  isPositive ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {isPositive ? '▲' : '▼'} {fmt(Math.abs(delta))}
                                </span>
                                <span className="text-[10px] text-gray-600">
                                  {isPositive ? 'por encima' : 'por debajo'} del pronóstico
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Cobrado */}
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Cobrado</p>
                      <p className="text-sm font-bold text-emerald-400 tabular-nums">{fmt(p.cobrado)}</p>
                      <p className="text-[11px] text-gray-600 tabular-nums">− {fmt(p.costoTotal)} costos</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        <p className="text-gray-600 text-sm text-center py-12">Error cargando datos</p>
      )}
    </div>
  );
}
