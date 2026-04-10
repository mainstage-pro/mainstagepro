"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
  tipoCliente: string;
  clasificacion: string;
}

const TIPO_EVENTO_OPTIONS = [
  { value: "MUSICAL", label: "Musical" },
  { value: "SOCIAL", label: "Social" },
  { value: "EMPRESARIAL", label: "Empresarial" },
  { value: "OTRO", label: "Otro" },
];

const TIPO_LEAD_OPTIONS = [
  { value: "INBOUND", label: "Inbound" },
  { value: "OUTBOUND", label: "Outbound" },
];

const ORIGEN_LEAD_OPTIONS = [
  { value: "META_ADS", label: "Meta Ads" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "ORGANICO", label: "Orgánico" },
  { value: "RECOMPRA", label: "Recompra" },
  { value: "REFERIDO", label: "Referido" },
  { value: "PROSPECCION", label: "Prospección" },
  { value: "OTRO", label: "Otro" },
];

const TIPO_SERVICIO_OPTIONS = [
  { value: "RENTA", label: "Renta de Equipo" },
  { value: "PRODUCCION_TECNICA", label: "Producción Técnica" },
  { value: "DIRECCION_TECNICA", label: "Dirección Técnica" },
];

const CLASIFICACION_OPTIONS = [
  { value: "PROSPECTO", label: "Prospecto" },
  { value: "NUEVO", label: "Nuevo" },
  { value: "BASIC", label: "Basic" },
  { value: "REGULAR", label: "Regular" },
  { value: "PRIORITY", label: "Priority" },
];

