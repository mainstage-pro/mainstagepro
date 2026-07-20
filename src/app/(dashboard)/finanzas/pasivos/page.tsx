"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Proveedor { id: string; nombre: string }

interface CuotaDeuda {
  id: string;
  numeroCuota: number;
  monto: number;
  fechaVencimiento: string;
  estado: string; // PENDIENTE | PAGADO | VENCIDO
  cuentaPagarId: string | null;
}

interface PasivoDeuda {
  id: string;
  nombre: string;
  acreedorNombre: string | null;
  descripcion: string | null;
  montoTotal: number;
  montoPagado: number;
  categoria: string;
  estado: string; // ACTIVO | LIQUIDADO | REFINANCIADO
  fechaAdquisicion: string;
  tasaInteres: number | null;
  notas: string | null;
  proveedor: { id: string; nombre: string } | null;
  cuotas: CuotaDeuda[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

const CAT_LABELS: Record<string, string> = {
  PROVEEDOR: "Proveedor", BANCARIO: "Bancario", FISCAL: "Fiscal", SOCIO: "Socio", OTRO: "Otro",
};
const CAT_COLORS: Record<string, string> = {
  PROVEEDOR: "text-blue-400 bg-blue-900/20 border-blue-700/40",
  BANCARIO: "text-purple-400 bg-purple-900/20 border-purple-700/40",
  FISCAL: "text-red-400 bg-red-900/20 border-red-700/40",
  SOCIO: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
  OTRO: "text-gray-400 bg-gray-800/20 border-gray-700/40",
};
const ESTADO_COLORS: Record<string, string> = {
  ACTIVO: "text-orange-400 bg-orange-900/20 border-orange-700/40",
  LIQUIDADO: "text-green-400 bg-green-900/20 border-green-700/40",
  REFINANCIADO: "text-blue-400 bg-blue-900/20 border-blue-700/40",
};

// ── Formulario de nueva deuda ──────────────────────────────────────────────────

const EMPTY_FORM = {
  nombre: "", proveedorId: "", acreedorNombre: "", descripcion: "",
  montoTotal: "", categoria: "PROVEEDOR", fechaAdquisicion: new Date().toISOString().slice(0, 10),
  tasaInteres: "", notas: "",
};

function hoy() { return new Date().toISOString().slice(0, 10); }

// ── Plan de pagos modal ────────────────────────────────────────────────────────

interface PlanModalProps {
  pasivo: PasivoDeuda;
  onClose: () => void;
  onSaved: () => void;
}

function PlanPagosModal({ pasivo, onClose, onSaved }: PlanModalProps) {
  const toast = useToast();
  const [numCuotas, setNumCuotas] = useState(pasivo.cuotas.length > 0 ? pasivo.cuotas.length : 1);
  const [draft, setDraft] = useState<{ monto: string; fecha: string }[]>(() => {
    if (pasivo.cuotas.length > 0) {
      return pasivo.cuotas.map(c => ({ monto: String(c.monto), fecha: c.fechaVencimiento.slice(0, 10) }));
    }
    const restante = pasivo.montoTotal - pasivo.montoPagado;
    return [{ monto: String(restante), fecha: hoy() }];
  });
  const [saving, setSaving] = useState(false);

  function updateNum(n: number) {
    setNumCuotas(n);
    const restante = pasivo.montoTotal - pasivo.montoPagado;
    const montoEq = restante / n;
    setDraft(Array.from({ length: n }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      return { monto: montoEq.toFixed(2), fecha: d.toISOString().slice(0, 10) };
    }));
  }

  function setField(i: number, key: string, val: string) {
    setDraft(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  }

  async function guardar() {
    const cuotas = draft.map(d => ({ monto: parseFloat(d.monto), fechaVencimiento: d.fecha }));
    if (cuotas.some(c => !c.monto || !c.fechaVencimiento)) {
      toast.error("Completa todos los campos del plan"); return;
    }
    setSaving(true);
    const r = await fetch(`/api/finanzas/pasivos/${pasivo.id}/plan-pagos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuotas }),
    });
    setSaving(false);
    if (r.ok) { toast.success("Plan de pagos guardado"); onSaved(); onClose(); }
    else { const d = await r.json(); toast.error(d.error || "Error al guardar"); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-[#1e1e1e]">
          <h2 className="text-white font-semibold text-base">Plan de pagos — {pasivo.nombre}</h2>
          <p className="text-gray-500 text-xs mt-1">
            Restante: {fmt(pasivo.montoTotal - pasivo.montoPagado)}
            <span className="text-[#333] ml-2">· Total deuda: {fmt(pasivo.montoTotal)}</span>
          </p>
        </div>
        <div className="p-5 space-y-4">
          {/* Num cuotas */}
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Número de cuotas</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 6, 8, 10, 12].map(n => (
                <button key={n} onClick={() => updateNum(n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${numCuotas === n ? "bg-[#B3985B] border-[#B3985B] text-black" : "border-[#2a2a2a] text-gray-400 hover:border-[#B3985B]/40"}`}>
                  {n}
                </button>
              ))}
              <input type="number" min={1} max={60} value={numCuotas} onChange={e => updateNum(parseInt(e.target.value) || 1)}
                className="w-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white text-center" />
            </div>
          </div>

