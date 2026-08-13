"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";

const AREAS = ["GENERAL", "VENTAS", "MARKETING", "ADMINISTRACION", "PRODUCCION", "RRHH", "DIRECCION"] as const;
const AREA_LABEL: Record<string, string> = {
  GENERAL: "General", VENTAS: "Ventas", MARKETING: "Marketing",
  ADMINISTRACION: "Administración", PRODUCCION: "Producción", RRHH: "RRHH", DIRECCION: "Dirección",
};
const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"] as const;

const inputCls = "w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] focus:outline-none";
const labelCls = "block text-[11px] uppercase tracking-wider text-gray-500 mb-1";

export default function CrearTareaModal({
  open, onClose, tag, defaultTitle = "", defaultDate = null, defaultArea = "GENERAL", onCreated,
}: {
  open: boolean;
  onClose: () => void;
  tag: string;
  defaultTitle?: string;
  defaultDate?: string | null;
  defaultArea?: string;
  onCreated?: () => void;
}) {
  const [titulo, setTitulo] = useState(defaultTitle);
  const [area, setArea] = useState(defaultArea);
  const [prioridad, setPrioridad] = useState<string>("MEDIA");
  const [fecha, setFecha] = useState(defaultDate ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitulo(defaultTitle); setArea(defaultArea); setPrioridad("MEDIA");
      setFecha(defaultDate ?? ""); setDescripcion(""); setError("");
    }
  }, [open, defaultTitle, defaultDate, defaultArea]);

  async function guardar() {
    if (!titulo.trim()) { setError("Escribe un título"); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || undefined,
          area, prioridad,
          fecha: fecha || undefined,
          etiquetas: [tag],
        }),
      });
      if (!r.ok) throw new Error();
      onCreated?.();
      onClose();
    } catch {
      setError("No se pudo crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva tarea" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-1 rounded-full bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30">#{tag}</span>
          <span className="text-xs text-gray-500">La tarea se etiqueta con el calendario de origen.</span>
        </div>
        <div>
          <label className={labelCls}>Título</label>
          <input autoFocus value={titulo} onChange={e => setTitulo(e.target.value)} className={inputCls} placeholder="¿Qué hay que hacer?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Área</label>
            <select value={area} onChange={e => setArea(e.target.value)} className={inputCls}>
              {AREAS.map(a => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Prioridad</label>
            <select value={prioridad} onChange={e => setPrioridad(e.target.value)} className={inputCls}>
              {PRIORIDADES.map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Fecha (opcional)</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Detalle (opcional)</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} className={inputCls} placeholder="Notas, contexto, entregables…" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="ms-btn-secondary">Cancelar</button>
          <button onClick={guardar} disabled={saving}
            className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {saving ? "Creando…" : "Crear tarea"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
