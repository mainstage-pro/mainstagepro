"use client";

import { useEffect, useState, useMemo } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface EquipoRef {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  precioRenta: number;
  cantidadTotal: number;
}

interface GrupoItem {
  id: string;
  descripcion: string;
  cantidad: number;
  esOpcional: boolean;
  notas: string | null;
  orden: number;
  equipo: EquipoRef | null;
}

interface Grupo {
  id: string;
  nombre: string;
  tipoServicio: string;
  tipoEvento: string;
  capacidadMin: number;
  capacidadMax: number;
  descripcion: string | null;
  activo: boolean;
  items: GrupoItem[];
}

interface EquipoOpt {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  categoria: { nombre: string };
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const TIPO_EVENTO_OPTS = [
  { value: "TODOS", label: "Todos los eventos" },
  { value: "MUSICAL", label: "Musical" },
  { value: "SOCIAL", label: "Social" },
  { value: "EMPRESARIAL", label: "Empresarial" },
  { value: "OTRO", label: "Otro" },
];

const TIPO_SERVICIO_OPTS = [
  { value: "TODOS", label: "Todos los servicios" },
  { value: "PRODUCCION_TECNICA", label: "Producción técnica" },
  { value: "RENTA", label: "Renta" },
];

const EVENTO_BADGE: Record<string, string> = {
  TODOS: "bg-[#1a1a1a] text-[#6b7280]",
  MUSICAL: "bg-purple-900/20 text-purple-400",
  SOCIAL: "bg-blue-900/20 text-blue-400",
  EMPRESARIAL: "bg-amber-900/20 text-amber-400",
  OTRO: "bg-[#1a1a1a] text-[#6b7280]",
};

const EVENTO_LABEL: Record<string, string> = {
  TODOS: "Todos",
  MUSICAL: "Musical",
  SOCIAL: "Social",
  EMPRESARIAL: "Empresarial",
  OTRO: "Otro",
};

const FORM_BLANK = {
  nombre: "",
  tipoServicio: "TODOS",
  tipoEvento: "TODOS",
  capacidadMin: "0",
  capacidadMax: "9999",
  descripcion: "",
};

const ITEM_BLANK = {
  equipoId: "",
  descripcion: "",
  cantidad: "1",
  esOpcional: false,
  notas: "",
  orden: "0",
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GruposEquipoPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [equipos, setEquipos] = useState<EquipoOpt[]>([]);
  const [loading, setLoading] = useState(true);

  // Panel de creación/edición de grupo
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_BLANK);
  const [saving, setSaving] = useState(false);

  // Panel de items (se abre inline bajo el grupo)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(ITEM_BLANK);
  const [addingItem, setAddingItem] = useState(false);
  const [equipoBusqueda, setEquipoBusqueda] = useState("");

  // Filtro de la lista
  const [filtroEvento, setFiltroEvento] = useState("");
  const [busqueda, setBusqueda] = useState("");

