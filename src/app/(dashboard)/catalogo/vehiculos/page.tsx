"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";

type Vehiculo = {
  id: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  placas: string | null;
  color: string | null;
  kilometraje: number | null;
  proximoServicioKm: number | null;
  proximoServicioFecha: string | null;
  activo: boolean;
  notas: string | null;
  mantenimientos: { id: string; fecha: string; tipo: string; descripcion: string | null; km: number | null }[];
};

const EMPTY = {
  nombre: "", marca: "", modelo: "", anio: "", placas: "", color: "", kilometraje: "", notas: "",
};

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  async function load() {
    const r = await fetch("/api/vehiculos");
    const d = await r.json();
    setVehiculos(d.vehiculos ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setForm(EMPTY);
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(v: Vehiculo) {
    setForm({
      nombre: v.nombre,
      marca: v.marca ?? "",
      modelo: v.modelo ?? "",
      anio: v.anio ? String(v.anio) : "",
      placas: v.placas ?? "",
      color: v.color ?? "",
      kilometraje: v.kilometraje ? String(v.kilometraje) : "",
      notas: v.notas ?? "",
    });
    setEditing(v.id);
    setShowForm(true);
  }

  async function guardar() {
    if (!form.nombre.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    const body = {
      nombre: form.nombre.trim(),
      marca: form.marca || null,
      modelo: form.modelo || null,
      anio: form.anio ? parseInt(form.anio) : null,
      placas: form.placas || null,
      color: form.color || null,
      kilometraje: form.kilometraje ? parseInt(form.kilometraje) : null,
      notas: form.notas || null,
    };

    const url = editing ? `/api/vehiculos/${editing}` : "/api/vehiculos";
    const method = editing ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (r.ok) {
      toast.success(editing ? "Vehículo actualizado" : "Vehículo registrado");
      setShowForm(false);
      setEditing(null);
      load();
    } else {
      toast.error(d.error ?? "Error al guardar");
    }
    setSaving(false);
  }

  async function toggleActivo(v: Vehiculo) {
    await fetch(`/api/vehiculos/${v.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !v.activo }),
    });
    load();
  }

  async function eliminar(v: Vehiculo) {
    const ok = await confirm({ message: `¿Eliminar "${v.nombre}"? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    await fetch(`/api/vehiculos/${v.id}`, { method: "DELETE" });
    toast.success("Vehículo eliminado");
    load();
  }

  const activos = vehiculos.filter(v => v.activo);
  const inactivos = vehiculos.filter(v => !v.activo);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Vehículos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Flota de transporte disponible para producción</p>
        </div>
        <button onClick={openNew}
          className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          + Agregar vehículo
        </button>
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold">{editing ? "Editar vehículo" : "Nuevo vehículo"}</p>
              <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-white text-lg">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Nombre / alias *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Van de producción, Camioneta cargo"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Marca</label>
                <input value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))}
                  placeholder="Toyota, Ford, Nissan…"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Modelo</label>
                <input value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))}
                  placeholder="Hiace, Transit, Urvan…"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Año</label>
                <input type="number" value={form.anio} onChange={e => setForm(p => ({ ...p, anio: e.target.value }))}
                  placeholder="2022"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Placas</label>
                <input value={form.placas} onChange={e => setForm(p => ({ ...p, placas: e.target.value }))}
                  placeholder="QRO-000-A"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Color</label>
                <input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  placeholder="Blanco, Negro, Gris…"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Kilometraje actual</label>
                <input type="number" value={form.kilometraje} onChange={e => setForm(p => ({ ...p, kilometraje: e.target.value }))}
                  placeholder="85000"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                  rows={2} placeholder="Estado general, capacidad de carga, detalles importantes…"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex-1 py-2 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] transition-colors disabled:opacity-50">
                {saving ? "Guardando…" : editing ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm text-center py-12">Cargando…</div>
      ) : vehiculos.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm mb-1">Sin vehículos registrados</p>
          <p className="text-gray-600 text-xs">Agrega tu flota para asignarla a proyectos y transportes</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Activos */}
          {activos.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider px-1">Activos ({activos.length})</p>
              {activos.map(v => (
                <VehiculoCard key={v.id} v={v} onEdit={openEdit} onToggle={toggleActivo} onDelete={eliminar} />
              ))}
            </div>
          )}
          {/* Inactivos */}
          {inactivos.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider px-1">Inactivos ({inactivos.length})</p>
              {inactivos.map(v => (
                <VehiculoCard key={v.id} v={v} onEdit={openEdit} onToggle={toggleActivo} onDelete={eliminar} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VehiculoCard({ v, onEdit, onToggle, onDelete }: {
  v: Vehiculo;
  onEdit: (v: Vehiculo) => void;
  onToggle: (v: Vehiculo) => void;
  onDelete: (v: Vehiculo) => void;
}) {
  const ultimoMant = v.mantenimientos[0];

  return (
    <div className={`bg-[#111] border rounded-xl p-5 ${v.activo ? "border-[#222]" : "border-[#1a1a1a] opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{v.nombre}</p>
            {!v.activo && <span className="text-[10px] bg-[#222] text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            {(v.marca || v.modelo) && <span>{[v.marca, v.modelo].filter(Boolean).join(" ")}</span>}
            {v.anio && <span>· {v.anio}</span>}
            {v.color && <span>· {v.color}</span>}
            {v.placas && <span className="font-mono bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#2a2a2a] text-gray-400">{v.placas}</span>}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 flex-wrap">
            {v.kilometraje && <span>🛣 {v.kilometraje.toLocaleString("es-MX")} km</span>}
            {ultimoMant && (
              <span>🔧 Último mant: {(() => { const iso = typeof ultimoMant.fecha === "string" ? ultimoMant.fecha : (ultimoMant.fecha as Date).toISOString(); const [y, m, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }); })()} — {ultimoMant.tipo}</span>
            )}
          </div>
          {v.notas && <p className="text-gray-600 text-xs mt-2">{v.notas}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => onEdit(v)}
            className="text-xs px-3 py-1.5 border border-[#333] rounded-lg text-gray-400 hover:text-white hover:border-[#555] transition-colors">
            Editar
          </button>
          <button onClick={() => onToggle(v)}
            className={`text-xs px-3 py-1.5 border rounded-lg transition-colors ${v.activo ? "border-[#333] text-gray-500 hover:text-white hover:border-[#555]" : "border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10"}`}>
            {v.activo ? "Desactivar" : "Activar"}
          </button>
          <button onClick={() => onDelete(v)}
            className="text-xs px-2 py-1.5 border border-red-900/40 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
