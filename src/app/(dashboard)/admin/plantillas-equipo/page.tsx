"use client";

import { useEffect, useState, useCallback } from "react";

interface Equipo { id: string; descripcion: string; marca: string | null; modelo: string | null; }
interface PlantillaItem { id: string; descripcion: string; cantidad: number; esOpcional: boolean; notas: string | null; equipo: Equipo | null; }
interface Plantilla {
  id: string; nombre: string; tipoServicio: string; tipoEvento: string;
  capacidadMin: number; capacidadMax: number; descripcion: string | null; activo: boolean;
  items: PlantillaItem[];
}

const SERVICIO_LABELS: Record<string, string> = { PRODUCCION_TECNICA: "Producción técnica", RENTA: "Renta", DIRECCION_TECNICA: "Dirección técnica", TODOS: "Todos los servicios" };
const EVENTO_LABELS: Record<string, string>  = { MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro", TODOS: "Todos los eventos" };

const EMPTY_FORM = { nombre: "", tipoServicio: "PRODUCCION_TECNICA", tipoEvento: "MUSICAL", capacidadMin: 0, capacidadMax: 500, descripcion: "" };

export default function PlantillasEquipoPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Agregar item
  const [addingItem, setAddingItem] = useState<string | null>(null); // plantillaId
  const [itemForm, setItemForm] = useState({ descripcion: "", equipoId: "", cantidad: 1, esOpcional: false, notas: "" });

  const load = useCallback(async () => {
    const [pRes, eRes] = await Promise.all([fetch("/api/admin/plantillas-equipo"), fetch("/api/equipos?tipo=PROPIO")]);
    const [pD, eD] = await Promise.all([pRes.json(), eRes.json()]);
    setPlantillas(pD.plantillas ?? []);
    setEquipos(eD.equipos ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function crear() {
    if (!form.nombre) return;
    setSaving(true);
    await fetch("/api/admin/plantillas-equipo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    await load(); setShowForm(false); setForm(EMPTY_FORM); setSaving(false);
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar plantilla?")) return;
    await fetch(`/api/admin/plantillas-equipo/${id}`, { method: "DELETE" });
    await load();
  }

  async function toggleActivo(p: Plantilla) {
    await fetch(`/api/admin/plantillas-equipo/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, activo: !p.activo }) });
    await load();
  }

  async function addItem(plantillaId: string) {
    if (!itemForm.descripcion && !itemForm.equipoId) return;
    const desc = itemForm.descripcion || equipos.find(e => e.id === itemForm.equipoId)?.descripcion || "";
    await fetch(`/api/admin/plantillas-equipo/${plantillaId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addItem", descripcion: desc, equipoId: itemForm.equipoId || null, cantidad: itemForm.cantidad, esOpcional: itemForm.esOpcional, notas: itemForm.notas || null }),
    });
    await load();
    setItemForm({ descripcion: "", equipoId: "", cantidad: 1, esOpcional: false, notas: "" });
    setAddingItem(null);
  }

  async function removeItem(plantillaId: string, itemId: string) {
    await fetch(`/api/admin/plantillas-equipo/${plantillaId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "removeItem", itemId }),
    });
    await load();
  }

  // Agrupar por servicio
  const grouped: Record<string, Plantilla[]> = {};
  for (const p of plantillas) {
    const k = p.tipoServicio;
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(p);
  }

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Plantillas de equipo</h1>
          <p className="text-[#6b7280] text-sm">Paquetes sugeridos por tipo de servicio, evento y capacidad</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nueva plantilla
        </button>
      </div>

      {/* Form nueva plantilla */}
      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nueva plantilla</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Nombre de la plantilla *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Prod. Técnica Musical 200-400 pax"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo de servicio</label>
              <select value={form.tipoServicio} onChange={e => setForm(p => ({ ...p, tipoServicio: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {Object.entries(SERVICIO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo de evento</label>
              <select value={form.tipoEvento} onChange={e => setForm(p => ({ ...p, tipoEvento: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {Object.entries(EVENTO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Capacidad mínima (asistentes)</label>
              <input type="number" value={form.capacidadMin} onChange={e => setForm(p => ({ ...p, capacidadMin: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Capacidad máxima (asistentes)</label>
              <input type="number" value={form.capacidadMax} onChange={e => setForm(p => ({ ...p, capacidadMax: parseInt(e.target.value) || 9999 }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Descripción (opcional)</label>
              <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={2}
                placeholder="Notas sobre cuándo usar esta plantilla..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={crear} disabled={saving || !form.nombre}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : "Crear plantilla"}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="text-gray-500 hover:text-white text-sm px-3">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista agrupada */}
      {Object.entries(grouped).map(([servicio, items]) => (
        <div key={servicio}>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 px-1">{SERVICIO_LABELS[servicio] ?? servicio}</p>
          <div className="space-y-2">
            {items.map(p => (
              <div key={p.id} className={`bg-[#111] border rounded-xl overflow-hidden transition-colors ${p.activo ? "border-[#1e1e1e]" : "border-[#1a1a1a] opacity-50"}`}>
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandida(expandida === p.id ? null : p.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{p.nombre}</span>
                      <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded">{EVENTO_LABELS[p.tipoEvento]}</span>
                      <span className="text-[10px] text-gray-500">{p.capacidadMin}–{p.capacidadMax === 9999 ? "∞" : p.capacidadMax} pax</span>
                      <span className="text-[10px] text-gray-600">{p.items.length} equipo{p.items.length !== 1 ? "s" : ""}</span>
                    </div>
                    {p.descripcion && <p className="text-gray-600 text-xs mt-0.5">{p.descripcion}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleActivo(p)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${p.activo ? "border-green-700/40 text-green-400 hover:bg-green-900/20" : "border-gray-700 text-gray-500 hover:text-white"}`}>
                      {p.activo ? "Activa" : "Inactiva"}
                    </button>
                    <button onClick={() => eliminar(p.id)} className="text-[10px] text-gray-700 hover:text-red-400 transition-colors px-1">Eliminar</button>
                    <span className={`text-gray-600 text-xs transition-transform ${expandida === p.id ? "rotate-180" : ""}`}>▼</span>
                  </div>
                </div>

                {/* Items expandidos */}
                {expandida === p.id && (
                  <div className="border-t border-[#1a1a1a] p-4 bg-[#0d0d0d] space-y-3">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">Equipos en esta plantilla</p>
                    {p.items.length === 0 ? (
                      <p className="text-gray-700 text-xs">Sin equipos. Agrega los equipos que forman parte de esta plantilla.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {p.items.map(item => (
                          <div key={item.id} className="flex items-center gap-2 bg-[#111] rounded-lg px-3 py-2">
                            <span className="text-gray-400 text-xs font-medium w-6 text-center">{item.cantidad}×</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-white text-xs">{item.descripcion}</span>
                              {item.equipo && <span className="text-gray-600 text-[10px] ml-1">({item.equipo.marca} {item.equipo.modelo})</span>}
                              {item.esOpcional && <span className="text-gray-600 text-[10px] ml-2">· opcional</span>}
                              {item.notas && <span className="text-gray-700 text-[10px] ml-1">· {item.notas}</span>}
                            </div>
                            <button onClick={() => removeItem(p.id, item.id)} className="text-[10px] text-gray-700 hover:text-red-400 transition-colors shrink-0">✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Agregar item */}
                    {addingItem === p.id ? (
                      <div className="space-y-2 mt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-600 mb-1 block">Equipo del inventario (opcional)</label>
                            <select value={itemForm.equipoId} onChange={e => setItemForm(p => ({ ...p, equipoId: e.target.value }))}
                              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]">
                              <option value="">— Equipo libre —</option>
                              {equipos.map(e => <option key={e.id} value={e.id}>{e.descripcion}{e.marca ? ` (${e.marca}${e.modelo ? ` ${e.modelo}` : ""})` : ""}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-600 mb-1 block">Descripción / nombre</label>
                            <input value={itemForm.descripcion} onChange={e => setItemForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Sistema PA principal, Consola digital..."
                              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-600 mb-1 block">Cantidad</label>
                            <input type="number" min="1" value={itemForm.cantidad} onChange={e => setItemForm(p => ({ ...p, cantidad: parseInt(e.target.value) || 1 }))}
                              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            <input type="checkbox" id={`opc-${p.id}`} checked={itemForm.esOpcional} onChange={e => setItemForm(p => ({ ...p, esOpcional: e.target.checked }))} className="accent-[#B3985B]" />
                            <label htmlFor={`opc-${p.id}`} className="text-xs text-gray-500">Es opcional / sugerido</label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => addItem(p.id)} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors">Agregar</button>
                          <button onClick={() => { setAddingItem(null); setItemForm({ descripcion: "", equipoId: "", cantidad: 1, esOpcional: false, notas: "" }); }} className="text-gray-600 hover:text-white text-xs px-2">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingItem(p.id)} className="text-[#B3985B] hover:text-[#c9a96a] text-xs transition-colors mt-1">+ Agregar equipo</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {plantillas.length === 0 && !showForm && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-14 text-center space-y-4">
          <div>
            <p className="text-gray-500 text-sm mb-1">Sin plantillas todavía</p>
            <p className="text-gray-700 text-xs">Crea plantillas manualmente o carga las 9 plantillas base de la guía comercial.</p>
          </div>
          <button
            onClick={async () => {
              if (!confirm("¿Cargar las 9 plantillas base? (Social, Empresarial y Musical en 3 rangos de capacidad cada una)")) return;
              const res = await fetch("/api/admin/plantillas-equipo/seed", { method: "POST" });
              const d = await res.json();
              if (d.ok) { await load(); }
              else alert(d.error ?? "Error al cargar plantillas");
            }}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Cargar plantillas base (guía comercial)
          </button>
        </div>
      )}
    </div>
  );
}
