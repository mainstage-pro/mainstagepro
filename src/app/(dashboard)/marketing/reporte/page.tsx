"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

interface MesStat {
  mes: string; total: number; publicadas: number; pendientes: number; listas: number; enProceso: number;
}
interface FormatoStat { formato: string; total: number; publicadas: number; }
interface TipoStat { tipoId: string; nombre: string; total: number; publicadas: number; }
interface ReporteData {
  total: number; publicadas: number; pendientes: number; enProceso: number; listas: number;
  porMes: MesStat[];
  porFormato: FormatoStat[];
  porTipo: TipoStat[];
  plataformas: { facebook: number; instagram: number; tiktok: number; youtube: number };
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const FORMATO_COLORS: Record<string, string> = {
  POST: "bg-blue-500", REEL: "bg-purple-500", STORIE: "bg-pink-500", TIK_TOK: "bg-cyan-500",
};
const FORMATO_TEXT: Record<string, string> = {
  POST: "text-blue-400", REEL: "text-purple-400", STORIE: "text-pink-400", TIK_TOK: "text-cyan-400",
};

function mesLabel(mes: string) {
  const [, m] = mes.split("-");
  return MESES[parseInt(m) - 1];
}

function pct(v: number, total: number) {
  return total === 0 ? 0 : Math.round((v / total) * 100);
}

export default function MarketingReportePage() {
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rango, setRango] = useState(6);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/marketing/reporte?meses=${rango}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [rango]);

  const maxTipoTotal = data ? Math.max(...data.porTipo.map(t => t.total), 1) : 1;
  const totalPlataformas = data
    ? data.plataformas.facebook + data.plataformas.instagram + data.plataformas.tiktok + data.plataformas.youtube
    : 0;

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Reporte de publicaciones</h1>
          <p className="text-[#6b7280] text-sm">Contenido orgánico · análisis de rendimiento</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/marketing/calendario"
            className="bg-[#1a1a1a] border border-[#333] text-gray-400 text-xs px-3 py-2 rounded-lg hover:bg-[#222] transition-colors">
            ← Calendario
          </Link>
          <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
            {[3, 6, 12].map(n => (
              <button key={n} onClick={() => setRango(n)}
                className={`text-xs px-3 py-1 rounded transition-colors ${rango === n ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
                {n}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-600 text-sm">Cargando reporte...</div>
      ) : !data ? null : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: data.total, color: "text-white" },
              { label: "Publicadas", value: data.publicadas, color: "text-green-400", pct: pct(data.publicadas, data.total) },
              { label: "Listas", value: data.listas, color: "text-yellow-400", pct: pct(data.listas, data.total) },
              { label: "En proceso", value: data.enProceso, color: "text-blue-400", pct: pct(data.enProceso, data.total) },
              { label: "Pendientes", value: data.pendientes, color: "text-gray-400", pct: pct(data.pendientes, data.total) },
            ].map(k => (
              <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                {"pct" in k && k.pct !== undefined && (
                  <p className="text-gray-700 text-[10px] mt-0.5">{k.pct}% del total</p>
                )}
              </div>
            ))}
          </div>

          {/* Por mes — recharts stacked bar */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Publicaciones por mes</h2>
            {data.porMes.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-8">Sin datos en este período</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.porMes.map(m => ({
                      name: mesLabel(m.mes),
                      Publicadas: m.publicadas,
                      Listas: m.listas,
                      "En proceso": m.enProceso,
                      Pendientes: m.pendientes,
                    }))}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const total = payload.reduce((s, p) => s + ((p.value as number) ?? 0), 0);
                        return (
                          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs shadow-lg">
                            <p className="text-gray-400 mb-1.5 font-semibold">{label} · {total} total</p>
                            {payload.map(p => (p.value as number) > 0 && (
                              <div key={p.name} className="flex items-center gap-2 mb-0.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
                                <span className="text-gray-400">{p.name}:</span>
                                <span className="text-white font-semibold">{p.value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                      cursor={{ fill: "#ffffff06" }}
                    />
                    <Bar dataKey="Publicadas" stackId="a" fill="#4ade80" opacity={0.85} radius={[0,0,0,0]} maxBarSize={40} />
                    <Bar dataKey="Listas" stackId="a" fill="#facc15" opacity={0.85} maxBarSize={40} />
                    <Bar dataKey="En proceso" stackId="a" fill="#60a5fa" opacity={0.85} maxBarSize={40} />
                    <Bar dataKey="Pendientes" stackId="a" fill="#6b7280" opacity={0.7} radius={[3,3,0,0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#1a1a1a]">
                  {[
                    { color: "#4ade80", label: "Publicadas" },
                    { color: "#facc15", label: "Listas" },
                    { color: "#60a5fa", label: "En proceso" },
                    { color: "#6b7280", label: "Pendientes" },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                      <span className="text-gray-500 text-[10px]">{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bottom row: formato + tipo + plataformas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Por formato */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-4">Por formato</h2>
              {data.porFormato.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {data.porFormato.map(f => (
                    <div key={f.formato}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-bold ${FORMATO_TEXT[f.formato] ?? "text-gray-400"}`}>{f.formato}</span>
                        <span className="text-gray-400 text-[10px]">{f.total}</span>
                      </div>
                      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${FORMATO_COLORS[f.formato] ?? "bg-gray-500"} opacity-70`}
                          style={{ width: `${pct(f.total, data.total)}%` }}
                        />
                      </div>
                      <p className="text-gray-700 text-[9px] mt-0.5">{f.publicadas} publicadas · {pct(f.publicadas, f.total)}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Por tipo de contenido */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 md:col-span-2">
              <h2 className="text-white font-semibold text-sm mb-4">Por tipo de contenido</h2>
              {data.porTipo.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {data.porTipo.slice(0, 10).map(t => (
                    <div key={t.tipoId} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-gray-300 text-[11px] truncate">{t.nombre}</span>
                          <span className="text-gray-500 text-[10px] ml-2 shrink-0">{t.total}</span>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#B3985B]/60"
                            style={{ width: `${pct(t.total, maxTipoTotal)}%` }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right w-16">
                        <span className="text-green-400 text-[10px]">{t.publicadas} pub</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Plataformas */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Alcance por plataforma</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "facebook" as const, label: "Facebook", color: "bg-blue-600", text: "text-blue-400" },
                { key: "instagram" as const, label: "Instagram", color: "bg-pink-600", text: "text-pink-400" },
                { key: "tiktok" as const, label: "TikTok", color: "bg-cyan-600", text: "text-cyan-400" },
                { key: "youtube" as const, label: "YouTube", color: "bg-red-600", text: "text-red-400" },
              ].map(plt => (
                <div key={plt.key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-semibold ${plt.text}`}>{plt.label}</span>
                    <span className="text-white text-sm font-bold">{data.plataformas[plt.key]}</span>
                  </div>
                  <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${plt.color} opacity-70`}
                      style={{ width: `${pct(data.plataformas[plt.key], totalPlataformas || 1)}%` }}
                    />
                  </div>
                  <p className="text-gray-700 text-[10px]">{pct(data.plataformas[plt.key], totalPlataformas || 1)}% del mix</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
