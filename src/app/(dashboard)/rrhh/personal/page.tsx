"use client";

import { useEffect, useState } from "react";
import { SkeletonCards } from "@/components/Skeleton";
import Link from "next/link";

interface PersonalInterno {
  id: string; nombre: string; puesto: string; departamento: string;
  tipo: string; telefono: string | null; correo: string | null;
  salario: number | null; periodoPago: string; activo: boolean;
  _count: { documentos: number; pagos: number };
  pagos: { id: string; monto: number; periodo: string }[];
}

const DEPARTAMENTOS = ["GENERAL", "BODEGA", "COORDINACION", "PRODUCCION", "ADMINISTRACION", "VENTAS"];
const TIPOS_PERIODO = ["MENSUAL", "QUINCENAL", "SEMANAL", "POR_EVENTO"];
const DEPTO_COLORS: Record<string, string> = {
  BODEGA: "bg-yellow-900/40 text-yellow-300", COORDINACION: "bg-blue-900/40 text-blue-300",
  PRODUCCION: "bg-purple-900/40 text-purple-300", ADMINISTRACION: "bg-green-900/40 text-green-300",
  VENTAS: "bg-orange-900/40 text-orange-300", GENERAL: "bg-gray-800 text-gray-400",
};

function fmt(n: number) { return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n); }

