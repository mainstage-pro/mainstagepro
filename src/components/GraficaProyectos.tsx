"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: { name: string; count: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const { name, count } = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-white font-semibold">{name}</p>
      <p className="text-gray-400">{count} proyecto{count !== 1 ? "s" : ""}</p>
    </div>
  );
}

interface Props {
  estadosMap: Record<string, number>;
  proyectosSinPersonal: number;
}

export function GraficaProyectos({ estadosMap, proyectosSinPersonal }: Props) {
  const raw = [
    { name: "Completado", count: estadosMap.COMPLETADO ?? 0, fill: "#4b5563" },
    { name: "Planeación", count: estadosMap.PLANEACION ?? 0, fill: "#3b82f6" },
    { name: "Confirmado", count: estadosMap.CONFIRMADO ?? 0, fill: "#B3985B" },
    { name: "En curso",   count: estadosMap.EN_CURSO   ?? 0, fill: "#eab308" },
  ].filter(d => d.count > 0);

  const total = raw.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  const maxCount = Math.max(...raw.map(d => d.count), 1);
  const data = raw.map(d => ({ ...d, value: Math.round((d.count / maxCount) * 100) }));

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
      <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-4">
        Proyectos por estado
      </p>
      <div className="flex items-center gap-4">
        <div className="shrink-0" style={{ width: 170, height: 170 }}>
          <ResponsiveContainer width={170} height={170}>
            <RadialBarChart
              cx="50%" cy="50%"
              innerRadius={22} outerRadius={80}
              barSize={16}
              data={data}
              startAngle={90} endAngle={-270}
            >
              <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#1a1a1a" }} />
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {raw.slice().reverse().map(d => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                <span className="text-gray-400 text-xs">{d.name}</span>
              </div>
              <span className="text-white text-xs font-semibold">{d.count}</span>
            </div>
          ))}
          {proyectosSinPersonal > 0 && (
            <a
              href="/proyectos"
              className="flex items-center gap-1.5 mt-1 pt-2 border-t border-[#1a1a1a] text-[10px] text-red-400 hover:text-red-300 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {proyectosSinPersonal} sin personal
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
