"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CompensacionModal from "./CompensacionModal";
import { usePdfDownload } from "@/hooks/usePdfDownload";

function fmt(monto: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(monto);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export default function CuentaCorrienteTab({ empresaId }: { empresaId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { downloading, downloadPdf } = usePdfDownload();
  const descargando = downloading !== null;

  const descargarPdf = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    downloadPdf(`/api/empresas/${empresaId}/estado-cuenta/pdf`, `EstadoCuenta-${fecha}.pdf`, "Estado de cuenta");
  };

  const loadData = () => {
    setLoading(true);
    fetch(`/api/finanzas/cuenta-corriente/${empresaId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  };

  useEffect(() => {
    loadData();
  }, [empresaId]);

  if (loading) return <div className="p-4 text-center text-gray-500 text-sm">Cargando cuenta corriente...</div>;
  if (!data || !data.resumen) return <div className="p-4 text-center text-red-500 text-sm">Error al cargar datos</div>;

  const { resumen, cxcPendientes, cxpPendientes, cxcLiquidadas = [], abonosCobrar = [], historial } = data;

  const handleReverse = async (id: string) => {
    if (!confirm("¿Estás seguro de reversar esta compensación?")) return;
    try {
      const res = await fetch(`/api/finanzas/compensaciones/${id}/reversa`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      alert("Compensación reversada");
      loadData();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {showModal && (
        <CompensacionModal 
          empresaId={empresaId}
          cxcPendientes={cxcPendientes}
          cxpPendientes={cxpPendientes}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadData();
          }}
        />
      )}

      {/* Tarjetas de Resumen */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white">Resumen de cuenta y rentas mutuas</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={descargarPdf}
            disabled={descargando}
            className="border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition"
          >
            {descargando ? "Generando PDF…" : "Descargar Estado de Cuenta"}
          </button>
          <button 
            onClick={() => setShowModal(true)}
            disabled={resumen.montoCompensable <= 0}
            className="bg-[#B3985B] text-black font-semibold text-sm px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition"
          >
            Nueva Compensación
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="ms-card p-4">
          <p className="text-xs text-gray-500 uppercase">Saldo a favor (Por cobrar)</p>
          <p className="text-xl font-bold text-green-400 mt-1">{fmt(resumen.aFavorMainstage)}</p>
        </div>
        <div className="ms-card p-4">
          <p className="text-xs text-gray-500 uppercase">Saldo en contra (Rentas mutuas)</p>
          <p className="text-xl font-bold text-red-400 mt-1">{fmt(resumen.aFavorContraparte)}</p>
        </div>
        <div className="ms-card p-4 border border-[#B3985B]/30 bg-[#B3985B]/5">
          <p className="text-xs text-[#B3985B] uppercase">Disponible para compensar</p>
          <p className="text-xl font-bold text-[#B3985B] mt-1">{fmt(resumen.montoCompensable)}</p>
        </div>
        <div className="ms-card p-4">
          <p className="text-xs text-gray-500 uppercase">
            Saldo Neto {resumen.saldoNeto > 0 ? "a favor" : resumen.saldoNeto < 0 ? "en contra" : "al corriente"}
          </p>
          <p className={`text-xl font-bold mt-1 ${resumen.saldoNeto > 0 ? "text-green-500" : resumen.saldoNeto < 0 ? "text-red-500" : "text-white"}`}>
            {resumen.saldoNeto > 0 ? "+" : ""}{fmt(resumen.saldoNeto)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Pendiente por Cobrar (Rentas a cliente)</h3>
          <div className="space-y-2">
            {cxcPendientes.length === 0 ? <p className="text-sm text-gray-500">No hay montos por cobrar.</p> : null}
            {cxcPendientes.map((c: any) => (
              <div key={c.id} className="ms-card p-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs text-gray-300">{c.concepto}</p>
                    <p className="text-[10px] text-gray-500">Vence: {fmtDate(c.fechaCompromiso)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-400">{fmt(c.saldoPendiente)}</p>
                    {c.montoCobrado > 0 && (
                      <p className="text-[10px] text-gray-500">Abonado {fmt(c.montoCobrado)} de {fmt(c.monto)}</p>
                    )}
                  </div>
                </div>
                {c.abonos && c.abonos.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-[#1e1e1e] space-y-0.5">
                    {c.abonos.map((a: any) => (
                      <p key={a.id} className="text-[11px] text-emerald-400/90">
                        ✓ Abono {fmtDate(a.fecha)} ({a.metodoPago === "EFECTIVO" ? "Efectivo" : a.cuenta ? `${a.metodoPago} · ${a.cuenta}` : a.metodoPago}): <span className="font-semibold">{fmt(a.monto)}</span>
                        {a.grupoFechaCount && a.grupoFechaCount > 1 && a.grupoFechaTotal ? (
                          <span className="text-[#B3985B] ml-1">
                            · Parte de {fmt(a.grupoFechaTotal)} dividido en {a.grupoFechaCount} proyectos
                          </span>
                        ) : null}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Rentas Mutuas / Pendiente por Pagar</h3>
          <div className="space-y-2">
            {cxpPendientes.length === 0 ? <p className="text-sm text-gray-500">No hay rentas mutuas pendientes por pagar.</p> : null}
            {cxpPendientes.map((c: any) => (
              <div key={c.id} className="ms-card p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-300">{c.concepto}</p>
                  <p className="text-[10px] text-gray-500">Vence: {fmtDate(c.fechaCompromiso)}</p>
                </div>
                <p className="text-sm font-bold text-red-400">{fmt(c.saldoPendiente)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {abonosCobrar.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-medium text-white">
              Desglose de Abonos Recibidos ({abonosCobrar.length} registro{abonosCobrar.length !== 1 ? "s" : ""})
            </h3>
            <span className="text-xs font-semibold text-emerald-400">
              Total abonado en registros: {fmt(abonosCobrar.reduce((s: number, a: any) => s + a.monto, 0))}
            </span>
          </div>
          <div className="space-y-1.5">
            {abonosCobrar.map((a: any) => (
              <div key={a.id} className="ms-card px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-white font-medium">{a.proyecto || a.concepto}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${a.estadoCuenta === "LIQUIDADO" ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                      {a.estadoCuenta}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      · {fmtDate(a.fecha)} · {a.metodoPago === "EFECTIVO" ? "Efectivo" : a.cuenta ? `${a.metodoPago} (${a.cuenta})` : a.metodoPago}
                    </span>
                  </div>
                  {a.grupoFechaCount && a.grupoFechaCount > 1 && a.grupoFechaTotal && (
                    <p className="text-[10px] text-[#B3985B] mt-0.5">
                      Parte de abono de {fmt(a.grupoFechaTotal)} dividido en {a.grupoFechaCount} proyectos: {a.grupoDetalle}
                    </p>
                  )}
                </div>
                <span className="text-xs font-semibold text-emerald-400 shrink-0">{fmt(a.monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cxcLiquidadas.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">
            Proyectos y Cuentas Liquidadas al 100% ({cxcLiquidadas.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {cxcLiquidadas.map((c: any) => (
              <div key={c.id} className="ms-card p-3 opacity-85">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs text-gray-300">{c.concepto}</p>
                    <p className="text-[10px] text-gray-500">{fmtDate(c.fechaCompromiso)} · {c.estado}</p>
                    {c.abonos && c.abonos.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {c.abonos.map((a: any) => (
                          <p key={a.id} className="text-[10px] text-emerald-400/90">
                            ✓ Abono {fmtDate(a.fecha)} ({a.metodoPago === "EFECTIVO" ? "Efectivo" : a.cuenta || a.metodoPago}): {fmt(a.monto)}
                            {a.grupoFechaCount && a.grupoFechaCount > 1 && a.grupoFechaTotal
                              ? ` · Parte de ${fmt(a.grupoFechaTotal)} en ${a.grupoFechaCount} proyectos`
                              : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-green-400 shrink-0">{fmt(c.montoCobrado || c.monto)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-white mb-3">Historial de Compensaciones</h3>
        <div className="ms-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="ms-thead text-left">
              <tr>
                <th className="ms-th">Fecha</th>
                <th className="ms-th">Importe</th>
                <th className="ms-th">Estado</th>
                <th className="ms-th">Notas</th>
                <th className="ms-th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {historial.compensaciones.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center text-xs text-gray-500">No hay compensaciones registradas</td></tr>
              ) : historial.compensaciones.map((c: any) => (
                <tr key={c.id} className={`transition-colors ${c.estado === "REVERSADA" ? "opacity-50" : "hover:bg-white/5"}`}>
                  <td className="ms-td whitespace-nowrap text-gray-300">{fmtDate(c.fecha)}</td>
                  <td className="ms-td font-medium text-white">{fmt(Number(c.importeCompensado))}</td>
                  <td className="ms-td">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.estado === "ACTIVA" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="ms-td text-gray-500 text-xs">{c.notas || "—"}</td>
                  <td className="ms-td text-right">
                    {c.estado === "ACTIVA" && (
                      <button 
                        onClick={() => handleReverse(c.id)}
                        className="text-xs text-red-400 hover:text-red-300 underline"
                      >
                        Reversar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
