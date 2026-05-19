"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/components/Toast";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface MesStat {
  mes: string; total: number; publicadas: number; pendientes: number;
  listas: number; enProceso: number;
}
interface FormatoStat { formato: string; total: number; publicadas: number; }
interface TipoStat    { tipoId: string; nombre: string; total: number; publicadas: number; }
interface ReporteData {
  total: number; publicadas: number; pendientes: number; enProceso: number; listas: number;
  porMes: MesStat[];
  porFormato: FormatoStat[];
  porTipo: TipoStat[];
  plataformas: { facebook: number; instagram: number; tiktok: number; youtube: number };
}

interface MetricaOrganica {
  id: string; mes: string; plataforma: string;
  seguidores: number | null; alcance: number | null; impresiones: number | null;
  interacciones: number | null; guardados: number | null; publicaciones: number | null;
  notas: string | null;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const PLATAFORMAS = ["Instagram", "Facebook", "TikTok", "YouTube"];
const PLT_COLORS: Record<string, string> = {
  Instagram: "#E1306C", Facebook: "#1877F2", TikTok: "#69C9D0", YouTube: "#FF0000",
};
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const FORMATO_COLORS: Record<string, string> = {
  POST: "bg-blue-500", REEL: "bg-purple-500", STORIE: "bg-pink-500", TIK_TOK: "bg-cyan-500",
};
const FORMATO_TEXT: Record<string, string> = {
  POST: "text-blue-400", REEL: "text-purple-400", STORIE: "text-pink-400", TIK_TOK: "text-cyan-400",
};

function getMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
}
function pct(v: number, total: number) {
  return total === 0 ? 0 : Math.round((v / total) * 100);
}

// ─── Tabla inline de métricas ─────────────────────────────────────────────────

const COLS: { key: keyof MetricaOrganica; label: string }[] = [
  { key: "seguidores",    label: "Seguidores" },
  { key: "alcance",       label: "Alcance" },
  { key: "impresiones",   label: "Impresiones" },
  { key: "interacciones", label: "Interacciones" },
  { key: "guardados",     label: "Guardados" },
  { key: "publicaciones", label: "Publicaciones" },
];

