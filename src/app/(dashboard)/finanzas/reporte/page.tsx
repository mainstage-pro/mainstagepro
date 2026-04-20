"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { SkeletonKPIs, SkeletonTable } from "@/components/Skeleton";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const fmt  = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => `$${n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1000 ? (n / 1000).toFixed(0) + "k" : n}`;
function mesLabel(k: string) { const [, m] = k.split("-"); return MESES[parseInt(m) - 1]; }
function pct(v: number, t: number) { return t === 0 ? 0 : Math.round((v / t) * 100); }
const margenColor = (m: number) => m >= 30 ? "#4ade80" : m >= 15 ? "#facc15" : m >= 0 ? "#fb923c" : "#f87171";

// ── Types (Reporte) ───────────────────────────────────────────────────────────

interface AgingItem { id: string; concepto: string; monto: number; montoCobrado: number; cliente: { nombre: string }; proyecto: { nombre: string; numeroProyecto: string } | null; fechaCompromiso: string }
interface AgingBucket { items: AgingItem[]; total: number }
interface AgingData { buckets: { corriente: AgingBucket; d0_30: AgingBucket; d31_60: AgingBucket; d60mas: AgingBucket }; total: number }
interface MargenProyecto { id: string; nombre: string; numero: string; fecha: string | null; estado: string; ingresos: number; cobrado: number; egresos: number; margen: number; margenPct: number | null }

interface ReporteKPIs {
  ingresosMes: number; egresosMes: number; utilidadMes: number; margenMes: number;
  totalIngresos: number; totalEgresos: number; utilidadPeriodo: number;
  cxcTotal: number; cxcVencido: number; cxpTotal: number; cxpVencido: number;
}
interface ReporteMesStat { mes: string; ingresos: number; egresos: number; }
interface CategoriaStat { nombre: string; tipo: string; total: number; count: number; }

// ── Types (Rentabilidad) ──────────────────────────────────────────────────────

interface TipoStat { tipoEvento: string; count: number; ingresos: number; costos: number; utilidad: number; margenPromedio: number }
interface ClienteStat { clienteId: string; clienteNombre: string; count: number; ingresos: number; costos: number; utilidad: number; margenPromedio: number }
interface RentMesStat { mes: string; count: number; ingresos: number; costos: number; utilidad: number }
interface RentKPIs { totalIngresos: number; totalCostos: number; totalUtilidad: number; margenGlobal: number; totalProyectos: number }
interface Proyecto { id: string; nombre: string; numero: string; tipoEvento: string; clienteNombre: string; cobrado: number; costoTotal: number; utilidad: number; margen: number; fechaEvento: string | null; estado: string }
interface RentData { kpis: RentKPIs; porTipoEvento: TipoStat[]; porCliente: ClienteStat[]; porMes: RentMesStat[]; proyectos: Proyecto[] }

