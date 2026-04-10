"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

interface Documento { id: string; tipo: string; nombre: string; url: string; fechaVencimiento: string | null; createdAt: string }
interface PagoNomina { id: string; periodo: string; tipoPeriodo: string; monto: number; concepto: string | null; estado: string; fechaPago: string | null; metodoPago: string; notas: string | null; cuentaOrigen: { nombre: string } | null }
interface CuentaBancaria { id: string; nombre: string; banco: string | null }
interface PersonalData {
  id: string; nombre: string; puesto: string; departamento: string; tipo: string;
  telefono: string | null; correo: string | null; salario: number | null; periodoPago: string;
  fechaIngreso: string | null; activo: boolean; cuentaBancaria: string | null;
  datosFiscales: string | null; notas: string | null;
  documentos: Documento[]; pagos: PagoNomina[];
}

const DEPARTAMENTOS = ["GENERAL", "BODEGA", "COORDINACION", "PRODUCCION", "ADMINISTRACION", "VENTAS"];
const TIPOS_PERIODO = ["MENSUAL", "QUINCENAL", "SEMANAL", "POR_EVENTO"];

function fmt(n: number) { return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n); }
function fmtDate(s: string | null) { return s ? new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }

export default function PersonalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [persona, setPersona] = useState<PersonalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [tab, setTab] = useState<"info" | "pagos" | "documentos">("info");
  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PersonalData>>({});
  const [saving, setSaving] = useState(false);

  // Nuevo pago
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [pagoForm, setPagoForm] = useState({ periodo: new Date().toISOString().slice(0, 7), tipoPeriodo: "MENSUAL", monto: "", concepto: "", cuentaOrigenId: "", notas: "" });
  const [addingPago, setAddingPago] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [fechaPagoReal, setFechaPagoReal] = useState(new Date().toISOString().split("T")[0]);

  async function load() {
    const r = await fetch(`/api/rrhh/personal/${id}`);
    const d = await r.json();
    setPersona(d.persona);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/cuentas").then(r => r.json()).then(d => setCuentas(d.cuentas ?? []));
  }, [id]);

  async function guardar() {
    setSaving(true);
    await fetch(`/api/rrhh/personal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    await load();
    setEditando(false);
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
    if (!confirm("¿Eliminar este registro de pago?")) return;
    await fetch(`/api/rrhh/personal/${id}/pagos/${pagoId}`, { method: "DELETE" });
    await load();
  }

  async function toggleActivo() {
    if (!persona) return;
    await fetch(`/api/rrhh/personal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !persona.activo }) });
    await load();
  }

  if (loading || !persona) return <div className="p-3 md:p-6 text-gray-600 text-sm">Cargando...</div>;

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
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
          <button onClick={() => { setEditForm({ ...persona }); setEditando(true); }}
            className="text-xs px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-gray-400 hover:text-white transition-colors">
            Editar
          </button>
        </div>
      </div>

      {/* Formulario edición */}
      {editando && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Editar información</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "nombre", label: "Nombre" }, { key: "puesto", label: "Puesto" },
              { key: "telefono", label: "Teléfono" }, { key: "correo", label: "Correo" },
              { key: "cuentaBancaria", label: "Cuenta bancaria" }, { key: "datosFiscales", label: "RFC / Datos fiscales" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input value={(editForm as Record<string, unknown>)[key] as string ?? ""}
                  onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Departamento</label>
              <select value={editForm.departamento ?? ""} onChange={e => setEditForm(p => ({ ...p, departamento: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Salario</label>
              <input type="number" value={editForm.salario?.toString() ?? ""} onChange={e => setEditForm(p => ({ ...p, salario: parseFloat(e.target.value) || null }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Periodo pago</label>
              <select value={editForm.periodoPago ?? "MENSUAL"} onChange={e => setEditForm(p => ({ ...p, periodoPago: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {TIPOS_PERIODO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <textarea value={editForm.notas ?? ""} onChange={e => setEditForm(p => ({ ...p, notas: e.target.value }))} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={guardar} disabled={saving}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setEditando(false)} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
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
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {[
              { label: "Nombre", val: persona.nombre },
              { label: "Puesto", val: persona.puesto },
              { label: "Tipo", val: persona.tipo === "EMPLEADO" ? "Empleado" : "Freelance recurrente" },
              { label: "Departamento", val: persona.departamento },
              { label: "Teléfono", val: persona.telefono },
              { label: "Correo", val: persona.correo },
              { label: "Fecha de ingreso", val: fmtDate(persona.fechaIngreso) },
              { label: "Salario / tarifa", val: persona.salario ? `${fmt(persona.salario)} / ${persona.periodoPago.toLowerCase()}` : null },
              { label: "Cuenta bancaria", val: persona.cuentaBancaria },
              { label: "RFC / Datos fiscales", val: persona.datosFiscales },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                <p className="text-white">{val ?? <span className="text-gray-600 italic">Sin registrar</span>}</p>
              </div>
            ))}
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
