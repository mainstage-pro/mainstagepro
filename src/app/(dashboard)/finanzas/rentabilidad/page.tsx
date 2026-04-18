"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
const fmtK = (n: number) => `$${n >= 1000000 ? (n / 1000000).toFixed(1) + "M" : n >= 1000 ? (n / 1000).toFixed(0) + "k" : n}`;
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function mesLabel(k: string) { const [, m] = k.split("-"); return MESES[parseInt(m) - 1]; }

interface TipoStat { tipoEvento: string; count: number; ingresos: number; costos: number; utilidad: number; margenPromedio: number }
interface ClienteStat { clienteId: string; clienteNombre: string; count: number; ingresos: number; costos: number; utilidad: number; margenPromedio: number }
interface MesStat { mes: string; count: number; ingresos: number; costos: number; utilidad: number }
interface KPIs { totalIngresos: number; totalCostos: number; totalUtilidad: number; margenGlobal: number; totalProyectos: number }
interface Proyecto { id: string; nombre: string; numero: string; tipoEvento: string; clienteNombre: string; cobrado: number; costoTotal: number; utilidad: number; margen: number; fechaEvento: string | null; estado: string }

interface Data { kpis: KPIs; porTipoEvento: TipoStat[]; porCliente: ClienteStat[]; porMes: MesStat[]; proyectos: Proyecto[] }

