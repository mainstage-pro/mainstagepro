"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PagoNomina {
  id: string;
  periodo: string;
  tipoPeriodo: string;
  monto: number;
  concepto: string | null;
  estado: string;
  fechaPago: string | null;
  metodoPago: string;
  notas: string | null;
  personal: { id: string; nombre: string; puesto: string; departamento: string; cuentaBancaria: string | null };
  cuentaOrigen: { id: string; nombre: string } | null;
}

interface PersonalRow {
  id: string; nombre: string; puesto: string; departamento: string;
  salario: number | null; periodoPago: string; cuentaBancaria: string | null;
}

interface Cuenta { id: string; nombre: string }

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

// Devuelve el lunes de la semana actual como YYYY-MM-DD
function getLunes() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

// Quincena actual: "2026-04-01" ó "2026-04-16"
function getQuincena() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return d.getDate() <= 15 ? `${y}-${m}-01` : `${y}-${m}-16`;
}

// Mes actual
function getMes() {
  return new Date().toISOString().slice(0, 7);
}

const PERIODO_DEFAULTS: Record<string, () => string> = {
  SEMANAL:   getLunes,
  QUINCENAL: getQuincena,
  MENSUAL:   getMes,
};

const TIPO_LABELS: Record<string, string> = {
  SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual",
};

const DEPTO_COLORS: Record<string, string> = {
  BODEGA: "bg-yellow-900/40 text-yellow-300",
  COORDINACION: "bg-blue-900/40 text-blue-300",
  PRODUCCION: "bg-purple-900/40 text-purple-300",
  ADMINISTRACION: "bg-green-900/40 text-green-300",
  VENTAS: "bg-orange-900/40 text-orange-300",
  GENERAL: "bg-gray-800 text-gray-400",
};

