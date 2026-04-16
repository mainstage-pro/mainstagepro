"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonCards } from "@/components/Skeleton";

interface Categoria {
  id: string;
  nombre: string;
  tipo: string;
  orden: number;
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
  const [form, setForm] = useState({ nombre: "", tipo: "GASTO", orden: 0 });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const r = await fetch("/api/categorias-financieras");
    const d = await r.json();
    setCategorias(d.categorias);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(c: Categoria) {
    setForm({ nombre: c.nombre, tipo: c.tipo, orden: c.orden });
    setEditId(c.id);
    setShowForm(true);
  }

  function cancelForm() {
    setForm({ nombre: "", tipo: "GASTO", orden: 0 });
    setEditId(null);
    setShowForm(false);
  }

  async function save() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    if (editId) {
      await fetch(`/api/categorias-financieras/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/categorias-financieras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await load();
    cancelForm();
    setSaving(false);
  }

  async function deleteCategoria(id: string) {
    if (!await confirm({ message: "¿Eliminar esta categoría? Los movimientos vinculados perderán la categoría.", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/categorias-financieras/${id}`, { method: "DELETE" });
    toast.success("Categoría eliminada");
    await load();
  }

  const porTipo = TIPOS.map(tipo => ({
    tipo,
    items: categorias.filter(c => c.tipo === tipo),
  })).filter(g => g.items.length > 0 || !editId);

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Categorías Financieras</h1>
          <p className="text-[#6b7280] text-sm">{categorias.length} categoría{categorias.length !== 1 ? "s" : ""}</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nueva categoría
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
            {editId ? "Editar categoría" : "Nueva categoría"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Honorarios técnicos"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="w-32">
            <label className="text-xs text-gray-500 mb-1 block">Orden</label>
            <input type="number" value={form.orden} onChange={e => setForm(p => ({ ...p, orden: parseInt(e.target.value) || 0 }))}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={save} disabled={saving || !form.nombre.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Crear"}
            </button>
            <button onClick={cancelForm} className="text-gray-500 hover:text-white text-sm transition-colors px-3">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista agrupada por tipo */}
      {loading ? (
        <SkeletonCards count={6} />
      ) : categorias.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-12 text-center text-gray-600 text-sm">
          Sin categorías registradas
        </div>
      ) : (
        <div className="space-y-4">
          {porTipo.map(({ tipo, items }) => (
            items.length > 0 && (
              <div key={tipo} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${TIPO_COLORS[tipo] ?? "bg-gray-800 text-gray-400"}`}>
                    {tipo}
                  </span>
                  <span className="text-gray-600 text-xs">{items.length} categoría{items.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  {items.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#1a1a1a] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 text-xs w-6 text-right">{c.orden}</span>
                        <p className="text-white text-sm">{c.nombre}</p>
                      </div>
                      <div className="flex gap-3">
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
