"use client";

import { useState, useEffect, useCallback } from "react";

interface TareasStats {
  totalMes: number; completadasMes: number; enProgresoMes: number;
  pendientesMes: number; pctGeneral: number;
  totalAtrasadas: number; sinResponsable: number;
  usuarios: {
    id: string; name: string; area: string | null;
    total: number; completadas: number; enProgreso: number;
    pendientes: number; urgentes: number; atrasadas: number; pct: number;
  }[];
  prioridades: { prioridad: string; total: number; completadas: number; pct: number }[];
  areas: { area: string; total: number; completadas: number; pct: number }[];
  semanas: { label: string; total: number; completadas: number; pct: number }[];
  urgentesIncompletas: { id: string; titulo: string; estado: string; asignadoA: string; vence: string | null; proyecto: string | null }[];
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const PRIO_COLOR: Record<string, string> = { URGENTE: "text-red-400", ALTA: "text-amber-400", MEDIA: "text-[#B3985B]", BAJA: "text-gray-500" };
const PRIO_LABEL: Record<string, string> = { URGENTE: "Urgente", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };
const AREA_LABEL: Record<string, string> = { VENTAS: "Ventas", ADMINISTRACION: "Administración", PRODUCCION: "Producción", MARKETING: "Marketing", RRHH: "RRHH", GENERAL: "General", DIRECCION: "Dirección" };

function defaultMes() {
  const d = new Date(), p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`;
}
function navMes(mes: string, delta: number) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
}
function perfColor(pct: number) {
  return pct >= 80 ? "text-green-400" : pct >= 50 ? "text-amber-400" : "text-red-400";
}
function perfBg(pct: number) {
  return pct >= 80 ? "border-green-900/30" : pct >= 50 ? "border-amber-900/30" : "border-red-900/30";
}

export default function ReporteTareasPage() {
  const [mes, setMes]               = useState(defaultMes);
  const [data, setData]             = useState<TareasStats | null>(null);
  const [loading, setLoading]       = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const canNext = mes < mesActual;

  const fetchData = useCallback(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/operaciones/reporte-mensual?mes=${mes}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function downloadPdf() {
    setGenerandoPdf(true);
    try {
      const res = await fetch(`/api/operaciones/reporte-mensual/pdf?mes=${mes}`);
      if (!res.ok) { alert("Error al generar PDF"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `Reporte-Tareas-${mes}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerandoPdf(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-[#B3985B] font-bold uppercase tracking-[0.2em] mb-1">Dirección General</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Reporte de Tareas</h1>
          <p className="text-gray-500 text-sm mt-1">Rendimiento mensual del equipo</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nav mes */}
          <div className="flex items-center gap-1 bg-[#080808] border border-[#1e1e1e] rounded-xl p-1">
            <button onClick={() => setMes((m) => navMes(m, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-colors">←</button>
            <span className="text-white text-sm font-medium px-3 min-w-[130px] text-center">{mesLabel(mes)}</span>
            <button onClick={() => canNext && setMes((m) => navMes(m, 1))} disabled={!canNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">→</button>
          </div>
          <button onClick={downloadPdf} disabled={generandoPdf}
            className="flex items-center gap-2 px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-60">
            {generandoPdf ? (
              <><div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />Generando...</>
            ) : "⬇ PDF Horizontal"}
          </button>
        </div>
      </div>

      {!data ? (
        <div className="text-center text-gray-600 py-16">Sin datos para {mesLabel(mes)}</div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`bg-[#0c0c0c] border rounded-2xl p-5 ${perfBg(data.pctGeneral)}`}>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Cumplimiento</p>
              <p className={`text-2xl font-bold ${perfColor(data.pctGeneral)}`}>{data.pctGeneral}%</p>
              <p className="text-[11px] text-gray-600 mt-1">{data.completadasMes} de {data.totalMes}</p>
            </div>
            <div className="bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">En Progreso</p>
              <p className="text-2xl font-bold text-blue-400">{data.enProgresoMes}</p>
            </div>
            <div className="bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Pendientes</p>
              <p className="text-2xl font-bold text-gray-400">{data.pendientesMes}</p>
            </div>
            <div className={`bg-[#0c0c0c] border rounded-2xl p-5 ${data.totalAtrasadas > 0 ? "border-red-900/40" : "border-[#1e1e1e]"}`}>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Atrasadas</p>
              <p className={`text-2xl font-bold ${data.totalAtrasadas > 0 ? "text-red-400" : "text-gray-400"}`}>{data.totalAtrasadas}</p>
              <p className="text-[11px] text-gray-600 mt-1">Vencidas sin completar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rendimiento por persona */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">Rendimiento por Colaborador</h3>
              <div className="bg-[#080808] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#050505]">
                    <tr>
                      {["Colaborador", "Total", "✓", "Pend.", "%"].map((h) => (
                        <th key={h} className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 ${h === "Colaborador" ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111]">
                    {data.usuarios.slice(0, 12).map((u) => (
                      <tr key={u.id} className="hover:bg-[#0d0d0d] transition-colors">
                        <td className="px-3 py-2">
                          <p className="text-xs text-white">{u.name}</p>
                          <p className="text-[10px] text-gray-600">{AREA_LABEL[u.area ?? ""] ?? u.area}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-gray-400">{u.total}</td>
                        <td className="px-3 py-2 text-right text-xs text-green-400 font-medium">{u.completadas}</td>
                        <td className="px-3 py-2 text-right text-xs text-gray-500">{u.pendientes + u.enProgreso}</td>
                        <td className={`px-3 py-2 text-right text-xs font-bold ${perfColor(u.pct)}`}>{u.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Por prioridad + urgentes */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">Por Prioridad</h3>
                <div className="bg-[#080808] border border-[#1e1e1e] rounded-2xl p-4 space-y-3">
                  {data.prioridades.map((p) => (
                    <div key={p.prioridad} className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-16 ${PRIO_COLOR[p.prioridad] ?? "text-gray-400"}`}>{PRIO_LABEL[p.prioridad]}</span>
                      <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.pct >= 80 ? "#16a34a" : p.pct >= 50 ? "#d97706" : "#dc2626" }} />
                      </div>
                      <span className={`text-xs font-bold w-10 text-right ${perfColor(p.pct)}`}>{p.pct}%</span>
                      <span className="text-[10px] text-gray-600 w-12 text-right">{p.completadas}/{p.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {data.urgentesIncompletas.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-red-500 uppercase tracking-widest">🚨 Urgentes Sin Completar</h3>
                  <div className="bg-[#080808] border border-red-900/30 rounded-2xl overflow-hidden divide-y divide-[#111]">
                    {data.urgentesIncompletas.slice(0, 6).map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white truncate">{t.titulo}</p>
                          <p className="text-[10px] text-gray-600">{t.asignadoA}</p>
                        </div>
                        {t.vence && (
                          <span className="text-[10px] text-red-400 ml-3 shrink-0">
                            {new Date(t.vence + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
