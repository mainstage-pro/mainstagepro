"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { ClipboardList, FileText, CheckCircle2, Pencil, Trash2, Plus } from "lucide-react";

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

interface AbonoPago {
  id: string;
  monto: number;
  fecha: string;
  metodoPago: string;
}

interface CuentaPagar {
  id: string;
  concepto: string;
  monto: number;
  montoPagado: number;
  fechaCompromiso: string;
  estado: string;
  abonos: AbonoPago[];
}


// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) => {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

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
  const [draft, setDraft] = useState<{ monto: string; fecha: string; estado: string }[]>(() => {
    if (pasivo.cuotas.length > 0) {
      return pasivo.cuotas.map(c => ({
        monto: String(c.monto),
        fecha: c.fechaVencimiento.slice(0, 10),
        estado: c.estado || "PENDIENTE",
      }));
    }
    const totalInicial = pasivo.montoTotal > 0 ? pasivo.montoTotal : 26992.68;
    return [{ monto: String(totalInicial), fecha: hoy(), estado: "PENDIENTE" }];
  });
  const [saving, setSaving] = useState(false);

  function updateNum(n: number) {
    setNumCuotas(n);
    const montoBase = pasivo.montoTotal > 0 ? (pasivo.montoTotal / n) : 26992.68;
    setDraft(Array.from({ length: n }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      return { monto: montoBase.toFixed(2), fecha: d.toISOString().slice(0, 10), estado: "PENDIENTE" };
    }));
  }

  function setField(i: number, key: string, val: string) {
    setDraft(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  }

  async function guardar() {
    const cuotas = draft.map(d => ({
      monto: parseFloat(d.monto),
      fechaVencimiento: d.fecha,
      estado: d.estado || "PENDIENTE",
    }));
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

  const totalPlan = draft.reduce((s, r) => s + (parseFloat(r.monto) || 0), 0);
  const totalPagadoPlan = draft.filter(r => r.estado === "PAGADO").reduce((s, r) => s + (parseFloat(r.monto) || 0), 0);
  const totalPendientePlan = totalPlan - totalPagadoPlan;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-[#1e1e1e] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-white font-semibold text-base">Plan de pagos — {pasivo.nombre}</h2>
            <p className="text-gray-500 text-xs mt-1">
              Total cuotas: <span className="text-white font-medium">{fmt(totalPlan)}</span> · Pagado: <span className="text-green-400 font-medium">{fmt(totalPagadoPlan)}</span> · Pendiente: <span className="text-orange-400 font-medium">{fmt(totalPendientePlan)}</span>
            </p>
          </div>
          {pasivo.cuotas.length > 0 && (
            <a
              href={`/api/finanzas/pasivos/${pasivo.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg border border-[#B3985B]/40 text-[#B3985B] text-xs hover:bg-[#B3985B]/10 transition-colors flex items-center gap-1.5 flex-shrink-0"
              title="Descargar estado de cuenta / recibo de pagos en PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </a>
          )}
        </div>
        <div className="p-5 space-y-4">
          {/* Num cuotas */}
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Número de cuotas</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 6, 8, 10, 12, 24, 36].map(n => (
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
                <span className="text-gray-600 text-xs w-6 text-right">#{i + 1}</span>
                <div className="flex-1">
                  <input type="number" step="0.01" value={row.monto} onChange={e => setField(i, "monto", e.target.value)}
                    placeholder="Monto" className="w-full bg-transparent text-white text-xs border-b border-[#333] focus:border-[#B3985B] outline-none py-1" />
                </div>
                <div className="flex-1">
                  <input type="date" value={row.fecha} onChange={e => setField(i, "fecha", e.target.value)}
                    className="w-full bg-transparent text-white text-xs border-b border-[#333] focus:border-[#B3985B] outline-none py-1" />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setField(i, "estado", row.estado === "PAGADO" ? "PENDIENTE" : "PAGADO")}
                    className={`px-2 py-1 rounded text-[10px] font-medium border ${
                      row.estado === "PAGADO"
                        ? "bg-green-950/60 text-green-400 border-green-800/60"
                        : "bg-yellow-950/40 text-yellow-400 border-yellow-800/40"
                    }`}
                  >
                    {row.estado}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between text-xs pt-2 border-t border-[#1e1e1e]">
            <span className="text-gray-400">Total plan (todas las cuotas con IVA):</span>
            <span className="font-semibold text-green-400">
              {fmt(totalPlan)}
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

// ── Modal de edición de cuota individual ───────────────────────────────────────

interface EditarCuotaModalProps {
  pasivoId: string;
  cuota: CuotaDeuda;
  onClose: () => void;
  onSaved: () => void;
}

function EditarCuotaModal({ pasivoId, cuota, onClose, onSaved }: EditarCuotaModalProps) {
  const toast = useToast();
  const [monto, setMonto] = useState(String(cuota.monto));
  const [fecha, setFecha] = useState(cuota.fechaVencimiento.slice(0, 10));
  const [estado, setEstado] = useState(cuota.estado);
  const [saving, setSaving] = useState(false);

  async function guardar() {
    const parsedMonto = parseFloat(monto);
    if (!parsedMonto || isNaN(parsedMonto)) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (!fecha) {
      toast.error("Selecciona una fecha de vencimiento");
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(`/api/finanzas/pasivos/${pasivoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuotaId: cuota.id,
          monto: parsedMonto,
          fechaVencimiento: fecha,
          cuotaEstado: estado,
        }),
      });
      if (r.ok) {
        toast.success(`Cuota ${cuota.numeroCuota} actualizada`);
        onSaved();
        onClose();
      } else {
        const d = await r.json();
        toast.error(d.error || "Error al actualizar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-3">
          <h3 className="text-white font-semibold text-sm">Editar Cuota {cuota.numeroCuota}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-gray-400 text-xs block mb-1">Monto total a pagar (con IVA) *</label>
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Fecha de vencimiento *</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Estado de pago</label>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none"
            >
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="PAGADO">PAGADO</option>
              <option value="VENCIDO">VENCIDO</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t border-[#1e1e1e]">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-[#2a2a2a] text-gray-400 text-xs hover:text-white">
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving} className="flex-1 py-2 rounded-xl bg-[#B3985B] text-black font-semibold text-xs hover:bg-[#c9aa67] disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar cambios"}
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
  const [cuentasMauricio, setCuentasMauricio] = useState<CuentaPagar[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [planModal, setPlanModal] = useState<PasivoDeuda | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedMauricio, setExpandedMauricio] = useState(false);
  const [cuotaParaEditar, setCuotaParaEditar] = useState<{ pasivoId: string; cuota: CuotaDeuda } | null>(null);

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [pr, pv] = await Promise.all([
      fetch("/api/finanzas/pasivos", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/proveedores", { cache: "no-store" }).then(r => r.json()),
    ]);
    setPasivos(pr.pasivos || []);
    setCuentasMauricio(pr.cuentasMauricio || []);
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
      cargar(true);
    } else {
      const d = await r.json();
      toast.error(d.error || "Error al guardar");
    }
  }

  async function eliminar(p: PasivoDeuda) {
    if (!await confirm({ message: `¿Eliminar la deuda "${p.nombre}"? Esto eliminará también las cuotas y las cuentas por pagar generadas.`, danger: true, confirmText: "Eliminar" })) return;
    const r = await fetch(`/api/finanzas/pasivos/${p.id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Deuda eliminada"); cargar(true); }
    else toast.error("Error al eliminar");
  }

  async function marcarTodasPagadas(pasivoId: string) {
    try {
      const r = await fetch(`/api/finanzas/pasivos/${pasivoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marcarTodasPagadas: true }),
      });
      if (r.ok) {
        toast.success("Cuotas marcadas como pagadas y pasivo liquidado");
        cargar(true);
      } else {
        toast.error("Error al actualizar cuotas");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }

  async function toggleCuota(pasivoId: string, cuotaId: string, nuevoEstado: string) {
    try {
      const r = await fetch(`/api/finanzas/pasivos/${pasivoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuotaId, cuotaEstado: nuevoEstado }),
      });
      if (r.ok) {
        toast.success(`Cuota actualizada a ${nuevoEstado}`);
        cargar(true);
      } else {
        toast.error("Error al actualizar cuota");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }

  async function agregarCuota(p: PasivoDeuda) {
    const ultCuota = p.cuotas[p.cuotas.length - 1];
    const defaultMonto = ultCuota?.monto || 26992.68;

    let nextDate = new Date();
    if (ultCuota?.fechaVencimiento) {
      nextDate = new Date(ultCuota.fechaVencimiento);
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    const fechaStr = nextDate.toISOString().slice(0, 10);

    try {
      const r = await fetch(`/api/finanzas/pasivos/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agregarCuota: {
            monto: defaultMonto,
            fechaVencimiento: fechaStr,
            estado: "PENDIENTE",
          },
        }),
      });
      if (r.ok) {
        toast.success("Cuota agregada");
        cargar(true);
      } else {
        toast.error("Error al agregar cuota");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }

  async function eliminarCuota(pasivoId: string, cuota: CuotaDeuda) {
    if (!await confirm({
      message: `¿Eliminar la Cuota ${cuota.numeroCuota} de ${fmt(cuota.monto)}?`,
      danger: true,
      confirmText: "Eliminar cuota",
    })) return;

    try {
      const r = await fetch(`/api/finanzas/pasivos/${pasivoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eliminarCuotaId: cuota.id }),
      });
      if (r.ok) {
        toast.success(`Cuota ${cuota.numeroCuota} eliminada`);
        cargar(true);
      } else {
        toast.error("Error al eliminar cuota");
      }
    } catch {
      toast.error("Error de conexión");
    }
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
      ) : pasivos.length === 0 && cuentasMauricio.length === 0 ? (
        <div className="text-center py-16 text-gray-600 border border-dashed border-[#222] rounded-2xl">
          <ClipboardList strokeWidth={1.5} className="w-9 h-9 mx-auto mb-3 text-gray-700" />
          <p className="text-sm">No hay deudas registradas</p>
          <p className="text-xs mt-1">Registra deudas estructurales que no forman parte del flujo operativo diario</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Tarjeta de Mauricio Hernández */}
          {cuentasMauricio.length > 0 && (() => {
            const total = cuentasMauricio.reduce((a, b) => a + b.monto, 0);
            const pagado = cuentasMauricio.reduce((a, b) => a + b.montoPagado, 0);
            const pendiente = total - pagado;
            const pct = total > 0 ? (pagado / total) * 100 : 0;
            const isOpen = expandedMauricio;

            return (
              <div className="ms-card rounded-2xl overflow-hidden hover:border-[#2a2a2a] transition-colors border-[#B3985B]/20">
                {/* Fila principal */}
                <div className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">Cuentas por Pagar: Mauricio Hernández</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border border-[#B3985B] text-[#B3985B]`}>
                        Socio / Especial
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {cuentasMauricio.length} cuentas registradas
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
                      <p className="text-white text-sm font-semibold">{fmt(total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600">Pagado</p>
                      <p className="text-green-400 text-sm font-semibold">{fmt(pagado)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600">Pendiente</p>
                      <p className="text-orange-400 text-sm font-semibold">{fmt(pendiente)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setExpandedMauricio(!isOpen)}
                        className="px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 text-xs hover:text-white transition-colors">
                        {isOpen ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cuentas expandidas */}
                {isOpen && (
                  <div className="border-t border-[#1e1e1e] px-4 py-3 bg-[#111]">
                    <div className="space-y-4">
                      {cuentasMauricio.map(c => {
                        const cPendiente = c.monto - c.montoPagado;
                        return (
                          <div key={c.id} className="border-b border-[#1e1e1e] pb-3 last:border-0 last:pb-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm text-white">{c.concepto}</p>
                                <p className="text-xs text-gray-500">{new Date(c.fechaCompromiso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-orange-400">Pendiente: {fmt(cPendiente)}</p>
                                <p className="text-[10px] text-gray-500">De: {fmt(c.monto)}</p>
                              </div>
                            </div>
                            
                            {/* Abonos */}
                            {c.abonos.length > 0 && (
                              <div className="pl-4 border-l border-[#2a2a2a] space-y-1">
                                {c.abonos.map(abono => (
                                  <div key={abono.id} className="flex justify-between text-[11px] text-gray-400">
                                    <span>↳ Abono {new Date(abono.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</span>
                                    <span className="text-green-500/80">+{fmt(abono.monto)} ({abono.metodoPago})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
                      <a
                        href={`/api/finanzas/pasivos/${p.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-[#B3985B]/40 text-[#B3985B] text-xs hover:bg-[#B3985B]/10 transition-colors flex items-center gap-1.5"
                        title="Descargar estado de cuenta / recibo de pagos en PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </a>
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
                  <div className="border-t border-[#1e1e1e] px-4 py-4 bg-[#0c0c0c] space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#181818]">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-gray-300 text-xs font-semibold">Calendario de Pagos ({p.cuotas.length} cuotas)</p>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-gray-500">
                            Total: <strong className="text-white">{fmt(p.montoTotal)}</strong>
                          </span>
                          <span className="text-gray-600">·</span>
                          <span className="text-gray-500">
                            Pagado: <strong className="text-green-400">{fmt(p.montoPagado)}</strong>
                          </span>
                          <span className="text-gray-600">·</span>
                          <span className="text-gray-500">
                            Saldo pendiente: <strong className="text-orange-400">{fmt(pendiente)}</strong>
                          </span>
                        </div>
                        {cuotasPagadas === p.cuotas.length && (
                          <span className="text-[10px] text-green-400 bg-green-950/60 border border-green-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            100% Pagado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => agregarCuota(p)}
                          className="px-2.5 py-1 rounded-lg border border-[#B3985B]/40 text-[#B3985B] text-xs hover:bg-[#B3985B]/10 transition-colors flex items-center gap-1"
                          title="Añadir una cuota al final"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Cuota</span>
                        </button>
                        {p.cuotas.some(c => c.estado !== "PAGADO") && (
                          <button
                            onClick={() => marcarTodasPagadas(p.id)}
                            className="text-[11px] text-green-400 hover:text-green-300 underline font-medium px-1"
                          >
                            Marcar todas pagadas
                          </button>
                        )}
                        <a
                          href={`/api/finanzas/pasivos/${p.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[#B3985B] hover:text-[#c9aa67] transition-colors ml-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      </div>
                    </div>

                    {/* Tabla de cuotas */}
                    <div className="space-y-1.5">
                      {p.cuotas.map((c, idx) => {
                        // Saldo restante proyectado tras esta cuota
                        const totalHastaAqui = p.cuotas.slice(0, idx + 1).reduce((s, x) => s + x.monto, 0);
                        const saldoRestante = Math.max(0, p.montoTotal - totalHastaAqui);

                        return (
                          <div
                            key={c.id}
                            className={`flex items-center justify-between text-xs py-2 px-3 rounded-xl border transition-colors gap-2 flex-wrap sm:flex-nowrap ${
                              c.estado === "PAGADO"
                                ? "bg-[#111612] border-green-950/50 hover:border-green-900/50"
                                : "bg-[#141414] border-[#222] hover:border-[#333]"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-[160px]">
                              <span className="text-gray-400 font-medium w-16">Cuota {c.numeroCuota}</span>
                              <span className="text-gray-300">{fmtDate(c.fechaVencimiento)}</span>
                            </div>

                            <div className="flex items-center gap-4 flex-1 justify-end sm:justify-center">
                              <div>
                                <span className="text-gray-500 text-[10px] block">Monto a pagar</span>
                                <span className="text-white font-semibold text-xs">{fmt(c.monto)}</span>
                              </div>
                              <div className="min-w-[120px] text-right sm:text-left">
                                <span className="text-gray-500 text-[10px] block">Saldo restante</span>
                                <span className="text-gray-400 font-mono text-xs">{fmt(saldoRestante)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleCuota(p.id, c.id, c.estado === "PAGADO" ? "PENDIENTE" : "PAGADO")}
                                title="Clic para cambiar estado de pago"
                                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all hover:opacity-80 ${
                                  c.estado === "PAGADO" ? "bg-green-900/30 text-green-400 border border-green-700/40" :
                                  c.estado === "VENCIDO" ? "bg-red-900/30 text-red-400 border border-red-700/40" :
                                  "bg-yellow-900/30 text-yellow-400 border border-yellow-700/40"
                                }`}
                              >
                                {c.estado}
                              </button>

                              <button
                                onClick={() => setCuotaParaEditar({ pasivoId: p.id, cuota: c })}
                                title="Editar monto, fecha o estado de esta cuota"
                                className="p-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-[#B3985B] hover:border-[#B3985B]/40 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => eliminarCuota(p.id, c)}
                                title="Eliminar cuota"
                                className="p-1.5 rounded-lg border border-red-900/30 text-red-400/70 hover:text-red-300 hover:bg-red-950/30 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
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

      {/* Modal editar cuota individual */}
      {cuotaParaEditar && (
        <EditarCuotaModal
          pasivoId={cuotaParaEditar.pasivoId}
          cuota={cuotaParaEditar.cuota}
          onClose={() => setCuotaParaEditar(null)}
          onSaved={() => cargar(true)}
        />
      )}
    </div>
  );
}
