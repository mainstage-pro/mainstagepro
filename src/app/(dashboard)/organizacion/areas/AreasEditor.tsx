"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { Plus, Trash2, Layers, ChevronDown, ChevronRight, Wand2, Pencil, X, Check } from "lucide-react";

interface SubAreaCount { tareas: number; secciones: number; puestos: number; }
interface SubArea { id: string; nombre: string; descripcion: string | null; orden: number; _count?: SubAreaCount; }
interface Area {
  id: string; nombre: string; codigo: string | null; transversal: boolean;
  color: string; objetivo: string | null; orden: number; subareas: SubArea[];
}

export default function AreasEditor() {
  const toast = useToast();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Edición bajo demanda: un id presente = esa fila está en modo edición.
  const [editArea, setEditArea] = useState<Record<string, Partial<Area>>>({});
  const [editSub, setEditSub] = useState<Record<string, Partial<SubArea>>>({});
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const [newArea, setNewArea] = useState<{ nombre: string; color: string; objetivo: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/organizacion");
      const d = await r.json();
      setAreas(d.areas ?? []);
    } catch { toast.error("Error al cargar áreas"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // ── Área ────────────────────────────────────────────────────────────────
  const startEditArea = (a: Area) =>
    setEditArea(e => ({ ...e, [a.id]: { nombre: a.nombre, color: a.color, objetivo: a.objetivo, transversal: a.transversal } }));
  const cancelEditArea = (id: string) =>
    setEditArea(e => { const n = { ...e }; delete n[id]; return n; });
  const setAreaField = (id: string, k: keyof Area, v: unknown) =>
    setEditArea(e => ({ ...e, [id]: { ...e[id], [k]: v } }));

  async function saveArea(id: string) {
    const dd = editArea[id]; if (!dd) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/admin/organizacion/areas/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: dd.nombre, color: dd.color, objetivo: dd.objetivo, transversal: dd.transversal }),
      });
      if (!r.ok) throw new Error();
      toast.success("Área actualizada");
      cancelEditArea(id);
      await load();
    } catch { toast.error("Error al guardar el área"); }
    finally { setBusy(null); }
  }

  async function delArea(a: Area) {
    if (!confirm(`¿Eliminar el área "${a.nombre}"?`)) return;
    setBusy(a.id);
    try {
      const r = await fetch(`/api/admin/organizacion/areas/${a.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "No se pudo eliminar"); return; }
      toast.success("Área eliminada");
      await load();
    } catch { toast.error("Error de conexión"); }
    finally { setBusy(null); }
  }

  async function createArea() {
    if (!newArea?.nombre.trim()) return;
    setBusy("new-area");
    try {
      const r = await fetch("/api/admin/organizacion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newArea),
      });
      if (!r.ok) throw new Error();
      toast.success("Área creada");
      setNewArea(null);
      await load();
    } catch { toast.error("Error al crear el área"); }
    finally { setBusy(null); }
  }

  async function derivarSecciones() {
    if (!confirm("Derivar subáreas desde las secciones del plan operativo. Crea o vincula subáreas por área; no borra nada. ¿Continuar?")) return;
    setBusy("derivar");
    try {
      const r = await fetch("/api/admin/organizacion/derivar-secciones", { method: "POST" });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "No se pudo derivar"); return; }
      toast.success(`${d.vinculadas} secciones vinculadas · ${d.creadas} subáreas nuevas`);
      await load();
    } catch { toast.error("Error de conexión"); }
    finally { setBusy(null); }
  }

  // ── Subárea ─────────────────────────────────────────────────────────────
  const startEditSub = (s: SubArea) =>
    setEditSub(e => ({ ...e, [s.id]: { nombre: s.nombre, descripcion: s.descripcion } }));
  const cancelEditSub = (id: string) =>
    setEditSub(e => { const n = { ...e }; delete n[id]; return n; });
  const setSubField = (id: string, k: keyof SubArea, v: unknown) =>
    setEditSub(e => ({ ...e, [id]: { ...e[id], [k]: v } }));

  async function addSub(areaId: string) {
    const nombre = (newSub[areaId] ?? "").trim();
    if (!nombre) return;
    setBusy(`add-${areaId}`);
    try {
      const r = await fetch("/api/admin/organizacion/subareas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId, nombre }),
      });
      if (!r.ok) throw new Error();
      setNewSub(s => ({ ...s, [areaId]: "" }));
      await load();
    } catch { toast.error("Error al crear la subárea"); }
    finally { setBusy(null); }
  }

  async function saveSub(id: string) {
    const dd = editSub[id]; if (!dd) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/admin/organizacion/subareas/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: dd.nombre, descripcion: dd.descripcion }),
      });
      if (!r.ok) throw new Error();
      cancelEditSub(id);
      await load();
    } catch { toast.error("Error al guardar la subárea"); }
    finally { setBusy(null); }
  }

  async function delSub(s: SubArea) {
    if (!confirm(`¿Eliminar la subárea "${s.nombre}"?`)) return;
    setBusy(s.id);
    try {
      const r = await fetch(`/api/admin/organizacion/subareas/${s.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "No se pudo eliminar"); return; }
      await load();
    } catch { toast.error("Error de conexión"); }
    finally { setBusy(null); }
  }

  const linked = (s: SubArea) => (s._count?.secciones ?? 0) > 0;
  const areaTareas = (a: Area) => a.subareas.reduce((n, s) => n + (s._count?.tareas ?? 0), 0);

  if (loading) return <p className="text-gray-600 text-sm">Cargando áreas…</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500 max-w-xl">
          Fuente única de las áreas y subáreas. El <span className="text-[#B3985B]">código</span> es interno; el nombre es la etiqueta visible.
          Los contadores muestran <span className="text-gray-400">tareas · secciones · puestos</span>.
        </p>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={derivarSecciones}
            disabled={busy === "derivar"}
            title="Deriva las subáreas desde las secciones del plan de trabajo (crea o vincula; no borra)"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs px-2 py-1.5 rounded-lg transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" /> {busy === "derivar" ? "Derivando…" : "Derivar desde plan"}
          </button>
          <button
            onClick={() => setNewArea({ nombre: "", color: "#1a1a2e", objetivo: "" })}
            className="flex items-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva área
          </button>
        </div>
      </div>

      {/* Nueva área */}
      {newArea && (
        <div className="ms-card p-3 space-y-2 border-[#B3985B]/40">
          <div className="flex gap-2 items-center">
            <input type="color" value={newArea.color}
              onChange={e => setNewArea(a => a && { ...a, color: e.target.value })}
              className="h-8 w-10 rounded cursor-pointer border border-[#2a2a2a] bg-transparent shrink-0" />
            <input
              autoFocus value={newArea.nombre}
              onChange={e => setNewArea(a => a && { ...a, nombre: e.target.value })}
              placeholder="Nombre del área"
              className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
          <textarea value={newArea.objetivo}
            onChange={e => setNewArea(a => a && { ...a, objetivo: e.target.value })}
            placeholder="Objetivo del área (opcional)" rows={2}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-y" />
          <div className="flex gap-2">
            <button onClick={createArea} disabled={busy === "new-area" || !newArea.nombre.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors">
              {busy === "new-area" ? "Creando…" : "Crear"}
            </button>
            <button onClick={() => setNewArea(null)}
              className="text-gray-500 hover:text-white text-sm px-3 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de áreas */}
      {areas.map(a => {
        const isOpen = expanded[a.id] ?? false;
        const ea = editArea[a.id];
        return (
          <div key={a.id} className="ms-card p-0 overflow-hidden" style={{ borderLeft: `3px solid ${ea?.color ?? a.color}` }}>
            {ea ? (
              /* ── Área en edición ── */
              <div className="p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <input type="color" value={ea.color ?? a.color}
                    onChange={e => setAreaField(a.id, "color", e.target.value)}
                    className="h-7 w-9 rounded cursor-pointer border border-[#2a2a2a] bg-transparent shrink-0" />
                  <input value={ea.nombre ?? ""}
                    onChange={e => setAreaField(a.id, "nombre", e.target.value)}
                    className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm font-semibold focus:outline-none focus:border-[#B3985B]" />
                  <button
                    onClick={() => setAreaField(a.id, "transversal", !ea.transversal)}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors shrink-0 ${
                      ea.transversal
                        ? "bg-purple-900/30 border-purple-500/30 text-purple-300"
                        : "bg-[#0d0d0d] border-[#2a2a2a] text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {ea.transversal ? "Transversal" : "Operativa"}
                  </button>
                </div>
                <textarea value={ea.objetivo ?? ""}
                  onChange={e => setAreaField(a.id, "objetivo", e.target.value)}
                  placeholder="Objetivo del área…" rows={2}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#B3985B] rounded-lg px-3 py-1.5 text-gray-300 text-xs focus:outline-none resize-y transition-colors" />
                <div className="flex items-center gap-2">
                  <button onClick={() => saveArea(a.id)} disabled={busy === a.id}
                    className="flex items-center gap-1 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                    <Check className="w-3 h-3" /> Guardar
                  </button>
                  <button onClick={() => cancelEditArea(a.id)}
                    className="text-gray-500 hover:text-white text-xs px-2 transition-colors">Cancelar</button>
                  <button onClick={() => delArea(a)} disabled={busy === a.id}
                    className="ml-auto text-gray-700 hover:text-red-400 transition-colors" title="Eliminar área">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* ── Área compacta (lectura) ── */
              <div className="flex items-center gap-2 px-3 py-2 group">
                <button onClick={() => setExpanded(e => ({ ...e, [a.id]: !isOpen }))}
                  className="text-gray-600 hover:text-white transition-colors shrink-0">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold truncate">{a.nombre}</span>
                    {a.codigo && (
                      <span className="text-[9px] font-mono text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 px-1 py-0.5 rounded shrink-0">{a.codigo}</span>
                    )}
                    {a.transversal && (
                      <span className="text-[9px] text-purple-300 bg-purple-900/30 border border-purple-500/30 px-1 py-0.5 rounded shrink-0">transversal</span>
                    )}
                  </div>
                  {a.objetivo && <p className="text-[11px] text-gray-600 truncate">{a.objetivo}</p>}
                </div>
                <span className="text-[11px] text-gray-600 shrink-0" title="tareas · subáreas">
                  {areaTareas(a)}t · <Layers className="w-3 h-3 inline -mt-0.5" />{a.subareas.length}
                </span>
                <button onClick={() => startEditArea(a)}
                  className="text-gray-700 hover:text-[#B3985B] transition-colors shrink-0 opacity-0 group-hover:opacity-100" title="Editar área">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Subáreas */}
            {isOpen && (
              <div className="border-t border-[#1a1a1a] bg-[#0b0b0b] px-2 py-2 space-y-0.5">
                {a.subareas.length === 0 && (
                  <p className="text-gray-700 text-xs italic px-2 py-1">Sin subáreas aún.</p>
                )}
                {a.subareas.map(s => {
                  const es = editSub[s.id];
                  const c = s._count;
                  if (es) {
                    return (
                      <div key={s.id} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-2 space-y-2">
                        <input value={es.nombre ?? ""}
                          onChange={e => setSubField(s.id, "nombre", e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                        <textarea value={es.descripcion ?? ""}
                          onChange={e => setSubField(s.id, "descripcion", e.target.value)}
                          placeholder="Objetivo de la subárea…" rows={2}
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-[#B3985B] resize-y" />
                        <div className="flex items-center gap-2">
                          <button onClick={() => saveSub(s.id)} disabled={busy === s.id}
                            className="flex items-center gap-1 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold px-2.5 py-1 rounded transition-colors">
                            <Check className="w-3 h-3" /> Guardar
                          </button>
                          <button onClick={() => cancelEditSub(s.id)}
                            className="text-gray-500 hover:text-white text-xs px-2 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#111] group/sub">
                      <span className="text-white text-sm truncate shrink-0 max-w-[46%]" title={s.descripcion ?? undefined}>{s.nombre}</span>
                      {s.descripcion && (
                        <span className="text-[11px] text-gray-600 truncate flex-1 hidden md:block">{s.descripcion}</span>
                      )}
                      <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${
                        linked(s)
                          ? "text-green-400 bg-green-900/20 border-green-800/40"
                          : "text-gray-600 bg-[#0d0d0d] border-[#1a1a1a]"
                      }`} title={linked(s) ? "Ligada a una sección del plan" : "Sin sección del plan"}>
                        {linked(s) ? "canónica" : "huérfana"}
                      </span>
                      <span className="text-[10px] text-gray-600 shrink-0 tabular-nums" title="tareas · secciones · puestos">
                        {c?.tareas ?? 0}t · {c?.secciones ?? 0}s · {c?.puestos ?? 0}p
                      </span>
                      <button onClick={() => startEditSub(s)}
                        className="text-gray-700 hover:text-[#B3985B] transition-colors shrink-0 opacity-0 group-hover/sub:opacity-100" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => delSub(s)} disabled={busy === s.id}
                        className="text-gray-700 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover/sub:opacity-100" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {/* Añadir subárea */}
                <div className="flex items-center gap-2 px-2 pt-1.5">
                  <input
                    value={newSub[a.id] ?? ""}
                    onChange={e => setNewSub(s => ({ ...s, [a.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") addSub(a.id); }}
                    placeholder="Nueva subárea…"
                    className="flex-1 bg-[#0d0d0d] border border-[#1a1a1a] focus:border-[#B3985B] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none transition-colors"
                  />
                  <button onClick={() => addSub(a.id)} disabled={busy === `add-${a.id}` || !(newSub[a.id] ?? "").trim()}
                    className="flex items-center gap-1 text-gray-500 hover:text-[#B3985B] disabled:opacity-30 text-sm px-2 py-1.5 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Añadir
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
