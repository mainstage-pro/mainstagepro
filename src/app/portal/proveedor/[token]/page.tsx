"use client";

import { useEffect, useState, use } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface EquipoProveedor {
  id: string;
  categoria: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  serialNum: string | null;
  anioFabricacion: number | null;
  cantidad: number;
  condicion: string;
  disponibilidad: string;
  potenciaW: number | null;
  voltaje: string | null;
  amperaje: number | null;
  pesoKg: number | null;
  dimensiones: string | null;
  incluyeCase: boolean;
  tiempoSetupMin: number | null;
  precioDia: number | null;
  precioEventoFull: number | null;
  precioMinimoEvent: number | null;
  notas: string | null;
  fotosUrls: string | null;
  fichaTecnicaUrl: string | null;
  aprobado: boolean;
  createdAt: string;
}
interface Proveedor {
  id: string;
  nombre: string;
  empresa: string | null;
  giro: string | null;
  correo: string | null;
  equiposPortal: EquipoProveedor[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { value: "AUDIO",        label: "Audio" },
  { value: "VIDEO",        label: "Video / Pantallas" },
  { value: "ILUMINACION",  label: "Iluminación" },
  { value: "BACKLINE",     label: "Backline / Instrumentos" },
  { value: "ESCENOGRAFIA", label: "Escenografía / Estructuras" },
  { value: "LOGISTICA",    label: "Logística / Transporte" },
  { value: "OTRO",         label: "Otro" },
];

const CONDICIONES = [
  { value: "NUEVO",             label: "Nuevo",               color: "text-green-400 bg-green-900/20 border-green-700/40" },
  { value: "BUENO",             label: "Bueno",               color: "text-blue-400 bg-blue-900/20 border-blue-700/40" },
  { value: "REGULAR",           label: "Regular",             color: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40" },
  { value: "NECESITA_REVISION", label: "Necesita revisión",   color: "text-red-400 bg-red-900/20 border-red-700/40" },
];

const DISPONIBILIDADES = [
  { value: "DISPONIBLE",        label: "Disponible",          color: "text-green-400" },
  { value: "EN_USO",            label: "En uso",              color: "text-yellow-400" },
  { value: "EN_MANTENIMIENTO",  label: "En mantenimiento",    color: "text-orange-400" },
  { value: "NO_DISPONIBLE",     label: "No disponible",       color: "text-red-400" },
];

const VOLTAJES = ["110", "220", "110/220"];

const EMPTY_FORM = {
  categoria: "AUDIO",
  descripcion: "",
  marca: "",
  modelo: "",
  serialNum: "",
  anioFabricacion: "",
  cantidad: "1",
  condicion: "BUENO",
  disponibilidad: "DISPONIBLE",
  potenciaW: "",
  voltaje: "",
  amperaje: "",
  pesoKg: "",
  dimensiones: "",
  incluyeCase: false,
  tiempoSetupMin: "",
  precioDia: "",
  precioEventoFull: "",
  precioMinimoEvent: "",
  notas: "",
  fotosUrls: "",
  fichaTecnicaUrl: "",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

function catLabel(v: string) { return CATEGORIAS.find(c => c.value === v)?.label ?? v; }
function condLabel(v: string) { return CONDICIONES.find(c => c.value === v)?.label ?? v; }
function condColor(v: string) { return CONDICIONES.find(c => c.value === v)?.color ?? "text-gray-400 bg-gray-900/20 border-gray-700/40"; }
function dispColor(v: string) { return DISPONIBILIDADES.find(d => d.value === v)?.color ?? "text-gray-400"; }

// ─── Formulario de equipo ──────────────────────────────────────────────────────
function EquipoForm({
  initial, onSave, onCancel, saving,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof EMPTY_FORM, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">

      {/* ── Identificación ── */}
      <div>
        <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-3">Identificación del equipo</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Categoría *</label>
            <select value={form.categoria} onChange={e => set("categoria", e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]">
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Cantidad *</label>
            <input type="number" min="1" value={form.cantidad} onChange={e => set("cantidad", e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 block mb-1">Descripción *</label>
            <input type="text" value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
              placeholder="Ej: Consola de mezcla digital, Sub compacto, LED Moving Head..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Marca</label>
            <input type="text" value={form.marca} onChange={e => set("marca", e.target.value)}
              placeholder="Ej: Yamaha, Martin, L-Acoustics..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Modelo</label>
            <input type="text" value={form.modelo} onChange={e => set("modelo", e.target.value)}
              placeholder="Ej: CL5, MAC Quantum, K2..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">No. de serie</label>
            <input type="text" value={form.serialNum} onChange={e => set("serialNum", e.target.value)}
              placeholder="Número de serie del fabricante"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Año de fabricación</label>
            <input type="number" min="1990" max={new Date().getFullYear()} value={form.anioFabricacion} onChange={e => set("anioFabricacion", e.target.value)}
              placeholder={String(new Date().getFullYear())}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
        </div>
      </div>

      {/* ── Estado y condición ── */}
      <div>
        <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-3">Estado y condición</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-2">Condición *</label>
            <div className="grid grid-cols-2 gap-2">
              {CONDICIONES.map(c => (
                <button key={c.value} type="button" onClick={() => set("condicion", c.value)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${form.condicion === c.value ? c.color : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-2">Disponibilidad *</label>
            <div className="grid grid-cols-2 gap-2">
              {DISPONIBILIDADES.map(d => (
                <button key={d.value} type="button" onClick={() => set("disponibilidad", d.value)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${form.disponibilidad === d.value ? `${d.color} bg-[#1a1a1a] border-current` : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Especificaciones técnicas ── */}
      <div>
        <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-3">Especificaciones técnicas</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Potencia (W)</label>
            <input type="number" min="0" step="any" value={form.potenciaW} onChange={e => set("potenciaW", e.target.value)}
              placeholder="0"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Voltaje</label>
            <select value={form.voltaje} onChange={e => set("voltaje", e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]">
              <option value="">— Sin especificar —</option>
              {VOLTAJES.map(v => <option key={v} value={v}>{v}V</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Amperaje (A)</label>
            <input type="number" min="0" step="any" value={form.amperaje} onChange={e => set("amperaje", e.target.value)}
              placeholder="0"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Peso (kg)</label>
            <input type="number" min="0" step="any" value={form.pesoKg} onChange={e => set("pesoKg", e.target.value)}
              placeholder="0"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Dimensiones (L × A × H)</label>
            <input type="text" value={form.dimensiones} onChange={e => set("dimensiones", e.target.value)}
              placeholder="Ej: 60 x 40 x 20 cm"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tiempo de setup (min)</label>
            <input type="number" min="0" value={form.tiempoSetupMin} onChange={e => set("tiempoSetupMin", e.target.value)}
              placeholder="0"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => set("incluyeCase", !form.incluyeCase)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.incluyeCase ? "bg-[#B3985B]" : "bg-[#2a2a2a]"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.incluyeCase ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-gray-300">Incluye case / flight case</span>
          </label>
        </div>
      </div>

      {/* ── Precios de renta ── */}
      <div>
        <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-3">Precios de renta (MXN)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Precio por día</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input type="number" min="0" step="any" value={form.precioDia} onChange={e => set("precioDia", e.target.value)}
                placeholder="0"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg pl-6 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Precio evento completo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input type="number" min="0" step="any" value={form.precioEventoFull} onChange={e => set("precioEventoFull", e.target.value)}
                placeholder="0"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg pl-6 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Precio mínimo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input type="number" min="0" step="any" value={form.precioMinimoEvent} onChange={e => set("precioMinimoEvent", e.target.value)}
                placeholder="0"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg pl-6 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
        </div>
        <p className="text-gray-600 text-xs mt-2">Puedes llenar solo los que apliquen. Los precios son de referencia para cotización.</p>
      </div>

      {/* ── Documentación ── */}
      <div>
        <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-3">Documentación y fotos</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">URL de fotos</label>
            <input type="url" value={form.fotosUrls} onChange={e => set("fotosUrls", e.target.value)}
              placeholder="Google Drive, Dropbox, OneDrive o link de imagen..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            <p className="text-gray-600 text-[10px] mt-1">Puedes pegar un link a carpeta de Drive o álbum de fotos</p>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Ficha técnica (URL)</label>
            <input type="url" value={form.fichaTecnicaUrl} onChange={e => set("fichaTecnicaUrl", e.target.value)}
              placeholder="PDF del fabricante, manual técnico..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-gray-400 block mb-1">Notas adicionales</label>
          <textarea value={form.notas} onChange={e => set("notas", e.target.value)}
            rows={3}
            placeholder="Condiciones de renta, restricciones, operador requerido, accesorios incluidos, observaciones..."
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
        </div>
      </div>

      {/* ── Botones ── */}
      <div className="flex gap-3 pt-2 border-t border-[#1a1a1a]">
        <button onClick={() => onSave(form)} disabled={saving || !form.descripcion.trim()}
          className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-bold px-6 py-2.5 rounded-lg text-sm transition-colors">
          {saving ? "Guardando..." : "Guardar equipo"}
        </button>
        <button onClick={onCancel} className="border border-[#333] text-gray-400 hover:text-white px-4 py-2.5 rounded-lg text-sm transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Card de equipo registrado ─────────────────────────────────────────────────
function EquipoCard({
  equipo, token, onUpdated, onDeleted,
}: {
  equipo: EquipoProveedor;
  token: string;
  onUpdated: (e: EquipoProveedor) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(data: typeof EMPTY_FORM) {
    setSaving(true);
    const res = await fetch(`/api/portal/proveedor/${token}/equipos/${equipo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) { onUpdated(d.equipo); setEditing(false); }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este equipo del registro?")) return;
    setDeleting(true);
    await fetch(`/api/portal/proveedor/${token}/equipos/${equipo.id}`, { method: "DELETE" });
    onDeleted(equipo.id);
  }

  if (editing) {
    return (
      <div className="bg-[#111] border border-[#B3985B]/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <p className="text-white font-semibold text-sm">Editando — {equipo.descripcion}</p>
        </div>
        <EquipoForm
          initial={{
            categoria: equipo.categoria,
            descripcion: equipo.descripcion,
            marca: equipo.marca ?? "",
            modelo: equipo.modelo ?? "",
            serialNum: equipo.serialNum ?? "",
            anioFabricacion: equipo.anioFabricacion ? String(equipo.anioFabricacion) : "",
            cantidad: String(equipo.cantidad),
            condicion: equipo.condicion,
            disponibilidad: equipo.disponibilidad,
            potenciaW: equipo.potenciaW ? String(equipo.potenciaW) : "",
            voltaje: equipo.voltaje ?? "",
            amperaje: equipo.amperaje ? String(equipo.amperaje) : "",
            pesoKg: equipo.pesoKg ? String(equipo.pesoKg) : "",
            dimensiones: equipo.dimensiones ?? "",
            incluyeCase: equipo.incluyeCase,
            tiempoSetupMin: equipo.tiempoSetupMin ? String(equipo.tiempoSetupMin) : "",
            precioDia: equipo.precioDia ? String(equipo.precioDia) : "",
            precioEventoFull: equipo.precioEventoFull ? String(equipo.precioEventoFull) : "",
            precioMinimoEvent: equipo.precioMinimoEvent ? String(equipo.precioMinimoEvent) : "",
            notas: equipo.notas ?? "",
            fotosUrls: equipo.fotosUrls ?? "",
            fichaTecnicaUrl: equipo.fichaTecnicaUrl ?? "",
          }}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className={`bg-[#111] border rounded-2xl p-5 ${equipo.aprobado ? "border-green-700/40" : "border-[#1e1e1e]"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B3985B]/15 text-[#B3985B] uppercase tracking-wide">
              {catLabel(equipo.categoria)}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${condColor(equipo.condicion)}`}>
              {condLabel(equipo.condicion)}
            </span>
            {equipo.aprobado && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/20 border border-green-700/40 text-green-400 font-medium">
                ✓ Verificado
              </span>
            )}
          </div>
          <p className="text-white font-semibold mt-2 text-base">{equipo.descripcion}</p>
          {(equipo.marca || equipo.modelo) && (
            <p className="text-gray-400 text-sm mt-0.5">
              {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-white">{equipo.cantidad}</p>
          <p className="text-gray-600 text-[10px]">unidad{equipo.cantidad !== 1 ? "es" : ""}</p>
          <p className={`text-xs font-medium mt-1 ${dispColor(equipo.disponibilidad)}`}>
            {DISPONIBILIDADES.find(d => d.value === equipo.disponibilidad)?.label ?? equipo.disponibilidad}
          </p>
        </div>
      </div>

      {/* Specs grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {equipo.potenciaW && (
          <div className="bg-[#0d0d0d] rounded-lg p-2.5 text-center">
            <p className="text-white text-sm font-bold">{equipo.potenciaW}W</p>
            <p className="text-gray-600 text-[10px] mt-0.5">Potencia</p>
          </div>
        )}
        {equipo.voltaje && (
          <div className="bg-[#0d0d0d] rounded-lg p-2.5 text-center">
            <p className="text-white text-sm font-bold">{equipo.voltaje}V</p>
            <p className="text-gray-600 text-[10px] mt-0.5">Voltaje</p>
          </div>
        )}
        {equipo.pesoKg && (
          <div className="bg-[#0d0d0d] rounded-lg p-2.5 text-center">
            <p className="text-white text-sm font-bold">{equipo.pesoKg}kg</p>
            <p className="text-gray-600 text-[10px] mt-0.5">Peso</p>
          </div>
        )}
        {equipo.tiempoSetupMin && (
          <div className="bg-[#0d0d0d] rounded-lg p-2.5 text-center">
            <p className="text-white text-sm font-bold">{equipo.tiempoSetupMin}min</p>
            <p className="text-gray-600 text-[10px] mt-0.5">Setup</p>
          </div>
        )}
      </div>

      {/* Precios */}
      {(equipo.precioDia || equipo.precioEventoFull || equipo.precioMinimoEvent) && (
        <div className="flex gap-4 flex-wrap mb-4 pb-4 border-b border-[#1a1a1a]">
          {equipo.precioDia && (
            <div>
              <p className="text-[#B3985B] text-sm font-bold">{fmt(equipo.precioDia)}</p>
              <p className="text-gray-600 text-[10px]">por día</p>
            </div>
          )}
          {equipo.precioEventoFull && (
            <div>
              <p className="text-[#B3985B] text-sm font-bold">{fmt(equipo.precioEventoFull)}</p>
              <p className="text-gray-600 text-[10px]">evento completo</p>
            </div>
          )}
          {equipo.precioMinimoEvent && (
            <div>
              <p className="text-white text-sm font-semibold">{fmt(equipo.precioMinimoEvent)}</p>
              <p className="text-gray-600 text-[10px]">precio mínimo</p>
            </div>
          )}
        </div>
      )}

      {/* Extras */}
      <div className="flex flex-wrap gap-3 mb-4">
        {equipo.incluyeCase && (
          <span className="text-[10px] px-2 py-0.5 bg-[#1a1a1a] text-gray-300 rounded-full">🧳 Incluye case</span>
        )}
        {equipo.dimensiones && (
          <span className="text-[10px] px-2 py-0.5 bg-[#1a1a1a] text-gray-400 rounded-full">📐 {equipo.dimensiones}</span>
        )}
        {equipo.serialNum && (
          <span className="text-[10px] px-2 py-0.5 bg-[#1a1a1a] text-gray-400 rounded-full">SN: {equipo.serialNum}</span>
        )}
        {equipo.anioFabricacion && (
          <span className="text-[10px] px-2 py-0.5 bg-[#1a1a1a] text-gray-400 rounded-full">{equipo.anioFabricacion}</span>
        )}
      </div>

      {equipo.notas && (
        <p className="text-gray-400 text-xs mb-4 italic">"{equipo.notas}"</p>
      )}

      {(equipo.fotosUrls || equipo.fichaTecnicaUrl) && (
        <div className="flex gap-3 mb-4">
          {equipo.fotosUrls && (
            <a href={equipo.fotosUrls} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#B3985B] hover:underline">📷 Ver fotos →</a>
          )}
          {equipo.fichaTecnicaUrl && (
            <a href={equipo.fichaTecnicaUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#B3985B] hover:underline">📄 Ficha técnica →</a>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)}
          className="text-xs border border-[#333] text-gray-400 hover:text-white hover:border-[#444] px-3 py-1.5 rounded-lg transition-colors">
          Editar
        </button>
        <button onClick={handleDelete} disabled={deleting}
          className="text-xs border border-red-800/40 text-red-500 hover:bg-red-900/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
          {deleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function PortalProveedorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("TODAS");

  useEffect(() => {
    fetch(`/api/portal/proveedor/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else { setProveedor(d.proveedor); }
        setLoading(false);
      })
      .catch(() => { setError("No se pudo cargar el portal"); setLoading(false); });
  }, [token]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave(data: typeof EMPTY_FORM) {
    setSaving(true);
    const res = await fetch(`/api/portal/proveedor/${token}/equipos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      setProveedor(prev => prev ? { ...prev, equiposPortal: [...prev.equiposPortal, d.equipo] } : prev);
      setShowForm(false);
      showToast("Equipo registrado correctamente");
    }
  }

  function handleUpdated(equipo: EquipoProveedor) {
    setProveedor(prev => prev ? {
      ...prev,
      equiposPortal: prev.equiposPortal.map(e => e.id === equipo.id ? equipo : e),
    } : prev);
    showToast("Equipo actualizado");
  }

  function handleDeleted(id: string) {
    setProveedor(prev => prev ? {
      ...prev,
      equiposPortal: prev.equiposPortal.filter(e => e.id !== id),
    } : prev);
    showToast("Equipo eliminado");
  }

  const equiposFiltrados = proveedor?.equiposPortal.filter(e =>
    filtro === "TODAS" ? true : e.categoria === filtro
  ) ?? [];

  const categoriasUsadas = proveedor
    ? [...new Set(proveedor.equiposPortal.map(e => e.categoria))].sort()
    : [];

  // ── Loading / Error ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Cargando portal...</p>
        </div>
      </div>
    );
  }

  if (error || !proveedor) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
        <div className="bg-[#111] border border-red-800/40 rounded-2xl p-8 max-w-md text-center">
          <p className="text-4xl mb-4">🔗</p>
          <p className="text-white font-semibold text-lg mb-2">Link inválido o expirado</p>
          <p className="text-gray-500 text-sm">Este enlace de registro no es válido. Solicita uno nuevo a Mainstage Pro.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#1a1a1a] border border-[#B3985B]/40 text-[#B3985B] text-sm px-4 py-3 rounded-xl shadow-2xl">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-0.5">Portal de proveedor</p>
            <h1 className="text-white text-lg font-bold">{proveedor.empresa ?? proveedor.nombre}</h1>
            {proveedor.empresa && <p className="text-gray-500 text-sm">{proveedor.nombre}</p>}
          </div>
          <div className="text-right">
            <p className="text-gray-600 text-xs">Mainstage Pro</p>
            <p className="text-gray-500 text-xs">{proveedor.giro ?? "Proveedor de equipo"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Intro */}
        <div className="bg-[#0f0f0f] border border-[#B3985B]/20 rounded-2xl p-5">
          <p className="text-white font-semibold mb-1">Registro de inventario de equipos</p>
          <p className="text-gray-400 text-sm">
            Usa este portal para registrar y mantener actualizado tu inventario de equipos. Cada equipo que registres
            estará disponible para que Mainstage Pro lo considere en sus producciones. Puedes agregar, editar o
            eliminar equipos en cualquier momento desde este link.
          </p>
          <div className="flex gap-4 mt-4 pt-4 border-t border-[#1a1a1a]">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{proveedor.equiposPortal.length}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">equipos registrados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">
                {proveedor.equiposPortal.filter(e => e.aprobado).length}
              </p>
              <p className="text-gray-600 text-[10px] mt-0.5">verificados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#B3985B]">
                {proveedor.equiposPortal.reduce((s, e) => s + e.cantidad, 0)}
              </p>
              <p className="text-gray-600 text-[10px] mt-0.5">unidades totales</p>
            </div>
          </div>
        </div>

        {/* Formulario nuevo equipo */}
        {showForm ? (
          <div className="bg-[#111] border border-[#B3985B]/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-base">Agregar nuevo equipo</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>
            <EquipoForm
              initial={EMPTY_FORM}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <span className="text-lg">+</span>
            Agregar equipo al inventario
          </button>
        )}

        {/* Lista de equipos */}
        {proveedor.equiposPortal.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold">Mi inventario</h2>
              {/* Filtro por categoría */}
              {categoriasUsadas.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setFiltro("TODAS")}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors ${filtro === "TODAS" ? "bg-[#B3985B] text-black" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>
                    Todas
                  </button>
                  {categoriasUsadas.map(c => (
                    <button key={c} onClick={() => setFiltro(c)}
                      className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors ${filtro === c ? "bg-[#B3985B] text-black" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>
                      {catLabel(c)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {equiposFiltrados.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">Sin equipos en esta categoría</p>
            ) : (
              <div className="space-y-3">
                {equiposFiltrados.map(equipo => (
                  <EquipoCard
                    key={equipo.id}
                    equipo={equipo}
                    token={token}
                    onUpdated={handleUpdated}
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-gray-700 text-xs">
            Portal de registro · Mainstage Pro · Este enlace es exclusivo para {proveedor.empresa ?? proveedor.nombre}
          </p>
        </div>
      </div>
    </div>
  );
}
