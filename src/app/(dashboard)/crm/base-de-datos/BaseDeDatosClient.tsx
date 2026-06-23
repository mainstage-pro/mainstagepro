"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIPO_CLIENTE_LABELS, CLASIFICACION_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/constants";
import { CopyButton } from "@/components/CopyButton";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Vendedor { id: string; name: string }

interface Lead {
  id: string;
  nombre: string;
  empresa: string | null;
  compania: { id: string; nombre: string } | null;
  correo: string | null;
  telefono: string | null;
  tipoCliente: string;
  clasificacion: string;
  servicioUsual: string | null;
  tiposEvento: string | null;
  esProspecto: boolean;
  vendedorId: string | null;
  vendedor: Vendedor | null;
  _count: { tratos: number; proyectos: number; prospecciones: number };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPOS_EVENTO_OPTIONS = [
  { value: "MUSICAL",     label: "Musical" },
  { value: "SOCIAL",      label: "Social" },
  { value: "EMPRESARIAL", label: "Empresarial" },
  { value: "VARIOS",      label: "Varios" },
];

const SERVICIO_OPTIONS = [
  { value: "RENTA",              label: "Renta de Equipo" },
  { value: "PRODUCCION_TECNICA", label: "Producción Técnica" },
  { value: "DIRECCION_TECNICA",  label: "Dirección Técnica" },
];

const TIPO_CLIENTE_OPTIONS = Object.entries(TIPO_CLIENTE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const CLASIFICACION_OPTIONS = Object.entries(CLASIFICACION_LABELS)
  .filter(([v]) => v !== "BASIC")
  .map(([v, l]) => ({ value: v, label: l }));

const TIPO_COLORS: Record<string, string> = {
  B2B: "bg-blue-900/40 text-blue-300",
  B2C: "bg-purple-900/40 text-purple-300",
  POR_DESCUBRIR: "bg-gray-800 text-gray-400",
};
const CLAS_COLORS: Record<string, string> = {
  PROSPECTO: "text-purple-400",
  NUEVO: "text-[#6b7280]",
  REGULAR: "text-yellow-400",
  PRIORITY: "text-[#B3985B]",
  BASIC: "text-blue-400",
};
const EVENTO_COLORS: Record<string, string> = {
  MUSICAL:     "#3B82F6",
  SOCIAL:      "#10B981",
  EMPRESARIAL: "#F59E0B",
  VARIOS:      "#8B5CF6",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTiposEvento(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function stringifyTiposEvento(arr: string[]): string | null {
  return arr.length ? JSON.stringify(arr) : null;
}

// ─── Small display components ─────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[tipo] ?? "bg-gray-800 text-gray-400"}`}>
      {TIPO_CLIENTE_LABELS[tipo] ?? tipo}
    </span>
  );
}

function ClasificacionBadge({ clasificacion }: { clasificacion: string }) {
  return (
    <span className={`text-xs font-medium ${CLAS_COLORS[clasificacion] ?? "text-gray-400"}`}>
      {CLASIFICACION_LABELS[clasificacion] ?? clasificacion}
    </span>
  );
}

function EventoPills({ tiposEvento }: { tiposEvento: string[] }) {
  if (!tiposEvento.length) return <span className="text-[#444] text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tiposEvento.map(t => {
        const opt = TIPOS_EVENTO_OPTIONS.find(o => o.value === t);
        return (
          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: EVENTO_COLORS[t] ?? "#6b7280" }}>
            {opt?.label ?? t}
          </span>
        );
      })}
    </div>
  );
}

// ─── InlineDropdown ───────────────────────────────────────────────────────────

