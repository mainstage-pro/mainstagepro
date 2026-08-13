"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Combobox } from "@/components/Combobox";

// Tarea creada desde un calendario = tarea ESTÁNDAR de Gestión Operativa
// (mismo modelo Tarea, mismo endpoint POST /api/tareas, tipoOrigen "TAREA").
// Para que se ligue a la sección "Hoy" y a las listas operativas, fecha y
// responsable son OBLIGATORIOS (ver filtro de "Hoy" en operaciones/page.tsx).

const AREAS = ["GENERAL", "VENTAS", "MARKETING", "ADMINISTRACION", "PRODUCCION", "RRHH", "DIRECCION"] as const;
const AREA_LABEL: Record<string, string> = {
  GENERAL: "General", VENTAS: "Ventas", MARKETING: "Marketing",
  ADMINISTRACION: "Administración", PRODUCCION: "Producción", RRHH: "RRHH", DIRECCION: "Dirección",
};
const PRIORIDADES = [
  { key: "URGENTE", label: "Urgente", color: "#f87171" },
  { key: "ALTA", label: "Alta", color: "#fb923c" },
  { key: "MEDIA", label: "Media", color: "#B3985B" },
  { key: "BAJA", label: "Baja", color: "#555" },
] as const;
const COMPROBACIONES = [
  { key: "", label: "Sin comprobación" },
  { key: "NOTA", label: "Nota escrita" },
  { key: "FOTO", label: "Evidencia fotográfica" },
  { key: "ARCHIVO", label: "Reporte / archivo" },
] as const;

interface Usuario { id: string; name: string; area?: string }

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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [titulo, setTitulo] = useState(defaultTitle);
  const [area, setArea] = useState(defaultArea);
  const [prioridad, setPrioridad] = useState<string>("MEDIA");
  const [asignadoId, setAsignadoId] = useState<string | null>(null);
  const [coResponsables, setCoResponsables] = useState<string[]>([]);
  const [fecha, setFecha] = useState(defaultDate ?? "");
  const [fechaVen, setFechaVen] = useState("");
  const [comprobacion, setComprobacion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (usuarios.length) return;
    fetch("/api/usuarios").then(r => r.json())
      .then(d => setUsuarios(d.usuarios ?? []))
      .catch(() => {});
  }, [usuarios.length]);

  useEffect(() => {
    if (open) {
      setTitulo(defaultTitle); setArea(defaultArea); setPrioridad("MEDIA");
      setAsignadoId(null); setCoResponsables([]);
      setFecha(defaultDate ?? ""); setFechaVen(""); setComprobacion("");
      setDescripcion(""); setError("");
    }
  }, [open, defaultTitle, defaultDate, defaultArea]);

  async function guardar() {
    if (!titulo.trim()) { setError("Escribe un título."); return; }
    if (!fecha) { setError("La fecha es obligatoria para que la tarea aparezca en Hoy."); return; }
    if (!asignadoId) { setError("Asigna un responsable para que la tarea aparezca en su Hoy."); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          prioridad,
          area,
          asignadoAId: asignadoId,
          colaboradorIds: coResponsables.filter(id => id !== asignadoId),
          fecha,
          fechaVencimiento: fechaVen || null,
          tipoOrigen: "TAREA",
          tipoEvidencia: comprobacion || null,
          requiereEvidencia: !!comprobacion,
          etiquetas: [tag],
        }),
      });
      if (!r.ok) throw new Error();
      onCreated?.();
      onClose();
    } catch {
      setError("No se pudo crear la tarea.");
    } finally {
      setSaving(false);
    }
  }

  const usuarioOpts = usuarios.map(u => ({ value: u.id, label: u.name + (u.area ? ` · ${AREA_LABEL[u.area] ?? u.area}` : "") }));

  return (
    <Modal open={open} onClose={onClose} title="Nueva tarea operativa" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] px-2 py-1 rounded-full bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30">#{tag}</span>
          <span className="text-xs text-gray-500">Tarea estándar de Gestión Operativa, etiquetada con el calendario.</span>
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
              {PRIORIDADES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Responsable <span className="text-[#B3985B]">·obligatorio</span></label>
          <Combobox
            options={usuarioOpts}
            value={asignadoId ?? ""}
            onChange={(v) => setAsignadoId(v || null)}
            placeholder="Elige un responsable…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fecha <span className="text-[#B3985B]">·obligatoria</span></label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fecha límite</label>
            <input type="date" value={fechaVen} onChange={e => setFechaVen(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Comprobación</label>
          <select value={comprobacion} onChange={e => setComprobacion(e.target.value)} className={inputCls}>
            {COMPROBACIONES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Detalle</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} className={inputCls} placeholder="Notas, contexto, entregables…" />
        </div>

        <p className="text-[11px] text-gray-600">Con fecha y responsable, la tarea entra a la sección <span className="text-gray-400">Hoy</span> del responsable y a las listas operativas.</p>
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
