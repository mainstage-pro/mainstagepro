"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LabelList,
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
      <p className="text-gray-400">{value} publicación{value !== 1 ? "es" : ""}</p>
    </div>
  );
}

interface Props {
  pubsMap: Record<string, number>;
  total: number;
}

const ITEMS = [
  { key: "PUBLICADO",  label: "Publicado",  fill: "#4ade80" },
  { key: "LISTO",      label: "Listo",      fill: "#eab308" },
  { key: "EN_PROCESO", label: "En proceso", fill: "#3b82f6" },
  { key: "PENDIENTE",  label: "Pendiente",  fill: "#6b7280" },
  { key: "CANCELADO",  label: "Cancelado",  fill: "#ef4444" },
];

export function GraficaPublicaciones({ pubsMap, total }: Props) {
  const data = ITEMS
    .map(({ key, label, fill }) => ({ name: label, value: pubsMap[key] ?? 0, fill }))
    .filter(d => d.value > 0);

  if (total === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 flex flex-col items-center justify-center min-h-[140px]">
        <p className="text-gray-600 text-sm">Sin publicaciones este mes</p>
        <a href="/marketing/calendario" className="text-[#B3985B] text-xs hover:underline mt-1">Agregar →</a>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
      <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-4">Estado del mes</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
          <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff05" }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
            <LabelList dataKey="value" position="top" style={{ fill: "#fff", fontSize: 12, fontWeight: "700" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
