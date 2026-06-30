"use client";

import { useEffect, useState, useCallback } from "react";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type Config = {
  id: string;
  socioId: string | null;
  valorTotalActivos: number;
  tasaAnualRendimiento: number;
  usarSumaActivos: boolean;
  modoActivo: string;
  porcentajeVariable: number;
  pisoMinimoFijo: number;
  creditoSaldoInicial: number;
  creditoSaldoActual: number;
  creditoCuotaMensual: number;
  creditoPlazoMeses: number;
  creditoFechaInicio: string | null;
  notas: string | null;
};

type ConfigData = {
  config: Config;
  socio: { id: string; nombre: string } | null;
  valorEfectivo: number;
  montoFijoMensual: number;
  pisoAbsolutoPeso: number;
};

type Activo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  valorAdquisicion: number;
  valorActual: number;
  precioRenta: number;
  fechaAdquisicion: string | null;
  notas: string | null;
};

type Pago = {
  id: string;
  mes: number;
  anio: number;
  montoFijo: number;
  utilidadMes: number | null;
  montoVariable: number | null;
  montoAcordado: number;
  montoPagado: number;
  estado: string;
  modoPago: string | null;
  notas: string | null;
  pagadoEn: string | null;
};

type AccesorioItem = {
  id: string;
  nombre: string;
  categoria: string | null;
};

type AccesoriosProduccionData = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  categoria: { nombre: string };
  cantidadTotal: number;
  precioRenta: number;
  accesorios: AccesorioItem[];
};

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const CAT_LABELS: Record<string, string> = {
  EQUIPO: "Equipo", VEHICULO: "Vehículo", INMUEBLE: "Inmueble",
  INTANGIBLE: "Intangible", OTRO: "Otro",
};
const ESTADO_COLORS: Record<string, string> = {
  PAGADO: "text-green-400 bg-green-900/20 border-green-700/40",
  PARCIAL: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
  PENDIENTE: "text-orange-400 bg-orange-900/20 border-orange-700/40",
  DIFERIDO: "text-gray-400 bg-gray-800/20 border-gray-700/40",
};

const fmt = (n: number) => new Intl.NumberFormat("es-MX", {
  style: "currency", currency: "MXN", maximumFractionDigits: 0,
}).format(n);

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

// ─── COMPONENTES AUXILIARES ───────────────────────────────────────────────────
function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#6b7280] mt-0.5">{sub}</p>}
    </div>
  );
}

