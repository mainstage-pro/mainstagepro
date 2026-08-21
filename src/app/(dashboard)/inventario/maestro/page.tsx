"use client";

import { Fragment, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Modal } from "@/components/Modal";
import { EquipoGaleria } from "@/components/EquipoGaleria";
import { CostoMantenimientoModal, type CostoMantenimiento } from "@/components/CostoMantenimientoModal";
import { ESTADO_EQUIPO_LABEL, esRetornoAServicio } from "@/lib/equipo-estado";
import { getEquipoDisplayName } from "@/lib/equipoNombre";
import { TipoEventoCell, type TipoEventoOpcion } from "@/components/TipoEventoCell";
import { AccesoriosTab } from "@/components/AccesoriosTab";

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
  tiposEvento: string | null;
  noCotizable: boolean;
  notas: string | null;
  amperajeRequerido: number | null;
  voltajeRequerido: string | null;
  _count: { accesorios: number };
  proveedoresPrecios: { precio: number; notas: string | null; proveedor: { id: string; nombre: string; empresa: string | null; prioridad: number } }[];
};

type Categoria = { id: string; nombre: string; orden: number; descripcionInterna: string | null; descMusical: string | null; descSocial: string | null; descEmpresarial: string | null };
type Proveedor = { id: string; nombre: string; empresa: string | null; prioridad: number };

type Kpis = {
  totalEquipos: number;
  totalPropios: number;
  totalExternos: number;
};

type Form = {
  descripcion: string; marca: string; modelo: string; tipo: string;
  categoriaId: string; cantidadTotal: string; estado: string;
  proveedorDefaultId: string; notas: string;
  amperajeRequerido: string; voltajeRequerido: string;
  precioRenta: string; costoProveedor: string;
};

const FORM_EMPTY: Form = {
  descripcion: "", marca: "", modelo: "", tipo: "PROPIO",
  categoriaId: "", cantidadTotal: "1", estado: "ACTIVO",
  proveedorDefaultId: "", notas: "",
  amperajeRequerido: "", voltajeRequerido: "",
  precioRenta: "", costoProveedor: "",
};

function fmx(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function parseTiposEvento(s: string | null | undefined): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
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
  EN_REPARACION: "bg-orange-900/20 text-orange-400",
  DADO_DE_BAJA: "bg-red-900/20 text-red-400",
};
const ESTADO_LABEL = ESTADO_EQUIPO_LABEL;

type Unidad = {
  id: string; codigo: string | null; estado: string; voltaje: string | null;
  notas: string | null; _count: { mantenimientos: number };
  mantenimientos: { fecha: string; proximoMantenimiento: string | null; tipo: string }[];
};

type EquipoStats = { vecesRentada: number; diasRentados: number; revenue: number; costoMantenimiento: number };

type UnidadMantenimiento = {
  id: string; fecha: string; tipo: string; accionRealizada: string;
  comentarios: string | null; proximoMantenimiento: string | null; costoReparacion: number | null;
};
type UnidadObservacion = {
  id: string; contenido: string; createdAt: string;
  creadoPor: { id: string; name: string } | null;
};

