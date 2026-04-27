"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

interface Categoria { id: string; nombre: string; tipo: string; }
interface Cuenta { id: string; nombre: string; banco: string | null; }
interface Movimiento {
  id: string;
  fecha: string;
  tipo: string;
  concepto: string;
  monto: number;
  metodoPago: string;
  referencia: string | null;
  notas: string | null;
  categoriaId: string | null;
  cliente: { id: string; nombre: string } | null;
  proveedor: { id: string; nombre: string } | null;
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
  categoria: { id: string; nombre: string } | null;
  cuentaOrigen: { id: string; nombre: string; banco: string | null } | null;
  cuentaDestino: { id: string; nombre: string; banco: string | null } | null;
}

const TIPO_COLORS: Record<string, string> = {
  INGRESO: "bg-green-900/40 text-green-300",
  GASTO: "bg-red-900/40 text-red-300",
  TRANSFERENCIA: "bg-blue-900/40 text-blue-300",
  INVERSION: "bg-purple-900/40 text-purple-300",
  RETIRO: "bg-orange-900/40 text-orange-300",
};
const TIPO_LABELS: Record<string, string> = {
  INGRESO: "Ingreso", GASTO: "Gasto", TRANSFERENCIA: "Transferencia",
  INVERSION: "Inversión", RETIRO: "Retiro",
};

