"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";

interface Documento { id: string; tipo: string; nombre: string; url: string; fechaVencimiento: string | null; createdAt: string }
interface PagoNomina { id: string; periodo: string; tipoPeriodo: string; monto: number; concepto: string | null; estado: string; fechaPago: string | null; metodoPago: string; notas: string | null; cuentaOrigen: { nombre: string } | null }
interface CuentaBancaria { id: string; nombre: string; banco: string | null }
interface PersonalData {
  id: string; nombre: string; puesto: string; departamento: string; tipo: string;
  telefono: string | null; correo: string | null; salario: number | null; periodoPago: string;
  fechaIngreso: string | null; activo: boolean; cuentaBancaria: string | null;
  datosFiscales: string | null; notas: string | null;
  banco: string | null; clabe: string | null; numeroCuenta: string | null; numeroTarjeta: string | null;
  ineUrl: string | null; domicilio: string | null;
  emergenciaNombre: string | null; emergenciaTel: string | null;
  padecimientos: string | null;
  documentos: Documento[]; pagos: PagoNomina[];
}

const DEPARTAMENTOS = ["GENERAL", "BODEGA", "COORDINACION", "PRODUCCION", "ADMINISTRACION", "VENTAS"];
const TIPOS_PERIODO = ["MENSUAL", "QUINCENAL", "SEMANAL", "POR_EVENTO"];

function fmt(n: number) { return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n); }
function fmtDate(s: string | null) { return s ? new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }

