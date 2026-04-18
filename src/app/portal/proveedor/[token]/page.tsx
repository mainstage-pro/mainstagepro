"use client";

import { useEffect, useState, use } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface EquipoProveedor {
  id: string;
  categoria: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  anioFabricacion: number | null;
  cantidad: number;
  potenciaW: number | null;
  voltaje: string | null;
  amperaje: number | null;
  pesoKg: number | null;
  dimensiones: string | null;
  incluyeCase: boolean;
  tiempoSetupMin: number | null;
  precioPublico: number | null;
  precioMainstage: number | null;
  notas: string | null;
  fotosUrls: string | null;
  fichaTecnicaUrl: string | null;
  aprobado: boolean;
  importadoEquipoId: string | null;
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

const VOLTAJES = ["110V", "220V", "110/220V"];

const EMPTY_FORM = {
  categoria: "AUDIO",
  descripcion: "",
  marca: "",
  modelo: "",
  anioFabricacion: "",
  cantidad: "1",
  potenciaW: "",
  voltaje: "",
  amperaje: "",
  pesoKg: "",
  dimensiones: "",
  incluyeCase: false as boolean,
  tiempoSetupMin: "",
  precioPublico: "",
  precioMainstage: "",
  notas: "",
  fotosUrls: "",
  fichaTecnicaUrl: "",
};

type FormData = typeof EMPTY_FORM;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

function catLabel(v: string) { return CATEGORIAS.find(c => c.value === v)?.label ?? v; }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      {children}
      {hint && <p className="text-gray-600 text-[10px] mt-1">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B] placeholder:text-gray-700" />
  );
}

