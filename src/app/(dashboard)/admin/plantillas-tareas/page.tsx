"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { ClipboardList, Plus, Trash2, ChevronUp, ChevronDown, Check, X, Pencil } from "lucide-react";
import {
  GRUPOS_ORDEN,
  TIPOS_SERVICIO,
  type PlantillaItem,
} from "@/lib/plantillas-tareas-evento";

export default function PlantillasTareasPage() {
  const toast = useToast();
  const [tipoServicio, setTipoServicio] = useState<string>(TIPOS_SERVICIO[0].value);
  const [items, setItems] = useState<PlantillaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [nuevo, setNuevo] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plantillas-tareas-evento?tipoServicio=${encodeURIComponent(tipoServicio)}`, { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setItems(d.items ?? []); }
    } finally { setLoading(false); }
  }, [tipoServicio]);

  useEffect(() => { load(); }, [load]);

  const porGrupo = useMemo(() => {
    const m = new Map<string, PlantillaItem[]>();
    for (const g of GRUPOS_ORDEN) m.set(g, []);
    for (const it of items) {
      if (!m.has(it.grupo)) m.set(it.grupo, []);
      m.get(it.grupo)!.push(it);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.orden - b.orden);
    return m;
  }, [items]);

  async function agregar(grupo: string) {
    const titulo = (nuevo[grupo] ?? "").trim();
    if (!titulo) return;
    const res = await fetch(`/api/plantillas-tareas-evento`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipoServicio, grupo, titulo }),
    });
    if (res.ok) { setNuevo(p => ({ ...p, [grupo]: "" })); toast.success("Tarea agregada"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al agregar"); }
  }

  async function guardarEdicion(id: string) {
    const titulo = editTitulo.trim();
    if (!titulo) return;
    const res = await fetch(`/api/plantillas-tareas-evento/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo }),
    });
    if (res.ok) { setEditId(null); toast.success("Tarea actualizada"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta tarea sugerida de la plantilla?")) return;
    const res = await fetch(`/api/plantillas-tareas-evento/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Tarea eliminada"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al eliminar"); }
  }

  async function mover(id: string, dir: "arriba" | "abajo") {
    const res = await fetch(`/api/plantillas-tareas-evento/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mover: dir }),
    });
    if (res.ok) load();
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#B3985B]/15 flex items-center justify-center">
          <ClipboardList strokeWidth={1.75} className="w-5 h-5 text-[#B3985B]" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-lg">Plantillas de tareas de evento</h1>
          <p className="text-gray-500 text-xs mt-0.5">Tareas sugeridas por defecto en la pestaña Tareas de cada proyecto de evento, por tipo de servicio.</p>
        </div>
      </div>

      {/* Selector de tipo de servicio */}
      <div className="flex gap-2">
        {TIPOS_SERVICIO.map(t => (
          <button
            key={t.value}
            onClick={() => { setTipoServicio(t.value); setEditId(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              tipoServicio === t.value
                ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
                : "bg-[#0d0d0d] border-[#1a1a1a] text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-24 ms-card animate-pulse rounded-2xl" />)}</div>
      ) : (
        [...porGrupo.entries()].map(([grupo, list]) => (
          <div key={grupo} className="ms-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">{grupo}</h4>
              <span className="text-[11px] text-gray-600">{list.length}</span>
            </div>

            <div className="divide-y divide-[#141414]">
              {list.map((it, idx) => (
                <div key={it.id} className="flex items-center gap-2 px-4 py-2.5 group">
                  <div className="flex flex-col shrink-0">
                    <button onClick={() => mover(it.id, "arriba")} disabled={idx === 0}
                      className="text-[#555] hover:text-[#B3985B] disabled:opacity-20 disabled:hover:text-[#555]">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => mover(it.id, "abajo")} disabled={idx === list.length - 1}
                      className="text-[#555] hover:text-[#B3985B] disabled:opacity-20 disabled:hover:text-[#555]">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {editId === it.id ? (
                    <>
                      <input
                        autoFocus
                        value={editTitulo}
                        onChange={e => setEditTitulo(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") guardarEdicion(it.id); if (e.key === "Escape") setEditId(null); }}
                        className="flex-1 bg-[#0d0d0d] border border-[#B3985B]/40 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                      />
                      <button onClick={() => guardarEdicion(it.id)} className="text-green-400 hover:text-green-300 shrink-0"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditId(null)} className="text-gray-500 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <p className="flex-1 text-sm text-white leading-snug">{it.titulo}</p>
                      <button
                        onClick={() => { setEditId(it.id); setEditTitulo(it.titulo); }}
                        className="text-[#555] hover:text-[#B3985B] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => eliminar(it.id)}
                        className="text-[#555] hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Agregar nuevo ítem al grupo */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[#141414] bg-[#0a0a0a]">
              <input
                value={nuevo[grupo] ?? ""}
                onChange={e => setNuevo(p => ({ ...p, [grupo]: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") agregar(grupo); }}
                placeholder={`Nueva tarea de ${grupo}…`}
                className="flex-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#B3985B]/40"
              />
              <button
                onClick={() => agregar(grupo)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#B3985B]/15 text-[#B3985B] text-sm font-medium hover:bg-[#B3985B]/25 transition-all"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
