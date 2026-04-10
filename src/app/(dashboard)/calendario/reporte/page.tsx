"use client";

import { useEffect, useState } from "react";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const TIPO_EVENTO_LABELS: Record<string, string> = {
  MUSICAL:      "Musical",
  SOCIAL:       "Social",
  EMPRESARIAL:  "Empresarial",
  OTRO:         "Otro",
  SIN_DEFINIR:  "Sin definir",
};
const TIPO_SERVICIO_LABELS: Record<string, string> = {
  RENTA:               "Renta",
  PRODUCCION_TECNICA:  "Producción técnica",
  DIRECCION_TECNICA:   "Dirección técnica",
  MULTISERVICIO:       "Multiservicio",
  SIN_DEFINIR:         "Sin definir",
};
const TIPO_EVENTO_COLORS: Record<string, string> = {
  MUSICAL:     "bg-purple-600/60",
  SOCIAL:      "bg-blue-600/60",
  EMPRESARIAL: "bg-amber-600/60",
  OTRO:        "bg-gray-600/60",
  SIN_DEFINIR: "bg-gray-700/60",
};
const TIPO_SERVICIO_COLORS: Record<string, string> = {
  RENTA:              "bg-green-600/60",
  PRODUCCION_TECNICA: "bg-cyan-600/60",
  DIRECCION_TECNICA:  "bg-orange-600/60",
  MULTISERVICIO:      "bg-pink-600/60",
  SIN_DEFINIR:        "bg-gray-700/60",
};

const PODIUM_COLORS = ["text-[#B3985B]", "text-gray-300", "text-orange-700"];
const PODIUM_BG     = ["border-[#B3985B]/40 bg-[#B3985B]/5", "border-gray-600/40 bg-gray-800/20", "border-orange-800/40 bg-orange-900/10"];
const PODIUM_LABEL  = ["1°", "2°", "3°"];

function pct(v: number, t: number) { return t === 0 ? 0 : Math.round((v / t) * 100); }
function mesLabel(key: string) { const [,m] = key.split("-"); return MESES[parseInt(m)-1] ?? key; }

interface ReporteData {
  total: number;
  completados: number;
  confirmados: number;
  enCurso: number;
  planeacion: number;
  porTipoEvento: { tipo: string; count: number }[];
  porTipoServicio: { tipo: string; count: number }[];
  topClientes: { id: string; nombre: string; count: number }[];
  porMes: { mes: string; count: number }[];
}

export default function CalendarioReportePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/proyectos/reporte?year=${year}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [year]);

  const maxMes = data ? Math.max(...data.porMes.map(m => m.count), 1) : 1;

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Reporte de eventos</h1>
          <p className="text-[#6b7280] text-sm">Distribución por tipo, servicio y clientes</p>
        </div>
        {/* Selector de año */}
        <div className="flex items-center gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
          {[currentYear - 1, currentYear, currentYear + 1].map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`text-sm px-3 py-1 rounded transition-colors ${year === y ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-600 text-sm">Cargando...</div>
      ) : !data || data.total === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Sin eventos registrados en {year}</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total eventos",  value: data.total,       color: "text-white" },
              { label: "Completados",    value: data.completados, color: "text-green-400" },
              { label: "Confirmados",    value: data.confirmados, color: "text-blue-400" },
              { label: "En curso",       value: data.enCurso,     color: "text-yellow-400" },
              { label: "Planeación",     value: data.planeacion,  color: "text-gray-400" },
            ].map(k => (
              <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
                <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Distribución mensual */}
          {data.porMes.length > 1 && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-5">Eventos por mes</h2>
              <div className="space-y-3">
                {data.porMes.map(m => (
                  <div key={m.mes} className="flex items-center gap-3">
                    <span className="text-gray-500 text-[10px] w-8 text-right shrink-0">{mesLabel(m.mes)}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className="h-6 bg-[#B3985B]/50 rounded-sm flex items-center px-2 transition-all"
                        style={{ width: `${pct(m.count, maxMes)}%`, minWidth: "4px" }}>
                        {pct(m.count, maxMes) > 15 && (
                          <span className="text-[10px] text-[#f0d090] font-semibold">{m.count}</span>
                        )}
                      </div>
                      {pct(m.count, maxMes) <= 15 && (
                        <span className="text-[10px] text-[#B3985B]">{m.count}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tipo de evento y tipo de servicio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Por tipo de evento */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-5">Por tipo de evento</h2>
              <div className="space-y-4">
                {data.porTipoEvento.map(item => (
                  <div key={item.tipo}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-gray-300 text-sm">{TIPO_EVENTO_LABELS[item.tipo] ?? item.tipo}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">{pct(item.count, data.total)}%</span>
                        <span className="text-white font-semibold text-sm w-5 text-right">{item.count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${TIPO_EVENTO_COLORS[item.tipo] ?? "bg-gray-600/60"}`}
                        style={{ width: `${pct(item.count, data.total)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Por tipo de servicio */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-5">Por tipo de servicio</h2>
              <div className="space-y-4">
                {data.porTipoServicio.map(item => (
                  <div key={item.tipo}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-gray-300 text-sm">{TIPO_SERVICIO_LABELS[item.tipo] ?? item.tipo}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">{pct(item.count, data.total)}%</span>
                        <span className="text-white font-semibold text-sm w-5 text-right">{item.count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${TIPO_SERVICIO_COLORS[item.tipo] ?? "bg-gray-600/60"}`}
                        style={{ width: `${pct(item.count, data.total)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top 3 clientes */}
          {data.topClientes.length > 0 && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-5">Top clientes del año</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.topClientes.map((c, i) => (
                  <div key={c.id} className={`border rounded-xl p-5 text-center ${PODIUM_BG[i]}`}>
                    <p className={`text-3xl font-bold mb-1 ${PODIUM_COLORS[i]}`}>{PODIUM_LABEL[i]}</p>
                    <p className="text-white font-semibold text-sm">{c.nombre}</p>
                    <p className={`text-2xl font-bold mt-3 ${PODIUM_COLORS[i]}`}>{c.count}</p>
                    <p className="text-gray-600 text-xs">evento{c.count !== 1 ? "s" : ""}</p>
                    <p className="text-gray-700 text-[10px] mt-1">{pct(c.count, data.total)}% del total</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
