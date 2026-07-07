"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Socio { id: string; nombre: string; pctParticipacion: number | null }

interface CuotaReparto {
  id: string;
  periodo: string;
  monto: number;
  estado: string;
  cuentaPagarId: string | null;
  createdAt: string;
}

interface RepartoUtilidad {
  id: string;
  nombre: string;
  beneficiario: string;
  descripcion: string | null;
  montoBase: number;
  tipoPeriodo: string;
  baseCalculo: string;
  pctCalculo: number | null;
  activo: boolean;
  notas: string | null;
  socio: { id: string; nombre: string; pctParticipacion: number | null } | null;
  cuotas: CuotaReparto[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const PERIODO_LABELS: Record<string, string> = {
  SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual", UNICO: "Único",
};
const BASE_LABELS: Record<string, string> = {
  FIJO: "Monto fijo", PCT_UTILIDAD: "% Utilidad", PCT_APORTACION: "% Aportación",
};

function getPeriodoActual(tipo: string): string {
  const now = new Date();
  if (tipo === "SEMANAL") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return now.toISOString().slice(0, 7);
}

const EMPTY_FORM = {
  nombre: "", socioId: "", beneficiario: "", descripcion: "",
  montoBase: "", tipoPeriodo: "SEMANAL", baseCalculo: "FIJO", pctCalculo: "", notas: "",
};

// ── Modal generar cuota ────────────────────────────────────────────────────────

function GenerarCuotaModal({
  reparto, onClose, onSaved,
}: { reparto: RepartoUtilidad; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [periodo, setPeriodo] = useState(getPeriodoActual(reparto.tipoPeriodo));
  const [monto, setMonto] = useState(String(reparto.montoBase));
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function generar() {
    setSaving(true);
    const r = await fetch(`/api/finanzas/repartos/${reparto.id}/generar-cuota`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodo, montoOverride: parseFloat(monto), fechaCompromiso: fecha }),
    });
    setSaving(false);
    if (r.ok) { toast.success("Cuota generada y CXP creada"); onSaved(); onClose(); }
    else { const d = await r.json(); toast.error(d.error || "Error al generar"); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="p-5 border-b border-[#1e1e1e]">
          <h2 className="text-white font-semibold text-base">Generar cuota de reparto</h2>
          <p className="text-gray-500 text-xs mt-1">{reparto.beneficiario} · {PERIODO_LABELS[reparto.tipoPeriodo]}</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-gray-500 text-xs block mb-1">Período</label>
            <input value={periodo} onChange={e => setPeriodo(e.target.value)}
              placeholder="ej. 2026-07 o 2026-W28"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Monto</label>
            <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Fecha compromiso</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
          </div>
          <div className="bg-[#1a1a1a] border border-[#B3985B]/20 rounded-xl p-3 text-xs text-[#B3985B]">
            ✓ Se creará automáticamente una Cuenta por Pagar en el módulo de cobros y pagos con badge "Reparto de Utilidades"
          </div>
        </div>
        <div className="p-5 border-t border-[#1e1e1e] flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
          <button onClick={generar} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9aa67] transition-colors disabled:opacity-50">
            {saving ? "Generando..." : "Generar cuota"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function RepartosPage() {
  const toast = useToast();
  const [repartos, setRepartos] = useState<RepartoUtilidad[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cuotaModal, setCuotaModal] = useState<RepartoUtilidad | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [rr, ss] = await Promise.all([
      fetch("/api/finanzas/repartos", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/socios", { cache: "no-store" }).then(r => r.json()),
    ]);
    setRepartos(rr.repartos || []);
    setSocios(ss.socios || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const setF = (k: string, v: string) => {
    setForm(p => {
      const n = { ...p, [k]: v };
      if (k === "socioId" && v) {
        const s = socios.find(s => s.id === v);
        if (s) n.beneficiario = s.nombre;
      }
      return n;
    });
  };

  async function crear() {
    if (!form.nombre || !form.beneficiario || !form.montoBase) {
      toast.error("Completa los campos requeridos"); return;
    }
    setSaving(true);
    const r = await fetch("/api/finanzas/repartos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) {
      toast.success("Reparto registrado");
      setForm(EMPTY_FORM);
      setShowForm(false);
      cargar();
    } else {
      const d = await r.json();
      toast.error(d.error || "Error al guardar");
    }
  }

  // Totales
  const totalMensual = repartos.filter(r => r.activo).reduce((s, r) => {
    const factor = r.tipoPeriodo === "SEMANAL" ? 4.33 : r.tipoPeriodo === "QUINCENAL" ? 2 : 1;
    return s + r.montoBase * factor;
  }, 0);
  const totalPagado = repartos.reduce((s, r) => s + r.cuotas.filter(c => c.estado === "PAGADO").reduce((a, c) => a + c.monto, 0), 0);
  const totalPendiente = repartos.reduce((s, r) => s + r.cuotas.filter(c => c.estado === "PENDIENTE").reduce((a, c) => a + c.monto, 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Reparto de Utilidades</h1>
          <p className="text-gray-500 text-sm mt-0.5">Pagos a socios — se registran después de la utilidad neta</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9aa67] transition-colors flex-shrink-0">
          + Nuevo reparto
        </button>
      </div>

      {/* Banner estructura societaria */}
      <div className="bg-[#0e0e0e] border border-[#B3985B]/20 rounded-2xl p-4">
        <p className="text-[#B3985B] text-xs font-semibold mb-1">Estructura societaria — Escenario Principal S.A. de C.V.</p>
        <div className="flex gap-4 flex-wrap">
          {socios.filter(s => s.pctParticipacion).map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#B3985B]" />
              <span className="text-white text-xs font-medium">{s.nombre}</span>
              <span className="text-[#B3985B] text-xs">{s.pctParticipacion}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Estimado mensual", value: fmt(totalMensual), color: "text-white" },
          { label: "Total pagado", value: fmt(totalPagado), color: "text-green-400" },
          { label: "Pendiente de pago", value: fmt(totalPendiente), color: "text-orange-400" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-gray-500 text-xs mb-1">{k.label}</p>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Nuevo reparto de utilidades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => setF("nombre", e.target.value)}
                placeholder="ej. Reparto semanal Susana"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Socio (opcional)</label>
              <select value={form.socioId} onChange={e => setF("socioId", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none">
                <option value="">Sin socio vinculado</option>
                {socios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Beneficiario *</label>
              <input value={form.beneficiario} onChange={e => setF("beneficiario", e.target.value)}
                placeholder="Nombre completo"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Monto base *</label>
              <input type="number" value={form.montoBase} onChange={e => setF("montoBase", e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Período</label>
              <select value={form.tipoPeriodo} onChange={e => setF("tipoPeriodo", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none">
                {Object.entries(PERIODO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Base de cálculo</label>
              <select value={form.baseCalculo} onChange={e => setF("baseCalculo", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none">
                {Object.entries(BASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-gray-500 text-xs block mb-1">Descripción / notas</label>
              <textarea rows={2} value={form.notas} onChange={e => setF("notas", e.target.value)}
                placeholder="Contexto del reparto, acuerdo, etc."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
            <button onClick={crear} disabled={saving}
              className="px-6 py-2 rounded-xl bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9aa67] transition-colors disabled:opacity-50">
              {saving ? "Guardando..." : "Registrar reparto"}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-600">Cargando...</div>
      ) : repartos.length === 0 ? (
        <div className="text-center py-16 text-gray-600 border border-dashed border-[#222] rounded-2xl">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-sm">No hay repartos de utilidades</p>
        </div>
      ) : (
        <div className="space-y-3">
          {repartos.map(r => {
            const pagadas = r.cuotas.filter(c => c.estado === "PAGADO").length;
            const pendientes = r.cuotas.filter(c => c.estado === "PENDIENTE").length;
            const totalPagadoR = r.cuotas.filter(c => c.estado === "PAGADO").reduce((s, c) => s + c.monto, 0);
            const isOpen = expanded === r.id;

            return (
              <div key={r.id} className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden hover:border-[#2a2a2a] transition-colors">
                <div className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{r.nombre}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#B3985B]/40 text-[#B3985B]">
                        {PERIODO_LABELS[r.tipoPeriodo]}
                      </span>
                      {!r.activo && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700/40 text-gray-500">Inactivo</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {r.beneficiario}
                      {r.socio?.pctParticipacion && ` · ${r.socio.pctParticipacion}% de participación`}
                      {` · ${BASE_LABELS[r.baseCalculo]}`}
                    </p>
                    {r.notas && <p className="text-gray-600 text-xs mt-0.5 italic">{r.notas}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] text-gray-600">Por período</p>
                      <p className="text-white text-sm font-semibold">{fmt(r.montoBase)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600">Pagado</p>
                      <p className="text-green-400 text-sm font-semibold">{fmt(totalPagadoR)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600">Cuotas</p>
                      <p className="text-gray-400 text-sm">{pagadas}✓ {pendientes > 0 ? `· ${pendientes} pend.` : ""}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setCuotaModal(r)}
                        className="px-3 py-1.5 rounded-lg border border-[#B3985B]/40 text-[#B3985B] text-xs hover:bg-[#B3985B]/10 transition-colors">
                        Generar cuota
                      </button>
                      <button onClick={() => setExpanded(isOpen ? null : r.id)}
                        className="px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 text-xs hover:text-white transition-colors">
                        {isOpen ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Historial cuotas */}
                {isOpen && r.cuotas.length > 0 && (
                  <div className="border-t border-[#1e1e1e] px-4 py-3">
                    <p className="text-gray-500 text-xs mb-2">Historial de cuotas ({r.cuotas.length})</p>
                    <div className="space-y-1.5">
                      {r.cuotas.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{c.periodo}</span>
                          <span className="text-white font-medium">{fmt(c.monto)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            c.estado === "PAGADO" ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"
                          }`}>{c.estado}</span>
                          {c.cuentaPagarId && <span className="text-[#B3985B] text-[10px]">CXP ✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cuotaModal && (
        <GenerarCuotaModal
          reparto={cuotaModal}
          onClose={() => setCuotaModal(null)}
          onSaved={cargar}
        />
      )}
    </div>
  );
}
