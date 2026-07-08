"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Combobox } from "@/components/Combobox";
import { ORIGEN_LEAD_OPTIONS } from "@/lib/constants";

interface Cliente {
  id: string; nombre: string; empresa: string | null; clasificacion: string; telefono: string | null;
}

// ── Etapas con descripciones ──────────────────────────────────────────────────
const ETAPAS_CARDS = [
  {
    value: "LEAD",
    icon: "🔭",
    label: "Prospección",
    color: "#F59E0B",
    borderActive: "border-amber-500",
    bgActive: "bg-amber-900/20",
    textActive: "text-amber-400",
    desc: "Aún no hay interés confirmado. Aquí trabajamos la confianza, hacemos seguimiento y levantamos la mano.",
  },
  {
    value: "DESCUBRIMIENTO",
    icon: "🔍",
    label: "Descubrimiento",
    color: "#3B82F6",
    borderActive: "border-blue-500",
    bgActive: "bg-blue-900/20",
    textActive: "text-blue-400",
    desc: "El cliente está interesado. Necesitamos entender qué quiere para construir una propuesta.",
  },
  {
    value: "OPORTUNIDAD",
    icon: "📋",
    label: "Oportunidad",
    color: "#8B5CF6",
    borderActive: "border-violet-500",
    bgActive: "bg-violet-900/20",
    textActive: "text-violet-400",
    desc: "El cliente ya sabe lo que quiere. Enviamos cotización y esperamos respuesta.",
  },
  {
    value: "VENTA_CERRADA",
    icon: "✅",
    label: "Venta Cerrada",
    color: "#10B981",
    borderActive: "border-emerald-500",
    bgActive: "bg-emerald-900/20",
    textActive: "text-emerald-400",
    desc: "El cliente ya reservó o confirmó verbalmente. Iniciamos descubrimiento técnico para poder operar.",
  },
] as const;

const ORIGEN_VENTA_OPTIONS = [
  { value: "CLIENTE_PROPIO", label: "Cliente propio (10% comisión)" },
  { value: "PUBLICIDAD",     label: "Lead por publicidad (5%)" },
  { value: "ASIGNADO",       label: "Cliente asignado (5%+5%)" },
];

