"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { Combobox } from "@/components/Combobox";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Categoria { id: string; nombre: string; tipo: string; }

interface Movimiento {
  id: string;
  fecha: string;
  tipo: string;
  concepto: string;
  monto: number;
  notas: string | null;
  creadoPor: string | null;
  categoria: { id: string; nombre: string } | null;
  cuentaOrigen:  { id: string; nombre: string } | null;
  cuentaDestino: { id: string; nombre: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

const hoy = () => new Date().toISOString().slice(0, 10);

const inputCls = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";

// ── Modal editar ──────────────────────────────────────────────────────────────

function ModalEditar({
  mov,
  categorias,
  onClose,
  onSaved,
}: {
  mov: Movimiento;
  categorias: Categoria[];
  onClose: () => void;
  onSaved: (updated: Movimiento) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    concepto:   mov.concepto,
    monto:      String(mov.monto),
    fecha:      mov.fecha.substring(0, 10),
    categoriaId: mov.categoria?.id ?? "",
    notas:      mov.notas ?? "",
  });
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.concepto || !form.monto || !form.fecha) {
      toast.error("Concepto, monto y fecha son requeridos");
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch(`/api/movimientos/${mov.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error ?? "Error al guardar"); return; }
      toast.success("Movimiento actualizado");
      onSaved({ ...mov, ...data.movimiento, categoria: categorias.find(c => c.id === form.categoriaId) ?? null });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <h3 className="text-white font-semibold text-sm">Editar movimiento</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>

        <form onSubmit={guardar} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Concepto</label>
            <input
              className={inputCls}
              value={form.concepto}
              onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Monto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  className={inputCls + " pl-7"}
                  type="number" step="0.01" min="0.01"
                  value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
              <input
                className={inputCls}
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
            <Combobox
              value={form.categoriaId}
              onChange={v => setForm(f => ({ ...f, categoriaId: v }))}
              options={[{ value: "", label: "Sin categoría" }, ...categorias.map(c => ({ value: c.id, label: c.nombre }))]}
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notas</label>
            <input
              className={inputCls}
              placeholder="Opcional"
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-[#B3985B] hover:bg-[#b8963e] disabled:opacity-50 text-black text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CajaChicaPage() {
  const toast = useToast();
  const [saldo, setSaldo]           = useState<number | null>(null);
  const [movs, setMovs]             = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading]       = useState(true);
  const [formTipo, setFormTipo] = useState<"GASTO" | "RECARGA" | null>(null);
  const [guardando, setGuardando]   = useState(false);
  const [editando, setEditando]     = useState<Movimiento | null>(null);
  const [cuentas, setCuentas]       = useState<{ id: string; nombre: string }[]>([]);

  const [form, setForm] = useState({
    concepto: "", monto: "", fecha: hoy(), categoriaId: "", notas: "", cuentaOrigenId: "",
  });

  // ── Carga ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rc, rcat, rcuentas] = await Promise.all([
        fetch("/api/finanzas/caja-chica", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/categorias-financieras", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/cuentas", { cache: "no-store" }).then(r => r.json()),
      ]);
      setSaldo(rc.saldo ?? 0);
      setMovs(rc.movimientos ?? []);
      setCategorias((rcat.categorias ?? []).filter((c: Categoria) => c.tipo === "GASTO"));
      setCuentas((rcuentas.cuentas ?? []).filter((c: { id: string }) => c.id !== "caja-chica-mainstage"));
    } catch {
      toast.error("Error cargando caja chica");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // ── Guardar gasto ─────────────────────────────────────────────────────────

  function abrirForm(tipo: "GASTO" | "RECARGA") {
    setFormTipo(tipo);
    setForm({
      concepto: tipo === "RECARGA" ? "Recarga caja chica" : "",
      monto: "",
      fecha: hoy(),
      categoriaId: "",
      notas: "",
      cuentaOrigenId: "",
    });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.concepto || !form.monto || !form.fecha) {
      toast.error("Concepto, monto y fecha son requeridos");
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch("/api/finanzas/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tipo: formTipo }),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error ?? "Error"); return; }
      toast.success(formTipo === "RECARGA" ? "Recarga registrada" : "Gasto registrado");
      setFormTipo(null);
      await load();
    } finally {
      setGuardando(false);
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  async function eliminar(mov: Movimiento) {
    if (!confirm(`¿Eliminar "${mov.concepto}"? Esta acción no se puede deshacer.`)) return;
    const r = await fetch(`/api/movimientos/${mov.id}`, { method: "DELETE" });
    const data = await r.json();
    if (!r.ok) { toast.error(data.error ?? "Error al eliminar"); return; }
    toast.success("Movimiento eliminado");
    setMovs(prev => prev.filter(m => m.id !== mov.id));
    setSaldo(prev => prev !== null ? prev + mov.monto : prev);
  }

  // ── Saldo UI ──────────────────────────────────────────────────────────────

  const saldoBajo   = saldo !== null && saldo < 1000;
  const saldoMedio  = saldo !== null && saldo >= 1000 && saldo < 3000;
  const saldoColor  = saldoBajo ? "text-red-400" : saldoMedio ? "text-yellow-400" : "text-green-400";
  const saldoBg     = saldoBajo ? "border-red-700/40 bg-red-900/10" : saldoMedio ? "border-yellow-700/40 bg-yellow-900/10" : "border-green-700/40 bg-green-900/10";

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 text-sm">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Caja Chica</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gastos operativos y emergencias de oficina</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => formTipo === "RECARGA" ? setFormTipo(null) : abrirForm("RECARGA")}
            className="bg-[#1a1a1a] border border-green-700/50 hover:bg-green-900/20 text-green-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {formTipo === "RECARGA" ? "Cancelar" : "↓ Recarga"}
          </button>
          <button
            onClick={() => formTipo === "GASTO" ? setFormTipo(null) : abrirForm("GASTO")}
            className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {formTipo === "GASTO" ? "Cancelar" : "+ Registrar gasto"}
          </button>
        </div>
      </div>

      {/* ── Saldo ───────────────────────────────────────────────────────────── */}
      <div className={`border rounded-xl p-6 flex items-center justify-between ${saldoBg}`}>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Saldo disponible</p>
          <p className={`text-4xl font-bold ${saldoColor}`}>
            {saldo !== null ? formatCurrency(saldo) : "—"}
          </p>
        </div>
        <div className="text-right">
          {saldoBajo && (
            <span className="text-xs font-bold text-red-400 bg-red-900/30 border border-red-700/40 px-3 py-1 rounded-full">
              Saldo bajo · Solicitar recarga
            </span>
          )}
          {saldoMedio && (
            <span className="text-xs font-bold text-yellow-400 bg-yellow-900/30 border border-yellow-700/40 px-3 py-1 rounded-full">
              Saldo moderado
            </span>
          )}
          {!saldoBajo && !saldoMedio && saldo !== null && (
            <span className="text-xs font-bold text-green-400 bg-green-900/30 border border-green-700/40 px-3 py-1 rounded-full">
              Saldo OK
            </span>
          )}
        </div>
      </div>

      {/* ── Alerta saldo bajo ────────────────────────────────────────────────── */}
      {saldoBajo && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-lg mt-0.5">⚠</span>
          <div>
            <p className="text-red-400 font-semibold text-sm">Saldo insuficiente</p>
            <p className="text-red-300/70 text-xs mt-0.5">
              El saldo está por debajo de $1,000. Administración ha sido notificada para realizar una recarga.
              La recarga se hace desde <strong className="text-red-300">Finanzas → Movimientos</strong> como una transferencia hacia la cuenta <strong className="text-red-300">Caja Chica</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ── Formulario ──────────────────────────────────────────────────────── */}
      {formTipo && (
        <form onSubmit={guardar} className={`border rounded-xl p-5 space-y-4 ${formTipo === "RECARGA" ? "bg-[#0d1a0d] border-green-800/40" : "bg-[#111] border-[#1e1e1e]"}`}>
          <p className={`text-sm font-semibold mb-2 ${formTipo === "RECARGA" ? "text-green-400" : "text-white"}`}>
            {formTipo === "RECARGA" ? "↓ Registrar recarga a caja chica" : "Registrar gasto"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Concepto <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                placeholder={formTipo === "RECARGA" ? "Ej. Recarga caja chica, depósito efectivo..." : "Ej. Compra de papelería, taxi, etc."}
                value={form.concepto}
                onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Monto <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  className={inputCls + " pl-7"}
                  type="number" step="0.01" min="0.01"
                  placeholder="0.00"
                  value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              />
            </div>

            {formTipo === "RECARGA" ? (
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Cuenta origen (opcional)</label>
                <Combobox
                  value={form.cuentaOrigenId}
                  onChange={v => setForm(f => ({ ...f, cuentaOrigenId: v }))}
                  options={[{ value: "", label: "— Sin cuenta (efectivo) —" }, ...cuentas.map(c => ({ value: c.id, label: c.nombre }))]}
                  className={inputCls}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                <Combobox
                  value={form.categoriaId}
                  onChange={v => setForm(f => ({ ...f, categoriaId: v }))}
                  options={[{ value: "", label: "Sin categoría" }, ...categorias.map(c => ({ value: c.id, label: c.nombre }))]}
                  className={inputCls}
                />
              </div>
            )}

            <div className={formTipo === "RECARGA" ? "" : ""}>
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <input
                className={inputCls}
                placeholder="Opcional"
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={guardando}
              className={`disabled:opacity-50 text-sm font-semibold px-5 py-2 rounded-lg transition-colors ${formTipo === "RECARGA" ? "bg-green-700 hover:bg-green-600 text-white" : "bg-[#B3985B] hover:bg-[#b8963e] text-black"}`}
            >
              {guardando ? "Guardando..." : formTipo === "RECARGA" ? "Registrar recarga" : "Registrar gasto"}
            </button>
            <button
              type="button"
              onClick={() => setFormTipo(null)}
              className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-[#333] hover:border-[#555] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Historial ───────────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Historial de movimientos</p>
          <span className="text-xs text-gray-600">{movs.length} registros</span>
        </div>

        {movs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-sm">Sin movimientos registrados</p>
            <p className="text-gray-700 text-xs mt-1">Los gastos aparecerán aquí una vez registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {movs.map(m => {
              const esDeposito = m.cuentaDestino?.id === "caja-chica-mainstage";
              const esTransSalida = m.tipo === "TRANSFERENCIA" && !esDeposito;
              const signo: "+" | "-" = esDeposito ? "+" : "-";
              const colorMonto = esDeposito ? "text-green-400" : esTransSalida ? "text-orange-400" : "text-red-400";
              const esEditable = m.tipo !== "TRANSFERENCIA";

              return (
                <div key={m.id} className="group flex items-center gap-4 px-5 py-3 hover:bg-[#151515] transition-colors">
                  {/* Tipo badge */}
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    esDeposito ? "bg-green-900/40 text-green-300" : esTransSalida ? "bg-orange-900/40 text-orange-300" : "bg-red-900/40 text-red-300"
                  }`}>
                    {esDeposito ? "↓" : esTransSalida ? "↑" : "G"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{m.concepto}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-gray-600 text-xs">{fmtDate(m.fecha)}</span>
                      {m.categoria && (
                        <span className="text-[10px] text-gray-600 bg-[#1e1e1e] px-1.5 py-0.5 rounded">{m.categoria.nombre}</span>
                      )}
                      {esDeposito && m.cuentaOrigen && (
                        <span className="text-[10px] text-green-600">desde {m.cuentaOrigen.nombre}</span>
                      )}
                      {m.creadoPor && (
                        <span className="text-[10px] text-gray-700">{m.creadoPor}</span>
                      )}
                      {m.notas && <span className="text-[10px] text-gray-600 truncate max-w-[160px]">{m.notas}</span>}
                    </div>
                  </div>

                  {/* Monto + acciones */}
                  <div className="shrink-0 flex items-center gap-2">
                    {esEditable && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditando(m)}
                          className="text-[11px] text-gray-500 hover:text-[#B3985B] px-2 py-1 rounded transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminar(m)}
                          className="text-[11px] text-gray-500 hover:text-red-400 px-2 py-1 rounded transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                    <p className={`text-sm font-bold ${colorMonto}`}>
                      {signo}{formatCurrency(m.monto)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* ── Modal editar ────────────────────────────────────────────────────── */}
      {editando && (
        <ModalEditar
          mov={editando}
          categorias={categorias}
          onClose={() => setEditando(null)}
          onSaved={updated => {
            setMovs(prev => prev.map(m => m.id === updated.id ? updated : m));
            setEditando(null);
            toast.success("Movimiento actualizado");
            load();
          }}
        />
      )}
    </div>
  );
}
