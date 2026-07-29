"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { Plus, Trash2, Save, Layers, ChevronDown, ChevronRight, Wand2, GitMerge } from "lucide-react";

interface SubAreaCount { templates: number; secciones: number; puestos: number; }
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
  // Drafts de edición de área
  const [draft, setDraft] = useState<Record<string, Partial<Area>>>({});
  // Nueva subárea por área
  const [newSub, setNewSub] = useState<Record<string, { nombre: string; descripcion: string }>>({});
  // Drafts de subárea
  const [subDraft, setSubDraft] = useState<Record<string, Partial<SubArea>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  // Nueva área
  const [newArea, setNewArea] = useState<{ nombre: string; color: string; objetivo: string } | null>(null);
  // Modo fusión: destino elegido por subárea de origen
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});

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

  const areaVal = (a: Area, k: keyof Area) => (draft[a.id]?.[k] ?? a[k]) as never;
  const setAreaDraft = (id: string, k: keyof Area, v: unknown) =>
    setDraft(d => ({ ...d, [id]: { ...d[id], [k]: v } }));
  const areaDirty = (a: Area) => {
    const dd = draft[a.id]; if (!dd) return false;
    return (["nombre", "color", "objetivo", "transversal"] as (keyof Area)[]).some(k => k in dd && dd[k] !== a[k]);
  };

  async function saveArea(a: Area) {
    const dd = draft[a.id]; if (!dd) return;
    setBusy(a.id);
    try {
      const r = await fetch(`/api/admin/organizacion/areas/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: dd.nombre, color: dd.color, objetivo: dd.objetivo, transversal: dd.transversal,
        }),
      });
      if (!r.ok) throw new Error();
      toast.success("Área actualizada");
      setDraft(d => { const n = { ...d }; delete n[a.id]; return n; });
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

  async function addSub(areaId: string) {
    const ns = newSub[areaId];
    if (!ns?.nombre.trim()) return;
    setBusy(`add-${areaId}`);
    try {
      const r = await fetch("/api/admin/organizacion/subareas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId, nombre: ns.nombre, descripcion: ns.descripcion }),
      });
      if (!r.ok) throw new Error();
      setNewSub(s => ({ ...s, [areaId]: { nombre: "", descripcion: "" } }));
      await load();
    } catch { toast.error("Error al crear la subárea"); }
    finally { setBusy(null); }
  }

  const subVal = (s: SubArea, k: keyof SubArea) => (subDraft[s.id]?.[k] ?? s[k]) as never;
  const setSubD = (id: string, k: keyof SubArea, v: unknown) =>
    setSubDraft(d => ({ ...d, [id]: { ...d[id], [k]: v } }));
  const subDirty = (s: SubArea) => {
    const dd = subDraft[s.id]; if (!dd) return false;
    return (["nombre", "descripcion"] as (keyof SubArea)[]).some(k => k in dd && dd[k] !== s[k]);
  };

  async function saveSub(s: SubArea) {
    const dd = subDraft[s.id]; if (!dd) return;
    setBusy(s.id);
    try {
      const r = await fetch(`/api/admin/organizacion/subareas/${s.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: dd.nombre, descripcion: dd.descripcion }),
      });
      if (!r.ok) throw new Error();
      setSubDraft(d => { const n = { ...d }; delete n[s.id]; return n; });
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

  // ── Fusión de subáreas ─────────────────────────────────────────────────────
  // Tokens significativos de un nombre (sin acentos, sin palabras vacías ni "subárea N").
  function tokens(nombre: string): Set<string> {
    const stop = new Set(["de", "del", "la", "el", "los", "las", "y", "e", "a", "en", "subarea", "fijo", "semanal", "quincenal", "mensual"]);
    return new Set(
      nombre.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !stop.has(w) && !/^\d+$/.test(w))
    );
  }
  function similitud(a: string, b: string): number {
    const ta = tokens(a), tb = tokens(b);
    if (ta.size === 0 || tb.size === 0) return 0;
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    return inter / new Set([...ta, ...tb]).size;
  }
  const linked = (s: SubArea) => (s._count?.secciones ?? 0) > 0;
  // Sugerencia de destino: el hermano más parecido; se prefiere uno "canónico"
  // (ligado a una sección del plan). Solo se sugiere para subáreas sin sección.
  function sugerirDestino(area: Area, s: SubArea): string {
    if (linked(s)) return "";
    let best = "", bestScore = 0.15; // umbral mínimo de parecido
    for (const o of area.subareas) {
      if (o.id === s.id) continue;
      let score = similitud(s.nombre, o.nombre);
      if (linked(o)) score += 0.25; // desempate a favor del canónico
      if (score > bestScore) { bestScore = score; best = o.id; }
    }
    return best;
  }

  async function aplicarFusion(area: Area, from: SubArea) {
    const toId = mergeTarget[from.id];
    if (!toId) return;
    const to = area.subareas.find(x => x.id === toId);
    const n = from._count?.templates ?? 0;
    if (!confirm(`Fusionar "${from.nombre}" dentro de "${to?.nombre}".\n\nSe moverán ${n} tarea(s), sus secciones y puestos al destino, y se eliminará "${from.nombre}". ¿Continuar?`)) return;
    setBusy(`merge-${from.id}`);
    try {
      const r = await fetch("/api/admin/organizacion/subareas/merge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: from.id, toId }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "No se pudo fusionar"); return; }
      toast.success(`Fusionada · ${d.templates} tareas · ${d.secciones} secciones · ${d.puestos} puestos movidos`);
      setMergeTarget(m => { const nn = { ...m }; delete nn[from.id]; return nn; });
      await load();
    } catch { toast.error("Error de conexión"); }
    finally { setBusy(null); }
  }

  if (loading) return <p className="text-gray-600 text-sm">Cargando áreas…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500 max-w-2xl">
          Fuente única de las áreas y subáreas de la empresa. Estos nombres, objetivos y colores
          se usan en todo el sistema (organigrama, puestos, plan de trabajo). El <span className="text-[#B3985B]">código</span> es
          estable e interno; el nombre es la etiqueta visible.
        </p>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => {
              const next = !mergeMode;
              setMergeMode(next);
              if (next) {
                // Precargar sugerencias de destino y abrir todas las áreas.
                const sug: Record<string, string> = {};
                for (const a of areas) for (const s of a.subareas) {
                  const d = sugerirDestino(a, s);
                  if (d) sug[s.id] = d;
                }
                setMergeTarget(sug);
                setExpanded(Object.fromEntries(areas.map(a => [a.id, true])));
              } else {
                setMergeTarget({});
              }
            }}
            title="Fusionar subáreas duplicadas: mueve tareas, secciones y puestos al destino y elimina el origen"
            className={`flex items-center gap-1.5 border text-sm px-3 py-1.5 rounded-lg transition-colors ${
              mergeMode
                ? "bg-[#B3985B] border-[#B3985B] text-black font-semibold"
                : "bg-[#1a1a1a] hover:bg-[#222] border-[#2a2a2a] text-gray-300"
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" /> {mergeMode ? "Salir de fusión" : "Fusionar duplicados"}
          </button>
          <button
            onClick={derivarSecciones}
            disabled={busy === "derivar"}
            title="Deriva las subáreas desde las secciones del plan de trabajo operativo (crea o vincula; no borra)"
            className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] disabled:opacity-40 text-gray-300 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" /> {busy === "derivar" ? "Derivando…" : "Derivar desde plan"}
          </button>
          <button
            onClick={() => setNewArea({ nombre: "", color: "#1a1a2e", objetivo: "" })}
            className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-gray-300 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva área
          </button>
        </div>
      </div>

      {mergeMode && (
        <div className="ms-card p-3 border-[#B3985B]/40 text-xs text-gray-400">
          <span className="text-[#B3985B] font-semibold">Modo fusión.</span> Cada subárea muestra su destino sugerido (★ = canónica, ligada al plan).
          Al aplicar, sus tareas, secciones y puestos se mueven al destino y la subárea de origen se elimina. Revisa cada caso antes de aplicar.
        </div>
      )}

      {/* Formulario de nueva área */}
      {newArea && (
        <div className="ms-card p-4 space-y-3 border-[#B3985B]/40">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nueva área</p>
          <div className="flex gap-2 flex-wrap items-center">
            <input
              autoFocus value={newArea.nombre}
              onChange={e => setNewArea(a => a && { ...a, nombre: e.target.value })}
              placeholder="Nombre del área"
              className="flex-1 min-w-[180px] bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
            <input type="color" value={newArea.color}
              onChange={e => setNewArea(a => a && { ...a, color: e.target.value })}
              className="h-8 w-12 rounded cursor-pointer border border-[#2a2a2a] bg-transparent" />
          </div>
          <textarea value={newArea.objetivo}
            onChange={e => setNewArea(a => a && { ...a, objetivo: e.target.value })}
            placeholder="Objetivo / propósito del área (opcional)" rows={2}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-y" />
          <div className="flex gap-2">
            <button onClick={createArea} disabled={busy === "new-area" || !newArea.nombre.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors">
              {busy === "new-area" ? "Creando…" : "Crear área"}
            </button>
            <button onClick={() => setNewArea(null)}
              className="text-gray-500 hover:text-white text-sm px-3 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de áreas */}
      {areas.map(a => {
        const isOpen = expanded[a.id] ?? false;
        return (
          <div key={a.id} className="ms-card p-0 overflow-hidden">
            {/* Cabecera del área */}
            <div className="p-4 space-y-3" style={{ borderLeft: `3px solid ${areaVal(a, "color")}` }}>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setExpanded(e => ({ ...e, [a.id]: !isOpen }))}
                  className="text-gray-500 hover:text-white transition-colors">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <input type="color" value={areaVal(a, "color")}
                  onChange={e => setAreaDraft(a.id, "color", e.target.value)}
                  className="h-7 w-9 rounded cursor-pointer border border-[#2a2a2a] bg-transparent shrink-0" />
                <input value={areaVal(a, "nombre")}
                  onChange={e => setAreaDraft(a.id, "nombre", e.target.value)}
                  className="flex-1 min-w-[160px] bg-transparent border-0 border-b border-transparent hover:border-[#2a2a2a] focus:border-[#B3985B] text-white text-base font-semibold px-1 py-0.5 focus:outline-none transition-colors" />
                {a.codigo && (
                  <span className="text-[10px] font-mono text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 px-1.5 py-0.5 rounded">
                    {a.codigo}
                  </span>
                )}
                <button
                  onClick={() => setAreaDraft(a.id, "transversal", !areaVal(a, "transversal"))}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    areaVal(a, "transversal")
                      ? "bg-purple-900/30 border-purple-500/30 text-purple-300"
                      : "bg-[#0d0d0d] border-[#2a2a2a] text-gray-600 hover:text-gray-400"
                  }`}
                  title="Área transversal: aplica a todo el equipo, no es un área operativa canónica"
                >
                  {areaVal(a, "transversal") ? "Transversal" : "Operativa"}
                </button>
                <span className="text-xs text-gray-600">
                  <Layers className="w-3 h-3 inline mr-1" />{a.subareas.length}
                </span>
                {areaDirty(a) && (
                  <button onClick={() => saveArea(a)} disabled={busy === a.id}
                    className="flex items-center gap-1 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold px-2.5 py-1 rounded transition-colors">
                    <Save className="w-3 h-3" /> Guardar
                  </button>
                )}
                <button onClick={() => delArea(a)} disabled={busy === a.id}
                  className="text-gray-700 hover:text-red-400 transition-colors" title="Eliminar área">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea value={areaVal(a, "objetivo") ?? ""}
                onChange={e => setAreaDraft(a.id, "objetivo", e.target.value)}
                placeholder="Objetivo / propósito del área…" rows={2}
                className="w-full bg-[#0d0d0d] border border-[#1a1a1a] focus:border-[#B3985B] rounded-lg px-3 py-1.5 text-gray-300 text-xs focus:outline-none resize-y transition-colors" />
            </div>

            {/* Subáreas */}
            {isOpen && (
              <div className="border-t border-[#1a1a1a] bg-[#0b0b0b] p-4 space-y-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-1">Subáreas</p>
                {a.subareas.length === 0 && (
                  <p className="text-gray-700 text-xs italic">Sin subáreas aún.</p>
                )}
                {a.subareas.map(s => {
                  const c = s._count;
                  const badges = c && (
                    <span className="flex items-center gap-1 shrink-0 text-[10px]">
                      {linked(s)
                        ? <span className="text-green-400 bg-green-900/20 border border-green-800/40 px-1.5 py-0.5 rounded" title="Ligada a una sección del plan operativo">canónica</span>
                        : <span className="text-gray-600 bg-[#0d0d0d] border border-[#1a1a1a] px-1.5 py-0.5 rounded" title="Sin sección del plan">huérfana</span>}
                      <span className="text-gray-500" title="tareas · secciones · puestos">
                        {c.templates}t · {c.secciones}s · {c.puestos}p
                      </span>
                    </span>
                  );

                  if (mergeMode) {
                    const target = mergeTarget[s.id] ?? "";
                    return (
                      <div key={s.id} className="flex items-center gap-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-2 flex-wrap">
                        <span className="flex-1 min-w-[160px] text-white text-sm font-medium truncate" title={s.nombre}>{s.nombre}</span>
                        {badges}
                        <span className="text-gray-600 text-xs">→</span>
                        <select
                          value={target}
                          onChange={e => setMergeTarget(m => ({ ...m, [s.id]: e.target.value }))}
                          className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B] max-w-[220px]"
                        >
                          <option value="">Fusionar en…</option>
                          {a.subareas.filter(o => o.id !== s.id).map(o => (
                            <option key={o.id} value={o.id}>{linked(o) ? "★ " : ""}{o.nombre}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => aplicarFusion(a, s)}
                          disabled={!target || busy === `merge-${s.id}`}
                          className="flex items-center gap-1 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-30 text-black text-xs font-semibold px-2.5 py-1 rounded transition-colors shrink-0"
                        >
                          <GitMerge className="w-3 h-3" /> {busy === `merge-${s.id}` ? "Fusionando…" : "Aplicar"}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={s.id} className="flex items-start gap-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <input value={subVal(s, "nombre")}
                            onChange={e => setSubD(s.id, "nombre", e.target.value)}
                            className="flex-1 bg-transparent border-0 text-white text-sm font-medium px-1 focus:outline-none" />
                          {badges}
                        </div>
                        <textarea value={subVal(s, "descripcion") ?? ""}
                          onChange={e => setSubD(s.id, "descripcion", e.target.value)}
                          placeholder="Objetivo / propósito de la subárea…" rows={1}
                          className="w-full bg-transparent border-0 text-gray-400 text-xs px-1 focus:outline-none resize-y" />
                      </div>
                      {subDirty(s) && (
                        <button onClick={() => saveSub(s)} disabled={busy === s.id}
                          className="flex items-center gap-1 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold px-2 py-1 rounded transition-colors shrink-0">
                          <Save className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={() => delSub(s)} disabled={busy === s.id}
                        className="text-gray-700 hover:text-red-400 transition-colors shrink-0 pt-0.5" title="Eliminar subárea">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {/* Añadir subárea */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    value={newSub[a.id]?.nombre ?? ""}
                    onChange={e => setNewSub(s => ({ ...s, [a.id]: { nombre: e.target.value, descripcion: s[a.id]?.descripcion ?? "" } }))}
                    onKeyDown={e => { if (e.key === "Enter") addSub(a.id); }}
                    placeholder="Nueva subárea…"
                    className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                  <button onClick={() => addSub(a.id)} disabled={busy === `add-${a.id}` || !newSub[a.id]?.nombre?.trim()}
                    className="flex items-center gap-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] disabled:opacity-40 text-gray-300 text-sm px-3 py-1.5 rounded-lg transition-colors">
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
