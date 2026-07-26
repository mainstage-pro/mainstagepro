"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Rocket } from "lucide-react";
import { Combobox } from "@/components/Combobox";
import DatePicker from "@/components/ui/DatePicker";
import { TIPO_EVENTO_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/constants";
import type { Idea } from "./IdeaModal";

interface Usuario { id: string; name: string }
interface ClienteOpt { id: string; nombre: string; empresa: string | null }

const inputCls = "w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#B3985B]/40";

export default function ConvertirModal({
  open, onClose, idea, usuarios,
}: {
  open: boolean;
  onClose: () => void;
  idea: Idea | null;
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipoEvento, setTipoEvento] = useState("MUSICAL");
  const [tipoServicio, setTipoServicio] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [lugarEvento, setLugarEvento] = useState("");
  const [responsableId, setResponsableId] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && idea) {
      setClienteId(""); setClienteNombre("");
      setNombre(idea.titulo ?? "");
      setTipoEvento("MUSICAL"); setTipoServicio("");
      setFechaEvento(""); setLugarEvento("");
      setResponsableId(idea.responsableId ?? null);
      setDescripcion(idea.descripcion ?? "");
      setError(null); setSaving(false);
    }
  }, [open, idea]);

  useEffect(() => {
    if (open && clientes.length === 0) {
      fetch("/api/clientes?limit=500").then(r => r.json())
        .then(d => setClientes(d.clientes ?? [])).catch(() => {});
    }
  }, [open, clientes.length]);

  if (!open || !idea) return null;

  const clienteOptions = clientes.map(c => ({
    value: c.id,
    label: c.empresa ? `${c.nombre} · ${c.empresa}` : c.nombre,
  }));

  async function submit() {
    if (!nombre.trim()) { setError("El nombre del proyecto es obligatorio"); return; }
    if (!clienteId && !clienteNombre.trim()) { setError("Selecciona un cliente o escribe uno nuevo"); return; }
    if (!fechaEvento) { setError("La fecha del evento es obligatoria"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/proyectos/ideas/${idea!.id}/convertir`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          clienteId: clienteId || null,
          clienteNombre: clienteId ? null : clienteNombre.trim(),
          tipoEvento,
          tipoServicio: tipoServicio || null,
          fechaEvento,
          lugarEvento: lugarEvento.trim() || null,
          responsableId,
          descripcion: descripcion.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? "No se pudo convertir"); setSaving(false); return; }
      if (json.proyectoId) router.push(`/proyectos/${json.proyectoId}`);
    } catch {
      setError("Error de red. Intenta de nuevo."); setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg my-auto rounded-2xl border border-[#1c1c1c] bg-[#0a0a0a] shadow-2xl shadow-black/80 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#141414]">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-[#B3985B]/15 text-[#B3985B]"><Rocket size={17} /></span>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">Pasar a proyecto activo</h2>
            <p className="text-[11px] text-[#555] truncate">Completa la información para dar de alta el proyecto de evento.</p>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <Campo label="Nombre del proyecto">
            <input value={nombre} onChange={e => { setNombre(e.target.value); setError(null); }} className={inputCls} placeholder="Nombre del evento" />
          </Campo>

          <Campo label="Cliente">
            <Combobox value={clienteId} onChange={v => { setClienteId(v); if (v) setClienteNombre(""); }}
              options={clienteOptions} placeholder="Busca un cliente existente…" className={inputCls} />
            {!clienteId && (
              <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                placeholder="…o escribe un cliente nuevo" className={`${inputCls} mt-2`} />
            )}
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Tipo de evento">
              <select value={tipoEvento} onChange={e => setTipoEvento(e.target.value)} className={inputCls}>
                {Object.entries(TIPO_EVENTO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Campo>
            <Campo label="Tipo de servicio">
              <select value={tipoServicio} onChange={e => setTipoServicio(e.target.value)} className={inputCls}>
                <option value="">Sin definir</option>
                {Object.entries(TIPO_SERVICIO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Fecha del evento">
              <DatePicker value={fechaEvento} onChange={setFechaEvento} placeholder="dd/mm/aaaa" size="sm" />
            </Campo>
            <Campo label="Responsable">
              <select value={responsableId ?? ""} onChange={e => setResponsableId(e.target.value || null)} className={inputCls}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Campo>
          </div>

          <Campo label="Lugar / venue">
            <input value={lugarEvento} onChange={e => setLugarEvento(e.target.value)} className={inputCls} placeholder="Opcional" />
          </Campo>

          <Campo label="Descripción">
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
              className={`${inputCls} resize-none`} placeholder="Opcional" />
          </Campo>

          {error && <p className="text-[12px] text-red-400 flex items-center gap-1.5"><X size={13} /> {error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#141414] bg-[#080808]">
          <button onClick={onClose} className="text-[12px] text-[#555] hover:text-white px-3 py-1.5 rounded-lg transition-colors">Cancelar</button>
          <button onClick={submit} disabled={saving}
            className="text-[12px] font-semibold px-4 py-1.5 rounded-lg bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            {saving ? "Creando proyecto…" : "Crear proyecto"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[#666] uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
