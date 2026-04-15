"use client";

import { useEffect, useState } from "react";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const fmt = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
function mesLabel(key: string) { const [,m] = key.split("-"); return MESES[parseInt(m)-1]; }
function pct(v: number, t: number) { return t === 0 ? 0 : Math.round((v/t)*100); }

interface AgingItem { id: string; concepto: string; monto: number; montoCobrado: number; cliente: { nombre: string }; proyecto: { nombre: string; numeroProyecto: string } | null; fechaCompromiso: string }
interface AgingBucket { items: AgingItem[]; total: number }
interface AgingData { buckets: { corriente: AgingBucket; d0_30: AgingBucket; d31_60: AgingBucket; d60mas: AgingBucket }; total: number }
interface MargenProyecto { id: string; nombre: string; numero: string; fecha: string | null; estado: string; ingresos: number; cobrado: number; egresos: number; margen: number; margenPct: number | null }

interface KPIs {
  ingresosMes: number; egresosMes: number; utilidadMes: number; margenMes: number;
  totalIngresos: number; totalEgresos: number; utilidadPeriodo: number;
  cxcTotal: number; cxcVencido: number; cxpTotal: number; cxpVencido: number;
}
interface MesStat { mes: string; ingresos: number; egresos: number; }
interface CategoriaStat { nombre: string; tipo: string; total: number; count: number; }

export default function FinanzasReportePage() {
  const [data, setData] = useState<{ kpis: KPIs; porMes: MesStat[]; porCategoria: CategoriaStat[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [rango, setRango] = useState(6);
  const [aging, setAging] = useState<AgingData | null>(null);
  const [margen, setMargen] = useState<MargenProyecto[] | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finanzas/reporte?meses=${rango}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [rango]);

  useEffect(() => {
    fetch("/api/finanzas/aging").then(r => r.json()).then(d => setAging(d));
    fetch("/api/finanzas/margen").then(r => r.json()).then(d => setMargen(d.proyectos ?? []));
  }, []);

  const maxMes = data ? Math.max(...data.porMes.map(m => Math.max(m.ingresos, m.egresos)), 1) : 1;
  const ingresos = data?.porCategoria.filter(c => c.tipo === "INGRESO") ?? [];
  const egresos  = data?.porCategoria.filter(c => c.tipo === "GASTO") ?? [];
  const maxCat   = Math.max(...(data?.porCategoria.map(c => c.total) ?? [1]), 1);

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Reporte financiero</h1>
          <p className="text-[#6b7280] text-sm">KPIs · rentabilidad · flujo de caja</p>
        </div>
        <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
          {[3,6,12].map(n => (
            <button key={n} onClick={() => setRango(n)}
              className={`text-xs px-3 py-1 rounded transition-colors ${rango===n?"bg-[#B3985B] text-black font-semibold":"text-gray-500 hover:text-white"}`}>
              {n}m
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="py-16 text-center text-gray-600 text-sm">Cargando...</div> : !data ? null : (<>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Ingresos del mes",  value: fmt(data.kpis.ingresosMes),  color: "text-green-400", sub: "vs periodo" },
          { label: "Egresos del mes",   value: fmt(data.kpis.egresosMes),   color: "text-red-400",   sub: "" },
          { label: "Utilidad del mes",  value: fmt(data.kpis.utilidadMes),  color: data.kpis.utilidadMes>=0?"text-green-400":"text-red-400", sub: `${data.kpis.margenMes.toFixed(1)}% margen` },
          { label: `Utilidad ${rango}m`,value: fmt(data.kpis.utilidadPeriodo), color: data.kpis.utilidadPeriodo>=0?"text-[#B3985B]":"text-red-400", sub: "" },
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
          {data.kpis.cxcVencido > 0 && (
            <p className="text-red-400 text-xs mt-1">⚠ {fmt(data.kpis.cxcVencido)} vencido</p>
          )}
          <div className="mt-3 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${pct(data.kpis.cxcTotal - data.kpis.cxcVencido, data.kpis.cxcTotal)}%` }} />
          </div>
          <p className="text-gray-700 text-[10px] mt-1">{pct(data.kpis.cxcTotal - data.kpis.cxcVencido, data.kpis.cxcTotal)}% al corriente</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-3">Cuentas por pagar</p>
          <p className="text-2xl font-bold text-orange-400">{fmt(data.kpis.cxpTotal)}</p>
          {data.kpis.cxpVencido > 0 && (
            <p className="text-red-400 text-xs mt-1">⚠ {fmt(data.kpis.cxpVencido)} vencido</p>
          )}
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
        <h2 className="text-white font-semibold text-sm mb-5">Ingresos vs Egresos por mes</h2>
        <div className="space-y-3">
          {data.porMes.map(m => (
            <div key={m.mes} className="flex items-center gap-3">
              <span className="text-gray-500 text-[10px] w-8 text-right shrink-0">{mesLabel(m.mes)}</span>
              <div className="flex-1 space-y-1">
                {m.ingresos > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-green-600/60 rounded-sm flex items-center px-1.5 transition-all" style={{ width: `${pct(m.ingresos, maxMes)}%`, minWidth: "4px" }}>
                      {pct(m.ingresos, maxMes) > 20 && <span className="text-[9px] text-green-200 font-semibold">{fmt(m.ingresos)}</span>}
                    </div>
                    {pct(m.ingresos, maxMes) <= 20 && <span className="text-[9px] text-green-400">{fmt(m.ingresos)}</span>}
                  </div>
                )}
                {m.egresos > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-red-700/50 rounded-sm flex items-center px-1.5 transition-all" style={{ width: `${pct(m.egresos, maxMes)}%`, minWidth: "4px" }}>
                      {pct(m.egresos, maxMes) > 20 && <span className="text-[9px] text-red-200 font-semibold">{fmt(m.egresos)}</span>}
                    </div>
                    {pct(m.egresos, maxMes) <= 20 && <span className="text-[9px] text-red-400">{fmt(m.egresos)}</span>}
                  </div>
                )}
                {m.ingresos === 0 && m.egresos === 0 && <div className="h-4 flex items-center"><span className="text-[9px] text-gray-700 italic">Sin movimientos</span></div>}
              </div>
              <div className="text-right w-20 shrink-0">
                <p className={`text-[10px] font-semibold ${(m.ingresos-m.egresos)>=0?"text-green-400":"text-red-400"}`}>{fmt(m.ingresos-m.egresos)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 pt-3 border-t border-[#1a1a1a]">
          {[{c:"bg-green-600/60",l:"Ingresos"},{c:"bg-red-700/50",l:"Egresos"}].map(l=>(
            <div key={l.l} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-sm ${l.c}`}/><span className="text-gray-500 text-[10px]">{l.l}</span></div>
          ))}
        </div>
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
                    <p className="text-gray-700 text-[9px] mt-0.5">{c.count} movimiento{c.count!==1?"s":""}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      </>)}

      {/* ── Aging CxC ── */}
      {aging && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Aging — Cuentas por cobrar</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { key: "corriente", label: "Al corriente", color: "text-green-400", bg: "border-green-800/40" },
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
          {/* Items vencidos */}
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

      {/* ── Margen por proyecto ── */}
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
  );
}