export default function PersonalPage() {
  const [personal, setPersonal] = useState<PersonalInterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "card">("list");
  const [form, setForm] = useState({ nombre: "", puesto: "", departamento: "GENERAL", tipo: "EMPLEADO", telefono: "", correo: "", salario: "", periodoPago: "MENSUAL", fechaIngreso: "", cuentaBancaria: "", datosFiscales: "", notas: "" });

  async function load() {
    const r = await fetch("/api/rrhh/personal", { cache: "no-store" });
    const d = await r.json();
    setPersonal(d.personal ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function crear() {
    if (!form.nombre || !form.puesto) return;
    setSaving(true);
    await fetch("/api/rrhh/personal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    await load();
    setForm({ nombre: "", puesto: "", departamento: "GENERAL", tipo: "EMPLEADO", telefono: "", correo: "", salario: "", periodoPago: "MENSUAL", fechaIngreso: "", cuentaBancaria: "", datosFiscales: "", notas: "" });
    setShowForm(false);
    setSaving(false);
  }

  const activos = personal.filter(p => p.activo);
  const inactivos = personal.filter(p => !p.activo);
  const pagosPendientes = personal.flatMap(p => p.pagos);
  const totalPendiente = pagosPendientes.reduce((s, p) => s + p.monto, 0);

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Personal Interno</h1>
          <p className="text-[#6b7280] text-sm">{activos.length} activos · {pagosPendientes.length > 0 ? <span className="text-yellow-400">{pagosPendientes.length} pagos pendientes ({fmt(totalPendiente)})</span> : "sin pagos pendientes"}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5">
            <button
              onClick={() => setView("list")}
              title="Vista lista"
              className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/>
                <rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor"/>
                <rect x="1" y="11" width="14" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
            <button
              onClick={() => setView("card")}
              title="Vista tarjetas"
              className={`p-1.5 rounded-md transition-colors ${view === "card" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <Link href="/rrhh/nomina" className="bg-[#1a1a1a] border border-[#333] hover:bg-[#222] text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">Nómina</Link>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              + Agregar
            </button>
          )}
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nueva persona</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Nombre completo *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="EMPLEADO">Empleado</option>
                <option value="FREELANCE_RECURRENTE">Freelance recurrente</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Puesto *</label>
              <input value={form.puesto} onChange={e => setForm(p => ({ ...p, puesto: e.target.value }))} placeholder="Ej: Encargado de bodega"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Departamento</label>
              <select value={form.departamento} onChange={e => setForm(p => ({ ...p, departamento: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ingreso</label>
              <input type="date" value={form.fechaIngreso} onChange={e => setForm(p => ({ ...p, fechaIngreso: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Correo</label>
              <input value={form.correo} onChange={e => setForm(p => ({ ...p, correo: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Salario / tarifa</label>
              <input type="number" value={form.salario} onChange={e => setForm(p => ({ ...p, salario: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Periodo de pago</label>
              <select value={form.periodoPago} onChange={e => setForm(p => ({ ...p, periodoPago: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {TIPOS_PERIODO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="text-xs text-gray-500 mb-1 block">Cuenta bancaria</label>
              <input value={form.cuentaBancaria} onChange={e => setForm(p => ({ ...p, cuentaBancaria: e.target.value }))} placeholder="CLABE / número de cuenta"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={crear} disabled={saving || !form.nombre || !form.puesto}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : "Crear"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista / Tarjetas */}
      {loading ? (
        <SkeletonCards count={5} />
      ) : personal.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-12 text-center">
          <p className="text-gray-600 text-sm">Sin personal registrado</p>
        </div>
      ) : view === "list" ? (
        /* ── LISTA ── */
        <div className="space-y-2">
          {activos.map(p => (
            <Link key={p.id} href={`/rrhh/personal/${p.id}`}
              className="flex items-center justify-between bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-4 hover:bg-[#141414] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                  <span className="text-[#B3985B] text-sm font-bold">{p.nombre.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{p.nombre}</p>
                  <p className="text-gray-500 text-xs">{p.puesto}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${DEPTO_COLORS[p.departamento] ?? "bg-gray-800 text-gray-400"}`}>{p.departamento}</span>
                {p.salario && <span className="text-gray-400 text-xs">{fmt(p.salario)}/{p.periodoPago.toLowerCase()}</span>}
                {p.pagos.length > 0 && <span className="text-yellow-400 text-xs font-medium">{p.pagos.length} pendiente{p.pagos.length !== 1 ? "s" : ""}</span>}
                <span className="text-gray-600 text-xs">→</span>
              </div>
            </Link>
          ))}
          {inactivos.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-gray-600 uppercase tracking-wider px-1 mb-2">Inactivos ({inactivos.length})</p>
              {inactivos.map(p => (
                <Link key={p.id} href={`/rrhh/personal/${p.id}`}
                  className="flex items-center justify-between bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-5 py-3 hover:bg-[#111] transition-colors opacity-60 mb-1">
                  <p className="text-gray-400 text-sm">{p.nombre}</p>
                  <p className="text-gray-600 text-xs">{p.puesto}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── TARJETAS ── */
        <div className="space-y-4">
          {activos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activos.map(p => (
                <Link key={p.id} href={`/rrhh/personal/${p.id}`}
                  className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 hover:bg-[#141414] hover:border-[#2a2a2a] transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                      <span className="text-[#B3985B] text-base font-bold">{p.nombre.charAt(0)}</span>
                    </div>
                    {p.pagos.length > 0 && (
                      <span className="text-yellow-400 text-[10px] font-medium bg-yellow-400/10 px-2 py-0.5 rounded-full">
                        {p.pagos.length} pago{p.pagos.length !== 1 ? "s" : ""} pendiente{p.pagos.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm font-semibold leading-tight">{p.nombre}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{p.puesto}</p>
                  <div className="mt-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${DEPTO_COLORS[p.departamento] ?? "bg-gray-800 text-gray-400"}`}>
                      {p.departamento}
                    </span>
                  </div>
                  {p.salario && (
                    <div className="mt-4 pt-3 border-t border-[#1a1a1a]">
                      <p className="text-white text-sm font-semibold">{fmt(p.salario)}</p>
                      <p className="text-[#555] text-[10px]">{p.periodoPago.toLowerCase()}</p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
          {inactivos.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider px-1 mb-2">Inactivos ({inactivos.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {inactivos.map(p => (
                  <Link key={p.id} href={`/rrhh/personal/${p.id}`}
                    className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 hover:bg-[#111] transition-all opacity-50">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-3">
                      <span className="text-gray-500 text-sm font-bold">{p.nombre.charAt(0)}</span>
                    </div>
                    <p className="text-gray-400 text-sm font-medium">{p.nombre}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{p.puesto}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
