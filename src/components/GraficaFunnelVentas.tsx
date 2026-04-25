"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: { value: number; payload: { name: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const { name } = payload[0].payload;
  const value = payload[0].value;
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-white font-semibold">{name}</p>
      <p className="text-gray-400">{value} trato{value !== 1 ? "s" : ""}</p>
    </div>
  );
}

interface Props {
  etapasMap: Record<string, number>;
  tratosSeguimientoVencido: number;
}

export function GraficaFunnelVentas({ etapasMap, tratosSeguimientoVencido }: Props) {
  const data = [
    { name: "Descubrimiento", value: etapasMap.DESCUBRIMIENTO ?? 0, fill: "#3b82f6" },
    { name: "Oportunidad",    value: etapasMap.OPORTUNIDAD    ?? 0, fill: "#B3985B" },
    { name: "Cerradas",       value: etapasMap.VENTA_CERRADA  ?? 0, fill: "#4ade80" },
    { name: "Perdidas",       value: etapasMap.VENTA_PERDIDA  ?? 0, fill: "#f87171" },
  ];

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
      <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-4">
        Funnel de ventas
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          barCategoryGap="28%"
        >
          <XAxis
            type="number"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={[0, "auto"]}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={92}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff05" }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {tratosSeguimientoVencido > 0 && (
        <a
          href="/crm/tratos"
          className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1a1a1a] text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
          {tratosSeguimientoVencido} trato{tratosSeguimientoVencido !== 1 ? "s" : ""} con seguimiento vencido
        </a>
      )}
    </div>
  );
}
