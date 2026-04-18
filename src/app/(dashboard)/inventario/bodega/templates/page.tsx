"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/Confirm";

interface Template { id: string; descripcion: string; categoria: string; orden: number; activo: boolean }

const CATEGORIAS = ["AUDIO", "ILUMINACION", "VIDEO", "CABLES", "HERRAMIENTAS", "TRANSPORTES", "GENERAL"];

export default function TemplatesPage() {
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ descripcion: "", categoria: "GENERAL", orden: 0 });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/bodega/templates", { cache: "no-store" });
    const d = await r.json();
    setTemplates(d.templates ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(t: Template) {
    setForm({ descripcion: t.descripcion, categoria: t.categoria, orden: t.orden });
    setEditId(t.id);
    setShowForm(true);
  }

  function cancelForm() {
    setForm({ descripcion: "", categoria: "GENERAL", orden: 0 });
    setEditId(null);
    setShowForm(false);
  }

  async function save() {
    if (!form.descripcion.trim()) return;
    setSaving(true);
    if (editId) {
      await fetch(`/api/bodega/templates/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/bodega/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await load();
    cancelForm();
    setSaving(false);
  }

  async function toggleActivo(t: Template) {
    await fetch(`/api/bodega/templates/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !t.activo }) });
    await load();
  }

  async function deleteTemplate(id: string) {
    if (!await confirm({ message: "¿Eliminar este item del catálogo?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/bodega/templates/${id}`, { method: "DELETE" });
    await load();
  }

  const porCategoria = CATEGORIAS.map(cat => ({
    cat,
    items: templates.filter(t => t.categoria === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Catálogo de items — Bodega</h1>
          <p className="text-[#6b7280] text-sm">{templates.filter(t => t.activo).length} items activos · Se copian al crear un nuevo checklist semanal</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Agregar item
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{editId ? "Editar item" : "Nuevo item"}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Descripción *</label>
              <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Ej: Cable XLR 10m, Subwoofer 18'..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
              <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-500 mb-1 block">Orden</label>
              <input type="number" value={form.orden} onChange={e => setForm(p => ({ ...p, orden: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving || !form.descripcion.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Agregar"}
            </button>
            <button onClick={cancelForm} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
      ) : templates.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-12 text-center text-gray-600 text-sm">
          Sin items. Agrega los equipos y materiales que revisas cada semana en bodega.
        </div>
      ) : (
        <div className="space-y-4">
          {porCategoria.map(({ cat, items }) => (
            <div key={cat} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1a1a1a]">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{cat} ({items.length})</p>
              </div>
              <div className="divide-y divide-[#1a1a1a]">
                {items.map(t => (
                  <div key={t.id} className={`flex items-center justify-between px-5 py-3 hover:bg-[#141414] transition-colors ${!t.activo ? "opacity-40" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 text-xs w-5 text-right">{t.orden}</span>
                      <p className="text-white text-sm">{t.descripcion}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => toggleActivo(t)} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${t.activo ? "bg-green-900/40 text-green-400 hover:bg-green-900/60" : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}>
                        {t.activo ? "Activo" : "Inactivo"}
                      </button>
                      <button onClick={() => startEdit(t)} className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">Editar</button>
                      <button onClick={() => deleteTemplate(t.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Items sin categoría definida */}
          {templates.filter(t => !CATEGORIAS.includes(t.categoria)).length > 0 && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1a1a1a]">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">OTROS</p>
              </div>
              {templates.filter(t => !CATEGORIAS.includes(t.categoria)).map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#141414] transition-colors border-b border-[#1a1a1a] last:border-0">
                  <p className="text-white text-sm">{t.descripcion}</p>
                  <div className="flex gap-3">
                    <button onClick={() => startEdit(t)} className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">Editar</button>
                    <button onClick={() => deleteTemplate(t.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
