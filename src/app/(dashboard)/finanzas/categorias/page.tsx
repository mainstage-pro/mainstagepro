"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonCards } from "@/components/Skeleton";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { badgeClass, COLOR_OPTIONS, NATURALEZA_OPTIONS } from "@/lib/tipo-colores";

interface Categoria {
  id: string;
  nombre: string;
  tipo: string;
  orden: number;
  descripcion?: string | null;
}

interface TipoMov {
  id: string;
  clave: string;
  nombre: string;
  naturaleza: string;
  afectaResultado: boolean;
  color: string;
  orden: number;
  sistema: boolean;
  activo: boolean;
}

export default function CategoriasPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tipos, setTipos] = useState<TipoMov[]>([]);
  const [loading, setLoading] = useState(true);

  // Form categoría
  const [form, setForm] = useState({ nombre: "", tipo: "GASTO", orden: 0, descripcion: "" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form tipo de movimiento
  const [showTipoForm, setShowTipoForm] = useState(false);
  const [tipoForm, setTipoForm] = useState({ id: "", nombre: "", naturaleza: "SALIDA", afectaResultado: true, color: "teal", orden: 0 });
  const [savingTipo, setSavingTipo] = useState(false);

  async function load() {
    const [rc, rt] = await Promise.all([
      fetch("/api/categorias-financieras", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/tipos-movimiento", { cache: "no-store" }).then(r => r.json()),
    ]);
    setCategorias(rc.categorias ?? []);
    setTipos(rt.tipos ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Categorías ────────────────────────────────────────────────────────────
  function startEdit(c: Categoria) {
    setForm({ nombre: c.nombre, tipo: c.tipo, orden: c.orden, descripcion: c.descripcion ?? "" });
    setEditId(c.id);
    setShowForm(true);
  }

  function cancelForm() {
    setForm({ nombre: "", tipo: tipos[0]?.clave ?? "GASTO", orden: 0, descripcion: "" });
    setEditId(null);
    setShowForm(false);
  }

  async function save() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const url = editId ? `/api/categorias-financieras/${editId}` : "/api/categorias-financieras";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    await load();
    cancelForm();
    setSaving(false);
  }

  async function deleteCategoria(id: string) {
    if (!await confirm({ message: "¿Eliminar esta categoría? Los movimientos vinculados perderán la categoría.", danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/categorias-financieras/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    toast.success("Categoría eliminada");
    await load();
  }

  // ── Tipos de movimiento ───────────────────────────────────────────────────
  function startNewTipo() {
    setTipoForm({ id: "", nombre: "", naturaleza: "SALIDA", afectaResultado: true, color: "teal", orden: tipos.length });
    setShowTipoForm(true);
  }

  function startEditTipo(t: TipoMov) {
    setTipoForm({ id: t.id, nombre: t.nombre, naturaleza: t.naturaleza, afectaResultado: t.afectaResultado, color: t.color, orden: t.orden });
    setShowTipoForm(true);
  }

  async function saveTipo() {
    if (!tipoForm.nombre.trim()) return;
    setSavingTipo(true);
    const editing = !!tipoForm.id;
    const url = editing ? `/api/tipos-movimiento/${tipoForm.id}` : "/api/tipos-movimiento";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: tipoForm.nombre,
        naturaleza: tipoForm.naturaleza,
        afectaResultado: tipoForm.naturaleza === "NEUTRO" ? false : tipoForm.afectaResultado,
        color: tipoForm.color,
        orden: tipoForm.orden,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar el tipo");
      setSavingTipo(false);
      return;
    }
    toast.success(editing ? "Tipo actualizado" : "Tipo de movimiento creado");
    await load();
    setShowTipoForm(false);
    setSavingTipo(false);
  }

  async function toggleTipoActivo(t: TipoMov) {
    const res = await fetch(`/api/tipos-movimiento/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !t.activo }),
    });
    if (!res.ok) { toast.error("No se pudo actualizar"); return; }
    await load();
  }

  async function deleteTipo(t: TipoMov) {
    if (!await confirm({ message: `¿Eliminar el tipo "${t.nombre}"?`, danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/tipos-movimiento/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo eliminar");
      return;
    }
    toast.success("Tipo eliminado");
    await load();
  }

  const porTipo = tipos.map(t => ({
    tipo: t,
    items: categorias.filter(c => c.tipo === t.clave),
  }));
  // Categorías cuyo tipo ya no existe (huérfanas)
  const huerfanas = categorias.filter(c => !tipos.some(t => t.clave === c.tipo));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Categorías Financieras</h1>
          <p className="ms-subtitle">{categorias.length} categoría{categorias.length !== 1 ? "s" : ""} · {tipos.length} tipos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={startNewTipo} className="ms-btn-secondary">
            + Nuevo tipo
          </button>
          <button onClick={() => { setForm(p => ({ ...p, tipo: tipos[0]?.clave ?? "GASTO" })); setShowForm(true); }}
            className="ms-btn-primary">
            + Nueva categoría
          </button>
        </div>
      </div>

      {/* Modal categoría */}
      <Modal open={showForm} onClose={cancelForm} title={editId ? "Editar categoría" : "Nueva categoría"}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Honorarios técnicos"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tipo *</label>
            <Combobox
              value={form.tipo}
              onChange={v => setForm(p => ({ ...p, tipo: v }))}
              options={tipos.map(t => ({ value: t.clave, label: t.nombre }))}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
          <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
            rows={3}
            placeholder="¿Qué incluye esta categoría? Ej: Pagos a técnicos externos por evento"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
        </div>
        <div className="w-32 mt-4">
          <label className="text-xs text-gray-500 mb-1 block">Orden</label>
          <input type="number" value={form.orden} onChange={e => setForm(p => ({ ...p, orden: parseInt(e.target.value) || 0 }))}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={save} disabled={saving || !form.nombre.trim()}
            className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
            {saving ? "Guardando..." : editId ? "Actualizar" : "Crear"}
          </button>
        </div>
      </Modal>

      {/* Modal tipo de movimiento */}
      <Modal open={showTipoForm} onClose={() => setShowTipoForm(false)} title={tipoForm.id ? "Editar tipo de movimiento" : "Nuevo tipo de movimiento"}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
            <input value={tipoForm.nombre} onChange={e => setTipoForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Préstamo, Anticipo de socio..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">¿Cómo afecta el dinero? *</label>
            <div className="space-y-2">
              {NATURALEZA_OPTIONS.map(o => (
                <label key={o.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  tipoForm.naturaleza === o.value ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#2a2a2a] hover:border-[#444]"
                }`}>
                  <input type="radio" name="naturaleza" checked={tipoForm.naturaleza === o.value}
                    onChange={() => setTipoForm(p => ({ ...p, naturaleza: o.value }))} className="mt-1 accent-[#B3985B]" />
                  <div>
                    <p className="text-white text-sm">{o.label}</p>
                    <p className="text-gray-500 text-xs">{o.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {tipoForm.naturaleza !== "NEUTRO" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={tipoForm.afectaResultado}
                onChange={e => setTipoForm(p => ({ ...p, afectaResultado: e.target.checked }))} className="accent-[#B3985B]" />
              <span className="text-sm text-gray-300">
                Contar en el estado de resultados (como {tipoForm.naturaleza === "ENTRADA" ? "ingreso" : "gasto"} operativo)
              </span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} type="button" onClick={() => setTipoForm(p => ({ ...p, color: c.value }))}
                    title={c.label}
                    className={`w-7 h-7 rounded-full border-2 ${badgeClass(c.value)} ${tipoForm.color === c.value ? "border-white" : "border-transparent"}`} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Orden</label>
              <input type="number" value={tipoForm.orden} onChange={e => setTipoForm(p => ({ ...p, orden: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={saveTipo} disabled={savingTipo || !tipoForm.nombre.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {savingTipo ? "Guardando..." : tipoForm.id ? "Actualizar" : "Crear tipo"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Lista agrupada por tipo */}
      {loading ? (
        <SkeletonCards count={6} />
      ) : (
        <div className="space-y-4">
          {porTipo.map(({ tipo, items }) => (
            <div key={tipo.clave} className="ms-table-wrapper">
              <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${badgeClass(tipo.color)}`}>
                  {tipo.nombre}
                </span>
                <span className="text-gray-600 text-xs">{items.length} categoría{items.length !== 1 ? "s" : ""}</span>
                {!tipo.activo && <span className="text-[10px] text-gray-600 uppercase">Inactivo</span>}
                <div className="ml-auto flex gap-3">
                  <button onClick={() => startEditTipo(tipo)} className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">Editar tipo</button>
                  {!tipo.sistema && (
                    <>
                      <button onClick={() => toggleTipoActivo(tipo)} className="text-xs text-gray-500 hover:text-white transition-colors">
                        {tipo.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => deleteTipo(tipo)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Eliminar</button>
                    </>
                  )}
                </div>
              </div>
              {items.length === 0 ? (
                <div className="px-5 py-4 text-gray-600 text-xs">Sin categorías en este tipo</div>
              ) : (
                <div className="divide-y divide-[#1a1a1a]">
                  {items.map(c => (
                    <div key={c.id} className="flex items-start justify-between px-5 py-3 hover:bg-[#1a1a1a] transition-colors">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-gray-600 text-xs w-6 text-right shrink-0 pt-0.5">{c.orden}</span>
                        <div className="min-w-0">
                          <p className="text-white text-sm">{c.nombre}</p>
                          {c.descripcion && <p className="text-gray-500 text-xs mt-0.5">{c.descripcion}</p>}
                        </div>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <button onClick={() => startEdit(c)} className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">Editar</button>
                        <button onClick={() => deleteCategoria(c.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {huerfanas.length > 0 && (
            <div className="ms-table-wrapper">
              <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-gray-800 text-gray-400">Sin tipo</span>
                <span className="text-gray-600 text-xs">{huerfanas.length} categoría{huerfanas.length !== 1 ? "s" : ""} con tipo eliminado</span>
              </div>
              <div className="divide-y divide-[#1a1a1a]">
                {huerfanas.map(c => (
                  <div key={c.id} className="flex items-start justify-between px-5 py-3 hover:bg-[#1a1a1a] transition-colors">
                    <div className="min-w-0">
                      <p className="text-white text-sm">{c.nombre} <span className="text-gray-600 text-xs">({c.tipo})</span></p>
                      {c.descripcion && <p className="text-gray-500 text-xs mt-0.5">{c.descripcion}</p>}
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => startEdit(c)} className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">Editar</button>
                      <button onClick={() => deleteCategoria(c.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
