"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface MetricaOrganica {
  id: string;
  mes: string;
  plataforma: string;
  seguidores: number | null;
  alcance: number | null;
  impresiones: number | null;
  interacciones: number | null;
  publicaciones: number | null;
  notas: string | null;
}

const PLATAFORMAS = ["Instagram", "Facebook", "TikTok", "YouTube"];

const PLT_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  Facebook:  "#1877F2",
  TikTok:    "#69C9D0",
  YouTube:   "#FF0000",
};

const MESES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function getMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES_SHORT[parseInt(m) - 1]} ${y}`;
}

function prevMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const METRICAS_LABELS: Record<string, string> = {
  seguidores: "Seguidores",
  alcance: "Alcance",
  impresiones: "Impresiones",
  interacciones: "Interacciones",
  publicaciones: "Publicaciones",
};

const EMPTY_FORM = {
  plataforma: "Instagram",
  seguidores: "", alcance: "", impresiones: "", interacciones: "", publicaciones: "", notas: "",
};

export default function MetricasPage() {
  const [metricas, setMetricas] = useState<MetricaOrganica[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(getMes);
  const [plataforma, setPlataforma] = useState("Instagram");
  const [chartMetrica, setChartMetrica] = useState<keyof MetricaOrganica>("seguidores");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/marketing/metricas?meses=12", { cache: "no-store" });
    const d = await r.json();
    setMetricas(d.metricas ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Populate form with existing data for selected mes+plataforma
  useEffect(() => {
    const existing = metricas.find(m => m.mes === mes && m.plataforma === form.plataforma);
    if (existing) {
      setForm({
        plataforma: existing.plataforma,
        seguidores: existing.seguidores?.toString() ?? "",
        alcance: existing.alcance?.toString() ?? "",
        impresiones: existing.impresiones?.toString() ?? "",
        interacciones: existing.interacciones?.toString() ?? "",
        publicaciones: existing.publicaciones?.toString() ?? "",
        notas: existing.notas ?? "",
      });
    } else {
      setForm(f => ({ ...EMPTY_FORM, plataforma: f.plataforma }));
    }
  }, [mes, form.plataforma, metricas]);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/marketing/metricas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mes,
        plataforma: form.plataforma,
        seguidores: form.seguidores ? parseInt(form.seguidores) : null,
        alcance: form.alcance ? parseInt(form.alcance) : null,
        impresiones: form.impresiones ? parseInt(form.impresiones) : null,
        interacciones: form.interacciones ? parseInt(form.interacciones) : null,
        publicaciones: form.publicaciones ? parseInt(form.publicaciones) : null,
        notas: form.notas || null,
      }),
    });
    await load();
    setSaving(false);
    setShowForm(false);
  }

  // Build chart data: one point per month, one line per plataforma
  const chartData = (() => {
    const mesesSet = [...new Set(metricas.map(m => m.mes))].sort();
    return mesesSet.map(m => {
      const point: Record<string, string | number | null> = { mes: mesLabel(m) };
      for (const plt of PLATAFORMAS) {
        const entry = metricas.find(e => e.mes === m && e.plataforma === plt);
        point[plt] = entry ? (entry[chartMetrica as keyof MetricaOrganica] as number | null) : null;
      }
      return point;
    });
  })();

  // Current month data for selected plataforma
  const mesData = metricas.filter(m => m.mes === mes);

  // Platform with most followers this month
  const topPlatform = mesData.reduce<MetricaOrganica | null>((best, m) => {
    if (!best || (m.seguidores ?? 0) > (best.seguidores ?? 0)) return m;
    return best;
  }, null);

  const inputCls = "w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/60 placeholder-white/20";

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-16" style={{ fontFamily: "'SF Pro Display','SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif" }}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white text-xl font-semibold tracking-tight">Métricas orgánicas</h1>
            <p className="text-white/30 text-sm mt-0.5">Seguimiento manual de alcance y crecimiento por plataforma</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setMes(prevMes(mes))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="text-white/70 text-sm font-medium min-w-[90px] text-center">{mesLabel(mes)}</span>
              <button onClick={() => setMes(nextMes(mes))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#B3985B] hover:bg-[#c9a96a] active:scale-95 text-black font-semibold text-sm transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Registrar métricas
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6 max-w-6xl">
        {/* KPI cards — this month */}
        {mesData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mesData.map(m => (
              <div key={m.id} className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PLT_COLORS[m.plataforma] ?? "#888" }} />
                  <span className="text-white/50 text-xs font-medium">{m.plataforma}</span>
                </div>
                <p className="text-white text-2xl font-bold tracking-tight">{m.seguidores?.toLocaleString("es-MX") ?? "—"}</p>
                <p className="text-white/25 text-[11px] mt-0.5">seguidores</p>
                {m.alcance && <p className="text-white/40 text-xs mt-2">Alcance: {m.alcance.toLocaleString("es-MX")}</p>}
                {m.interacciones && <p className="text-white/40 text-xs">Interacciones: {m.interacciones.toLocaleString("es-MX")}</p>}
              </div>
            ))}
          </div>
        )}

        {mesData.length === 0 && !loading && (
          <div className="bg-white/[0.025] border border-white/8 rounded-xl p-8 text-center">
            <p className="text-white/30 text-sm">Sin métricas para {mesLabel(mes)}.</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-[#B3985B] text-sm hover:underline">Registrar ahora</button>
          </div>
        )}

        {/* Chart */}
        <div className="bg-white/[0.025] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-white/80 text-sm font-semibold">Tendencia histórica</h2>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(METRICAS_LABELS) as Array<keyof MetricaOrganica>).map(k => (
                <button
                  key={k}
                  onClick={() => setChartMetrica(k)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-colors ${chartMetrica === k ? "bg-[#B3985B]/20 border-[#B3985B]/40 text-[#B3985B]" : "border-white/10 text-white/30 hover:text-white/60"}`}
                >
                  {METRICAS_LABELS[k as string]}
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} width={50}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  itemStyle={{ color: "rgba(255,255,255,0.8)" }}
                  formatter={(value) => typeof value === "number" ? value.toLocaleString("es-MX") : "—"}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
                {PLATAFORMAS.map(plt => (
                  <Line
                    key={plt}
                    type="monotone"
                    dataKey={plt}
                    stroke={PLT_COLORS[plt]}
                    strokeWidth={2}
                    dot={{ fill: PLT_COLORS[plt], r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-white/20 text-sm">Sin datos históricos aún</div>
          )}
        </div>

        {/* History table */}
        {metricas.length > 0 && (
          <div className="bg-white/[0.025] border border-white/8 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h2 className="text-white/60 text-sm font-semibold">Historial de registros</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Mes","Plataforma","Seguidores","Alcance","Impresiones","Interacciones","Publicaciones"].map(h => (
                      <th key={h} className="text-left text-white/30 text-xs font-medium px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...metricas].sort((a, b) => b.mes.localeCompare(a.mes)).map(m => (
                    <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 text-white/60 text-xs">{mesLabel(m.mes)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLT_COLORS[m.plataforma] ?? "#888" }} />
                          <span className="text-white/70 text-xs">{m.plataforma}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-white/70 text-xs">{m.seguidores?.toLocaleString("es-MX") ?? "—"}</td>
                      <td className="px-4 py-2.5 text-white/70 text-xs">{m.alcance?.toLocaleString("es-MX") ?? "—"}</td>
                      <td className="px-4 py-2.5 text-white/70 text-xs">{m.impresiones?.toLocaleString("es-MX") ?? "—"}</td>
                      <td className="px-4 py-2.5 text-white/70 text-xs">{m.interacciones?.toLocaleString("es-MX") ?? "—"}</td>
                      <td className="px-4 py-2.5 text-white/70 text-xs">{m.publicaciones?.toLocaleString("es-MX") ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Registrar métricas — {mesLabel(mes)}</h3>
              <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white/40 text-xs mb-1 block">Plataforma</label>
                <select
                  value={form.plataforma}
                  onChange={e => setForm(f => ({ ...f, plataforma: e.target.value }))}
                  className={inputCls}
                >
                  {PLATAFORMAS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["seguidores","alcance","impresiones","interacciones","publicaciones"] as const).map(k => (
                  <div key={k}>
                    <label className="text-white/40 text-xs mb-1 block capitalize">{METRICAS_LABELS[k]}</label>
                    <input
                      type="number"
                      value={form[k]}
                      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-white/40 text-xs mb-1 block">Notas</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Observaciones, campañas activas, etc."
                  rows={2}
                  className={inputCls + " resize-none"}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm transition-all disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
