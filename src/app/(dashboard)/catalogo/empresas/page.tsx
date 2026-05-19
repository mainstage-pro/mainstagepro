"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

interface Contacto { id: string; nombre: string; telefono: string | null; correo: string | null; }

interface Empresa {
  id: string;
  nombre: string;
  giro: string | null;
  telefono: string | null;
  correo: string | null;
  sitioWeb: string | null;
  notas: string | null;
  rfc: string | null;
  datosFiscales: string | null;
  cuentaBancaria: string | null;
  clabe: string | null;
  banco: string | null;
  noTarjeta: string | null;
  tipo: string;
  activo: boolean;
  contactosCliente: Contacto[];
  contactosProveedor: Contacto[];
}

const EMPTY_FORM = { nombre: "", giro: "", telefono: "", correo: "", sitioWeb: "", notas: "", rfc: "", datosFiscales: "", cuentaBancaria: "", clabe: "", banco: "", noTarjeta: "", tipo: "AMBOS" };

const inputCls = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";

const TIPO_LABELS: Record<string, string> = {
  CLIENTE: "Cliente",
  PROVEEDOR: "Proveedor",
  AMBOS: "Cliente y Proveedor",
};

const TIPO_COLORS: Record<string, string> = {
  CLIENTE: "bg-green-900/30 text-green-400 border border-green-900/40",
  PROVEEDOR: "bg-blue-900/30 text-blue-400 border border-blue-900/40",
  AMBOS: "bg-purple-900/30 text-purple-400 border border-purple-900/40",
};

const TIPO_OPTIONS = [
  { value: "CLIENTE", label: "Solo Cliente" },
  { value: "PROVEEDOR", label: "Solo Proveedor" },
  { value: "AMBOS", label: "Cliente y Proveedor" },
];

const FILTER_PILLS = [
  { key: "todos", label: "Todos" },
  { key: "cliente", label: "Solo clientes" },
  { key: "proveedor", label: "Solo proveedores" },
  { key: "AMBOS", label: "Ambos" },
];