function InlineDropdown({ options, value, onChange, placeholder = "—", colorMap }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  colorMap?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const current = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent hover:border-[#B3985B]/40 hover:bg-[#B3985B]/5 transition-all group">
        {current ? (
          <span className={`text-xs font-medium ${colorMap ? "" : "text-[#ccc]"}`}
            style={colorMap && current ? { color: colorMap[current.value] } : undefined}>
            {current.label}
          </span>
        ) : <span className="text-xs text-[#444]">{placeholder}</span>}
        <svg className="text-[#444] group-hover:text-[#B3985B] transition-colors" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[150px]">
          {options.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[#1a1a1a] ${value === opt.value ? "text-[#B3985B]" : "text-gray-300"}`}>
              {opt.label}{value === opt.value && <span className="ml-2 text-[#B3985B]">✓</span>}
            </button>
          ))}
          {value && (
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-[#555] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors border-t border-[#222]">
              Quitar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── InlineMultiSelect ────────────────────────────────────────────────────────

function InlineMultiSelect({ options, values, onChange, placeholder = "—", maxSelect = 3, colorMap }: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  maxSelect?: number;
  colorMap?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  function toggle(v: string) {
    if (values.includes(v)) { onChange(values.filter(x => x !== v)); }
    else { if (values.length >= maxSelect) return; onChange([...values, v]); }
  }
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent hover:border-[#B3985B]/40 hover:bg-[#B3985B]/5 transition-all group">
        {values.length === 0 ? (
          <span className="text-xs text-[#444]">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-0.5">
            {values.map(v => {
              const opt = options.find(o => o.value === v);
              return (
                <span key={v} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white"
                  style={{ backgroundColor: colorMap?.[v] ?? "#6b7280" }}>
                  {opt?.label ?? v}
                </span>
              );
            })}
          </div>
        )}
        <svg className="text-[#444] group-hover:text-[#B3985B] transition-colors shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[160px]">
          <p className="text-[9px] text-[#555] uppercase tracking-wider px-3 py-1.5">Máx. {maxSelect}</p>
          {options.map(opt => {
            const active = values.includes(opt.value);
            const disabled = !active && values.length >= maxSelect;
            return (
              <button key={opt.value} type="button" onClick={() => toggle(opt.value)} disabled={disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-[#1a1a1a]"} ${active ? "text-white" : "text-gray-400"}`}>
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${active ? "border-transparent" : "border-[#444]"}`}
                  style={active ? { backgroundColor: colorMap?.[opt.value] ?? "#B3985B" } : undefined}>
                  {active && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                </span>
                {opt.label}
              </button>
            );
          })}
          {values.length > 0 && (
            <button type="button" onClick={() => onChange([])}
              className="w-full text-left px-3 py-2 text-xs text-[#555] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors border-t border-[#222] mt-1">
              Limpiar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── InlineVendedor ───────────────────────────────────────────────────────────

function InlineVendedor({ clienteId, vendedor, usuarios, onChange }: {
  clienteId: string;
  vendedor: Vendedor | null;
  usuarios: Vendedor[];
  onChange: (v: Vendedor | null) => void;
}) {
  const [saving, setSaving] = useState(false);
  async function asignar(vendedorId: string) {
    setSaving(true);
    const r = await fetch(`/api/clientes/${clienteId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendedorId: vendedorId || null }),
    });
    if (r.ok) { const found = usuarios.find(u => u.id === vendedorId) ?? null; onChange(found); }
    setSaving(false);
  }
  return (
    <div onClick={e => e.stopPropagation()} className="max-w-[140px]">
      <Combobox value={vendedor?.id ?? ""} onChange={asignar} disabled={saving}
        options={[{ value: "", label: "Sin asignar" }, ...usuarios.map(u => ({ value: u.id, label: `${u.name.split(" ")[0]} ${u.name.split(" ")[1] ?? ""}`.trim() }))]}
        placeholder="Sin asignar"
        className="bg-transparent border-0 text-xs text-[#9ca3af] focus:outline-none focus:ring-0 cursor-pointer hover:text-white disabled:opacity-50 w-full truncate" />
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const active = value !== "";
  return (
    <Combobox value={value} onChange={onChange}
      options={[{ value: "", label: label }, ...options]} placeholder={label}
      className={`pl-3 pr-3 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none focus:ring-1 focus:ring-[#B3985B]/40 ${active ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777] hover:border-[#3a3a3a] hover:text-[#aaa]"}`}
    />
  );
}

// ─── LeadRow ─────────────────────────────────────────────────────────────────

type InlineState = {
  tipoCliente: string;
  clasificacion: string;
  servicioUsual: string;
  tiposEvento: string[];
  dirty: boolean;
};

function LeadRow({ c, usuarios, onSaved, onVendedorChange, onDelete, deleting, onConvertir }: {
  c: Lead;
  usuarios: Vendedor[];
  onSaved: (updated: Partial<Lead>) => void;
  onVendedorChange: (v: Vendedor | null) => void;
  onDelete: () => void;
  deleting: boolean;
  onConvertir: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [inline, setInline] = useState<InlineState>({
    tipoCliente: c.tipoCliente,
    clasificacion: c.clasificacion,
    servicioUsual: c.servicioUsual ?? "",
    tiposEvento: parseTiposEvento(c.tiposEvento),
    dirty: false,
  });

  useEffect(() => {
    setInline({ tipoCliente: c.tipoCliente, clasificacion: c.clasificacion, servicioUsual: c.servicioUsual ?? "", tiposEvento: parseTiposEvento(c.tiposEvento), dirty: false });
  }, [c.tipoCliente, c.clasificacion, c.servicioUsual, c.tiposEvento]);

  function patch<K extends keyof InlineState>(key: K, val: InlineState[K]) {
    setInline(prev => ({ ...prev, [key]: val, dirty: true }));
  }

  async function guardar() {
    setSaving(true);
    try {
      const r = await fetch(`/api/clientes/${c.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoCliente: inline.tipoCliente || null, clasificacion: inline.clasificacion || null, servicioUsual: inline.servicioUsual || null, tiposEvento: stringifyTiposEvento(inline.tiposEvento) }),
      });
      if (!r.ok) throw new Error();
      onSaved({ tipoCliente: inline.tipoCliente, clasificacion: inline.clasificacion, servicioUsual: inline.servicioUsual || null, tiposEvento: stringifyTiposEvento(inline.tiposEvento) });
      setInline(prev => ({ ...prev, dirty: false }));
      toast.success("Lead actualizado");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  function cancelar() {
    setInline({ tipoCliente: c.tipoCliente, clasificacion: c.clasificacion, servicioUsual: c.servicioUsual ?? "", tiposEvento: parseTiposEvento(c.tiposEvento), dirty: false });
  }

  return (
    <tr className={`transition-colors ${inline.dirty ? "bg-[#1a1400]" : "hover:bg-[#161616]"}`}>
      {/* Nombre */}
      <td className="px-4 py-3 min-w-[160px]">
        <Link href={`/crm/clientes/${c.id}`} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors">
          {c.nombre}
        </Link>
        {c.correo && (
          <span className="flex items-center gap-1 mt-0.5">
            <p className="text-[#555] text-xs truncate max-w-[150px]">{c.correo}</p>
            <CopyButton value={c.correo} size="xs" />
          </span>
        )}
        {c.telefono && (
          <span className="flex items-center gap-1">
            <p className="text-[#444] text-xs">{c.telefono}</p>
            <CopyButton value={c.telefono} size="xs" />
          </span>
        )}
      </td>

      {/* Empresa */}
      <td className="px-4 py-3">
        <span className="text-sm text-[#6b7280]">{c.compania?.nombre ?? c.empresa ?? "—"}</span>
      </td>

      {/* Prospección vinculada */}
      <td className="px-3 py-3 text-center">
        {c._count.prospecciones > 0 ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/20 font-medium">
            En ruta
          </span>
        ) : (
          <span className="text-[#333] text-xs">—</span>
        )}
      </td>

      {/* Tipo de Cliente (inline) */}
      <td className="px-3 py-3">
        <InlineDropdown options={TIPO_CLIENTE_OPTIONS} value={inline.tipoCliente} onChange={v => patch("tipoCliente", v)} placeholder="Tipo" />
      </td>

      {/* Clasificación (inline) */}
      <td className="px-3 py-3">
        <InlineDropdown options={CLASIFICACION_OPTIONS} value={inline.clasificacion} onChange={v => patch("clasificacion", v)} placeholder="Clasificación" />
      </td>

      {/* Servicio Usual (inline) */}
      <td className="px-3 py-3">
        <InlineDropdown options={SERVICIO_OPTIONS} value={inline.servicioUsual} onChange={v => patch("servicioUsual", v)} placeholder="Servicio" />
      </td>

      {/* Tipos de Evento (inline multi) */}
      <td className="px-3 py-3">
        <InlineMultiSelect options={TIPOS_EVENTO_OPTIONS} values={inline.tiposEvento} onChange={v => patch("tiposEvento", v)} placeholder="Evento" maxSelect={3} colorMap={EVENTO_COLORS} />
      </td>

      {/* Responsable */}
      <td className="px-3 py-3">
        <InlineVendedor clienteId={c.id} vendedor={c.vendedor} usuarios={usuarios} onChange={onVendedorChange} />
      </td>

      {/* Prospeccion / Tratos */}
      <td className="px-3 py-3 text-sm text-[#9ca3af] text-center">{c._count.tratos}</td>

      {/* Acciones */}
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {inline.dirty ? (
            <>
              <button onClick={guardar} disabled={saving}
                className="text-[10px] px-2.5 py-1 rounded-md bg-[#B3985B] text-black font-semibold hover:bg-[#c9a96a] disabled:opacity-50 transition-colors">
                {saving ? "…" : "Guardar"}
              </button>
              <button onClick={cancelar}
                className="text-[10px] px-2 py-1 rounded-md text-[#555] hover:text-white border border-[#2a2a2a] hover:border-[#444] transition-colors">
                ✕
              </button>
            </>
          ) : (
            <>
              <button onClick={onConvertir}
                className="text-[10px] px-2 py-1 rounded-md text-emerald-400 hover:text-emerald-300 border border-emerald-900/40 hover:border-emerald-700/60 transition-colors whitespace-nowrap">
                Convertir →
              </button>
              <Link href={`/crm/clientes/${c.id}`} className="text-[#B3985B] text-xs hover:underline">Ver</Link>
              <button onClick={onDelete} disabled={deleting}
                className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30" title="Eliminar">
                {deleting ? "…" : "✕"}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Modal Nuevo Lead ─────────────────────────────────────────────────────────

function ModalNuevoLead({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (c: Lead) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", telefono: "", correo: "", empresa: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tipoCliente: "POR_DESCUBRIR", clasificacion: "NUEVO", esProspecto: true }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      onCreated({ ...d.cliente, esProspecto: true, _count: { tratos: 0, proyectos: 0, prospecciones: 0 } });
      toast.success("Lead agregado");
      onClose();
    } catch { toast.error("Error al crear lead"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <h2 className="text-white font-semibold text-sm">Agregar Lead</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white">✕</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Nombre *</label>
            <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" placeholder="Nombre completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" placeholder="55 1234 5678" />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Correo</label>
              <input type="email" value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" placeholder="correo@..." />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Empresa</label>
            <input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" placeholder="Empresa (opcional)" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-[#777] border border-[#2a2a2a] rounded-lg hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-[#B3985B] text-black font-semibold rounded-lg hover:bg-[#C9A84C] disabled:opacity-50 transition-colors">
              {saving ? "Creando..." : "Agregar lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LeadsClient({ leads: initial, usuarios }: { leads: Lead[]; usuarios: Vendedor[] }) {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [busqueda, setBusqueda] = useState("");
  const [filtroClasificacion, setFiltroClasificacion] = useState("");
  const [filtroServicio, setFiltroServicio] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroConProspeccion, setFiltroConProspeccion] = useState("");

  const hayFiltros = busqueda || filtroClasificacion || filtroServicio || filtroEvento || filtroVendedor || filtroConProspeccion;

  const vendedorOptions = useMemo(() => [
    { value: "__sin_asignar__", label: "Sin asignar" },
    ...usuarios.map(u => ({ value: u.id, label: u.name })),
  ], [usuarios]);

  const leadsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return leads.filter(c => {
      const empresaNombre = c.compania?.nombre ?? c.empresa ?? "";
      if (q && !c.nombre.toLowerCase().includes(q) && !empresaNombre.toLowerCase().includes(q) && !(c.correo ?? "").toLowerCase().includes(q) && !(c.telefono ?? "").includes(q)) return false;
      if (filtroClasificacion && c.clasificacion !== filtroClasificacion) return false;
      if (filtroServicio && c.servicioUsual !== filtroServicio) return false;
      if (filtroEvento) {
        const evs = parseTiposEvento(c.tiposEvento);
        if (!evs.includes(filtroEvento)) return false;
      }
      if (filtroVendedor) {
        if (filtroVendedor === "__sin_asignar__" && c.vendedor !== null) return false;
        if (filtroVendedor !== "__sin_asignar__" && c.vendedor?.id !== filtroVendedor) return false;
      }
      if (filtroConProspeccion === "con" && c._count.prospecciones === 0) return false;
      if (filtroConProspeccion === "sin" && c._count.prospecciones > 0) return false;
      return true;
    });
  }, [leads, busqueda, filtroClasificacion, filtroServicio, filtroEvento, filtroVendedor, filtroConProspeccion]);

  function limpiarFiltros() {
    setBusqueda(""); setFiltroClasificacion(""); setFiltroServicio(""); setFiltroEvento(""); setFiltroVendedor(""); setFiltroConProspeccion("");
  }

  function actualizarCampos(id: string, updated: Partial<Lead>) {
    setLeads(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  }

  function actualizarVendedor(id: string, v: Vendedor | null) {
    setLeads(prev => prev.map(c => c.id === id ? { ...c, vendedor: v, vendedorId: v?.id ?? null } : c));
  }

  async function eliminar(lead: Lead) {
    const ok = await confirm({ title: "Eliminar lead", message: `¿Eliminar a ${lead.nombre} de la base de datos de leads? Esta acción no se puede deshacer.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    setDeletingId(lead.id);
    try {
      await fetch(`/api/clientes/${lead.id}`, { method: "DELETE" });
      setLeads(prev => prev.filter(c => c.id !== lead.id));
      toast.success("Lead eliminado");
    } catch { toast.error("Error al eliminar"); }
    finally { setDeletingId(null); }
  }

  async function convertirACliente(lead: Lead) {
    const ok = await confirm({
      title: "Convertir a cliente",
      message: `¿Convertir a ${lead.nombre} como cliente B2C? Se moverá a la base de datos de Clientes.`,
      confirmText: "Convertir a B2C",
    });
    if (!ok) return;
    try {
      await fetch(`/api/clientes/${lead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoCliente: "B2C", esProspecto: false }),
      });
      setLeads(prev => prev.filter(c => c.id !== lead.id));
      toast.success(`${lead.nombre} convertido a cliente`);
    } catch { toast.error("Error al convertir"); }
  }

  return (
    <>
      {showModal && <ModalNuevoLead onClose={() => setShowModal(false)} onCreated={c => setLeads(prev => [c, ...prev])} />}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Base de Datos de Leads</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {leads.length} leads · {leads.filter(l => l._count.prospecciones > 0).length} en ruta de prospección
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors self-start sm:self-auto">
          + Agregar lead
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Buscar por nombre, empresa, correo o teléfono…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50 focus:ring-1 focus:ring-[#B3985B]/20 transition-colors" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect label="Clasificación" value={filtroClasificacion} onChange={setFiltroClasificacion} options={CLASIFICACION_OPTIONS} />
          <FilterSelect label="Servicio" value={filtroServicio} onChange={setFiltroServicio} options={SERVICIO_OPTIONS} />
          <FilterSelect label="Evento" value={filtroEvento} onChange={setFiltroEvento} options={TIPOS_EVENTO_OPTIONS} />
          <FilterSelect label="Responsable" value={filtroVendedor} onChange={setFiltroVendedor} options={vendedorOptions} />
          <FilterSelect label="Prospección" value={filtroConProspeccion} onChange={setFiltroConProspeccion}
            options={[{ value: "con", label: "En ruta" }, { value: "sin", label: "Sin ruta" }]} />
          {hayFiltros && (
            <button onClick={limpiarFiltros}
              className="text-[10px] text-[#555] hover:text-red-400 border border-[#2a2a2a] hover:border-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Leyenda ── */}
      <p className="text-[10px] text-[#444] mb-3">
        ✎ Haz clic en cualquier campo para editar directamente · <span className="text-emerald-700">Convertir →</span> para mover a Clientes
      </p>

      {/* ── Tabla ── */}
      {leadsFiltrados.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
          <p className="text-[#6b7280] text-sm">
            {hayFiltros ? "Sin resultados para los filtros aplicados" : "No hay leads registrados"}
          </p>
          {hayFiltros && <button onClick={limpiarFiltros} className="mt-3 text-[#B3985B] text-xs hover:underline">Limpiar filtros</button>}
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Lead", "Empresa", "Prospección", "Tipo", "Clasificación", "Servicio", "Tipo de Evento", "Responsable", "Tratos", ""].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {leadsFiltrados.map(c => (
                <LeadRow
                  key={c.id} c={c} usuarios={usuarios}
                  onSaved={updated => actualizarCampos(c.id, updated)}
                  onVendedorChange={v => actualizarVendedor(c.id, v)}
                  onDelete={() => eliminar(c)}
                  deleting={deletingId === c.id}
                  onConvertir={() => convertirACliente(c)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