export default function NuevoTratoPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">("existente");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    clienteId: "",
    tipoEvento: "MUSICAL",
    tipoLead: "INBOUND",
    origenLead: "ORGANICO",
    origenVenta: "CLIENTE_PROPIO",
    tipoServicio: "",
    lugarEstimado: "",
    fechaEventoEstimada: "",
    presupuestoEstimado: "",
    clasificacion: "PROSPECTO",
    clasificacionOriginal: "PROSPECTO",
    notas: "",
    proximaAccion: "",
    fechaProximaAccion: "",
  });

  const [clienteNuevo, setClienteNuevo] = useState({
    nombre: "",
    empresa: "",
    tipoCliente: "POR_DESCUBRIR",
    clasificacion: "NUEVO",
    telefono: "",
    correo: "",
  });

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((d) => setClientes(d.clientes || []));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (name === "clienteId") {
      const cliente = clientes.find((c) => c.id === value);
      const clasificacion = cliente?.clasificacion ?? "PROSPECTO";
      setForm((prev) => ({
        ...prev,
        clienteId: value,
        clasificacion,
        clasificacionOriginal: clasificacion,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  function handleClienteNuevoChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setClienteNuevo((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload: Record<string, unknown> = { ...form };

    if (modoCliente === "existente") {
      if (!form.clienteId) {
        setError("Selecciona un cliente");
        setLoading(false);
        return;
      }
    } else {
      if (!clienteNuevo.nombre) {
        setError("El nombre del cliente es requerido");
        setLoading(false);
        return;
      }
      delete payload.clienteId;
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
        setError(d.error || "Error al crear trato");
        setLoading(false);
        return;
      }

      router.push("/crm/tratos");
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  return (
    <div className="p-3 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Nuevo Trato</h1>
        <p className="text-gray-400 text-sm mt-1">Registra un nuevo prospecto en el pipeline</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Cliente</h2>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setModoCliente("existente")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                modoCliente === "existente"
                  ? "bg-[#B3985B] text-black"
                  : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]"
              }`}
            >
              Cliente existente
            </button>
            <button
              type="button"
              onClick={() => setModoCliente("nuevo")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                modoCliente === "nuevo"
                  ? "bg-[#B3985B] text-black"
                  : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]"
              }`}
            >
              + Nuevo cliente
            </button>
          </div>

          {modoCliente === "existente" ? (
            <div className="space-y-2">
              <label className="block text-xs text-gray-400 mb-1">Seleccionar cliente</label>
              <select
                name="clienteId"
                value={form.clienteId}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              >
                <option value="">— Selecciona —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}{c.empresa ? ` · ${c.empresa}` : ""}
                  </option>
                ))}
              </select>
              {form.clienteId && (() => {
                const c = clientes.find((cl) => cl.id === form.clienteId);
                return c ? (
                  <p className="text-xs text-gray-500">
                    Clasificación actual:{" "}
                    <span className="text-[#B3985B] font-medium">{c.clasificacion}</span>
                    {form.clasificacion !== form.clasificacionOriginal && (
                      <span className="ml-2 text-yellow-400">→ se actualizará a <strong>{form.clasificacion}</strong></span>
                    )}
                  </p>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
                  <input
                    name="nombre"
                    value={clienteNuevo.nombre}
                    onChange={handleClienteNuevoChange}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Empresa</label>
                  <input
                    name="empresa"
                    value={clienteNuevo.empresa}
                    onChange={handleClienteNuevoChange}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    placeholder="Nombre de empresa"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo cliente</label>
                  <select
                    name="tipoCliente"
                    value={clienteNuevo.tipoCliente}
                    onChange={handleClienteNuevoChange}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  >
                    <option value="POR_DESCUBRIR">Por Descubrir</option>
                    <option value="B2B">B2B</option>
                    <option value="B2C">B2C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Clasificación</label>
                  <select
                    name="clasificacion"
                    value={clienteNuevo.clasificacion}
                    onChange={handleClienteNuevoChange}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  >
                    <option value="NUEVO">Nuevo</option>
                    <option value="BASIC">Basic</option>
                    <option value="REGULAR">Regular</option>
                    <option value="PRIORITY">Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Teléfono</label>
                  <input
                    name="telefono"
                    value={clienteNuevo.telefono}
                    onChange={handleClienteNuevoChange}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    placeholder="442 000 0000"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Correo</label>
                  <input
                    name="correo"
                    type="email"
                    value={clienteNuevo.correo}
                    onChange={handleClienteNuevoChange}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Evento */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Evento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo de evento</label>
              <select
                name="tipoEvento"
                value={form.tipoEvento}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              >
                {TIPO_EVENTO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo de servicio</label>
              <select
                name="tipoServicio"
                value={form.tipoServicio}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              >
                <option value="">— Sin especificar —</option>
                {TIPO_SERVICIO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Lugar estimado</label>
              <input
                name="lugarEstimado"
                value={form.lugarEstimado}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Venue o ciudad"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fecha estimada del evento</label>
              <input
                name="fechaEventoEstimada"
                type="date"
                value={form.fechaEventoEstimada}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Presupuesto estimado</label>
              <input
                name="presupuestoEstimado"
                type="number"
                value={form.presupuestoEstimado}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="0.00"
                min="0"
                step="100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Clasificación</label>
              <select
                name="clasificacion"
                value={form.clasificacion}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              >
                {CLASIFICACION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lead */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Origen del Lead</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo de lead</label>
              <select
                name="tipoLead"
                value={form.tipoLead}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              >
                {TIPO_LEAD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Origen del lead</label>
              <select
                name="origenLead"
                value={form.origenLead}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              >
                {ORIGEN_LEAD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Origen de venta (comisiones)</label>
              <select
                name="origenVenta"
                value={form.origenVenta}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              >
                <option value="CLIENTE_PROPIO">Cliente propio (10%)</option>
                <option value="PUBLICIDAD">Lead por publicidad (5%)</option>
                <option value="ASIGNADO">Cliente asignado por empresa (5% + 5%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Seguimiento */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Seguimiento</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notas iniciales</label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows={3}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                placeholder="Contexto, detalles importantes..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Próxima acción</label>
                <input
                  name="proximaAccion"
                  value={form.proximaAccion}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  placeholder="Llamar, enviar cotización..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fecha próxima acción</label>
                <input
                  name="fechaProximaAccion"
                  type="date"
                  value={form.fechaProximaAccion}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end pb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Crear trato"}
          </button>
        </div>
      </form>
    </div>
  );
}