const VOLTAJES_UNIDAD_MAESTRO = [
  { value: "110", label: "110V" },
  { value: "220", label: "220V" },
  { value: "AMBOS", label: "110V - 220V" },
];
function voltajeUnidadLabelMaestro(v: string | null) {
  if (!v) return null;
  return v === "AMBOS" ? "110V - 220V" : `${v}V`;
}

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
              <option key={eq.id} value={eq.id}>{getEquipoDisplayName(eq)}{(eq.marca || eq.modelo) ? ` — ${eq.descripcion}` : ""}</option>
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
                <option value="EN_REPARACION">En reparación</option>
                <option value="DADO_DE_BAJA">Dado de baja</option>
              </select>
            </FieldGroup>
          </div>
          <FieldGroup label="Cantidad total">
            <FInput type="number" value={form.cantidadTotal} onChange={v => setForm(p => ({ ...p, cantidadTotal: v }))} />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup label="Precio de renta ($)">
              <FInput type="number" value={form.precioRenta} onChange={v => setForm(p => ({ ...p, precioRenta: v }))} placeholder="0" />
            </FieldGroup>
            {form.tipo === "EXTERNO" && (
              <FieldGroup label="Costo proveedor ($)">
                <FInput type="number" value={form.costoProveedor} onChange={v => setForm(p => ({ ...p, costoProveedor: v }))} placeholder="0" />
              </FieldGroup>
            )}
          </div>
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
                      className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold py-1.5 rounded-lg transition-colors disabled:opacity-50">
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
                {([["", "—"], ["110", "110V"], ["220", "220V"], ["AMBOS", "110V - 220V"]] as [string, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, voltajeRequerido: val }))}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      form.voltajeRequerido === val
                        ? val === "" ? "bg-[#1a1a1a] border-[#333] text-gray-400" : "bg-[#B3985B]/15 border-[#B3985B]/60 text-[#B3985B]"
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

        {/* Col 3 — notas técnicas */}
        <div className="space-y-3">
          <div className="ms-card p-4 space-y-3">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold mb-1">Notas adicionales</p>
            <FieldGroup label="Notas">
              <textarea
                value={form.notas}
                onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                rows={4}
                placeholder="Notas internas, condiciones, observaciones..."
                className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/40 resize-none placeholder-[#333]"
              />
            </FieldGroup>
          </div>
        </div>
      </div>

      {equipoActual ? (
        <div className="ms-card p-4 mb-4">
          <EquipoGaleria equipoId={equipoActual.id} />
        </div>
      ) : (
        <p className="text-[10px] text-[#555] mb-4">Guarda el equipo para poder agregar fotos a su galería.</p>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-[#1a1a1a]">
        <button onClick={onSave} disabled={saving || !form.descripcion || !form.categoriaId}
          className="px-5 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold disabled:opacity-40 hover:bg-[#c9a96a] transition-colors">
          {saving ? "Guardando..." : panel === "nuevo" ? "Crear equipo" : "Guardar cambios"}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function fmtFechaHoraMaestro(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function fmtFechaMaestro(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function UnidadEditModal({ equipoId, unidad, onClose, onUpdated }: {
  equipoId: string; unidad: Unidad; onClose: () => void;
  onUpdated: (equipoId: string, unidad: Unidad) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    codigo: unidad.codigo ?? "", estado: unidad.estado, voltaje: unidad.voltaje ?? "", notas: unidad.notas ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [showCosto, setShowCosto] = useState(false);
  const [detalle, setDetalle] = useState<{ mantenimientos: UnidadMantenimiento[]; observaciones: UnidadObservacion[]; costoMantenimiento: number } | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(true);
  const [nuevaObs, setNuevaObs] = useState("");
  const [guardandoObs, setGuardandoObs] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch(`/api/equipos/${equipoId}/unidades/${unidad.id}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancel && d) setDetalle(d); })
      .finally(() => { if (!cancel) setLoadingDetalle(false); });
    return () => { cancel = true; };
  }, [equipoId, unidad.id]);

  async function guardar(costo?: CostoMantenimiento) {
    // Candado: al devolver a servicio desde mantenimiento/reparación, pedir el costo primero.
    if (!costo && esRetornoAServicio(unidad.estado, form.estado)) {
      setShowCosto(true);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/equipos/${equipoId}/unidades/${unidad.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: form.codigo || null, estado: form.estado, voltaje: form.voltaje || null, notas: form.notas || null, costo: costo ?? undefined }),
    });
    if (!res.ok) { toast.error("Error al guardar unidad"); setSaving(false); return; }
    const d = await res.json();
    if (d.unidad) onUpdated(equipoId, d.unidad);
    setSaving(false);
    setShowCosto(false);
    onClose();
  }

  async function agregarObs() {
    if (!nuevaObs.trim()) return;
    setGuardandoObs(true);
    const res = await fetch(`/api/equipos/${equipoId}/unidades/${unidad.id}/observaciones`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: nuevaObs.trim() }),
    });
    if (!res.ok) { toast.error("Error al guardar observación"); setGuardandoObs(false); return; }
    const d = await res.json();
    if (d.observacion) {
      setDetalle(prev => prev ? { ...prev, observaciones: [d.observacion, ...prev.observaciones] } : prev);
      setNuevaObs("");
    }
    setGuardandoObs(false);
  }

  return (
    <Modal open onClose={onClose} title="Editar unidad" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldGroup label="Código / N° serie / Etiqueta">
            <FInput value={form.codigo} onChange={v => setForm(p => ({ ...p, codigo: v }))} placeholder="Ej. SN-12345, Unidad A..." />
          </FieldGroup>
          <FieldGroup label="Estado">
            <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} className={inputCls}>
              <option value="ACTIVO">Activo</option>
              <option value="EN_MANTENIMIENTO">En mantenimiento</option>
              <option value="EN_REPARACION">En reparación</option>
              <option value="DADO_DE_BAJA">Dado de baja</option>
            </select>
          </FieldGroup>
        </div>
        <FieldGroup label="Voltaje">
          <div className="flex gap-1">
            {([["", "—"], ["110", "110V"], ["220", "220V"], ["AMBOS", "110V - 220V"]] as [string, string][]).map(([val, label]) => (
              <button key={val} type="button"
                onClick={() => setForm(p => ({ ...p, voltaje: val }))}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  form.voltaje === val
                    ? val === "" ? "bg-[#1a1a1a] border-[#333] text-gray-400" : "bg-[#B3985B]/15 border-[#B3985B]/60 text-[#B3985B]"
                    : "bg-[#0d0d0d] border-[#2a2a2a] text-gray-600 hover:border-[#444] hover:text-gray-400"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label="Notas">
          <FInput value={form.notas} onChange={v => setForm(p => ({ ...p, notas: v }))} placeholder="Observaciones de esta unidad..." />
        </FieldGroup>
        <div className="flex items-center gap-3">
          <button onClick={() => guardar()} disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold disabled:opacity-40 hover:bg-[#c9a96a] transition-colors">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
            Cancelar
          </button>
        </div>

        <CostoMantenimientoModal
          open={showCosto}
          estadoAnterior={unidad.estado}
          equipoLabel={form.codigo || unidad.codigo || "Unidad"}
          saving={saving}
          onConfirm={(costo) => guardar(costo)}
          onCancel={() => setShowCosto(false)}
        />

        <div className="border-t border-[#1e1e1e] pt-4">
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold mb-2">Observaciones</p>
          <div className="flex gap-2 mb-3">
            <input value={nuevaObs} onChange={e => setNuevaObs(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); agregarObs(); } }}
              placeholder="Escribe una observación y presiona Enter…"
              className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50" />
            <button onClick={agregarObs} disabled={guardandoObs || !nuevaObs.trim()}
              className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-gray-300 text-sm hover:border-[#B3985B]/50 disabled:opacity-40 transition-colors">
              {guardandoObs ? "…" : "Agregar"}
            </button>
          </div>
          {loadingDetalle ? (
            <p className="text-[#555] text-xs">Cargando…</p>
          ) : detalle && detalle.observaciones.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {detalle.observaciones.map(o => (
                <div key={o.id} className="p-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d]">
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{o.contenido}</p>
                  <p className="text-[10px] text-[#555] mt-1">
                    {fmtFechaHoraMaestro(o.createdAt)}{o.creadoPor ? ` · ${o.creadoPor.name}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#555] text-xs">Sin observaciones aún.</p>
          )}
        </div>

        <div className="border-t border-[#1e1e1e] pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">Historial de mantenimiento</p>
            {detalle && detalle.costoMantenimiento > 0 && (
              <span className="text-[10px] text-red-400/80">Costo total: {fmx(detalle.costoMantenimiento)}</span>
            )}
          </div>
          {loadingDetalle ? (
            <p className="text-[#555] text-xs">Cargando…</p>
          ) : detalle && detalle.mantenimientos.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {detalle.mantenimientos.map(m => (
                <div key={m.id} className="p-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{m.tipo}</span>
                    <span className="text-[10px] text-[#555]">{fmtFechaMaestro(m.fecha)}</span>
                  </div>
                  {m.accionRealizada && <p className="text-[11px] text-gray-300 mt-1">{m.accionRealizada}</p>}
                  {m.comentarios && <p className="text-[10px] text-[#666] mt-1">{m.comentarios}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    {m.costoReparacion != null && m.costoReparacion > 0 && (
                      <span className="text-[10px] text-red-400/80">{fmx(m.costoReparacion)}</span>
                    )}
                    {m.proximoMantenimiento && (
                      <span className="text-[10px] text-[#B3985B]/70">Próximo: {fmtFechaMaestro(m.proximoMantenimiento)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#555] text-xs">Sin mantenimientos registrados.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function UnidadesInline({ equipoId, unidades, stats, loading, onUpdated }: {
  equipoId: string; unidades: Unidad[] | undefined; stats: EquipoStats | undefined; loading: boolean;
  onUpdated: (equipoId: string, unidad: Unidad) => void;
}) {
  const [editUnidad, setEditUnidad] = useState<Unidad | null>(null);

  const statsBar = stats && (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
      {[
        { label: "Veces rentada", value: String(stats.vecesRentada), color: "text-white" },
        { label: "Días rentados", value: String(stats.diasRentados), color: "text-white" },
        { label: "Costo mantenimiento", value: fmx(stats.costoMantenimiento), color: "text-red-400" },
      ].map(s => (
        <div key={s.label} className="p-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d]">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wider">{s.label}</p>
          <p className={`text-sm font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );

  if (loading || !unidades) {
    return <div>{statsBar}<p className="text-[#555] text-xs py-2">Cargando unidades…</p></div>;
  }

  const editModal = editUnidad && (
    <UnidadEditModal equipoId={equipoId} unidad={editUnidad} onClose={() => setEditUnidad(null)} onUpdated={onUpdated} />
  );

  if (unidades.length === 0) {
    return (
      <div>
        {statsBar}
        {editModal}
        <div className="flex items-center justify-between gap-3 py-1">
          <p className="text-[#555] text-xs">Sin unidades registradas para este equipo.</p>
          <Link href={`/inventario/equipos/${equipoId}`}
            className="text-[11px] text-[#B3985B] hover:text-white transition-colors shrink-0">
            Registrar unidades →
          </Link>
        </div>
      </div>
    );
  }
  const counts = unidades.reduce<Record<string, number>>((acc, u) => {
    if (u.voltaje) acc[u.voltaje] = (acc[u.voltaje] ?? 0) + 1;
    return acc;
  }, {});
  const resumen = VOLTAJES_UNIDAD_MAESTRO.filter(v => counts[v.value]).map(v => `${counts[v.value]}× ${v.label}`).join(" · ");
  return (
    <div>
      {statsBar}
      {editModal}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">
            {unidades.length} unidad{unidades.length !== 1 ? "es" : ""}
          </span>
          {resumen && <span className="text-[10px] text-yellow-500/80">{resumen}</span>}
        </div>
        <Link href={`/inventario/equipos/${equipoId}`}
          className="text-[11px] text-[#B3985B] hover:text-white transition-colors shrink-0">
          Agregar / eliminar unidades →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {unidades.map((u, idx) => (
          <button key={u.id} onClick={() => setEditUnidad(u)}
            className="text-left p-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] hover:border-[#B3985B]/40 transition-colors">
            <p className="text-xs font-semibold text-white truncate">{u.codigo || `Unidad ${idx + 1}`}</p>
            <div className="flex flex-wrap items-center gap-1 mt-1">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${ESTADO_BADGE[u.estado] ?? "bg-[#1a1a1a] text-[#6b7280]"}`}>
                {ESTADO_LABEL[u.estado] ?? u.estado}
              </span>
              {u.voltaje && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-yellow-900/20 text-yellow-400">
                  {voltajeUnidadLabelMaestro(u.voltaje)}
                </span>
              )}
              {u._count.mantenimientos > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-[#1a1a1a] text-[#6b7280]">
                  {u._count.mantenimientos} mant.
                </span>
              )}
            </div>
            {u.notas && <p className="text-[#555] text-[9px] mt-1 truncate">{u.notas}</p>}
          </button>
        ))}
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
  const [savingInline, setSavingInline] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  function startEdit(id: string, field: string) { setEditingCell({ id, field }); }
  function stopEdit() { setEditingCell(null); }
  function isEditing(id: string, field: string) { return editingCell?.id === id && editingCell?.field === field; }

  // Estado del panel de categorías
  const [showCatPanel, setShowCatPanel] = useState(false);
  const [newCatNombre, setNewCatNombre] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [renamingCat, setRenamingCat] = useState<{ id: string; nombre: string } | null>(null);
  const [editingDescCat, setEditingDescCat] = useState<string | null>(null);
  const [descForm, setDescForm] = useState<{ descripcionInterna: string; descMusical: string; descSocial: string; descEmpresarial: string }>({ descripcionInterna: "", descMusical: "", descSocial: "", descEmpresarial: "" });
  const [savingDesc, setSavingDesc] = useState(false);

  async function createCategoria() {
    if (!newCatNombre.trim()) return;
    setSavingCat(true);
    try {
      const res = await fetch("/api/inventario/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newCatNombre.trim() }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Error al crear"); return; }
      const { categoria } = await res.json();
      setCategorias(prev => [...prev, categoria]);
      setNewCatNombre("");
      toast.success("Categoría creada");
    } finally { setSavingCat(false); }
  }

  async function deleteCategoria(id: string, nombre: string) {
    const ok = await confirm({ message: `¿Eliminar la categoría "${nombre}"?`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    const res = await fetch(`/api/inventario/categorias/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "No se puede eliminar"); return; }
    setCategorias(prev => prev.filter(c => c.id !== id));
    toast.success("Categoría eliminada");
  }

  async function saveRenameCategoria(id: string, nombre: string) {
    if (!nombre.trim()) return;
    const res = await fetch(`/api/inventario/categorias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim() }),
    });
    if (!res.ok) { toast.error("Error al renombrar"); return; }
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, nombre: nombre.trim() } : c));
    setRenamingCat(null);
  }

  function abrirDescCategoria(cat: Categoria) {
    setEditingDescCat(cat.id);
    setDescForm({
      descripcionInterna: cat.descripcionInterna ?? "",
      descMusical: cat.descMusical ?? "",
      descSocial: cat.descSocial ?? "",
      descEmpresarial: cat.descEmpresarial ?? "",
    });
  }

  async function saveDescCategoria(id: string) {
    setSavingDesc(true);
    try {
      const res = await fetch(`/api/inventario/categorias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(descForm),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return; }
      setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...descForm } : c));
      setEditingDescCat(null);
      toast.success("Descripciones guardadas");
    } finally { setSavingDesc(false); }
  }

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
      setEquipos(prev => prev.map(e => e.id === id ? { ...e, [campo]: valor } : e));
    } finally {
      setSavingInline(null);
    }
  }

  // Clasificación inline de tipo de evento. Usa el endpoint canónico
  // (clasifOrigen="manual" + alimenta el sync a productos). El componente ya
  // actualizó su estado local; aquí persistimos y sincronizamos la lista.
  async function saveTiposEvento(id: string, next: string[]) {
    const res = await fetch("/api/inventario/clasificacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipoIds: [id], tiposEvento: next }),
    });
    if (!res.ok) { toast.error("No se pudo clasificar"); throw new Error("save-failed"); }
    setEquipos(prev => prev.map(e => e.id === id ? { ...e, tiposEvento: next.length ? JSON.stringify(next) : null } : e));
  }

  // Cambiar proveedor default — actualiza optimistamente el objeto proveedorDefault
  async function changeProveedor(id: string, proveedorId: string) {
    setSavingInline(id);
    try {
      const res = await fetch(`/api/equipos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedorDefaultId: proveedorId || null }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      const prov = proveedores.find(p => p.id === proveedorId) ?? null;
      setEquipos(prev => prev.map(e => e.id === id
        ? { ...e, proveedorDefault: prov ? { id: prov.id, nombre: prov.nombre, empresa: prov.empresa } : null }
        : e
      ));
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
  const [filtroEstado, setFiltroEstado] = useState<"" | "ACTIVO" | "EN_MANTENIMIENTO" | "EN_REPARACION" | "DADO_DE_BAJA">("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroInactivos, setFiltroInactivos] = useState(false);
  const [soloSinClasificar, setSoloSinClasificar] = useState(false);
  const [filtroEvento, setFiltroEvento] = useState(""); // "" | MUSICAL | SOCIAL | EMPRESARIAL | OTRO
  const [catalogoTipos, setCatalogoTipos] = useState<TipoEventoOpcion[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const [vista, setVista] = useState<"lista" | "grid">("lista");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unidadesCache, setUnidadesCache] = useState<Record<string, Unidad[]>>({});
  const [statsCache, setStatsCache] = useState<Record<string, EquipoStats>>({});
  const [loadingUnidades, setLoadingUnidades] = useState<string | null>(null);
  const [panel, setPanel] = useState<"nuevo" | string | null>(null); // "nuevo" | equipoId | null
  const [form, setForm] = useState<Form>(FORM_EMPTY);
  const [imagen, setImagen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [costoEquipo, setCostoEquipo] = useState<{ estadoAnterior: string; label: string } | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    const qs = new URLSearchParams();
    if (filtroTipo) qs.set("tipo", filtroTipo);
    if (filtroEstado) qs.set("estado", filtroEstado);
    if (filtroCategoria) qs.set("categoriaId", filtroCategoria);
    if (filtroInactivos) qs.set("inactivos", "true");

    try {
      const [mRes, provRes, catRes] = await Promise.all([
        fetch(`/api/inventario/maestro?${qs}`),
        fetch("/api/proveedores"),
        fetch("/api/catalogo").catch(() => null),
      ]);
      if (!mRes.ok) throw new Error(`/api/inventario/maestro respondió ${mRes.status}`);
      if (!provRes.ok) throw new Error(`/api/proveedores respondió ${provRes.status}`);
      const [mData, provData] = await Promise.all([mRes.json(), provRes.json()]);
      setEquipos(mData.equipos ?? []);
      setCategorias(mData.categorias ?? []);
      setKpis(mData.kpis ?? null);
      setProveedores(provData.proveedores ?? []);
      if (catRes?.ok) { const c = await catRes.json(); setCatalogoTipos(c.tipos ?? []); }
      fetch("/api/accesorios").then(r => r.ok ? r.json() : null).then(d => { if (d) setAccesoriosCount(d.total ?? d.accesorios?.length ?? 0); }).catch(() => {});
    } catch (e) {
      console.error("Error cargando inventario de equipos:", e);
      toast.error("No se pudo cargar el inventario. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
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
      proveedorDefaultId: e.proveedorDefault?.id ?? "",
      notas: e.notas ?? "",
      amperajeRequerido: e.amperajeRequerido != null ? String(e.amperajeRequerido) : "",
      voltajeRequerido: e.voltajeRequerido != null ? String(e.voltajeRequerido) : "",
      precioRenta: e.precioRenta != null ? String(e.precioRenta) : "",
      costoProveedor: e.costoProveedor != null ? String(e.costoProveedor) : "",
    });
    setImagen(null);
    setPanel(e.id);
  }

  function cerrarPanel() { setPanel(null); setImagen(null); }

  async function toggleUnidades(equipoId: string) {
    if (expandedId === equipoId) { setExpandedId(null); return; }
    setExpandedId(equipoId);
    if (!statsCache[equipoId]) {
      fetch(`/api/equipos/${equipoId}/stats`, { cache: "no-store" })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setStatsCache(prev => ({ ...prev, [equipoId]: d })); })
        .catch(() => {});
    }
    if (!unidadesCache[equipoId]) {
      setLoadingUnidades(equipoId);
      try {
        const res = await fetch(`/api/equipos/${equipoId}/unidades`, { cache: "no-store" });
        if (res.ok) { const d = await res.json(); setUnidadesCache(prev => ({ ...prev, [equipoId]: d.unidades ?? [] })); }
      } finally { setLoadingUnidades(null); }
    }
  }

  function updateUnidadInCache(equipoId: string, actualizada: Unidad) {
    setUnidadesCache(prev => ({
      ...prev,
      [equipoId]: (prev[equipoId] ?? []).map(u => u.id === actualizada.id ? actualizada : u),
    }));
  }

  async function handleImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagen(await compressImage(file));
  }

  async function guardar(costo?: CostoMantenimiento) {
    if (!form.descripcion || !form.categoriaId) {
      toast.error("Descripción y categoría son requeridos");
      return;
    }
    // Candado: al devolver el equipo a servicio desde mantenimiento/reparación, pedir el costo primero.
    if (panel && panel !== "nuevo" && !costo) {
      const prev = equipos.find(e => e.id === panel);
      if (prev && esRetornoAServicio(prev.estado, form.estado)) {
        setCostoEquipo({ estadoAnterior: prev.estado, label: form.descripcion });
        return;
      }
    }
    setSaving(true);
    const body = {
      descripcion: form.descripcion,
      marca: form.marca || null, modelo: form.modelo || null,
      tipo: form.tipo, categoriaId: form.categoriaId,
      cantidadTotal: parseInt(form.cantidadTotal) || 1,
      estado: form.estado,
      proveedorDefaultId: form.proveedorDefaultId || null,
      notas: form.notas || null,
      amperajeRequerido: form.amperajeRequerido !== "" ? parseFloat(form.amperajeRequerido) : null,
      voltajeRequerido: form.voltajeRequerido !== "" ? form.voltajeRequerido : null,
      precioRenta: form.precioRenta !== "" ? parseFloat(form.precioRenta) : 0,
      costoProveedor: form.tipo === "EXTERNO" && form.costoProveedor !== "" ? parseFloat(form.costoProveedor) : null,
      ...(imagen !== null ? { imagenUrl: imagen } : {}),
      ...(costo ? { costo } : {}),
    };

    const url = panel === "nuevo" ? "/api/equipos" : `/api/equipos/${panel}`;
    const method = panel === "nuevo" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const saved = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(saved?.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    toast.success(panel === "nuevo" ? "Equipo creado" : "Equipo actualizado");
    setCostoEquipo(null);
    const editadoId = panel !== "nuevo" ? panel : null;
    cerrarPanel();
    // Edición: fusiona la fila en memoria sin recargar toda la página (evita el
    // parpadeo/re-render completo que perdía el scroll). Alta: recarga silenciosa.
    if (editadoId && saved?.equipo) {
      setEquipos(prev => prev.map(x => (x.id === editadoId ? { ...x, ...saved.equipo } : x)));
    } else {
      await load(true);
    }
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
    const q = busqueda.trim().toLowerCase();
    return equipos.filter(e => {
      if (soloSinClasificar && (parseTiposEvento(e.tiposEvento).length > 0 || e.noCotizable)) return false;
      if (filtroEvento && !parseTiposEvento(e.tiposEvento).includes(filtroEvento)) return false;
      if (!q) return true;
      return e.descripcion.toLowerCase().includes(q) ||
        (e.marca ?? "").toLowerCase().includes(q) ||
        (e.modelo ?? "").toLowerCase().includes(q) ||
        e.categoria.nombre.toLowerCase().includes(q);
    });
  }, [equipos, busqueda, soloSinClasificar, filtroEvento]);

  // Cobertura de clasificación: un equipo cuenta como clasificado si tiene tipo de
  // evento o si se marcó no cotizable (decisión explícita de excluirlo).
  const clasificacionStats = useMemo(() => {
    const relevantes = equipos.filter(e => e.activo);
    const clasificados = relevantes.filter(e => parseTiposEvento(e.tiposEvento).length > 0 || e.noCotizable).length;
    return { clasificados, total: relevantes.length };
  }, [equipos]);

  // ── Tab Propios / Externos / Accesorios ───────────────────────────────────
  const [tab, setTab] = useState<"propios" | "externos" | "accesorios">("propios");
  const [accesoriosCount, setAccesoriosCount] = useState<number | null>(null);
  const propios = useMemo(() => equiposFiltrados.filter(e => e.tipo === "PROPIO"), [equiposFiltrados]);
  const externos = useMemo(() => equiposFiltrados.filter(e => e.tipo === "EXTERNO"), [equiposFiltrados]);
  const equiposTab = tab === "propios" ? propios : externos;

  const porCategoria = useMemo(() =>
    categorias
      .map(cat => ({ cat, items: equiposTab.filter(e => e.categoria.id === cat.id) }))
      .filter(g => g.items.length > 0),
    [categorias, equiposTab]
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
    onClose: cerrarPanel, onImageChange: handleImagen, onSave: () => guardar(),
    showAddProveedor, setShowAddProveedor, newProveedorId, setNewProveedorId,
    newProveedorPrecio, setNewProveedorPrecio, newProveedorNotas, setNewProveedorNotas,
    savingProveedor, onAddProveedor: handleAddProveedorPrecio, onRemoveProveedor: handleRemoveProveedorPrecio,
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Inventario de Equipos</h1>
          <p className="ms-subtitle mt-0.5">Gestión de equipos, categorías y proveedores</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/equipos/clasificacion"
            className="flex items-center gap-2 border border-[#333] hover:border-[#B3985B]/40 text-[#6b7280] hover:text-[#B3985B] text-sm px-3 py-2 rounded-lg transition-colors">
            <span>Clasificar</span>
            <span className="text-[11px] text-[#B3985B]">{clasificacionStats.clasificados}/{clasificacionStats.total}</span>
          </Link>
          <button onClick={() => setShowCatPanel(true)}
            className="border border-[#333] hover:border-[#B3985B]/40 text-[#6b7280] hover:text-[#B3985B] text-sm px-3 py-2 rounded-lg transition-colors">
            + Categoría
          </button>
          <button onClick={abrirNuevo}
            className="ms-btn-primary">
            + Nuevo equipo
          </button>
        </div>
      </div>

      {/* Modal nuevo/editar equipo */}
      <Modal
        open={panel !== null}
        onClose={cerrarPanel}
        title={panel === "nuevo" ? "Nuevo equipo" : "Editar equipo"}
        maxWidth="max-w-5xl"
      >
        <FormPanel {...formPanelProps} />
      </Modal>

      {costoEquipo && (
        <CostoMantenimientoModal
          open
          estadoAnterior={costoEquipo.estadoAnterior}
          equipoLabel={costoEquipo.label}
          saving={saving}
          onConfirm={(costo) => guardar(costo)}
          onCancel={() => setCostoEquipo(null)}
        />
      )}

      {/* Modal gestión de categorías */}
      <Modal open={showCatPanel} onClose={() => { setShowCatPanel(false); setNewCatNombre(""); setRenamingCat(null); }} title="Categorías de equipos" maxWidth="max-w-md">
        <div className="space-y-4">
          {/* Nueva categoría */}
          <div className="flex gap-2">
            <input
              value={newCatNombre}
              onChange={e => setNewCatNombre(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createCategoria(); }}
              placeholder="Nombre de nueva categoría..."
              className="flex-1 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/40"
            />
            <button onClick={createCategoria} disabled={savingCat || !newCatNombre.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {savingCat ? "..." : "Crear"}
            </button>
          </div>

          {/* Lista de categorías */}
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {categorias.length === 0 ? (
              <p className="text-center text-[#444] text-sm py-6">Sin categorías aún.</p>
            ) : categorias.map(cat => (
              <div key={cat.id} className="bg-[#111] border border-[#1e1e1e] rounded-lg group">
              <div className="flex items-center gap-2 px-3 py-2">
                {renamingCat?.id === cat.id ? (
                  <>
                    <input autoFocus
                      value={renamingCat.nombre}
                      onChange={e => setRenamingCat({ id: cat.id, nombre: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveRenameCategoria(cat.id, renamingCat.nombre);
                        if (e.key === "Escape") setRenamingCat(null);
                      }}
                      className="flex-1 bg-[#0d0d0d] border border-[#B3985B]/40 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                    />
                    <button onClick={() => saveRenameCategoria(cat.id, renamingCat.nombre)}
                      className="text-[10px] text-[#B3985B] hover:text-white transition-colors">Guardar</button>
                    <button onClick={() => setRenamingCat(null)}
                      className="text-[10px] text-[#555] hover:text-white transition-colors">Cancelar</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-white">{cat.nombre}</span>
                    <span className="text-[10px] text-[#444] mr-1">
                      {equipos.filter(e => e.categoria.id === cat.id).length} equipos
                    </span>
                    <button onClick={() => editingDescCat === cat.id ? setEditingDescCat(null) : abrirDescCategoria(cat)}
                      className={`text-[10px] transition-all ${editingDescCat === cat.id ? "text-[#B3985B]" : "opacity-0 group-hover:opacity-100 text-[#555] hover:text-[#B3985B]"}`}>
                      Descripciones
                    </button>
                    <button onClick={() => setRenamingCat({ id: cat.id, nombre: cat.nombre })}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-[#555] hover:text-[#B3985B] transition-all">
                      Renombrar
                    </button>
                    <button onClick={() => deleteCategoria(cat.id, cat.nombre)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-[#333] hover:text-red-400 transition-all">
                      Eliminar
                    </button>
                  </>
                )}
              </div>
              {editingDescCat === cat.id && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[#1e1e1e]">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-[#666] mb-1">Descripción interna (amplia · solo inventario)</label>
                    <textarea rows={3} value={descForm.descripcionInterna}
                      onChange={e => setDescForm(f => ({ ...f, descripcionInterna: e.target.value }))}
                      className="w-full bg-[#0d0d0d] border border-[#222] rounded px-2 py-1.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/40" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-[#666] mb-1">Amigable · Musical</label>
                      <textarea rows={2} value={descForm.descMusical}
                        onChange={e => setDescForm(f => ({ ...f, descMusical: e.target.value }))}
                        className="w-full bg-[#0d0d0d] border border-[#222] rounded px-2 py-1.5 text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/40" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-[#666] mb-1">Amigable · Social</label>
                      <textarea rows={2} value={descForm.descSocial}
                        onChange={e => setDescForm(f => ({ ...f, descSocial: e.target.value }))}
                        className="w-full bg-[#0d0d0d] border border-[#222] rounded px-2 py-1.5 text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/40" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-[#666] mb-1">Amigable · Empresarial</label>
                      <textarea rows={2} value={descForm.descEmpresarial}
                        onChange={e => setDescForm(f => ({ ...f, descEmpresarial: e.target.value }))}
                        className="w-full bg-[#0d0d0d] border border-[#222] rounded px-2 py-1.5 text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/40" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => setEditingDescCat(null)}
                      className="text-xs text-[#555] hover:text-white transition-colors px-3 py-1.5">Cancelar</button>
                    <button onClick={() => saveDescCategoria(cat.id)} disabled={savingDesc}
                      className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors">
                      {savingDesc ? "..." : "Guardar"}
                    </button>
                  </div>
                </div>
              )}
              </div>
            ))}
          </div>
        </div>
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
      {kpis && tab !== "accesorios" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="ms-stat-card">
            <p className="text-[#6b7280] text-xs mb-1">Total equipos</p>
            <p className="text-white text-2xl font-semibold">{kpis.totalEquipos}</p>
            <p className="text-[#444] text-[10px] mt-0.5">{categorias.length} categorías</p>
          </div>
          <div className="ms-stat-card">
            <p className="text-[#6b7280] text-xs mb-1">Equipos propios</p>
            <p className="text-[#B3985B] text-2xl font-semibold">{kpis.totalPropios}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Mainstage Pro</p>
          </div>
          <div className="ms-stat-card">
            <p className="text-[#6b7280] text-xs mb-1">Equipos externos</p>
            <p className="text-blue-400 text-2xl font-semibold">{kpis.totalExternos}</p>
            <p className="text-[#444] text-[10px] mt-0.5">De proveedores</p>
          </div>
          <div className="ms-stat-card">
            <p className="text-[#6b7280] text-xs mb-1">En vista actual</p>
            <p className="text-white text-2xl font-semibold">{equiposTab.length}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Con filtros aplicados</p>
          </div>
        </div>
      )}

      {/* Tabs Propios / Externos */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 ms-card p-1">
          {(["propios", "externos", "accesorios"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? "bg-[#B3985B] text-black" : "text-[#6b7280] hover:text-white"
              }`}>
              {t === "propios" ? `Equipos Propios (${propios.length})`
                : t === "externos" ? `Equipos Externos (${externos.length})`
                : `Accesorios${accesoriosCount !== null ? ` (${accesoriosCount})` : ""}`}
            </button>
          ))}
        </div>

        {/* Filtros secundarios */}
        {tab !== "accesorios" && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..."
            className="bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50 transition-colors w-40" />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)}
            className="ms-card rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
            <option value="">Estado: todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="EN_MANTENIMIENTO">En mantenimiento</option>
            <option value="EN_REPARACION">En reparación</option>
            <option value="DADO_DE_BAJA">Dado de baja</option>
          </select>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
            className="ms-card rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
            <option value="">Categoría: todas</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={filtroEvento} onChange={e => setFiltroEvento(e.target.value)}
            className="ms-card rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
            <option value="">Tipo de evento: todos</option>
            {catalogoTipos.map(t => <option key={t.slug} value={t.slug.toUpperCase()}>{t.nombre}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[#6b7280] cursor-pointer">
            <input type="checkbox" checked={filtroInactivos} onChange={e => setFiltroInactivos(e.target.checked)} className="accent-[#B3985B]" />
            Inactivos
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[#6b7280] cursor-pointer">
            <input type="checkbox" checked={soloSinClasificar} onChange={e => setSoloSinClasificar(e.target.checked)} className="accent-[#B3985B]" />
            Sin clasificar por evento
          </label>
          <div className="flex gap-0.5 bg-[#111] border border-[#222] rounded-lg p-0.5">
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
        )}
      </div>

      {/* Contenido */}
      {tab === "accesorios" ? (
        <AccesoriosTab categorias={categorias} catalogoTipos={catalogoTipos} />
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#111] rounded-lg animate-pulse" />)}
        </div>
      ) : equiposTab.length === 0 ? (
        <div className="text-center py-16 text-[#333]">
          <p className="text-sm">Sin equipos {tab === "propios" ? "propios" : "externos"} con los filtros actuales.</p>
        </div>
      ) : vista === "grid" ? (

        /* ── Vista cuadrícula por categoría ── */
        <div className="space-y-8">
          {porCategoria.map(({ cat, items }) => (
            <div key={cat.id}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{cat.nombre}</h2>
                <span className="text-[#333] text-[10px]">({items.length})</span>
                <div className="flex-1 h-px bg-[#1a1a1a]" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {items.map(e => (
                  <div key={e.id} className="group ms-card p-3 cursor-pointer hover:border-[#B3985B]/30 transition-all" onClick={() => abrirEdit(e)}>
                    <div className="aspect-square rounded-lg bg-[#0d0d0d] mb-2.5 flex items-center justify-center overflow-hidden">
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
                        {getEquipoDisplayName(e)}
                      </p>
                      {(e.marca || e.modelo) && (
                        <p className="text-[#555] text-[10px] truncate mt-0.5">{e.descripcion}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${e.tipo === "PROPIO" ? "text-[#6b7280] bg-[#1a1a1a]" : "text-blue-400 bg-blue-900/20"}`}>
                        {e.tipo === "PROPIO" ? "Propio" : "Externo"}
                      </span>
                      <span className="text-sm font-bold text-white">×{e.cantidadTotal}</span>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-[#161616]" onClick={ev => ev.stopPropagation()}>
                      <TipoEventoCell
                        value={parseTiposEvento(e.tiposEvento)}
                        tipos={catalogoTipos}
                        onSave={next => saveTiposEvento(e.id, next)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      ) : (

        /* ── Vista lista — tabla única continua con separadores de categoría ── */
        <div className="ms-table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                  <th className="text-left px-4 py-2.5 font-medium">Equipo</th>
                  <th className="text-center px-3 py-2.5 font-medium hidden sm:table-cell">Estado</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Tipo de evento</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Proveedor</th>
                  <th className="text-right px-3 py-2.5 font-medium">Cant.</th>
                  <th className="text-center px-3 py-2.5 font-medium hidden xl:table-cell">Acc.</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {porCategoria.map(({ cat, items }) => (
                  <>
                    <tr key={`cat-${cat.id}`} className="border-t border-[#1a1a1a]">
                      <td colSpan={7} className="px-4 py-1.5 bg-[#0d0d0d]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{cat.nombre}</span>
                          <span className="text-[#333] text-[10px]">({items.length})</span>
                        </div>
                      </td>
                    </tr>
                    {items.map(e => {
                      const provNombre = e.tipo === "PROPIO"
                        ? null
                        : (e.proveedorDefault?.nombre ?? e.proveedoresPrecios?.[0]?.proveedor?.nombre ?? null);
                      return (
                        <Fragment key={e.id}>
                        <tr className="border-t border-[#161616] transition-colors group hover:bg-[#0d0d0d]">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button onClick={ev => { ev.stopPropagation(); toggleUnidades(e.id); }}
                                title="Ver unidades"
                                className="shrink-0 text-[#555] hover:text-[#B3985B] transition-colors">
                                <svg className={`w-4 h-4 transition-transform ${expandedId === e.id ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              {e.imagenUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={e.imagenUrl} alt="" className="w-8 h-8 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity" onClick={ev => { ev.stopPropagation(); setLightboxUrl(e.imagenUrl!); }} />
                              ) : (
                                <div className="w-8 h-8 rounded bg-[#1a1a1a] shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-white font-medium truncate">{getEquipoDisplayName(e)}</p>
                                {(e.marca || e.modelo) && <p className="text-[#555] text-xs truncate">{e.descripcion}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                            {isEditing(e.id, "estado") ? (
                              <select autoFocus value={e.estado} disabled={savingInline === e.id}
                                onChange={ev => { patchEquipo(e.id, "estado", ev.target.value); stopEdit(); }}
                                onBlur={stopEdit} onClick={ev => ev.stopPropagation()}
                                className="bg-[#0d0d0d] border border-[#2a2a2a] rounded text-[10px] font-medium text-white focus:outline-none focus:border-[#B3985B]/50 px-1.5 py-0.5">
                                <option value="ACTIVO" className="bg-[#111]">Activo</option>
                                <option value="EN_MANTENIMIENTO" className="bg-[#111]">En mantenimiento</option>
                                <option value="EN_REPARACION" className="bg-[#111]">En reparación</option>
                                <option value="DADO_DE_BAJA" className="bg-[#111]">Dado de baja</option>
                              </select>
                            ) : (
                              <button onClick={ev => { ev.stopPropagation(); startEdit(e.id, "estado"); }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium hover:opacity-75 transition-opacity ${ESTADO_BADGE[e.estado] ?? "bg-[#1a1a1a] text-[#6b7280]"}`}>
                                {ESTADO_LABEL[e.estado] ?? e.estado}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2.5 hidden lg:table-cell">
                            <TipoEventoCell
                              value={parseTiposEvento(e.tiposEvento)}
                              tipos={catalogoTipos}
                              onSave={next => saveTiposEvento(e.id, next)}
                              triggerId={`tipoev-${e.id}`}
                            />
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            {e.tipo === "PROPIO" ? (
                              <span className="text-[11px] text-[#B3985B] font-medium">Mainstage Pro</span>
                            ) : isEditing(e.id, "proveedorDefault") ? (
                              <select autoFocus defaultValue={e.proveedorDefault?.id ?? ""}
                                disabled={savingInline === e.id}
                                onChange={ev => { changeProveedor(e.id, ev.target.value); stopEdit(); }}
                                onBlur={stopEdit} onClick={ev => ev.stopPropagation()}
                                className="bg-[#0d0d0d] border border-[#2a2a2a] rounded text-[10px] text-white focus:outline-none focus:border-[#B3985B]/50 px-1.5 py-0.5 max-w-[150px]">
                                <option value="" className="bg-[#111]">— Sin proveedor —</option>
                                {proveedores.map(p => (
                                  <option key={p.id} value={p.id} className="bg-[#111]">{p.nombre}{p.empresa ? ` · ${p.empresa}` : ""}</option>
                                ))}
                              </select>
                            ) : (
                              <button onClick={ev => { ev.stopPropagation(); startEdit(e.id, "proveedorDefault"); }}
                                className="text-[11px] text-left transition-colors hover:text-[#B3985B]">
                                {provNombre
                                  ? <span className="text-white">{provNombre}</span>
                                  : <span className="text-[#333] italic">+ agregar</span>}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {isEditing(e.id, "cantidadTotal") ? (
                              <input type="number" autoFocus defaultValue={e.cantidadTotal} min={1}
                                disabled={savingInline === e.id}
                                onClick={ev => ev.stopPropagation()}
                                onBlur={ev => { const v = parseInt(ev.target.value) || 1; if (v !== e.cantidadTotal) patchEquipo(e.id, "cantidadTotal", v); stopEdit(); }}
                                onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") stopEdit(); }}
                                className="w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-[#0d0d0d] border border-[#2a2a2a] rounded text-white font-medium text-right text-xs focus:outline-none focus:border-[#B3985B]/50 px-1 py-0.5 disabled:opacity-50" />
                            ) : (
                              <button onClick={ev => { ev.stopPropagation(); startEdit(e.id, "cantidadTotal"); }}
                                className="text-white font-medium text-xs hover:text-[#B3985B] transition-colors tabular-nums">
                                {e.cantidadTotal}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center hidden xl:table-cell">
                            {e._count.accesorios > 0 ? <span className="text-[#B3985B] font-medium">{e._count.accesorios}</span> : <span className="text-[#333]">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2">
                              <button onClick={() => abrirEdit(e)} className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors">Editar</button>
                              <button onClick={() => eliminar(e)} disabled={eliminando === e.id} className="text-[10px] text-[#333] hover:text-red-400 transition-colors disabled:opacity-50">
                                {eliminando === e.id ? "..." : "Eliminar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === e.id && (
                          <tr className="bg-[#080808]">
                            <td colSpan={7} className="px-4 py-3">
                              <UnidadesInline
                                equipoId={e.id}
                                unidades={unidadesCache[e.id]}
                                stats={statsCache[e.id]}
                                loading={loadingUnidades === e.id}
                                onUpdated={updateUnidadInCache}
                              />
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
            <p className="text-[#555] text-xs">{equiposTab.length} equipos mostrados</p>
            <p className="text-[#444] text-xs">{porCategoria.length} categorías</p>
          </div>
        </div>
      )}
    </div>
  );
}