// ─── Formulario ───────────────────────────────────────────────────────────────
function EquipoForm({ initial, onSave, onCancel, saving }: {
  initial: FormData;
  onSave: (data: FormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-7">

      {/* ── 1. Datos del equipo ── */}
      <div>
        <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <span>1</span><span className="w-px h-3 bg-[#B3985B]/40 inline-block"/><span>Datos del equipo</span>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoría *">
            <select value={form.categoria} onChange={e => set("categoria", e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]">
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Cantidad *" hint="Número de unidades idénticas que ofreces">
            <TextInput type="number" value={form.cantidad} onChange={v => set("cantidad", v)} placeholder="1" />
          </Field>
          <div className="col-span-2">
            <Field label="Descripción del equipo *" hint='Sé específico: "Subwoofer de 18", consola de mezcla 32 canales, LED moving head 7x40W..."'>
              <TextInput value={form.descripcion} onChange={v => set("descripcion", v)}
                placeholder='Ej: Bocina de línea vertical, Consola digital 32 ch, Moving Head Beam 230W...' />
            </Field>
          </div>
          <Field label="Marca" >
            <TextInput value={form.marca} onChange={v => set("marca", v)} placeholder="Yamaha, Martin, L-Acoustics..." />
          </Field>
          <Field label="Modelo">
            <TextInput value={form.modelo} onChange={v => set("modelo", v)} placeholder="CL5, MAC Quantum, K2..." />
          </Field>
          <Field label="Año de fabricación" hint="Opcional">
            <TextInput type="number" value={form.anioFabricacion} onChange={v => set("anioFabricacion", v)}
              placeholder={String(new Date().getFullYear())} />
          </Field>
        </div>
      </div>

      {/* ── 2. Especificaciones técnicas ── */}
      <div>
        <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
          <span>2</span><span className="w-px h-3 bg-[#B3985B]/40 inline-block"/><span>Especificaciones técnicas</span>
        </p>
        <p className="text-gray-600 text-xs mb-4">Opcional — entre más completa la info, más fácil es incluirlo en producciones</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Potencia (W)">
            <TextInput type="number" value={form.potenciaW} onChange={v => set("potenciaW", v)} placeholder="0" />
          </Field>
          <Field label="Voltaje">
            <select value={form.voltaje} onChange={e => set("voltaje", e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]">
              <option value="">— Sin especificar —</option>
              {VOLTAJES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Amperaje (A)">
            <TextInput type="number" value={form.amperaje} onChange={v => set("amperaje", v)} placeholder="0" />
          </Field>
          <Field label="Peso (kg)">
            <TextInput type="number" value={form.pesoKg} onChange={v => set("pesoKg", v)} placeholder="0" />
          </Field>
          <Field label="Dimensiones">
            <TextInput value={form.dimensiones} onChange={v => set("dimensiones", v)} placeholder="60×40×20 cm" />
          </Field>
          <Field label="Tiempo de setup (min)">
            <TextInput type="number" value={form.tiempoSetupMin} onChange={v => set("tiempoSetupMin", v)} placeholder="0" />
          </Field>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => set("incluyeCase", !form.incluyeCase)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.incluyeCase ? "bg-[#B3985B]" : "bg-[#2a2a2a]"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.incluyeCase ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-gray-300">Incluye case / flight case</span>
          </label>
        </div>
      </div>

      {/* ── 3. Precios ── */}
      <div>
        <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
          <span>3</span><span className="w-px h-3 bg-[#B3985B]/40 inline-block"/><span>Precios de referencia (MXN / evento)</span>
        </p>
        <p className="text-gray-600 text-xs mb-4">Precios por unidad para un evento completo. Nos ayudan a cotizar correctamente.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Precio sugerido al público" hint="Lo que tú cobras normalmente a tus clientes finales">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input type="number" min="0" value={form.precioPublico} onChange={e => set("precioPublico", e.target.value)}
                placeholder="0"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg pl-6 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </Field>
          <Field label="Precio a Mainstage" hint="El precio especial que nos ofreces a nosotros como cliente frecuente">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B3985B] text-sm">$</span>
              <input type="number" min="0" value={form.precioMainstage} onChange={e => set("precioMainstage", e.target.value)}
                placeholder="0"
                className="w-full bg-[#0d0d0d] border border-[#B3985B]/30 rounded-lg pl-6 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </Field>
        </div>
      </div>

      {/* ── 4. Documentación ── */}
      <div>
        <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <span>4</span><span className="w-px h-3 bg-[#B3985B]/40 inline-block"/><span>Documentación y notas</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Fotos (link)" hint="Google Drive, Dropbox, álbum de fotos...">
            <TextInput type="url" value={form.fotosUrls} onChange={v => set("fotosUrls", v)}
              placeholder="https://drive.google.com/..." />
          </Field>
          <Field label="Ficha técnica (link)" hint="PDF del fabricante, manual, especificaciones...">
            <TextInput type="url" value={form.fichaTecnicaUrl} onChange={v => set("fichaTecnicaUrl", v)}
              placeholder="https://..." />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notas adicionales" hint="Condiciones, accesorios incluidos, operador requerido, restricciones...">
            <textarea value={form.notas} onChange={e => set("notas", e.target.value)} rows={3}
              placeholder="Ej: Incluye cables XLR, requiere tierra física, operador incluido, no disponible en días festivos..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none placeholder:text-gray-700" />
          </Field>
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

// ─── Card de equipo ────────────────────────────────────────────────────────────
function EquipoCard({ equipo, token, onUpdated, onDeleted }: {
  equipo: EquipoProveedor;
  token: string;
  onUpdated: (e: EquipoProveedor) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function toForm(): FormData {
    return {
      categoria: equipo.categoria,
      descripcion: equipo.descripcion,
      marca: equipo.marca ?? "",
      modelo: equipo.modelo ?? "",
      anioFabricacion: equipo.anioFabricacion ? String(equipo.anioFabricacion) : "",
      cantidad: String(equipo.cantidad),
      potenciaW: equipo.potenciaW ? String(equipo.potenciaW) : "",
      voltaje: equipo.voltaje ?? "",
      amperaje: equipo.amperaje ? String(equipo.amperaje) : "",
      pesoKg: equipo.pesoKg ? String(equipo.pesoKg) : "",
      dimensiones: equipo.dimensiones ?? "",
      incluyeCase: equipo.incluyeCase,
      tiempoSetupMin: equipo.tiempoSetupMin ? String(equipo.tiempoSetupMin) : "",
      precioPublico: equipo.precioPublico ? String(equipo.precioPublico) : "",
      precioMainstage: equipo.precioMainstage ? String(equipo.precioMainstage) : "",
      notas: equipo.notas ?? "",
      fotosUrls: equipo.fotosUrls ?? "",
      fichaTecnicaUrl: equipo.fichaTecnicaUrl ?? "",
    };
  }

  async function handleSave(data: FormData) {
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
    if (!confirmingDelete) { setConfirmingDelete(true); return; }
    setDeleting(true);
    await fetch(`/api/portal/proveedor/${token}/equipos/${equipo.id}`, { method: "DELETE" });
    onDeleted(equipo.id);
  }

  if (editing) {
    return (
      <div className="bg-[#111] border border-[#B3985B]/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <p className="text-white font-semibold text-sm">Editando — {equipo.descripcion}</p>
          <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <EquipoForm initial={toForm()} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} />
      </div>
    );
  }

  const hasSpecs = equipo.potenciaW || equipo.voltaje || equipo.pesoKg || equipo.tiempoSetupMin;

  return (
    <div className={`bg-[#111] border rounded-2xl p-5 ${equipo.aprobado ? "border-green-700/30" : "border-[#1e1e1e]"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B3985B]/15 text-[#B3985B] uppercase tracking-wide">
              {catLabel(equipo.categoria)}
            </span>
            {equipo.aprobado && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/20 border border-green-700/40 text-green-400 font-medium">
                ✓ Verificado · en catálogo Mainstage
              </span>
            )}
          </div>
          <p className="text-white font-semibold text-base leading-tight">{equipo.descripcion}</p>
          {(equipo.marca || equipo.modelo) && (
            <p className="text-gray-400 text-sm mt-0.5">
              {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-white tabular-nums">{equipo.cantidad}</p>
          <p className="text-gray-600 text-[10px]">unidad{equipo.cantidad !== 1 ? "es" : ""}</p>
          {equipo.anioFabricacion && (
            <p className="text-gray-600 text-[10px] mt-0.5">{equipo.anioFabricacion}</p>
          )}
        </div>
      </div>

      {/* Precios */}
      {(equipo.precioPublico || equipo.precioMainstage) && (
        <div className="flex gap-6 mb-3 pb-3 border-b border-[#1a1a1a]">
          {equipo.precioPublico && (
            <div>
              <p className="text-gray-300 text-sm font-semibold">{fmt(equipo.precioPublico)}</p>
              <p className="text-gray-600 text-[10px]">precio público</p>
            </div>
          )}
          {equipo.precioMainstage && (
            <div>
              <p className="text-[#B3985B] text-sm font-bold">{fmt(equipo.precioMainstage)}</p>
              <p className="text-gray-600 text-[10px]">precio a Mainstage</p>
            </div>
          )}
        </div>
      )}

      {/* Specs */}
      {hasSpecs && (
        <div className="flex flex-wrap gap-2 mb-3">
          {equipo.potenciaW && <span className="text-[11px] bg-[#0d0d0d] text-gray-300 px-2.5 py-1 rounded-lg">{equipo.potenciaW}W</span>}
          {equipo.voltaje && <span className="text-[11px] bg-[#0d0d0d] text-gray-300 px-2.5 py-1 rounded-lg">{equipo.voltaje}</span>}
          {equipo.amperaje && <span className="text-[11px] bg-[#0d0d0d] text-gray-300 px-2.5 py-1 rounded-lg">{equipo.amperaje}A</span>}
          {equipo.pesoKg && <span className="text-[11px] bg-[#0d0d0d] text-gray-300 px-2.5 py-1 rounded-lg">{equipo.pesoKg}kg</span>}
          {equipo.dimensiones && <span className="text-[11px] bg-[#0d0d0d] text-gray-300 px-2.5 py-1 rounded-lg">{equipo.dimensiones}</span>}
          {equipo.tiempoSetupMin && <span className="text-[11px] bg-[#0d0d0d] text-gray-400 px-2.5 py-1 rounded-lg">Setup {equipo.tiempoSetupMin}min</span>}
          {equipo.incluyeCase && <span className="text-[11px] bg-[#0d0d0d] text-gray-300 px-2.5 py-1 rounded-lg">🧳 Case incluido</span>}
        </div>
      )}

      {equipo.notas && (
        <p className="text-gray-500 text-xs mb-3 italic">"{equipo.notas}"</p>
      )}

      {(equipo.fotosUrls || equipo.fichaTecnicaUrl) && (
        <div className="flex gap-3 mb-3">
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
      <div className="flex gap-2 pt-2 border-t border-[#1a1a1a]">
        <button onClick={() => setEditing(true)}
          className="text-xs border border-[#333] text-gray-400 hover:text-white hover:border-[#444] px-3 py-1.5 rounded-lg transition-colors">
          Editar
        </button>
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">¿Eliminar este equipo?</span>
            <button onClick={handleDelete} disabled={deleting}
              className="text-xs border border-red-600 text-red-400 hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              {deleting ? "Eliminando..." : "Confirmar"}
            </button>
            <button onClick={() => setConfirmingDelete(false)}
              className="text-xs text-gray-500 hover:text-white px-2 py-1.5 rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={handleDelete}
            className="text-xs border border-red-800/40 text-red-500 hover:bg-red-900/10 px-3 py-1.5 rounded-lg transition-colors">
            Eliminar
          </button>
        )}
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
        if (d.error) setError(d.error);
        else setProveedor(d.proveedor);
        setLoading(false);
      })
      .catch(() => { setError("No se pudo cargar el portal"); setLoading(false); });
  }, [token]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500); }

  async function handleSave(data: FormData) {
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
      ...prev, equiposPortal: prev.equiposPortal.map(e => e.id === equipo.id ? equipo : e),
    } : prev);
    showToast("Equipo actualizado");
  }

  function handleDeleted(id: string) {
    setProveedor(prev => prev ? {
      ...prev, equiposPortal: prev.equiposPortal.filter(e => e.id !== id),
    } : prev);
    showToast("Equipo eliminado");
  }

  const equiposFiltrados = proveedor?.equiposPortal.filter(e =>
    filtro === "TODAS" || e.categoria === filtro
  ) ?? [];
  const categoriasUsadas = proveedor
    ? [...new Set(proveedor.equiposPortal.map(e => e.categoria))].sort()
    : [];

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Cargando portal...</p>
      </div>
    </div>
  );

  if (error || !proveedor) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
      <div className="bg-[#111] border border-red-800/40 rounded-2xl p-8 max-w-md text-center">
        <p className="text-4xl mb-4">🔗</p>
        <p className="text-white font-semibold text-lg mb-2">Link inválido o expirado</p>
        <p className="text-gray-500 text-sm">Este enlace de registro no es válido. Solicita uno nuevo a Mainstage Pro.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808]">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#1a1a1a] border border-[#B3985B]/40 text-[#B3985B] text-sm px-4 py-3 rounded-xl shadow-2xl">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-[#1a1a1a]">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest mb-0.5">Portal de inventario · Mainstage Pro</p>
            <h1 className="text-white text-lg font-bold">{proveedor.empresa ?? proveedor.nombre}</h1>
            {proveedor.empresa && <p className="text-gray-500 text-sm">{proveedor.nombre}</p>}
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-2xl font-bold text-white">{proveedor.equiposPortal.length}</p>
            <p className="text-gray-600 text-[10px]">equipo{proveedor.equiposPortal.length !== 1 ? "s" : ""} registrado{proveedor.equiposPortal.length !== 1 ? "s" : ""}</p>
            {proveedor.equiposPortal.filter(e => e.aprobado).length > 0 && (
              <p className="text-green-500 text-[10px]">{proveedor.equiposPortal.filter(e => e.aprobado).length} verificado{proveedor.equiposPortal.filter(e => e.aprobado).length !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Intro */}
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5">
          <p className="text-white font-semibold mb-1">Registro de inventario de equipos</p>
          <p className="text-gray-500 text-sm leading-relaxed">
            Registra los equipos que tienes disponibles para renta. Mientras más completa sea la información,
            más fácil es incluirlos en nuestras cotizaciones y producciones. Puedes agregar, editar o eliminar
            equipos en cualquier momento desde este link.
          </p>
        </div>

        {/* Formulario nuevo equipo */}
        {showForm ? (
          <div className="bg-[#111] border border-[#B3985B]/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-base">Agregar nuevo equipo</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
            </div>
            <EquipoForm initial={EMPTY_FORM} onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} />
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <span className="text-lg">+</span>
            Agregar equipo al inventario
          </button>
        )}

        {/* Lista */}
        {proveedor.equiposPortal.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-white font-bold">Mi inventario</h2>
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
                  <EquipoCard key={equipo.id} equipo={equipo} token={token} onUpdated={handleUpdated} onDeleted={handleDeleted} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="text-center pt-4 pb-8">
          <p className="text-gray-700 text-xs">Mainstage Pro · Portal de proveedores</p>
        </div>
      </div>
    </div>
  );
}
