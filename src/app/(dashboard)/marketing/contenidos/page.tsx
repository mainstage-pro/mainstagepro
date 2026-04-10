"use client";

import { useEffect, useState } from "react";

interface TipoContenido {
  id: string; nombre: string; formato: string; objetivo: string | null;
  diaSemana: string | null; recurrencia: string | null; cantMes: number | null;
  descripcion: string | null; activo: boolean; orden: number;
}

const FORMATOS = ["POST", "REEL", "STORIE", "TIK_TOK"];
const DIAS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];
const RECURRENCIAS = ["DIARIO", "SEMANAL", "QUINCENAL", "MENSUAL", "EVENTUAL"];
const FORMATO_COLORS: Record<string, string> = {
  POST: "bg-blue-900/30 text-blue-300",
  REEL: "bg-purple-900/30 text-purple-300",
  STORIE: "bg-pink-900/30 text-pink-300",
  TIK_TOK: "bg-cyan-900/30 text-cyan-300",
};

const EMPTY = { nombre: "", formato: "POST", objetivo: "", diaSemana: "", recurrencia: "", cantMes: "", descripcion: "" };

export default function ContenidosPage() {
  const [tipos, setTipos] = useState<TipoContenido[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/marketing/contenidos");
    const d = await r.json();
    setTipos(d.tipos ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(t: TipoContenido) {
    setForm({
      nombre: t.nombre, formato: t.formato, objetivo: t.objetivo ?? "",
      diaSemana: t.diaSemana ?? "", recurrencia: t.recurrencia ?? "",
      cantMes: t.cantMes?.toString() ?? "", descripcion: t.descripcion ?? "",
    });
    setEditId(t.id);
    setShowForm(true);
  }

  function cancelForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }

  async function save() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const payload = {
      nombre: form.nombre, formato: form.formato,
      objetivo: form.objetivo || null, diaSemana: form.diaSemana || null,
      recurrencia: form.recurrencia || null,
      cantMes: form.cantMes ? parseInt(form.cantMes) : null,
      descripcion: form.descripcion || null,
    };
    if (editId) {
      await fetch(`/api/marketing/contenidos/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/marketing/contenidos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    await load();
    cancelForm();
    setSaving(false);
  }

  async function toggleActivo(t: TipoContenido) {
    await fetch(`/api/marketing/contenidos/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !t.activo }) });
    await load();
  }

  async function deleteContenido(id: string) {
    if (!confirm("¿Eliminar este tipo de contenido?")) return;
    await fetch(`/api/marketing/contenidos/${id}`, { method: "DELETE" });
    await load();
  }

  const activos = tipos.filter(t => t.activo);
  const inactivos = tipos.filter(t => !t.activo);

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tipos de contenido</h1>
          <p className="text-[#6b7280] text-sm">{activos.length} activos · catálogo de formatos de publicación</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Agregar tipo
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{editId ? "Editar tipo" : "Nuevo tipo de contenido"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Carrusel de fotos, Aftermovie..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Formato</label>
              <select value={form.formato} onChange={e => setForm(p => ({ ...p, formato: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {FORMATOS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Día de publicación</label>
              <select value={form.diaSemana} onChange={e => setForm(p => ({ ...p, diaSemana: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">Sin definir</option>
                {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Recurrencia</label>
              <select value={form.recurrencia} onChange={e => setForm(p => ({ ...p, recurrencia: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">Sin definir</option>
                {RECURRENCIAS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cantidad x mes</label>
              <input type="number" value={form.cantMes} onChange={e => setForm(p => ({ ...p, cantMes: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="0" min="0" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Objetivo</label>
              <input value={form.objetivo} onChange={e => setForm(p => ({ ...p, objetivo: e.target.value }))}
                placeholder="Ej: Mostrar trabajo, generar comunidad..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Descripción / Ejemplo</label>
              <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                placeholder="Describir cómo es este tipo de contenido..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving || !form.nombre.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Agregar"}
            </button>
            <button onClick={cancelForm} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
      ) : tipos.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-12 text-center text-gray-600 text-sm">
          Sin tipos de contenido. Agrega los formatos que usas en tus redes.
        </div>
      ) : (
        <div className="space-y-2">
          {activos.map(t => (
            <div key={t.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-4 flex items-start justify-between hover:border-[#2a2a2a] transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white text-sm font-medium">{t.nombre}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${FORMATO_COLORS[t.formato] ?? "bg-gray-800 text-gray-400"}`}>{t.formato}</span>
                  {t.recurrencia && <span className="text-[10px] text-gray-500">{t.recurrencia}</span>}
                  {t.cantMes && <span className="text-[10px] text-gray-500">{t.cantMes}x/mes</span>}
                </div>
                {t.objetivo && <p className="text-gray-500 text-xs">{t.objetivo}</p>}
                {t.descripcion && <p className="text-gray-600 text-xs mt-0.5 italic">{t.descripcion}</p>}
                {t.diaSemana && <p className="text-gray-600 text-xs mt-0.5">Publica: {t.diaSemana}</p>}
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button onClick={() => startEdit(t)} className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">Editar</button>
                <button onClick={() => toggleActivo(t)} className="text-xs text-gray-500 hover:text-white transition-colors">Desactivar</button>
                <button onClick={() => deleteContenido(t.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Eliminar</button>
              </div>
            </div>
          ))}
          {inactivos.length > 0 && (
            <details className="mt-2">
              <summary className="text-gray-600 text-xs cursor-pointer hover:text-white px-1">{inactivos.length} inactivos</summary>
              <div className="mt-2 space-y-2">
                {inactivos.map(t => (
                  <div key={t.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl px-5 py-3 flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{t.nombre}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${FORMATO_COLORS[t.formato] ?? "bg-gray-800 text-gray-400"}`}>{t.formato}</span>
                    </div>
                    <button onClick={() => toggleActivo(t)} className="text-xs text-gray-500 hover:text-green-400 transition-colors">Activar</button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
