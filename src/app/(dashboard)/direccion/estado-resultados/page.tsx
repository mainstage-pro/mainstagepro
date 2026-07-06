"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ERProyecto {
  id: string; nombre: string; cliente: string; empresa: string | null;
  fechaEvento: string; tipoEvento: string;
  ingreso: number; ingresoSinIva: number; costoDirecto: number;
  cobrado: number; porCobrar: number; utilidadBruta: number; margenPct: number;
}
interface ERGastoCategoria {
  nombre: string; monto: number;
  items: { id: string; concepto: string; monto: number; fecha: string; proveedor: string | null }[];
}
interface ERNominaItem { id: string; nombre: string; puesto: string | null; area: string | null; monto: number; estado: string }
interface ERAnalisis {
  analisisFinanciero?: string | null; analisisOperativo?: string | null; analisisMercado?: string | null;
  queLogramos?: string | null; queNoLogramos?: string | null; queCambiariamos?: string | null;
  decisionesUrgentes?: string | null; proyeccionSiguiente?: string | null;
  propuesta1?: string | null; propuesta2?: string | null; propuesta3?: string | null;
  propuesta4?: string | null; propuesta5?: string | null;
  comentariosFinales?: string | null;
  saldoCuentaFiscalAnterior?: number | null; saldoCuentaFiscalActual?: number | null;
  isrRetenidoMes?: number | null;
}
interface ERData {
  mes: string; mesAnterior: string;
  proyectos: ERProyecto[]; cantidadProyectos: number;
  totalIngresos: number; totalCostosDirectos: number;
  utilidadBruta: number; margenBrutoPct: number;
  gastosPorCategoria: ERGastoCategoria[]; totalGastosOperativos: number;
  nominaItems: ERNominaItem[]; nominaPorArea: Record<string, number>; totalNomina: number;
  utilidadOperativa: number; margenOperativoPct: number;
  cuotasDeuda: { id: string; nombre: string; categoria: string; monto: number; numeroCuota: number; estado: string; fechaVencimiento: string }[];
  totalCostosFinancieros: number; totalRepartos: number;
  isrEstimado: number; utilidadNeta: number; margenNetoPct: number;
  comparativo: { mes: string; totalIngresos: number; totalNomina: number; totalGastos: number } | null;
  analisis: ERAnalisis | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
const fmtShort = (n: number) => {
  const abs = Math.abs(n), sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return fmt(n);
};

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
  const [, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${mes.split("-")[0]}`;
}
function varPct(curr: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MarginRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const clamped = Math.max(-100, Math.min(200, pct));
  const normalized = Math.max(0, Math.min(100, clamped));
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (normalized / 100) * circ;
  const color = pct >= 30 ? "#16a34a" : pct >= 10 ? "#d97706" : pct >= 0 ? "#f97316" : "#dc2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a1a" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle"
        fontSize={pct < -9 ? 8 : 9} fontWeight="700" fill={color} fontFamily="sans-serif">
        {pct.toFixed(0)}%
      </text>
    </svg>
  );
}

function TrendBadge({ curr, prev, inverse = false }: { curr: number; prev: number; inverse?: boolean }) {
  const v = varPct(curr, prev);
  if (v === null) return null;
  const isGood = inverse ? v <= 0 : v >= 0;
  const cls = isGood
    ? "text-green-400 bg-green-950/40 border-green-900/40"
    : "text-red-400 bg-red-950/40 border-red-900/40";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cls}`}>
      {v >= 0 ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function KpiCard({ label, value, sub, color = "text-white", border = "border-[#1a1a1a]",
  bgColor = "bg-[#080808]", ring, trend }: {
  label: string; value: string; sub?: string; color?: string; border?: string;
  bgColor?: string; ring?: number; trend?: React.ReactNode;
}) {
  return (
    <div className={`${bgColor} border ${border} rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden
      group transition-all hover:border-[#B3985B]/20`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top left, rgba(179,152,91,0.04), transparent)" }} />
      <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em] font-bold">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className={`text-xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
        {ring !== undefined && <MarginRing pct={ring} size={46} />}
      </div>
      {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
      {trend && <div className="mt-0.5">{trend}</div>}
    </div>
  );
}

function WaterfallRow({ label, sub, value, total, color, isResult = false, isFinal = false }: {
  label: string; sub?: string; value: number; total: number; color: string;
  isResult?: boolean; isFinal?: boolean;
}) {
  const isNeg = value < 0;
  const textCol = isFinal ? "text-[#B3985B]"
    : isResult ? (value >= 0 ? "text-green-400" : "text-red-400")
    : (value >= 0 ? "text-white" : "text-gray-300");

  const barW = total > 0 ? Math.max(2, Math.min(100, (Math.abs(value) / total) * 100)) : 2;

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 border-b border-[#0a0a0a] last:border-0 transition-all hover:bg-[#0a0a0a]
      ${isFinal ? "bg-gradient-to-r from-[#0d0b07] to-transparent border-t border-[#B3985B]/20" : ""}
      ${isResult && !isFinal ? (value >= 0 ? "bg-green-950/8" : "bg-red-950/8") : ""}`}>
      <div className={`shrink-0 rounded-full ${isResult || isFinal ? "w-1.5 h-8" : "w-1 h-5"}`}
        style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <p className={`${isResult ? "text-[10px] font-bold uppercase tracking-widest text-gray-300" : "text-[10px] text-gray-500 uppercase tracking-wide"}`}>
          {label}
        </p>
        {sub && <p className="text-[9px] text-gray-700 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className="hidden sm:block flex-1 max-w-[100px]">
        <div className="h-1 bg-[#0a0a0a] rounded-full overflow-hidden" style={{ height: isResult || isFinal ? 6 : 4 }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${barW}%`, backgroundColor: color }} />
        </div>
      </div>
      <span className="text-[9px] text-gray-700 w-8 text-right hidden sm:block">
        {total > 0 ? `${((Math.abs(value) / total) * 100).toFixed(0)}%` : "—"}
      </span>
      <p className={`shrink-0 tabular-nums font-bold ${isFinal ? "text-2xl text-[#B3985B]" : isResult ? "text-xl" : "text-base"} ${textCol}`}>
        {isResult || isFinal ? fmt(value) : isNeg ? `(${fmt(Math.abs(value))})` : value === 0 ? "—" : fmt(value)}
      </p>
    </div>
  );
}

