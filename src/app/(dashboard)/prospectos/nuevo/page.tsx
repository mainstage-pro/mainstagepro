"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/Combobox";

interface Cliente {
  id: string; nombre: string; empresa: string | null; clasificacion: string; telefono: string | null;
}

const ORIGENES_OUTBOUND = [
  { id: "REDES_SOCIALES", icon: "📱", label: "Redes sociales",  desc: "Instagram DM, LinkedIn, WhatsApp" },
  { id: "BASE_DATOS",     icon: "📋", label: "Base de datos",   desc: "Lista, directorio, búsqueda" },
  { id: "NETWORKING",     icon: "🤝", label: "Networking",      desc: "Evento, referencia interna, contacto personal" },
];

const ORIGEN_VENTA_OPTIONS = [
  { value: "CLIENTE_PROPIO", label: "Cliente propio (10% comisión)" },
  { value: "PUBLICIDAD",     label: "Lead por publicidad (5%)" },
  { value: "ASIGNADO",       label: "Cliente asignado (5%+5%)" },
];

export default function NuevoProspectoPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [modoCliente, setModoCliente] = useState<"existente"|"nuevo">("existente");
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    clienteId: "",
    origenLead: "",
    origenVenta: "CLIENTE_PROPIO",
    vendedorId: "",
  });
  const [clienteNuevo, setClienteNuevo] = useState({
    nombre: "", empresa: "", tipoCliente: "POR_DESCUBRIR",
    clasificacion: "NUEVO", telefono: "", correo: "",
  });

  useEffect(() => {
    fetch("/api/clientes").then(r=>r.json()).then(d=>setClientes(d.clientes||[]));
    fetch("/api/usuarios-activos").then(r=>r.json()).then(d=>setUsuarios(d.usuarios||[]));
  }, []);

  const clienteSel = clientes.find(c => c.id === form.clienteId);

  async function crear() {
    if (modoCliente === "existente" && !form.clienteId) { setError("Selecciona un cliente"); return; }
    if (modoCliente === "nuevo" && !clienteNuevo.nombre) { setError("El nombre es requerido"); return; }
    if (!form.origenLead) { setError("Selecciona cómo encontraste al prospecto"); return; }
    setError(""); setLoading(true);

    const payload: Record<string, unknown> = {
      ...form,
      vendedorId: form.vendedorId || undefined,
      tipoProspecto: "NURTURING",
      tipoLead: "OUTBOUND",
      canalAtencion: null,
    };
    if (modoCliente === "nuevo") { delete payload.clienteId; payload.clienteNuevo = clienteNuevo; }

    try {
      const res = await fetch("/api/tratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error al crear"); setLoading(false); return; }
      const { trato } = await res.json();
      router.push(`/crm/tratos/${trato.id}`);
    } catch { setError("Error de conexión"); setLoading(false); }
  }

  return (
    <div className="p-3 md:p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-white text-sm mb-2 transition-colors">← Atrás</button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-700/20 flex items-center justify-center text-lg">🌱</div>
          <div>
            <h1 className="text-xl font-bold text-white">Nuevo prospecto en frío</h1>
            <p className="text-gray-500 text-xs">Outbound · proceso de nurturing a largo plazo</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      <div className="space-y-4">

        {/* Cliente */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-xs font-semibold text-emerald-400 mb-4 uppercase tracking-wider">Cliente</h2>
          <div className="flex gap-2 mb-4">
            {(["existente","nuevo"] as const).map(m => (
              <button key={m} type="button" onClick={() => setModoCliente(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  modoCliente === m
                    ? "bg-emerald-800 text-white"
                    : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]"
                }`}>
                {m === "existente" ? "Cliente existente" : "+ Nuevo cliente"}
              </button>
            ))}
          </div>

          {modoCliente === "existente" ? (
            <div className="relative">
              <input
                ref={clienteInputRef}
                type="text"
                value={clienteQuery}
                onChange={e => { setClienteQuery(e.target.value); setClienteDropdown(true); if (!e.target.value) setForm(p => ({ ...p, clienteId: "" })); }}
                onFocus={() => setClienteDropdown(true)}
                onBlur={() => setTimeout(() => setClienteDropdown(false), 150)}
                placeholder="Buscar cliente por nombre o empresa..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600 placeholder-[#555]"
              />
              {clienteDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[#161616] border border-[#2a2a2a] rounded-lg shadow-xl max-h-52 overflow-y-auto">
                  {clientes.filter(c => {
                    const q = clienteQuery.toLowerCase();
                    return !q || c.nombre.toLowerCase().includes(q) || (c.empresa ?? "").toLowerCase().includes(q);
                  }).length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[#555]">Sin resultados</p>
                  ) : clientes.filter(c => {
                    const q = clienteQuery.toLowerCase();
                    return !q || c.nombre.toLowerCase().includes(q) || (c.empresa ?? "").toLowerCase().includes(q);
                  }).map(c => (
                    <button key={c.id} type="button"
                      onMouseDown={() => { setForm(p => ({ ...p, clienteId: c.id })); setClienteQuery(c.nombre + (c.empresa ? ` · ${c.empresa}` : "")); setClienteDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#222] transition-colors">
                      <span className="font-medium">{c.nombre}</span>
                      {c.empresa && <span className="text-[#666] ml-1.5">· {c.empresa}</span>}
                    </button>
                  ))}
                </div>
              )}
              {clienteSel && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Clasificación: <span className="text-emerald-400 font-medium">{clienteSel.clasificacion}</span>
                  {clienteSel.telefono && <span className="ml-2 text-gray-600">· {clienteSel.telefono}</span>}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                  <input value={clienteNuevo.nombre} onChange={e => setClienteNuevo(p => ({ ...p, nombre: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600"
                    placeholder="Nombre completo"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Empresa</label>
                  <input value={clienteNuevo.empresa} onChange={e => setClienteNuevo(p => ({ ...p, empresa: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600"
                    placeholder="Nombre empresa"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                  <input value={clienteNuevo.telefono} onChange={e => setClienteNuevo(p => ({ ...p, telefono: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600"
                    placeholder="442 000 0000"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Correo</label>
                  <input type="email" value={clienteNuevo.correo} onChange={e => setClienteNuevo(p => ({ ...p, correo: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600"
                    placeholder="correo@ejemplo.com"/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Origen */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wider">¿Cómo lo encontraste? *</h2>
          <div className="grid grid-cols-3 gap-2">
            {ORIGENES_OUTBOUND.map(o => (
              <button key={o.id} type="button"
                onClick={() => setForm(p => ({ ...p, origenLead: o.id }))}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  form.origenLead === o.id
                    ? "border-emerald-600 bg-emerald-950/40 text-emerald-300"
                    : "border-[#2a2a2a] text-gray-500 hover:border-[#444] hover:text-gray-300"
                }`}>
                <span className="text-xl">{o.icon}</span>
                <span className="text-xs font-medium">{o.label}</span>
                <span className="text-[10px] text-gray-600 leading-tight">{o.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Origen de venta + comisión */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wider">Comisiones</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Origen de venta</label>
              <Combobox
                value={form.origenVenta}
                onChange={v => setForm(p => ({ ...p, origenVenta: v }))}
                options={ORIGEN_VENTA_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Comisión para</label>
              <Combobox
                value={form.vendedorId}
                onChange={v => setForm(p => ({ ...p, vendedorId: v }))}
                options={[{ value: "", label: "Yo (quien captura)" }, ...usuarios.map(u => ({ value: u.id, label: u.name }))]}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600"
              />
              {form.vendedorId && (
                <p className="text-xs text-emerald-400 mt-1">
                  La comisión irá a {usuarios.find(u => u.id === form.vendedorId)?.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <button onClick={crear} disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
          {loading ? "Creando prospecto..." : "Crear prospecto →"}
        </button>

      </div>
    </div>
  );
}
