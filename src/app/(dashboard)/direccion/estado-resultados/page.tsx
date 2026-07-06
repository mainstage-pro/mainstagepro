"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
const pct = (n: number, t: number) => t === 0 ? "—" : `${((n / t) * 100).toFixed(1)}%`;

function defaultMes() {
  const d = new Date();
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = "text-white", bgColor = "bg-[#0c0c0c]", border = "border-[#1e1e1e]" }:
  { label: string; value: string; sub?: string; color?: string; bgColor?: string; border?: string }) {
  return (
    <div className={`${bgColor} border ${border} rounded-2xl p-5`}>
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.max(2, Math.min(100, (Math.abs(value) / max) * 100)) : 0;
  return (
    <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

function CollapsibleSection({ title, badge, badgeColor = "text-white", children }:
  { title: string; badge?: string; badgeColor?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#0d0d0d] transition-colors">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{title}</span>
        <div className="flex items-center gap-3">
          {badge && <span className={`text-sm font-bold ${badgeColor}`}>{badge}</span>}
          <span className={`text-gray-600 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>
      {open && <div className="border-t border-[#1a1a1a]">{children}</div>}
    </div>
  );
}

function AnalisisTextarea({ label, value, onChange, placeholder, rows = 4 }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-[#B3985B] uppercase tracking-widest">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-[#080808] border border-[#222] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50 focus:ring-1 focus:ring-[#B3985B]/20 resize-none leading-relaxed"
      />
    </div>
  );
}

function NumberInput({ label, value, onChange, placeholder }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-[#B3985B] uppercase tracking-widest">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#080808] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50"
      />
    </div>
  );
}

// ─── Waterfall Row ────────────────────────────────────────────────────────────
function WaterfallRow({ label, sub, value, isResult, dotColor }:
  { label: string; sub?: string; value: number; isResult?: boolean; dotColor: string }) {
  const isPos = value >= 0;
  const textColor = isResult ? (isPos ? "text-green-400" : "text-red-400") : (value > 0 ? "text-white" : "text-red-400");
  return (
    <div className={`flex items-center justify-between px-5 py-3.5 border-b border-[#0d0d0d] last:border-0 ${isResult ? "bg-[#0c0c0c]" : ""}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-1 rounded-full shrink-0 ${isResult ? "h-10" : "h-7"} ${dotColor}`} />
        <div className="min-w-0">
          <p className={`${isResult ? "text-[10px] font-bold uppercase tracking-wider text-gray-300" : "text-[11px] text-gray-500 uppercase tracking-wide"}`}>{label}</p>
          {sub && <p className="text-[10px] text-gray-700 mt-0.5">{sub}</p>}
        </div>
      </div>
      <p className={`${isResult ? "text-2xl" : "text-lg"} font-bold tabular-nums shrink-0 ml-4 ${textColor}`}>
        {isResult ? fmt(value) : (value === 0 ? "—" : `(${fmt(Math.abs(value))})`)}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EstadoResultadosDireccionPage() {
  const [mes, setMes]               = useState(defaultMes);
  const [data, setData]             = useState<ERData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [savingAnalisis, setSavingAnalisis] = useState(false);
  const [savedMsg, setSavedMsg]     = useState("");
  const [activeTab, setActiveTab]   = useState<"resumen" | "proyectos" | "gastos" | "analisis">("resumen");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Formulario de análisis
  const [analisisForm, setAnalisisForm] = useState<ERAnalisis>({});

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const canNext = mes < mesActual;

  const fetchData = useCallback(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/admin/reportes/estado-resultados?mes=${mes}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        setData(d);
        setLoading(false);
        if (d?.analisis) {
          setAnalisisForm(d.analisis);
        } else {
          setAnalisisForm({});
        }
      })
      .catch(() => setLoading(false));
  }, [mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (field: keyof ERAnalisis) => (value: string) =>
    setAnalisisForm((prev) => ({ ...prev, [field]: value }));

  const saveAnalisis = async () => {
    setSavingAnalisis(true);
    try {
      const res = await fetch("/api/admin/reportes/estado-resultados/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes, ...analisisForm }),
      });
      if (res.ok) {
        setSavedMsg("Análisis guardado ✓");
        setTimeout(() => setSavedMsg(""), 3000);
      }
    } finally {
      setSavingAnalisis(false);
    }
  };

  const downloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const res = await fetch(`/api/admin/reportes/estado-resultados/pdf?mes=${mes}`);
      if (!res.ok) { alert("Error al generar PDF"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `Estado-Resultados-${mes}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ─── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto text-center text-gray-600 py-24">
        Error al cargar los datos del período.
      </div>
    );
  }

  const comp = data.comparativo;
  const varIngresos = comp && comp.totalIngresos > 0
    ? ((data.totalIngresos - comp.totalIngresos) / comp.totalIngresos) * 100
    : null;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-20 space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-[#B3985B] font-bold uppercase tracking-[0.2em] mb-1">Dirección General</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Estado de Resultados</h1>
          <p className="text-gray-500 text-sm mt-1">
            Base devengado — {mesLabel(mes)}
            {varIngresos !== null && (
              <span className={`ml-2 font-semibold ${varIngresos >= 0 ? "text-green-400" : "text-red-400"}`}>
                {varIngresos >= 0 ? "▲" : "▼"} {Math.abs(varIngresos).toFixed(1)}% vs {mesLabel(data.mesAnterior)}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nav mes */}
          <div className="flex items-center gap-1 bg-[#080808] border border-[#1e1e1e] rounded-xl p-1">
            <button onClick={() => setMes((m) => navMes(m, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-colors">←</button>
            <span className="text-white text-sm font-medium px-3 min-w-[140px] text-center">{mesLabel(mes)}</span>
            <button onClick={() => canNext && setMes((m) => navMes(m, 1))} disabled={!canNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">→</button>
          </div>

          {/* PDF */}
          <button onClick={downloadPdf} disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-60">
            {generatingPdf ? (
              <><div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />Generando...</>
            ) : (
              <>⬇ PDF Horizontal</>
            )}
          </button>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Ingresos Devengados"
          value={fmt(data.totalIngresos)}
          sub={`${data.cantidadProyectos} proyecto${data.cantidadProyectos !== 1 ? "s" : ""} ejecutado${data.cantidadProyectos !== 1 ? "s" : ""}`} />
        <KpiCard label="Utilidad Bruta"
          value={fmt(data.utilidadBruta)}
          sub={`Margen ${data.margenBrutoPct.toFixed(1)}%`}
          color={data.utilidadBruta >= 0 ? "text-green-400" : "text-red-400"}
          border={data.utilidadBruta >= 0 ? "border-green-900/30" : "border-red-900/30"} />
        <KpiCard label="Utilidad Operativa"
          value={fmt(data.utilidadOperativa)}
          sub={`Margen ${data.margenOperativoPct.toFixed(1)}%`}
          color={data.utilidadOperativa >= 0 ? "text-green-400" : "text-red-400"}
          border={data.utilidadOperativa >= 0 ? "border-green-900/30" : "border-red-900/30"} />
        <KpiCard label="Utilidad Neta"
          value={fmt(data.utilidadNeta)}
          sub={`Margen neto ${data.margenNetoPct.toFixed(1)}%`}
          color="text-[#B3985B]"
          bgColor="bg-[#0d0b07]"
          border="border-[#B3985B]/30" />
      </div>

      {/* ── Tab Nav ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#080808] border border-[#1e1e1e] rounded-xl p-1 w-fit overflow-x-auto">
        {([
          { key: "resumen",   label: "P&L Resumen" },
          { key: "proyectos", label: `Proyectos (${data.cantidadProyectos})` },
          { key: "gastos",    label: "Gastos & Nómina" },
          { key: "analisis",  label: "Análisis Directivo" },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === t.key ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: P&L Resumen ─────────────────────────────────────────────────── */}
      {activeTab === "resumen" && (
        <div className="bg-[#080808] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          {/* Ingresos */}
          <WaterfallRow label="Ingresos por Proyectos" dotColor="bg-green-500"
            sub={`${data.cantidadProyectos} eventos ejecutados en ${mesLabel(mes)} — base devengado`}
            value={data.totalIngresos} isResult />

          {/* Costos Directos */}
          <WaterfallRow label="− Costos Directos de Proyectos" dotColor="bg-red-500/50"
            sub="CxP de proveedores/técnicos + gastos operativos de eventos"
            value={-data.totalCostosDirectos} />

          {/* Utilidad Bruta */}
          <div className={`px-5 py-4 border-b border-[#111] ${data.utilidadBruta >= 0 ? "bg-green-950/15" : "bg-red-950/15"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-10 rounded-full ${data.utilidadBruta >= 0 ? "bg-green-400" : "bg-red-400"}`} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">= UTILIDAD BRUTA</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Ingresos − Costos directos · Margen: {pct(data.utilidadBruta, data.totalIngresos)}</p>
                </div>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${data.utilidadBruta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmt(data.utilidadBruta)}
              </p>
            </div>
          </div>

          {/* Gastos Operativos */}
          <WaterfallRow label="− Gastos Operativos" dotColor="bg-amber-500/50"
            sub={`Fijos + variables del período — ${data.gastosPorCategoria.length} categorías`}
            value={-data.totalGastosOperativos} />

          {/* Nómina */}
          <WaterfallRow label="− Nómina" dotColor="bg-violet-500/50"
            sub={`${data.nominaItems.length} colaborador${data.nominaItems.length !== 1 ? "es" : ""} — período ${mes}`}
            value={-data.totalNomina} />

          {/* Utilidad Operativa */}
          <div className={`px-5 py-4 border-b border-[#111] ${data.utilidadOperativa >= 0 ? "bg-green-950/10" : "bg-red-950/10"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-10 rounded-full ${data.utilidadOperativa >= 0 ? "bg-green-400" : "bg-red-400"}`} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">= UTILIDAD OPERATIVA</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Ut. Bruta − Gastos operativos − Nómina · Margen: {pct(data.utilidadOperativa, data.totalIngresos)}</p>
                </div>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${data.utilidadOperativa >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmt(data.utilidadOperativa)}
              </p>
            </div>
          </div>

          {/* Costos Financieros */}
          {data.totalCostosFinancieros > 0 && (
            <WaterfallRow label="− Costos Financieros" dotColor="bg-gray-600"
              sub={`${data.cuotasDeuda.length} cuota${data.cuotasDeuda.length !== 1 ? "s" : ""} de deuda con vencimiento en el período`}
              value={-data.totalCostosFinancieros} />
          )}

          {/* ISR Estimado */}
          {data.isrEstimado > 0 && (
            <WaterfallRow label="− ISR Estimado (30%)" dotColor="bg-amber-600"
              sub="Estimación sobre utilidad operativa positiva. Validar con contabilidad."
              value={-data.isrEstimado} />
          )}

          {/* Utilidad Neta */}
          <div className={`px-5 py-5 ${data.utilidadNeta >= 0 ? "bg-black" : "bg-[#1a0000]"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-12 rounded-full bg-[#B3985B]" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white">= UTILIDAD NETA</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Después de impuestos y costos financieros · Margen: {pct(data.utilidadNeta, data.totalIngresos)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold tabular-nums text-[#B3985B]">{fmt(data.utilidadNeta)}</p>
                <p className="text-[10px] text-gray-600 mt-1">{data.margenNetoPct.toFixed(1)}% margen neto</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Proyectos ───────────────────────────────────────────────────── */}
      {activeTab === "proyectos" && (
        <div className="space-y-4">
          {data.proyectos.length === 0 ? (
            <div className="bg-[#080808] border border-[#1e1e1e] rounded-2xl p-16 text-center">
              <p className="text-gray-600">Sin proyectos ejecutados en {mesLabel(mes)}</p>
              <p className="text-gray-700 text-xs mt-2">Los proyectos se reconocen por su fecha de evento</p>
            </div>
          ) : (
            <div className="bg-[#080808] border border-[#1e1e1e] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#050505]">
                    <tr>
                      {["Proyecto", "Cliente", "Tipo de Evento", "Ingreso", "Costo Directo", "Ut. Bruta", "Margen", "Por Cobrar"].map((h) => (
                        <th key={h} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 ${h === "Proyecto" || h === "Cliente" ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111]">
                    {data.proyectos.map((p) => {
                      const margenColor = p.margenPct >= 40 ? "text-green-400" : p.margenPct >= 20 ? "text-amber-400" : "text-red-400";
                      const d = new Date(p.fechaEvento);
                      const fechaStr = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
                      return (
                        <tr key={p.id} className="hover:bg-[#0d0d0d] transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs text-white font-medium">{p.nombre}</p>
                            <p className="text-[10px] text-gray-600">{fechaStr}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 truncate max-w-[120px]">{p.cliente}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 text-right">{p.tipoEvento}</td>
                          <td className="px-4 py-3 text-xs text-white text-right tabular-nums font-medium">{fmt(p.ingresoSinIva)}</td>
                          <td className="px-4 py-3 text-xs text-red-400 text-right tabular-nums">({fmt(p.costoDirecto)})</td>
                          <td className={`px-4 py-3 text-xs text-right tabular-nums font-bold ${p.utilidadBruta >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {fmt(p.utilidadBruta)}
                          </td>
                          <td className={`px-4 py-3 text-xs text-right font-bold ${margenColor}`}>{p.margenPct.toFixed(0)}%</td>
                          <td className={`px-4 py-3 text-xs text-right tabular-nums ${p.porCobrar > 0 ? "text-amber-400" : "text-green-500"}`}>
                            {p.porCobrar > 0 ? fmt(p.porCobrar) : "✓ Liquidado"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#0a0a0a] border-t border-[#2a2a2a]">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">TOTALES</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-white tabular-nums">{fmt(data.totalIngresos)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-red-400 tabular-nums">({fmt(data.totalCostosDirectos)})</td>
                      <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${data.utilidadBruta >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(data.utilidadBruta)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-[#B3985B]">{data.margenBrutoPct.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-amber-400 tabular-nums">
                        {fmt(data.proyectos.reduce((s, p) => s + p.porCobrar, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Gastos & Nómina ─────────────────────────────────────────────── */}
      {activeTab === "gastos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gastos por categoría */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">Gastos Operativos por Categoría</h3>
            <div className="bg-[#080808] border border-[#1e1e1e] rounded-2xl overflow-hidden divide-y divide-[#0d0d0d]">
              {data.gastosPorCategoria.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin gastos operativos registrados</p>
              ) : (
                data.gastosPorCategoria.map((cat) => {
                  const pctVal = data.totalGastosOperativos > 0 ? (cat.monto / data.totalGastosOperativos) * 100 : 0;
                  return (
                    <CollapsibleSection key={cat.nombre} title={cat.nombre} badge={fmt(cat.monto)} badgeColor="text-amber-400">
                      <div className="px-5 py-3 space-y-1.5 max-h-48 overflow-y-auto">
                        {cat.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-1">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-300 truncate">{item.concepto}</p>
                              {item.proveedor && <p className="text-[10px] text-gray-600">{item.proveedor}</p>}
                            </div>
                            <span className="text-xs font-medium text-white ml-3 shrink-0">{fmt(item.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  );
                })
              )}
              {data.gastosPorCategoria.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3 bg-[#0a0a0a]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Total</span>
                  <span className="text-sm font-bold text-amber-400">{fmt(data.totalGastosOperativos)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Nómina */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">Nómina del Período</h3>
            <div className="bg-[#080808] border border-[#1e1e1e] rounded-2xl overflow-hidden">
              {data.nominaItems.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin registros de nómina en {mes}</p>
              ) : (
                <div className="divide-y divide-[#0d0d0d]">
                  {Object.entries(data.nominaPorArea).map(([area, monto]) => (
                    <div key={area} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-xs text-white font-medium">{area}</p>
                        <p className="text-[10px] text-gray-600">
                          {data.nominaItems.filter((n) => n.area === area).length} colaborador(es)
                        </p>
                      </div>
                      <span className="text-sm font-bold text-violet-400">{fmt(monto)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-3 bg-[#0a0a0a]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Total Nómina</span>
                    <span className="text-sm font-bold text-violet-400">{fmt(data.totalNomina)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Costos financieros */}
            {data.cuotasDeuda.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">Costos Financieros</h3>
                <div className="bg-[#080808] border border-[#1e1e1e] rounded-2xl overflow-hidden divide-y divide-[#0d0d0d]">
                  {data.cuotasDeuda.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-xs text-white">{c.nombre}</p>
                        <p className="text-[10px] text-gray-600">Cuota {c.numeroCuota} · {c.categoria}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-400">{fmt(c.monto)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-3 bg-[#0a0a0a]">
                    <span className="text-[10px] font-bold uppercase text-gray-600">Total Financiero</span>
                    <span className="text-sm font-bold text-gray-400">{fmt(data.totalCostosFinancieros)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ISR estimado alert */}
            {data.isrEstimado > 0 && (
              <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-500/30 rounded-xl p-4">
                <span className="text-amber-400 text-lg shrink-0">⚠</span>
                <div>
                  <p className="text-amber-300 text-sm font-semibold">ISR Estimado: {fmt(data.isrEstimado)}</p>
                  <p className="text-amber-700 text-xs mt-0.5">30% sobre utilidad operativa positiva. Validar con contador el monto real a provisionar.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Análisis Directivo ──────────────────────────────────────────── */}
      {activeTab === "analisis" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna 1: Análisis narrativo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#1e1e1e]">
                <div className="w-1 h-5 bg-[#B3985B] rounded-full" />
                <h3 className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">Análisis del Responsable</h3>
              </div>
              <AnalisisTextarea label="Análisis Financiero"
                value={analisisForm.analisisFinanciero ?? ""}
                onChange={setField("analisisFinanciero")}
                placeholder="¿Cómo fue el desempeño financiero? Ingresos, márgenes, tendencias clave..."
                rows={4} />
              <AnalisisTextarea label="Análisis Operativo"
                value={analisisForm.analisisOperativo ?? ""}
                onChange={setField("analisisOperativo")}
                placeholder="¿Cómo funcionó la operación? Eficiencia de equipos, procesos, personal..."
                rows={4} />
              <AnalisisTextarea label="Análisis de Mercado"
                value={analisisForm.analisisMercado ?? ""}
                onChange={setField("analisisMercado")}
                placeholder="¿Cómo se comportó el mercado? Clientes, competencia, oportunidades..."
                rows={3} />
            </div>

            {/* Columna 2: Preguntas estratégicas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#1e1e1e]">
                <div className="w-1 h-5 bg-[#B3985B] rounded-full" />
                <h3 className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">Preguntas Estratégicas</h3>
              </div>
              <AnalisisTextarea label="¿Qué logramos este mes?"
                value={analisisForm.queLogramos ?? ""}
                onChange={setField("queLogramos")}
                placeholder="Logros principales, hitos alcanzados, victorias del equipo..."
                rows={3} />
              <AnalisisTextarea label="¿Qué no logramos y por qué?"
                value={analisisForm.queNoLogramos ?? ""}
                onChange={setField("queNoLogramos")}
                placeholder="Objetivos no cumplidos, causas raíz, responsables..."
                rows={3} />
              <AnalisisTextarea label="¿Qué cambiaríamos si pudiéramos?"
                value={analisisForm.queCambiariamos ?? ""}
                onChange={setField("queCambiariamos")}
                placeholder="Decisiones que tomarías diferente, aprendizajes..." rows={3} />
              <AnalisisTextarea label="¿Qué decisiones urgentes hay que tomar?"
                value={analisisForm.decisionesUrgentes ?? ""}
                onChange={setField("decisionesUrgentes")}
                placeholder="Decisiones que no pueden esperar al siguiente mes..."
                rows={3} />
              <AnalisisTextarea label="Proyección y enfoque del siguiente mes"
                value={analisisForm.proyeccionSiguiente ?? ""}
                onChange={setField("proyeccionSiguiente")}
                placeholder="Expectativas de ingresos, proyectos confirmados, prioridades..."
                rows={3} />
            </div>
          </div>

          {/* Propuestas de mejora */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#1e1e1e]">
              <div className="w-1 h-5 bg-[#B3985B] rounded-full" />
              <h3 className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">5 Propuestas de Mejora</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([1, 2, 3, 4, 5] as const).map((n) => {
                const field = `propuesta${n}` as keyof ERAnalisis;
                return (
                  <div key={n} className="flex gap-3">
                    <div className="w-7 h-7 bg-[#B3985B] rounded-full flex items-center justify-center shrink-0 mt-6">
                      <span className="text-black text-xs font-bold">{n}</span>
                    </div>
                    <div className="flex-1">
                      <AnalisisTextarea label={`Propuesta ${n}`}
                        value={(analisisForm[field] as string) ?? ""}
                        onChange={setField(field)}
                        placeholder="Acción específica, responsable y resultado esperado..."
                        rows={3} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ISR / Cuenta Fiscal */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-lg">⚠</span>
              <h3 className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">Cuenta Fiscal / ISR</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumberInput label="Saldo cuenta fiscal mes anterior"
                value={analisisForm.saldoCuentaFiscalAnterior?.toString() ?? ""}
                onChange={(v) => setField("saldoCuentaFiscalAnterior")(v)}
                placeholder="0" />
              <NumberInput label="Saldo estimado mes actual"
                value={analisisForm.saldoCuentaFiscalActual?.toString() ?? ""}
                onChange={(v) => setField("saldoCuentaFiscalActual")(v)}
                placeholder="0" />
              <NumberInput label="ISR retenido / pagado en el mes"
                value={analisisForm.isrRetenidoMes?.toString() ?? ""}
                onChange={(v) => setField("isrRetenidoMes")(v)}
                placeholder="0" />
            </div>
            <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-500/20 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-sm">📊</span>
              <p className="text-xs text-amber-600">
                ISR estimado automático (30% sobre utilidad operativa):
                <strong className="text-amber-400 ml-1">{fmt(data.isrEstimado)}</strong>
              </p>
            </div>
          </div>

          {/* Comentarios finales */}
          <AnalisisTextarea label="Comentarios Finales"
            value={analisisForm.comentariosFinales ?? ""}
            onChange={setField("comentariosFinales")}
            placeholder="Reflexiones finales, contexto adicional, mensajes al equipo directivo..."
            rows={5} />

          {/* Guardar */}
          <div className="flex items-center justify-between pt-2">
            {savedMsg && <p className="text-green-400 text-sm font-medium">{savedMsg}</p>}
            <div className="flex gap-3 ml-auto">
              <button onClick={downloadPdf} disabled={generatingPdf}
                className="flex items-center gap-2 px-4 py-2 border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 font-medium text-sm rounded-xl transition-all disabled:opacity-50">
                {generatingPdf ? "Generando..." : "⬇ Descargar PDF"}
              </button>
              <button onClick={saveAnalisis} disabled={savingAnalisis}
                className="flex items-center gap-2 px-6 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-60">
                {savingAnalisis ? (
                  <><div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />Guardando...</>
                ) : "Guardar Análisis"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