const margenColor = (m: number) => m >= 30 ? "#4ade80" : m >= 15 ? "#facc15" : m >= 0 ? "#fb923c" : "#f87171";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-1.5 font-semibold">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-white font-semibold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function RentabilidadPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [rango, setRango] = useState(12);
  const [vista, setVista] = useState<"tipo" | "cliente" | "mes" | "proyectos">("tipo");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finanzas/rentabilidad?meses=${rango}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [rango]);

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/finanzas/reporte" className="text-xs text-gray-500 hover:text-gray-300">← Finanzas</Link>
          </div>
          <h1 className="text-xl font-semibold text-white">Rentabilidad</h1>
          <p className="text-[#6b7280] text-sm">Por tipo de evento · por cliente · estacionalidad</p>
        </div>
        <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
          {[6, 12, 24].map(n => (
            <button key={n} onClick={() => setRango(n)}
              className={`text-xs px-3 py-1 rounded transition-colors ${rango === n ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
              {n}m
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />)}
        </div>
      ) : !data ? null : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Proyectos", value: String(data.kpis.totalProyectos), color: "text-white", sub: `últimos ${rango}m` },
              { label: "Ingresos cobrados", value: fmt(data.kpis.totalIngresos), color: "text-green-400", sub: "" },
              { label: "Costos totales", value: fmt(data.kpis.totalCostos), color: "text-red-400", sub: "" },
              { label: "Utilidad neta", value: fmt(data.kpis.totalUtilidad), color: data.kpis.totalUtilidad >= 0 ? "text-[#B3985B]" : "text-red-400", sub: "" },
              { label: "Margen global", value: `${data.kpis.margenGlobal.toFixed(1)}%`, color: data.kpis.margenGlobal >= 20 ? "text-green-400" : data.kpis.margenGlobal >= 0 ? "text-yellow-400" : "text-red-400", sub: "sobre cobrado" },
            ].map(k => (
              <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                {k.sub && <p className="text-gray-600 text-[10px] mt-0.5">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Vista selector */}
          <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1 w-fit">
            {([["tipo", "Por tipo de evento"], ["cliente", "Por cliente"], ["mes", "Estacionalidad"], ["proyectos", "Proyectos"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setVista(v)}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${vista === v ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Por tipo de evento */}
          {vista === "tipo" && (
            <div className="space-y-4">
              {data.porTipoEvento.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin datos en este período</p>
              ) : (
                <>
                  <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
                    <h2 className="text-white font-semibold text-sm mb-4">Ingresos por tipo de evento</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.porTipoEvento.map(t => ({ name: t.tipoEvento, Ingresos: t.ingresos, Costos: t.costos }))}
                        margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barGap={3}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={fmtK} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff06" }} />
                        <Bar dataKey="Ingresos" fill="#4ade80" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Costos" fill="#f87171" opacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.porTipoEvento.map(t => (
                      <div key={t.tipoEvento} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white font-medium text-sm">{t.tipoEvento}</p>
                          <span className="text-gray-500 text-xs">{t.count} evento{t.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><p className="text-gray-500">Ingresos</p><p className="text-green-400 font-semibold">{fmt(t.ingresos)}</p></div>
                          <div><p className="text-gray-500">Utilidad</p><p className={`font-semibold ${t.utilidad >= 0 ? "text-[#B3985B]" : "text-red-400"}`}>{fmt(t.utilidad)}</p></div>
                          <div><p className="text-gray-500">Margen</p><p className="font-semibold" style={{ color: margenColor(t.margenPromedio) }}>{t.margenPromedio.toFixed(1)}%</p></div>
                        </div>
                        <div className="mt-2 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, t.margenPromedio))}%`, backgroundColor: margenColor(t.margenPromedio) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Por cliente */}
          {vista === "cliente" && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1a1a1a]">
                <h2 className="text-white font-semibold text-sm">Top 10 clientes por ingresos</h2>
              </div>
              {data.porCliente.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin datos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        {["Cliente", "Eventos", "Ingresos", "Costos", "Utilidad", "Margen"].map(h => (
                          <th key={h} className="text-left text-xs text-gray-500 px-5 py-2 font-normal">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.porCliente.map((c, i) => (
                        <tr key={c.clienteId} className={`border-b border-[#1a1a1a] hover:bg-[#161616] ${i % 2 === 0 ? "" : "bg-[#0e0e0e]"}`}>
                          <td className="px-5 py-3">
                            <Link href={`/crm/clientes/${c.clienteId}`} className="text-white hover:text-[#B3985B] transition-colors font-medium">
                              {c.clienteNombre}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-gray-400 text-xs">{c.count}</td>
                          <td className="px-5 py-3 text-green-400 font-semibold text-xs">{fmt(c.ingresos)}</td>
                          <td className="px-5 py-3 text-red-400 text-xs">{fmt(c.costos)}</td>
                          <td className="px-5 py-3 font-semibold text-xs" style={{ color: c.utilidad >= 0 ? "#B3985B" : "#f87171" }}>{fmt(c.utilidad)}</td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-semibold" style={{ color: margenColor(c.margenPromedio) }}>{c.margenPromedio.toFixed(1)}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Estacionalidad */}
          {vista === "mes" && (
            <div className="space-y-4">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
                <h2 className="text-white font-semibold text-sm mb-4">Eventos por mes</h2>
                {data.porMes.length === 0 ? (
                  <p className="text-gray-600 text-xs text-center py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.porMes.map(m => ({ name: mesLabel(m.mes), Ingresos: m.ingresos, Costos: m.costos, count: m.count }))}
                      margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtK} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff06" }} />
                      <Bar dataKey="Ingresos" fill="#4ade80" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="Costos" fill="#f87171" opacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.porMes.map(m => (
                  <div key={m.mes} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
                    <p className="text-gray-500 text-[10px] uppercase">{mesLabel(m.mes)}</p>
                    <p className="text-white font-semibold text-sm mt-1">{m.count} evento{m.count !== 1 ? "s" : ""}</p>
                    <p className="text-green-400 text-xs">{fmt(m.ingresos)}</p>
                    <p className={`text-xs font-medium ${m.utilidad >= 0 ? "text-[#B3985B]" : "text-red-400"}`}>{fmt(m.utilidad)} util.</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proyectos */}
          {vista === "proyectos" && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1a1a1a]">
                <h2 className="text-white font-semibold text-sm">Proyectos completados (últimos 30)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-[#1a1a1a]">
                      {["Proyecto", "Tipo", "Cliente", "Cobrado", "Costo", "Utilidad", "Margen"].map(h => (
                        <th key={h} className="text-left text-xs text-gray-500 px-4 py-2 font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.proyectos.map((p, i) => (
                      <tr key={p.id} className={`border-b border-[#1a1a1a] hover:bg-[#161616] ${i % 2 === 0 ? "" : "bg-[#0e0e0e]"}`}>
                        <td className="px-4 py-3">
                          <Link href={`/proyectos/${p.id}`} className="text-white hover:text-[#B3985B] transition-colors font-medium text-xs">{p.nombre}</Link>
                          <p className="text-gray-600 text-[10px]">{p.numero}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{p.tipoEvento}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-[120px]">{p.clienteNombre}</td>
                        <td className="px-4 py-3 text-green-400 text-xs font-semibold">{fmt(p.cobrado)}</td>
                        <td className="px-4 py-3 text-red-400 text-xs">{fmt(p.costoTotal)}</td>
                        <td className="px-4 py-3 text-xs font-semibold" style={{ color: p.utilidad >= 0 ? "#B3985B" : "#f87171" }}>{fmt(p.utilidad)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, p.margen))}%`, backgroundColor: margenColor(p.margen) }} />
                            </div>
                            <span className="text-[10px]" style={{ color: margenColor(p.margen) }}>{p.margen.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
