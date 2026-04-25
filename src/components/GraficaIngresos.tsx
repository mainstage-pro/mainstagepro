"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

interface MesStat { mes: string; ingresos: number; egresos: number; }

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function mesLabel(key: string) { const [, m] = key.split("-"); return MESES[parseInt(m) - 1]; }
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const flujo = (payload[0]?.value ?? 0) - (payload[1]?.value ?? 0);
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
      {payload.length === 2 && (
        <div className="mt-1.5 pt-1.5 border-t border-[#333] flex items-center gap-2">
          <span className="text-gray-500">Flujo:</span>
          <span className={`font-semibold ${flujo >= 0 ? "text-green-400" : "text-red-400"}`}>
            {fmt(flujo)}
          </span>
        </div>
      )}
    </div>
  );
}

export function GraficaIngresos() {
  const [datos, setDatos] = useState<MesStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/finanzas/reporte?meses=6")
      .then(r => r.json())
      .then(d => { setDatos(d.porMes ?? []); setLoading(false); });
  }, []);

  const chartData = datos.map(m => ({
    name: mesLabel(m.mes),
    Ingresos: m.ingresos,
    Gastos: m.egresos,
  }));

  if (loading) return <div className="h-52 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />;
  if (!chartData.length) return null;

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">
          Ingresos vs Gastos · {chartData.length === 1 ? "mes actual" : `últimos ${chartData.length} meses`}
        </p>
        <a href="/finanzas/reporte" className="text-[#B3985B] text-xs hover:underline">
          Ver reporte →
        </a>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff06" }} />
          <Bar dataKey="Ingresos" fill="#4ade80" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={30} />
          <Bar dataKey="Gastos" fill="#f87171" opacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2">
        {[{ color: "#4ade80", label: "Ingresos" }, { color: "#f87171", label: "Gastos" }].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-gray-500 text-[10px]">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
