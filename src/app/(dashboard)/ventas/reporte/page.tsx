"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ReporteAnalisisSection } from '@/components/ui/ReporteAnalisisSection';
import { useSearchParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vendedor { id: string; name: string; fechaInicioVendedor: string | null }

interface OrigenItem   { origen: string;  count: number; monto: number; pct: number }
interface TipoItem     { tipo: string;    count: number; monto: number; pct: number }
interface ClienteTop   { nombre: string;  empresa: string | null; monto: number; eventos: number }
interface MesHistorico { mes: string; label: string; count: number; monto: number }

interface VendedorItem { id: string; nombre: string; eventos: number; monto: number }
interface ZonaItem     { zona: string; count: number; monto: number; pct: number }
interface MotivoPerdida { motivo: string; count: number; pct: number }

interface ReporteMensual {
  periodo: { mes: string; label: string };
  ventasTotal: { count: number; monto: number; clientesUnicos: number };
  ticketPromedio: number;
  crecimientoMensual: number | null;
  porTipoEvento: { tipo: string; count: number; monto: number; pct: number }[];
  porTipoServicio: { tipo: string; count: number; monto: number; pct: number }[];
  cotizaciones: { totalCreadas: number; ventasCerradas: number; enSeguimiento: number };
  tratosPerdidos: { 
    count: number; 
    montoEstimadoPerdido: number; 
    motivosPerdida: { motivo: string; count: number; pct: number }[];
    top?: { id: string; nombreEvento: string | null; clienteNombre: string; motivoPerdida: string | null; monto: number }[];
  };
  top3Clientes: ClienteTop[];
  top5Clientes: ClienteTop[];
  clientesRecurrentes: { count: number }
  clientesNuevos: { count: number; lista: { nombre: string; empresa: string | null }[] }
  porServicio: {
    rentas:    { count: number; monto: number; pct: number }
    produccion:{ count: number; monto: number; pct: number }
    otro:      { count: number; monto: number; pct: number }
  }
  origenLeads: OrigenItem[]
  porVendedor: VendedorItem[]
  porZona: ZonaItem[]
  porMesHistorico: (MesHistorico & { perdidos: number })[]
}

interface DetalleComision {
  tratoId: string
  cliente: { nombre: string; empresa: string | null }
  nombreEvento: string | null
  fechaCierre: string | null
  origenVenta: string
  numeroCotizacion: string | null
  granTotal: number
  baseCalculo: number
  pctComision: number
  montoComision: number
  liquidado100: boolean
  estadoPago: string
  esDelegado?: boolean
  cotizadorNombre?: string | null
}
interface ResumenVendedor {
  totalTratos: number
  baseLiquidada: number
  totalComisiones: number
  alcanzaPiso: boolean
  montoBono: number
  totalAPagar: number
}
interface ReporteVendedorData {
  vendedor: { id: string; name: string }
  mes: string
  mesTrabajo: number
  piso: number
  config: { pctClientePropio: number; pctPublicidad: number; pctAsignadoVendedor: number; pctBono: number }
  detalles: DetalleComision[]
  resumen: ResumenVendedor
  totalCotizaciones: number
  comisionPendiente: number
  pagosRegistrados: { id: string; mes: string; montoTotal: number; notas: string | null; pagadoEn: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtK(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function getMesAnterior() {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${y}-${String(m).padStart(2, "0")}`;
}

const ORIGEN_LABEL: Record<string, string> = {
  META_ADS: "Meta Ads", GOOGLE_ADS: "Google Ads", ORGANICO: "Orgánico",
  RECOMPRA: "Recompra", REFERIDO: "Referido", PROSPECCION: "Prospección", OTRO: "Otro",
};
const TIPO_EVENTO_LABEL: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro",
};
const TIPO_SERVICIO_LABEL: Record<string, string> = {
  RENTA: "Renta de Equipo", PRODUCCION_TECNICA: "Producción Técnica",
  DIRECCION_TECNICA: "Dirección Técnica", OTRO: "Otro",
};
const ORIGEN_VENTA_LABEL: Record<string, string> = {
  CLIENTE_PROPIO: "Cliente Propio", PUBLICIDAD: "Publicidad", ASIGNADO: "Asignado",
};
const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  LIQUIDADO: { label: "Liquidado", cls: "bg-green-900/40 text-green-400 border border-green-800/40" },
  PARCIAL:   { label: "Anticipo",  cls: "bg-yellow-900/40 text-yellow-400 border border-yellow-800/40" },
  PENDIENTE: { label: "Pendiente", cls: "bg-zinc-800 text-zinc-400 border border-zinc-700" },
};

const CHART_COLORS = ["#B3985B","#60a5fa","#4ade80","#a855f7","#f97316","#14b8a6","#f43f5e"];

// Tooltip dark
function DarkTooltip({ active, payload, label, formatter }: {
  active?: boolean; payload?: { name: string; value: number; fill?: string }[]; label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-gray-400 mb-1.5 font-semibold">{label}</p>}
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill ?? "#B3985B" }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-white font-semibold">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReporteVentasPage() {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<{ id: string; role: string; name?: string } | null>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [activeTab, setActiveTab] = useState<"resultados" | "comisiones">("resultados");

  // ── Tab 1 state ─────────────────────────────────────────────────────────────
  const [mes1, setMes1] = useState(getMesAnterior());
  const [reporte, setReporte] = useState<ReporteMensual | null>(null);
  const [loadingMensual, setLoadingMensual] = useState(false);
  const [loadingPdf1, setLoadingPdf1] = useState(false);
  const [showEjecutivo, setShowEjecutivo] = useState(false);
  const [analisis1, setAnalisis1] = useState("");
  const [propuesta1_1, setPropuesta1_1] = useState("");
  const [propuesta2_1, setPropuesta2_1] = useState("");
  const [propuesta3_1, setPropuesta3_1] = useState("");
  const [comentarios1, setComentarios1] = useState("");
  const [notasLoaded, setNotasLoaded] = useState(false);

  // ── Tab 2 state ─────────────────────────────────────────────────────────────
  const [mes2, setMes2] = useState(searchParams.get("mes") ?? getMesAnterior());
  const [vendedorId, setVendedorId] = useState(searchParams.get("vendedorId") ?? "");
  const [reporteVendedor, setReporteVendedor] = useState<ReporteVendedorData | null>(null);
  const [loadingVendedor, setLoadingVendedor] = useState(false);
  const [loadingPdf2, setLoadingPdf2] = useState(false);
  const [analisis2, setAnalisis2] = useState("");
  const [propuesta1_2, setPropuesta1_2] = useState("");
  const [propuesta2_2, setPropuesta2_2] = useState("");
  const [propuesta3_2, setPropuesta3_2] = useState("");
  const [comentarios2, setComentarios2] = useState("");
  const [notasPago, setNotasPago] = useState("");
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setSession(d.user);
        if (d.user.role !== "ADMIN") setVendedorId(d.user.id);
      }
    });
    fetch("/api/vendedores").then(r => r.json()).then(d => setVendedores(d.vendedores ?? []));
  }, []);

  function toast(type: "ok" | "err", text: string) {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  }

  // ── Tab 1 ─────────────────────────────────────────────────────────────────────
  const cargarMensual = useCallback(async () => {
    setLoadingMensual(true);
    try {
      const res = await fetch(`/api/ventas/reporte-mensual?mes=${mes1}`);
      const d = await res.json();
      setReporte(d);
    } finally {
      setLoadingMensual(false);
    }
  }, [mes1]);
  useEffect(() => { cargarMensual(); }, [cargarMensual]);

  // Load notes from localStorage when mes1 changes
  useEffect(() => {
    setNotasLoaded(false);
    try {
      setAnalisis1(localStorage.getItem(`ventas-reporte-${mes1}-analisis`) ?? "");
      setPropuesta1_1(localStorage.getItem(`ventas-reporte-${mes1}-propuesta1`) ?? "");
      setPropuesta2_1(localStorage.getItem(`ventas-reporte-${mes1}-propuesta2`) ?? "");
      setPropuesta3_1(localStorage.getItem(`ventas-reporte-${mes1}-propuesta3`) ?? "");
      setComentarios1(localStorage.getItem(`ventas-reporte-${mes1}-comentarios`) ?? "");
    } catch { /**/ }
    setNotasLoaded(true);
  }, [mes1]);

  async function descargarPdf1() {
    setLoadingPdf1(true);
    try {
      const res = await fetch("/api/ventas/reporte-mensual/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes: mes1, analisis: analisis1, propuesta1: propuesta1_1, propuesta2: propuesta2_1, propuesta3: propuesta3_1, comentarios: comentarios1 }),
      });
      if (!res.ok) { toast("err", "Error al generar PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Reporte-Ventas-${mes1}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally { setLoadingPdf1(false); }
  }

  // ── Tab 2 ─────────────────────────────────────────────────────────────────────
  const cargarVendedor = useCallback(async () => {
    const vid = vendedorId || (session?.role !== "ADMIN" ? session?.id : "");
    if (!vid || !mes2) return;
    setLoadingVendedor(true);
    try {
      const res = await fetch(`/api/ventas/reporte?mes=${mes2}&vendedorId=${vid}`);
      const base = await res.json();
      const pendiente = (base.detalles ?? []).filter((d: DetalleComision) => !d.liquidado100 && d.baseCalculo > 0)
        .reduce((s: number, d: DetalleComision) => s + (d.baseCalculo * d.pctComision) / 100, 0);
      setReporteVendedor({ ...base, totalCotizaciones: base.totalCotizaciones ?? base.resumen?.totalTratos ?? 0, comisionPendiente: pendiente });
    } finally { setLoadingVendedor(false); }
  }, [vendedorId, mes2, session]);
  useEffect(() => { cargarVendedor(); }, [cargarVendedor]);

  async function descargarPdf2() {
    const vid = vendedorId || session?.id;
    if (!vid) return;
    setLoadingPdf2(true);
    try {
      const res = await fetch("/api/ventas/reporte-vendedor-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes: mes2, vendedorId: vid, analisis: analisis2, propuesta1: propuesta1_2, propuesta2: propuesta2_2, propuesta3: propuesta3_2, comentarios: comentarios2 }),
      });
      if (!res.ok) { toast("err", "Error al generar PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte-${reporteVendedor?.vendedor?.name?.replace(/\s+/g, "-") ?? "Vendedor"}-${mes2}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } finally { setLoadingPdf2(false); }
  }

  async function registrarPago() {
    if (!reporteVendedor || !vendedorId) return;
    setRegistrandoPago(true);
    const res = await fetch("/api/ventas/reporte", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendedorId, mes: mes2, montoTotal: reporteVendedor.resumen.totalAPagar, notas: notasPago || null }),
    });
    setRegistrandoPago(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast("err", d.error ?? "Error al registrar"); return; }
    toast("ok", "Pago registrado"); setNotasPago(""); cargarVendedor();
  }

  async function corregirVendedor(tratoId: string, nuevoVid: string) {
    const res = await fetch(`/api/tratos/${tratoId}/vendedor`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendedorId: nuevoVid }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast("err", d.error ?? "Error"); return; }
    toast("ok", "Vendedor actualizado"); cargarVendedor();
  }

  const isAdmin = session?.role === "ADMIN";
  const conversionPct = reporte ? pct(reporte.cotizaciones.ventasCerradas, reporte.cotizaciones.totalCreadas) : 0;

  // Persist analysis notes in localStorage
  const STOR = (k: string) => `ventas-reporte-${mes1}-${k}`;
  function loadNota(k: string) { try { return localStorage.getItem(STOR(k)) ?? ""; } catch { return ""; } }
  function saveNota(k: string, v: string) { try { localStorage.setItem(STOR(k), v); } catch { /**/ } }

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl
          ${toastMsg.type === "ok" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="ms-h1">Reporte de Ventas</h1>
          <p className="text-[#555] text-xs">Resultados mensuales · análisis de rendimiento</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowEjecutivo(true)}
            className="flex items-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96a] active:scale-95 text-black text-xs font-semibold px-3 py-2 rounded-lg transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Reporte ejecutivo
          </button>
          <div className="flex items-center gap-1.5 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input type="month" value={mes1} onChange={e => setMes1(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1a1a1a] flex gap-0">
        {([
          { key: "resultados" as const, label: "Resultados del Mes" },
          { key: "comisiones" as const, label: "Comisiones por Vendedor" },
        ]).map(t => (
          <button key={t.key} id={`tab-${t.key}`} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-[#B3985B] text-white font-medium'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 — RESULTADOS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "resultados" && (
        loadingMensual ? (
          <div className="py-16 text-center">
            <div className="inline-flex items-center gap-3 text-[#555] text-sm">
              <svg className="w-5 h-5 animate-spin text-[#B3985B]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Cargando reporte...
            </div>
          </div>
        ) : !reporte ? null : (
          <>
            {/* ── SECCIÓN 1: KPIs principales ─────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Ventas totales */}
              <div className="ms-stat-card col-span-2 md:col-span-1">
                <p className="text-[#555] text-[10px] uppercase tracking-widest mb-1">Ingresos del mes</p>
                <p className="text-3xl font-bold text-[#B3985B] leading-none">{fmt(reporte.ventasTotal.monto)}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[#6b7280] text-[11px]">{reporte.ventasTotal.count} ventas cerradas (a {reporte.ventasTotal.clientesUnicos} clientes distintos)</span>
                  {reporte.crecimientoMensual !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      reporte.crecimientoMensual >= 0 ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"
                    }`}>
                      {reporte.crecimientoMensual >= 0 ? "+" : ""}{reporte.crecimientoMensual.toFixed(1)}% vs mes ant.
                    </span>
                  )}
                </div>
              </div>

              {/* Ticket promedio */}
              <div className="ms-stat-card">
                <p className="text-[#555] text-[10px] uppercase tracking-widest mb-1">Ticket promedio</p>
                <p className="ms-h1">{fmt(reporte.ticketPromedio)}</p>
                <p className="text-[#444] text-[10px] mt-1.5">por venta cerrada</p>
              </div>

              {/* Conversión */}
              <div className="ms-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-[#6b7280] mb-1">
                    <p className="text-xs uppercase tracking-wider font-semibold">Conversión</p>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-end justify-between mb-2">
                      <p className="text-2xl font-bold text-white">{conversionPct.toFixed(1)}%</p>
                      <p className="text-[#B3985B] text-xs font-medium bg-[#B3985B]/10 px-2 py-0.5 rounded">Tasa Conversión</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 mt-3 pt-3 border-t border-[#333]/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6b7280]">Ventas Cerradas</span>
                    <span className="text-white font-medium">{reporte.cotizaciones.ventasCerradas}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6b7280]">En Seguimiento</span>
                    <span className="text-white font-medium">{reporte.cotizaciones.enSeguimiento}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6b7280]">Ventas Perdidas</span>
                    <span className="text-white font-medium">{reporte.tratosPerdidos.count}</span>
                  </div>
                </div>
              </div>

              {/* Perdidos */}
              <div className="ms-card flex flex-col justify-between">
                <div className="flex items-center gap-3 text-[#6b7280] mb-1">
                  <p className="text-xs uppercase tracking-wider font-semibold">Ventas perdidas</p>
                </div>
                <div className="mt-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-2xl font-bold text-red-400">{reporte.tratosPerdidos.count}</p>
                      <p className="text-[#444] text-[10px] mt-1.5">{reporte.tratosPerdidos.montoEstimadoPerdido > 0 ? `~${fmt(reporte.tratosPerdidos.montoEstimadoPerdido)} perdidos` : "este período"}</p>
                    </div>
                  </div>
                  
                  {reporte.tratosPerdidos.top && reporte.tratosPerdidos.top.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[#6b7280] text-[10px] uppercase font-semibold">Principales pérdidas</p>
                      {reporte.tratosPerdidos.top.map((t, i) => (
                        <div key={i} className="flex justify-between items-start text-xs border-b border-[#333]/50 pb-1.5 last:border-0 last:pb-0">
                          <div className="flex flex-col max-w-[65%]">
                            <span className="text-white truncate">{t.nombreEvento || "Sin Nombre"}</span>
                            <span className="text-[#555] truncate text-[10px]">{t.clienteNombre}</span>
                          </div>
                          <span className="text-red-400/80 font-mono text-[10px] whitespace-nowrap">{fmt(t.monto)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── SECCIÓN 2: Tendencia + Clientes ─────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gráfica tendencia — ocupa 2 columnas */}
              <div className="ms-card p-5 md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold text-sm">Tendencia — últimos 6 meses</h2>
                  <div className="flex items-center gap-3 text-[10px] text-[#555]">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#B3985B] inline-block" />Ventas</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-900/60 inline-block" />Perdidos</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={reporte.porMesHistorico} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-xs shadow-2xl">
                          <p className="text-[#888] mb-2 font-semibold">{label}</p>
                          {payload.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
                              <span className="text-[#888]">{p.name}:</span>
                              <span className="text-white font-bold">{p.name === "Ventas" ? fmt(p.value as number) : p.value}</span>
                            </div>
                          ))}
                          <p className="text-[#555] text-[10px] mt-1">{(payload[0] as {payload: {count:number}}).payload.count} eventos cerrados</p>
                        </div>
                      );
                    }} cursor={{ fill: "#ffffff04" }} />
                    <Bar dataKey="monto" name="Ventas" fill="#B3985B" radius={[4,4,0,0]} maxBarSize={36}>
                      {reporte.porMesHistorico.map((m) => (
                        <Cell key={m.mes} fill={m.mes === mes1 ? "#B3985B" : "rgba(179,152,91,0.3)"} />
                      ))}
                    </Bar>
                    <Bar dataKey="perdidos" name="Perdidos" fill="rgba(220,38,38,0.5)" radius={[4,4,0,0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top 5 clientes */}
              <div className="ms-card p-5">
                <h2 className="text-white font-semibold text-sm mb-4">Top clientes del mes</h2>
                {reporte.top5Clientes.length === 0 ? (
                  <p className="text-[#444] text-xs text-center py-8">Sin datos</p>
                ) : (
                  <div className="space-y-3">
                    {reporte.top5Clientes.map((c, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold w-4 text-center" style={{ color: i === 0 ? "#B3985B" : i === 1 ? "#9ca3af" : i === 2 ? "#b45309" : "#374151" }}>#{i+1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-[11px] font-medium truncate">{c.nombre}</p>
                            <p className="text-[#555] text-[9px] truncate">{c.empresa ?? ""} · {c.eventos} ev.</p>
                          </div>
                          <span className="text-[#B3985B] text-[11px] font-bold shrink-0">{fmt(c.monto)}</span>
                        </div>
                        <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden ml-6">
                          <div className="h-full rounded-full" style={{ width: `${pct(c.monto, reporte.top5Clientes[0]?.monto || 1)}%`, backgroundColor: i === 0 ? "#B3985B" : "#374151" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── SECCIÓN 3: Mix de negocio ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Tipo de evento */}
              <div className="ms-card p-5">
                <h2 className="text-white font-semibold text-sm mb-4">Tipo de evento</h2>
                {reporte.porTipoEvento.length === 0
                  ? <p className="text-[#444] text-xs text-center py-6">Sin datos</p>
                  : (
                  <div className="space-y-3">
                    {reporte.porTipoEvento.map((item, i) => (
                      <div key={item.tipo}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-gray-300 text-[11px] font-medium">{TIPO_EVENTO_LABEL[item.tipo] ?? item.tipo}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[#555] text-[10px]">{item.count} ev.</span>
                            <span className="text-[10px] font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{item.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], opacity: 0.8 }} />
                        </div>
                        <p className="text-[#444] text-[9px] mt-0.5">{fmt(item.monto)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mix servicios con donut */}
              <div className="ms-card p-5">
                <h2 className="text-white font-semibold text-sm mb-2">Mix de servicios</h2>
                {reporte.porTipoServicio.length === 0
                  ? <p className="text-[#444] text-xs text-center py-6">Sin datos</p>
                  : (
                  <>
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie data={reporte.porTipoServicio} cx="50%" cy="50%" innerRadius={35} outerRadius={55}
                          dataKey="monto" paddingAngle={3}>
                          {reporte.porTipoServicio.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const item = (payload[0].payload as TipoItem);
                          return (
                            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-2 text-[10px] shadow-xl">
                              <p className="text-white font-semibold">{TIPO_SERVICIO_LABEL[item.tipo] ?? item.tipo}</p>
                              <p className="text-[#888]">{item.count} eventos · {item.pct.toFixed(0)}%</p>
                              <p className="text-[#B3985B]">{fmt(item.monto)}</p>
                            </div>
                          );
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {reporte.porTipoServicio.map((item, i) => (
                        <div key={item.tipo} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-[#aaa] text-[11px]">{TIPO_SERVICIO_LABEL[item.tipo] ?? item.tipo}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white text-[11px] font-semibold">{item.pct.toFixed(0)}%</span>
                            <span className="text-[#555] text-[10px] ml-1.5">{fmt(item.monto)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Origen de leads — barras horizontales */}
              <div className="ms-card p-5">
                <h2 className="text-white font-semibold text-sm mb-4">Origen de leads</h2>
                {reporte.origenLeads.length === 0
                  ? <p className="text-[#444] text-xs text-center py-6">Sin datos</p>
                  : (
                  <div className="space-y-3">
                    {reporte.origenLeads.map((item, i) => (
                      <div key={item.origen}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-gray-300 text-[11px] font-medium">{ORIGEN_LABEL[item.origen] ?? item.origen}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[#555] text-[10px]">{item.count}</span>
                            <span className="text-[10px] font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{item.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], opacity: 0.8 }} />
                        </div>
                        <p className="text-[#444] text-[9px] mt-0.5">{fmt(item.monto)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── SECCIÓN 4: Funnel + Vendedores + Perdidos ────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Funnel de conversión */}
              <div className="ms-card p-5">
                <h2 className="text-white font-semibold text-sm mb-4">Embudo de conversión</h2>
                <div className="space-y-2">
                  {[
                    { label: "Cotizaciones creadas", value: reporte.cotizaciones.totalCreadas, color: "#4b5563", pctVal: 100 },
                    { label: "Ventas cerradas",      value: reporte.cotizaciones.ventasCerradas, color: "#B3985B",
                      pctVal: pct(reporte.cotizaciones.ventasCerradas, reporte.cotizaciones.totalCreadas) },
                    { label: "En seguimiento",        value: reporte.cotizaciones.enSeguimiento,  color: "#60a5fa",
                      pctVal: pct(reporte.cotizaciones.enSeguimiento, reporte.cotizaciones.totalCreadas) },
                    { label: "Perdidos",              value: reporte.tratosPerdidos.count, color: "#f87171",
                      pctVal: pct(reporte.tratosPerdidos.count, reporte.cotizaciones.totalCreadas) },
                  ].map((k, i) => (
                    <div key={k.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[#9ca3af] text-[11px]">{k.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{k.value}</span>
                          <span className="text-[10px]" style={{ color: k.color }}>{k.pctVal}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${k.pctVal}%`, backgroundColor: k.color, opacity: i === 0 ? 0.5 : 0.8 }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 mt-1 border-t border-[#1a1a1a] flex justify-between items-center">
                    <span className="text-[#555] text-[10px] uppercase tracking-wider">Conversión global</span>
                    <span className="text-[#B3985B] text-lg font-bold">{conversionPct}%</span>
                  </div>
                </div>
              </div>

              {/* Rendimiento por vendedor */}
              <div className="ms-card p-5">
                <h2 className="text-white font-semibold text-sm mb-4">Rendimiento por vendedor</h2>
                {reporte.porVendedor.length === 0
                  ? <p className="text-[#444] text-xs text-center py-6">Sin datos</p>
                  : (
                  <div className="space-y-3">
                    {reporte.porVendedor.map((v, i) => (
                      <div key={v.id}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-gray-300 text-[11px] font-medium truncate max-w-[100px]">{v.nombre}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[#555] text-[10px]">{v.eventos} ev.</span>
                            <span className="text-[#B3985B] text-[11px] font-bold">{fmt(v.monto)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${pct(v.monto, reporte.porVendedor[0]?.monto || 1)}%`,
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                            opacity: 0.8,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Análisis de pérdidas */}
              <div className="ms-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold text-sm">Motivos de pérdida</h2>
                  <span className="text-red-400 text-xl font-bold">{reporte.tratosPerdidos.count}</span>
                </div>
                {reporte.tratosPerdidos.count === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p className="text-green-400 text-xs font-medium">Sin pérdidas este mes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reporte.tratosPerdidos.motivosPerdida.slice(0, 5).map((m, i) => (
                      <div key={m.motivo}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[#9ca3af] text-[11px] truncate max-w-[130px]">{m.motivo}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white text-[11px] font-bold">{m.count}</span>
                            <span className="text-red-400 text-[10px]">{m.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-red-600/60" style={{ width: `${m.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── SECCIÓN 5: Clientes + Zonas ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Clientes nuevos vs recurrentes */}
              <div className="ms-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold text-sm">Nuevos vs recurrentes</h2>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Nuevos {reporte.clientesNuevos.count}</span>
                    <span className="flex items-center gap-1 text-[#B3985B]"><span className="w-2 h-2 rounded-full bg-[#B3985B] inline-block"/>Recurrentes {reporte.clientesRecurrentes.count}</span>
                  </div>
                </div>
                {/* Visual split */}
                <div className="flex gap-1.5 mb-4 h-3 rounded-full overflow-hidden">
                  {reporte.clientesNuevos.count + reporte.clientesRecurrentes.count > 0 ? (
                    <>
                      <div className="bg-blue-500/70 rounded-l-full" style={{ flex: reporte.clientesNuevos.count }} />
                      <div className="bg-[#B3985B]/70 rounded-r-full" style={{ flex: reporte.clientesRecurrentes.count }} />
                    </>
                  ) : <div className="flex-1 bg-[#1a1a1a] rounded-full" />}
                </div>
                {reporte.clientesNuevos.lista.length > 0 && (
                  <>
                    <p className="text-[#555] text-[10px] uppercase tracking-wider mb-2">Clientes que llegaron por primera vez</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {reporte.clientesNuevos.lista.slice(0, 8).map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg px-2 py-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white text-[10px] font-medium truncate">{c.nombre}</p>
                            {c.empresa && <p className="text-[#444] text-[9px] truncate">{c.empresa}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Zonas */}
              {reporte.porZona.length > 0 ? (
                <div className="ms-card p-5">
                  <h2 className="text-white font-semibold text-sm mb-4">Distribución por zona</h2>
                  <div className="space-y-3">
                    {reporte.porZona.map((z, i) => (
                      <div key={z.zona}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[#ccc] text-[11px] font-medium">{z.zona}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[#555] text-[10px]">{z.count} ev.</span>
                            <span className="text-[11px] font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{z.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${z.pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], opacity: 0.8 }} />
                        </div>
                        <p className="text-[#444] text-[9px] mt-0.5">{fmt(z.monto)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="ms-card p-5">
                  <h2 className="text-white font-semibold text-sm mb-4">Cotizaciones → Proyectos</h2>
                  <div className="space-y-4">
                    {[
                      { label: "Cotizaciones enviadas", value: reporte.cotizaciones.totalCreadas, color: "#4b5563", pctVal: 100 },
                      { label: "Ventas cerradas", value: reporte.cotizaciones.ventasCerradas, color: "#B3985B", pctVal: pct(reporte.cotizaciones.ventasCerradas, reporte.cotizaciones.totalCreadas) },
                      { label: "En seguimiento", value: reporte.cotizaciones.enSeguimiento, color: "#60a5fa", pctVal: pct(reporte.cotizaciones.enSeguimiento, reporte.cotizaciones.totalCreadas) },
                    ].map(k => (
                      <div key={k.label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400 text-[11px]">{k.label}</span>
                          <span className="text-white font-bold text-sm">{k.value}</span>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full opacity-80" style={{ width: `${k.pctVal}%`, backgroundColor: k.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── SECCIÓN 6: Análisis + PDF ── */}
            <ReporteAnalisisSection
              analisis={analisis1}    onAnalisis={v => { setAnalisis1(v); try { localStorage.setItem(`ventas-reporte-${mes1}-analisis`, v); } catch{} }}
              propuesta1={propuesta1_1} onPropuesta1={v => { setPropuesta1_1(v); try { localStorage.setItem(`ventas-reporte-${mes1}-propuesta1`, v); } catch{} }}
              propuesta2={propuesta2_1} onPropuesta2={v => { setPropuesta2_1(v); try { localStorage.setItem(`ventas-reporte-${mes1}-propuesta2`, v); } catch{} }}
              propuesta3={propuesta3_1} onPropuesta3={v => { setPropuesta3_1(v); try { localStorage.setItem(`ventas-reporte-${mes1}-propuesta3`, v); } catch{} }}
              comentarios={comentarios1} onComentarios={v => { setComentarios1(v); try { localStorage.setItem(`ventas-reporte-${mes1}-comentarios`, v); } catch{} }}
              footer={
                <>
                  <p className="text-[#333] text-[10px]">Las notas se guardan automáticamente en este dispositivo</p>
                  <button onClick={descargarPdf1} disabled={loadingPdf1} id="btn-pdf-mensual"
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors">
                    {loadingPdf1
                      ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 15V3M7 10l5 5 5-5M20 21H4"/></svg>
                    }
                    {loadingPdf1 ? 'Generando…' : 'Descargar PDF'}
                  </button>
                </>
              }
            />
          </>
        )
      )}


      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — COMISIONES POR VENDEDOR
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "comisiones" && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} id="select-vendedor"
                className="bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]/40 min-w-44">
                <option value="">Seleccionar vendedor...</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}
            <div className="flex items-center gap-1.5 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-1.5">
              <input type="month" value={mes2} onChange={e => setMes2(e.target.value)}
                className="bg-transparent text-white text-xs focus:outline-none" />
            </div>
          </div>

          {loadingVendedor ? (
            <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
          ) : !reporteVendedor ? (
            <div className="py-12 text-center text-gray-700 text-sm">{isAdmin ? "Selecciona un vendedor" : "Cargando..."}</div>
          ) : (
            <>
              {/* Header vendedor */}
              <div className="flex items-center justify-between ms-card px-5 py-4">
                <div>
                  <p className="text-white font-semibold">{reporteVendedor.vendedor.name}</p>
                  <p className="text-[#6b7280] text-xs mt-0.5">Mes #{reporteVendedor.mesTrabajo} · Meta: {fmt(reporteVendedor.piso)}</p>
                </div>
                {reporteVendedor.resumen.alcanzaPiso && (
                  <div className="bg-green-900/30 border border-green-800/40 rounded-lg px-3 py-2 text-center">
                    <p className="text-green-400 text-[10px] font-bold">✓ META ALCANZADA</p>
                    <p className="text-green-400/60 text-[10px]">Bono: {fmt(reporteVendedor.resumen.montoBono)}</p>
                  </div>
                )}
              </div>

              {/* KPI cards vendedor */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Cotizaciones",      value: String(reporteVendedor.totalCotizaciones), color: "text-white" },
                  { label: "Eventos cerrados",  value: String(reporteVendedor.detalles.length),  color: "text-white",
                    sub: `${reporteVendedor.totalCotizaciones > 0 ? ((reporteVendedor.detalles.length / reporteVendedor.totalCotizaciones) * 100).toFixed(0) : 0}% conv.` },
                  { label: "Base liquidada",    value: fmt(reporteVendedor.resumen.baseLiquidada), color: "text-[#B3985B]" },
                  { label: "Comisión generada", value: fmt(reporteVendedor.resumen.totalComisiones), color: "text-green-400" },
                  { label: "Total a pagar",     value: fmt(reporteVendedor.resumen.totalAPagar), color: "text-[#B3985B]",
                    sub: reporteVendedor.resumen.alcanzaPiso ? `+ bono ${reporteVendedor.config.pctBono}%` : undefined },
                ].map(k => (
                  <div key={k.label} className="ms-stat-card">
                    <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                    {k.sub && <p className="text-gray-700 text-[10px] mt-0.5">{k.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Tabla de eventos */}
              <div className="ms-table-wrapper">
                <div className="px-5 py-3.5 border-b border-[#1a1a1a] flex items-center justify-between">
                  <h2 className="text-white font-semibold text-sm">Detalle de eventos</h2>
                  <p className="text-gray-600 text-xs">{reporteVendedor.detalles.length} eventos</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        {["Evento / Cliente","Cierre","Origen","Total","Base","% / Comisión","Estado","Vendedor"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reporteVendedor.detalles.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-[#444]">Sin eventos cerrados</td></tr>
                      ) : reporteVendedor.detalles.map((d, i) => {
                        const estadoCfg = ESTADO_CONFIG[d.estadoPago] ?? ESTADO_CONFIG.PENDIENTE;
                        return (
                          <tr key={d.tratoId} className={`border-b border-[#111] ${i % 2 === 0 ? "" : "bg-[#0d0d0d]"} hover:bg-[#161616] transition-colors`}>
                            <td className="px-4 py-3">
                              <p className="text-white font-medium">{d.nombreEvento ?? "Sin nombre"}</p>
                              <p className="text-[#6b7280] text-[10px] mt-0.5">{d.cliente.nombre}{d.cliente.empresa ? ` · ${d.cliente.empresa}` : ""}</p>
                            </td>
                            <td className="px-4 py-3 text-[#9ca3af] whitespace-nowrap">{fmtDate(d.fechaCierre)}</td>
                            <td className="px-4 py-3 text-[#9ca3af]">{ORIGEN_VENTA_LABEL[d.origenVenta] ?? d.origenVenta}</td>
                            <td className="px-4 py-3 text-[#B3985B] font-semibold">{fmt(d.granTotal)}</td>
                            <td className="px-4 py-3 text-[#9ca3af]">{fmt(d.baseCalculo)}</td>
                            <td className="px-4 py-3">
                              <p className="text-[#9ca3af]">{d.pctComision}%</p>
                              <p className="text-[#B3985B] font-bold mt-0.5">{d.montoComision > 0 ? fmt(d.montoComision) : "—"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] px-2 py-1 rounded-md font-medium ${estadoCfg.cls}`}>{estadoCfg.label}</span>
                            </td>
                            <td className="px-4 py-3">
                              {d.esDelegado ? (
                                <div>
                                  <span className="text-[10px] px-2 py-1 rounded-md font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-800/30">Delegado ⚠</span>
                                  {d.cotizadorNombre && <p className="text-[#444] text-[10px] mt-1">Cotizó: {d.cotizadorNombre}</p>}
                                  {isAdmin && (
                                    <select defaultValue="" className="mt-1 bg-[#0a0a0a] border border-[#222] rounded text-[10px] text-white px-1 py-0.5 focus:outline-none"
                                      onChange={e => { if (e.target.value) corregirVendedor(d.tratoId, e.target.value); }}>
                                      <option value="">Corregir...</option>
                                      {vendedores.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] px-2 py-1 rounded-md font-medium bg-green-900/30 text-green-400 border border-green-800/30">Vendedor ✓</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumen pago + Registrar pago */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="ms-card p-5 border-l-2 border-l-[#B3985B]">
                  <h2 className="text-white font-semibold text-sm mb-4">Resumen de pago</h2>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Comisión base</span><span className="text-white font-medium">{fmt(reporteVendedor.resumen.totalComisiones)}</span></div>
                    {reporteVendedor.resumen.alcanzaPiso && (
                      <div className="flex justify-between text-xs"><span className="text-gray-500">Bono meta ({reporteVendedor.config.pctBono}%)</span><span className="text-green-400 font-medium">+ {fmt(reporteVendedor.resumen.montoBono)}</span></div>
                    )}
                    <div className="border-t border-[#1a1a1a] pt-2.5 flex justify-between">
                      <span className="text-white text-xs font-semibold">Total a pagar</span>
                      <span className="text-[#B3985B] text-base font-bold">{fmt(reporteVendedor.resumen.totalAPagar)}</span>
                    </div>
                    {reporteVendedor.comisionPendiente > 0 && (
                      <div className="flex justify-between text-xs pt-1 border-t border-[#1a1a1a]">
                        <span className="text-yellow-400/80">Pendiente por liquidar</span>
                        <span className="text-yellow-400 font-medium">{fmt(reporteVendedor.comisionPendiente)}</span>
                      </div>
                    )}
                    {reporteVendedor.pagosRegistrados?.length > 0 && (
                      <div className="pt-3 border-t border-[#1a1a1a]">
                        <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-2">Pagos registrados</p>
                        {reporteVendedor.pagosRegistrados.map(p => (
                          <div key={p.id} className="flex justify-between items-center mb-1.5">
                            <div>
                              <p className="text-green-400 text-xs font-medium">{fmt(p.montoTotal)}</p>
                              {p.notas && <p className="text-[#444] text-[10px]">{p.notas}</p>}
                            </div>
                            <p className="text-[#444] text-[10px]">{fmtDate(p.pagadoEn)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="ms-card p-5">
                    <h2 className="text-white font-semibold text-sm mb-4">Registrar pago</h2>
                    <div className="space-y-3">
                      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-3">
                        <p className="text-[#6b7280] text-[10px] mb-0.5">Monto a registrar</p>
                        <p className="text-[#B3985B] text-xl font-bold">{fmt(reporteVendedor.resumen.totalAPagar)}</p>
                      </div>
                      <input value={notasPago} onChange={e => setNotasPago(e.target.value)} placeholder="Notas del pago (opcional)"
                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/40" />
                      <button onClick={registrarPago} disabled={registrandoPago || reporteVendedor.resumen.totalAPagar === 0} id="btn-registrar-pago"
                        className="w-full bg-green-900 hover:bg-green-800 disabled:opacity-40 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors">
                        {registrandoPago ? "Registrando..." : "Marcar como pagado"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Análisis + PDF */}
              <ReporteAnalisisSection
                analisis={analisis2}    onAnalisis={v => { setAnalisis2(v); try { localStorage.setItem(`ventas-comisiones-${mes2}-analisis`, v); } catch{} }}
                propuesta1={propuesta1_2} onPropuesta1={v => { setPropuesta1_2(v); try { localStorage.setItem(`ventas-comisiones-${mes2}-propuesta1`, v); } catch{} }}
                propuesta2={propuesta2_2} onPropuesta2={v => { setPropuesta2_2(v); try { localStorage.setItem(`ventas-comisiones-${mes2}-propuesta2`, v); } catch{} }}
                propuesta3={propuesta3_2} onPropuesta3={v => { setPropuesta3_2(v); try { localStorage.setItem(`ventas-comisiones-${mes2}-propuesta3`, v); } catch{} }}
                comentarios={comentarios2} onComentarios={v => { setComentarios2(v); try { localStorage.setItem(`ventas-comisiones-${mes2}-comentarios`, v); } catch{} }}
                footer={
                  <>
                    <p className="text-[#333] text-[10px]">Las notas se guardan automáticamente en este dispositivo</p>
                    <button onClick={descargarPdf2} disabled={loadingPdf2} id="btn-pdf-vendedor"
                      className="flex items-center gap-2 px-4 py-1.5 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors">
                      {loadingPdf2
                        ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 15V3M7 10l5 5 5-5M20 21H4"/></svg>
                      }
                      {loadingPdf2 ? 'Generando…' : 'Descargar PDF'}
                    </button>
                  </>
                }
              />
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL REPORTE EJECUTIVO
      ══════════════════════════════════════════════════════════════════════ */}
      {showEjecutivo && reporte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <div>
                <h2 className="text-white font-semibold text-base">Reporte ejecutivo</h2>
                <p className="text-[#555] text-xs mt-0.5">{reporte.periodo.label}</p>
              </div>
              <button onClick={() => setShowEjecutivo(false)} className="text-[#444] hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(179,152,91,0.3) transparent" }}>
              {/* Headline */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Ventas generadas", value: fmt(reporte.ventasTotal.monto), sub: `${reporte.ventasTotal.count} eventos` },
                  { label: "Ticket promedio",  value: fmt(reporte.ticketPromedio),    sub: "por evento" },
                  { label: "Conversión",        value: `${conversionPct}%`,           sub: "cotiz. → cierre" },
                ].map(k => (
                  <div key={k.label} className="bg-[#151515] border border-[#1e1e1e] rounded-xl p-3 text-center">
                    <p className="text-white text-xl font-bold">{k.value}</p>
                    <p className="text-[#B3985B] text-[9px] font-semibold uppercase tracking-wider mt-0.5">{k.label}</p>
                    <p className="text-[#444] text-[9px] mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>
              {/* Servicio split */}
              <div className="bg-[#151515] border border-[#1e1e1e] rounded-xl p-4">
                <p className="text-[#555] text-[10px] font-semibold uppercase tracking-wider mb-3">Mix de servicios</p>
                <div className="flex gap-4">
                  {[
                    { label: "Renta",       val: reporte.porServicio.rentas,    color: "#B3985B" },
                    { label: "Producción",  val: reporte.porServicio.produccion,color: "#60a5fa" },
                    ...(reporte.porServicio.otro.count > 0 ? [{ label: "Otro", val: reporte.porServicio.otro, color: "#6b7280" }] : []),
                  ].map(s => (
                    <div key={s.label} className="flex-1 text-center">
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.val.pct.toFixed(0)}%</p>
                      <p className="text-[#555] text-[10px]">{s.label}</p>
                      <p className="text-[#333] text-[9px]">{s.val.count} ev.</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Top origen */}
              {reporte.origenLeads[0] && (
                <div className="flex items-center justify-between bg-[#151515] border border-[#1e1e1e] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-[#555] text-[10px] uppercase tracking-wider">Origen #1</p>
                    <p className="text-white font-semibold mt-0.5">{ORIGEN_LABEL[reporte.origenLeads[0].origen] ?? reporte.origenLeads[0].origen}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#B3985B] text-xl font-bold">{reporte.origenLeads[0].count}</p>
                    <p className="text-[#444] text-[9px]">{reporte.origenLeads[0].pct.toFixed(0)}% de ventas</p>
                  </div>
                </div>
              )}
              {/* Top cliente */}
              {reporte.top3Clientes[0] && (
                <div className="flex items-center justify-between bg-[#151515] border border-[#1e1e1e] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-[#555] text-[10px] uppercase tracking-wider">Cliente del mes</p>
                    <p className="text-white font-semibold mt-0.5">{reporte.top3Clientes[0].nombre}</p>
                    {reporte.top3Clientes[0].empresa && <p className="text-[#555] text-[10px]">{reporte.top3Clientes[0].empresa}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[#B3985B] text-xl font-bold">{fmt(reporte.top3Clientes[0].monto)}</p>
                    <p className="text-[#444] text-[9px]">{reporte.top3Clientes[0].eventos} eventos</p>
                  </div>
                </div>
              )}
              <p className="text-[#333] text-[10px] text-center">Generado el {new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
