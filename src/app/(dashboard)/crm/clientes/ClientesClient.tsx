"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIPO_CLIENTE_LABELS, CLASIFICACION_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/constants";
import { CopyButton } from "@/components/CopyButton";
import { useConfirm } from "@/components/Confirm";

interface Vendedor { id: string; name: string }

interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
  correo: string | null;
  tipoCliente: string;
  clasificacion: string;
  servicioUsual: string | null;
  vendedor: Vendedor | null;
  _count: { tratos: number; proyectos: number };
}

const TIPO_COLORS: Record<string, string> = {
  B2B: "bg-blue-900/40 text-blue-300",
  B2C: "bg-purple-900/40 text-purple-300",
  POR_DESCUBRIR: "bg-gray-800 text-gray-400",
};
const CLAS_COLORS: Record<string, string> = {
  PROSPECTO: "text-purple-400",
  NUEVO: "text-[#6b7280]",
  REGULAR: "text-yellow-400",
  PRIORITY: "text-[#B3985B]",
  BASIC: "text-blue-400",
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

function VendedorSelect({ clienteId, vendedor, usuarios, onChange }: {
  clienteId: string;
  vendedor: Vendedor | null;
  usuarios: Vendedor[];
  onChange: (v: Vendedor | null) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function asignar(vendedorId: string) {
    setSaving(true);
    await fetch(`/api/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendedorId: vendedorId || null }),
    });
    const found = usuarios.find(u => u.id === vendedorId) ?? null;
    onChange(found);
    setSaving(false);
  }

  return (
    <select
      value={vendedor?.id ?? ""}
      onChange={e => asignar(e.target.value)}
      disabled={saving}
      onClick={e => e.stopPropagation()}
      className="bg-transparent border-0 text-xs text-[#9ca3af] focus:outline-none focus:ring-0 cursor-pointer hover:text-white disabled:opacity-50 max-w-[130px] truncate"
    >
      <option value="">Sin asignar</option>
      {usuarios.map(u => (
        <option key={u.id} value={u.id}>{u.name.split(" ")[0]} {u.name.split(" ")[1] ?? ""}</option>
      ))}
    </select>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const active = value !== "";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#B3985B]/40
          ${active
            ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]"
            : "bg-[#111] border-[#2a2a2a] text-[#777] hover:border-[#3a3a3a] hover:text-[#aaa]"
          }`}
      >
        <option value="">{label}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg
        className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${active ? "text-[#B3985B]" : "text-[#555]"}`}
        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

export default function ClientesClient({ clientes: initial, usuarios }: { clientes: Cliente[]; usuarios: Vendedor[] }) {
  const confirm = useConfirm();
  const [view, setView] = useState<"list" | "card">("list");
  const [clientes, setClientes] = useState<Cliente[]>(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroClasificacion, setFiltroClasificacion] = useState("");
  const [filtroServicio, setFiltroServicio] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");

  const hayFiltros = busqueda || filtroTipo || filtroClasificacion || filtroServicio || filtroVendedor;

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return clientes.filter(c => {
      if (q && !c.nombre.toLowerCase().includes(q) && !(c.empresa ?? "").toLowerCase().includes(q) && !(c.correo ?? "").toLowerCase().includes(q)) return false;
      if (filtroTipo && c.tipoCliente !== filtroTipo) return false;
      if (filtroClasificacion && c.clasificacion !== filtroClasificacion) return false;
      if (filtroServicio && c.servicioUsual !== filtroServicio) return false;
      if (filtroVendedor) {
        if (filtroVendedor === "__sin_asignar__" && c.vendedor !== null) return false;
        if (filtroVendedor !== "__sin_asignar__" && c.vendedor?.id !== filtroVendedor) return false;
      }
      return true;
    });
  }, [clientes, busqueda, filtroTipo, filtroClasificacion, filtroServicio, filtroVendedor]);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroTipo("");
    setFiltroClasificacion("");
    setFiltroServicio("");
    setFiltroVendedor("");
  }

  function actualizarVendedor(clienteId: string, vendedor: Vendedor | null) {
    setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, vendedor } : c));
  }

  async function eliminar(c: Cliente) {
    if (!await confirm({ message: `¿Eliminar a ${c.nombre}? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" })) return;
    setDeletingId(c.id);
    await fetch(`/api/clientes/${c.id}`, { method: "DELETE" });
    setClientes(prev => prev.filter(x => x.id !== c.id));
    setDeletingId(null);
    router.refresh();
  }

  const vendedorOptions = [
    { value: "__sin_asignar__", label: "Sin asignar" },
    ...usuarios.map(u => ({ value: u.id, label: u.name })),
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Clientes</h1>
          <p className="text-[#6b7280] text-sm">
            {hayFiltros
              ? <>{clientesFiltrados.length} <span className="text-[#555]">de {clientes.length}</span></>
              : <>{clientes.length} clientes registrados</>
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Búsqueda + Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {/* Buscador */}
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, empresa o correo…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50 focus:ring-1 focus:ring-[#B3985B]/20 transition-colors"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect
            label="Tipo"
            value={filtroTipo}
            onChange={setFiltroTipo}
            options={Object.entries(TIPO_CLIENTE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
          <FilterSelect
            label="Clasificación"
            value={filtroClasificacion}
            onChange={setFiltroClasificacion}
            options={Object.entries(CLASIFICACION_LABELS).filter(([v]) => v !== "BASIC").map(([v, l]) => ({ value: v, label: l }))}
          />
          <FilterSelect
            label="Servicio"
            value={filtroServicio}
            onChange={setFiltroServicio}
            options={Object.entries(TIPO_SERVICIO_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
          <FilterSelect
            label="Vendedor"
            value={filtroVendedor}
            onChange={setFiltroVendedor}
            options={vendedorOptions}
          />
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="text-[10px] text-[#555] hover:text-red-400 border border-[#2a2a2a] hover:border-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {clientesFiltrados.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
          <p className="text-[#6b7280] text-sm">
            {hayFiltros ? "Sin resultados para los filtros aplicados" : "No hay clientes registrados"}
          </p>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="mt-3 text-[#B3985B] text-xs hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : view === "list" ? (
        /* ── LISTA (tabla) ── */
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Cliente", "Tipo", "Clasificación", "Servicio usual", "Responsable", "Tratos", "Proyectos", ""].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {clientesFiltrados.map(c => (
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
                  <td className="px-4 py-3">
                    <VendedorSelect
                      clienteId={c.id}
                      vendedor={c.vendedor}
                      usuarios={usuarios}
                      onChange={v => actualizarVendedor(c.id, v)}
                    />
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
          {clientesFiltrados.map(c => (
            <div key={c.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 hover:bg-[#141414] hover:border-[#2a2a2a] transition-all group">
              <Link href={`/crm/clientes/${c.id}`} className="block">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
                  <span className="text-[#B3985B] text-base font-bold">{c.nombre.charAt(0).toUpperCase()}</span>
                </div>
                <p className="text-white text-sm font-semibold leading-tight">{c.nombre}</p>
                {c.empresa && <p className="text-[#6b7280] text-xs mt-0.5">{c.empresa}</p>}
                {c.correo && <p className="text-[#444] text-xs mt-0.5 truncate">{c.correo}</p>}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <TipoBadge tipo={c.tipoCliente} />
                  <ClasificacionBadge clasificacion={c.clasificacion} />
                </div>
                {c.servicioUsual && (
                  <p className="text-[#555] text-xs mt-2">{TIPO_SERVICIO_LABELS[c.servicioUsual] ?? c.servicioUsual}</p>
                )}
              </Link>
              <div className="mt-3 flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <VendedorSelect
                  clienteId={c.id}
                  vendedor={c.vendedor}
                  usuarios={usuarios}
                  onChange={v => actualizarVendedor(c.id, v)}
                />
              </div>
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
            </div>
          ))}
        </div>
      )}
    </>
  );
}