function fmtDate(s: string) {
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

const inputCls = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";

export default function MovimientosPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaFiltro, setCuentaFiltro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<Movimiento | null>(null);
  const [editando, setEditando] = useState<Movimiento | null>(null);
  const [editForm, setEditForm] = useState({ concepto: "", monto: "", fecha: "", notas: "", referencia: "", metodoPago: "", categoriaId: "", cuentaOrigenId: "", cuentaDestinoId: "" });
  const [guardando, setGuardando] = useState(false);

  const loadMovimientos = useCallback(async (cuentaId: string | null) => {
    const url = cuentaId ? `/api/movimientos?cuentaId=${cuentaId}` : "/api/movimientos";
    const rm = await fetch(url, { cache: "no-store" }).then(r => r.json());
    setMovimientos(rm.movimientos ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rc, rcu] = await Promise.all([
        fetch("/api/categorias-financieras", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/cuentas", { cache: "no-store" }).then(r => r.json()),
      ]);
      setCategorias(rc.categorias ?? []);
      setCuentas(rcu.cuentas ?? []);
      await loadMovimientos(null);
    } finally {
      setLoading(false);
    }
  }, [loadMovimientos]);

  useEffect(() => { load(); }, [load]);

  function abrirEditar(mov: Movimiento) {
    setEditando(mov);
    setEditForm({
      concepto: mov.concepto,
      monto: String(mov.monto),
      fecha: mov.fecha.slice(0, 10),
      notas: mov.notas ?? "",
      referencia: mov.referencia ?? "",
      metodoPago: mov.metodoPago,
      categoriaId: mov.categoriaId ?? "",
      cuentaOrigenId: mov.cuentaOrigen?.id ?? "",
      cuentaDestinoId: mov.cuentaDestino?.id ?? "",
    });
  }

  async function guardarEdicion() {
    if (!editando) return;
    setGuardando(true);
    try {
      const payload: Record<string, unknown> = { ...editForm, monto: parseFloat(editForm.monto) };
      // Solo enviar los campos de cuenta relevantes según el tipo
      if (editando.tipo === "GASTO" || editando.tipo === "RETIRO") {
        delete payload.cuentaDestinoId;
      } else if (editando.tipo === "INGRESO" || editando.tipo === "INVERSION") {
        delete payload.cuentaOrigenId;
      }
      const res = await fetch(`/api/movimientos/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      toast.success("Movimiento actualizado");
      setEditando(null);
      await loadMovimientos(cuentaFiltro);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(mov: Movimiento) {
    if (!await confirm({ message: `¿Eliminar el movimiento "${mov.concepto}" por ${formatCurrency(mov.monto)}? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/movimientos/${mov.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Movimiento eliminado");
      await loadMovimientos(cuentaFiltro);
    } else {
      const d = await res.json();
      toast.error(d.error ?? "No se pudo eliminar");
    }
  }

  // Cuando hay filtro, la API ya devuelve solo los de esa cuenta (server-side)
  const movimientosFiltrados = movimientos;

  // Cuando hay filtro de cuenta: entradas/salidas por flujo real en esa cuenta (incluye transferencias)
  // Sin filtro: visión general ingresos vs gastos del negocio
  const ingresos = cuentaFiltro
    ? movimientosFiltrados.filter(m => m.cuentaDestino?.id === cuentaFiltro).reduce((s, m) => s + m.monto, 0)
    : movimientosFiltrados.filter(m => m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0);
  const gastos = cuentaFiltro
    ? movimientosFiltrados.filter(m => m.cuentaOrigen?.id === cuentaFiltro).reduce((s, m) => s + m.monto, 0)
    : movimientosFiltrados.filter(m => m.tipo === "GASTO").reduce((s, m) => s + m.monto, 0);

  const categoriasFiltradas = categorias.filter(c =>
    editando ? (editando.tipo === "INGRESO" ? c.tipo === "INGRESO" : c.tipo === "GASTO") : true
  );

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Movimientos</h1>
          <p className="text-[#6b7280] text-sm">{movimientosFiltrados.length} movimientos{cuentaFiltro ? ` · ${cuentas.find(c => c.id === cuentaFiltro)?.nombre}` : " · todas las cuentas"}</p>
        </div>
        <a href="/finanzas/movimientos/nuevo"
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
          + Registrar movimiento
        </a>
      </div>

      {/* Filtros por cuenta */}
      {cuentas.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button
            onClick={async () => { setCuentaFiltro(null); setLoading(true); await loadMovimientos(null); setLoading(false); }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              cuentaFiltro === null
                ? "bg-[#B3985B] border-[#B3985B] text-black font-semibold"
                : "border-[#333] text-[#6b7280] hover:border-[#555] hover:text-white"
            }`}
          >
            Todas
          </button>
          {cuentas.map(c => (
            <button
              key={c.id}
              onClick={async () => {
                const next = c.id === cuentaFiltro ? null : c.id;
                setCuentaFiltro(next);
                setLoading(true);
                await loadMovimientos(next);
                setLoading(false);
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                cuentaFiltro === c.id
                  ? "bg-[#B3985B] border-[#B3985B] text-black font-semibold"
                  : "border-[#333] text-[#6b7280] hover:border-[#555] hover:text-white"
              }`}
            >
              {c.nombre}{c.banco ? ` · ${c.banco}` : ""}
            </button>
          ))}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">{cuentaFiltro ? "Entradas" : "Ingresos"}</p>
          <p className="text-green-400 text-xl font-semibold">{formatCurrency(ingresos)}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">{cuentaFiltro ? "Salidas" : "Gastos"}</p>
          <p className="text-red-400 text-xl font-semibold">{formatCurrency(gastos)}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">{cuentaFiltro ? "Saldo neto" : "Balance"}</p>
          <p className={`text-xl font-semibold ${ingresos - gastos >= 0 ? "text-white" : "text-red-400"}`}>
            {formatCurrency(ingresos - gastos)}
          </p>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-[#6b7280] text-sm">Cargando...</div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] text-sm">Sin movimientos{cuentaFiltro ? " en esta cuenta" : " registrados"}</p>
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Fecha", "Concepto", "Categoría", "Cuenta", "Tipo", "Monto", ""].map((h, i) => (
                  <th key={i} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium last:w-16">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {movimientosFiltrados.map(mov => (
                <tr key={mov.id} onClick={() => setDetalle(mov)} className="hover:bg-[#1a1a1a] transition-colors group cursor-pointer">
                  <td className="px-4 py-3 text-xs text-[#6b7280] whitespace-nowrap">{fmtDate(mov.fecha)}</td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{mov.concepto}</p>
                    {mov.cliente && <Link href={`/crm/clientes/${mov.cliente.id}`} className="text-[#6b7280] text-xs hover:text-[#B3985B] transition-colors">{mov.cliente.nombre}</Link>}
                    {mov.proyecto && <Link href={`/proyectos/${mov.proyecto.id}`} className="text-[#555] text-xs hover:text-[#B3985B] transition-colors block">{mov.proyecto.nombre}</Link>}
                    {mov.referencia && <span className="text-[#555] text-[10px]">Ref: {mov.referencia}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">{mov.categoria?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {mov.tipo === "TRANSFERENCIA" && mov.cuentaOrigen && mov.cuentaDestino
                      ? <span>{mov.cuentaOrigen.nombre} <span className="text-[#555]">→</span> {mov.cuentaDestino.nombre}</span>
                      : mov.cuentaDestino?.nombre ?? mov.cuentaOrigen?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[mov.tipo] ?? "bg-gray-800 text-gray-400"}`}>
                      {TIPO_LABELS[mov.tipo] ?? mov.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right whitespace-nowrap">
                    {(() => {
                      const esEntrada = cuentaFiltro
                        ? mov.cuentaDestino?.id === cuentaFiltro
                        : mov.tipo === "INGRESO";
                      const esSalida = cuentaFiltro
                        ? mov.cuentaOrigen?.id === cuentaFiltro
                        : mov.tipo === "GASTO";
                      return (
                        <span className={esEntrada ? "text-green-400" : esSalida ? "text-red-400" : "text-white"}>
                          {esSalida ? "-" : "+"}{formatCurrency(mov.monto)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); abrirEditar(mov); }}
                        className="p-1.5 rounded text-[#555] hover:text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors"
                        title="Editar">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); eliminar(mov); }}
                        className="p-1.5 rounded text-[#555] hover:text-red-400 hover:bg-red-900/20 transition-colors"
                        title="Eliminar">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setDetalle(null); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[detalle.tipo] ?? "bg-gray-800 text-gray-400"}`}>
                  {TIPO_LABELS[detalle.tipo] ?? detalle.tipo}
                </span>
                <span className="text-[#6b7280] text-xs">{fmtDate(detalle.fecha)}</span>
              </div>
              <button onClick={() => setDetalle(null)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
            </div>

            <p className="text-white font-semibold text-base mb-1">{detalle.concepto}</p>
            <p className={`text-2xl font-bold mb-5 ${
              cuentaFiltro
                ? detalle.cuentaDestino?.id === cuentaFiltro ? "text-green-400"
                  : detalle.cuentaOrigen?.id === cuentaFiltro ? "text-red-400" : "text-white"
                : detalle.tipo === "INGRESO" ? "text-green-400" : detalle.tipo === "GASTO" ? "text-red-400" : "text-white"
            }`}>
              {formatCurrency(detalle.monto)}
            </p>

            <div className="space-y-2 text-sm">
              {/* Cuenta origen / destino */}
              {detalle.tipo === "TRANSFERENCIA" && detalle.cuentaOrigen && detalle.cuentaDestino ? (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Cuenta</span>
                  <span className="text-white text-right">{detalle.cuentaOrigen.nombre} → {detalle.cuentaDestino.nombre}</span>
                </div>
              ) : (detalle.cuentaDestino || detalle.cuentaOrigen) && (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Cuenta</span>
                  <span className="text-white">{detalle.cuentaDestino?.nombre ?? detalle.cuentaOrigen?.nombre}</span>
                </div>
              )}
              {detalle.metodoPago && (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Método de pago</span>
                  <span className="text-white">{detalle.metodoPago.charAt(0) + detalle.metodoPago.slice(1).toLowerCase()}</span>
                </div>
              )}
              {detalle.categoria && (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Categoría</span>
                  <span className="text-white">{detalle.categoria.nombre}</span>
                </div>
              )}
              {detalle.cliente && (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Cliente</span>
                  <Link href={`/crm/clientes/${detalle.cliente.id}`} onClick={() => setDetalle(null)} className="text-[#B3985B] hover:underline">{detalle.cliente.nombre}</Link>
                </div>
              )}
              {detalle.proveedor && (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Proveedor</span>
                  <span className="text-white">{detalle.proveedor.nombre}</span>
                </div>
              )}
              {detalle.proyecto && (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Proyecto</span>
                  <Link href={`/proyectos/${detalle.proyecto.id}`} onClick={() => setDetalle(null)} className="text-[#B3985B] hover:underline">{detalle.proyecto.nombre}</Link>
                </div>
              )}
              {detalle.referencia && (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Referencia</span>
                  <span className="text-white">{detalle.referencia}</span>
                </div>
              )}
              {detalle.notas && (
                <div className="pt-2 border-t border-[#1e1e1e]">
                  <p className="text-[#6b7280] text-xs mb-1">Notas</p>
                  <p className="text-white text-sm whitespace-pre-wrap">{detalle.notas}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setDetalle(null)} className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                Cerrar
              </button>
              <button onClick={() => { abrirEditar(detalle); setDetalle(null); }}
                className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#333] text-white text-sm hover:border-[#B3985B] transition-colors">
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setEditando(null); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Editar movimiento</h3>
              <button onClick={() => setEditando(null)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Concepto</label>
                <input value={editForm.concepto} onChange={e => setEditForm(p => ({ ...p, concepto: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monto</label>
                  <input type="number" step="0.01" min="0" value={editForm.monto}
                    onChange={e => setEditForm(p => ({ ...p, monto: e.target.value }))} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Fecha</label>
                  <input type="date" value={editForm.fecha} onChange={e => setEditForm(p => ({ ...p, fecha: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Categoría</label>
                <Combobox
                  value={editForm.categoriaId}
                  onChange={v => setEditForm(p => ({ ...p, categoriaId: v }))}
                  options={[{ value: "", label: "— Sin categoría —" }, ...categoriasFiltradas.map(c => ({ value: c.id, label: c.nombre }))]}
                  className={inputCls}
                />
              </div>
              {/* Cuenta — solo para movimientos no-TRANSFERENCIA */}
              {editando && editando.tipo !== "TRANSFERENCIA" && cuentas.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    {editando.tipo === "INGRESO" || editando.tipo === "INVERSION" ? "Cuenta destino (ingresa a)" : "Cuenta origen (sale de)"}
                  </label>
                  <Combobox
                    value={editando.tipo === "INGRESO" || editando.tipo === "INVERSION" ? editForm.cuentaDestinoId : editForm.cuentaOrigenId}
                    onChange={v => {
                      if (editando.tipo === "INGRESO" || editando.tipo === "INVERSION") {
                        setEditForm(p => ({ ...p, cuentaDestinoId: v }));
                      } else {
                        setEditForm(p => ({ ...p, cuentaOrigenId: v }));
                      }
                    }}
                    options={[{ value: "", label: "— Sin cuenta —" }, ...cuentas.map(c => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") }))]}
                    className={inputCls}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Referencia / Folio</label>
                <input value={editForm.referencia} onChange={e => setEditForm(p => ({ ...p, referencia: e.target.value }))} className={inputCls} placeholder="Núm. transferencia, folio..." />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notas</label>
                <textarea value={editForm.notas} onChange={e => setEditForm(p => ({ ...p, notas: e.target.value }))} rows={2}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditando(null)} className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={guardarEdicion} disabled={guardando || !editForm.concepto || !editForm.monto}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c4aa6b] disabled:opacity-40 transition-colors">
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