export default function PersonalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [persona, setPersona] = useState<PersonalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [tab, setTab] = useState<"info" | "pagos" | "documentos">("info");
  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PersonalData>>({});
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const editFormLoaded = useRef(false);
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nuevo pago
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [pagoForm, setPagoForm] = useState({ periodo: new Date().toISOString().slice(0, 7), tipoPeriodo: "MENSUAL", monto: "", concepto: "", cuentaOrigenId: "", notas: "" });
  const [addingPago, setAddingPago] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [fechaPagoReal, setFechaPagoReal] = useState(new Date().toISOString().split("T")[0]);

  async function load() {
    const r = await fetch(`/api/rrhh/personal/${id}`, { cache: "no-store" });
    const d = await r.json();
    setPersona(d.persona);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/cuentas").then(r => r.json()).then(d => setCuentas(d.cuentas ?? []));
  }, [id]);

  // Auto-save editForm whenever it changes (only while editando)
  useEffect(() => {
    if (!editando || !editFormLoaded.current) return;
    if (editTimer.current) clearTimeout(editTimer.current);
    setSaving(true);
    editTimer.current = setTimeout(async () => {
      await fetch(`/api/rrhh/personal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      setAutoSaved(true);
      setSaving(false);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }, [editForm]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar() {
    if (editTimer.current) clearTimeout(editTimer.current);
    setSaving(true);
    await fetch(`/api/rrhh/personal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    await load();
    setEditando(false);
    editFormLoaded.current = false;
    setSaving(false);
  }

  async function crearPago() {
    if (!pagoForm.monto) return;
    setAddingPago(true);
    await fetch(`/api/rrhh/personal/${id}/pagos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...pagoForm, monto: parseFloat(pagoForm.monto) }) });
    await load();
    setPagoForm({ periodo: new Date().toISOString().slice(0, 7), tipoPeriodo: "MENSUAL", monto: persona?.salario?.toString() ?? "", concepto: "", cuentaOrigenId: "", notas: "" });
    setShowPagoForm(false);
    setAddingPago(false);
  }

  async function marcarPagado(pagoId: string) {
    await fetch(`/api/rrhh/personal/${id}/pagos/${pagoId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "PAGADO", fechaPago: fechaPagoReal }),
    });
    await load();
    setPagandoId(null);
  }

  async function eliminarPago(pagoId: string) {
    if (!await confirm({ message: "¿Eliminar este registro de pago?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/rrhh/personal/${id}/pagos/${pagoId}`, { method: "DELETE" });
    toast.success("Pago eliminado");
    await load();
  }

  async function toggleActivo() {
    if (!persona) return;
    await fetch(`/api/rrhh/personal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !persona.activo }) });
    await load();
  }

  async function eliminarEmpleado() {
    if (!persona) return;
    if (!await confirm({ message: `¿Eliminar permanentemente a ${persona.nombre}? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/rrhh/personal/${id}`, { method: "DELETE" });
    router.push("/rrhh/personal");
  }

  if (loading || !persona) return <SkeletonPage rows={5} cols={3} />;

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-sm transition-colors">← Volver</button>
          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            <span className="text-[#B3985B] text-lg font-bold">{persona.nombre.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{persona.nombre}</h1>
            <p className="text-gray-500 text-sm">{persona.puesto} · {persona.departamento}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleActivo}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${persona.activo ? "border-[#333] text-gray-400 hover:text-red-400 hover:border-red-900" : "border-green-900 text-green-400 hover:bg-green-900/20"}`}>
            {persona.activo ? "Dar de baja" : "Reactivar"}
          </button>
          <button onClick={() => { setEditForm({ ...persona }); editFormLoaded.current = false; setEditando(true); setTimeout(() => { editFormLoaded.current = true; }, 100); }}
            className="text-xs px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-gray-400 hover:text-white transition-colors">
            Editar
          </button>
          <button onClick={eliminarEmpleado}
            className="text-xs px-3 py-1.5 border border-[#333] rounded-lg text-gray-600 hover:text-red-400 hover:border-red-900 transition-colors">
            Eliminar
          </button>
        </div>
      </div>

      {/* Modal: Editar personal */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => { setEditando(false); editFormLoaded.current = false; }} />
          <div className="relative bg-[#111] border border-[#333] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-semibold">Editar empleado</h3>
              <button onClick={() => { setEditando(false); editFormLoaded.current = false; }} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "nombre", label: "Nombre" }, { key: "puesto", label: "Puesto" },
                  { key: "telefono", label: "Teléfono" }, { key: "correo", label: "Correo" },
                  { key: "datosFiscales", label: "RFC / Datos fiscales" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                    <input value={(editForm as Record<string, unknown>)[key] as string ?? ""}
                      onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                ))}
                <div className="col-span-2"><p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-2 mt-1">Datos bancarios</p></div>
                {[
                  { key: "banco", label: "Banco" }, { key: "numeroCuenta", label: "Número de cuenta" },
                  { key: "clabe", label: "CLABE" }, { key: "numeroTarjeta", label: "Número de tarjeta" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                    <input value={(editForm as Record<string, unknown>)[key] as string ?? ""}
                      onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                ))}
                <div className="col-span-2"><p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-2 mt-1">Datos personales</p></div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Domicilio</label>
                  <input value={editForm.domicilio ?? ""} onChange={e => setEditForm(p => ({ ...p, domicilio: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Contacto de emergencia</label>
                  <input value={editForm.emergenciaNombre ?? ""} onChange={e => setEditForm(p => ({ ...p, emergenciaNombre: e.target.value }))} placeholder="Nombre"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tel. de emergencia</label>
                  <input value={editForm.emergenciaTel ?? ""} onChange={e => setEditForm(p => ({ ...p, emergenciaTel: e.target.value }))} placeholder="Teléfono"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Padecimientos / condiciones médicas</label>
                  <input value={editForm.padecimientos ?? ""} onChange={e => setEditForm(p => ({ ...p, padecimientos: e.target.value }))}
                    placeholder="Ej: Diabetes, hipertensión, alergias..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">URL foto INE</label>
                  <input value={editForm.ineUrl ?? ""} onChange={e => setEditForm(p => ({ ...p, ineUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Departamento</label>
                  <select value={editForm.departamento ?? ""} onChange={e => setEditForm(p => ({ ...p, departamento: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Salario</label>
                  <input type="number" value={editForm.salario?.toString() ?? ""} onChange={e => setEditForm(p => ({ ...p, salario: parseFloat(e.target.value) || null }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Periodo pago</label>
                  <select value={editForm.periodoPago ?? "MENSUAL"} onChange={e => setEditForm(p => ({ ...p, periodoPago: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    {TIPOS_PERIODO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Notas</label>
                  <textarea value={editForm.notas ?? ""} onChange={e => setEditForm(p => ({ ...p, notas: e.target.value }))} rows={2}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                </div>
              </div>
              <div className="flex justify-end items-center gap-3 pt-2">
                {saving && <span className="text-xs text-gray-500 animate-pulse">Guardando…</span>}
                {autoSaved && !saving && <span className="text-xs text-green-500">✓ Guardado</span>}
                <button onClick={() => { setEditando(false); editFormLoaded.current = false; }} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
                <button onClick={guardar} disabled={saving}
                  className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1">
        {(["info", "pagos", "documentos"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === t ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"}`}>
            {t === "info" ? "Información" : t === "pagos" ? `Nómina (${persona.pagos.length})` : `Documentos (${persona.documentos.length})`}
          </button>
        ))}
      </div>

      {/* TAB INFO */}
      {tab === "info" && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {[
              { label: "Nombre", val: persona.nombre },
              { label: "Puesto", val: persona.puesto },
              { label: "Tipo", val: persona.tipo === "EMPLEADO" ? "Empleado" : "Freelance recurrente" },
              { label: "Departamento", val: persona.departamento },
              { label: "Fecha de ingreso", val: fmtDate(persona.fechaIngreso) },
              { label: "Salario / tarifa", val: persona.salario ? `${fmt(persona.salario)} / ${persona.periodoPago.toLowerCase()}` : null },
              { label: "RFC / Datos fiscales", val: persona.datosFiscales },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                <p className="text-white">{val ?? <span className="text-gray-600 italic">Sin registrar</span>}</p>
              </div>
            ))}
            {/* Datos bancarios */}
            {(persona.banco || persona.numeroCuenta || persona.clabe || persona.numeroTarjeta) && (
              <div className="col-span-2 border-t border-[#1a1a1a] pt-4 mt-2">
                <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Datos bancarios</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    { label: "Banco", val: persona.banco },
                    { label: "Núm. cuenta", val: persona.numeroCuenta },
                    { label: "CLABE", val: persona.clabe },
                    { label: "Núm. tarjeta", val: persona.numeroTarjeta },
                  ].filter(f => f.val).map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                      <p className="text-white font-mono text-sm">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Datos personales */}
            {(persona.domicilio || persona.emergenciaNombre || persona.padecimientos) && (
              <div className="col-span-2 border-t border-[#1a1a1a] pt-4 mt-2">
                <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Datos personales</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {persona.domicilio && (
                    <div className="col-span-2"><p className="text-gray-500 text-xs mb-0.5">Domicilio</p><p className="text-white">{persona.domicilio}</p></div>
                  )}
                  {persona.emergenciaNombre && (
                    <div><p className="text-gray-500 text-xs mb-0.5">Contacto emergencia</p><p className="text-white">{persona.emergenciaNombre}</p></div>
                  )}
                  {persona.emergenciaTel && (
                    <div><p className="text-gray-500 text-xs mb-0.5">Tel. emergencia</p><p className="text-white">{persona.emergenciaTel}</p></div>
                  )}
                  {persona.padecimientos && (
                    <div className="col-span-2"><p className="text-gray-500 text-xs mb-0.5">Padecimientos / condiciones</p><p className="text-white">{persona.padecimientos}</p></div>
                  )}
                </div>
              </div>
            )}
            {persona.ineUrl && (
              <div className="col-span-2">
                <p className="text-gray-500 text-xs mb-1">INE</p>
                <a href={persona.ineUrl} target="_blank" rel="noopener noreferrer" className="text-[#B3985B] text-xs hover:underline">Ver foto INE →</a>
              </div>
            )}
            {/* Teléfono con WA */}
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Teléfono</p>
              {persona.telefono ? (
                <div className="flex items-center gap-2">
                  <span className="text-white">{persona.telefono}</span>
                  <a href={`https://wa.me/${persona.telefono.replace(/\D/g,"").replace(/^(?!52)/,"52")}?text=${encodeURIComponent(`Hola ${persona.nombre.split(" ")[0]}! 👋`)}`}
                     target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1 text-green-500 hover:text-green-400 bg-green-900/20 hover:bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WA
                  </a>
                </div>
              ) : <span className="text-gray-600 italic">Sin registrar</span>}
            </div>
            {/* Correo */}
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Correo</p>
              {persona.correo ? (
                <a href={`mailto:${persona.correo}`} className="text-white hover:text-[#B3985B] transition-colors">{persona.correo}</a>
              ) : <span className="text-gray-600 italic">Sin registrar</span>}
            </div>
            {persona.notas && (
              <div className="col-span-2">
                <p className="text-gray-500 text-xs mb-0.5">Notas</p>
                <p className="text-white">{persona.notas}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB PAGOS */}
      {tab === "pagos" && (
        <div className="space-y-4">
          {!showPagoForm ? (
            <button onClick={() => { setShowPagoForm(true); setPagoForm(p => ({ ...p, monto: persona?.salario?.toString() ?? "" })); }}
              className="w-full border border-dashed border-[#333] hover:border-[#B3985B] text-gray-500 hover:text-[#B3985B] py-3 rounded-xl text-sm transition-colors">
              + Registrar pago
            </button>
          ) : (
            <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nuevo pago</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Periodo</label>
                  <input type="month" value={pagoForm.periodo} onChange={e => setPagoForm(p => ({ ...p, periodo: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select value={pagoForm.tipoPeriodo} onChange={e => setPagoForm(p => ({ ...p, tipoPeriodo: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    {TIPOS_PERIODO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Monto *</label>
                  <input type="number" value={pagoForm.monto} onChange={e => setPagoForm(p => ({ ...p, monto: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Concepto</label>
                  <input value={pagoForm.concepto} onChange={e => setPagoForm(p => ({ ...p, concepto: e.target.value }))} placeholder="Opcional"
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cuenta origen</label>
                  <select value={pagoForm.cuentaOrigenId} onChange={e => setPagoForm(p => ({ ...p, cuentaOrigenId: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">Sin especificar</option>
                    {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={crearPago} disabled={addingPago || !pagoForm.monto}
                  className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
                  {addingPago ? "Guardando..." : "Registrar"}
                </button>
                <button onClick={() => setShowPagoForm(false)} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
              </div>
            </div>
          )}

          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            {persona.pagos.length === 0 ? (
              <div className="py-10 text-center text-gray-600 text-sm">Sin pagos registrados</div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {persona.pagos.map(pago => (
                  <div key={pago.id} className="px-5 py-4">
                    {pagandoId === pago.id ? (
                      <div className="flex items-center gap-3">
                        <p className="text-white text-sm flex-1">{pago.concepto ?? `Nómina ${pago.periodo}`} — {fmt(pago.monto)}</p>
                        <input type="date" value={fechaPagoReal} onChange={e => setFechaPagoReal(e.target.value)}
                          className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2 py-1 text-white text-xs focus:outline-none" />
                        <button onClick={() => marcarPagado(pago.id)} className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors">Confirmar pago</button>
                        <button onClick={() => setPagandoId(null)} className="text-xs text-gray-500 hover:text-white transition-colors">Cancelar</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{pago.concepto ?? `Nómina ${pago.periodo}`}</p>
                          <p className="text-gray-500 text-xs">{pago.periodo} · {pago.tipoPeriodo.toLowerCase()}{pago.fechaPago ? ` · Pagado ${fmtDate(pago.fechaPago)}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-semibold text-sm">{fmt(pago.monto)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pago.estado === "PAGADO" ? "bg-green-900/50 text-green-300" : "bg-yellow-900/50 text-yellow-300"}`}>
                            {pago.estado === "PAGADO" ? "Pagado" : "Pendiente"}
                          </span>
                          {pago.estado === "PENDIENTE" && (
                            <button onClick={() => setPagandoId(pago.id)} className="text-xs text-[#B3985B] hover:text-white transition-colors">Pagar</button>
                          )}
                          <button onClick={() => eliminarPago(pago.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB DOCUMENTOS */}
      {tab === "documentos" && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          {persona.documentos.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Sin documentos registrados</p>
          ) : (
            <div className="space-y-2">
              {persona.documentos.map(doc => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                  <div>
                    <p className="text-white text-sm">{doc.nombre}</p>
                    <p className="text-gray-500 text-xs">{doc.tipo}{doc.fechaVencimiento ? ` · Vence: ${fmtDate(doc.fechaVencimiento)}` : ""}</p>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#B3985B] hover:text-white transition-colors">Ver →</a>
                </div>
              ))}
            </div>
          )}
          <p className="text-gray-700 text-xs mt-4">Los documentos se agregan manualmente via URL. Próximamente: carga directa de archivos.</p>
        </div>
      )}
    </div>
  );
}
