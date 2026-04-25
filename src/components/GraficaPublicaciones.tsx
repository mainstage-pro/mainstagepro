"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const FILL: Record<string, string> = {
  PUBLICADO:  "#4ade80",
  LISTO:      "#eab308",
  EN_PROCESO: "#3b82f6",
  PENDIENTE:  "#6b7280",
  CANCELADO:  "#ef4444",
};

const LABEL: Record<string, string> = {
  PUBLICADO:  "Publicado",
  LISTO:      "Listo",
  EN_PROCESO: "En proceso",
  PENDIENTE:  "Pendiente",
  CANCELADO:  "Cancelado",
};

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: { name: string; value: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
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

export function GraficaPublicaciones({ pubsMap, total }: Props) {
  const data = (["PUBLICADO", "LISTO", "EN_PROCESO", "PENDIENTE", "CANCELADO"] as const)
    .map(k => ({ k, name: LABEL[k], value: pubsMap[k] ?? 0, fill: FILL[k] }))
    .filter(d => d.value > 0);

  if (total === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 flex flex-col items-center justify-center min-h-[140px]">
        <p className="text-gray-600 text-sm">Sin publicaciones este mes</p>
        <a href="/marketing/calendario" className="text-[#B3985B] text-xs hover:underline mt-1">
          Agregar →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
      <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-4">
        Estado del mes
      </p>
      <div className="flex items-center gap-5">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={38} outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Centro */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-white text-xl font-bold leading-none">{total}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">total</p>
            </div>
          </div>
        </div>
        {/* Leyenda */}
        <div className="flex-1 space-y-2">
          {data.map(d => (
            <div key={d.k} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                <span className="text-gray-400 text-xs">{d.name}</span>
              </div>
              <span className="text-white text-xs font-semibold">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