// ── Tooltip compartido ────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinanzasReportePage() {
  const [pageTab, setPageTab] = useState<"reporte" | "rentabilidad">("reporte");

  // Reporte state
  const [data, setData] = useState<{ kpis: ReporteKPIs; porMes: ReporteMesStat[]; porCategoria: CategoriaStat[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [rango, setRango] = useState(6);
  const [aging, setAging] = useState<AgingData | null>(null);
  const [margen, setMargen] = useState<MargenProyecto[] | null>(null);

  // Rentabilidad state
  const [rentData, setRentData] = useState<RentData | null>(null);
  const [rentLoading, setRentLoading] = useState(false);
  const [rangoRent, setRangoRent] = useState(12);
  const [vista, setVista] = useState<"tipo" | "cliente" | "mes" | "proyectos">("tipo");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finanzas/reporte?meses=${rango}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [rango]);

  useEffect(() => {
    fetch("/api/finanzas/aging").then(r => r.json()).then(d => setAging(d));
    fetch("/api/finanzas/margen").then(r => r.json()).then(d => setMargen(d.proyectos ?? []));
  }, []);

  useEffect(() => {
    if (pageTab !== "rentabilidad") return;
    setRentLoading(true);
    fetch(`/api/finanzas/rentabilidad?meses=${rangoRent}`)
      .then(r => r.json())
      .then(d => { setRentData(d); setRentLoading(false); });
  }, [pageTab, rangoRent]);

  const ingresos = data?.porCategoria.filter(c => c.tipo === "INGRESO") ?? [];
  const egresos  = data?.porCategoria.filter(c => c.tipo === "GASTO") ?? [];
  const maxCat   = Math.max(...(data?.porCategoria.map(c => c.total) ?? [1]), 1);

  const chartData = (data?.porMes ?? []).map(m => ({
    name: mesLabel(m.mes),
    Ingresos: m.ingresos,
    Gastos: m.egresos,
  }));

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Finanzas</h1>
          <p className="text-[#6b7280] text-sm">Reportes · KPIs · Rentabilidad</p>
        </div>
        {pageTab === "reporte" && (
          <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
            {[3, 6, 12].map(n => (
              <button key={n} onClick={() => setRango(n)}
                className={`text-xs px-3 py-1 rounded transition-colors ${rango === n ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
                {n}m
              </button>
            ))}
          </div>
        )}
        {pageTab === "rentabilidad" && (
          <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
            {[6, 12, 24].map(n => (
              <button key={n} onClick={() => setRangoRent(n)}
                className={`text-xs px-3 py-1 rounded transition-colors ${rangoRent === n ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
                {n}m
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#1a1a1a] pb-0">
        {([["reporte", "Reporte Financiero"], ["rentabilidad", "Rentabilidad"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setPageTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${pageTab === key ? "border-[#B3985B] text-white" : "border-transparent text-[#6b7280] hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: REPORTE ─────────────────────────────────────────────────────── */}
      {pageTab === "reporte" && (
        <div className="space-y-6">
          {loading ? (<div className="space-y-4"><SkeletonKPIs count={4} /><SkeletonTable rows={6} cols={4} /></div>) : !data ? null : (<>

          {/* KPIs principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Ingresos del mes",  value: fmt(data.kpis.ingresosMes),  color: "text-green-400", sub: "vs periodo" },
              { label: "Egresos del mes",   value: fmt(data.kpis.egresosMes),   color: "text-red-400",   sub: "" },
              { label: "Utilidad del mes",  value: fmt(data.kpis.utilidadMes),  color: data.kpis.utilidadMes >= 0 ? "text-green-400" : "text-red-400", sub: `${data.kpis.margenMes.toFixed(1)}% margen` },
              { label: `Utilidad ${rango}m`, value: fmt(data.kpis.utilidadPeriodo), color: data.kpis.utilidadPeriodo >= 0 ? "text-[#B3985B]" : "text-red-400", sub: "" },
            ].map(k => (
              <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                {k.sub && <p className="text-gray-600 text-[10px] mt-0.5">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* CxC · CxP · Liquidez */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-3">Cuentas por cobrar</p>
              <p className="text-2xl font-bold text-blue-400">{fmt(data.kpis.cxcTotal)}</p>
              {data.kpis.cxcVencido > 0 && <p className="text-red-400 text-xs mt-1">⚠ {fmt(data.kpis.cxcVencido)} vencido</p>}
              <div className="mt-3 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${pct(data.kpis.cxcTotal - data.kpis.cxcVencido, data.kpis.cxcTotal)}%` }} />
              </div>
              <p className="text-gray-700 text-[10px] mt-1">{pct(data.kpis.cxcTotal - data.kpis.cxcVencido, data.kpis.cxcTotal)}% al corriente</p>
            </div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-3">Cuentas por pagar</p>
              <p className="text-2xl font-bold text-orange-400">{fmt(data.kpis.cxpTotal)}</p>
              {data.kpis.cxpVencido > 0 && <p className="text-red-400 text-xs mt-1">⚠ {fmt(data.kpis.cxpVencido)} vencido</p>}
              <div className="mt-3 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full bg-orange-500/60 rounded-full" style={{ width: `${pct(data.kpis.cxpVencido, data.kpis.cxpTotal || 1)}%` }} />
              </div>
              <p className="text-gray-700 text-[10px] mt-1">{pct(data.kpis.cxpVencido, data.kpis.cxpTotal || 1)}% vencido</p>
            </div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-3">Posición neta</p>
              <p className={`text-2xl font-bold ${(data.kpis.cxcTotal - data.kpis.cxpTotal) >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmt(data.kpis.cxcTotal - data.kpis.cxpTotal)}
              </p>
              <p className="text-gray-600 text-xs mt-1">CxC − CxP</p>
              <p className="text-gray-700 text-[10px] mt-2">
                Rentabilidad operativa: <span className={data.kpis.margenMes >= 20 ? "text-green-400" : data.kpis.margenMes >= 0 ? "text-yellow-400" : "text-red-400"}>
                  {data.kpis.margenMes.toFixed(1)}%
                </span>
              </p>
            </div>
          </div>

          {/* Gráfica por mes */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Ingresos vs Egresos por mes</h2>
            {chartData.length === 0 ? (
              <p className="text-gray-700 text-xs text-center py-8">Sin movimientos en el período</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const ing = payload.find(p => p.dataKey === "Ingresos")?.value as number ?? 0;
                        const gas = payload.find(p => p.dataKey === "Gastos")?.value as number ?? 0;
                        return (
                          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs shadow-lg">
                            <p className="text-gray-400 mb-1.5 font-semibold">{label}</p>
                            <div className="flex items-center gap-2 mb-0.5"><div className="w-2 h-2 rounded-full bg-green-400" /><span className="text-gray-400">Ingresos:</span><span className="text-white font-semibold">{fmt(ing)}</span></div>
                            <div className="flex items-center gap-2 mb-0.5"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-gray-400">Gastos:</span><span className="text-white font-semibold">{fmt(gas)}</span></div>
                            <div className="mt-1.5 pt-1.5 border-t border-[#333] flex items-center gap-2"><span className="text-gray-500">Flujo:</span><span className={`font-semibold ${(ing - gas) >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(ing - gas)}</span></div>
                          </div>
                        );
                      }}
                      cursor={{ fill: "#ffffff06" }}
                    />
                    <Bar dataKey="Ingresos" fill="#4ade80" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Gastos" fill="#f87171" opacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-3 pt-3 border-t border-[#1a1a1a]">
                  {[{ color: "#4ade80", label: "Ingresos" }, { color: "#f87171", label: "Gastos" }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                      <span className="text-gray-500 text-[10px]">{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Por categoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{ title: "Ingresos por categoría", cats: ingresos, color: "bg-green-500/50", text: "text-green-400" },
              { title: "Egresos por categoría",  cats: egresos,  color: "bg-red-500/40",   text: "text-red-400" }].map(g => (
              <div key={g.title} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
                <h2 className="text-white font-semibold text-sm mb-4">{g.title}</h2>
                {g.cats.length === 0 ? (
                  <p className="text-gray-700 text-xs text-center py-6">Sin datos</p>
                ) : (
                  <div className="space-y-3">
                    {g.cats.map(c => (
                      <div key={c.nombre}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-300 text-xs truncate flex-1">{c.nombre}</span>
                          <span className={`text-xs font-semibold ml-2 shrink-0 ${g.text}`}>{fmt(c.total)}</span>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${g.color}`} style={{ width: `${pct(c.total, maxCat)}%` }} />
                        </div>
                        <p className="text-gray-700 text-[9px] mt-0.5">{c.count} movimiento{c.count !== 1 ? "s" : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          </>)}

          {/* Aging CxC */}
          {aging && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-4">Aging — Cuentas por cobrar</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { key: "corriente", label: "Al corriente", color: "text-green-400",  bg: "border-green-800/40" },
                  { key: "d0_30",     label: "1–30 días",    color: "text-yellow-400", bg: "border-yellow-800/40" },
                  { key: "d31_60",    label: "31–60 días",   color: "text-orange-400", bg: "border-orange-800/40" },
                  { key: "d60mas",    label: "60+ días",     color: "text-red-400",    bg: "border-red-800/40" },
                ].map(b => {
                  const bucket = aging.buckets[b.key as keyof typeof aging.buckets];
                  return (
                    <div key={b.key} className={`bg-[#0d0d0d] border ${b.bg} rounded-xl p-4`}>
                      <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{b.label}</p>
                      <p className={`text-xl font-bold ${b.color}`}>{fmt(bucket.total)}</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">{bucket.items.length} factura{bucket.items.length !== 1 ? "s" : ""}</p>
                    </div>
                  );
                })}
              </div>
              {[...aging.buckets.d0_30.items, ...aging.buckets.d31_60.items, ...aging.buckets.d60mas.items].length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-gray-600 text-[10px] uppercase tracking-wider font-semibold mb-2">Vencidas</p>
                  {[...aging.buckets.d60mas.items, ...aging.buckets.d31_60.items, ...aging.buckets.d0_30.items].slice(0, 10).map(item => {
                    const saldo = item.monto - (item.montoCobrado ?? 0);
                    const dias = Math.floor((new Date().getTime() - new Date(item.fechaCompromiso).getTime()) / 86400000);
                    return (
                      <div key={item.id} className="flex items-center justify-between bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-xs truncate">{item.cliente.nombre}</p>
                          {item.proyecto && <p className="text-gray-600 text-[10px]">{item.proyecto.numeroProyecto} · {item.proyecto.nombre}</p>}
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <p className="text-white text-xs font-semibold">{fmt(saldo)}</p>
                          <p className="text-red-400 text-[10px]">{dias}d vencida</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Margen por proyecto */}
          {margen && margen.length > 0 && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-4">Margen por proyecto (últimos 30)</h2>
              <div className="space-y-2">
                {margen.map(p => {
                  const maxVal = Math.max(...margen.map(x => x.ingresos), 1);
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="min-w-0 flex-1">
                          <a href={`/proyectos/${p.id}`} className="text-white text-xs hover:text-[#B3985B] transition-colors truncate block">{p.nombre}</a>
                          <p className="text-gray-600 text-[10px]">{p.numero}</p>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <p className={`text-xs font-semibold ${p.margen >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(p.margen)}</p>
                          {p.margenPct !== null && <p className="text-gray-600 text-[10px]">{p.margenPct}% margen</p>}
                        </div>
                      </div>
                      <div className="flex gap-0.5 h-2">
                        <div className="h-full bg-green-600/50 rounded-l-full" style={{ width: `${pct(p.ingresos, maxVal)}%` }} title={`Ingresos: ${fmt(p.ingresos)}`} />
                        <div className="h-full bg-red-700/40 rounded-r-full" style={{ width: `${pct(p.egresos, maxVal)}%` }} title={`Egresos: ${fmt(p.egresos)}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 pt-3 border-t border-[#1a1a1a]">
                {[{ c: "bg-green-600/50", l: "Ingresos" }, { c: "bg-red-700/40", l: "Egresos" }].map(l => (
                  <div key={l.l} className="flex items-center gap-1.5"><div className={`w-3 h-2 rounded-sm ${l.c}`} /><span className="text-gray-500 text-[10px]">{l.l}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: RENTABILIDAD ────────────────────────────────────────────────── */}
      {pageTab === "rentabilidad" && (
        <div className="space-y-6">
          {rentLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />)}
            </div>
          ) : !rentData ? null : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Proyectos",        value: String(rentData.kpis.totalProyectos),   color: "text-white",   sub: `últimos ${rangoRent}m` },
                  { label: "Ingresos cobrados", value: fmt(rentData.kpis.totalIngresos),       color: "text-green-400", sub: "" },
                  { label: "Costos totales",    value: fmt(rentData.kpis.totalCostos),         color: "text-red-400",   sub: "" },
                  { label: "Utilidad neta",     value: fmt(rentData.kpis.totalUtilidad),       color: rentData.kpis.totalUtilidad >= 0 ? "text-[#B3985B]" : "text-red-400", sub: "" },
                  { label: "Margen global",     value: `${rentData.kpis.margenGlobal.toFixed(1)}%`, color: rentData.kpis.margenGlobal >= 20 ? "text-green-400" : rentData.kpis.margenGlobal >= 0 ? "text-yellow-400" : "text-red-400", sub: "sobre cobrado" },
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
                  {rentData.porTipoEvento.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-8">Sin datos en este período</p>
                  ) : (
                    <>
                      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
                        <h2 className="text-white font-semibold text-sm mb-4">Ingresos por tipo de evento</h2>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={rentData.porTipoEvento.map(t => ({ name: t.tipoEvento, Ingresos: t.ingresos, Costos: t.costos }))}
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
                        {rentData.porTipoEvento.map(t => (
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
                  {rentData.porCliente.length === 0 ? (
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
                          {rentData.porCliente.map((c, i) => (
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
                    {rentData.porMes.length === 0 ? (
                      <p className="text-gray-600 text-xs text-center py-8">Sin datos</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={rentData.porMes.map(m => ({ name: mesLabel(m.mes), Ingresos: m.ingresos, Costos: m.costos, count: m.count }))}
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
                    {rentData.porMes.map(m => (
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
                        {rentData.proyectos.map((p, i) => (
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
      )}
    </div>
  );
}
