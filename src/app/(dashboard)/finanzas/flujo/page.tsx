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
function fmtFecha(iso: string) {
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
  PENDIENTE: "text-yellow-400",
  PARCIAL:   "text-blue-400",
  VENCIDO:   "text-red-400",
  LIQUIDADO: "text-green-400",
};

// ─── Subcomponentes ──────────────────────────────────────────────────────────

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

function SectionHeader({ title, total, color }: { title: string; total: number; color: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title}</h3>
      <span className={`text-base font-bold tabular-nums ${color}`}>{fmt(total)}</span>
    </div>
  );
}

function MovRow({ fecha, concepto, categoria, monto, cuenta, color }: {
  fecha: string; concepto: string; categoria: string; monto: number; cuenta: string | null; color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-[#161616] last:border-0 hover:bg-[#141414] transition-colors">
      <div className="w-14 text-[10px] text-gray-600 shrink-0">{fmtFecha(fecha)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate">{concepto}</p>
        <p className="text-[10px] text-gray-600 truncate">{categoria}{cuenta ? ` · ${cuenta}` : ""}</p>
      </div>
      <span className={`text-sm font-semibold tabular-nums shrink-0 ${color}`}>{fmt(monto)}</span>
    </div>
  );
}

function CxRow({ item, tipo }: { item: CxItem; tipo: "cobrar" | "pagar" }) {
  const color  = tipo === "cobrar" ? "text-emerald-400" : "text-red-400";
  const nombre = tipo === "cobrar" ? item.cliente : item.acreedor;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[#161616] last:border-0 hover:bg-[#141414] transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate">{item.concepto}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {nombre && <p className="text-[10px] text-gray-500 truncate">{nombre}</p>}
          {item.proyecto && <p className="text-[10px] text-gray-600 truncate">{item.proyecto}</p>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-semibold tabular-nums ${color}`}>{fmt(item.saldoPendiente)}</p>
        <div className="flex items-center gap-1.5 justify-end mt-0.5">
          <span className={`text-[9px] font-medium ${ESTADO_COLOR[item.estado] ?? "text-gray-500"}`}>{item.estado}</span>
          <span className="text-[9px] text-gray-600">{fmtFecha(item.fechaCompromiso)}</span>
        </div>
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
            <MetricCard
              label="Entradas realizadas"
              value={fmt(data.ingresos.total)}
              color="text-emerald-400"
              sub={`${mesLabel}`}
            />
            <MetricCard
              label="Salidas realizadas"
              value={fmt(data.gastos.total)}
              color="text-red-400"
              sub={`${mesLabel}`}
            />
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
              const labels = { realizados: "Movimientos realizados", cxc: `Por cobrar (${data.cuentasPorCobrar.count})`, cxp: `Por pagar (${data.cuentasPorPagar.count})` };
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

          {/* Tab: Movimientos realizados */}
          {tab === "realizados" && (
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Entradas */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a]">
                  <SectionHeader title="↑ Entradas" total={data.ingresos.total} color="text-emerald-400" />
                  {data.ingresos.porCategoria.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {data.ingresos.porCategoria.slice(0, 4).map(c => (
                        <span key={c.nombre} className="text-[10px] bg-emerald-900/20 text-emerald-500 px-2 py-0.5 rounded">
                          {c.nombre} · {fmt(c.total)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-[#161616] max-h-96 overflow-y-auto">
                  {data.ingresos.detalle.length === 0 && data.ingresos.abonosOrfanos.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-6">Sin entradas registradas</p>
                  ) : (
                    <>
                      {data.ingresos.detalle.map(m => (
                        <MovRow key={m.id} {...m} color="text-emerald-400" />
                      ))}
                      {data.ingresos.abonosOrfanos.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-[#161616] last:border-0">
                          <div className="w-14 text-[10px] text-gray-600 shrink-0">{fmtFecha(a.fecha)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{a.concepto}</p>
                            <p className="text-[10px] text-yellow-600">⚠ Sin conciliar · {a.cliente}</p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-emerald-400 shrink-0">{fmt(a.monto)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Salidas */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a]">
                  <SectionHeader title="↓ Salidas" total={data.gastos.total} color="text-red-400" />
                  {data.gastos.porCategoria.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {data.gastos.porCategoria.slice(0, 4).map(c => (
                        <span key={c.nombre} className="text-[10px] bg-red-900/20 text-red-500 px-2 py-0.5 rounded">
                          {c.nombre} · {fmt(c.total)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-[#161616] max-h-96 overflow-y-auto">
                  {data.gastos.detalle.length === 0 &&
                   data.gastos.abonosPagoOrfanos.length === 0 &&
                   data.gastos.nominaOrfana.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-6">Sin salidas registradas</p>
                  ) : (
                    <>
                      {data.gastos.detalle.map(m => (
                        <MovRow key={m.id} {...m} color="text-red-400" />
                      ))}
                      {data.gastos.abonosPagoOrfanos.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-[#161616] last:border-0">
                          <div className="w-14 text-[10px] text-gray-600 shrink-0">{fmtFecha(a.fecha)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{a.concepto}</p>
                            <p className="text-[10px] text-yellow-600">⚠ Sin conciliar · {a.tipo}</p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-red-400 shrink-0">{fmt(a.monto)}</span>
                        </div>
                      ))}
                      {data.gastos.nominaOrfana.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-[#161616] last:border-0">
                          <div className="w-14 text-[10px] text-gray-600 shrink-0">{p.fecha ? fmtFecha(p.fecha) : "—"}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">Nómina · {p.nombre}</p>
                            <p className="text-[10px] text-yellow-600">⚠ Sin conciliar</p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-red-400 shrink-0">{fmt(p.monto)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: CxC */}
          {tab === "cxc" && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1a1a1a]">
                <SectionHeader
                  title="Cuentas por cobrar — compromisos del período"
                  total={data.cuentasPorCobrar.total}
                  color="text-emerald-400"
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  CxC con fecha compromiso en {mesLabel} aún pendientes de cobro. Estas entradas se esperan pero aún no se han realizado.
                </p>
              </div>
              {data.cuentasPorCobrar.detalle.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-8">Sin cuentas por cobrar pendientes en este período</p>
              ) : (
                <div className="divide-y divide-[#161616]">
                  {data.cuentasPorCobrar.detalle.map(c => (
                    <CxRow key={c.id} item={c} tipo="cobrar" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: CxP */}
          {tab === "cxp" && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1a1a1a]">
                <SectionHeader
                  title="Cuentas por pagar — compromisos del período"
                  total={data.cuentasPorPagar.total}
                  color="text-red-400"
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  CxP con fecha compromiso en {mesLabel} aún pendientes de pago. Estas salidas se esperan pero aún no se han realizado.
                </p>
              </div>
              {data.cuentasPorPagar.detalle.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-8">Sin cuentas por pagar pendientes en este período</p>
              ) : (
                <div className="divide-y divide-[#161616]">
                  {data.cuentasPorPagar.detalle.map(c => (
                    <CxRow key={c.id} item={c} tipo="pagar" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nota de datos */}
          {data.tieneOrfanos && (
            <div className="bg-yellow-900/10 border border-yellow-900/30 rounded-xl px-4 py-3">
              <p className="text-xs text-yellow-500">
                ⚠ {data.orphanCount} movimiento(s) sin conciliar con un registro de Movimiento Financiero.
                Los montos están incluidos en los totales pero sin detalle de categoría o cuenta bancaria.
              </p>
            </div>
          )}

        </div>
      ) : (
        <p className="text-gray-600 text-sm text-center py-12">Error cargando datos</p>
      )}
    </div>
  );
}
