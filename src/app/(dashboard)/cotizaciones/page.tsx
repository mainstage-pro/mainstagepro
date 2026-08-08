"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ESTADO_COTIZACION_LABELS, ESTADO_COTIZACION_COLORS, TIPO_EVENTO_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";

type Cotizacion = {
  id: string;
  numeroCotizacion: string;
  estado: string;
  opcionLetra: string;
  grupoId: string | null;
  granTotal: number;
  nombreEvento: string | null;
  tipoEvento: string | null;
  createdAt: string;
  mainstageTradeData: string | null;
  fechaVencimiento: string | null;
  vencida?: boolean;
  cliente: { id: string; nombre: string; empresa: string | null; tipoCliente: string };
  trato: { tipoEvento: string };
};

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/cotizaciones", { cache: "no-store" })
      .then(r => r.json())
      .then(data => setCotizaciones(data.cotizaciones ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function eliminar(id: string, numero: string) {
    const ok = await confirm({ message: `¿Eliminar cotización ${numero}? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, { method: "DELETE" });
      if (res.ok) { setCotizaciones(prev => prev.filter(c => c.id !== id)); toast.success("Cotización eliminada"); }
      else { const d = await res.json(); toast.error(d.error ?? "Error al eliminar"); }
    } finally {
      setDeletingId(null);
    }
  }

  const q = busqueda.trim().toLowerCase();
  const cotizacionesFiltradas = q
    ? cotizaciones.filter((cot) => {
        const evento = cot.nombreEvento || (cot.tipoEvento ? TIPO_EVENTO_LABELS[cot.tipoEvento] : "");
        return (
          cot.numeroCotizacion.toLowerCase().includes(q) ||
          cot.cliente.nombre.toLowerCase().includes(q) ||
          (cot.cliente.empresa?.toLowerCase().includes(q) ?? false) ||
          evento.toLowerCase().includes(q)
        );
      })
    : cotizaciones;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ms-h1">Cotizaciones</h1>
          <p className="ms-subtitle">
            {loading
              ? "Cargando..."
              : q
                ? `${cotizacionesFiltradas.length} de ${cotizaciones.length} cotizaciones`
                : `${cotizaciones.length} cotizaciones`}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por número, cliente o evento..."
          className="w-full md:max-w-md bg-[#111] border border-[#1a1a1a] rounded-lg px-4 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50 transition-colors"
        />
      </div>

      <div className="ms-table-wrapper">
        {loading ? (
          <SkeletonPage rows={5} cols={5} />
        ) : cotizaciones.length === 0 ? (
          <div className="text-center py-16">
            <p className="ms-subtitle">No hay cotizaciones</p>
            <p className="text-[#444] text-xs mt-1">Crea una cotización desde un trato</p>
          </div>
        ) : cotizacionesFiltradas.length === 0 ? (
          <div className="text-center py-16">
            <p className="ms-subtitle">Sin resultados para “{busqueda}”</p>
            <p className="text-[#444] text-xs mt-1">Prueba con otro número, cliente o evento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th">Número</th>
                <th className="ms-th">Cliente</th>
                <th className="ms-th hidden md:table-cell">Evento</th>
                <th className="ms-th">Total</th>
                <th className="ms-th">Estado</th>
                <th className="ms-th hidden sm:table-cell">Fecha</th>
                <th className="ms-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {cotizacionesFiltradas.map((cot) => (
                <tr
                  key={cot.id}
                  onClick={() => router.push(`/cotizaciones/${cot.id}`)}
                  className="hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#B3985B] text-xs font-mono">{cot.numeroCotizacion}</span>
                      {cot.grupoId && (
                        <span className="text-[10px] font-bold text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/30 px-1.5 py-0.5 rounded-full leading-none">
                          {cot.opcionLetra}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/crm/clientes/${cot.cliente.id}`} onClick={e => e.stopPropagation()} className="text-white text-sm hover:text-[#B3985B] transition-colors">
                      {cot.cliente.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9ca3af] hidden md:table-cell">
                    {cot.nombreEvento || (cot.tipoEvento ? TIPO_EVENTO_LABELS[cot.tipoEvento] : "—")}
                  </td>
                  <td className="px-4 py-3 text-sm text-white font-medium whitespace-nowrap">
                    {formatCurrency(cot.granTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium w-fit ${ESTADO_COTIZACION_COLORS[cot.estado] ?? "bg-gray-800 text-gray-400"}`}>
                        {ESTADO_COTIZACION_LABELS[cot.estado] ?? cot.estado}
                      </span>
                      {(() => {
                        if (!cot.fechaVencimiento) return null;
                        const vencida = new Date(cot.fechaVencimiento) < new Date() && !['APROBADA','CONTRATADA','CANCELADA'].includes(cot.estado);
                        if (!vencida) return null;
                        return <span className="text-[10px] text-red-400 border border-red-900/40 bg-red-900/10 px-1.5 py-0.5 rounded-full font-medium">Vencida</span>;
                      })()}
                      {(() => {
                        if (!cot.mainstageTradeData) return null;
                        try {
                          const t = JSON.parse(cot.mainstageTradeData);
                          if (!t.nivelSeleccionado) return null;
                          const labels: Record<number, string> = { 1: "Base", 2: "Estratégico", 3: "Premium" };
                          return (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium w-fit bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30">
                              ✦ Trade Nv.{t.nivelSeleccionado} {labels[t.nivelSeleccionado]} · {t.pct}%
                            </span>
                          );
                        } catch { return null; }
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280] hidden sm:table-cell whitespace-nowrap">
                    {new Date(cot.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/cotizaciones/${cot.id}`} onClick={e => e.stopPropagation()} className="text-[#B3985B] text-xs hover:underline">
                        Ver →
                      </Link>
                      <button
                        onClick={e => { e.stopPropagation(); eliminar(cot.id, cot.numeroCotizacion); }}
                        disabled={deletingId === cot.id}
                        className="text-[#444] hover:text-red-400 text-xs transition-colors disabled:opacity-50"
                        title="Eliminar cotización"
                      >
                        {deletingId === cot.id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