function AnalisisTextarea({ label, question, value, onChange, placeholder, rows = 4 }: {
  label: string; question?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-[#B3985B] uppercase tracking-widest">{label}</label>
      {question && <p className="text-[10px] text-gray-600 italic leading-relaxed">{question}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full bg-[#040404] border border-[#1e1e1e] rounded-xl px-4 py-3 text-sm text-gray-200
          placeholder-gray-800 focus:outline-none focus:border-[#B3985B]/40 focus:ring-1 focus:ring-[#B3985B]/10
          resize-none leading-relaxed transition-all" />
    </div>
  );
}

function NumberInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-[#B3985B] uppercase tracking-widest">{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#040404] border border-[#1e1e1e] rounded-xl px-4 py-2.5 text-sm text-gray-200
          placeholder-gray-800 focus:outline-none focus:border-[#B3985B]/40 transition-all" />
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-[#1a1a1a]">
      <div className="w-0.5 h-5 bg-[#B3985B] rounded-full" />
      <h3 className="text-[10px] font-bold text-[#B3985B] uppercase tracking-[0.2em]">{title}</h3>
    </div>
  );
}

function CollapseSection({ title, amount, children }: { title: string; amount: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#0a0a0a] last:border-0">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0a0a0a] transition-colors">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-left">{title}</span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold text-amber-400">{amount}</span>
          <span className={`text-gray-600 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>
      {open && <div className="border-t border-[#111] px-4 pb-3">{children}</div>}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
type Tab = "resumen" | "proyectos" | "costos" | "analisis";

export default function EstadoResultadosDireccionPage() {
  const [mes, setMes]                     = useState(defaultMes);
  const [data, setData]                   = useState<ERData | null>(null);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState<Tab>("resumen");
  const [savingAnalisis, setSavingAnalisis] = useState(false);
  const [savedMsg, setSavedMsg]           = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [analisisForm, setAnalisisForm]   = useState<ERAnalisis>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const canNext = mes < mesActual;

  const fetchData = useCallback(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/admin/reportes/estado-resultados?mes=${mes}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); setAnalisisForm(d?.analisis ?? {}); })
      .catch(() => setLoading(false));
  }, [mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doSave = async (form: ERAnalisis) => {
    try {
      const res = await fetch("/api/admin/reportes/estado-resultados/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes, ...form }),
      });
      if (res.ok) { setSavedMsg("Guardado ✓"); setTimeout(() => setSavedMsg(""), 2500); }
    } catch { /* silent */ }
  };

  const handleFieldChange = (field: keyof ERAnalisis) => (value: string) => {
    setAnalisisForm(prev => {
      const next = { ...prev, [field]: value };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => doSave(next), 1800);
      return next;
    });
  };

  const saveAnalisis = async () => {
    setSavingAnalisis(true);
    await doSave(analisisForm);
    setSavingAnalisis(false);
  };

  const downloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const res = await fetch(`/api/admin/reportes/estado-resultados/pdf?mes=${mes}`);
      if (!res.ok) { alert("Error al generar PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Estado-Resultados-${mes}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally { setGeneratingPdf(false); }
  };

  // ── Loading / empty ───────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-12 h-12 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
      <p className="text-gray-700 text-sm animate-pulse">Calculando estado de resultados…</p>
    </div>
  );

  if (!data) return (
    <div className="p-8 max-w-6xl mx-auto text-center py-24">
      <p className="text-4xl mb-3">📊</p>
      <p className="text-gray-600 font-medium">Sin datos para {mesLabel(mes)}</p>
      <p className="text-gray-700 text-xs mt-2">Verifica que haya proyectos registrados en este período.</p>
    </div>
  );

  const comp = data.comparativo;
  const totalPorCobrar = data.proyectos.reduce((s, p) => s + p.porCobrar, 0);
  const totalTodosGastos = data.totalCostosDirectos + data.totalGastosOperativos + data.totalNomina + data.totalCostosFinancieros + data.isrEstimado;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[9px] text-[#B3985B] font-bold uppercase tracking-[0.25em] mb-1.5">
            Dirección General · Base Devengado
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Estado de Resultados</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <p className="text-gray-500 text-sm">{mesLabel(mes)}</p>
            {comp && <TrendBadge curr={data.totalIngresos} prev={comp.totalIngresos} />}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#060606] border border-[#1a1a1a] rounded-xl p-1 gap-0.5">
            <button onClick={() => setMes(m => navMes(m, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-all">
              ←
            </button>
            <span className="text-white text-sm font-medium px-3 min-w-[140px] text-center select-none">{mesLabel(mes)}</span>
            <button onClick={() => canNext && setMes(m => navMes(m, 1))} disabled={!canNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-all disabled:opacity-25 disabled:cursor-not-allowed">
              →
            </button>
          </div>
          <button onClick={downloadPdf} disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-[#B3985B]/10">
            {generatingPdf
              ? <><div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Generando…</>
              : <>⬇ PDF Horizontal</>}
          </button>
        </div>
      </div>

      {/* ── KPI STRIP ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Ingresos Devengados" value={fmtShort(data.totalIngresos)}
          sub={`${data.cantidadProyectos} proyecto${data.cantidadProyectos !== 1 ? "s" : ""} ejecutado${data.cantidadProyectos !== 1 ? "s" : ""}`}
          trend={comp ? <TrendBadge curr={data.totalIngresos} prev={comp.totalIngresos} /> : undefined}
        />
        <KpiCard label="Utilidad Bruta" value={fmtShort(data.utilidadBruta)}
          sub="Ingresos − costos directos"
          color={data.utilidadBruta >= 0 ? "text-green-400" : "text-red-400"}
          border={data.utilidadBruta >= 0 ? "border-green-900/30" : "border-red-900/30"}
          ring={data.margenBrutoPct}
        />
        <KpiCard label="Utilidad Operativa" value={fmtShort(data.utilidadOperativa)}
          sub="Después de gastos y nómina"
          color={data.utilidadOperativa >= 0 ? "text-green-400" : "text-red-400"}
          border={data.utilidadOperativa >= 0 ? "border-green-900/30" : "border-red-900/30"}
          ring={data.margenOperativoPct}
        />
        <KpiCard label="Utilidad Neta" value={fmtShort(data.utilidadNeta)}
          sub="Después de ISR y finanzas"
          color="text-[#B3985B]"
          bgColor="bg-[#0b0901]"
          border="border-[#B3985B]/25"
          ring={data.margenNetoPct}
        />
        <KpiCard label="Por Cobrar" value={fmtShort(totalPorCobrar)}
          sub={`${data.proyectos.filter(p => p.porCobrar > 0).length} clientes pendientes`}
          color={totalPorCobrar > 0 ? "text-amber-400" : "text-green-400"}
          border={totalPorCobrar > 0 ? "border-amber-900/30" : "border-[#1a1a1a]"}
        />
      </div>

      {/* ── TAB NAV ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#060606] border border-[#1a1a1a] rounded-xl p-1 w-fit overflow-x-auto">
        {([
          { key: "resumen",   label: "P&L" },
          { key: "proyectos", label: `Proyectos (${data.cantidadProyectos})` },
          { key: "costos",    label: "Costos & Nómina" },
          { key: "analisis",  label: "📝 Análisis Directivo" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === t.key ? "bg-[#B3985B] text-black shadow-sm" : "text-gray-500 hover:text-white hover:bg-[#111]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB: P&L RESUMEN
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "resumen" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Waterfall */}
          <div className="lg:col-span-2 bg-[#060606] border border-[#1a1a1a] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#111] flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cascada de Utilidades</p>
              <p className="text-[9px] text-gray-700">Base devengado · {mesLabel(mes)}</p>
            </div>

            <WaterfallRow label="Ingresos por Proyectos" color="#16a34a" isResult
              sub={`${data.cantidadProyectos} evento${data.cantidadProyectos !== 1 ? "s" : ""} ejecutado${data.cantidadProyectos !== 1 ? "s" : ""} en el período`}
              value={data.totalIngresos} total={data.totalIngresos} />
            <WaterfallRow label="− Costos Directos de Proyectos" color="#dc2626"
              sub="CxP proveedores + técnicos + gastos operativos de eventos"
              value={-data.totalCostosDirectos} total={data.totalIngresos} />

            {/* Utilidad Bruta */}
            <div className={`px-5 py-4 border-y border-[#111] flex items-center justify-between ${data.utilidadBruta >= 0 ? "bg-green-950/10" : "bg-red-950/10"}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-1.5 h-10 rounded-full ${data.utilidadBruta >= 0 ? "bg-green-500" : "bg-red-500"}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">= UTILIDAD BRUTA</p>
                  <p className="text-[9px] text-gray-600 mt-0.5">Ingresos − Costos directos · Margen {data.margenBrutoPct.toFixed(1)}%</p>
                </div>
              </div>
              <p className={`text-xl font-bold tabular-nums shrink-0 ml-4 ${data.utilidadBruta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmt(data.utilidadBruta)}
              </p>
            </div>

            <WaterfallRow label="− Gastos Operativos" color="#d97706"
              sub={`Fijos y variables del período · ${data.gastosPorCategoria.length} categorías`}
              value={-data.totalGastosOperativos} total={data.totalIngresos} />
            <WaterfallRow label="− Nómina del Período" color="#8b5cf6"
              sub={`${data.nominaItems.length} colaborador${data.nominaItems.length !== 1 ? "es" : ""} · ${mes}`}
              value={-data.totalNomina} total={data.totalIngresos} />

            {/* Utilidad Operativa */}
            <div className={`px-5 py-4 border-y border-[#111] flex items-center justify-between ${data.utilidadOperativa >= 0 ? "bg-green-950/8" : "bg-red-950/8"}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-1.5 h-10 rounded-full ${data.utilidadOperativa >= 0 ? "bg-green-400" : "bg-red-400"}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">= UTILIDAD OPERATIVA</p>
                  <p className="text-[9px] text-gray-600 mt-0.5">Ut. Bruta − Gastos − Nómina · Margen {data.margenOperativoPct.toFixed(1)}%</p>
                </div>
              </div>
              <p className={`text-xl font-bold tabular-nums shrink-0 ml-4 ${data.utilidadOperativa >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmt(data.utilidadOperativa)}
              </p>
            </div>

            {data.totalCostosFinancieros > 0 && (
              <WaterfallRow label="− Costos Financieros" color="#6b7280"
                sub={`${data.cuotasDeuda.length} cuota${data.cuotasDeuda.length !== 1 ? "s" : ""} de deuda vencimiento en el período`}
                value={-data.totalCostosFinancieros} total={data.totalIngresos} />
            )}
            {data.isrEstimado > 0 && (
              <WaterfallRow label="− ISR Estimado (30%)" color="#92400e"
                sub="Estimación sobre utilidad operativa positiva. Validar con contabilidad."
                value={-data.isrEstimado} total={data.totalIngresos} />
            )}

            {/* Utilidad Neta - finale */}
            <div className="px-5 py-5 bg-gradient-to-r from-[#0d0a04] to-[#080808] border-t border-[#B3985B]/20 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-2 h-12 rounded-full bg-[#B3985B] shadow-lg shadow-[#B3985B]/20" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white">= UTILIDAD NETA</p>
                  <p className="text-[9px] text-gray-600 mt-0.5">Después de impuestos y costos financieros · Margen {data.margenNetoPct.toFixed(1)}%</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-3xl font-bold tabular-nums text-[#B3985B]">{fmt(data.utilidadNeta)}</p>
                <p className="text-[9px] text-gray-600 mt-1">{data.margenNetoPct.toFixed(1)}% margen neto</p>
              </div>
            </div>
          </div>

          {/* Panel lateral */}
          <div className="space-y-4">
            {/* Comparativo */}
            {comp && (
              <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#111]">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">vs. {mesLabel(comp.mes)}</p>
                </div>
                <div className="divide-y divide-[#0d0d0d]">
                  {[
                    { label: "Ingresos", curr: data.totalIngresos, prev: comp.totalIngresos, color: "text-white" },
                    { label: "Gastos Op.", curr: data.totalGastosOperativos, prev: comp.totalGastos, color: "text-amber-400", inv: true },
                    { label: "Nómina", curr: data.totalNomina, prev: comp.totalNomina, color: "text-violet-400", inv: true },
                  ].map(row => (
                    <div key={row.label} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{row.label}</p>
                        <p className={`text-sm font-bold tabular-nums ${row.color}`}>{fmtShort(row.curr)}</p>
                        <p className="text-[9px] text-gray-700">{fmtShort(row.prev)} anterior</p>
                      </div>
                      <TrendBadge curr={row.curr} prev={row.prev} inverse={row.inv} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estructura de costos */}
            <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estructura de Costos</p>
              {[
                { label: "Costos Directos", value: data.totalCostosDirectos, color: "#dc2626" },
                { label: "Gastos Operativos", value: data.totalGastosOperativos, color: "#d97706" },
                { label: "Nómina", value: data.totalNomina, color: "#8b5cf6" },
                { label: "Costos Financieros", value: data.totalCostosFinancieros, color: "#6b7280" },
                { label: "ISR Estimado", value: data.isrEstimado, color: "#92400e" },
              ].filter(r => r.value > 0).map(row => {
                const pct = totalTodosGastos > 0 ? (row.value / totalTodosGastos) * 100 : 0;
                return (
                  <div key={row.label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">{row.label}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{fmtShort(row.value)}</span>
                    </div>
                    <div className="h-1 bg-[#111] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: row.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ISR alert */}
            {data.isrEstimado > 0 && (
              <div className="bg-amber-950/25 border border-amber-500/25 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 text-base shrink-0">⚠</span>
                  <div>
                    <p className="text-amber-300 text-xs font-bold">ISR Estimado</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{fmt(data.isrEstimado)}</p>
                    <p className="text-amber-700 text-[9px] mt-1.5 leading-relaxed">
                      30% sobre utilidad operativa. Validar con contabilidad.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Por cobrar */}
            {totalPorCobrar > 0 && (
              <div className="bg-blue-950/20 border border-blue-900/30 rounded-2xl p-4">
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">Pendiente por Cobrar</p>
                <p className="text-2xl font-bold text-blue-300">{fmt(totalPorCobrar)}</p>
                <p className="text-[9px] text-blue-800 mt-1">
                  {data.proyectos.filter(p => p.porCobrar > 0).length} cliente{data.proyectos.filter(p => p.porCobrar > 0).length !== 1 ? "s" : ""} pendiente{data.proyectos.filter(p => p.porCobrar > 0).length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB: PROYECTOS
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "proyectos" && (
        <div className="space-y-4">
          {data.proyectos.length === 0 ? (
            <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl p-20 text-center">
              <p className="text-gray-600 text-sm">Sin proyectos ejecutados en {mesLabel(mes)}</p>
              <p className="text-gray-700 text-xs mt-2">Los proyectos se reconocen por su fecha de evento</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Ingresos Totales", value: fmt(data.totalIngresos), color: "text-white" },
                  { label: "Costos Directos", value: fmt(data.totalCostosDirectos), color: "text-red-400" },
                  { label: "Utilidad Bruta", value: fmt(data.utilidadBruta), color: data.utilidadBruta >= 0 ? "text-green-400" : "text-red-400" },
                  { label: "Por Cobrar", value: fmt(totalPorCobrar), color: totalPorCobrar > 0 ? "text-amber-400" : "text-green-400" },
                ].map(k => (
                  <div key={k.label} className="bg-[#060606] border border-[#1a1a1a] rounded-xl p-4">
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest">{k.label}</p>
                    <p className={`text-lg font-bold tabular-nums mt-1 ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#040404]">
                      <tr>
                        {["Proyecto", "Cliente", "Tipo", "Ingreso", "Costo Dir.", "Ut. Bruta", "Margen", "Cobrado", "Por Cobrar"].map(h => (
                          <th key={h} className={`px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-gray-600 ${h === "Proyecto" || h === "Cliente" ? "text-left" : "text-right"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0a0a0a]">
                      {data.proyectos.map(p => {
                        const mc = p.margenPct >= 40 ? "text-green-400" : p.margenPct >= 20 ? "text-amber-400" : p.margenPct >= 0 ? "text-orange-400" : "text-red-400";
                        const fecha = new Date(p.fechaEvento).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
                        const pctBar = Math.max(0, Math.min(100, p.margenPct));
                        return (
                          <tr key={p.id} className="hover:bg-[#0a0a0a] transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-xs text-white font-medium">{p.nombre}</p>
                              <p className="text-[9px] text-gray-600">{fecha}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 max-w-[100px]">
                              <span className="truncate block">{p.cliente}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 text-right">{p.tipoEvento}</td>
                            <td className="px-4 py-3 text-xs text-white text-right tabular-nums font-medium">{fmt(p.ingresoSinIva)}</td>
                            <td className="px-4 py-3 text-xs text-red-400 text-right tabular-nums">({fmt(p.costoDirecto)})</td>
                            <td className={`px-4 py-3 text-xs text-right tabular-nums font-bold ${p.utilidadBruta >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(p.utilidadBruta)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-xs font-bold ${mc}`}>{p.margenPct.toFixed(0)}%</span>
                                <div className="w-10 h-1 bg-[#111] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full"
                                    style={{ width: `${pctBar}%`, backgroundColor: p.margenPct >= 40 ? "#16a34a" : p.margenPct >= 20 ? "#d97706" : "#dc2626" }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-green-400 text-right tabular-nums">{fmt(p.cobrado)}</td>
                            <td className={`px-4 py-3 text-xs text-right tabular-nums font-medium ${p.porCobrar > 0 ? "text-amber-400" : "text-green-500"}`}>
                              {p.porCobrar > 0 ? fmt(p.porCobrar) : "✓ Liquidado"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-[#040404] border-t border-[#1a1a1a]">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-gray-600">TOTALES — {data.cantidadProyectos} eventos</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-white tabular-nums">{fmt(data.totalIngresos)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-red-400 tabular-nums">({fmt(data.totalCostosDirectos)})</td>
                        <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${data.utilidadBruta >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(data.utilidadBruta)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-[#B3985B]">{data.margenBrutoPct.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-green-400 tabular-nums">{fmt(data.proyectos.reduce((s, p) => s + p.cobrado, 0))}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-amber-400 tabular-nums">{fmt(totalPorCobrar)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB: COSTOS & NÓMINA
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "costos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gastos por categoría */}
          <div className="space-y-3">
            <SectionDivider title="Gastos Operativos por Categoría" />
            <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl overflow-hidden">
              {data.gastosPorCategoria.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-10">Sin gastos operativos en {mesLabel(mes)}</p>
              ) : (
                <>
                  {data.gastosPorCategoria.map(cat => {
                    const pctVal = data.totalGastosOperativos > 0 ? (cat.monto / data.totalGastosOperativos) * 100 : 0;
                    return (
                      <CollapseSection key={cat.nombre} title={cat.nombre} amount={fmt(cat.monto)}>
                        <div className="w-full h-1 bg-[#111] rounded-full overflow-hidden my-2">
                          <div className="h-full bg-amber-600 rounded-full" style={{ width: `${pctVal}%` }} />
                        </div>
                        <div className="space-y-1 max-h-44 overflow-y-auto">
                          {cat.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between py-1.5">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-gray-300 truncate">{item.concepto}</p>
                                {item.proveedor && <p className="text-[9px] text-gray-600">{item.proveedor}</p>}
                              </div>
                              <span className="text-xs font-medium text-white ml-3 shrink-0">{fmt(item.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </CollapseSection>
                    );
                  })}
                  <div className="flex items-center justify-between px-4 py-3 bg-[#040404]">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">Total Gastos Operativos</span>
                    <span className="text-sm font-bold text-amber-400">{fmt(data.totalGastosOperativos)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Nómina + Financieros + ISR */}
          <div className="space-y-4">
            <div className="space-y-3">
              <SectionDivider title="Nómina del Período" />
              <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl overflow-hidden">
                {data.nominaItems.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-10">Sin registros de nómina en {mes}</p>
                ) : (
                  <div className="divide-y divide-[#0a0a0a]">
                    {Object.entries(data.nominaPorArea).sort((a, b) => b[1] - a[1]).map(([area, monto]) => {
                      const colab = data.nominaItems.filter(n => n.area === area).length;
                      const pctArea = data.totalNomina > 0 ? (monto / data.totalNomina) * 100 : 0;
                      return (
                        <div key={area} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div>
                              <p className="text-xs text-white font-medium">{area}</p>
                              <p className="text-[9px] text-gray-600">{colab} colaborador{colab !== 1 ? "es" : ""}</p>
                            </div>
                            <span className="text-sm font-bold text-violet-400">{fmt(monto)}</span>
                          </div>
                          <div className="h-1 bg-[#111] rounded-full overflow-hidden">
                            <div className="h-full bg-violet-600 rounded-full" style={{ width: `${pctArea}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#040404]">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
                        Total Nómina · {data.nominaItems.length} colaborador{data.nominaItems.length !== 1 ? "es" : ""}
                      </span>
                      <span className="text-sm font-bold text-violet-400">{fmt(data.totalNomina)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {data.cuotasDeuda.length > 0 && (
              <div className="space-y-3">
                <SectionDivider title="Costos Financieros" />
                <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#0a0a0a]">
                  {data.cuotasDeuda.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-xs text-white">{c.nombre}</p>
                        <p className="text-[9px] text-gray-600">Cuota {c.numeroCuota} · {c.categoria}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-400">{fmt(c.monto)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 bg-[#040404]">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">Total Financiero</span>
                    <span className="text-sm font-bold text-gray-400">{fmt(data.totalCostosFinancieros)}</span>
                  </div>
                </div>
              </div>
            )}

            {data.isrEstimado > 0 && (
              <div className="bg-amber-950/25 border border-amber-500/25 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-400">⚠</span>
                  <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Provisión ISR</p>
                </div>
                <p className="text-2xl font-bold text-amber-400">{fmt(data.isrEstimado)}</p>
                <p className="text-[10px] text-amber-700 mt-2">
                  30% sobre la utilidad operativa positiva. Confirmar tasa y deducciones con el contador.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB: ANÁLISIS DIRECTIVO
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "analisis" && (
        <div className="space-y-8">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-700">Los cambios se guardan automáticamente al escribir</p>
            <div className="flex items-center gap-3">
              {savedMsg && <p className="text-green-400 text-xs font-medium">{savedMsg}</p>}
              <button onClick={downloadPdf} disabled={generatingPdf}
                className="flex items-center gap-2 px-3 py-1.5 border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/10 font-medium text-xs rounded-lg transition-all disabled:opacity-50">
                {generatingPdf ? "Generando…" : "⬇ PDF"}
              </button>
              <button onClick={saveAnalisis} disabled={savingAnalisis}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold text-xs rounded-lg transition-all active:scale-95 disabled:opacity-60">
                {savingAnalisis ? <><div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />Guardando…</> : "Guardar"}
              </button>
            </div>
          </div>

          {/* 1. Análisis del Período */}
          <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl p-6 space-y-5">
            <SectionDivider title="1. Análisis del Período" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <AnalisisTextarea label="Análisis Financiero"
                question="¿Cómo fue el desempeño financiero? ¿Cuál fue el principal driver de ingresos este mes?"
                value={analisisForm.analisisFinanciero ?? ""} onChange={handleFieldChange("analisisFinanciero")}
                placeholder="Ingresos generados, márgenes obtenidos, proyecto más rentable, tendencias clave del período…" rows={5} />
              <AnalisisTextarea label="Análisis Operativo"
                question="¿Cómo funcionó la operación? ¿Qué gastos superaron el presupuesto esperado?"
                value={analisisForm.analisisOperativo ?? ""} onChange={handleFieldChange("analisisOperativo")}
                placeholder="Eficiencia de equipos y personal, gastos fuera de control, áreas de mejora operativa…" rows={5} />
              <AnalisisTextarea label="Análisis de Mercado y Liquidez"
                question="¿Cuál es el estado de liquidez real vs. utilidad contable? ¿Cómo se comportó el mercado?"
                value={analisisForm.analisisMercado ?? ""} onChange={handleFieldChange("analisisMercado")}
                placeholder="Diferencia entre utilidad devengada y efectivo real en cuenta, comportamiento de clientes, oportunidades…" rows={5} />
            </div>
          </div>

          {/* 2. Retrospectiva */}
          <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl p-6 space-y-5">
            <SectionDivider title="2. Retrospectiva Mensual" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AnalisisTextarea label="¿Qué logramos este mes?"
                question="Logros, hitos y victorias del equipo."
                value={analisisForm.queLogramos ?? ""} onChange={handleFieldChange("queLogramos")}
                placeholder="Proyectos ejecutados con excelencia, cobranzas recuperadas, eficiencias logradas…" rows={4} />
              <AnalisisTextarea label="¿Qué no logramos y por qué?"
                question="Objetivos no cumplidos, causas raíz, responsables."
                value={analisisForm.queNoLogramos ?? ""} onChange={handleFieldChange("queNoLogramos")}
                placeholder="Metas de margen no alcanzadas, cobros no realizados, proyectos perdidos…" rows={4} />
              <AnalisisTextarea label="¿Qué cambiaríamos si pudiéramos?"
                question="Decisiones que tomarías diferente, aprendizajes del mes."
                value={analisisForm.queCambiariamos ?? ""} onChange={handleFieldChange("queCambiariamos")}
                placeholder="Cotizaciones que ajustarías, gastos que evitarías, procesos que mejorarías…" rows={4} />
              <AnalisisTextarea label="¿Qué decisiones urgentes hay que tomar?"
                question="Acciones que no pueden esperar al siguiente mes."
                value={analisisForm.decisionesUrgentes ?? ""} onChange={handleFieldChange("decisionesUrgentes")}
                placeholder="Cobros urgentes, contratos por revisar, gastos por detener, acuerdos por cerrar…" rows={4} />
            </div>
            <AnalisisTextarea label="Proyección y Enfoque del Siguiente Mes"
              question="¿Cuál es la expectativa financiera y las prioridades estratégicas para el próximo período?"
              value={analisisForm.proyeccionSiguiente ?? ""} onChange={handleFieldChange("proyeccionSiguiente")}
              placeholder="Proyectos confirmados, expectativa de ingresos, meta de margen, prioridades operativas, riesgos identificados…" rows={4} />
          </div>

          {/* 3. Propuestas de Mejora */}
          <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl p-6 space-y-5">
            <SectionDivider title="3. Propuestas de Mejora" />
            <p className="text-[10px] text-gray-600">
              5 acciones concretas para mejorar la rentabilidad, eficiencia o posición de la empresa el próximo mes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {([1, 2, 3, 4, 5] as const).map(n => {
                const field = `propuesta${n}` as keyof ERAnalisis;
                return (
                  <div key={n} className="flex gap-3">
                    <div className="w-8 h-8 bg-[#B3985B] rounded-full flex items-center justify-center shrink-0 mt-7 shadow-sm shadow-[#B3985B]/20">
                      <span className="text-black text-xs font-bold">{n}</span>
                    </div>
                    <div className="flex-1">
                      <AnalisisTextarea label={`Propuesta ${n}`}
                        value={(analisisForm[field] as string) ?? ""} onChange={handleFieldChange(field)}
                        placeholder="Acción específica · Responsable · Resultado esperado · Plazo…" rows={3} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. ISR / Cuenta Fiscal */}
          <div className="bg-amber-950/15 border border-amber-500/25 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 text-xl">🏦</span>
              <div>
                <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Cuenta Fiscal & ISR</h3>
                <p className="text-[10px] text-amber-800 mt-0.5">Monitoreo del saldo fiscal para prevenir contingencias de ISR</p>
              </div>
            </div>
            <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-amber-500 uppercase tracking-widest font-bold">ISR Estimado Automático (30%)</p>
                <p className="text-[9px] text-amber-800 mt-0.5">Calculado sobre utilidad operativa positiva</p>
              </div>
              <p className="text-2xl font-bold text-amber-400">{fmt(data.isrEstimado)}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumberInput label="Saldo Cuenta Fiscal — Mes Anterior"
                value={analisisForm.saldoCuentaFiscalAnterior?.toString() ?? ""}
                onChange={v => handleFieldChange("saldoCuentaFiscalAnterior")(v)} placeholder="$0" />
              <NumberInput label="Saldo Estimado — Mes Actual"
                value={analisisForm.saldoCuentaFiscalActual?.toString() ?? ""}
                onChange={v => handleFieldChange("saldoCuentaFiscalActual")(v)} placeholder="$0" />
              <NumberInput label="ISR Retenido / Pagado en el Mes"
                value={analisisForm.isrRetenidoMes?.toString() ?? ""}
                onChange={v => handleFieldChange("isrRetenidoMes")(v)} placeholder="$0" />
            </div>
            {analisisForm.saldoCuentaFiscalActual != null && analisisForm.saldoCuentaFiscalAnterior != null &&
             !isNaN(Number(analisisForm.saldoCuentaFiscalActual)) && !isNaN(Number(analisisForm.saldoCuentaFiscalAnterior)) && (
              <div className={`rounded-xl px-5 py-3 flex items-center justify-between
                ${Number(analisisForm.saldoCuentaFiscalActual) > Number(analisisForm.saldoCuentaFiscalAnterior)
                  ? "bg-red-950/30 border border-red-800/30" : "bg-green-950/20 border border-green-800/30"}`}>
                <p className="text-xs text-gray-400">Variación cuenta fiscal vs mes anterior</p>
                <p className={`text-lg font-bold ${Number(analisisForm.saldoCuentaFiscalActual) > Number(analisisForm.saldoCuentaFiscalAnterior) ? "text-red-400" : "text-green-400"}`}>
                  {Number(analisisForm.saldoCuentaFiscalActual) > Number(analisisForm.saldoCuentaFiscalAnterior) ? "▲ " : "▼ "}
                  {fmt(Math.abs(Number(analisisForm.saldoCuentaFiscalActual) - Number(analisisForm.saldoCuentaFiscalAnterior)))}
                </p>
              </div>
            )}
          </div>

          {/* 5. Cierre Directivo */}
          <div className="bg-[#060606] border border-[#1a1a1a] rounded-2xl p-6 space-y-5">
            <SectionDivider title="4. Cierre Directivo" />
            <AnalisisTextarea label="Comentarios Finales de Dirección"
              question="Reflexiones finales, contexto importante, mensajes al equipo directivo para el cierre de este período."
              value={analisisForm.comentariosFinales ?? ""} onChange={handleFieldChange("comentariosFinales")}
              placeholder="Contexto del mes, reconocimientos, advertencias, instrucciones para el siguiente período, mensajes a socios…"
              rows={6} />
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1a1a1a]">
              {savedMsg && <p className="text-green-400 text-xs font-medium animate-pulse">{savedMsg}</p>}
              <button onClick={downloadPdf} disabled={generatingPdf}
                className="flex items-center gap-2 px-4 py-2 border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 font-medium text-sm rounded-xl transition-all disabled:opacity-50">
                {generatingPdf ? "Generando…" : "⬇ Descargar PDF"}
              </button>
              <button onClick={saveAnalisis} disabled={savingAnalisis}
                className="flex items-center gap-2 px-6 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-60 shadow-md shadow-[#B3985B]/10">
                {savingAnalisis ? <><div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Guardando…</> : "Guardar Análisis"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
