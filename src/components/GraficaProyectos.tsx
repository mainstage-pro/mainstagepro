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
      <p className="text-gray-400">{value} proyecto{value !== 1 ? "s" : ""}</p>
    </div>
  );
}

interface Props {
  estadosMap: Record<string, number>;
  proyectosSinPersonal: number;
}

const ITEMS = [
  { key: "EN_CURSO",   label: "En curso",   fill: "#eab308" },
  { key: "CONFIRMADO", label: "Confirmado", fill: "#B3985B" },
  { key: "PLANEACION", label: "Planeación", fill: "#3b82f6" },
  { key: "COMPLETADO", label: "Completado", fill: "#4b5563" },
];

export function GraficaProyectos({ estadosMap, proyectosSinPersonal }: Props) {
  const data = ITEMS
    .map(({ key, label, fill }) => ({ name: label, value: estadosMap[key] ?? 0, fill }))
    .filter(d => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
      <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-4">Proyectos por estado</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
          <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff05" }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
            <LabelList dataKey="value" position="top" style={{ fill: "#fff", fontSize: 13, fontWeight: "700" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {proyectosSinPersonal > 0 && (
        <a href="/proyectos" className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#1a1a1a] text-xs text-red-400 hover:text-red-300 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          {proyectosSinPersonal} proyecto{proyectosSinPersonal !== 1 ? "s" : ""} próximo{proyectosSinPersonal !== 1 ? "s" : ""} sin personal
        </a>
      )}
    </div>
  );
}
