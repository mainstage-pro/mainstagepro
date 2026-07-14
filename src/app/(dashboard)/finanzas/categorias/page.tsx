"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonCards } from "@/components/Skeleton";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";

interface Categoria {
  id: string;
  nombre: string;
  tipo: string;
  orden: number;
  descripcion?: string | null;
}

const TIPOS = ["INGRESO", "GASTO", "TRANSFERENCIA", "INVERSION", "RETIRO"];

const TIPO_COLORS: Record<string, string> = {
  INGRESO:      "bg-green-900/50 text-green-300",
  GASTO:        "bg-red-900/50 text-red-300",
  TRANSFERENCIA:"bg-blue-900/50 text-blue-300",
  INVERSION:    "bg-purple-900/50 text-purple-300",
  RETIRO:       "bg-orange-900/50 text-orange-300",
};

export default function CategoriasPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: "", tipo: "GASTO", orden: 0, descripcion: "" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const r = await fetch("/api/categorias-financieras", { cache: "no-store" });
    const d = await r.json();
    setCategorias(d.categorias);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(c: Categoria) {
    setForm({ nombre: c.nombre, tipo: c.tipo, orden: c.orden, descripcion: c.descripcion ?? "" });
    setEditId(c.id);
    setShowForm(true);
  }

  function cancelForm() {
    setForm({ nombre: "", tipo: "GASTO", orden: 0, descripcion: "" });
    setEditId(null);
    setShowForm(false);
  }

  async function save() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    if (editId) {
      const res = await fetch(`/api/categorias-financieras/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al guardar");
        setSaving(false);
        return;
      }
    } else {
      const res = await fetch("/api/categorias-financieras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al guardar");
        setSaving(false);
        return;
      }
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

  const porTipo = TIPOS.map(tipo => ({
    tipo,
    items: categorias.filter(c => c.tipo === tipo),
  })).filter(g => g.items.length > 0 || !editId);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Categorías Financieras</h1>
          <p className="ms-subtitle">{categorias.length} categoría{categorias.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowForm(true)}
            className="ms-btn-primary">
            + Nueva categoría
          </button>
      </div>

      <Modal
        open={showForm}
        onClose={cancelForm}
        title={editId ? "Editar categoría" : "Nueva categoría"}
      >
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
              options={TIPOS.map(t => ({ value: t, label: t }))}
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

      {/* Lista agrupada por tipo */}
      {loading ? (
        <SkeletonCards count={6} />
      ) : categorias.length === 0 ? (
        <div className="ms-card py-12 text-center text-gray-600 text-sm">
          Sin categorías registradas
        </div>
      ) : (
        <div className="space-y-4">
          {porTipo.map(({ tipo, items }) => (
            items.length > 0 && (
              <div key={tipo} className="ms-table-wrapper">
                <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${TIPO_COLORS[tipo] ?? "bg-gray-800 text-gray-400"}`}>
                    {tipo}
                  </span>
                  <span className="text-gray-600 text-xs">{items.length} categoría{items.length !== 1 ? "s" : ""}</span>
                </div>
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
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
