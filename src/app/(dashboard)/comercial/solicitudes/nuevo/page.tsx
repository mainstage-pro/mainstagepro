"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ETAPA_LABELS,
  TIPO_EVENTO_LABELS,
  TIPO_SERVICIO_LABELS,
  ENTREGABLE_LABELS,
} from "@/lib/constants";

const INPUT = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:border-[#B3985B] outline-none transition-colors";
const LABEL = "block text-xs font-medium text-gray-400 mb-1";

const ETAPAS = ["LEAD", "DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"];
const ETAPA_TXT: Record<string, string> = { LEAD: "Prospección", ...ETAPA_LABELS };

interface Cliente { id: string; nombre: string; empresa: string | null; telefono: string | null; clasificacion: string; }

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Cliente
  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">("existente");
  const [clienteId, setClienteId] = useState("");
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const [clienteNuevo, setClienteNuevo] = useState({ nombre: "", empresa: "", telefono: "", correo: "" });
  const [contactoTelefono, setContactoTelefono] = useState("");

  // Evento
  const [fechaEvento, setFechaEvento] = useState("");
  const [lugarEvento, setLugarEvento] = useState("");
  const [etapa, setEtapa] = useState("DESCUBRIMIENTO");
  const [tipoEvento, setTipoEvento] = useState("");
  const [tipoServicio, setTipoServicio] = useState("");
  const [asistentes, setAsistentes] = useState("");
  const [equiposDescripcion, setEquiposDescripcion] = useState("");

  // Condiciones
  const [requiereTransporte, setRequiereTransporte] = useState(false);
  const [transporteConcepto, setTransporteConcepto] = useState("");
  const [llevaDescuento, setLlevaDescuento] = useState(false);
  const [descuentoDetalle, setDescuentoDetalle] = useState("");
  const [notaEspecial, setNotaEspecial] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [sumaComision, setSumaComision] = useState(false);
  const [entregable, setEntregable] = useState("SOLO_PDF");
  const [vendedorId, setVendedorId] = useState("");

  useEffect(() => {
    fetch("/api/usuarios-activos").then(r => r.json()).then(d => setUsuarios(d.usuarios || []));
    fetch("/api/clientes").then(r => r.json()).then(d => setClientes(d.clientes || []));
  }, []);

  const clienteSel = clientes.find(c => c.id === clienteId);

  function seleccionarCliente(c: Cliente) {
    setClienteId(c.id);
    setClienteQuery(c.nombre + (c.empresa ? ` · ${c.empresa}` : ""));
    setClienteDropdown(false);
    if (c.telefono) setContactoTelefono(c.telefono);
  }

  async function guardar() {
    if (modoCliente === "existente" && !clienteId) { setError("Selecciona un cliente existente"); return; }
    if (modoCliente === "nuevo" && !clienteNuevo.nombre.trim()) { setError("El nombre del cliente es requerido"); return; }
    setSaving(true); setError("");

    const payload: Record<string, unknown> = {
      contactoTelefono,
      fechaEvento: fechaEvento ? new Date(fechaEvento + "T12:00:00").toISOString() : null,
      lugarEvento,
      etapa,
      tipoEvento: tipoEvento || null,
      tipoServicio: tipoServicio || null,
      asistentes: asistentes || null,
      equiposDescripcion,
      requiereTransporte,
      transporteConcepto,
      llevaDescuento,
      descuentoDetalle,
      notaEspecial,
      observaciones,
      sumaComision,
      entregable,
      vendedorId: vendedorId || null,
    };

    if (modoCliente === "existente") {
      payload.clienteId = clienteId;
      payload.clienteNombre = clienteSel?.nombre || "";
    } else {
      payload.clienteNuevo = clienteNuevo;
      payload.clienteNombre = clienteNuevo.nombre;
      if (!contactoTelefono) payload.contactoTelefono = clienteNuevo.telefono;
    }

    try {
      const res = await fetch("/api/solicitudes-cotizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Error al guardar la solicitud");
        setSaving(false);
        return;
      }
      const { solicitud } = await res.json();
      router.push(`/comercial/solicitudes/${solicitud.id}`);
    } catch {
      setError("Error de conexión");
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-white text-sm mb-2 transition-colors">← Atrás</button>
        <h1 className="ms-h1">Nueva solicitud de cotización</h1>
        <p className="text-gray-600 text-xs mt-1">Captura rápida del brief. Solo el cliente es obligatorio.</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      <div className="space-y-4">
        {/* Cliente */}
        <div className="ms-card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Cliente</h2>
          <div className="flex gap-2">
            {(["existente", "nuevo"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setModoCliente(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  modoCliente === m ? "bg-[#B3985B] text-black" : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]"
                }`}
              >
                {m === "existente" ? "Cliente existente" : "+ Dar de alta cliente"}
              </button>
            ))}
          </div>

          {modoCliente === "existente" ? (
            <div className="relative">
              <label className={LABEL}>Buscar cliente *</label>
              <input
                type="text"
                value={clienteQuery}
                onChange={e => { setClienteQuery(e.target.value); setClienteDropdown(true); if (!e.target.value) setClienteId(""); }}
                onFocusCapture={() => setClienteDropdown(true)}
                onBlur={() => setTimeout(() => setClienteDropdown(false), 150)}
                placeholder="Buscar por nombre o empresa…"
                className={INPUT}
              />
              {clienteDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[#161616] border border-[#2a2a2a] rounded-lg shadow-xl max-h-52 overflow-y-auto">
                  {clientes
                    .filter(c => {
                      const q = clienteQuery.toLowerCase();
                      return !q || c.nombre.toLowerCase().includes(q) || (c.empresa ?? "").toLowerCase().includes(q);
                    })
                    .slice(0, 40)
                    .map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => seleccionarCliente(c)}
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
                  Seleccionado: <span className="text-[#B3985B] font-medium">{clienteSel.nombre}</span>
                  {clienteSel.telefono && <span className="ml-2 text-gray-600">· {clienteSel.telefono}</span>}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Nombre *</label>
                <input value={clienteNuevo.nombre} onChange={e => setClienteNuevo(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre completo" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Empresa</label>
                <input value={clienteNuevo.empresa} onChange={e => setClienteNuevo(p => ({ ...p, empresa: e.target.value }))} placeholder="Empresa" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Teléfono</label>
                <input value={clienteNuevo.telefono} onChange={e => setClienteNuevo(p => ({ ...p, telefono: e.target.value }))} placeholder="442 000 0000" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Correo</label>
                <input type="email" value={clienteNuevo.correo} onChange={e => setClienteNuevo(p => ({ ...p, correo: e.target.value }))} placeholder="correo@ejemplo.com" className={INPUT} />
              </div>
            </div>
          )}

          <div>
            <label className={LABEL}>Contacto (teléfono)</label>
            <input value={contactoTelefono} onChange={e => setContactoTelefono(e.target.value)} placeholder="Número de contacto" className={INPUT} />
          </div>
        </div>

        {/* Datos del evento */}
        <div className="ms-card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Datos del evento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Fecha del evento</label>
              <input type="date" value={fechaEvento} onChange={e => setFechaEvento(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Lugar del evento</label>
              <input value={lugarEvento} onChange={e => setLugarEvento(e.target.value)} placeholder="Venue / ciudad" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Etapa</label>
              <select value={etapa} onChange={e => setEtapa(e.target.value)} className={INPUT}>
                {ETAPAS.map(x => <option key={x} value={x}>{ETAPA_TXT[x] || x}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Tipo de evento</label>
              <select value={tipoEvento} onChange={e => setTipoEvento(e.target.value)} className={INPUT}>
                <option value="">—</option>
                {Object.entries(TIPO_EVENTO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Tipo de servicio</label>
              <select value={tipoServicio} onChange={e => setTipoServicio(e.target.value)} className={INPUT}>
                <option value="">—</option>
                {Object.entries(TIPO_SERVICIO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Asistentes aprox.</label>
              <input type="number" value={asistentes} onChange={e => setAsistentes(e.target.value)} placeholder="0" className={INPUT} />
            </div>
          </div>
        </div>

        {/* Equipos a cotizar (texto libre) */}
        <div className="ms-card p-5">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-1">Equipos a cotizar</h2>
          <p className="text-[11px] text-gray-600 mb-3">Escribe libremente los equipos que irían en la cotización.</p>
          <textarea
            value={equiposDescripcion}
            onChange={e => setEquiposDescripcion(e.target.value)}
            rows={8}
            placeholder={"Ej.\n2 bocinas activas\n1 consola digital 32 canales\n4 monitores\nMicrofonía inalámbrica…"}
            className={INPUT}
          />
        </div>

        {/* Condiciones */}
        <div className="ms-card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Condiciones</h2>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={requiereTransporte} onChange={e => setRequiereTransporte(e.target.checked)} className="accent-[#B3985B]" />
            ¿Requiere transporte?
          </label>
          {requiereTransporte && (
            <input value={transporteConcepto} onChange={e => setTransporteConcepto(e.target.value)} placeholder="Concepto de transporte" className={INPUT} />
          )}

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={llevaDescuento} onChange={e => setLlevaDescuento(e.target.checked)} className="accent-[#B3985B]" />
            ¿Lleva descuento?
          </label>
          {llevaDescuento && (
            <input value={descuentoDetalle} onChange={e => setDescuentoDetalle(e.target.value)} placeholder="Detalle del descuento" className={INPUT} />
          )}

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={sumaComision} onChange={e => setSumaComision(e.target.checked)} className="accent-[#B3985B]" />
            ¿Se le suma el 10% de comisión?
          </label>

          <div>
            <label className={LABEL}>Nota especial</label>
            <textarea value={notaEspecial} onChange={e => setNotaEspecial(e.target.value)} rows={2} placeholder="Cualquier detalle relevante…" className={INPUT} />
          </div>

          <div>
            <label className={LABEL}>Observaciones / comentarios</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Notas u observaciones…" className={INPUT} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Entregable</label>
              <select value={entregable} onChange={e => setEntregable(e.target.value)} className={INPUT}>
                {Object.entries(ENTREGABLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Asignar a vendedor</label>
              <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className={INPUT}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => router.back()} type="button" className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={guardar} disabled={saving} className="px-5 py-2 bg-[#B3985B] text-black font-semibold text-sm rounded-lg hover:bg-[#B3985B]/80 disabled:opacity-50 transition-colors">
            {saving ? "Guardando…" : "Guardar solicitud"}
          </button>
        </div>
      </div>
    </div>
  );
}