function getMesesRange(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ResultadosPage() {
  const toast = useToast();
  const [rango, setRango] = useState(1);
  const [reporte, setReporte] = useState<ReporteData | null>(null);
  const [metricas, setMetricas] = useState<MetricaOrganica[]>([]);
  const [loadingReporte, setLoadingReporte] = useState(true);
  const [loadingMetricas, setLoadingMetricas] = useState(true);
  const [chartMetrica, setChartMetrica] = useState<keyof MetricaOrganica>("seguidores");
  const [showEjecutivo, setShowEjecutivo] = useState(false);
  const reporteRef = useRef<HTMLDivElement>(null);

  // Estado de edición inline: Map<"mes|plataforma", Record<campo, string>>
  const [draftValues, setDraftValues] = useState<Record<string, Record<string, string>>>({});
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const loadReporte = useCallback(async () => {
    setLoadingReporte(true);
    const r = await fetch(`/api/marketing/reporte?meses=${rango}`, { cache: "no-store" });
    if (r.ok) setReporte(await r.json());
    setLoadingReporte(false);
  }, [rango]);

  const loadMetricas = useCallback(async () => {
    setLoadingMetricas(true);
    const r = await fetch(`/api/marketing/metricas?meses=${rango}`, { cache: "no-store" });
    if (r.ok) setMetricas((await r.json()).metricas ?? []);
    setLoadingMetricas(false);
  }, [rango]);

  useEffect(() => { loadReporte(); }, [loadReporte]);
  useEffect(() => { loadMetricas(); }, [loadMetricas]);

  // Guarda el valor de una celda cuando el input pierde el foco
  async function saveCell(mes: string, plataforma: string, campo: string, valor: string) {
    const key = `${mes}|${plataforma}`;
    if (valor === "") return; // no guardar vacíos
    setSavingCell(`${key}|${campo}`);
    try {
      const body: Record<string, string> = { mes, plataforma, [campo]: valor };
      const res = await fetch("/api/marketing/metricas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMetricas(prev => {
          const existe = prev.find(m => m.mes === mes && m.plataforma === plataforma);
          if (existe) {
            return prev.map(m =>
              m.mes === mes && m.plataforma === plataforma
                ? { ...m, [campo]: parseInt(valor) }
                : m
            );
          }
          return [...prev, { id: "", mes, plataforma, seguidores: null, alcance: null, impresiones: null, interacciones: null, guardados: null, publicaciones: null, notas: null, [campo]: parseInt(valor) }];
        });
        // Limpiar draft
        setDraftValues(prev => {
          const next = { ...prev };
          if (next[key]) { delete next[key][campo]; }
          return next;
        });
      } else {
        toast.error("Error al guardar");
      }
    } finally {
      setSavingCell(null);
    }
  }

  function getCellValue(mes: string, plataforma: string, campo: keyof MetricaOrganica): number | null {
    const m = metricas.find(x => x.mes === mes && x.plataforma === plataforma);
    return m ? (m[campo] as number | null) : null;
  }

  function getDraft(mes: string, plataforma: string, campo: string): string {
    return draftValues[`${mes}|${plataforma}`]?.[campo] ?? "";
  }

  function setDraft(mes: string, plataforma: string, campo: string, val: string) {
    setDraftValues(prev => ({
      ...prev,
      [`${mes}|${plataforma}`]: { ...(prev[`${mes}|${plataforma}`] ?? {}), [campo]: val },
    }));
  }

  // Meses visibles en la tabla: respeta el rango seleccionado
  const mesesTabla = getMesesRange(rango);
  const mesActual = getMes();

  // Datos para el gráfico de métricas
  const chartData = getMesesRange(rango).map(mes => {
    const row: Record<string, unknown> = { mes: mesLabel(mes) };
    PLATAFORMAS.forEach(plt => {
      const m = metricas.find(x => x.mes === mes && x.plataforma === plt);
      row[plt] = m ? (m[chartMetrica as keyof MetricaOrganica] ?? null) : null;
    });
    return row;
  });

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-10">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-white">Resultados</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[#111] border border-[#222] rounded-lg p-0.5">
            {[1, 3, 6, 12].map(n => (
              <button key={n} onClick={() => setRango(n)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${rango === n ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"}`}>
                {n}m
              </button>
            ))}
          </div>
          <button onClick={() => setShowEjecutivo(true)}
            className="text-xs bg-[#1a1a1a] border border-[#333] text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors">
            Reporte ejecutivo
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          SECCIÓN 1 — PUBLICACIONES
      ═══════════════════════════════════════════════ */}
      <section className="space-y-5">
        <p className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest flex items-center gap-3">
          Publicaciones
          <span className="flex-1 h-px bg-[#B3985B]/20" />
        </p>

        {loadingReporte ? (
          <div className="py-8 text-center text-[#555] text-sm">Cargando reporte...</div>
        ) : reporte ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total", value: reporte.total, color: "text-white" },
                { label: "Publicadas", value: reporte.publicadas, color: "text-green-400" },
                { label: "En proceso", value: reporte.enProceso, color: "text-blue-400" },
                { label: "Listas", value: reporte.listas, color: "text-yellow-400" },
                { label: "Pendientes", value: reporte.pendientes, color: "text-gray-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
                  <p className="text-[10px] text-[#555] uppercase tracking-wider">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Gráfico por mes */}
            {reporte.porMes.length > 0 && (
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-4">Publicaciones por mes</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={reporte.porMes.map(m => ({ ...m, mes: mesLabel(m.mes) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="mes" tick={{ fill: "#555", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#555", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="publicadas"  name="Publicadas"  stackId="a" fill="#10b981" />
                    <Bar dataKey="listas"      name="Listas"      stackId="a" fill="#f59e0b" />
                    <Bar dataKey="enProceso"   name="En proceso"  stackId="a" fill="#3b82f6" />
                    <Bar dataKey="pendientes"  name="Pendientes"  stackId="a" fill="#374151" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Por formato + tipo */}
            <div className="grid md:grid-cols-2 gap-4">
              {reporte.porFormato.length > 0 && (
                <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-3">Por formato</p>
                  <div className="space-y-2">
                    {reporte.porFormato.map(f => (
                      <div key={f.formato}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className={FORMATO_TEXT[f.formato] ?? "text-gray-400"}>{f.formato}</span>
                          <span className="text-[#555]">{f.publicadas}/{f.total}</span>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${FORMATO_COLORS[f.formato] ?? "bg-gray-500"}`}
                            style={{ width: `${pct(f.publicadas, f.total)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {reporte.porTipo.length > 0 && (
                <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-3">Por tipo de contenido</p>
                  <div className="space-y-1.5">
                    {reporte.porTipo.slice(0, 8).map(t => (
                      <div key={t.tipoId} className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 truncate max-w-[60%]">{t.nombre}</span>
                        <span className="text-[#555]">{t.publicadas}/{t.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-[#555] text-sm">Sin datos de publicaciones</div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════
          SECCIÓN 2 — AUDIENCIA
      ═══════════════════════════════════════════════ */}
      <section className="space-y-5">
        <p className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest flex items-center gap-3">
          Audiencia
          <span className="flex-1 h-px bg-[#B3985B]/20" />
        </p>

        {/* Tabla editable inline */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                <th className="text-left px-2 py-2 text-[#555] font-medium w-24">Mes</th>
                <th className="text-left px-2 py-2 text-[#555] font-medium w-24">Plataforma</th>
                {COLS.map(c => (
                  <th key={c.key} className="text-right px-2 py-2 text-[#555] font-medium">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mesesTabla.slice().reverse().flatMap(mes =>
                PLATAFORMAS.map(plt => {
                  const esActual = mes === mesActual;
                  return (
                    <tr key={`${mes}|${plt}`}
                      className={`border-b border-[#111] ${esActual ? "bg-[#0f0f0f]" : ""}`}>
                      <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">
                        {plt === "Instagram" ? mesLabel(mes) : ""}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <span style={{ color: PLT_COLORS[plt] }} className="font-medium">{plt}</span>
                      </td>
                      {COLS.map(col => {
                        const actual = getCellValue(mes, plt, col.key);
                        const draft = getDraft(mes, plt, col.key as string);
                        const cellKey = `${mes}|${plt}|${col.key}`;
                        const isSaving = savingCell === cellKey;
                        return (
                          <td key={col.key} className="px-1 py-1 text-right">
                            {esActual ? (
                              <input
                                type="number"
                                min="0"
                                value={draft !== "" ? draft : (actual ?? "")}
                                onChange={e => setDraft(mes, plt, col.key as string, e.target.value)}
                                onBlur={e => {
                                  const val = e.target.value;
                                  if (val !== "" && val !== String(actual ?? "")) {
                                    saveCell(mes, plt, col.key as string, val);
                                  }
                                }}
                                placeholder="—"
                                className={`w-20 bg-[#111] border rounded px-1.5 py-0.5 text-right text-white focus:outline-none focus:border-[#B3985B]/60 text-xs placeholder-[#333] ${isSaving ? "border-[#B3985B]/40 opacity-60" : "border-[#1e1e1e] hover:border-[#333]"}`}
                              />
                            ) : (
                              <span className={actual != null ? "text-gray-300" : "text-[#333]"}>
                                {actual != null ? actual.toLocaleString("es-MX") : "—"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Gráfico histórico de métricas */}
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs text-gray-500">Tendencia histórica</p>
            <div className="flex gap-1 flex-wrap">
              {COLS.map(c => (
                <button key={c.key} onClick={() => setChartMetrica(c.key)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${chartMetrica === c.key ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {loadingMetricas ? (
            <div className="h-40 flex items-center justify-center text-[#555] text-xs">Cargando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="mes" tick={{ fill: "#555", fontSize: 10 }} />
                <YAxis tick={{ fill: "#555", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {PLATAFORMAS.map(plt => (
                  <Line key={plt} type="monotone" dataKey={plt} stroke={PLT_COLORS[plt]}
                    dot={false} strokeWidth={2} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Modal reporte ejecutivo ─────────────────────────────────────────── */}
      {showEjecutivo && reporte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowEjecutivo(false); }}>
          <div ref={reporteRef} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl p-8 max-w-md w-full space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-bold text-lg">Reporte ejecutivo</h2>
              <button onClick={() => setShowEjecutivo(false)} className="text-gray-600 hover:text-white text-lg">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-3xl font-bold text-white">{reporte.total}</p><p className="text-xs text-gray-600 mt-1">Total</p></div>
              <div><p className="text-3xl font-bold text-green-400">{reporte.publicadas}</p><p className="text-xs text-gray-600 mt-1">Publicadas</p></div>
              <div><p className="text-3xl font-bold text-blue-400">{reporte.enProceso}</p><p className="text-xs text-gray-600 mt-1">En proceso</p></div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Por formato</p>
              {reporte.porFormato.map(f => (
                <div key={f.formato} className="flex justify-between text-xs">
                  <span className={FORMATO_TEXT[f.formato] ?? "text-gray-400"}>{f.formato}</span>
                  <span className="text-gray-400">{f.publicadas}/{f.total} ({pct(f.publicadas, f.total)}%)</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-700 text-right">
              Generado: {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