          {/* Tabla de cuotas */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {draft.map((row, i) => (
              <div key={i} className="flex gap-2 items-center bg-[#1a1a1a] rounded-lg p-2.5 border border-[#222]">
                <span className="text-gray-600 text-xs w-5 text-right">{i + 1}</span>
                <div className="flex-1">
                  <input type="number" value={row.monto} onChange={e => setField(i, "monto", e.target.value)}
                    placeholder="Monto" className="w-full bg-transparent text-white text-xs border-b border-[#333] focus:border-[#B3985B] outline-none py-1" />
                </div>
                <div className="flex-1">
                  <input type="date" value={row.fecha} onChange={e => setField(i, "fecha", e.target.value)}
                    className="w-full bg-transparent text-white text-xs border-b border-[#333] focus:border-[#B3985B] outline-none py-1" />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between text-xs pt-2 border-t border-[#1e1e1e]">
            <span className="text-gray-500">Total del plan:</span>
            <span className={`font-semibold ${Math.abs(draft.reduce((s, r) => s + (parseFloat(r.monto) || 0), 0) - (pasivo.montoTotal - pasivo.montoPagado)) > 1 ? "text-red-400" : "text-green-400"}`}>
              {fmt(draft.reduce((s, r) => s + (parseFloat(r.monto) || 0), 0))}
              {" "}/ {fmt(pasivo.montoTotal - pasivo.montoPagado)}
            </span>
          </div>
        </div>
        <div className="p-5 border-t border-[#1e1e1e] flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9aa67] transition-colors disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function PasivosPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [pasivos, setPasivos] = useState<PasivoDeuda[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [planModal, setPlanModal] = useState<PasivoDeuda | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [pr, pv] = await Promise.all([
      fetch("/api/finanzas/pasivos", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/proveedores", { cache: "no-store" }).then(r => r.json()),
    ]);
    setPasivos(pr.pasivos || []);
    setProveedores(pv.proveedores || pv || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function crear() {
    if (!form.nombre || !form.montoTotal || !form.fechaAdquisicion) {
      toast.error("Completa los campos requeridos"); return;
    }
    setSaving(true);
    const r = await fetch("/api/finanzas/pasivos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) {
      toast.success("Deuda registrada");
      setForm(EMPTY_FORM);
      setShowForm(false);
      cargar();
    } else {
      const d = await r.json();
      toast.error(d.error || "Error al guardar");
    }
  }

  async function eliminar(p: PasivoDeuda) {
    if (!await confirm({ message: `¿Eliminar la deuda "${p.nombre}"? Esto eliminará también las cuotas y las cuentas por pagar generadas.`, danger: true, confirmText: "Eliminar" })) return;
    const r = await fetch(`/api/finanzas/pasivos/${p.id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Deuda eliminada"); cargar(); }
    else toast.error("Error al eliminar");
  }

  // ── Totales ────────────────────────────────────────────────────────────────
  const totalDeuda = pasivos.filter(p => p.estado === "ACTIVO").reduce((s, p) => s + p.montoTotal, 0);
  const totalPagado = pasivos.filter(p => p.estado === "ACTIVO").reduce((s, p) => s + p.montoPagado, 0);
  const totalPendiente = totalDeuda - totalPagado;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="ms-h1">Pasivos y Deudas</h1>
          <p className="ms-subtitle mt-0.5">Deudas estructurales — fuera del flujo operativo</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="ms-btn-primary flex-shrink-0">
          + Nueva deuda
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total adeudado", value: fmt(totalDeuda), color: "text-white" },
          { label: "Pagado", value: fmt(totalPagado), color: "text-green-400" },
          { label: "Pendiente", value: fmt(totalPendiente), color: "text-orange-400" },
        ].map(k => (
          <div key={k.label} className="ms-stat-card">
            <p className="text-gray-500 text-xs mb-1">{k.label}</p>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Formulario nueva deuda */}
      {showForm && (
        <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Nueva deuda / pasivo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Nombre de la deuda *</label>
              <input value={form.nombre} onChange={e => setF("nombre", e.target.value)}
                placeholder="ej. Crédito bancario 2025, Adeudo proveedor audio"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Monto total *</label>
              <input type="number" value={form.montoTotal} onChange={e => setF("montoTotal", e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Fecha de adquisición *</label>
              <input type="date" value={form.fechaAdquisicion} onChange={e => setF("fechaAdquisicion", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Categoría</label>
              <select value={form.categoria} onChange={e => setF("categoria", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none">
                {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Proveedor (catálogo)</label>
              <Combobox
                options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
                value={form.proveedorId}
                onChange={v => setF("proveedorId", v)}
                placeholder="Seleccionar proveedor..."
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Acreedor (nombre libre)</label>
              <input value={form.acreedorNombre} onChange={e => setF("acreedorNombre", e.target.value)}
                placeholder="Si no está en catálogo"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Tasa de interés anual (%)</label>
              <input type="number" step="0.01" value={form.tasaInteres} onChange={e => setF("tasaInteres", e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-gray-500 text-xs block mb-1">Descripción / notas</label>
              <textarea rows={2} value={form.notas} onChange={e => setF("notas", e.target.value)}
                placeholder="Contexto de la deuda, condiciones, etc."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:text-white transition-colors">
              Cancelar
            </button>
            <button onClick={crear} disabled={saving}
              className="px-6 py-2 rounded-xl bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9aa67] transition-colors disabled:opacity-50">
              {saving ? "Guardando..." : "Registrar deuda"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de deudas */}
      {loading ? (
        <div className="text-center py-16 text-gray-600">Cargando...</div>
      ) : pasivos.length === 0 ? (
        <div className="text-center py-16 text-gray-600 border border-dashed border-[#222] rounded-2xl">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">No hay deudas registradas</p>
          <p className="text-xs mt-1">Registra deudas estructurales que no forman parte del flujo operativo diario</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pasivos.map(p => {
            const pendiente = p.montoTotal - p.montoPagado;
            const pct = p.montoTotal > 0 ? (p.montoPagado / p.montoTotal) * 100 : 0;
            const cuotasPagadas = p.cuotas.filter(c => c.estado === "PAGADO").length;
            const isOpen = expanded === p.id;

            return (
              <div key={p.id} className="ms-card rounded-2xl overflow-hidden hover:border-[#2a2a2a] transition-colors">
                {/* Fila principal */}
                <div className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{p.nombre}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CAT_COLORS[p.categoria]}`}>
                        {CAT_LABELS[p.categoria]}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ESTADO_COLORS[p.estado]}`}>
                        {p.estado}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {p.proveedor?.nombre || p.acreedorNombre || "Sin acreedor"} · {fmtDate(p.fechaAdquisicion)}
                      {p.cuotas.length > 0 && ` · ${cuotasPagadas}/${p.cuotas.length} cuotas`}
                    </p>
                    {/* Barra de progreso */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-[#1e1e1e] rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-[#B3985B] transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] text-gray-600">Total</p>
                      <p className="text-white text-sm font-semibold">{fmt(p.montoTotal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600">Pagado</p>
                      <p className="text-green-400 text-sm font-semibold">{fmt(p.montoPagado)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600">Pendiente</p>
                      <p className="text-orange-400 text-sm font-semibold">{fmt(pendiente)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setPlanModal(p)}
                        className="px-3 py-1.5 rounded-lg border border-[#B3985B]/40 text-[#B3985B] text-xs hover:bg-[#B3985B]/10 transition-colors">
                        {p.cuotas.length > 0 ? "Ver plan" : "Plan de pagos"}
                      </button>
                      <button onClick={() => setExpanded(isOpen ? null : p.id)}
                        className="px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 text-xs hover:text-white transition-colors">
                        {isOpen ? "▲" : "▼"}
                      </button>
                      <button onClick={() => eliminar(p)}
                        className="px-3 py-1.5 rounded-lg border border-red-900/40 text-red-400 text-xs hover:bg-red-900/10 transition-colors">
                        ✕
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cuotas expandidas */}
                {isOpen && p.cuotas.length > 0 && (
                  <div className="border-t border-[#1e1e1e] px-4 py-3">
                    <p className="text-gray-500 text-xs mb-2">Plan de pagos generado ({p.cuotas.length} cuotas)</p>
                    <div className="space-y-1.5">
                      {p.cuotas.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Cuota {c.numeroCuota}</span>
                          <span className="text-gray-400">{fmtDate(c.fechaVencimiento)}</span>
                          <span className="text-white font-medium">{fmt(c.monto)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            c.estado === "PAGADO" ? "bg-green-900/30 text-green-400" :
                            c.estado === "VENCIDO" ? "bg-red-900/30 text-red-400" :
                            "bg-yellow-900/30 text-yellow-400"
                          }`}>{c.estado}</span>
                          {c.cuentaPagarId && (
                            <span className="text-[#B3985B] text-[10px]">CXP generada ✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isOpen && p.cuotas.length === 0 && (
                  <div className="border-t border-[#1e1e1e] px-4 py-3 text-center">
                    <p className="text-gray-600 text-xs">Sin plan de pagos. Haz clic en "Plan de pagos" para configurarlo.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal plan de pagos */}
      {planModal && (
        <PlanPagosModal
          pasivo={planModal}
          onClose={() => setPlanModal(null)}
          onSaved={cargar}
        />
      )}
    </div>
  );
}
