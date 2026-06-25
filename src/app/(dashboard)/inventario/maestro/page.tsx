"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Modal } from "@/components/Modal";

type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  estado: string;
  activo: boolean;
  cantidadTotal: number;
  precioRenta: number;
  costoProveedor: number | null;
  costoInternoEstimado: number | null;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; empresa: string | null } | null;
  imagenUrl: string | null;
  notas: string | null;
  amperajeRequerido: number | null;
  voltajeRequerido: string | null;
  _count: { accesorios: number };
  proveedoresPrecios: { precio: number; notas: string | null; proveedor: { id: string; nombre: string; empresa: string | null; prioridad: number } }[];
};

type Categoria = { id: string; nombre: string; orden: number };
type Proveedor = { id: string; nombre: string; empresa: string | null; prioridad: number };

type Kpis = {
  totalEquipos: number;
  totalPropios: number;
  totalExternos: number;
  valorTotalActivo: number;
  potencialRentaMensual: number;
};

type Form = {
  descripcion: string; marca: string; modelo: string; tipo: string;
  categoriaId: string; cantidadTotal: string; estado: string;
  precioRenta: string; costoProveedor: string; costoInternoEstimado: string;
  proveedorDefaultId: string; notas: string;
  amperajeRequerido: string; voltajeRequerido: string;
};

const FORM_EMPTY: Form = {
  descripcion: "", marca: "", modelo: "", tipo: "PROPIO",
  categoriaId: "", cantidadTotal: "1", estado: "ACTIVO",
  precioRenta: "0", costoProveedor: "", costoInternoEstimado: "",
  proveedorDefaultId: "", notas: "",
  amperajeRequerido: "", voltajeRequerido: "",
};

