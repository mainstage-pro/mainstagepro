"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Combobox } from "@/components/Combobox";

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

// Mes actual
function getMes() {
  return new Date().toISOString().slice(0, 7);
}

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

  // Confirmar pago
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [pagoData, setPagoData] = useState<Record<string, { cuentaId: string; metodo: string; fecha: string }>>({});

  async function load() {
    const r = await fetch("/api/rrhh/nomina", { cache: "no-store" });
    const d = await r.json();
    setPendientes(d.pendientes ?? []);
    setHistorial(d.historial ?? []);
    setPersonal(d.personal ?? []);
    setCuentas(d.cuentas ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        </div>
      </div>


      {/* ── KPIs ── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <Combobox
                          value={data.metodo}
                          onChange={v => setPago(pago.id, "metodo", v)}
                          options={[{ value: "TRANSFERENCIA", label: "Transferencia" }, { value: "EFECTIVO", label: "Efectivo" }, { value: "TARJETA", label: "Tarjeta" }]}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]"
                        />
                        {cuentas.length > 0 && (
                          <Combobox
                            value={data.cuentaId}
                            onChange={v => setPago(pago.id, "cuentaId", v)}
                            options={[{ value: "", label: "— Cuenta —" }, ...cuentas.map(c => ({ value: c.id, label: c.nombre }))]}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]"
                          />
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
          <p className="text-gray-600 text-xs mt-1">No hay pagos pendientes en este momento</p>
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
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
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
                    {p.fechaPago ? (() => { const [y,m,d] = p.fechaPago!.substring(0,10).split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("es-MX",{day:"numeric",month:"short"}); })() : "—"}
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