export default function NuevoContactoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">("existente");
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const [clienteId, setClienteId] = useState("");
  const [etapa, setEtapa] = useState<string>("LEAD");
  const [origenLead, setOrigenLead] = useState("META_ADS");
  const [tipoLead, setTipoLead] = useState("INBOUND");
  const [origenVenta, setOrigenVenta] = useState("CLIENTE_PROPIO");
  const [vendedorId, setVendedorId] = useState("");

  const [clienteNuevo, setClienteNuevo] = useState({
    nombre: "", empresa: "", tipoCliente: "POR_DESCUBRIR", telefono: "", correo: "",
  });
  
  const [nombreEvento, setNombreEvento] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");

  useEffect(() => {
    fetch("/api/clientes").then(r => r.json()).then(d => setClientes(d.clientes || []));
    fetch("/api/usuarios-activos").then(r => r.json()).then(d => setUsuarios(d.usuarios || []));
  }, []);

  // Pre-seleccionar cliente si viene del query param ?clienteId=
  useEffect(() => {
    const paramId = searchParams.get("clienteId");
    if (paramId) {
      setClienteId(paramId);
      setModoCliente("existente");
    }
  }, [searchParams]);

  function validar() {
    if (modoCliente === "existente" && !clienteId) { setError("Selecciona un cliente existente"); return false; }
    if (modoCliente === "nuevo" && !clienteNuevo.nombre.trim()) { setError("El nombre del cliente es requerido"); return false; }
    if (!origenLead) { setError("Selecciona de dónde viene el contacto"); return false; }
    if (etapa === "VENTA_CERRADA") {
      if (!nombreEvento.trim()) { setError("Ingresa el nombre del evento a apartar"); return false; }
      if (!fechaEvento) { setError("Selecciona la fecha del evento para apartarla en el calendario"); return false; }
    }
    setError(""); return true;
  }

  async function crear() {
    if (!validar()) return;
    setLoading(true); setError("");

    const payload: Record<string, unknown> = {
      etapa,
      origenLead,
      tipoLead,
      origenVenta,
      vendedorId: vendedorId || undefined,
    };

    if (etapa === "VENTA_CERRADA") {
      payload.nombreEvento = nombreEvento;
      payload.fechaEventoEstimada = new Date(fechaEvento + "T12:00:00").toISOString();
      payload.descubrimientoCompleto = false; // Forzamos descubrimiento
    }

    if (modoCliente === "existente") {
      payload.clienteId = clienteId;
    } else {
      payload.clienteNuevo = clienteNuevo;
    }

    try {
      const res = await fetch("/api/tratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Error al crear el contacto");
        setLoading(false);
        return;
      }
      const { trato } = await res.json();
      // Ir al wizard de proceso comercial según la etapa
      router.push(`/crm/tratos/${trato.id}/wizard`);
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  const clienteSel = clientes.find(c => c.id === clienteId);
  const etapaSeleccionada = ETAPAS_CARDS.find(e => e.value === etapa);



  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-white text-sm mb-2 transition-colors">← Atrás</button>
        <h1 className="ms-h1">Nuevo contacto</h1>
        <p className="text-gray-600 text-xs mt-1">Registra un nuevo contacto en el funnel de ventas</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      <div className="space-y-4">

        {/* ── Sección 1: Cliente ── */}
        <div className="ms-card p-5">
          <h2 className="text-xs font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Cliente</h2>
          <div className="flex gap-2 mb-4">
            {(["existente", "nuevo"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setModoCliente(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  modoCliente === m
                    ? "bg-[#B3985B] text-black"
                    : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]"
                }`}
              >
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
                onChange={e => {
                  setClienteQuery(e.target.value);
                  setClienteDropdown(true);
                  if (!e.target.value) setClienteId("");
                }}
                onFocus={() => setClienteDropdown(true)}
                onBlur={() => setTimeout(() => setClienteDropdown(false), 150)}
                placeholder="Buscar cliente por nombre o empresa..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] placeholder:text-[#555]"
              />
              {clienteDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[#161616] border border-[#2a2a2a] rounded-lg shadow-xl max-h-52 overflow-y-auto">
                  {clientes
                    .filter(c => {
                      const q = clienteQuery.toLowerCase();
                      return !q || c.nombre.toLowerCase().includes(q) || (c.empresa ?? "").toLowerCase().includes(q);
                    })
                    .map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          setClienteId(c.id);
                          setClienteQuery(c.nombre + (c.empresa ? ` · ${c.empresa}` : ""));
                          setClienteDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#222] transition-colors"
                      >
                        <span className="font-medium">{c.nombre}</span>
                        {c.empresa && <span className="text-[#666] ml-1.5">· {c.empresa}</span>}
                      </button>
                    ))}
                </div>
              )}
              {clienteSel && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Clasificación: <span className="text-[#B3985B] font-medium">{clienteSel.clasificacion}</span>
                  {clienteSel.telefono && <span className="ml-2 text-gray-600">· {clienteSel.telefono}</span>}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                  <input
                    value={clienteNuevo.nombre}
                    onChange={e => setClienteNuevo(p => ({ ...p, nombre: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Empresa</label>
                  <input
                    value={clienteNuevo.empresa}
                    onChange={e => setClienteNuevo(p => ({ ...p, empresa: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    placeholder="Nombre empresa"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                  <input
                    value={clienteNuevo.telefono}
                    onChange={e => setClienteNuevo(p => ({ ...p, telefono: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    placeholder="442 000 0000"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Correo</label>
                  <input
                    type="email"
                    value={clienteNuevo.correo}
                    onChange={e => setClienteNuevo(p => ({ ...p, correo: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sección 2: Etapa inicial ── */}
        <div className="ms-card p-5">
          <h2 className="text-xs font-semibold text-[#B3985B] mb-1 uppercase tracking-wider">Etapa inicial</h2>
          <p className="text-[11px] text-gray-600 mb-4">¿En qué punto del proceso se encuentra este contacto?</p>
          <div className="space-y-2">
            {ETAPAS_CARDS.map(e => {
              const isActive = etapa === e.value;
              return (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setEtapa(e.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isActive
                      ? `${e.borderActive} ${e.bgActive}`
                      : "border-[#2a2a2a] hover:border-[#3a3a3a]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{e.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${isActive ? e.textActive : "text-white"}`}>{e.label}</p>
                        {isActive && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${e.borderActive} ${e.textActive} bg-transparent`}>
                            Seleccionada
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs mt-1 leading-relaxed">{e.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {etapa !== "LEAD" && (
            <div className="mt-3 p-3 bg-[#0d0d0d] rounded-lg border border-[#1e1e1e]">
              <p className="text-[11px] text-gray-500">
                ℹ️ Al crear el contacto en esta etapa, se abrirá directamente el wizard de descubrimiento para capturar la información del evento.
              </p>
            </div>
          )}
          {etapa === "VENTA_CERRADA" && (
            <div className="mt-4 p-4 border border-emerald-800/40 bg-emerald-900/10 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-emerald-400">Datos para apartar en calendario</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Al crear un contacto directamente en Venta Cerrada, es necesario registrar la fecha del evento para apartarla en el calendario de inmediato.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre del evento a apartar *</label>
                  <input
                    type="text"
                    value={nombreEvento}
                    onChange={e => setNombreEvento(e.target.value)}
                    placeholder="Ej. Boda Civil Maria y Juan"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha del evento *</label>
                  <input
                    type="date"
                    value={fechaEvento}
                    onChange={e => setFechaEvento(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sección 3: Origen ── */}
        <div className="ms-card p-5">
          <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Origen del contacto</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">¿De dónde viene?</label>
              <Combobox
                value={origenLead}
                onChange={v => setOrigenLead(v)}
                options={ORIGEN_LEAD_OPTIONS}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo de lead</label>
              <Combobox
                value={tipoLead}
                onChange={v => setTipoLead(v)}
                options={[
                  { value: "INBOUND", label: "Inbound (nos buscó)" },
                  { value: "OUTBOUND", label: "Outbound (prospección)" },
                ]}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>
          </div>
        </div>

        {/* ── Sección 4: Vendedor y comisión ── */}
        <div className="ms-card p-5">
          <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Vendedor y comisión</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Origen de venta (comisiones)</label>
              <Combobox
                value={origenVenta}
                onChange={v => setOrigenVenta(v)}
                options={ORIGEN_VENTA_OPTIONS}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Comisión para</label>
              <Combobox
                value={vendedorId}
                onChange={v => setVendedorId(v)}
                options={[
                  { value: "", label: "Yo (quien captura)" },
                  ...usuarios.map(u => ({ value: u.id, label: u.name })),
                ]}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
              {vendedorId && (
                <p className="text-xs text-[#B3985B] mt-1">
                  La comisión irá a {usuarios.find(u => u.id === vendedorId)?.name} — tú sigues como responsable de gestionar el contacto.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="flex gap-3 justify-between pb-6">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-[#333] text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Cancelar
          </button>
          <button
            onClick={crear}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              backgroundColor: etapaSeleccionada?.color ?? "#B3985B",
              color: "black",
            }}
          >
            {loading ? "Creando..." : `Crear contacto en ${etapaSeleccionada?.label ?? "..."} →`}
          </button>
        </div>
      </div>
    </div>
  );
}
