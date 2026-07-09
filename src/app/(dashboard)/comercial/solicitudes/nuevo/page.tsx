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

interface LineaEquipo {
  key: string;
  categoria: string;
  equipo: string;
  cantidad: number;
  notas: string;
}

function nuevaLinea(): LineaEquipo {
  return { key: Math.random().toString(36).slice(2), categoria: "", equipo: "", cantidad: 1, notas: "" };
}

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [clienteNombre, setClienteNombre] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [lugarEvento, setLugarEvento] = useState("");
  const [etapa, setEtapa] = useState("DESCUBRIMIENTO");
  const [tipoEvento, setTipoEvento] = useState("");
  const [tipoServicio, setTipoServicio] = useState("");
  const [asistentes, setAsistentes] = useState("");
  const [equipos, setEquipos] = useState<LineaEquipo[]>([nuevaLinea()]);
  const [requiereTransporte, setRequiereTransporte] = useState(false);
  const [transporteConcepto, setTransporteConcepto] = useState("");
  const [llevaDescuento, setLlevaDescuento] = useState(false);
  const [descuentoDetalle, setDescuentoDetalle] = useState("");
  const [notaEspecial, setNotaEspecial] = useState("");
  const [sumaComision, setSumaComision] = useState(false);
  const [entregable, setEntregable] = useState("SOLO_PDF");
  const [vendedorId, setVendedorId] = useState("");

  useEffect(() => {
    fetch("/api/usuarios-activos").then(r => r.json()).then(d => setUsuarios(d.usuarios || []));
  }, []);

  function updateLinea(key: string, campo: keyof LineaEquipo, valor: string | number) {
    setEquipos(prev => prev.map(l => (l.key === key ? { ...l, [campo]: valor } : l)));
  }
  function addLinea() { setEquipos(prev => [...prev, nuevaLinea()]); }
  function removeLinea(key: string) { setEquipos(prev => prev.filter(l => l.key !== key)); }

  async function guardar() {
    if (!clienteNombre.trim()) { setError("El nombre del cliente es requerido"); return; }
    setSaving(true); setError("");

    const payload = {
      clienteNombre,
      fechaEvento: fechaEvento ? new Date(fechaEvento + "T12:00:00").toISOString() : null,
      lugarEvento,
      etapa,
      tipoEvento: tipoEvento || null,
      tipoServicio: tipoServicio || null,
      asistentes: asistentes || null,
      requiereTransporte,
      transporteConcepto,
      llevaDescuento,
      descuentoDetalle,
      notaEspecial,
      sumaComision,
      entregable,
      vendedorId: vendedorId || null,
      equipos: equipos
        .filter(l => l.categoria.trim() || l.equipo.trim())
        .map(l => ({ categoria: l.categoria, equipo: l.equipo, cantidad: l.cantidad, notas: l.notas })),
    };

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
        <p className="text-gray-600 text-xs mt-1">Captura rápida del brief. Solo cliente es obligatorio.</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      <div className="space-y-4">
        {/* Datos generales */}
        <div className="ms-card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Datos del evento</h2>
          <div>
            <label className={LABEL}>Cliente *</label>
            <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} placeholder="Nombre del cliente" className={INPUT} autoFocus />
          </div>
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

        {/* Equipos a cotizar */}
        <div className="ms-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Equipos a cotizar</h2>
            <button onClick={addLinea} type="button" className="text-xs bg-[#B3985B]/20 text-[#B3985B] px-3 py-1 rounded-lg hover:bg-[#B3985B]/30 transition-colors">+ Agregar fila</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs">
                  <th className="text-left font-medium pb-2 pr-2">Categoría</th>
                  <th className="text-left font-medium pb-2 pr-2">Equipo</th>
                  <th className="text-left font-medium pb-2 pr-2 w-20">Cant.</th>
                  <th className="text-left font-medium pb-2 pr-2">Notas</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {equipos.map(l => (
                  <tr key={l.key}>
                    <td className="pr-2 py-1"><input value={l.categoria} onChange={e => updateLinea(l.key, "categoria", e.target.value)} placeholder="Audio…" className={INPUT} /></td>
                    <td className="pr-2 py-1"><input value={l.equipo} onChange={e => updateLinea(l.key, "equipo", e.target.value)} placeholder="Bocina…" className={INPUT} /></td>
                    <td className="pr-2 py-1"><input type="number" min={1} value={l.cantidad} onChange={e => updateLinea(l.key, "cantidad", parseInt(e.target.value) || 1)} className={INPUT} /></td>
                    <td className="pr-2 py-1"><input value={l.notas} onChange={e => updateLinea(l.key, "notas", e.target.value)} placeholder="Detalle…" className={INPUT} /></td>
                    <td className="py-1 text-center">
                      <button type="button" onClick={() => removeLinea(l.key)} className="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <textarea value={notaEspecial} onChange={e => setNotaEspecial(e.target.value)} rows={3} placeholder="Cualquier detalle relevante…" className={INPUT} />
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