  async function load() {
    const [g, e] = await Promise.all([
      fetch("/api/admin/plantillas-equipo").then(r => r.json()),
      fetch("/api/equipos?todos=true").then(r => r.json()),
    ]);
    setGrupos(g.plantillas ?? []);
    setEquipos(e.equipos ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Equipos filtrados para el combobox del item ───────────────────────────
  const equiposFiltrados = useMemo(() => {
    const q = equipoBusqueda.toLowerCase();
    if (!q) return equipos.slice(0, 30);
    return equipos.filter(e =>
      e.descripcion.toLowerCase().includes(q) ||
      (e.marca ?? "").toLowerCase().includes(q) ||
      (e.modelo ?? "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [equipos, equipoBusqueda]);

  // ── Grupos filtrados ──────────────────────────────────────────────────────
  const gruposFiltrados = useMemo(() => {
    let list = grupos;
    if (filtroEvento) list = list.filter(g => g.tipoEvento === filtroEvento);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(g => g.nombre.toLowerCase().includes(q) || (g.descripcion ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [grupos, filtroEvento, busqueda]);

  // ── Crear / Editar grupo ──────────────────────────────────────────────────
  function startCreate() {
    setForm(FORM_BLANK);
    setEditId(null);
    setShowForm(true);
  }

  function startEdit(g: Grupo) {
    setForm({
      nombre: g.nombre,
      tipoServicio: g.tipoServicio,
      tipoEvento: g.tipoEvento,
      capacidadMin: String(g.capacidadMin),
      capacidadMax: String(g.capacidadMax),
      descripcion: g.descripcion ?? "",
    });
    setEditId(g.id);
    setShowForm(true);
  }

  async function saveGrupo() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const body = {
      nombre: form.nombre.trim(),
      tipoServicio: form.tipoServicio,
      tipoEvento: form.tipoEvento,
      capacidadMin: parseInt(form.capacidadMin) || 0,
      capacidadMax: parseInt(form.capacidadMax) || 9999,
      descripcion: form.descripcion.trim() || null,
    };
    let res: Response;
    if (editId) {
      res = await fetch(`/api/admin/plantillas-equipo/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch("/api/admin/plantillas-equipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    await load();
    setShowForm(false);
    setEditId(null);
    setSaving(false);
  }

  async function deleteGrupo(g: Grupo) {
    if (!await confirm({ message: `¿Eliminar el grupo "${g.nombre}"? Se borrarán todos sus items.`, danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/admin/plantillas-equipo/${g.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    await load();
    if (expandedId === g.id) setExpandedId(null);
  }

  async function toggleActivo(g: Grupo) {
    const res = await fetch(`/api/admin/plantillas-equipo/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !g.activo }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    await load();
  }

  // ── Items ─────────────────────────────────────────────────────────────────
  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
    setItemForm(ITEM_BLANK);
    setEquipoBusqueda("");
  }

  async function addItem(grupoId: string) {
    if (!itemForm.descripcion.trim() && !itemForm.equipoId) return;
    setAddingItem(true);
    const selectedEq = itemForm.equipoId ? equipos.find(e => e.id === itemForm.equipoId) : null;
    const res = await fetch(`/api/admin/plantillas-equipo/${grupoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addItem",
        equipoId: itemForm.equipoId || null,
        descripcion: itemForm.descripcion.trim() || selectedEq?.descripcion || "",
        cantidad: parseInt(itemForm.cantidad) || 1,
        esOpcional: itemForm.esOpcional,
        notas: itemForm.notas.trim() || null,
        orden: parseInt(itemForm.orden) || 0,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setAddingItem(false);
      return;
    }
    await load();
    setItemForm(ITEM_BLANK);
    setEquipoBusqueda("");
    setAddingItem(false);
  }

  async function removeItem(grupoId: string, itemId: string) {
    if (!await confirm({ message: "¿Quitar este equipo del grupo?", danger: true, confirmText: "Quitar" })) return;
    const res = await fetch(`/api/admin/plantillas-equipo/${grupoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "removeItem", itemId }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    await load();
  }

  // ── Cuando se selecciona un equipo del combobox, prefill descripción ──────
  function selectEquipo(eqId: string) {
    const eq = equipos.find(e => e.id === eqId);
    setItemForm(prev => ({
      ...prev,
      equipoId: eqId,
      descripcion: eq ? [eq.descripcion, eq.marca, eq.modelo].filter(Boolean).join(" ") : prev.descripcion,
    }));
    setEquipoBusqueda(eq ? eq.descripcion : "");
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Grupos de equipo</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Configura paquetes de equipos que aparecen como sugerencias en cotizaciones</p>
        </div>
        <button onClick={startCreate} className="px-4 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c4a86a] transition-colors shrink-0">
          + Nuevo grupo
        </button>
      </div>

      {/* Modal crear / editar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-white font-semibold">{editId ? "Editar grupo" : "Nuevo grupo de equipo"}</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#6b7280] block mb-1">Nombre del grupo *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. Sistema RCF HDL 30A — Grande"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Tipo de evento</label>
                  <select value={form.tipoEvento} onChange={e => setForm(p => ({ ...p, tipoEvento: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    {TIPO_EVENTO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Tipo de servicio</label>
                  <select value={form.tipoServicio} onChange={e => setForm(p => ({ ...p, tipoServicio: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    {TIPO_SERVICIO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Asistentes mín.</label>
                  <input type="number" min="0" value={form.capacidadMin} onChange={e => setForm(p => ({ ...p, capacidadMin: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Asistentes máx.</label>
                  <input type="number" min="0" value={form.capacidadMax} onChange={e => setForm(p => ({ ...p, capacidadMax: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#6b7280] block mb-1">Descripción / notas internas</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  rows={2} placeholder="Opcional — aparece como nota en las sugerencias"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="flex-1 py-2 rounded-lg border border-[#333] text-[#6b7280] text-sm hover:border-[#444] transition-colors">
                Cancelar
              </button>
              <button onClick={saveGrupo} disabled={saving || !form.nombre.trim()}
                className="flex-1 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold disabled:opacity-40 hover:bg-[#c4a86a] transition-colors">
                {saving ? "Guardando…" : editId ? "Guardar cambios" : "Crear grupo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar grupo…"
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/40 w-44" />
        <select value={filtroEvento} onChange={e => setFiltroEvento(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none focus:border-[#B3985B]/40">
          <option value="">Evento: todos</option>
          {TIPO_EVENTO_OPTS.filter(o => o.value !== "TODOS").map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-[#444]">{gruposFiltrados.length} grupos</span>
      </div>

      {/* Lista de grupos */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#111] rounded-xl animate-pulse" />)}
        </div>
      ) : gruposFiltrados.length === 0 ? (
        <div className="text-center py-16 text-[#333]">
          <p className="text-sm">{busqueda || filtroEvento ? "Sin grupos con los filtros actuales." : "Sin grupos creados. Crea el primero con + Nuevo grupo."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {gruposFiltrados.map(g => {
            const expanded = expandedId === g.id;
            return (
              <div key={g.id} className={`bg-[#111] border rounded-xl overflow-hidden transition-colors ${g.activo ? "border-[#1e1e1e]" : "border-[#1a1a1a] opacity-60"}`}>

                {/* Cabecera del grupo */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium text-sm">{g.nombre}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${EVENTO_BADGE[g.tipoEvento] ?? "bg-[#1a1a1a] text-[#6b7280]"}`}>
                        {EVENTO_LABEL[g.tipoEvento] ?? g.tipoEvento}
                      </span>
                      {!g.activo && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-900/20 text-red-400">Inactivo</span>
                      )}
                    </div>
                    <p className="text-[#555] text-xs mt-0.5">
                      {g.capacidadMin}–{g.capacidadMax === 9999 ? "∞" : g.capacidadMax} asistentes
                      {g.descripcion && <span className="ml-2">· {g.descripcion}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleExpand(g.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] text-[#6b7280] hover:text-white transition-colors">
                      {g.items.length} equipo{g.items.length !== 1 ? "s" : ""} {expanded ? "▲" : "▼"}
                    </button>
                    <button onClick={() => startEdit(g)} className="text-xs text-[#555] hover:text-[#B3985B] transition-colors px-1">Editar</button>
                    <button onClick={() => toggleActivo(g)} className={`text-xs px-1 transition-colors ${g.activo ? "text-[#555] hover:text-red-400" : "text-[#555] hover:text-green-400"}`}>
                      {g.activo ? "Desactivar" : "Activar"}
                    </button>
                    <button onClick={() => deleteGrupo(g)} className="text-xs text-[#555] hover:text-red-400 transition-colors px-1">✕</button>
                  </div>
                </div>

                {/* Items del grupo (expandible) */}
                {expanded && (
                  <div className="border-t border-[#1a1a1a] px-4 py-3 space-y-3">

                    {/* Lista de items */}
                    {g.items.length === 0 ? (
                      <p className="text-[#444] text-xs py-2">Sin equipos — agrega el primero abajo.</p>
                    ) : (
                      <div className="space-y-1">
                        {g.items.map(item => (
                          <div key={item.id} className="flex items-center gap-2 py-1.5 group/item">
                            <span className="text-[#B3985B] text-xs font-mono w-6 text-right shrink-0">{item.cantidad}×</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-white text-xs">{item.descripcion}</span>
                              {item.equipo && (
                                <span className="ml-1.5 text-[#444] text-[10px]">→ vinculado al inventario</span>
                              )}
                              {item.esOpcional && <span className="ml-1.5 text-[10px] text-[#555]">opcional</span>}
                              {item.notas && <span className="ml-1.5 text-[10px] text-[#555]">— {item.notas}</span>}
                            </div>
                            <button onClick={() => removeItem(g.id, item.id)}
                              className="opacity-0 group-hover/item:opacity-100 text-[#555] hover:text-red-400 transition-all text-xs px-1">
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Form agregar item */}
                    <div className="border-t border-[#1a1a1a] pt-3">
                      <p className="text-[10px] text-[#555] mb-2 uppercase tracking-wider">Agregar equipo</p>
                      <div className="space-y-2">

                        {/* Buscar en inventario */}
                        <div className="relative">
                          <input
                            value={equipoBusqueda}
                            onChange={e => { setEquipoBusqueda(e.target.value); if (!e.target.value) setItemForm(p => ({ ...p, equipoId: "" })); }}
                            placeholder="Buscar en inventario (opcional)…"
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                          />
                          {equipoBusqueda && equiposFiltrados.length > 0 && !itemForm.equipoId && (
                            <div className="absolute top-full left-0 right-0 z-20 bg-[#111] border border-[#333] rounded-lg mt-0.5 max-h-40 overflow-y-auto">
                              {equiposFiltrados.map(e => (
                                <button key={e.id} onClick={() => selectEquipo(e.id)}
                                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0">
                                  <span className="font-medium">{e.descripcion}</span>
                                  {e.marca && <span className="text-[#555] ml-1">{e.marca}</span>}
                                  <span className="text-[#444] ml-1">· {e.categoria.nombre}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input value={itemForm.descripcion} onChange={e => setItemForm(p => ({ ...p, descripcion: e.target.value }))}
                              placeholder="Descripción *"
                              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                          </div>
                          <div>
                            <input type="number" min="1" value={itemForm.cantidad} onChange={e => setItemForm(p => ({ ...p, cantidad: e.target.value }))}
                              placeholder="Cant."
                              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <input value={itemForm.notas} onChange={e => setItemForm(p => ({ ...p, notas: e.target.value }))}
                            placeholder="Notas / aclaraciones (opcional)"
                            className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                          <label className="flex items-center gap-1.5 text-[10px] text-[#6b7280] cursor-pointer shrink-0">
                            <input type="checkbox" checked={itemForm.esOpcional} onChange={e => setItemForm(p => ({ ...p, esOpcional: e.target.checked }))}
                              className="accent-[#B3985B]" />
                            Opcional
                          </label>
                          <button onClick={() => addItem(g.id)} disabled={addingItem || (!itemForm.descripcion.trim() && !itemForm.equipoId)}
                            className="px-3 py-1.5 rounded-lg bg-[#B3985B] text-black text-xs font-semibold disabled:opacity-40 hover:bg-[#c4a86a] transition-colors shrink-0">
                            {addingItem ? "…" : "+ Agregar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
