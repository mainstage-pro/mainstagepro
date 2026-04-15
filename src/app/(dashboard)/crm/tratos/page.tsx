"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ETAPA_LABELS, TIPO_EVENTO_LABELS, ORIGEN_LEAD_LABELS } from "@/lib/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Trato = any;

const ETAPA_COLORS: Record<string, string> = {
  DESCUBRIMIENTO: "bg-blue-900/40 text-blue-300",
  OPORTUNIDAD: "bg-yellow-900/40 text-yellow-300",
  VENTA_CERRADA: "bg-green-900/40 text-green-300",
  VENTA_PERDIDA: "bg-red-900/40 text-red-300",
};

const ETAPAS = ["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"];

export default function TratosPage() {
  const [tratos, setTratos] = useState<Trato[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filtroEtapa, setFiltroEtapa] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetch("/api/tratos")
      .then(r => r.json())
      .then(data => setTratos(data.tratos ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el trato de "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tratos/${id}`, { method: "DELETE" });
      if (res.ok) setTratos(prev => prev.filter(t => t.id !== id));
      else { const d = await res.json(); alert(d.error ?? "Error al eliminar"); }
    } finally {
      setDeletingId(null);
    }
  }

  const tratosFiltrados = tratos.filter(t => {
    const matchEtapa = !filtroEtapa || t.etapa === filtroEtapa;
    const q = busqueda.toLowerCase();
    const matchBusqueda = !q ||
      t.cliente.nombre.toLowerCase().includes(q) ||
      (t.cliente.empresa ?? "").toLowerCase().includes(q) ||
      (t.nombreEvento ?? "").toLowerCase().includes(q) ||
      (t.lugarEvento ?? "").toLowerCase().includes(q);
    return matchEtapa && matchBusqueda;
  });

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Tratos</h1>
          <p className="text-[#6b7280] text-sm">
            {loading ? "Cargando..." : `${tratosFiltrados.length} de ${tratos.length} tratos`}
          </p>
        </div>
        <Link href="/crm/tratos/nuevo" className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
          + Nuevo trato
        </Link>
      </div>

      {/* Barra de búsqueda + filtros */}
      {!loading && (
        <div className="flex flex-col gap-3 mb-6">
          {/* Búsqueda */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, empresa, evento..."
              className="w-full bg-[#111] border border-[#1e1e1e] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white text-xs">✕</button>
            )}
          </div>
          {/* Filtros etapa */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFiltroEtapa(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !filtroEtapa ? "bg-[#B3985B] text-black" : "bg-[#1a1a1a] text-[#6b7280] hover:text-white"
              }`}>
              Todos ({tratos.length})
            </button>
            {ETAPAS.map((etapa) => {
              const count = tratos.filter(t => t.etapa === etapa).length;
              return (
                <button
                  key={etapa}
                  onClick={() => setFiltroEtapa(filtroEtapa === etapa ? null : etapa)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filtroEtapa === etapa
                      ? "bg-[#B3985B] text-black"
                      : "bg-[#1a1a1a] text-[#6b7280] hover:text-white"
                  }`}>
                  {ETAPA_LABELS[etapa]} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-[#6b7280] text-sm">Cargando...</div>
        ) : tratos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] text-sm">No hay tratos registrados</p>
            <Link href="/crm/tratos/nuevo" className="inline-block mt-4 text-[#B3985B] text-sm hover:underline">
              Crear primer trato →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[18%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {["Cliente", "Tipo evento", "Etapa", "Origen", "Próx. acción", ""].map(h => (
                    <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {tratosFiltrados.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-[#6b7280] text-sm">
                    Sin tratos que coincidan con el filtro
                  </td></tr>
                ) : tratosFiltrados.map((trato) => (
                  <tr key={trato.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/crm/clientes/${trato.cliente.id}`} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors">
                        {trato.cliente.nombre}
                      </Link>
                      {trato.cliente.empresa && <p className="text-[#6b7280] text-xs">{trato.cliente.empresa}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#9ca3af]">
                      {TIPO_EVENTO_LABELS[trato.tipoEvento] ?? trato.tipoEvento}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ETAPA_COLORS[trato.etapa] ?? "bg-gray-800 text-gray-400"}`}>
                        {ETAPA_LABELS[trato.etapa] ?? trato.etapa}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6b7280]">
                      {ORIGEN_LEAD_LABELS[trato.origenLead] ?? trato.origenLead}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6b7280] whitespace-nowrap">
                      {trato.fechaProximaAccion
                        ? new Date(trato.fechaProximaAccion).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/crm/tratos/${trato.id}`} className="text-[#B3985B] text-xs hover:underline">
                          Ver →
                        </Link>
                        <button
                          onClick={() => eliminar(trato.id, trato.cliente.nombre)}
                          disabled={deletingId === trato.id}
                          className="text-[#444] hover:text-red-400 text-xs transition-colors disabled:opacity-50"
                          title="Eliminar trato"
                        >
                          {deletingId === trato.id ? "..." : "Eliminar"}
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
