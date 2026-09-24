"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DetalleGastoRecurrentePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [gasto, setGasto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmandoPeriodo, setConfirmandoPeriodo] = useState<string | null>(null);
  const [montoConfirmado, setMontoConfirmado] = useState("");

  const fetchGasto = async () => {
    try {
      const res = await fetch(`/api/gastos-recurrentes/${params.id}`);
      if (!res.ok) throw new Error("Gasto no encontrado");
      setGasto(await res.json());
    } catch (err: any) {
      toast(err.message, "error");
      router.push("/finanzas/gastos-recurrentes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGasto();
  }, [params.id]);

  const handleConfirmarImporte = async (periodoId: string) => {
    try {
      const res = await fetch(`/api/gastos-recurrentes/${gasto.id}/confirmar-importe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodoId, montoConfirmado })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al confirmar importe");
      }
      toast("Importe confirmado, Cuenta por Pagar generada", "success");
      setConfirmandoPeriodo(null);
      setMontoConfirmado("");
      fetchGasto();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  const handleEstado = async (nuevoEstado: string) => {
    try {
      const res = await fetch(`/api/gastos-recurrentes/${gasto.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (!res.ok) throw new Error("Error al actualizar estado");
      fetchGasto();
      toast(`Gasto ${nuevoEstado.toLowerCase()} correctamente`, "success");
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  if (loading) return <div className="p-8 text-center text-[#9ca3af]">Cargando...</div>;
  if (!gasto) return null;

  const proveedorNombre = gasto.proveedor?.nombre || gasto.empresa?.nombre || gasto.acreedorLibre || "-";

  return (
    <div className="w-full space-y-6 text-white">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/finanzas/gastos-recurrentes" className="text-[#9ca3af] hover:text-[#B3985B] transition-colors">
            &larr; Volver
          </Link>
          <h1 className="text-2xl font-bold">{gasto.nombre}</h1>
          <span className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${
            gasto.estado === "ACTIVO" ? "bg-green-900/30 text-green-400 border-green-800/50" :
            gasto.estado === "PAUSADO" ? "bg-yellow-900/30 text-yellow-400 border-yellow-800/50" :
            "bg-gray-800/50 text-gray-400 border-gray-700/50"
          }`}>
            {gasto.estado}
          </span>
        </div>
        <div className="flex gap-2">
          {gasto.estado !== "ACTIVO" && (
            <button onClick={() => handleEstado("ACTIVO")} className="px-3 py-1.5 text-xs font-semibold border border-[#333] rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors">
              Reactivar
            </button>
          )}
          {gasto.estado === "ACTIVO" && (
            <button onClick={() => handleEstado("PAUSADO")} className="px-3 py-1.5 text-xs font-semibold border border-[#333] rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors">
              Pausar
            </button>
          )}
          {gasto.estado !== "FINALIZADO" && (
            <button onClick={() => handleEstado("FINALIZADO")} className="px-3 py-1.5 text-xs font-semibold border border-red-900/50 text-red-400 rounded-lg bg-red-900/20 hover:bg-red-900/40 transition-colors">
              Finalizar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Ficha Principal */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-[#111] p-6 rounded-xl border border-[#222]">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#9ca3af] mb-4 border-b border-[#222] pb-2">Información del Gasto</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-[#9ca3af] text-xs uppercase tracking-wider mb-1">Proveedor</span>
                <span className="font-medium text-[#d1d5db]">{proveedorNombre}</span>
              </div>
              <div>
                <span className="block text-[#9ca3af] text-xs uppercase tracking-wider mb-1">Tipo</span>
                <span className="font-medium text-[#d1d5db]">{gasto.tipoMonto}</span>
              </div>
              <div>
                <span className="block text-[#9ca3af] text-xs uppercase tracking-wider mb-1">Frecuencia</span>
                <span className="font-medium text-[#d1d5db]">{gasto.frecuencia}</span>
              </div>
              <div>
                <span className="block text-[#9ca3af] text-xs uppercase tracking-wider mb-1">Categoría</span>
                <span className="font-medium text-[#d1d5db]">{gasto.categoria?.nombre || "-"}</span>
              </div>
              <div>
                <span className="block text-[#9ca3af] text-xs uppercase tracking-wider mb-1">Monto Base / Estimado</span>
                <span className="font-medium text-white text-lg">{formatCurrency(gasto.montoBase || 0)}</span>
              </div>
              <div>
                <span className="block text-[#9ca3af] text-xs uppercase tracking-wider mb-1">Día Vencimiento</span>
                <span className="font-medium text-[#d1d5db]">{gasto.diaVencimiento || "Automático"}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[#9ca3af] text-xs uppercase tracking-wider mb-1">Descripción</span>
                <span className="text-[#d1d5db]">{gasto.descripcion || "Sin descripción"}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111] p-6 rounded-xl border border-[#222]">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#9ca3af] mb-4 border-b border-[#222] pb-2">Historial de Periodos</h2>
            
            {gasto.periodos?.length === 0 ? (
              <p className="text-[#9ca3af] text-sm">No hay periodos generados aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-[#9ca3af] uppercase tracking-wider bg-[#0d0d0d] border-b border-[#222]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Periodo</th>
                      <th className="px-4 py-3 font-semibold">Vence</th>
                      <th className="px-4 py-3 font-semibold text-right">Monto</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 font-semibold">Cuenta x Pagar</th>
                      <th className="px-4 py-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {gasto.periodos.map((p: any) => (
                      <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{p.periodo}</td>
                        <td className="px-4 py-3 text-[#d1d5db]">{format(new Date(p.fechaVencimiento), "dd MMM yy", { locale: es })}</td>
                        <td className="px-4 py-3 text-right">
                          {p.estado === "PENDIENTE_IMPORTE" ? (
                            <span className="text-[#9ca3af] text-xs">Est. {formatCurrency(p.montoEstimado || 0)}</span>
                          ) : (
                            <span className="font-medium text-white">{formatCurrency(p.montoConfirmado || 0)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full border ${
                            p.estado === "PENDIENTE_IMPORTE" ? "bg-orange-900/30 text-orange-400 border-orange-800/50" :
                            p.estado === "PENDIENTE_PAGO" ? "bg-yellow-900/30 text-yellow-400 border-yellow-800/50" :
                            p.estado === "PAGADO" ? "bg-green-900/30 text-green-400 border-green-800/50" :
                            "bg-gray-800/50 text-gray-400 border-gray-700/50"
                          }`}>
                            {p.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.cuentaPagar ? (
                            <Link href={`/finanzas/cobros-pagos?cxp=${p.cuentaPagar.id}`} className="text-[#B3985B] hover:underline text-xs font-medium">
                              Ver CxP
                            </Link>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {p.estado === "PENDIENTE_IMPORTE" && confirmandoPeriodo !== p.id && (
                            <button onClick={() => setConfirmandoPeriodo(p.id)} className="text-[#B3985B] hover:underline text-xs font-medium">
                              Confirmar Importe
                            </button>
                          )}
                          {confirmandoPeriodo === p.id && (
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" step="0.01" 
                                className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 w-24 text-xs text-white outline-none focus:border-[#B3985B]"
                                placeholder="Monto real"
                                value={montoConfirmado}
                                onChange={e => setMontoConfirmado(e.target.value)}
                              />
                              <button onClick={() => handleConfirmarImporte(p.id)} className="bg-[#B3985B] text-black font-semibold px-2 py-1.5 rounded text-xs hover:bg-[#c9a96a] transition-colors">OK</button>
                              <button onClick={() => setConfirmandoPeriodo(null)} className="text-[#9ca3af] hover:text-white transition-colors text-xs ml-1">X</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar derecha */}
        <div className="col-span-1 space-y-6">
          <div className="bg-[#111] p-6 rounded-xl border border-[#222]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-4 border-b border-[#222] pb-2">Registro de Actividad</h3>
            <div className="space-y-4">
              {gasto.historial?.length === 0 ? (
                <p className="text-sm text-[#9ca3af]">No hay actividad registrada.</p>
              ) : (
                gasto.historial?.map((h: any) => (
                  <div key={h.id} className="text-sm">
                    <p className="text-[#d1d5db]">{h.cambio}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[#9ca3af] mt-0.5">{format(new Date(h.createdAt), "dd MMM yyyy HH:mm", { locale: es })}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