function Inp({ label, hint, value, onChange, type = "text", prefix }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  type?: string; prefix?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-gray-500 mb-1 block">{label}</label>
      {hint && <p className="text-[10px] text-[#555] mb-1">{hint}</p>}
      <div className="flex">
        {prefix && (
          <span className="bg-[#0d0d0d] border border-r-0 border-[#2a2a2a] px-2.5 rounded-l-lg text-gray-600 text-sm flex items-center">
            {prefix}
          </span>
        )}
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          className={`flex-1 bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:border-[#B3985B] px-3 py-2 ${prefix ? "rounded-r-lg" : "rounded-lg"}`} />
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function HervamPage() {
  const [tab, setTab] = useState<"resumen" | "activos" | "config" | "historial">("resumen");
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [accesoriosProduccion, setAccesoriosProduccion] = useState<AccesoriosProduccionData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [cdRes, acRes, pgRes, accRes] = await Promise.all([
      fetch("/api/finanzas/hervam/config"),
      fetch("/api/finanzas/hervam/activos"),
      fetch("/api/finanzas/hervam/pagos"),
      fetch("/api/finanzas/hervam/accesorios-produccion"),
    ]);
    const [cd, ac, pg, acc] = await Promise.all([cdRes.json(), acRes.json(), pgRes.json(), accRes.json()]);
    setConfigData(cd);
    setActivos(ac.activos ?? []);
    setPagos(pg.pagos ?? []);
    setAccesoriosProduccion(acc.equipos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="h-6 w-48 bg-[#1a1a1a] rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Estructura de Capital · HERVAM</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Activos arrendados a Mainstage Pro · Rendimiento anual {configData?.config.tasaAnualRendimiento}%
          </p>
        </div>
        <span className="text-[10px] text-[#B3985B] border border-[#B3985B]/30 bg-[#B3985B]/5 px-2.5 py-1 rounded-full font-semibold">
          {configData?.config.modoActivo === "FIJO" ? "Modo Fijo"
            : configData?.config.modoActivo === "VARIABLE" ? "Modo Variable"
            : "Modo Híbrido"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1a1a1a]">
        {([
          { key: "resumen",   label: "Resumen" },
          { key: "activos",   label: "Activos" },
          { key: "config",    label: "Configuración" },
          { key: "historial", label: "Historial" },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === key ? "border-[#B3985B] text-[#B3985B]" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "resumen" && configData && (
        <ResumenTab configData={configData} pagos={pagos} activos={activos} onRefresh={load} />
      )}
      {tab === "activos" && (
        <ActivosTab activos={activos} accesoriosProduccion={accesoriosProduccion} onRefresh={load} />
      )}
      {tab === "config" && configData && (
        <ConfigTab configData={configData} onRefresh={load} />
      )}
      {tab === "historial" && configData && (
        <HistorialTab pagos={pagos} configData={configData} onRefresh={load} />
      )}
    </div>
  );
}

// ─── RESUMEN TAB ─────────────────────────────────────────────────────────────
function ResumenTab({ configData, pagos, activos, onRefresh }: {
  configData: ConfigData; pagos: Pago[]; activos: Activo[]; onRefresh: () => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const { config, socio, valorEfectivo, montoFijoMensual, pisoAbsolutoPeso } = configData;
  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();
  const pagoActual = pagos.find(p => p.mes === mesActual && p.anio === anioActual);

  const [creando, setCreando] = useState(false);
  const [utilidad, setUtilidad] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingUtilidad, setLoadingUtilidad] = useState(false);

  // Edit/delete current month pago
  const [editandoPago, setEditandoPago] = useState(false);
  const [editPagoForm, setEditPagoForm] = useState({ montoAcordado: "", montoPagado: "", estado: "", notas: "" });
  const [savingPago, setSavingPago] = useState(false);

  function startEditPago(p: Pago) {
    setEditPagoForm({ montoAcordado: String(p.montoAcordado), montoPagado: String(p.montoPagado), estado: p.estado, notas: p.notas ?? "" });
    setEditandoPago(true);
  }

  async function saveEditPago(id: string) {
    setSavingPago(true);
    const res = await fetch(`/api/finanzas/hervam/pagos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        montoAcordado: parseFloat(editPagoForm.montoAcordado),
        montoPagado: parseFloat(editPagoForm.montoPagado),
        estado: editPagoForm.estado,
        notas: editPagoForm.notas || null,
        pagadoEn: editPagoForm.estado === "PAGADO" ? new Date().toISOString() : null,
      }),
    });
    setSavingPago(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return; }
    await onRefresh();
    setEditandoPago(false);
  }

  async function eliminarPago(id: string) {
    if (!await confirm({ message: "¿Eliminar la obligación de este mes? Esta acción no se puede deshacer.", danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/finanzas/hervam/pagos/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al eliminar"); return; }
    await onRefresh();
  }

  async function abrirCreando() {
    setCreando(true);
    setLoadingUtilidad(true);
    try {
      const r = await fetch("/api/finanzas/reporte?meses=1", { cache: "no-store" });
      const d = await r.json();
      const mesKey = new Date().toISOString().slice(0, 7);
      const mesData = (d.porMes as { mes: string; utilidadMes: number }[])?.find(m => m.mes === mesKey);
      if (mesData?.utilidadMes && mesData.utilidadMes > 0) {
        setUtilidad(String(Math.round(mesData.utilidadMes)));
      }
    } catch { /* noop */ }
    setLoadingUtilidad(false);
  }

  // Calcular monto estimado en pantalla
  const utilNum = utilidad ? parseFloat(utilidad.replace(/,/g, "")) : null;
  const montoVariable = utilNum !== null ? (utilNum * config.porcentajeVariable) / 100 : null;
  const pisoAbs = pisoAbsolutoPeso;
  let montoEstimado = montoFijoMensual;
  let modoEstimado = "FIJO";
  if (utilNum !== null && config.modoActivo !== "FIJO") {
    const variable = montoVariable!;
    if (config.modoActivo === "VARIABLE") {
      montoEstimado = Math.max(pisoAbs, Math.min(montoFijoMensual, variable));
      modoEstimado = "VARIABLE";
    } else {
      if (variable >= montoFijoMensual) {
        montoEstimado = montoFijoMensual;
        modoEstimado = "FIJO (híbrido)";
      } else {
        montoEstimado = Math.max(pisoAbs, variable);
        modoEstimado = "VARIABLE (híbrido)";
      }
    }
  }

  // Pagos año actual
  const pagosAnio = pagos.filter(p => p.anio === anioActual);
  const totalAcordadoAnio = pagosAnio.reduce((s, p) => s + p.montoAcordado, 0);
  const totalPagadoAnio = pagosAnio.reduce((s, p) => s + p.montoPagado, 0);

  async function crearPagoMes() {
    setSaving(true);
    const r = await fetch("/api/finanzas/hervam/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes: mesActual, anio: anioActual, utilidadMes: utilidad || undefined }),
    });
    setSaving(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast.error(d.error ?? "Error al registrar pago"); return; }
    const data = await r.json();

    // Auto-crear cuenta por pagar con fecha límite = último día del mes
    if (data.pago) {
      const ultimoDia = new Date(anioActual, mesActual, 0);
      const fechaComp = `${ultimoDia.getFullYear()}-${String(ultimoDia.getMonth()+1).padStart(2,"0")}-${String(ultimoDia.getDate()).padStart(2,"0")}`;
      await fetch("/api/cuentas-pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoAcreedor: socio ? "SOCIO" : "OTRO",
          ...(socio ? { socioId: socio.id } : {}),
          concepto: `Renta HERVAM · ${MESES[mesActual-1]} ${anioActual}`,
          monto: data.pago.montoAcordado,
          fechaCompromiso: fechaComp,
        }),
      });
    }

    await onRefresh();
    setCreando(false);
    setUtilidad("");
  }

  const creditoPorcentajePagado = config.creditoSaldoInicial > 0
    ? ((config.creditoSaldoInicial - config.creditoSaldoActual) / config.creditoSaldoInicial) * 100
    : 0;

  return (
    <div className="space-y-5">
      {/* Métricas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Valor de activos" value={fmt(valorEfectivo)} sub={`${activos.length} activos registrados`} color="text-white" />
        <MetricCard label="Renta fija mensual" value={fmt(montoFijoMensual)} sub={`${fmtPct(config.tasaAnualRendimiento)} anual`} color="text-[#B3985B]" />
        <MetricCard label="Renta anual estimada" value={fmt(montoFijoMensual * 12)} sub="Si se paga monto fijo todo el año" />
        <MetricCard label="Piso mínimo mensual" value={fmt(pisoAbsolutoPeso)} sub={`${config.pisoMinimoFijo}% del monto fijo`} color="text-blue-400" />
      </div>

      {/* Mes actual */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
              {MESES[mesActual - 1]} {anioActual}
            </p>
            <h2 className="text-white text-lg font-semibold mt-0.5">Obligación del mes</h2>
          </div>
          {pagoActual && (
            <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${ESTADO_COLORS[pagoActual.estado] ?? "text-gray-400 bg-gray-800 border-gray-700"}`}>
              {pagoActual.estado}
            </span>
          )}
        </div>

        {pagoActual ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Monto acordado</p>
                <p className="text-white text-xl font-bold">{fmt(pagoActual.montoAcordado)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Pagado</p>
                <p className={`text-xl font-bold ${pagoActual.montoPagado >= pagoActual.montoAcordado ? "text-green-400" : "text-yellow-400"}`}>
                  {fmt(pagoActual.montoPagado)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Pendiente</p>
                <p className="text-xl font-bold text-orange-400">
                  {fmt(Math.max(0, pagoActual.montoAcordado - pagoActual.montoPagado))}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Modo</p>
                <p className="text-white font-semibold mt-1">{pagoActual.modoPago ?? "—"}</p>
                {pagoActual.utilidadMes !== null && (
                  <p className="text-[10px] text-gray-500">Utilidad: {fmt(pagoActual.utilidadMes)}</p>
                )}
              </div>
            </div>
            {/* Actions */}
            {!editandoPago ? (
              <div className="flex gap-3 mt-4 pt-3 border-t border-[#1a1a1a]">
                <button onClick={() => startEditPago(pagoActual)} className="text-xs text-[#B3985B] hover:underline">Editar</button>
                <button onClick={() => eliminarPago(pagoActual.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-[#1a1a1a] space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Inp label="Monto acordado" value={editPagoForm.montoAcordado} onChange={v => setEditPagoForm(f => ({...f, montoAcordado: v}))} type="number" prefix="$" />
                  <Inp label="Monto pagado" value={editPagoForm.montoPagado} onChange={v => setEditPagoForm(f => ({...f, montoPagado: v}))} type="number" prefix="$" />
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Estado</label>
                    <Combobox
                      value={editPagoForm.estado}
                      onChange={v => setEditPagoForm(f => ({...f, estado: v}))}
                      options={["PENDIENTE","PARCIAL","PAGADO","DIFERIDO"].map(e => ({ value: e, label: e }))}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                    />
                  </div>
                  <Inp label="Notas" value={editPagoForm.notas} onChange={v => setEditPagoForm(f => ({...f, notas: v}))} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEditPago(pagoActual.id)} disabled={savingPago}
                    className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-xs px-4 py-1.5 rounded-lg">
                    {savingPago ? "..." : "Guardar"}
                  </button>
                  <button onClick={() => setEditandoPago(false)} className="text-gray-500 text-xs">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        ) : creando ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Captura la utilidad neta del mes para calcular el modo híbrido. Si no tienes el dato, déjalo vacío y se usará el monto fijo.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Inp label={loadingUtilidad ? "Cargando utilidad del reporte…" : "Utilidad de cierre del mes"} hint="Auto-cargado del reporte financiero · Si está vacío → modo fijo" value={utilidad} onChange={setUtilidad} type="number" prefix="$" />
              <div className="flex flex-col gap-1">
                <p className="text-[11px] text-gray-500">Monto calculado</p>
                <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3 mt-0.5">
                  <p className="text-[#B3985B] text-lg font-bold">{fmt(montoEstimado)}</p>
                  <p className="text-[10px] text-gray-500">{modoEstimado}</p>
                  {montoVariable !== null && (
                    <p className="text-[10px] text-gray-600 mt-1">
                      Variable: {fmt(montoVariable)} · Piso: {fmt(pisoAbs)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={crearPagoMes} disabled={saving}
                className="bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm px-5 py-2 rounded-lg disabled:opacity-50">
                {saving ? "Registrando..." : `Registrar ${MESES[mesActual-1]} ${anioActual}`}
              </button>
              <button onClick={() => setCreando(false)} className="text-gray-500 text-sm px-3">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Aún no se ha registrado el pago de este mes</p>
              <p className="text-gray-600 text-xs mt-0.5">Monto fijo estimado: <span className="text-white font-semibold">{fmt(montoFijoMensual)}</span></p>
            </div>
            <button onClick={abrirCreando}
              className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg">
              Registrar mes
            </button>
          </div>
        )}
      </div>

      {/* Fórmula */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Cómo se calcula el pago</p>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-gray-400 text-[11px] uppercase font-semibold">Base fija</p>
            <p className="text-white font-mono">{fmt(valorEfectivo)} × {config.tasaAnualRendimiento}% ÷ 12</p>
            <p className="text-[#B3985B] text-lg font-bold">{fmt(montoFijoMensual)}<span className="text-xs text-gray-500"> / mes</span></p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-400 text-[11px] uppercase font-semibold">Variable (si aplica)</p>
            <p className="text-white font-mono">Utilidad neta × {config.porcentajeVariable}%</p>
            <p className="text-gray-400 text-xs mt-1">Piso: {fmt(pisoAbsolutoPeso)} ({config.pisoMinimoFijo}% del fijo)</p>
            <p className="text-gray-400 text-xs">Techo: {fmt(montoFijoMensual)} (monto fijo)</p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-400 text-[11px] uppercase font-semibold">Modo híbrido</p>
            <p className="text-gray-300 text-xs">Si utilidad × {config.porcentajeVariable}% ≥ {fmt(montoFijoMensual)} → paga fijo</p>
            <p className="text-gray-300 text-xs mt-1">Si no → paga máx(piso, variable)</p>
            <p className="text-[10px] text-[#555] mt-2">Punto de equilibrio: {fmt(montoFijoMensual / (config.porcentajeVariable / 100))} utilidad</p>
          </div>
        </div>
      </div>

      {/* Año actual + Crédito */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Año {anioActual}</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Meses registrados</span>
              <span className="text-white font-semibold">{pagosAnio.length} / 12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total acordado</span>
              <span className="text-white font-semibold">{fmt(totalAcordadoAnio)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total pagado</span>
              <span className="text-green-400 font-semibold">{fmt(totalPagadoAnio)}</span>
            </div>
            <div className="flex justify-between border-t border-[#1a1a1a] pt-2 mt-2">
              <span className="text-gray-400">Pendiente año</span>
              <span className="text-orange-400 font-bold">{fmt(Math.max(0, totalAcordadoAnio - totalPagadoAnio))}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Crédito HERVAM</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Crédito inicial</span>
              <span className="text-white">{fmt(config.creditoSaldoInicial)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Saldo actual</span>
              <span className="text-white font-semibold">{fmt(config.creditoSaldoActual)}</span>
            </div>
            {config.creditoCuotaMensual > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Cuota mensual</span>
                <span className="text-white">{fmt(config.creditoCuotaMensual)}</span>
              </div>
            )}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>Progreso</span>
                <span>{fmtPct(creditoPorcentajePagado)}</span>
              </div>
              <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full bg-[#B3985B] rounded-full transition-all" style={{ width: `${Math.min(100, creditoPorcentajePagado)}%` }} />
              </div>
            </div>
            {config.creditoCuotaMensual > 0 && config.creditoSaldoActual > 0 && (
              <p className="text-[10px] text-gray-600">
                ≈ {Math.ceil(config.creditoSaldoActual / config.creditoCuotaMensual)} meses restantes
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ACTIVOS TAB ─────────────────────────────────────────────────────────────
function ActivosTab({ activos, accesoriosProduccion, onRefresh }: {
  activos: Activo[];
  accesoriosProduccion: AccesoriosProduccionData[];
  onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<"produccion" | "accesorios" | "oficina">("produccion");

  // Filtra activos según la sub-pestaña activa
  const activosProduccion = activos.filter(a => a.categoria !== "OFICINA");
  const activosOficina    = activos.filter(a => a.categoria === "OFICINA");

  return (
    <div className="space-y-4">
      {/* Sub-pestañas */}
      <div className="flex gap-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1 w-fit">
        {([
          { key: "produccion",  label: "Equipos de Producción" },
          { key: "accesorios",  label: "Accesorios de Producción" },
          { key: "oficina",     label: "Equipos de Oficina" },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              subTab === key ? "bg-[#B3985B] text-black" : "text-[#6b7280] hover:text-white"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {subTab === "produccion" && (
        <ActivosTable activos={activosProduccion} categoriaDefault="EQUIPO" onRefresh={onRefresh} />
      )}
      {subTab === "accesorios" && (
        <AccesoriosProduccionTab equipos={accesoriosProduccion} />
      )}
      {subTab === "oficina" && (
        <ActivosTable activos={activosOficina} categoriaDefault="OFICINA" onRefresh={onRefresh} />
      )}
    </div>
  );
}

// ─── TABLA ACTIVOS (reutilizada para Producción y Oficina) ────────────────────
function ActivosTable({ activos, categoriaDefault, onRefresh }: {
  activos: Activo[];
  categoriaDefault: string;
  onRefresh: () => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Estado para edición inline (campo: 'valorActual' | 'precioRenta')
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineField, setInlineField] = useState<"valorActual" | "precioRenta">("valorActual");
  const [inlineVal, setInlineVal] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const EMPTY = { nombre: "", descripcion: "", categoria: categoriaDefault, valorAdquisicion: "", valorActual: "", precioRenta: "", fechaAdquisicion: "", notas: "" };
  const [form, setForm] = useState(EMPTY);

  function startEdit(a: Activo) {
    setEditId(a.id);
    setForm({
      nombre: a.nombre, descripcion: a.descripcion ?? "", categoria: a.categoria,
      valorAdquisicion: String(a.valorAdquisicion), valorActual: String(a.valorActual),
      precioRenta: String(a.precioRenta ?? 0),
      fechaAdquisicion: a.fechaAdquisicion ? a.fechaAdquisicion.slice(0,10) : "",
      notas: a.notas ?? "",
    });
    setShowForm(true);
  }

  function cancel() { setShowForm(false); setEditId(null); setForm(EMPTY); }

  async function save() {
    setSaving(true);
    const url = editId ? `/api/finanzas/hervam/activos/${editId}` : "/api/finanzas/hervam/activos";
    const res = await fetch(url, {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, valorAdquisicion: parseFloat(form.valorAdquisicion) || 0, valorActual: parseFloat(form.valorActual) || 0 }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar activo"); return; }
    await onRefresh();
    cancel();
  }

  async function saveInline(activo: Activo) {
    const nuevoValor = parseFloat(inlineVal);
    if (isNaN(nuevoValor) || nuevoValor < 0) { toast.error("Valor no válido"); return; }
    setInlineSaving(true);
    const res = await fetch(`/api/finanzas/hervam/activos/${activo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [inlineField]: nuevoValor }),
    });
    setInlineSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return; }
    setInlineEditId(null);
    setInlineVal("");
    await onRefresh();
    toast.success("Valor actualizado");
  }

  function startInline(a: Activo, field: "valorActual" | "precioRenta") {
    setInlineEditId(a.id);
    setInlineField(field);
    setInlineVal(String(field === "valorActual" ? a.valorActual : a.precioRenta));
  }

  async function eliminar(id: string) {
    if (!await confirm({ message: "¿Eliminar este activo del inventario?", danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/finanzas/hervam/activos/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al eliminar activo"); return; }
    await onRefresh();
  }

  const totalActual = activos.reduce((s, a) => s + a.valorActual, 0);
  const totalAdqui  = activos.reduce((s, a) => s + a.valorAdquisicion, 0);
  const totalRenta  = activos.reduce((s, a) => s + (a.precioRenta ?? 0), 0);
  // Rentabilidad anual = precio renta * 12 / valor actual
  const rentAnual   = totalActual > 0 ? (totalRenta * 12 / totalActual) * 100 : 0;

  const s = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-semibold">{activos.length} activos registrados</p>
          <p className="text-gray-500 text-xs">Valor total actual: <span className="text-[#B3985B] font-semibold">{fmt(totalActual)}</span></p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg">
            + Agregar activo
          </button>
      </div>

      <Modal
        open={showForm}
        onClose={cancel}
        title={editId ? "Editar activo" : "Nuevo activo"}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Inp label="Nombre del activo *" value={form.nombre} onChange={v => s("nombre", v)} />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Categoría</label>
            <Combobox
              value={form.categoria}
              onChange={v => s("categoria", v)}
              options={Object.entries(CAT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]"
            />
          </div>
          <Inp label="Fecha de adquisición" value={form.fechaAdquisicion} onChange={v => s("fechaAdquisicion", v)} type="date" />
          <Inp label="Valor de adquisición" hint="Cuánto costó originalmente" value={form.valorAdquisicion} onChange={v => s("valorAdquisicion", v)} type="number" prefix="$" />
          <Inp label="Valor actual (en libros)" hint="Valor presente estimado" value={form.valorActual} onChange={v => s("valorActual", v)} type="number" prefix="$" />
          <Inp label="Precio de renta mensual" hint="Ingreso mensual que genera este activo" value={form.precioRenta} onChange={v => s("precioRenta", v)} type="number" prefix="$" />
          <div className="col-span-2">
            <Inp label="Descripción / notas" value={form.descripcion} onChange={v => s("descripcion", v)} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving || !form.nombre}
            className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg">
            {saving ? "Guardando..." : editId ? "Actualizar" : "Agregar"}
          </button>
        </div>
      </Modal>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
        {activos.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-sm">
            <p>No hay activos registrados</p>
            <p className="text-xs mt-1 text-[#555]">Agrega los equipos y bienes que HERVAM arrienda a Mainstage Pro</p>
          </div>
        ) : (
          <>
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {["Activo", "Categoría", "V. Adquisición", "V. Actual", "Precio Renta", "Rentabilidad", "Depreciación", ""].map(h => (
                    <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {activos.map(a => {
                  const depPct   = a.valorAdquisicion > 0 ? ((a.valorAdquisicion - a.valorActual) / a.valorAdquisicion) * 100 : 0;
                  const rentaPct = a.valorActual > 0 && a.precioRenta > 0 ? (a.precioRenta * 12 / a.valorActual) * 100 : 0;
                  const isEditingThis = inlineEditId === a.id;
                  return (
                    <tr key={a.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{a.nombre}</p>
                        {a.descripcion && <p className="text-gray-500 text-xs">{a.descripcion}</p>}
                        {a.fechaAdquisicion && <p className="text-gray-600 text-[10px]">{(() => { const iso = typeof a.fechaAdquisicion === "string" ? a.fechaAdquisicion : (a.fechaAdquisicion as Date).toISOString(); const [y, m, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX"); })()}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-[#1a1a1a] text-[#B3985B] px-1.5 py-0.5 rounded">{CAT_LABELS[a.categoria] ?? a.categoria}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{fmt(a.valorAdquisicion)}</td>
                      {/* V. Actual inline editable */}
                      <td className="px-4 py-3 text-sm text-white font-semibold">
                        {isEditingThis && inlineField === "valorActual" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 text-xs">$</span>
                            <input autoFocus type="number" min="0" step="1" value={inlineVal}
                              onChange={e => setInlineVal(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveInline(a); if (e.key === "Escape") { setInlineEditId(null); } }}
                              className="w-28 bg-[#111] border border-[#B3985B]/60 rounded px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-[#B3985B] tabular-nums" />
                            <button onClick={() => saveInline(a)} disabled={inlineSaving} className="text-green-400 hover:text-green-300 disabled:opacity-50 text-lg leading-none">
                              {inlineSaving ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : "✓"}
                            </button>
                            <button onClick={() => setInlineEditId(null)} className="text-gray-500 hover:text-red-400 text-lg leading-none">×</button>
                          </div>
                        ) : (
                          <div className="group flex items-center gap-1.5 cursor-pointer rounded px-1 -ml-1 hover:bg-[#B3985B]/10 transition-colors"
                            title="Click para editar" onClick={() => startInline(a, "valorActual")}>
                            <span className="group-hover:text-[#B3985B] transition-colors tabular-nums">{fmt(a.valorActual)}</span>
                            <svg className="w-3 h-3 text-transparent group-hover:text-[#B3985B] transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.768-6.768a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.94l-3.414 1.138 1.138-3.414a4 4 0 01.94-1.414z" />
                            </svg>
                          </div>
                        )}
                      </td>

                      {/* Precio Renta mensual inline editable */}
                      <td className="px-4 py-3 text-sm">
                        {isEditingThis && inlineField === "precioRenta" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 text-xs">$</span>
                            <input autoFocus type="number" min="0" step="1" value={inlineVal}
                              onChange={e => setInlineVal(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveInline(a); if (e.key === "Escape") { setInlineEditId(null); } }}
                              className="w-28 bg-[#111] border border-[#B3985B]/60 rounded px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-[#B3985B] tabular-nums" />
                            <button onClick={() => saveInline(a)} disabled={inlineSaving} className="text-green-400 hover:text-green-300 disabled:opacity-50 text-lg leading-none">
                              {inlineSaving ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : "✓"}
                            </button>
                            <button onClick={() => setInlineEditId(null)} className="text-gray-500 hover:text-red-400 text-lg leading-none">×</button>
                          </div>
                        ) : (
                          <div className="group flex items-center gap-1.5 cursor-pointer rounded px-1 -ml-1 hover:bg-[#B3985B]/10 transition-colors"
                            title="Click para editar precio de renta mensual" onClick={() => startInline(a, "precioRenta")}>
                            {a.precioRenta > 0
                              ? <span className="text-white font-semibold group-hover:text-[#B3985B] transition-colors tabular-nums">{fmt(a.precioRenta)}</span>
                              : <span className="text-[#333] italic text-xs group-hover:text-[#B3985B] transition-colors">+ agregar</span>
                            }
                            <svg className="w-3 h-3 text-transparent group-hover:text-[#B3985B] transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.768-6.768a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.94l-3.414 1.138 1.138-3.414a4 4 0 01.94-1.414z" />
                            </svg>
                          </div>
                        )}
                      </td>

                      {/* Rentabilidad anual */}
                      <td className="px-4 py-3">
                        {rentaPct > 0 ? (
                          <div>
                            <span className={`text-xs font-bold ${
                              rentaPct >= 15 ? "text-green-400" : rentaPct >= 8 ? "text-yellow-400" : "text-orange-400"
                            }`}>{rentaPct.toFixed(1)}%</span>
                            <p className="text-[10px] text-[#444] mt-0.5">anual</p>
                          </div>
                        ) : <span className="text-[#333] text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${depPct > 30 ? "text-red-400" : depPct > 10 ? "text-yellow-400" : "text-green-400"}`}>
                          {depPct > 0 ? `-${fmtPct(depPct)}` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(a)} className="text-[#B3985B] text-xs hover:underline">Editar</button>
                          <button onClick={() => eliminar(a.id)} className="text-red-400/60 text-xs hover:text-red-400">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#2a2a2a] bg-[#0d0d0d]">
                  <td className="px-4 py-3 text-[11px] text-gray-500 font-semibold" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 text-sm text-gray-400 font-semibold">{fmt(totalAdqui)}</td>
                  <td className="px-4 py-3 text-sm text-[#B3985B] font-bold">{fmt(totalActual)}</td>
                  <td className="px-4 py-3 text-sm text-white font-bold">{totalRenta > 0 ? fmt(totalRenta) : <span className="text-[#333]">—</span>}</td>
                  <td className="px-4 py-3">
                    {rentAnual > 0 && (
                      <span className={`text-xs font-bold ${
                        rentAnual >= 15 ? "text-green-400" : rentAnual >= 8 ? "text-yellow-400" : "text-orange-400"
                      }`}>{rentAnual.toFixed(1)}%</span>
                    )}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
// ─── ACCESORIOS PRODUCCIÓN TAB ────────────────────────────────────────────────
const ACC_CAT_COLORS: Record<string, string> = {
  cable:        "text-blue-400 bg-blue-900/20 border-blue-700/30",
  herramienta:  "text-yellow-400 bg-yellow-900/20 border-yellow-700/30",
  consumible:   "text-green-400 bg-green-900/20 border-green-700/30",
  soporte:      "text-purple-400 bg-purple-900/20 border-purple-700/30",
  otro:         "text-gray-400 bg-gray-800/20 border-gray-700/30",
};

function AccesoriosProduccionTab({ equipos }: { equipos: AccesoriosProduccionData[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const totalAccesorios = equipos.reduce((s, e) => s + e.accesorios.length, 0);

  if (equipos.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-10 text-center space-y-2">
        <p className="text-gray-500 text-sm">No hay accesorios registrados en el inventario de producción</p>
        <p className="text-[#444] text-xs">Ve a <span className="text-[#B3985B]">Inventario → Equipos</span> y agrega accesorios a los equipos para verlos aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header de contexto */}
      <div className="flex items-center justify-between">
        <p className="text-white text-sm font-semibold">{totalAccesorios} accesorios en {equipos.length} equipos</p>
        <p className="text-[#444] text-xs">Datos sincronizados desde Inventario → Equipos</p>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden divide-y divide-[#1a1a1a]">
        {equipos.map(equipo => {
          const isOpen = expanded.has(equipo.id);
          const nombre = [equipo.marca, equipo.modelo, equipo.descripcion].filter(Boolean).join(" · ");
          return (
            <div key={equipo.id}>
              {/* Fila del equipo */}
              <button
                onClick={() => toggle(equipo.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-4 h-4 text-[#555] transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <div>
                    <p className="text-white text-sm font-medium group-hover:text-[#B3985B] transition-colors">{nombre}</p>
                    <p className="text-[#555] text-[10px]">{equipo.categoria.nombre}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 px-2 py-0.5 rounded-full font-semibold">
                    {equipo.accesorios.length} {equipo.accesorios.length === 1 ? "accesorio" : "accesorios"}
                  </span>
                  {equipo.precioRenta > 0 && (
                    <span className="text-[10px] text-gray-500">
                      {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(equipo.precioRenta)}/mes
                    </span>
                  )}
                </div>
              </button>

              {/* Lista de accesorios expandida */}
              {isOpen && (
                <div className="bg-[#0d0d0d] border-t border-[#1a1a1a] divide-y divide-[#141414]">
                  {equipo.accesorios.map(acc => (
                    <div key={acc.id} className="flex items-center gap-3 px-10 py-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2a2a2a] shrink-0" />
                      <p className="text-gray-300 text-sm flex-1">{acc.nombre}</p>
                      {acc.categoria && (
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border capitalize ${
                          ACC_CAT_COLORS[acc.categoria] ?? "text-gray-500 bg-gray-800/20 border-gray-700/30"
                        }`}>
                          {acc.categoria}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[#333] text-xs text-right">
        Para gestionar accesorios ve a <span className="text-[#555]">Inventario → Maestro → Editar equipo → Accesorios</span>
      </p>
    </div>
  );
}

// ─── CONFIG TAB ───────────────────────────────────────────────────────────────
function ConfigTab({ configData, onRefresh }: { configData: ConfigData; onRefresh: () => void }) {
  const { config } = configData;
  const [form, setForm] = useState({
    valorTotalActivos: String(config.valorTotalActivos),
    tasaAnualRendimiento: String(config.tasaAnualRendimiento),
    usarSumaActivos: config.usarSumaActivos,
    modoActivo: config.modoActivo,
    porcentajeVariable: String(config.porcentajeVariable),
    pisoMinimoFijo: String(config.pisoMinimoFijo),
    creditoSaldoInicial: String(config.creditoSaldoInicial),
    creditoSaldoActual: String(config.creditoSaldoActual),
    creditoCuotaMensual: String(config.creditoCuotaMensual),
    creditoPlazoMeses: String(config.creditoPlazoMeses),
    creditoFechaInicio: config.creditoFechaInicio ? config.creditoFechaInicio.slice(0,10) : "",
    notas: config.notas ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const s = (k: string, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }));

  async function save() {
    setSaving(true);
    await fetch("/api/finanzas/hervam/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    await onRefresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  const valorEfectivo = form.usarSumaActivos ? configData.valorEfectivo : parseFloat(form.valorTotalActivos) || 0;
  const tasa = parseFloat(form.tasaAnualRendimiento) || 0;
  const montoFijoPreview = (valorEfectivo * tasa) / 1200;
  const pisoPreview = montoFijoPreview * (parseFloat(form.pisoMinimoFijo) || 0) / 100;

  return (
    <div className="space-y-5">
      {/* Valuación */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Valuación de activos</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[11px] text-gray-500 mb-2 block">Cómo calcular el valor base</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!form.usarSumaActivos} onChange={() => s("usarSumaActivos", false)}
                  className="accent-[#B3985B]" />
                <span className="text-sm text-white">Valor declarado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={form.usarSumaActivos} onChange={() => s("usarSumaActivos", true)}
                  className="accent-[#B3985B]" />
                <span className="text-sm text-white">Suma de activos registrados</span>
              </label>
            </div>
          </div>
          {!form.usarSumaActivos && (
            <Inp label="Valor total de activos" hint="Monto declarado de activos HERVAM en Mainstage Pro" value={form.valorTotalActivos} onChange={v => s("valorTotalActivos", v)} type="number" prefix="$" />
          )}
          <Inp label="Tasa anual de rendimiento (%)" hint="Retorno que HERVAM espera sobre sus activos" value={form.tasaAnualRendimiento} onChange={v => s("tasaAnualRendimiento", v)} type="number" prefix="%" />
        </div>
        <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3 text-sm">
          <p className="text-gray-500 text-xs mb-1">Vista previa</p>
          <p className="text-white">Valor base: <span className="text-[#B3985B] font-bold">{fmt(valorEfectivo)}</span></p>
          <p className="text-white mt-0.5">Renta fija mensual: <span className="text-[#B3985B] font-bold">{fmt(montoFijoPreview)}</span></p>
          <p className="text-gray-500 text-xs mt-0.5">({fmt(valorEfectivo)} × {tasa}% ÷ 12)</p>
        </div>
      </div>

      {/* Modo de cálculo */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Modo de cálculo</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: "FIJO", title: "Fijo", desc: "Siempre paga el monto fijo, sin importar la utilidad" },
            { key: "VARIABLE", title: "Variable", desc: "Paga según la utilidad del mes, con piso y techo" },
            { key: "HIBRIDO", title: "Híbrido ★", desc: "Fijo si hay buena utilidad; variable si el mes es bajo" },
          ].map(m => (
            <button key={m.key} onClick={() => s("modoActivo", m.key)}
              className={`p-3 rounded-xl border text-left transition-colors ${form.modoActivo === m.key ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#1e1e1e] hover:border-[#2a2a2a]"}`}>
              <p className={`text-sm font-semibold ${form.modoActivo === m.key ? "text-[#B3985B]" : "text-white"}`}>{m.title}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>

        {form.modoActivo !== "FIJO" && (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <Inp label="% de utilidad neta" hint={`Si la utilidad es $200k → paga $${((200000 * parseFloat(form.porcentajeVariable || "0")) / 100).toLocaleString("es-MX")}`}
              value={form.porcentajeVariable} onChange={v => s("porcentajeVariable", v)} type="number" prefix="%" />
            <Inp label="Piso mínimo (% del monto fijo)" hint={`HERVAM siempre recibe mínimo $${pisoPreview.toLocaleString("es-MX", {maximumFractionDigits: 0})}`}
              value={form.pisoMinimoFijo} onChange={v => s("pisoMinimoFijo", v)} type="number" prefix="%" />
          </div>
        )}
      </div>

      {/* Crédito */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Crédito garantizado</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Crédito de $800,000 con garantía personal — la renta a HERVAM sirve para cubrir este crédito</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Inp label="Crédito inicial" value={form.creditoSaldoInicial} onChange={v => s("creditoSaldoInicial", v)} type="number" prefix="$" />
          <Inp label="Saldo actual" value={form.creditoSaldoActual} onChange={v => s("creditoSaldoActual", v)} type="number" prefix="$" />
          <Inp label="Cuota mensual" value={form.creditoCuotaMensual} onChange={v => s("creditoCuotaMensual", v)} type="number" prefix="$" />
          <Inp label="Plazo (meses)" value={form.creditoPlazoMeses} onChange={v => s("creditoPlazoMeses", v)} type="number" />
          <Inp label="Fecha inicio del crédito" value={form.creditoFechaInicio} onChange={v => s("creditoFechaInicio", v)} type="date" />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-gray-500 mb-1 block">Notas generales</label>
        <textarea value={form.notas} onChange={e => s("notas", e.target.value)} rows={3}
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] resize-none"
          placeholder="Acuerdos, condiciones adicionales, observaciones sobre la estructura..." />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold px-6 py-2 rounded-lg">
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
        {saved && <span className="text-green-400 text-sm">✓ Guardado</span>}
      </div>
    </div>
  );
}

// ─── HISTORIAL TAB ────────────────────────────────────────────────────────────
function HistorialTab({ pagos, configData, onRefresh }: {
  pagos: Pago[]; configData: ConfigData; onRefresh: () => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ montoAcordado: "", montoPagado: "", estado: "", notas: "" });
  const [saving, setSaving] = useState(false);

  const totalAcordado = pagos.reduce((s, p) => s + p.montoAcordado, 0);
  const totalPagado = pagos.reduce((s, p) => s + p.montoPagado, 0);

  function startEdit(p: Pago) {
    setEditId(p.id);
    setEditForm({ montoAcordado: String(p.montoAcordado), montoPagado: String(p.montoPagado), estado: p.estado, notas: p.notas ?? "" });
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/finanzas/hervam/pagos/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        montoAcordado: parseFloat(editForm.montoAcordado),
        montoPagado: parseFloat(editForm.montoPagado),
        estado: editForm.estado,
        notas: editForm.notas || null,
        pagadoEn: editForm.estado === "PAGADO" ? new Date().toISOString() : null,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return; }
    await onRefresh();
    setEditId(null);
  }

  async function deletePago(id: string) {
    if (!await confirm({ message: "¿Eliminar este registro? No se puede deshacer.", danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/finanzas/hervam/pagos/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al eliminar"); return; }
    await onRefresh();
  }

  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();
  const pagoActual = pagos.find(p => p.mes === mesActual && p.anio === anioActual);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-semibold">{pagos.length} meses registrados</p>
          <p className="text-gray-500 text-xs">
            Total acordado: <span className="text-white font-semibold">{fmt(totalAcordado)}</span>
            {" · "}Pagado: <span className="text-green-400 font-semibold">{fmt(totalPagado)}</span>
          </p>
        </div>
        {!pagoActual && (
          <p className="text-xs text-[#555]">Registra el mes actual desde Resumen</p>
        )}
      </div>

      {pagos.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-10 text-center text-gray-600 text-sm">
          No hay pagos registrados aún. Registra el primer mes desde la pestaña Resumen.
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Mes","Modo","Monto fijo","Utilidad real","Variable calc.","Acordado","Pagado","Estado",""].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-3 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {pagos.map(p => (
                <>
                  <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-3 py-3 text-sm text-white font-medium whitespace-nowrap">
                      {MESES[p.mes - 1]} {p.anio}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.modoPago === "FIJO" ? "bg-[#B3985B]/10 text-[#B3985B]" : "bg-blue-900/20 text-blue-400"}`}>
                        {p.modoPago ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">{fmt(p.montoFijo)}</td>
                    <td className="px-3 py-3 text-xs text-gray-300">
                      {p.utilidadMes !== null ? fmt(p.utilidadMes) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">
                      {p.montoVariable !== null ? fmt(p.montoVariable) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-sm text-white font-semibold">{fmt(p.montoAcordado)}</td>
                    <td className="px-3 py-3 text-sm font-semibold">
                      <span className={p.montoPagado >= p.montoAcordado ? "text-green-400" : "text-yellow-400"}>
                        {fmt(p.montoPagado)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ESTADO_COLORS[p.estado] ?? "text-gray-400 bg-gray-800 border-gray-700"}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => editId === p.id ? setEditId(null) : startEdit(p)}
                          className="text-[#B3985B] text-xs hover:underline">
                          {editId === p.id ? "Cerrar" : "Editar"}
                        </button>
                        <button onClick={() => deletePago(p.id)}
                          className="text-red-500 text-xs hover:underline">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editId === p.id && (
                    <tr key={`edit-${p.id}`} className="bg-[#0d0d0d]">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <Inp label="Monto acordado" value={editForm.montoAcordado} onChange={v => setEditForm(f => ({...f, montoAcordado: v}))} type="number" prefix="$" />
                          <Inp label="Monto pagado" value={editForm.montoPagado} onChange={v => setEditForm(f => ({...f, montoPagado: v}))} type="number" prefix="$" />
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">Estado</label>
                            <Combobox
                              value={editForm.estado}
                              onChange={v => setEditForm(f => ({...f, estado: v}))}
                              options={["PENDIENTE","PARCIAL","PAGADO","DIFERIDO"].map(e => ({ value: e, label: e }))}
                              className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                            />
                          </div>
                          <Inp label="Notas" value={editForm.notas} onChange={v => setEditForm(f => ({...f, notas: v}))} />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={saveEdit} disabled={saving}
                            className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-xs px-4 py-1.5 rounded-lg">
                            {saving ? "..." : "Guardar"}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-gray-500 text-xs">Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#2a2a2a] bg-[#0d0d0d]">
                <td className="px-3 py-3 text-[11px] text-gray-500 font-semibold" colSpan={5}>TOTALES</td>
                <td className="px-3 py-3 text-sm text-[#B3985B] font-bold">{fmt(totalAcordado)}</td>
                <td className="px-3 py-3 text-sm text-green-400 font-bold">{fmt(totalPagado)}</td>
                <td className="px-3 py-3 text-sm text-orange-400 font-bold">{fmt(Math.max(0, totalAcordado - totalPagado))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
