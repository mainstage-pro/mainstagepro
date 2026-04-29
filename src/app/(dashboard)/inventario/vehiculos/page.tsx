"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";

interface Mantenimiento {
  id: string;
  fecha: string;
  km: number | null;
  tipoRegistro: string;
  servicio: string;
  aceite: string | null;
  anticongelante: string | null;
  estadoLlantas: string | null;
  proximoKm: number | null;
  proximaFecha: string | null;
  prioridad: string;
  estatus: string;
  costo: number | null;
  comentarios: string | null;
}

interface Vehiculo {
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
  mantenimientos: Mantenimiento[];
}

const TIPO_LABELS: Record<string, string> = {
  SERVICIO: "Servicio", REPARACION: "Reparación", REVISION: "Revisión",
  ACCIDENTE: "Accidente", OTRO: "Otro",
};
const TIPO_COLORS: Record<string, string> = {
  SERVICIO: "text-blue-400 bg-blue-900/20",
  REPARACION: "text-orange-400 bg-orange-900/20",
  REVISION: "text-gray-400 bg-gray-800",
  ACCIDENTE: "text-red-400 bg-red-900/20",
  OTRO: "text-gray-500 bg-[#1a1a1a]",
};
const PRIORIDAD_COLORS: Record<string, string> = {
  BAJA: "text-gray-500",
  NORMAL: "text-blue-400",
  ALTA: "text-yellow-400",
  URGENTE: "text-red-400",
};
const ESTATUS_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-900/30 text-yellow-400",
  EN_PROCESO: "bg-blue-900/30 text-blue-400",
  COMPLETADO: "bg-green-900/30 text-green-400",
};

const EMPTY_MANT = {
  fecha: new Date().toISOString().split("T")[0],
  km: "",
  tipoRegistro: "SERVICIO",
  servicio: "",
  aceite: "",
  anticongelante: "",
  estadoLlantas: "",
  proximoKm: "",
  proximaFecha: "",
  prioridad: "NORMAL",
  estatus: "COMPLETADO",
  costo: "",
  comentarios: "",
};

const EMPTY_VEH = { nombre: "", marca: "", modelo: "", anio: "", placas: "", color: "", kilometraje: "", notas: "" };

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtKm(n: number | null) {
  if (!n) return "—";
  return `${n.toLocaleString("es-MX")} km`;
}

