"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIPO_CLIENTE_LABELS, CLASIFICACION_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/constants";
import { CopyButton } from "@/components/CopyButton";

interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
  correo: string | null;
  tipoCliente: string;
  clasificacion: string;
  servicioUsual: string | null;
  _count: { tratos: number; proyectos: number };
}

const TIPO_COLORS: Record<string, string> = {
  B2B: "bg-blue-900/40 text-blue-300",
  B2C: "bg-purple-900/40 text-purple-300",
  POR_DESCUBRIR: "bg-gray-800 text-gray-400",
};
const CLAS_COLORS: Record<string, string> = {
  NUEVO: "text-[#6b7280]",
  BASIC: "text-blue-400",
  REGULAR: "text-yellow-400",
  PRIORITY: "text-[#B3985B]",
};

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[tipo] ?? "bg-gray-800 text-gray-400"}`}>
      {TIPO_CLIENTE_LABELS[tipo] ?? tipo}
    </span>
  );
}

function ClasificacionBadge({ clasificacion }: { clasificacion: string }) {
  return (
    <span className={`text-xs font-medium ${CLAS_COLORS[clasificacion] ?? "text-gray-400"}`}>
      {CLASIFICACION_LABELS[clasificacion] ?? clasificacion}
    </span>
  );
}

export default function ClientesClient({ clientes: initial }: { clientes: Cliente[] }) {
  const [view, setView] = useState<"list" | "card">("list");
  const [clientes, setClientes] = useState<Cliente[]>(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function eliminar(c: Cliente) {
    if (!confirm(`¿Eliminar a ${c.nombre}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(c.id);
    await fetch(`/api/clientes/${c.id}`, { method: "DELETE" });
    setClientes(prev => prev.filter(x => x.id !== c.id));
    setDeletingId(null);
    router.refresh();
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Clientes</h1>
          <p className="text-[#6b7280] text-sm">{clientes.length} clientes registrados</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle */}
          <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5">
            <button
              onClick={() => setView("list")}
              title="Vista lista"
              className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/>
                <rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor"/>
                <rect x="1" y="11" width="14" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
            <button
              onClick={() => setView("card")}
              title="Vista tarjetas"
              className={`p-1.5 rounded-md transition-colors ${view === "card" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <Link
            href="/crm/clientes/nuevo"
            className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
          >
            + Nuevo cliente
          </Link>
        </div>
      </div>

      {clientes.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
          <p className="text-[#6b7280] text-sm">No hay clientes registrados</p>
        </div>
      ) : view === "list" ? (
        /* ── LISTA (tabla) ── */
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Cliente", "Tipo", "Clasificación", "Servicio usual", "Tratos", "Proyectos", ""].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {clientes.map(c => (
                <tr key={c.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{c.nombre}</p>
                    {c.empresa && <p className="text-[#6b7280] text-xs">{c.empresa}</p>}
                    {c.correo && <span className="flex items-center gap-1"><p className="text-[#555] text-xs">{c.correo}</p><CopyButton value={c.correo} size="xs" /></span>}
                  </td>
                  <td className="px-4 py-3"><TipoBadge tipo={c.tipoCliente} /></td>
                  <td className="px-4 py-3"><ClasificacionBadge clasificacion={c.clasificacion} /></td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {c.servicioUsual ? TIPO_SERVICIO_LABELS[c.servicioUsual] ?? c.servicioUsual : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9ca3af] text-center">{c._count.tratos}</td>
                  <td className="px-4 py-3 text-sm text-[#9ca3af] text-center">{c._count.proyectos}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/crm/clientes/${c.id}`} className="text-[#B3985B] text-xs hover:underline">Ver →</Link>
                      <button onClick={() => eliminar(c)} disabled={deletingId === c.id}
                        className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30" title="Eliminar cliente">
                        {deletingId === c.id ? "…" : "✕"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── TARJETAS ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clientes.map(c => (
            <Link key={c.id} href={`/crm/clientes/${c.id}`}
              className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 hover:bg-[#141414] hover:border-[#2a2a2a] transition-all group">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
                <span className="text-[#B3985B] text-base font-bold">{c.nombre.charAt(0).toUpperCase()}</span>
              </div>
              {/* Nombre */}
              <p className="text-white text-sm font-semibold leading-tight">{c.nombre}</p>
              {c.empresa && <p className="text-[#6b7280] text-xs mt-0.5">{c.empresa}</p>}
              {c.correo && <p className="text-[#444] text-xs mt-0.5 truncate">{c.correo}</p>}
              {/* Badges */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <TipoBadge tipo={c.tipoCliente} />
                <ClasificacionBadge clasificacion={c.clasificacion} />
              </div>
              {/* Servicio */}
              {c.servicioUsual && (
                <p className="text-[#555] text-xs mt-2">{TIPO_SERVICIO_LABELS[c.servicioUsual] ?? c.servicioUsual}</p>
              )}
              {/* Conteos */}
              <div className="flex gap-4 mt-4 pt-3 border-t border-[#1a1a1a]">
                <div className="text-center">
                  <p className="text-white text-sm font-semibold">{c._count.tratos}</p>
                  <p className="text-[#555] text-[10px]">tratos</p>
                </div>
                <div className="text-center">
                  <p className="text-white text-sm font-semibold">{c._count.proyectos}</p>
                  <p className="text-[#555] text-[10px]">proyectos</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
