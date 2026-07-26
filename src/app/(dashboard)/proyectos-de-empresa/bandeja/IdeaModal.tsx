"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AREAS, areaLabel } from "@/lib/gestion";

export interface Idea {
  id: string;
  titulo: string;
  descripcion: string | null;
  area: string;
  responsableId: string | null;
  estado: string;
  proyectoId: string | null;
  createdAt: string;
}
interface Usuario { id: string; name: string }

const inputCls = "w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#B3985B]/40";

export default function IdeaModal({
  open, onClose, usuarios, idea, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  usuarios: Usuario[];
  idea?: Idea | null;
  onSaved: (idea: Idea) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [area, setArea] = useState<string>(AREAS[0]);
  const [responsableId, setResponsableId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitulo(idea?.titulo ?? "");
      setDescripcion(idea?.descripcion ?? "");
      setArea(idea?.area ?? AREAS[0]);
      setResponsableId(idea?.responsableId ?? null);
      setError(null); setSaving(false);
    }
  }, [open, idea]);

  if (!open) return null;

  async function submit() {
    if (!titulo.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true); setError(null);
    const payload = { titulo: titulo.trim(), descripcion: descripcion.trim() || null, area, responsableId };
    const url = idea ? `/api/proyectos-internos/ideas/${idea.id}` : "/api/proyectos-internos/ideas";
    const method = idea ? "PATCH" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? "No se pudo guardar"); setSaving(false); return; }
      onSaved(json.idea);
      onClose();
    } catch {
      setError("Error de red. Intenta de nuevo."); setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg my-auto rounded-2xl border border-[#1c1c1c] bg-[#0a0a0a] shadow-2xl shadow-black/80 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#141414]">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{idea ? "Editar idea" : "Nueva idea de proyecto"}</h2>
            <p className="text-[11px] text-[#555] truncate">Captúrala rápido; la clasificas y la conviertes después.</p>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <textarea autoFocus value={titulo} rows={1}
              onChange={e => { setTitulo(e.target.value); setError(null); }}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
              placeholder="¿Cuál es la idea de proyecto?"
              className="w-full bg-transparent text-[16px] text-white placeholder-[#333] focus:outline-none leading-snug resize-none" />
            <textarea value={descripcion}
              onChange={e => { setDescripcion(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              placeholder="Descripción (opcional)" rows={2}
              className="w-full bg-transparent text-[13px] text-[#777] placeholder-[#2a2a2a] focus:outline-none leading-snug resize-none overflow-hidden" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666] uppercase tracking-wide mb-1.5">Área</label>
              <select value={area} onChange={e => setArea(e.target.value)} className={inputCls}>
                {AREAS.map(a => <option key={a} value={a}>{areaLabel(a)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666] uppercase tracking-wide mb-1.5">Responsable</label>
              <select value={responsableId ?? ""} onChange={e => setResponsableId(e.target.value || null)} className={inputCls}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-[12px] text-red-400 flex items-center gap-1.5"><X size={13} /> {error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#141414] bg-[#080808]">
          <button onClick={onClose} className="text-[12px] text-[#555] hover:text-white px-3 py-1.5 rounded-lg transition-colors">Cancelar</button>
          <button onClick={submit} disabled={saving || !titulo.trim()}
            className="text-[12px] font-semibold px-4 py-1.5 rounded-lg bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            {saving ? "Guardando…" : idea ? "Guardar cambios" : "Agregar idea"}
          </button>
        </div>
      </div>
    </div>
  );
}
