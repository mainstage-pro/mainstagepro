"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

interface Categoria { id: string; nombre: string; tipo: string; }
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
  return new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

const inputCls = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";

export default function MovimientosPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Movimiento | null>(null);
  const [editForm, setEditForm] = useState({ concepto: "", monto: "", fecha: "", notas: "", referencia: "", metodoPago: "", categoriaId: "" });
  const [guardando, setGuardando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rm, rc] = await Promise.all([
        fetch("/api/movimientos", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/categorias-financieras", { cache: "no-store" }).then(r => r.json()),
      ]);
      setMovimientos(rm.movimientos ?? []);
      setCategorias(rc.categorias ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

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
    });
  }

  async function guardarEdicion() {
    if (!editando) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/movimientos/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, monto: parseFloat(editForm.monto) }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      toast.success("Movimiento actualizado");
      setEditando(null);
      await load();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(mov: Movimiento) {
    if (!await confirm({ message: `¿Eliminar el movimiento "${mov.concepto}" por ${formatCurrency(mov.monto)}? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/movimientos/${mov.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Movimiento eliminado");
      await load();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "No se pudo eliminar");
    }
  }

  const ingresos = movimientos.filter(m => m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0);
  const gastos = movimientos.filter(m => m.tipo === "GASTO").reduce((s, m) => s + m.monto, 0);

  const categoriasFiltradas = categorias.filter(c =>
    editando ? (editando.tipo === "INGRESO" ? c.tipo === "INGRESO" : c.tipo === "GASTO") : true
  );

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Movimientos</h1>
          <p className="text-[#6b7280] text-sm">{movimientos.length} movimientos recientes</p>
        </div>
        <a href="/finanzas/movimientos/nuevo"
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
          + Registrar movimiento
        </a>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Ingresos</p>
          <p className="text-green-400 text-xl font-semibold">{formatCurrency(ingresos)}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Gastos</p>
          <p className="text-red-400 text-xl font-semibold">{formatCurrency(gastos)}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Balance</p>
          <p className={`text-xl font-semibold ${ingresos - gastos >= 0 ? "text-white" : "text-red-400"}`}>
            {formatCurrency(ingresos - gastos)}
          </p>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-[#6b7280] text-sm">Cargando...</div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] text-sm">Sin movimientos registrados</p>
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
              {movimientos.map(mov => (
                <tr key={mov.id} className="hover:bg-[#1a1a1a] transition-colors group">
                  <td className="px-4 py-3 text-xs text-[#6b7280] whitespace-nowrap">{fmtDate(mov.fecha)}</td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{mov.concepto}</p>
                    {mov.cliente && <Link href={`/crm/clientes/${mov.cliente.id}`} className="text-[#6b7280] text-xs hover:text-[#B3985B] transition-colors">{mov.cliente.nombre}</Link>}
                    {mov.proyecto && <Link href={`/proyectos/${mov.proyecto.id}`} className="text-[#555] text-xs hover:text-[#B3985B] transition-colors block">{mov.proyecto.nombre}</Link>}
                    {mov.referencia && <span className="text-[#555] text-[10px]">Ref: {mov.referencia}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">{mov.categoria?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">{mov.cuentaDestino?.nombre ?? mov.cuentaOrigen?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[mov.tipo] ?? "bg-gray-800 text-gray-400"}`}>
                      {TIPO_LABELS[mov.tipo] ?? mov.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right whitespace-nowrap">
                    <span className={mov.tipo === "INGRESO" ? "text-green-400" : mov.tipo === "GASTO" ? "text-red-400" : "text-white"}>
                      {mov.tipo === "GASTO" ? "-" : "+"}{formatCurrency(mov.monto)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirEditar(mov)}
                        className="p-1.5 rounded text-[#555] hover:text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors"
                        title="Editar">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={() => eliminar(mov)}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Método de pago</label>
                  <select value={editForm.metodoPago} onChange={e => setEditForm(p => ({ ...p, metodoPago: e.target.value }))} className={inputCls}>
                    {["TRANSFERENCIA", "EFECTIVO", "CHEQUE", "TARJETA"].map(m => (
                      <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Categoría</label>
                  <select value={editForm.categoriaId} onChange={e => setEditForm(p => ({ ...p, categoriaId: e.target.value }))} className={inputCls}>
                    <option value="">— Sin categoría —</option>
                    {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>
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
