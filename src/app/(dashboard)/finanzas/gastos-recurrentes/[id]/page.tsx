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

  if (loading) return <div className="p-8 text-center">Cargando...</div>;
  if (!gasto) return null;

  const proveedorNombre = gasto.proveedor?.nombre || gasto.empresa?.nombre || gasto.acreedorLibre || "-";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/finanzas/gastos-recurrentes" className="text-gray-500 hover:text-gray-800">
            &larr; Volver
          </Link>
          <h1 className="text-2xl font-bold">{gasto.nombre}</h1>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            gasto.estado === "ACTIVO" ? "bg-green-100 text-green-800" :
            gasto.estado === "PAUSADO" ? "bg-yellow-100 text-yellow-800" :
            "bg-gray-100 text-gray-800"
          }`}>
            {gasto.estado}
          </span>
        </div>
        <div className="flex gap-2">
          {gasto.estado !== "ACTIVO" && (
            <button onClick={() => handleEstado("ACTIVO")} className="px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-50">
              Reactivar
            </button>
          )}
          {gasto.estado === "ACTIVO" && (
            <button onClick={() => handleEstado("PAUSADO")} className="px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-50">
              Pausar
            </button>
          )}
          {gasto.estado !== "FINALIZADO" && (
            <button onClick={() => handleEstado("FINALIZADO")} className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded bg-white hover:bg-red-50">
              Finalizar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Ficha Principal */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Información del Gasto</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-gray-500">Proveedor</span>
                <span className="font-medium">{proveedorNombre}</span>
              </div>
              <div>
                <span className="block text-gray-500">Tipo</span>
                <span className="font-medium">{gasto.tipoMonto}</span>
              </div>
              <div>
                <span className="block text-gray-500">Frecuencia</span>
                <span className="font-medium">{gasto.frecuencia}</span>
              </div>
              <div>
                <span className="block text-gray-500">Categoría</span>
                <span className="font-medium">{gasto.categoria?.nombre || "-"}</span>
              </div>
              <div>
                <span className="block text-gray-500">Monto Base / Estimado</span>
                <span className="font-medium">{formatCurrency(gasto.montoBase || 0)}</span>
              </div>
              <div>
                <span className="block text-gray-500">Día Vencimiento</span>
                <span className="font-medium">{gasto.diaVencimiento || "Automático"}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-gray-500">Descripción</span>
                <span>{gasto.descripcion || "Sin descripción"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Historial de Periodos</h2>
            
            {gasto.periodos?.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay periodos generados aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-2">Periodo</th>
                      <th className="px-4 py-2">Vence</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                      <th className="px-4 py-2">Estado</th>
                      <th className="px-4 py-2">Cuenta x Pagar</th>
                      <th className="px-4 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {gasto.periodos.map((p: any) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-medium">{p.periodo}</td>
                        <td className="px-4 py-3 text-gray-500">{format(new Date(p.fechaVencimiento), "dd MMM yy", { locale: es })}</td>
                        <td className="px-4 py-3 text-right">
                          {p.estado === "PENDIENTE_IMPORTE" ? (
                            <span className="text-gray-400">Est. {formatCurrency(p.montoEstimado || 0)}</span>
                          ) : (
                            <span className="font-medium">{formatCurrency(p.montoConfirmado || 0)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            p.estado === "PENDIENTE_IMPORTE" ? "bg-orange-100 text-orange-800" :
                            p.estado === "PENDIENTE_PAGO" ? "bg-yellow-100 text-yellow-800" :
                            p.estado === "PAGADO" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {p.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.cuentaPagar ? (
                            <Link href={`/finanzas/cobros-pagos?cxp=${p.cuentaPagar.id}`} className="text-blue-600 hover:underline">
                              Ver CxP
                            </Link>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {p.estado === "PENDIENTE_IMPORTE" && confirmandoPeriodo !== p.id && (
                            <button onClick={() => setConfirmandoPeriodo(p.id)} className="text-blue-600 hover:underline text-xs font-medium">
                              Confirmar Importe
                            </button>
                          )}
                          {confirmandoPeriodo === p.id && (
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" step="0.01" 
                                className="border rounded px-2 py-1 w-24 text-xs"
                                placeholder="Monto real"
                                value={montoConfirmado}
                                onChange={e => setMontoConfirmado(e.target.value)}
                              />
                              <button onClick={() => handleConfirmarImporte(p.id)} className="bg-black text-white px-2 py-1 rounded text-xs">OK</button>
                              <button onClick={() => setConfirmandoPeriodo(null)} className="text-gray-500 text-xs">X</button>
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
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Registro de Actividad</h3>
            <div className="space-y-4">
              {gasto.historial?.length === 0 ? (
                <p className="text-sm text-gray-400">No hay actividad registrada.</p>
              ) : (
                gasto.historial?.map((h: any) => (
                  <div key={h.id} className="text-sm">
                    <p className="text-gray-800">{h.cambio}</p>
                    <p className="text-xs text-gray-400">{format(new Date(h.createdAt), "dd MMM yyyy HH:mm", { locale: es })}</p>
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
