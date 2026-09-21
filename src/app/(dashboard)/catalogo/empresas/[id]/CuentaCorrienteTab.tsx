"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CompensacionModal from "./CompensacionModal";

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

  const { resumen, cxcPendientes, cxpPendientes, historial } = data;

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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Resumen de cuenta</h2>
        <button 
          onClick={() => setShowModal(true)}
          disabled={resumen.montoCompensable <= 0}
          className="bg-[#B3985B] text-black font-semibold text-sm px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition"
        >
          Nueva Compensación
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="ms-card p-4">
          <p className="text-xs text-gray-500 uppercase">A favor de Mainstage</p>
          <p className="text-xl font-bold text-green-400 mt-1">{fmt(resumen.aFavorMainstage)}</p>
        </div>
        <div className="ms-card p-4">
          <p className="text-xs text-gray-500 uppercase">A favor contraparte</p>
          <p className="text-xl font-bold text-red-400 mt-1">{fmt(resumen.aFavorContraparte)}</p>
        </div>
        <div className="ms-card p-4 border border-[#B3985B]/30 bg-[#B3985B]/5">
          <p className="text-xs text-[#B3985B] uppercase">Disponible para compensar</p>
          <p className="text-xl font-bold text-[#B3985B] mt-1">{fmt(resumen.montoCompensable)}</p>
        </div>
        <div className="ms-card p-4">
          <p className="text-xs text-gray-500 uppercase">Saldo Neto</p>
          <p className={`text-xl font-bold mt-1 ${resumen.saldoNeto > 0 ? "text-green-500" : resumen.saldoNeto < 0 ? "text-red-500" : "text-white"}`}>
            {resumen.saldoNeto > 0 ? "+" : ""}{fmt(resumen.saldoNeto)}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Pendiente por Cobrar</h3>
          <div className="space-y-2">
            {cxcPendientes.length === 0 ? <p className="text-sm text-gray-500">No hay montos por cobrar.</p> : null}
            {cxcPendientes.map((c: any) => (
              <div key={c.id} className="ms-card p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-300">{c.concepto}</p>
                  <p className="text-[10px] text-gray-500">Vence: {fmtDate(c.fechaCompromiso)}</p>
                </div>
                <p className="text-sm font-bold text-green-400">{fmt(c.saldoPendiente)}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Pendiente por Pagar</h3>
          <div className="space-y-2">
            {cxpPendientes.length === 0 ? <p className="text-sm text-gray-500">No hay montos por pagar.</p> : null}
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