function fmx(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

async function compressImage(file: File, maxPx = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/20 text-green-400",
  EN_MANTENIMIENTO: "bg-yellow-900/20 text-yellow-400",
  DADO_DE_BAJA: "bg-red-900/20 text-red-400",
};
const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo", EN_MANTENIMIENTO: "En mantenimiento", DADO_DE_BAJA: "Dado de baja",
};

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function FInput({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50 ${className}`} />
  );
}

type FormPanelProps = {
  panel: "nuevo" | string | null;
  equipos: Equipo[];
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  imagen: string | null;
  saving: boolean;
  categorias: Categoria[];
  proveedores: Proveedor[];
  imgRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  // Supplier management
  showAddProveedor: boolean;
  setShowAddProveedor: (v: boolean) => void;
  newProveedorId: string;
  setNewProveedorId: (v: string) => void;
  newProveedorPrecio: string;
  setNewProveedorPrecio: (v: string) => void;
  newProveedorNotas: string;
  setNewProveedorNotas: (v: string) => void;
  savingProveedor: boolean;
  onAddProveedor: (equipoId: string) => void;
  onRemoveProveedor: (equipoId: string, proveedorId: string) => void;
};

const inputCls = "w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50";
const labelCls = "block text-[10px] text-gray-500 uppercase tracking-wider mb-1";

function FormPanel({ panel, equipos, form, setForm, imagen, saving, categorias, proveedores, imgRef, onClose, onImageChange, onSave,
  showAddProveedor, setShowAddProveedor, newProveedorId, setNewProveedorId, newProveedorPrecio, setNewProveedorPrecio,
  newProveedorNotas, setNewProveedorNotas, savingProveedor, onAddProveedor, onRemoveProveedor,
}: FormPanelProps) {
  const equipoActual = panel !== "nuevo" ? equipos.find(e => e.id === panel) : null;
  return (
    <div>
      {/* Clonar de inventario propio — solo al crear externo */}
      {panel === "nuevo" && form.tipo === "EXTERNO" && (
        <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-3 mb-3">
          <p className="text-xs text-gray-500 mb-2">¿Basado en un equipo de tu inventario?</p>
          <select
            className={inputCls}
            onChange={e => {
              const eq = equipos.find(eq => eq.id === e.target.value)
              if (eq) setForm(p => ({ ...p, descripcion: eq.descripcion, marca: eq.marca ?? '', modelo: eq.modelo ?? '' }))
            }}
            defaultValue=""
          >
            <option value="">Crear desde cero</option>
            {equipos.filter(eq => eq.tipo === "PROPIO").map(eq => (
              <option key={eq.id} value={eq.id}>{eq.descripcion} {eq.marca} {eq.modelo}</option>
            ))}
          </select>
          <p className="text-[10px] text-gray-600 mt-1.5">Solo copia marca y modelo. No afecta tu inventario propio.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Col 1 — descripción + imagen */}
        <div className="space-y-3">
          <FieldGroup label="Descripción *">
            <FInput value={form.descripcion} onChange={v => setForm(p => ({ ...p, descripcion: v }))} placeholder="Ej. Subwoofer 18'' RCF" />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup label="Marca">
              <FInput value={form.marca} onChange={v => setForm(p => ({ ...p, marca: v }))} placeholder="RCF" />
            </FieldGroup>
            <FieldGroup label="Modelo">
              <FInput value={form.modelo} onChange={v => setForm(p => ({ ...p, modelo: v }))} placeholder="SUB 9004-AS" />
            </FieldGroup>
          </div>
          <FieldGroup label="Imagen">
            <div className="flex items-center gap-3">
              {(imagen || equipoActual?.imagenUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagen ?? equipoActual?.imagenUrl ?? ""} alt="" className="w-12 h-12 object-contain rounded bg-[#111] p-1 shrink-0" />
              )}
              <div>
                <input ref={imgRef} type="file" accept="image/*" onChange={onImageChange} className="hidden" />
                <button onClick={() => imgRef.current?.click()}
                  className="text-xs px-3 py-1.5 border border-[#333] rounded-lg text-[#9ca3af] hover:text-white hover:border-[#B3985B]/50 transition-colors">
                  {imagen || equipoActual?.imagenUrl ? "Cambiar foto" : "Subir foto"}
                </button>
                {imagen && <p className="text-[10px] text-[#B3985B] mt-1">Nueva imagen lista</p>}
              </div>
            </div>
          </FieldGroup>
          <FieldGroup label="Notas">
            <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50 resize-none"
              placeholder="Notas internas..." />
          </FieldGroup>
        </div>

        {/* Col 2 — clasificación */}
        <div className="space-y-3">
          <FieldGroup label="Categoría *">
            <select value={form.categoriaId} onChange={e => setForm(p => ({ ...p, categoriaId: e.target.value }))}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50">
              <option value="">— Selecciona —</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup label="Tipo">
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50">
                <option value="PROPIO">Propio</option>
                <option value="EXTERNO">Externo</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Estado">
              <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50">
                <option value="ACTIVO">Activo</option>
                <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                <option value="DADO_DE_BAJA">Dado de baja</option>
              </select>
            </FieldGroup>
          </div>
          <FieldGroup label="Cantidad total">
            <FInput type="number" value={form.cantidadTotal} onChange={v => setForm(p => ({ ...p, cantidadTotal: v }))} />
          </FieldGroup>
          <FieldGroup label="Proveedor por defecto">
            <select value={form.proveedorDefaultId} onChange={e => setForm(p => ({ ...p, proveedorDefaultId: e.target.value }))}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50">
              <option value="">— Ninguno —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.empresa ? ` · ${p.empresa}` : ""}</option>)}
            </select>
          </FieldGroup>

          {/* Proveedores y precios — solo en modo edición de EXTERNO */}
          {equipoActual && equipoActual.tipo === "EXTERNO" && (
            <div>
              <label className={labelCls}>Proveedores y precios</label>
              <div className="space-y-1.5 mb-2">
                {(equipoActual.proveedoresPrecios ?? []).map(pp => (
                  <div key={pp.proveedor.id} className="flex items-center justify-between bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      {pp.proveedor.prioridad > 0 && <span className="text-yellow-500 text-[10px]">{'⭐'.repeat(pp.proveedor.prioridad).slice(0, pp.proveedor.prioridad)}</span>}
                      <span className="text-xs text-white">{pp.proveedor.nombre}</span>
                      {pp.proveedor.empresa && <span className="text-[10px] text-gray-500">{pp.proveedor.empresa}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#B3985B] font-semibold">${pp.precio.toLocaleString('es-MX')}/día</span>
                      <button type="button"
                        onClick={() => onRemoveProveedor(equipoActual.id, pp.proveedor.id)}
                        className="text-[#333] hover:text-red-400 text-xs transition-colors">×</button>
                    </div>
                  </div>
                ))}
                {(equipoActual.proveedoresPrecios ?? []).length === 0 && (
                  <p className="text-[11px] text-gray-700">Sin proveedores registrados para este equipo.</p>
                )}
              </div>
              {!showAddProveedor ? (
                <button type="button" onClick={() => setShowAddProveedor(true)}
                  className="flex items-center gap-1.5 text-xs text-[#B3985B]/70 hover:text-[#B3985B] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Agregar proveedor
                </button>
              ) : (
                <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-3 space-y-2">
                  <select value={newProveedorId} onChange={e => setNewProveedorId(e.target.value)} className={inputCls}>
                    <option value="">Selecciona proveedor...</option>
                    {proveedores.filter(p => !(equipoActual.proveedoresPrecios ?? []).some(pp => pp.proveedor.id === p.id)).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}{p.empresa ? ` — ${p.empresa}` : ''} {p.prioridad > 0 ? '⭐'.repeat(p.prioridad).slice(0, p.prioridad) : ''}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Precio/día $" value={newProveedorPrecio}
                      onChange={e => setNewProveedorPrecio(e.target.value)} className={`${inputCls} flex-1`} />
                    <input type="text" placeholder="Notas (opcional)" value={newProveedorNotas}
                      onChange={e => setNewProveedorNotas(e.target.value)} className={`${inputCls} flex-1`} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onAddProveedor(equipoActual.id)} disabled={savingProveedor}
                      className="flex-1 bg-[#B3985B] hover:bg-[#c9a96e] text-black text-xs font-semibold py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      {savingProveedor ? 'Guardando...' : 'Agregar'}
                    </button>
                    <button type="button" onClick={() => setShowAddProveedor(false)}
                      className="px-3 text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <FieldGroup label="Amperaje (A)">
              <FInput type="number" value={form.amperajeRequerido} onChange={v => setForm(p => ({ ...p, amperajeRequerido: v }))} placeholder="Ej. 15" />
            </FieldGroup>
            <FieldGroup label="Voltaje">
              <div className="flex gap-1">
                {([["", "—"], ["110", "110V"], ["220", "220V"], ["AMBOS", "Ambos"]] as [string, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, voltajeRequerido: val }))}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      form.voltajeRequerido === val
                        ? val === "" ? "bg-[#1a1a1a] border-[#333] text-gray-400" : "bg-[#B3985B]/15 border-[#B3985B]/60 text-[#C9A84C]"
                        : "bg-[#0d0d0d] border-[#2a2a2a] text-gray-600 hover:border-[#444] hover:text-gray-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FieldGroup>
          </div>
        </div>

        {/* Col 3 — financiero */}
        <div className="space-y-3">
          <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-4 space-y-3">
            <p className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold mb-1">Información financiera</p>
            <FieldGroup label="Precio de renta (al cliente)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                <FInput type="number" value={form.precioRenta} onChange={v => setForm(p => ({ ...p, precioRenta: v }))} className="pl-7" placeholder="0" />
              </div>
              <p className="text-[10px] text-[#555] mt-1">Precio que ve el cliente en cotizaciones</p>
            </FieldGroup>
            <FieldGroup label="Costo proveedor">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                <FInput type="number" value={form.costoProveedor} onChange={v => setForm(p => ({ ...p, costoProveedor: v }))} className="pl-7" placeholder="—" />
              </div>
              <p className="text-[10px] text-[#555] mt-1">Lo que cobramos al proveedor (equipo externo)</p>
            </FieldGroup>
            <FieldGroup label="Valor del activo">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                <FInput type="number" value={form.costoInternoEstimado} onChange={v => setForm(p => ({ ...p, costoInternoEstimado: v }))} className="pl-7" placeholder="—" />
              </div>
              <p className="text-[10px] text-[#555] mt-1">Costo de adquisición (equipo propio)</p>
            </FieldGroup>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-[#1a1a1a]">
        <button onClick={onSave} disabled={saving || !form.descripcion || !form.categoriaId}
          className="px-5 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold disabled:opacity-40 hover:bg-[#c4aa6b] transition-colors">
          {saving ? "Guardando..." : panel === "nuevo" ? "Crear equipo" : "Guardar cambios"}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function InventarioMaestroPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingInline, setSavingInline] = useState<string | null>(null); // equipoId

  // Edición inline — guarda un campo sin abrir el modal
  async function patchEquipo(id: string, campo: string, valor: string | number | null) {
    setSavingInline(id);
    try {
      const res = await fetch(`/api/equipos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      // Actualización optimista en el estado local
      setEquipos(prev => prev.map(e => e.id === id ? { ...e, [campo]: valor } : e));
    } finally {
      setSavingInline(null);
    }
  }

  // Supplier management state
  const [showAddProveedor, setShowAddProveedor] = useState(false);
  const [newProveedorId, setNewProveedorId] = useState('');
  const [newProveedorPrecio, setNewProveedorPrecio] = useState('');
  const [newProveedorNotas, setNewProveedorNotas] = useState('');
  const [savingProveedor, setSavingProveedor] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState<"" | "PROPIO" | "EXTERNO">("");
  const [filtroEstado, setFiltroEstado] = useState<"" | "ACTIVO" | "EN_MANTENIMIENTO" | "DADO_DE_BAJA">("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroInactivos, setFiltroInactivos] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [vista, setVista] = useState<"lista" | "grid">("lista");
  const [panel, setPanel] = useState<"nuevo" | string | null>(null); // "nuevo" | equipoId | null
  const [form, setForm] = useState<Form>(FORM_EMPTY);
  const [imagen, setImagen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filtroTipo) qs.set("tipo", filtroTipo);
    if (filtroEstado) qs.set("estado", filtroEstado);
    if (filtroCategoria) qs.set("categoriaId", filtroCategoria);
    if (filtroInactivos) qs.set("inactivos", "true");

    const [mRes, provRes] = await Promise.all([
      fetch(`/api/inventario/maestro?${qs}`),
      fetch("/api/proveedores"),
    ]);
    const [mData, provData] = await Promise.all([mRes.json(), provRes.json()]);
    setEquipos(mData.equipos ?? []);
    setCategorias(mData.categorias ?? []);
    setKpis(mData.kpis ?? null);
    setProveedores(provData.proveedores ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filtroTipo, filtroEstado, filtroCategoria, filtroInactivos]); // eslint-disable-line react-hooks/exhaustive-deps

  function abrirNuevo() {
    setForm({ ...FORM_EMPTY });
    setImagen(null);
    setPanel("nuevo");
  }

  function abrirEdit(e: Equipo) {
    setForm({
      descripcion: e.descripcion,
      marca: e.marca ?? "", modelo: e.modelo ?? "",
      tipo: e.tipo, categoriaId: e.categoria.id,
      cantidadTotal: String(e.cantidadTotal),
      estado: e.estado,
      precioRenta: String(e.precioRenta),
      costoProveedor: e.costoProveedor != null ? String(e.costoProveedor) : "",
      costoInternoEstimado: e.costoInternoEstimado != null ? String(e.costoInternoEstimado) : "",
      proveedorDefaultId: e.proveedorDefault?.id ?? "",
      notas: e.notas ?? "",
      amperajeRequerido: e.amperajeRequerido != null ? String(e.amperajeRequerido) : "",
      voltajeRequerido: e.voltajeRequerido != null ? String(e.voltajeRequerido) : "",
    });
    setImagen(null);
    setPanel(e.id);
  }

  function cerrarPanel() { setPanel(null); setImagen(null); }

  async function handleImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagen(await compressImage(file));
  }

  async function guardar() {
    if (!form.descripcion || !form.categoriaId) {
      toast.error("Descripción y categoría son requeridos");
      return;
    }
    setSaving(true);
    const body = {
      descripcion: form.descripcion,
      marca: form.marca || null, modelo: form.modelo || null,
      tipo: form.tipo, categoriaId: form.categoriaId,
      cantidadTotal: parseInt(form.cantidadTotal) || 1,
      estado: form.estado,
      precioRenta: form.precioRenta !== "" ? parseFloat(form.precioRenta) : 0,
      costoProveedor: form.costoProveedor !== "" ? form.costoProveedor : null,
      costoInternoEstimado: form.costoInternoEstimado !== "" ? form.costoInternoEstimado : null,
      proveedorDefaultId: form.proveedorDefaultId || null,
      notas: form.notas || null,
      amperajeRequerido: form.amperajeRequerido !== "" ? parseFloat(form.amperajeRequerido) : null,
      voltajeRequerido: form.voltajeRequerido !== "" ? form.voltajeRequerido : null,
      ...(imagen !== null ? { imagenUrl: imagen } : {}),
    };

    const url = panel === "nuevo" ? "/api/equipos" : `/api/equipos/${panel}`;
    const method = panel === "nuevo" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    toast.success(panel === "nuevo" ? "Equipo creado" : "Equipo actualizado");
    cerrarPanel();
    await load();
    setSaving(false);
  }

  async function eliminar(e: Equipo) {
    const ok = await confirm({
      message: `¿Eliminar permanentemente "${e.descripcion}"? Esta acción no se puede deshacer.`,
      danger: true, confirmText: "Eliminar",
    });
    if (!ok) return;
    setEliminando(e.id);
    const res = await fetch(`/api/equipos/${e.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(d.error ?? "No se pudo eliminar"); setEliminando(null); return; }
    toast.success("Equipo eliminado");
    if (panel === e.id) cerrarPanel();
    setEquipos(prev => prev.filter(x => x.id !== e.id));
    setEliminando(null);
  }

  const equiposFiltrados = useMemo(() => {
    if (!busqueda.trim()) return equipos;
    const q = busqueda.toLowerCase();
    return equipos.filter(e =>
      e.descripcion.toLowerCase().includes(q) ||
      (e.marca ?? "").toLowerCase().includes(q) ||
      (e.modelo ?? "").toLowerCase().includes(q) ||
      e.categoria.nombre.toLowerCase().includes(q)
    );
  }, [equipos, busqueda]);

  const porCategoria = useMemo(() =>
    categorias
      .map(cat => ({ cat, items: equiposFiltrados.filter(e => e.categoria.id === cat.id) }))
      .filter(g => g.items.length > 0),
    [categorias, equiposFiltrados]
  );

  const valorTotal = useMemo(() =>
    equiposFiltrados.filter(e => e.tipo === "PROPIO")
      .reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0),
    [equiposFiltrados]
  );

  async function handleAddProveedorPrecio(equipoId: string) {
    if (!newProveedorId || !newProveedorPrecio) return;
    setSavingProveedor(true);
    try {
      await fetch(`/api/equipos/${equipoId}/proveedores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proveedorId: newProveedorId, precio: Number(newProveedorPrecio), notas: newProveedorNotas || null }),
      });
      setShowAddProveedor(false);
      setNewProveedorId(''); setNewProveedorPrecio(''); setNewProveedorNotas('');
      // Refresh equipos
      const res = await fetch('/api/inventario/maestro');
      const d = await res.json();
      setEquipos(d.equipos ?? []);
    } catch { /* ignore */ }
    finally { setSavingProveedor(false); }
  }

  async function handleRemoveProveedorPrecio(equipoId: string, proveedorId: string) {
    await fetch(`/api/equipos/${equipoId}/proveedores/${proveedorId}`, { method: 'DELETE' });
    const res = await fetch('/api/inventario/maestro');
    const d = await res.json();
    setEquipos(d.equipos ?? []);
  }

  const formPanelProps: FormPanelProps = {
    panel, equipos, form, setForm, imagen, saving, categorias, proveedores, imgRef,
    onClose: cerrarPanel, onImageChange: handleImagen, onSave: guardar,
    showAddProveedor, setShowAddProveedor, newProveedorId, setNewProveedorId,
    newProveedorPrecio, setNewProveedorPrecio, newProveedorNotas, setNewProveedorNotas,
    savingProveedor, onAddProveedor: handleAddProveedorPrecio, onRemoveProveedor: handleRemoveProveedorPrecio,
  };

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventario maestro</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Fuente de verdad · precios, costos y valor del activo</p>
        </div>
        <button onClick={abrirNuevo}
          className="bg-[#B3985B] hover:bg-[#c4aa6b] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nuevo equipo
        </button>
      </div>

      {/* Modal nuevo/editar */}
      <Modal
        open={panel !== null}
        onClose={cerrarPanel}
        title={panel === "nuevo" ? "Nuevo equipo" : "Editar equipo"}
        maxWidth="max-w-5xl"
      >
        <FormPanel {...formPanelProps} />
      </Modal>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", animation: "fadeIn 0.15s ease" }}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "50%", width: 40, height: 40, color: "white", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="" onClick={e => e.stopPropagation()} draggable={false}
               style={{ maxWidth: "88vw", maxHeight: "82vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }} />
        </div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Total equipos</p>
            <p className="text-white text-2xl font-semibold">{kpis.totalEquipos}</p>
            <p className="text-[#444] text-[10px] mt-0.5">{kpis.totalPropios} propios · {kpis.totalExternos} externos</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Valor del inventario</p>
            <p className="text-[#B3985B] text-2xl font-semibold">{fmx(kpis.valorTotalActivo)}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Costo activo equipos propios</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Renta mensual potencial</p>
            <p className="text-green-400 text-2xl font-semibold">{fmx(kpis.potencialRentaMensual)}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Suma precio renta × cantidad</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Valor filtrado</p>
            <p className="text-white text-2xl font-semibold">{fmx(valorTotal)}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Propios en vista actual</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar equipo..."
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/40 w-44" />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
          <option value="">Tipo: todos</option>
          <option value="PROPIO">Propios</option>
          <option value="EXTERNO">Externos</option>
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
          <option value="">Estado: todos</option>
          <option value="ACTIVO">Activo</option>
          <option value="EN_MANTENIMIENTO">En mantenimiento</option>
          <option value="DADO_DE_BAJA">Dado de baja</option>
        </select>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
          <option value="">Categoría: todas</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[#6b7280] cursor-pointer">
          <input type="checkbox" checked={filtroInactivos} onChange={e => setFiltroInactivos(e.target.checked)} className="accent-[#B3985B]" />
          Incluir inactivos
        </label>
        <span className="text-xs text-[#444]">{equiposFiltrados.length} equipos</span>
        <div className="ml-auto flex gap-0.5 bg-[#111] border border-[#222] rounded-lg p-0.5">
          <button onClick={() => setVista("lista")} title="Vista lista"
            className={`p-1.5 rounded transition-colors ${vista === "lista" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <button onClick={() => setVista("grid")} title="Vista cuadrícula"
            className={`p-1.5 rounded transition-colors ${vista === "grid" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#111] rounded-lg animate-pulse" />)}
        </div>
      ) : equiposFiltrados.length === 0 ? (
        <div className="text-center py-16 text-[#333]">
          <p className="text-sm">Sin equipos con los filtros actuales.</p>
        </div>
      ) : vista === "grid" ? (

        /* ── Vista cuadrícula por categoría ── */
        <div className="space-y-8">
          {porCategoria.map(({ cat, items }) => (
            <div key={cat.id}>
              <h2 className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold mb-3 pb-2 border-b border-[#1a1a1a]">
                {cat.nombre} <span className="text-[#333] ml-1">({items.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {items.map(e => {
                  return (
                    <div key={e.id}
                      className="bg-[#111] border border-[#1a1a1a] hover:border-[#B3985B]/40 rounded-xl p-3 flex flex-col gap-2 transition-colors cursor-pointer group"
                      onClick={() => abrirEdit(e)}>
                      <div
                        className="aspect-square rounded-lg overflow-hidden bg-[#0d0d0d] flex items-center justify-center"
                        onClick={e.imagenUrl ? (ev => { ev.stopPropagation(); setLightboxUrl(e.imagenUrl!); }) : undefined}
                        style={e.imagenUrl ? { cursor: "zoom-in" } : undefined}
                      >
                        {e.imagenUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.imagenUrl} alt={e.descripcion} className="w-full h-full object-contain p-2" />
                        ) : (
                          <svg className="w-8 h-8 text-[#2a2a2a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium leading-snug group-hover:text-[#B3985B] transition-colors line-clamp-2">
                          {(e.marca || e.modelo) ? [e.marca, e.modelo].filter(Boolean).join(" · ") : e.descripcion}
                        </p>
                        {(e.marca || e.modelo) && (
                          <p className="text-[#555] text-[10px] truncate mt-0.5">{e.descripcion}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[#B3985B] text-xs font-semibold">
                          {e.precioRenta === 0 ? <span className="text-[#444]">Incluye</span> : fmx(e.precioRenta)}
                        </span>
                        <span className="text-sm font-bold text-white">×{e.cantidadTotal}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      ) : (

        /* ── Vista lista por categoría ── */
        <div className="space-y-6">
          {porCategoria.map(({ cat, items }) => {
            const catValor = items.filter(e => e.tipo === "PROPIO").reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0);
            const catRenta = items.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0);
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">
                    {cat.nombre}
                  </h2>
                  <span className="text-[#333] text-[10px]">({items.length})</span>
                  <div className="flex-1 h-px bg-[#1a1a1a]" />
                  {catValor > 0 && <span className="text-[10px] text-[#555]">Activo {fmx(catValor)}</span>}
                  {catRenta > 0 && <span className="text-[10px] text-green-900">Renta pot. {fmx(catRenta)}</span>}
                </div>
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                          <th className="text-left px-4 py-2.5 font-medium">Equipo</th>
                          <th className="text-center px-3 py-2.5 font-medium">Tipo</th>
                          <th className="text-center px-3 py-2.5 font-medium hidden sm:table-cell">Estado</th>
                          <th className="text-right px-3 py-2.5 font-medium">Cant.</th>
                          <th className="text-right px-4 py-2.5 font-medium">Precio renta</th>
                          <th className="text-right px-4 py-2.5 font-medium hidden lg:table-cell">Valor activo</th>
                          <th className="text-right px-4 py-2.5 font-medium hidden lg:table-cell">Valor total</th>
                          <th className="text-center px-3 py-2.5 font-medium hidden xl:table-cell">Acc.</th>
                          <th className="px-3 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#161616]">
                        {items.map(e => {
                          const valorActivo = e.costoInternoEstimado ?? null;
                          const valorFilaTotal = valorActivo != null ? valorActivo * e.cantidadTotal : null;
                          return (
                            <tr key={e.id} className="transition-colors group hover:bg-[#0d0d0d]">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {e.imagenUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={e.imagenUrl} alt=""
                                      className="w-8 h-8 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity"
                                      onClick={ev => { ev.stopPropagation(); setLightboxUrl(e.imagenUrl!); }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-[#1a1a1a] shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-white font-medium truncate">{(e.marca || e.modelo) ? [e.marca, e.modelo].filter(Boolean).join(" · ") : e.descripcion}</p>
                                    {(e.marca || e.modelo) && (
                                      <p className="text-[#555] text-xs truncate">{e.descripcion}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {/* Tipo — select inline */}
                              <td className="px-3 py-2.5 text-center">
                                <select
                                  value={e.tipo}
                                  disabled={savingInline === e.id}
                                  onChange={ev => patchEquipo(e.id, "tipo", ev.target.value)}
                                  onClick={ev => ev.stopPropagation()}
                                  className={`bg-transparent border-none text-[10px] font-medium cursor-pointer focus:outline-none rounded px-1 py-0.5 transition-colors ${
                                    e.tipo === "PROPIO" ? "text-[#6b7280]" : "text-blue-400"
                                  } hover:bg-[#1e1e1e]`}
                                >
                                  <option value="PROPIO" className="bg-[#111] text-white">Propio</option>
                                  <option value="EXTERNO" className="bg-[#111] text-white">Externo</option>
                                </select>
                              </td>
                              {/* Estado — select inline */}
                              <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                                <select
                                  value={e.estado}
                                  disabled={savingInline === e.id}
                                  onChange={ev => patchEquipo(e.id, "estado", ev.target.value)}
                                  onClick={ev => ev.stopPropagation()}
                                  className={`bg-transparent border-none text-[10px] font-medium cursor-pointer focus:outline-none rounded px-1 py-0.5 hover:bg-[#1e1e1e] transition-colors ${
                                    e.estado === 'ACTIVO' ? 'text-green-400' :
                                    e.estado === 'EN_MANTENIMIENTO' ? 'text-yellow-400' : 'text-red-400'
                                  }`}
                                >
                                  <option value="ACTIVO" className="bg-[#111] text-white">Activo</option>
                                  <option value="EN_MANTENIMIENTO" className="bg-[#111] text-white">En mantenimiento</option>
                                  <option value="DADO_DE_BAJA" className="bg-[#111] text-white">Dado de baja</option>
                                </select>
                              </td>
                              {/* Cantidad — input inline */}
                              <td className="px-3 py-2.5 text-right">
                                <input
                                  type="number"
                                  defaultValue={e.cantidadTotal}
                                  min={1}
                                  disabled={savingInline === e.id}
                                  onClick={ev => ev.stopPropagation()}
                                  onBlur={ev => {
                                    const val = parseInt(ev.target.value) || 1;
                                    if (val !== e.cantidadTotal) patchEquipo(e.id, "cantidadTotal", val);
                                  }}
                                  onKeyDown={ev => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); }}
                                  className="w-12 bg-transparent text-white font-medium text-right text-xs border-b border-transparent hover:border-[#333] focus:border-[#B3985B]/50 focus:outline-none transition-colors disabled:opacity-50"
                                />
                              </td>
                              {/* Precio renta — input inline */}
                              <td className="px-4 py-2.5 text-right">
                                <input
                                  type="number"
                                  defaultValue={e.precioRenta}
                                  min={0}
                                  disabled={savingInline === e.id}
                                  onClick={ev => ev.stopPropagation()}
                                  onBlur={ev => {
                                    const val = parseFloat(ev.target.value) || 0;
                                    if (val !== e.precioRenta) patchEquipo(e.id, "precioRenta", val);
                                  }}
                                  onKeyDown={ev => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); }}
                                  className="w-24 bg-transparent text-[#B3985B] font-medium text-right text-xs border-b border-transparent hover:border-[#333] focus:border-[#B3985B]/50 focus:outline-none transition-colors disabled:opacity-50"
                                />
                              </td>
                              {/* Valor activo — input inline */}
                              <td className="px-4 py-2.5 text-right hidden lg:table-cell">
                                <input
                                  type="number"
                                  defaultValue={valorActivo ?? ""}
                                  min={0}
                                  placeholder="—"
                                  disabled={savingInline === e.id}
                                  onClick={ev => ev.stopPropagation()}
                                  onBlur={ev => {
                                    const raw = ev.target.value;
                                    const val = raw === "" ? null : parseFloat(raw);
                                    if (val !== valorActivo) patchEquipo(e.id, "costoInternoEstimado", val);
                                  }}
                                  onKeyDown={ev => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); }}
                                  className="w-24 bg-transparent text-[#9ca3af] font-medium text-right text-xs border-b border-transparent hover:border-[#333] focus:border-[#B3985B]/50 focus:outline-none transition-colors placeholder-[#333] disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-2.5 text-right hidden lg:table-cell">
                                {valorFilaTotal != null ? <span className="text-white font-medium">{fmx(valorFilaTotal)}</span> : <span className="text-[#333]">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-center hidden xl:table-cell">
                                {e._count.accesorios > 0 ? <span className="text-[#B3985B] font-medium">{e._count.accesorios}</span> : <span className="text-[#333]">—</span>}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2">
                                  <button onClick={() => abrirEdit(e)}
                                    className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors">
                                    Editar
                                  </button>
                                  <button onClick={() => eliminar(e)} disabled={eliminando === e.id}
                                    className="text-[10px] text-[#333] hover:text-red-400 transition-colors disabled:opacity-50">
                                    {eliminando === e.id ? "..." : "Eliminar"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer global */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[#555] text-xs">{equiposFiltrados.length} equipos mostrados</p>
            <div className="flex items-center gap-6 text-xs">
              <div className="text-right hidden lg:block">
                <p className="text-[#555]">Total valor del activo (vista)</p>
                <p className="text-[#B3985B] font-semibold">
                  {fmx(equiposFiltrados.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#555]">Renta potencial (vista)</p>
                <p className="text-green-400 font-semibold">
                  {fmx(equiposFiltrados.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
