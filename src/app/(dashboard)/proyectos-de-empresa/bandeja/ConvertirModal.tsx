"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Rocket } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import { AREAS, areaLabel, PRIORIDADES, PRIO_META } from "@/lib/gestion";
import type { Idea } from "./IdeaModal";

interface Usuario { id: string; name: string }

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
  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState<string>(AREAS[0]);
  const [liderId, setLiderId] = useState<string | null>(null);
  const [prioridad, setPrioridad] = useState("MEDIA");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [entregable, setEntregable] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && idea) {
      setNombre(idea.titulo ?? "");
      setArea(idea.area ?? AREAS[0]);
      setLiderId(idea.responsableId ?? null);
      setPrioridad("MEDIA");
      setFechaInicio(""); setFechaFin("");
      setObjetivo(""); setEntregable("");
      setDescripcion(idea.descripcion ?? "");
      setError(null); setSaving(false);
    }
  }, [open, idea]);

  if (!open || !idea) return null;

  async function submit() {
    if (!nombre.trim()) { setError("El nombre del proyecto es obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/proyectos-internos/ideas/${idea!.id}/convertir`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          area,
          liderId,
          prioridad,
          fechaInicio: fechaInicio || null,
          fechaFin: fechaFin || null,
          objetivo: objetivo.trim() || null,
          entregable: entregable.trim() || null,
          descripcion: descripcion.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? "No se pudo convertir"); setSaving(false); return; }
      if (json.proyectoId) router.push(`/proyectos-de-empresa/${json.proyectoId}`);
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
            <p className="text-[11px] text-[#555] truncate">Completa la información para dar de alta el proyecto de empresa.</p>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <Campo label="Nombre del proyecto">
            <input value={nombre} onChange={e => { setNombre(e.target.value); setError(null); }} className={inputCls} placeholder="Nombre del proyecto" />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área">
              <select value={area} onChange={e => setArea(e.target.value)} className={inputCls}>
                {AREAS.map(a => <option key={a} value={a}>{areaLabel(a)}</option>)}
              </select>
            </Campo>
            <Campo label="Líder / responsable">
              <select value={liderId ?? ""} onChange={e => setLiderId(e.target.value || null)} className={inputCls}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Prioridad">
              <select value={prioridad} onChange={e => setPrioridad(e.target.value)} className={inputCls}>
                {PRIORIDADES.map(p => <option key={p} value={p}>{PRIO_META[p].label}</option>)}
              </select>
            </Campo>
            <Campo label="Fecha de inicio">
              <DatePicker value={fechaInicio} onChange={setFechaInicio} placeholder="dd/mm/aaaa" size="sm" />
            </Campo>
          </div>

          <Campo label="Fecha objetivo / entrega">
            <DatePicker value={fechaFin} onChange={setFechaFin} placeholder="dd/mm/aaaa" size="sm" />
          </Campo>

          <Campo label="Objetivo">
            <textarea value={objetivo} onChange={e => setObjetivo(e.target.value)} rows={2}
              className={`${inputCls} resize-none`} placeholder="¿Qué se busca lograr? (opcional)" />
          </Campo>

          <Campo label="Entregable">
            <input value={entregable} onChange={e => setEntregable(e.target.value)} className={inputCls} placeholder="Resultado tangible (opcional)" />
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