function TipoBadge({ empresa, onChange }: { empresa: Empresa; onChange: (tipo: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(p => !p); }}
        className={`text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${TIPO_COLORS[empresa.tipo] ?? "bg-gray-900/30 text-gray-400"}`}
      >
        {TIPO_LABELS[empresa.tipo] ?? empresa.tipo}
      </button>
      {open && (
        <div className="absolute z-30 top-6 left-0 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-xl py-1 min-w-[160px]">
          {TIPO_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={e => { e.stopPropagation(); onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#2a2a2a] transition-colors ${empresa.tipo === opt.value ? "text-[#B3985B]" : "text-gray-300"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmpresasPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [guardando, setGuardando] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/empresas", { cache: "no-store" });
    const d = await r.json();
    setEmpresas(d.empresas ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function abrirNueva() {
    setEditando(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function abrirEditar(e: Empresa) {
    setEditando(e);
    setForm({
      nombre: e.nombre, giro: e.giro ?? "", telefono: e.telefono ?? "",
      correo: e.correo ?? "", sitioWeb: e.sitioWeb ?? "", notas: e.notas ?? "",
      rfc: e.rfc ?? "", datosFiscales: e.datosFiscales ?? "",
      cuentaBancaria: e.cuentaBancaria ?? "", clabe: e.clabe ?? "",
      banco: e.banco ?? "", noTarjeta: e.noTarjeta ?? "", tipo: e.tipo,
    });
    setShowForm(true);
  }

  async function guardar() {
    if (!form.nombre.trim()) { toast.error("El nombre es requerido"); return; }
    setGuardando(true);
    try {
      const url = editando ? `/api/empresas/${editando.id}` : "/api/empresas";
      const method = editando ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Error al guardar"); return; }
      toast.success(editando ? "Empresa actualizada" : "Empresa creada");
      setShowForm(false);
      await load();
    } finally { setGuardando(false); }
  }

  async function eliminar(e: Empresa) {
    if (!await confirm({ message: `¿Eliminar la empresa "${e.nombre}"? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/empresas/${e.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Empresa eliminada"); await load(); }
    else { const d = await res.json(); toast.error(d.error ?? "No se pudo eliminar"); }
  }

  async function cambiarTipo(empresa: Empresa, nuevoTipo: string) {
    const res = await fetch(`/api/empresas/${empresa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: nuevoTipo }),
    });
    if (res.ok) {
      setEmpresas(prev => prev.map(e => e.id === empresa.id ? { ...e, tipo: nuevoTipo } : e));
      toast.success("Tipo actualizado");
    } else {
      toast.error("No se pudo actualizar");
    }
  }

  const lista = empresas.filter(e => {
    const matchQuery = !query || e.nombre.toLowerCase().includes(query.toLowerCase()) || (e.giro ?? "").toLowerCase().includes(query.toLowerCase());
    const matchTipo =
      filtroTipo === "todos" ? true :
      filtroTipo === "cliente" ? (e.tipo === "CLIENTE" || e.tipo === "AMBOS") :
      filtroTipo === "proveedor" ? (e.tipo === "PROVEEDOR" || e.tipo === "AMBOS") :
      e.tipo === "AMBOS";
    return matchQuery && matchTipo;
  });

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Empresas</h1>
          <p className="text-[#6b7280] text-sm">{empresas.length} empresas registradas</p>
        </div>
        <button onClick={abrirNueva}
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
          + Nueva empresa
        </button>
      </div>

      <div className="mb-3">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre o giro…"
          className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
      </div>

      {/* Filtros de tipo */}
      <div className="flex gap-2 flex-wrap mb-4">
        {FILTER_PILLS.map(p => (
          <button
            key={p.key}
            onClick={() => setFiltroTipo(p.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filtroTipo === p.key ? "bg-[#B3985B] text-black" : "bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:border-[#444]"}`}
          >
            {p.label}
          </button>
        ))}
        {filtroTipo !== "todos" && (
          <span className="text-xs text-[#555] self-center">{lista.length} resultado{lista.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#6b7280] text-sm">Cargando...</div>
      ) : lista.length === 0 ? (
        <div className="py-16 text-center text-[#6b7280] text-sm">Sin empresas</div>
      ) : (
        <div className="space-y-2">
          {lista.map(e => (
            <div key={e.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandida(expandida === e.id ? null : e.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium text-sm">{e.nombre}</p>
                    {e.giro && <span className="text-[10px] text-gray-500 bg-[#1a1a1a] px-2 py-0.5 rounded-full">{e.giro}</span>}
                    <TipoBadge empresa={e} onChange={tipo => cambiarTipo(e, tipo)} />
                  </div>
                  <div className="flex gap-3 mt-0.5 flex-wrap items-center">
                    {e.telefono && <span className="text-xs text-[#555]">{e.telefono}</span>}
                    {e.correo && <span className="text-xs text-[#555]">{e.correo}</span>}
                    {/* Vínculos */}
                    <span className="flex items-center gap-1.5 text-xs text-[#444]">
                      {e.contactosCliente.length > 0 && (
                        <Link
                          href={`/catalogo/empresas/${e.id}?tab=clientes`}
                          onClick={ev => ev.stopPropagation()}
                          className="flex items-center gap-0.5 text-green-600 hover:text-green-400 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {e.contactosCliente.length} cliente{e.contactosCliente.length !== 1 ? "s" : ""}
                        </Link>
                      )}
                      {e.contactosCliente.length > 0 && e.contactosProveedor.length > 0 && (
                        <span className="text-[#333]">·</span>
                      )}
                      {e.contactosProveedor.length > 0 && (
                        <Link
                          href={`/catalogo/empresas/${e.id}?tab=proveedores`}
                          onClick={ev => ev.stopPropagation()}
                          className="flex items-center gap-0.5 text-blue-600 hover:text-blue-400 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {e.contactosProveedor.length} proveedor{e.contactosProveedor.length !== 1 ? "es" : ""}
                        </Link>
                      )}
                      {e.contactosCliente.length === 0 && e.contactosProveedor.length === 0 && (
                        <span>Sin vínculos</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/catalogo/empresas/${e.id}`}
                    onClick={ev => ev.stopPropagation()}
                    className="p-1.5 rounded text-[#555] hover:text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors"
                    title="Ver ficha"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                  <button onClick={() => abrirEditar(e)}
                    className="p-1.5 rounded text-[#555] hover:text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button onClick={() => eliminar(e)}
                    className="p-1.5 rounded text-[#555] hover:text-red-400 hover:bg-red-900/20 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contactos expandidos */}
              {expandida === e.id && (
                <div className="px-4 pb-3 border-t border-[#1a1a1a]">
                  {e.contactosCliente.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Contactos (clientes)</p>
                      <div className="space-y-1">
                        {e.contactosCliente.map(c => (
                          <div key={c.id} className="flex items-center gap-3 text-xs">
                            <span className="text-gray-300">{c.nombre}</span>
                            {c.telefono && <span className="text-[#555]">{c.telefono}</span>}
                            {c.correo && <span className="text-[#555]">{c.correo}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {e.contactosProveedor.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Contactos (proveedores)</p>
                      <div className="space-y-1">
                        {e.contactosProveedor.map(c => (
                          <div key={c.id} className="flex items-center gap-3 text-xs">
                            <span className="text-gray-300">{c.nombre}</span>
                            {c.telefono && <span className="text-[#555]">{c.telefono}</span>}
                            {c.correo && <span className="text-[#555]">{c.correo}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {e.contactosCliente.length === 0 && e.contactosProveedor.length === 0 && (
                    <p className="text-xs text-[#444] mt-2">Sin contactos vinculados</p>
                  )}
                  {e.notas && <p className="text-xs text-[#555] mt-2 italic">{e.notas}</p>}
                  {(e.rfc || e.datosFiscales) && (
                    <div className="mt-2 space-y-0.5">
                      {e.rfc && <p className="text-xs text-[#555]">RFC: <span className="text-gray-400 font-mono">{e.rfc}</span></p>}
                      {e.datosFiscales && <p className="text-xs text-[#555]">{e.datosFiscales}</p>}
                    </div>
                  )}
                  {(e.banco || e.cuentaBancaria || e.clabe || e.noTarjeta) && (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {e.banco && <p className="text-xs text-[#555]">Banco: <span className="text-gray-400">{e.banco}</span></p>}
                      {e.cuentaBancaria && <p className="text-xs text-[#555]">Cuenta: <span className="text-gray-400 font-mono">{e.cuentaBancaria}</span></p>}
                      {e.clabe && <p className="text-xs text-[#555] col-span-2">CLABE: <span className="text-gray-400 font-mono">{e.clabe}</span></p>}
                      {e.noTarjeta && <p className="text-xs text-[#555]">Tarjeta: <span className="text-gray-400 font-mono">{e.noTarjeta}</span></p>}
                    </div>
                  )}
                  <div className="mt-3">
                    <Link href={`/catalogo/empresas/${e.id}`} className="text-xs text-[#B3985B] hover:underline">
                      Ver ficha completa →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{editando ? "Editar empresa" : "Nueva empresa"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Giro / Industria</label>
                  <input value={form.giro} onChange={e => setForm(p => ({ ...p, giro: e.target.value }))} className={inputCls} placeholder="Producción de eventos…" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                  <Combobox
                    value={form.tipo}
                    onChange={v => setForm(p => ({ ...p, tipo: v }))}
                    options={[{ value: "AMBOS", label: "Cliente y Proveedor" }, { value: "CLIENTE", label: "Solo Cliente" }, { value: "PROVEEDOR", label: "Solo Proveedor" }]}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Correo</label>
                  <input type="email" value={form.correo} onChange={e => setForm(p => ({ ...p, correo: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Sitio web</label>
                <input value={form.sitioWeb} onChange={e => setForm(p => ({ ...p, sitioWeb: e.target.value }))} className={inputCls} placeholder="https://…" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">RFC</label>
                <input value={form.rfc} onChange={e => setForm(p => ({ ...p, rfc: e.target.value }))} className={inputCls} placeholder="RFC de la empresa" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Datos fiscales adicionales</label>
                <input value={form.datosFiscales} onChange={e => setForm(p => ({ ...p, datosFiscales: e.target.value }))} className={inputCls} placeholder="Razón social, régimen fiscal…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Banco</label>
                  <input value={form.banco} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))} className={inputCls} placeholder="BBVA, Banorte…" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Número de cuenta</label>
                  <input value={form.cuentaBancaria} onChange={e => setForm(p => ({ ...p, cuentaBancaria: e.target.value }))} className={inputCls} placeholder="11 dígitos" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">CLABE interbancaria</label>
                  <input value={form.clabe} onChange={e => setForm(p => ({ ...p, clabe: e.target.value }))} className={inputCls} placeholder="18 dígitos" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Número de tarjeta</label>
                  <input value={form.noTarjeta} onChange={e => setForm(p => ({ ...p, noTarjeta: e.target.value }))} className={inputCls} placeholder="Últimos 4 dígitos" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando || !form.nombre.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c4aa6b] disabled:opacity-40 transition-colors">
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear empresa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
