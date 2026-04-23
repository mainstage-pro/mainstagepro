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
  return new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

const hoy = () => new Date().toISOString().slice(0, 10);

const inputCls = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";

// ── Componente ────────────────────────────────────────────────────────────────

export default function CajaChicaPage() {
  const toast = useToast();
  const [saldo, setSaldo]           = useState<number | null>(null);
  const [movs, setMovs]             = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading]       = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando]   = useState(false);

  const [form, setForm] = useState({
    concepto: "", monto: "", fecha: hoy(), categoriaId: "", notas: "",
  });

  // ── Carga ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rc, rcat] = await Promise.all([
        fetch("/api/finanzas/caja-chica", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/categorias-financieras", { cache: "no-store" }).then(r => r.json()),
      ]);
      setSaldo(rc.saldo ?? 0);
      setMovs(rc.movimientos ?? []);
      setCategorias((rcat.categorias ?? []).filter((c: Categoria) => c.tipo === "GASTO"));
    } catch {
      toast.error("Error cargando caja chica");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // ── Guardar gasto ─────────────────────────────────────────────────────────

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
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error ?? "Error"); return; }
      toast.success("Gasto registrado");
      setForm({ concepto: "", monto: "", fecha: hoy(), categoriaId: "", notas: "" });
      setMostrarForm(false);
      await load();
    } finally {
      setGuardando(false);
    }
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
        <button
          onClick={() => setMostrarForm(v => !v)}
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {mostrarForm ? "Cancelar" : "+ Registrar gasto"}
        </button>
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
      {mostrarForm && (
        <form onSubmit={guardar} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-white mb-2">Registrar gasto</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Concepto <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                placeholder="Ej. Compra de papelería, taxi, etc."
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
                  type="number"
                  step="0.01"
                  min="0.01"
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
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={guardando}
              className="bg-[#B3985B] hover:bg-[#b8963e] disabled:opacity-50 text-black text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {guardando ? "Guardando..." : "Registrar gasto"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
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
              const esSalida = m.cuentaOrigen?.id === "caja-chica-mainstage";
              const esTrans  = m.tipo === "TRANSFERENCIA";

              // Determine sign: transfer IN = positive, gasto OUT = negative
              let signo: "+" | "-" = "-";
              let colorMonto = "text-red-400";
              if (esTrans) {
                // If destino is caja chica, it's a deposit
                if (m.cuentaDestino?.id === "caja-chica-mainstage") {
                  signo = "+"; colorMonto = "text-green-400";
                } else {
                  signo = "-"; colorMonto = "text-orange-400";
                }
              }

              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#151515] transition-colors">
                  {/* Tipo badge */}
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    esTrans && m.cuentaDestino?.id === "caja-chica-mainstage"
                      ? "bg-green-900/40 text-green-300"
                      : esTrans
                      ? "bg-orange-900/40 text-orange-300"
                      : "bg-red-900/40 text-red-300"
                  }`}>
                    {esTrans && m.cuentaDestino?.id === "caja-chica-mainstage" ? "↓" : esTrans ? "↑" : "G"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{m.concepto}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-gray-600 text-xs">{fmtDate(m.fecha)}</span>
                      {m.categoria && (
                        <span className="text-[10px] text-gray-600 bg-[#1e1e1e] px-1.5 py-0.5 rounded">{m.categoria.nombre}</span>
                      )}
                      {esTrans && m.cuentaOrigen && m.cuentaOrigen.id !== "caja-chica-mainstage" && (
                        <span className="text-[10px] text-green-600">desde {m.cuentaOrigen.nombre}</span>
                      )}
                      {m.creadoPor && (
                        <span className="text-[10px] text-gray-700">{m.creadoPor}</span>
                      )}
                    </div>
                    {m.notas && <p className="text-gray-600 text-xs mt-0.5 truncate">{m.notas}</p>}
                  </div>

                  {/* Monto */}
                  <p className={`shrink-0 text-sm font-bold ${colorMonto}`}>
                    {signo}{formatCurrency(m.monto)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Instrucción de recarga ───────────────────────────────────────────── */}
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">¿Cómo recargar la caja chica?</p>
        <p className="text-gray-500 text-sm">
          Ve a <strong className="text-gray-400">Finanzas → Movimientos</strong> y registra una{" "}
          <strong className="text-gray-400">Transferencia</strong> desde cualquier cuenta bancaria hacia la cuenta{" "}
          <strong className="text-[#B3985B]">Caja Chica</strong>. El saldo se actualizará automáticamente.
        </p>
      </div>
    </div>
  );
}
