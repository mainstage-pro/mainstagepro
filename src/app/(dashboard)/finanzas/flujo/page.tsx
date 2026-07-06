"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CxItem = {
  id: string;
  concepto: string;
  cliente?: string;
  acreedor?: string;
  tipoAcreedor?: string;
  proyecto: string | null;
  monto: number;
  montoCobrado?: number;
  montoPagado?: number;
  saldoPendiente: number;
  estado: string;
  fechaCompromiso: string;
  tipoPago?: string;
};

type MovDetalle = {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  metodoPago: string;
  categoria: string;
  cuenta: string | null;
};

type OrfanoIngreso = { monto: number; concepto: string; cliente: string; fecha: string };
type OrfanoGasto   = { monto: number; concepto: string; tipo?: string; nombre?: string; fecha: string; proyecto?: string | null };

type FlujoData = {
  periodo: string;
  ingresos: {
    total: number;
    conciliado: number;
    orphan: number;
    porCategoria: { nombre: string; total: number; count: number }[];
    detalle: MovDetalle[];
    abonosOrfanos: OrfanoIngreso[];
  };
  gastos: {
    total: number;
    conciliado: number;
    orphan: number;
    porCategoria: { nombre: string; total: number; count: number }[];
    detalle: MovDetalle[];
    abonosPagoOrfanos: OrfanoGasto[];
    nominaOrfana: OrfanoGasto[];
    gastosEventoOrfanos: OrfanoGasto[];
  };
  cuentasPorCobrar: { total: number; count: number; detalle: CxItem[] };
  cuentasPorPagar:  { total: number; count: number; detalle: CxItem[] };
  flujoNeto: number;
  flujoNetoProyectado: number;
  tieneOrfanos: boolean;
  orphanCount: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtFecha(iso: string | Date) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
}
function fmtFechaCorta(iso: string | Date) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });
}
function getMeses() {
  const meses = [];
  const hoy = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    meses.push({ val, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return meses;
}

const MESES = getMeses();

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "text-yellow-400 bg-yellow-900/20 border-yellow-800/30",
  PARCIAL:   "text-blue-400 bg-blue-900/20 border-blue-800/30",
  VENCIDO:   "text-red-400 bg-red-900/20 border-red-800/30",
  LIQUIDADO: "text-green-400 bg-green-900/20 border-green-800/30",
};

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color = "text-white" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-4">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

// Grupo de categoría con estado de cuenta expandible
function CategoriaGroup({
  nombre,
  total,
  count,
  movimientos,
  color,
  bgAccent,
  borderAccent,
}: {
  nombre: string;
  total: number;
  count: number;
  movimientos: MovDetalle[];
  color: string;
  bgAccent: string;
  borderAccent: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`border ${borderAccent} rounded-xl overflow-hidden`}>
      {/* Header de la categoría — siempre visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 ${bgAccent} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-lg transition-transform duration-200 ${open ? "rotate-90" : ""}`}>›</span>
          <div className="text-left min-w-0">
            <p className={`text-sm font-semibold ${color} truncate`}>{nombre}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{count} movimiento{count !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <span className={`text-base font-bold tabular-nums shrink-0 ${color}`}>{fmt(total)}</span>
      </button>

      {/* Estado de cuenta — movimientos individuales */}
      {open && (
        <div className="bg-[#0d0d0d]">
          {/* Encabezado de tabla */}
          <div className="grid grid-cols-[80px_1fr_auto] gap-2 px-4 py-2 border-b border-[#1a1a1a]">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Fecha</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Concepto · Cuenta</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider text-right">Importe</span>
          </div>
          {movimientos.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">Sin movimientos</p>
          ) : (
            movimientos.map(m => (
              <div key={m.id} className="grid grid-cols-[80px_1fr_auto] gap-2 px-4 py-2.5 border-b border-[#161616] last:border-0 hover:bg-[#111] transition-colors">
                <span className="text-[11px] text-gray-500 tabular-nums">{fmtFechaCorta(m.fecha)}</span>
                <div className="min-w-0">
                  <p className="text-xs text-white truncate">{m.concepto}</p>
                  {m.cuenta && <p className="text-[10px] text-gray-600 truncate">{m.cuenta} · {m.metodoPago}</p>}
                </div>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${color}`}>{fmt(m.monto)}</span>
              </div>
            ))
          )}
          {/* Subtotal de categoría */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#1e1e1e] bg-[#111]">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Subtotal {nombre}</span>
            <span className={`text-sm font-bold tabular-nums ${color}`}>{fmt(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Fila de CxC/CxP — sin truncar
function CxRow({ item, tipo }: { item: CxItem; tipo: "cobrar" | "pagar" }) {
  const color  = tipo === "cobrar" ? "text-emerald-400" : "text-red-400";
  const nombre = tipo === "cobrar" ? item.cliente : item.acreedor;
  const estadoCls = ESTADO_COLOR[item.estado] ?? "text-gray-500 bg-gray-900/20 border-gray-800/30";
  return (
    <div className="px-4 py-3.5 border-b border-[#161616] last:border-0 hover:bg-[#141414] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">{item.concepto}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {nombre && <p className="text-xs text-gray-500">{nombre}</p>}
            {item.tipoAcreedor && <p className="text-[10px] text-gray-600 uppercase">{item.tipoAcreedor}</p>}
            {item.proyecto && <p className="text-[10px] text-gray-600">{item.proyecto}</p>}
            {item.tipoPago && <p className="text-[10px] text-gray-600">{item.tipoPago}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold tabular-nums ${color}`}>{fmt(item.saldoPendiente)}</p>
          {item.monto !== item.saldoPendiente && (
            <p className="text-[10px] text-gray-600 mt-0.5">Total: {fmt(item.monto)}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${estadoCls}`}>{item.estado}</span>
        <span className="text-[11px] text-gray-500">📅 {fmtFecha(item.fechaCompromiso)}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FlujoPage() {
  const [mes, setMes] = useState(MESES[1]?.val ?? MESES[0].val);
  const [data, setData] = useState<FlujoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"realizados" | "cxc" | "cxp">("realizados");

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/finanzas/flujo-efectivo?mes=${m}`);
      const d = await r.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(mes); }, [mes, load]);

  const mesLabel = MESES.find(m => m.val === mes)?.label ?? mes;

  // Movimientos sin categoría (separados)
  const ingresosSinCat = data?.ingresos.detalle.filter(m => m.categoria === "Sin categoría") ?? [];
  const gastosSinCat   = data?.gastos.detalle.filter(m => m.categoria === "Sin categoría") ?? [];
  const totalIngresosSinCat = ingresosSinCat.reduce((s, m) => s + m.monto, 0);
  const totalGastosSinCat   = gastosSinCat.reduce((s, m) => s + m.monto, 0);

  // Movimientos agrupados por categoría (excluye sin categoría)
  function buildCatGroups(detalle: MovDetalle[], porCategoria: { nombre: string; total: number; count: number }[]) {
    return porCategoria
      .filter(c => c.nombre !== "Sin categoría")
      .map(cat => ({
        ...cat,
        movimientos: detalle.filter(m => m.categoria === cat.nombre),
      }));
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">Flujo de Efectivo</h1>
            <p className="text-xs text-gray-500 mt-0.5">Movimientos realizados + compromisos del período</p>
          </div>
          <select
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C]/50"
          >
            {MESES.map(m => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="px-6 py-6 space-y-6">

          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Entradas realizadas" value={fmt(data.ingresos.total)} color="text-emerald-400" sub={mesLabel} />
            <MetricCard label="Salidas realizadas"  value={fmt(data.gastos.total)}   color="text-red-400"     sub={mesLabel} />
            <MetricCard
              label="Flujo neto real"
              value={fmt(data.flujoNeto)}
              color={data.flujoNeto >= 0 ? "text-white" : "text-red-400"}
              sub="Solo movimientos realizados"
            />
            <MetricCard
              label="Flujo neto proyectado"
              value={fmt(data.flujoNetoProyectado)}
              color={data.flujoNetoProyectado >= 0 ? "text-[#C9A84C]" : "text-red-400"}
              sub="Incl. compromisos pendientes"
            />
          </div>

          {/* CxC / CxP summary bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0d1a12] border border-emerald-900/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Por cobrar este mes</p>
                <p className="text-xl font-bold text-emerald-400 tabular-nums mt-0.5">{fmt(data.cuentasPorCobrar.total)}</p>
              </div>
              <span className="text-2xl font-bold text-emerald-900">{data.cuentasPorCobrar.count}</span>
            </div>
            <div className="bg-[#1a0d0d] border border-red-900/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-red-600 uppercase tracking-wider">Por pagar este mes</p>
                <p className="text-xl font-bold text-red-400 tabular-nums mt-0.5">{fmt(data.cuentasPorPagar.total)}</p>
              </div>
              <span className="text-2xl font-bold text-red-900">{data.cuentasPorPagar.count}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-1 w-fit">
            {(["realizados", "cxc", "cxp"] as const).map(t => {
              const labels = {
                realizados: "Movimientos realizados",
                cxc: `Por cobrar (${data.cuentasPorCobrar.count})`,
                cxp: `Por pagar (${data.cuentasPorPagar.count})`,
              };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    tab === t ? "bg-[#1e1e1e] text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>

          {/* ─── Tab: Movimientos realizados ─── */}
          {tab === "realizados" && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">

                {/* ── ENTRADAS por categoría ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">↑ Entradas</h3>
                    <span className="text-base font-bold tabular-nums text-emerald-400">{fmt(data.ingresos.total)}</span>
                  </div>

                  {buildCatGroups(data.ingresos.detalle, data.ingresos.porCategoria).map(cat => (
                    <CategoriaGroup
                      key={cat.nombre}
                      nombre={cat.nombre}
                      total={cat.total}
                      count={cat.count}
                      movimientos={cat.movimientos}
                      color="text-emerald-400"
                      bgAccent="bg-emerald-900/10"
                      borderAccent="border-emerald-900/20"
                    />
                  ))}

                  {/* Abonos huérfanos */}
                  {data.ingresos.abonosOrfanos.length > 0 && (
                    <div className="border border-yellow-900/30 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-yellow-900/10">
                        <div>
                          <p className="text-sm font-semibold text-yellow-400">⚠ Sin conciliar</p>
                          <p className="text-[10px] text-gray-500">{data.ingresos.abonosOrfanos.length} abono(s) CxC sin movimiento</p>
                        </div>
                        <span className="text-base font-bold tabular-nums text-yellow-400">
                          {fmt(data.ingresos.abonosOrfanos.reduce((s, a) => s + a.monto, 0))}
                        </span>
                      </div>
                      {data.ingresos.abonosOrfanos.map((a, i) => (
                        <div key={i} className="grid grid-cols-[80px_1fr_auto] gap-2 px-4 py-2.5 border-b border-[#161616] last:border-0 bg-[#0d0d0d]">
                          <span className="text-[11px] text-gray-500">{fmtFechaCorta(a.fecha)}</span>
                          <div>
                            <p className="text-xs text-white">{a.concepto}</p>
                            <p className="text-[10px] text-gray-600">{a.cliente}</p>
                          </div>
                          <span className="text-sm font-semibold text-emerald-400 tabular-nums">{fmt(a.monto)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── SALIDAS por categoría ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">↓ Salidas</h3>
                    <span className="text-base font-bold tabular-nums text-red-400">{fmt(data.gastos.total)}</span>
                  </div>

                  {buildCatGroups(data.gastos.detalle, data.gastos.porCategoria).map(cat => (
                    <CategoriaGroup
                      key={cat.nombre}
                      nombre={cat.nombre}
                      total={cat.total}
                      count={cat.count}
                      movimientos={cat.movimientos}
                      color="text-red-400"
                      bgAccent="bg-red-900/10"
                      borderAccent="border-red-900/20"
                    />
                  ))}

                  {/* Gastos huérfanos (abonos CxP, nómina, eventos sin conciliar) */}
                  {(data.gastos.abonosPagoOrfanos.length > 0 || data.gastos.nominaOrfana.length > 0 || data.gastos.gastosEventoOrfanos.length > 0) && (
                    <div className="border border-yellow-900/30 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-yellow-900/10">
                        <div>
                          <p className="text-sm font-semibold text-yellow-400">⚠ Sin conciliar</p>
                          <p className="text-[10px] text-gray-500">
                            {data.gastos.abonosPagoOrfanos.length + data.gastos.nominaOrfana.length + data.gastos.gastosEventoOrfanos.length} pago(s) sin movimiento
                          </p>
                        </div>
                        <span className="text-base font-bold tabular-nums text-yellow-400">
                          {fmt(data.gastos.abonosPagoOrfanos.reduce((s, a) => s + a.monto, 0) +
                               data.gastos.nominaOrfana.reduce((s, p) => s + p.monto, 0) +
                               data.gastos.gastosEventoOrfanos.reduce((s, g) => s + g.monto, 0))}
                        </span>
                      </div>
                      {[
                        ...data.gastos.abonosPagoOrfanos.map(a => ({ fecha: a.fecha, concepto: a.concepto, sub: a.tipo ?? "CxP", monto: a.monto })),
                        ...data.gastos.nominaOrfana.map(p => ({ fecha: p.fecha, concepto: `Nómina · ${p.nombre}`, sub: "Nómina", monto: p.monto })),
                        ...data.gastos.gastosEventoOrfanos.map(g => ({ fecha: g.fecha, concepto: g.concepto, sub: g.proyecto ?? "Gasto evento", monto: g.monto })),
                      ].map((row, i) => (
                        <div key={i} className="grid grid-cols-[80px_1fr_auto] gap-2 px-4 py-2.5 border-b border-[#161616] last:border-0 bg-[#0d0d0d]">
                          <span className="text-[11px] text-gray-500">{row.fecha ? fmtFechaCorta(row.fecha) : "—"}</span>
                          <div>
                            <p className="text-xs text-white">{row.concepto}</p>
                            <p className="text-[10px] text-gray-600">{row.sub}</p>
                          </div>
                          <span className="text-sm font-semibold text-red-400 tabular-nums">{fmt(row.monto)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Sección: Movimientos SIN CATEGORÍA ─── */}
              {(ingresosSinCat.length > 0 || gastosSinCat.length > 0) && (
                <div className="bg-[#0f0e08] border border-yellow-800/40 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-yellow-800/30 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-yellow-400">⚠ Movimientos sin categorizar</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Estos movimientos no tienen categoría asignada y no aparecen en los grupos anteriores.
                        Se recomienda categorizarlos para que el reporte refleje el flujo real.
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {ingresosSinCat.length > 0 && <p className="text-xs text-emerald-400">+{fmt(totalIngresosSinCat)}</p>}
                      {gastosSinCat.length > 0 && <p className="text-xs text-red-400">-{fmt(totalGastosSinCat)}</p>}
                    </div>
                  </div>

                  <div className="divide-y divide-[#1a1a1a]">
                    {ingresosSinCat.map(m => (
                      <div key={m.id} className="grid grid-cols-[90px_auto_1fr_auto] gap-3 px-5 py-3 hover:bg-[#111] transition-colors">
                        <span className="text-[11px] text-gray-500 tabular-nums">{fmtFechaCorta(m.fecha)}</span>
                        <span className="text-[10px] bg-emerald-900/30 text-emerald-500 border border-emerald-800/30 px-1.5 py-0.5 rounded self-start">INGRESO</span>
                        <div className="min-w-0">
                          <p className="text-xs text-white">{m.concepto}</p>
                          {m.cuenta && <p className="text-[10px] text-gray-600">{m.cuenta} · {m.metodoPago}</p>}
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-emerald-400">{fmt(m.monto)}</span>
                      </div>
                    ))}
                    {gastosSinCat.map(m => (
                      <div key={m.id} className="grid grid-cols-[90px_auto_1fr_auto] gap-3 px-5 py-3 hover:bg-[#111] transition-colors">
                        <span className="text-[11px] text-gray-500 tabular-nums">{fmtFechaCorta(m.fecha)}</span>
                        <span className="text-[10px] bg-red-900/30 text-red-500 border border-red-800/30 px-1.5 py-0.5 rounded self-start">GASTO</span>
                        <div className="min-w-0">
                          <p className="text-xs text-white">{m.concepto}</p>
                          {m.cuenta && <p className="text-[10px] text-gray-600">{m.cuenta} · {m.metodoPago}</p>}
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-red-400">{fmt(m.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Tab: CxC ─── */}
          {tab === "cxc" && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1a1a1a]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Cuentas por cobrar — compromisos del período</h3>
                  <span className="text-base font-bold tabular-nums text-emerald-400">{fmt(data.cuentasPorCobrar.total)}</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  CxC con fecha compromiso en {mesLabel} aún pendientes de cobro.
                </p>
              </div>
              {data.cuentasPorCobrar.detalle.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-8">Sin cuentas por cobrar pendientes en este período</p>
              ) : (
                <div>
                  {data.cuentasPorCobrar.detalle.map(c => (
                    <CxRow key={c.id} item={c} tipo="cobrar" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Tab: CxP ─── */}
          {tab === "cxp" && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1a1a1a]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Compromisos de pago — estructurales del período</h3>
                  <span className="text-base font-bold tabular-nums text-red-400">{fmt(data.cuentasPorPagar.total)}</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  CxP con fecha compromiso en {mesLabel} aún pendientes de pago. Fechas y saldos reales.
                </p>
              </div>
              {data.cuentasPorPagar.detalle.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-8">Sin compromisos de pago pendientes en este período</p>
              ) : (
                <div>
                  {data.cuentasPorPagar.detalle.map(c => (
                    <CxRow key={c.id} item={c} tipo="pagar" />
                  ))}
                  {/* Total */}
                  <div className="flex items-center justify-between px-5 py-3 bg-[#0d0d0d] border-t border-[#1e1e1e]">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Total compromisos</span>
                    <span className="text-base font-bold text-red-400 tabular-nums">{fmt(data.cuentasPorPagar.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        <p className="text-gray-600 text-sm text-center py-12">Error cargando datos</p>
      )}
    </div>
  );
}