export default function NominaPage() {
  const [pendientes, setPendientes] = useState<PagoNomina[]>([]);
  const [historial, setHistorial] = useState<PagoNomina[]>([]);
  const [personal, setPersonal] = useState<PersonalRow[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);

  // Generar nómina
  const [generando, setGenerando] = useState(false);
  const [genTipo, setGenTipo] = useState<"SEMANAL" | "QUINCENAL" | "MENSUAL">("SEMANAL");
  const [genPeriodo, setGenPeriodo] = useState(getLunes());
  const [genResult, setGenResult] = useState<{ created: number; skipped: number } | null>(null);
  const [showGenForm, setShowGenForm] = useState(false);

  // Confirmar pago
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [pagoData, setPagoData] = useState<Record<string, { cuentaId: string; metodo: string; fecha: string }>>({});

  async function load() {
    const r = await fetch("/api/rrhh/nomina");
    const d = await r.json();
    setPendientes(d.pendientes ?? []);
    setHistorial(d.historial ?? []);
    setPersonal(d.personal ?? []);
    setCuentas(d.cuentas ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Cuando cambia tipoPeriodo, actualizar fecha sugerida
  useEffect(() => {
    setGenPeriodo(PERIODO_DEFAULTS[genTipo]?.() ?? getLunes());
  }, [genTipo]);

  async function generarNomina() {
    setGenerando(true);
    setGenResult(null);
    const r = await fetch("/api/rrhh/nomina", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodo: genPeriodo, tipoPeriodo: genTipo }),
    });
    const d = await r.json();
    setGenResult(d);
    setGenerando(false);
    await load();
  }

  function getPagoData(id: string) {
    return pagoData[id] ?? { cuentaId: cuentas[0]?.id ?? "", metodo: "TRANSFERENCIA", fecha: new Date().toISOString().slice(0, 10) };
  }

  function setPago(id: string, key: string, value: string) {
    setPagoData(prev => ({ ...prev, [id]: { ...getPagoData(id), [key]: value } }));
  }

  async function confirmarPago(pago: PagoNomina) {
    setConfirmando(pago.id);
    const data = getPagoData(pago.id);
    await fetch(`/api/rrhh/personal/${pago.personal.id}/pagos/${pago.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estado: "PAGADO",
        cuentaOrigenId: data.cuentaId || null,
        metodoPago: data.metodo,
        fechaPago: data.fecha,
      }),
    });
    setConfirmando(null);
    await load();
  }

  const totalPendiente = pendientes.reduce((s, p) => s + p.monto, 0);
  const totalPagado = historial.reduce((s, p) => s + p.monto, 0);
  const mesActual = getMes();
  const nominaMes = historial.filter(p => p.periodo.startsWith(mesActual));

  // Agrupar pendientes por tipo de período
  const pendientesPorTipo = pendientes.reduce<Record<string, PagoNomina[]>>((acc, p) => {
    if (!acc[p.tipoPeriodo]) acc[p.tipoPeriodo] = [];
    acc[p.tipoPeriodo].push(p);
    return acc;
  }, {});

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Nómina</h1>
          <p className="text-[#6b7280] text-sm">
            {personal.length} activos ·{" "}
            {pendientes.length > 0 && <span className="text-yellow-400">{pendientes.length} pagos pendientes</span>}
            {pendientes.length === 0 && "sin pagos pendientes"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/rrhh/personal" className="bg-[#1a1a1a] border border-[#333] hover:bg-[#222] text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
            Personal
          </Link>
          <button onClick={() => setShowGenForm(v => !v)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {showGenForm ? "Cancelar" : "Generar nómina"}
          </button>
        </div>
      </div>

      {/* ── GENERAR NÓMINA ── */}
      {showGenForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Generar pagos pendientes</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo de período</label>
              <select value={genTipo} onChange={e => setGenTipo(e.target.value as typeof genTipo)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="SEMANAL">Semanal</option>
                <option value="QUINCENAL">Quincenal</option>
                <option value="MENSUAL">Mensual</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                {genTipo === "SEMANAL" ? "Semana (lunes)" : genTipo === "QUINCENAL" ? "Quincena (inicio)" : "Mes (YYYY-MM)"}
              </label>
              <input type={genTipo === "MENSUAL" ? "month" : "date"}
                value={genPeriodo}
                onChange={e => setGenPeriodo(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="flex items-end">
              <button onClick={generarNomina} disabled={generando}
                className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                {generando ? "Generando..." : "Generar"}
              </button>
            </div>
          </div>

          {/* Resultado */}
          {genResult && (
            <div className={`text-sm px-4 py-2.5 rounded-lg ${genResult.created > 0 ? "bg-green-900/20 text-green-300 border border-green-800/40" : "bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a]"}`}>
              {genResult.created > 0
                ? `✓ Se generaron ${genResult.created} pago${genResult.created !== 1 ? "s" : ""} pendientes${genResult.skipped > 0 ? ` · ${genResult.skipped} ya existían` : ""}`
                : `Sin cambios — todos los pagos de este período ya estaban registrados (${genResult.skipped})`}
            </div>
          )}

          {/* Personal que aplica */}
          {personal.filter(p => p.periodoPago === genTipo && p.salario).length > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-2">Aplica para:</p>
              <div className="flex flex-wrap gap-2">
                {personal.filter(p => p.periodoPago === genTipo && p.salario).map(p => (
                  <span key={p.id} className="text-xs bg-[#1a1a1a] text-gray-300 px-2 py-1 rounded-lg">
                    {p.nombre} · {fmt(p.salario!)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPIs ── */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#111] border border-yellow-900/30 rounded-xl p-4">
            <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Por pagar</p>
            <p className="text-yellow-400 text-xl font-semibold">{fmt(totalPendiente)}</p>
            <p className="text-gray-600 text-xs mt-0.5">{pendientes.length} pagos</p>
          </div>
          <div className="bg-[#111] border border-green-900/30 rounded-xl p-4">
            <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Pagado (historial)</p>
            <p className="text-green-400 text-xl font-semibold">{fmt(totalPagado)}</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Este mes</p>
            <p className="text-white text-xl font-semibold">{fmt(nominaMes.reduce((s, p) => s + p.monto, 0))}</p>
          </div>
        </div>
      )}

      {/* ── PAGOS PENDIENTES ── */}
      {pendientes.length > 0 && (
        <div className="space-y-4">
          {Object.entries(pendientesPorTipo).map(([tipo, items]) => (
            <div key={tipo} className="bg-[#111] border border-yellow-900/20 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <p className="text-xs text-yellow-300 font-semibold uppercase tracking-wider">
                    Pendientes — {TIPO_LABELS[tipo] ?? tipo}
                  </p>
                </div>
                <p className="text-yellow-300 text-sm font-semibold">
                  {fmt(items.reduce((s, p) => s + p.monto, 0))}
                </p>
              </div>

              <div className="divide-y divide-[#1a1a1a]">
                {items.map(pago => {
                  const data = getPagoData(pago.id);
                  const isConfirmando = confirmando === pago.id;
                  return (
                    <div key={pago.id} className="px-5 py-4">
                      {/* Fila principal */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-white text-sm font-medium">{pago.personal.nombre}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${DEPTO_COLORS[pago.personal.departamento] ?? DEPTO_COLORS.GENERAL}`}>
                              {pago.personal.departamento}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs">{pago.personal.puesto}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{pago.concepto ?? `${TIPO_LABELS[pago.tipoPeriodo]} ${pago.periodo}`}</p>
                          {pago.personal.cuentaBancaria && (
                            <p className="text-gray-700 text-xs mt-0.5">Cuenta: {pago.personal.cuentaBancaria}</p>
                          )}
                        </div>
                        <p className="text-white text-base font-semibold shrink-0">{fmt(pago.monto)}</p>
                      </div>

                      {/* Controles de pago */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select value={data.metodo} onChange={e => setPago(pago.id, "metodo", e.target.value)}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]">
                          <option value="TRANSFERENCIA">Transferencia</option>
                          <option value="EFECTIVO">Efectivo</option>
                          <option value="TARJETA">Tarjeta</option>
                        </select>
                        {cuentas.length > 0 && (
                          <select value={data.cuentaId} onChange={e => setPago(pago.id, "cuentaId", e.target.value)}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]">
                            <option value="">— Cuenta —</option>
                            {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        )}
                        <input type="date" value={data.fecha} onChange={e => setPago(pago.id, "fecha", e.target.value)}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                        <button onClick={() => confirmarPago(pago)} disabled={isConfirmando}
                          className={`ml-auto font-semibold text-xs px-4 py-2 rounded-lg transition-all ${
                            isConfirmando
                              ? "bg-gray-700 text-gray-400 cursor-wait"
                              : "bg-green-800 hover:bg-green-700 text-white"
                          }`}>
                          {isConfirmando ? "Procesando..." : "✓ Confirmar pago"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && pendientes.length === 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-10 text-center">
          <p className="text-green-400 text-sm font-medium">Sin pagos pendientes</p>
          <p className="text-gray-600 text-xs mt-1">Usa "Generar nómina" cada lunes para crear los pagos del período</p>
        </div>
      )}

      {/* ── ESTIMADO MENSUAL ── */}
      {personal.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a]">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Personal activo — tarifas base</p>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {personal.map(p => (
              <Link key={p.id} href={`/rrhh/personal/${p.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                    <span className="text-[#B3985B] text-[10px] font-bold">{p.nombre.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm">{p.nombre}</p>
                    <p className="text-gray-500 text-xs">{p.puesto}</p>
                  </div>
                </div>
                <div className="text-right">
                  {p.salario ? (
                    <>
                      <p className="text-white text-sm font-medium">{fmt(p.salario)}</p>
                      <p className="text-gray-500 text-xs">{TIPO_LABELS[p.periodoPago] ?? p.periodoPago}</p>
                    </>
                  ) : (
                    <p className="text-gray-600 text-xs">Sin tarifa</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {historial.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a]">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Historial de pagos</p>
          </div>
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Persona", "Período", "Concepto", "Monto", "Fecha", "Método"].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {historial.map(p => (
                <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/rrhh/personal/${p.personal.id}`} className="text-white text-sm hover:text-[#B3985B]">{p.personal.nombre}</Link>
                    <p className="text-gray-600 text-xs">{p.personal.puesto}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.periodo}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{p.concepto ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-white font-medium">{fmt(p.monto)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.fechaPago ? new Date(p.fechaPago).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{p.metodoPago?.toLowerCase() ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