export default function VehiculosPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showVehForm, setShowVehForm] = useState(false);
  const [vehForm, setVehForm] = useState(EMPTY_VEH);
  const [savingVeh, setSavingVeh] = useState(false);
  const [showMantForm, setShowMantForm] = useState(false);
  const [mantForm, setMantForm] = useState(EMPTY_MANT);
  const [savingMant, setSavingMant] = useState(false);
  const [deletingMant, setDeletingMant] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/vehiculos", { cache: "no-store" });
    const data = await res.json();
    setVehiculos(data.vehiculos ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const selected = vehiculos.find(v => v.id === selectedId) ?? null;

  // Alertas de servicio próximo
  function alertaServicio(v: Vehiculo): "urgente" | "proximo" | null {
    if (!v.activo) return null;
    const hoy = new Date();
    if (v.proximoServicioFecha) {
      const dias = Math.ceil((new Date(v.proximoServicioFecha).getTime() - hoy.getTime()) / 86400000);
      if (dias <= 0) return "urgente";
      if (dias <= 15) return "proximo";
    }
    if (v.proximoServicioKm && v.kilometraje) {
      const diff = v.proximoServicioKm - v.kilometraje;
      if (diff <= 0) return "urgente";
      if (diff <= 500) return "proximo";
    }
    return null;
  }

  async function saveVehiculo() {
    if (!vehForm.nombre.trim()) return;
    setSavingVeh(true);
    const res = await fetch("/api/vehiculos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehForm),
    });
    const data = await res.json();
    setSavingVeh(false);
    if (res.ok) {
      setVehForm(EMPTY_VEH);
      setShowVehForm(false);
      await load();
      setSelectedId(data.vehiculo.id);
    }
  }

  async function saveMantenimiento() {
    if (!selectedId || !mantForm.servicio.trim()) return;
    setSavingMant(true);
    const res = await fetch(`/api/vehiculos/${selectedId}/mantenimiento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mantForm),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSavingMant(false);
      return;
    }
    setSavingMant(false);
    setMantForm(EMPTY_MANT);
    setShowMantForm(false);
    await load();
  }

  async function deleteMantenimiento(mantId: string) {
    if (!selectedId || !await confirm({ message: "¿Eliminar este registro?", danger: true, confirmText: "Eliminar" })) return;
    setDeletingMant(mantId);
    const res = await fetch(`/api/vehiculos/${selectedId}/mantenimiento/${mantId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      setDeletingMant(null);
      return;
    }
    setDeletingMant(null);
    await load();
  }

  async function toggleActivo(v: Vehiculo) {
    const res = await fetch(`/api/vehiculos/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !v.activo }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    await load();
  }

  const totalCosto = selected?.mantenimientos.reduce((s, m) => s + (m.costo ?? 0), 0) ?? 0;
  const urgentes = vehiculos.filter(v => alertaServicio(v) === "urgente");
  const proximos = vehiculos.filter(v => alertaServicio(v) === "proximo");

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Vehículos</h1>
          <p className="text-[#6b7280] text-sm">Bitácora de mantenimiento</p>
        </div>
        <button onClick={() => setShowVehForm(true)}
          className="bg-[#B3985B] hover:bg-[#d4b068] text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          + Vehículo
        </button>
      </div>

      {/* Alertas */}
      {(urgentes.length > 0 || proximos.length > 0) && (
        <div className="space-y-2 mb-5">
          {urgentes.map(v => (
            <div key={v.id} className="flex items-center gap-3 bg-red-900/15 border border-red-900/40 rounded-xl px-4 py-3">
              <span className="text-red-400 text-lg">⚠</span>
              <div>
                <p className="text-red-300 text-sm font-medium">{v.nombre} — servicio vencido</p>
                <p className="text-red-400/70 text-xs">
                  {v.proximoServicioFecha && `Fecha: ${fmtDate(v.proximoServicioFecha)}`}
                  {v.proximoServicioKm && v.kilometraje && ` · Km actual: ${fmtKm(v.kilometraje)} / Servicio: ${fmtKm(v.proximoServicioKm)}`}
                </p>
              </div>
            </div>
          ))}
          {proximos.map(v => (
            <div key={v.id} className="flex items-center gap-3 bg-yellow-900/10 border border-yellow-900/30 rounded-xl px-4 py-3">
              <span className="text-yellow-400 text-base">⏰</span>
              <div>
                <p className="text-yellow-300 text-sm font-medium">{v.nombre} — servicio próximo</p>
                <p className="text-yellow-400/70 text-xs">
                  {v.proximoServicioFecha && `Fecha: ${fmtDate(v.proximoServicioFecha)}`}
                  {v.proximoServicioKm && v.kilometraje && ` · Faltan ${(v.proximoServicioKm - v.kilometraje).toLocaleString()} km`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulario nuevo vehículo */}
      {showVehForm && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 mb-5">
          <p className="text-white font-semibold mb-4">Nuevo vehículo</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { key: "nombre", label: "Nombre / Alias *", placeholder: "Ej. Sprinter Negra" },
              { key: "marca", label: "Marca", placeholder: "Mercedes-Benz" },
              { key: "modelo", label: "Modelo", placeholder: "Sprinter 316" },
              { key: "anio", label: "Año", placeholder: "2022" },
              { key: "placas", label: "Placas", placeholder: "ABC-123-D" },
              { key: "color", label: "Color", placeholder: "Negro" },
              { key: "kilometraje", label: "Km actuales", placeholder: "45000" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                <input
                  value={vehForm[f.key as keyof typeof vehForm]}
                  onChange={e => setVehForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <input
                value={vehForm.notas}
                onChange={e => setVehForm(p => ({ ...p, notas: e.target.value }))}
                placeholder="Observaciones generales del vehículo"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={saveVehiculo} disabled={savingVeh || !vehForm.nombre.trim()}
              className="bg-[#B3985B] hover:bg-[#d4b068] disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              {savingVeh ? "Guardando..." : "Agregar vehículo"}
            </button>
            <button onClick={() => setShowVehForm(false)}
              className="text-sm text-gray-500 hover:text-white border border-[#333] px-4 py-2 rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4 min-h-[60vh]">
          {/* Lista de vehículos */}
          <div className="w-72 shrink-0 space-y-2">
            {vehiculos.length === 0 ? (
              <div className="bg-[#111] border border-[#222] rounded-xl py-10 text-center">
                <p className="text-gray-600 text-sm">Sin vehículos</p>
                <p className="text-gray-700 text-xs mt-1">Agrega el primero</p>
              </div>
            ) : vehiculos.map(v => {
              const alerta = alertaServicio(v);
              return (
                <button key={v.id} onClick={() => setSelectedId(v.id)}
                  className={`w-full text-left bg-[#111] border rounded-xl px-4 py-3 transition-colors ${
                    selectedId === v.id ? "border-[#B3985B]/50 bg-[#B3985B]/5" :
                    alerta === "urgente" ? "border-red-900/50 hover:border-red-700/50" :
                    alerta === "proximo" ? "border-yellow-900/40 hover:border-yellow-700/50" :
                    "border-[#222] hover:border-[#333]"
                  } ${!v.activo ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm font-medium truncate">{v.nombre}</p>
                    {alerta === "urgente" && <span className="text-red-400 text-xs shrink-0">⚠ Vencido</span>}
                    {alerta === "proximo" && <span className="text-yellow-400 text-xs shrink-0">⏰ Pronto</span>}
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">
                    {[v.marca, v.modelo, v.anio].filter(Boolean).join(" ")}
                    {v.placas && ` · ${v.placas}`}
                  </p>
                  {v.kilometraje && (
                    <p className="text-gray-700 text-xs mt-1">{fmtKm(v.kilometraje)}</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detalle */}
          <div className="flex-1 min-w-0">
            {!selected ? (
              <div className="bg-[#111] border border-[#222] rounded-xl h-64 flex items-center justify-center">
                <p className="text-gray-700 text-sm">Selecciona un vehículo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Info del vehículo */}
                <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-white font-semibold text-lg">{selected.nombre}</h2>
                      <p className="text-gray-500 text-sm">
                        {[selected.marca, selected.modelo, selected.anio].filter(Boolean).join(" ")}
                        {selected.placas && ` · ${selected.placas}`}
                        {selected.color && ` · ${selected.color}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowMantForm(true); setMantForm(EMPTY_MANT); }}
                        className="text-xs bg-[#B3985B] hover:bg-[#d4b068] text-black font-semibold px-3 py-1.5 rounded-lg transition-colors">
                        + Registro
                      </button>
                      <button onClick={() => toggleActivo(selected)}
                        className="text-xs text-gray-500 hover:text-white border border-[#333] px-3 py-1.5 rounded-lg transition-colors">
                        {selected.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Km actuales</p>
                      <p className="text-white text-sm font-medium mt-0.5">{fmtKm(selected.kilometraje)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Próximo servicio (Km)</p>
                      <p className={`text-sm font-medium mt-0.5 ${alertaServicio(selected) === "urgente" ? "text-red-400" : alertaServicio(selected) === "proximo" ? "text-yellow-400" : "text-white"}`}>
                        {fmtKm(selected.proximoServicioKm)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Próximo servicio (fecha)</p>
                      <p className={`text-sm font-medium mt-0.5 ${alertaServicio(selected) === "urgente" ? "text-red-400" : alertaServicio(selected) === "proximo" ? "text-yellow-400" : "text-white"}`}>
                        {fmtDate(selected.proximoServicioFecha)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Costo total histórico</p>
                      <p className="text-white text-sm font-medium mt-0.5">{fmt(totalCosto)}</p>
                    </div>
                  </div>

                  {selected.notas && (
                    <p className="text-gray-600 text-xs mt-3 bg-[#0d0d0d] rounded-lg px-3 py-2">{selected.notas}</p>
                  )}
                </div>

                {/* Formulario nuevo registro */}
                {showMantForm && (
                  <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-5">
                    <p className="text-white font-semibold mb-4">Nuevo registro de mantenimiento</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Fecha *</label>
                        <input type="date" value={mantForm.fecha}
                          onChange={e => setMantForm(p => ({ ...p, fecha: e.target.value }))}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Tipo *</label>
                        <Combobox
                          value={mantForm.tipoRegistro}
                          onChange={v => setMantForm(p => ({ ...p, tipoRegistro: v }))}
                          options={Object.entries(TIPO_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Km al registrar</label>
                        <input value={mantForm.km} onChange={e => setMantForm(p => ({ ...p, km: e.target.value }))}
                          placeholder="45000" type="number"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />
                      </div>
                      <div className="col-span-2 md:col-span-3">
                        <label className="text-xs text-gray-500 mb-1 block">Servicio / trabajo realizado *</label>
                        <input value={mantForm.servicio} onChange={e => setMantForm(p => ({ ...p, servicio: e.target.value }))}
                          placeholder="Cambio de aceite y filtros, revisión general..."
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">N. Aceite</label>
                        <input value={mantForm.aceite} onChange={e => setMantForm(p => ({ ...p, aceite: e.target.value }))}
                          placeholder="5W-30 sintético"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">N. Anticongelante</label>
                        <input value={mantForm.anticongelante} onChange={e => setMantForm(p => ({ ...p, anticongelante: e.target.value }))}
                          placeholder="OAT verde"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Estado de llantas</label>
                        <input value={mantForm.estadoLlantas} onChange={e => setMantForm(p => ({ ...p, estadoLlantas: e.target.value }))}
                          placeholder="Bueno / Desgaste leve..."
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Próximo servicio (Km)</label>
                        <input value={mantForm.proximoKm} onChange={e => setMantForm(p => ({ ...p, proximoKm: e.target.value }))}
                          placeholder="50000" type="number"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Próximo servicio (fecha)</label>
                        <input type="date" value={mantForm.proximaFecha} onChange={e => setMantForm(p => ({ ...p, proximaFecha: e.target.value }))}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Costo</label>
                        <input value={mantForm.costo} onChange={e => setMantForm(p => ({ ...p, costo: e.target.value }))}
                          placeholder="1500" type="number"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Prioridad</label>
                        <Combobox
                          value={mantForm.prioridad}
                          onChange={v => setMantForm(p => ({ ...p, prioridad: v }))}
                          options={[{ value: "BAJA", label: "Baja" }, { value: "NORMAL", label: "Normal" }, { value: "ALTA", label: "Alta" }, { value: "URGENTE", label: "Urgente" }]}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Estatus</label>
                        <Combobox
                          value={mantForm.estatus}
                          onChange={v => setMantForm(p => ({ ...p, estatus: v }))}
                          options={[{ value: "COMPLETADO", label: "Completado" }, { value: "EN_PROCESO", label: "En proceso" }, { value: "PENDIENTE", label: "Pendiente" }]}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-3">
                        <label className="text-xs text-gray-500 mb-1 block">Comentarios</label>
                        <input value={mantForm.comentarios} onChange={e => setMantForm(p => ({ ...p, comentarios: e.target.value }))}
                          placeholder="Notas adicionales, taller, mecánico..."
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={saveMantenimiento} disabled={savingMant || !mantForm.servicio.trim()}
                        className="bg-[#B3985B] hover:bg-[#d4b068] disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                        {savingMant ? "Guardando..." : "Guardar registro"}
                      </button>
                      <button onClick={() => setShowMantForm(false)}
                        className="text-sm text-gray-500 hover:text-white border border-[#333] px-4 py-2 rounded-xl transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Bitácora de registros */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#1a1a1a]">
                    <p className="text-white text-sm font-semibold">Bitácora de mantenimiento</p>
                    <p className="text-gray-600 text-xs mt-0.5">{selected.mantenimientos.length} registros</p>
                  </div>
                  {selected.mantenimientos.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-gray-700 text-sm">Sin registros aún</p>
                      <p className="text-gray-800 text-xs mt-1">Agrega el primer registro de mantenimiento</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#0d0d0d]">
                      {selected.mantenimientos.map(m => (
                        <div key={m.id} className="px-5 py-4 hover:bg-[#0d0d0d] transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className="text-white text-sm font-medium">{m.servicio}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[m.tipoRegistro] ?? "bg-gray-800 text-gray-400"}`}>
                                  {TIPO_LABELS[m.tipoRegistro] ?? m.tipoRegistro}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${ESTATUS_COLORS[m.estatus] ?? "bg-gray-800 text-gray-400"}`}>
                                  {m.estatus === "COMPLETADO" ? "Completado" : m.estatus === "EN_PROCESO" ? "En proceso" : "Pendiente"}
                                </span>
                                {m.prioridad !== "NORMAL" && (
                                  <span className={`text-[10px] font-medium ${PRIORIDAD_COLORS[m.prioridad]}`}>
                                    {m.prioridad}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-[11px] text-gray-600">
                                <span>📅 {fmtDate(m.fecha)}</span>
                                {m.km && <span>🛣 {fmtKm(m.km)}</span>}
                                {m.costo && <span className="text-[#B3985B]">💰 {fmt(m.costo)}</span>}
                                {m.proximoKm && <span>⏭ Próx: {fmtKm(m.proximoKm)}</span>}
                                {m.proximaFecha && <span>📆 Próx: {fmtDate(m.proximaFecha)}</span>}
                                {m.aceite && <span>🛢 Aceite: {m.aceite}</span>}
                                {m.anticongelante && <span>❄ Anticong: {m.anticongelante}</span>}
                                {m.estadoLlantas && <span>🔘 Llantas: {m.estadoLlantas}</span>}
                              </div>
                              {m.comentarios && (
                                <p className="text-gray-700 text-xs mt-1.5">{m.comentarios}</p>
                              )}
                            </div>
                            <button onClick={() => deleteMantenimiento(m.id)} disabled={deletingMant === m.id}
                              className="text-red-900 hover:text-red-500 text-xs transition-colors shrink-0">
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
