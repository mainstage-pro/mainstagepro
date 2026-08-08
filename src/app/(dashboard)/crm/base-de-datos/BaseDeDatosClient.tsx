"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { TIPO_CLIENTE_LABELS, CLASIFICACION_LABELS, ORIGEN_LEAD_OPTIONS, ORIGEN_LEAD_LABELS } from "@/lib/constants";
import { CopyButton } from "@/components/CopyButton";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = "resumen" | "clientes" | "prospectos" | "sin-clasificar";
type EstadoActividad = "ACTIVO" | "EN_PROCESO" | "INACTIVO";

interface Vendedor { id: string; name: string }

interface Contacto {
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
  origenLead: string | null;
  notas?: string | null;
  vendedorId: string | null;
  vendedor: Vendedor | null;
  createdAt: Date | string;
  tratos: { id: string; etapa: string; origenLead: string; nombreEvento: string | null }[];
  _count: { tratos: number; proyectos: number; prospecciones: number; cotizaciones: number };
}

interface Props {
  clientes: Contacto[];
  prospectos: Contacto[];
  sinClasificar: Contacto[];
  usuarios: Vendedor[];
  actividadMap: Record<string, EstadoActividad>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ORIGEN_OPTIONS = ORIGEN_LEAD_OPTIONS;

// ORIGEN_LEAD_LABELS incluye legacy values para mostrar registros históricos correctamente
const ORIGEN_LABELS: Record<string, string> = ORIGEN_LEAD_LABELS;

const ORIGEN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  META_ADS:       { bg: "bg-blue-950/60",    text: "text-blue-400",    border: "border-blue-800/30"    },
  REDES_SOCIALES: { bg: "bg-pink-950/60",    text: "text-pink-400",    border: "border-pink-800/30"    },
  REFERIDO:       { bg: "bg-amber-950/60",   text: "text-amber-400",   border: "border-amber-800/30"   },
  RECOMPRA:       { bg: "bg-emerald-950/60", text: "text-emerald-400", border: "border-emerald-800/30" },
  PROSPECCION:    { bg: "bg-[#B3985B]/10",   text: "text-[#B3985B]",   border: "border-[#B3985B]/30"   },
};

const TIPO_CLIENTE_OPTIONS = Object.entries(TIPO_CLIENTE_LABELS).map(([v, l]) => ({ value: v, label: l }));

const CLASIFICACION_OPTIONS = [
  { value: "NUEVO",    label: "Nuevo" },
  { value: "REGULAR",  label: "Regular" },
  { value: "PRIORITY", label: "Priority" },
  { value: "EVITABLE", label: "Evitable" },
];

const CLAS_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  PROSPECTO: { text: "text-purple-300", bg: "bg-purple-950/50", border: "border-purple-800/30" },
  NUEVO:     { text: "text-sky-400",    bg: "bg-sky-950/50",    border: "border-sky-800/30"    },
  REGULAR:   { text: "text-yellow-400", bg: "bg-yellow-950/50", border: "border-yellow-800/30" },
  PRIORITY:  { text: "text-[#B3985B]",  bg: "bg-[#B3985B]/10",  border: "border-[#B3985B]/30"  },
  BASIC:     { text: "text-blue-400",   bg: "bg-blue-950/50",   border: "border-blue-800/30"   },
  EVITABLE:  { text: "text-red-400",    bg: "bg-red-950/50",    border: "border-red-800/30"    },
};

const SERVICIO_OPTIONS = [
  { value: "RENTA",              label: "Renta de Equipo" },
  { value: "PRODUCCION_TECNICA", label: "Prod. Técnica" },
  { value: "DIRECCION_TECNICA",  label: "Dir. Técnica" },
];
const SERVICIO_COLORS: Record<string, string> = {
  RENTA: "#3B82F6", PRODUCCION_TECNICA: "#F59E0B", DIRECCION_TECNICA: "#8B5CF6",
};

const TIPOS_EVENTO_OPTIONS = [
  { value: "MUSICAL",     label: "Musical" },
  { value: "SOCIAL",      label: "Social" },
  { value: "EMPRESARIAL", label: "Empresarial" },
  { value: "VARIOS",      label: "Varios" },
];
const EVENTO_COLORS: Record<string, string> = {
  MUSICAL:     "#818CF8", // indigo-400
  SOCIAL:      "#FB7185", // rose-400
  EMPRESARIAL: "#2DD4BF", // teal-400
  VARIOS:      "#9CA3AF", // gray-400
};

const TIPO_EVENTO_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  MUSICAL:     { bg: 'bg-indigo-900/30',  text: 'text-indigo-400',  dot: 'bg-indigo-400' },
  SOCIAL:      { bg: 'bg-rose-900/30',    text: 'text-rose-400',    dot: 'bg-rose-400' },
  EMPRESARIAL: { bg: 'bg-teal-900/30',    text: 'text-teal-400',    dot: 'bg-teal-400' },
  VARIOS:      { bg: 'bg-gray-800/50',    text: 'text-gray-500',    dot: 'bg-gray-600' },
};

const TIPO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  B2B:          { bg: "bg-blue-950/50",   text: "text-blue-300",   border: "border-blue-800/30"   },
  B2C:          { bg: "bg-purple-950/50", text: "text-purple-300", border: "border-purple-800/30" },
  POR_DESCUBRIR:{ bg: "bg-[#111]",        text: "text-[#555]",     border: "border-[#222]"        },
};

const ESTADO_ACT_CFG: Record<EstadoActividad, { label: string; dot: string; text: string; bg: string; border: string }> = {
  ACTIVO:     { label: "Activo",     dot: "#10B981", text: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-800/30" },
  EN_PROCESO: { label: "En proceso", dot: "#F59E0B", text: "text-amber-400",   bg: "bg-amber-950/40",   border: "border-amber-800/30"   },
  INACTIVO:   { label: "Inactivo",   dot: "#374151", text: "text-[#444]",      bg: "bg-[#111]",         border: "border-[#1e1e1e]"      },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseTiposEvento(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}
function stringifyTiposEvento(arr: string[]): string | null {
  return arr.length ? JSON.stringify(arr) : null;
}
function parseServicios(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [raw];
  } catch { return [raw]; }
}
function stringifyServicios(arr: string[]): string | null {
  return arr.length ? JSON.stringify(arr) : null;
}
function formatRelativo(iso: Date | string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  if (diff < 7) return `${diff}d`;
  if (diff < 30) return `${Math.floor(diff / 7)}sem`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
function inicial(name: string) { return (name?.charAt(0) ?? "?").toUpperCase(); }

// ─── OrigenBadge ─────────────────────────────────────────────────────────────

function OrigenBadge({ origen }: { origen: string }) {
  const col = ORIGEN_COLORS[origen] ?? { bg: "bg-[#1a1a1a]", text: "text-[#555]", border: "border-[#2a2a2a]" };
  return (
    <span className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide border ${col.bg} ${col.text} ${col.border} whitespace-nowrap`}>
      {ORIGEN_LABELS[origen] ?? origen}
    </span>
  );
}

// ─── EstadoActividadBadge ─────────────────────────────────────────────────────

function EstadoActividadBadge({ estado }: { estado: EstadoActividad }) {
  const cfg = ESTADO_ACT_CFG[estado];
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </div>
  );
}

// ─── InlineDropdown ───────────────────────────────────────────────────────────

function InlineDropdown({ options, value, onChange, placeholder = "—", colorMap }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  colorMap?: Record<string, { text: string; bg: string; border: string }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const current = options.find(o => o.value === value);
  const cfg = colorMap && current ? colorMap[current.value] : null;

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium transition-all cursor-pointer ${
          cfg ? `${cfg.bg} ${cfg.text} ${cfg.border} hover:brightness-110` : "border-transparent text-[#555] hover:text-[#aaa] hover:border-[#2a2a2a] hover:bg-[#1a1a1a]"
        }`}>
        {current ? <span>{current.label}</span> : <span className="text-[#2a2a2a]">{placeholder}</span>}
        <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-50 shrink-0"><polyline points="2 4 6 8 10 4"/></svg>
      </button>
      {open && (
        <div className="ms-dropdown left-0 top-full mt-1 min-w-[140px]">
          {options.map(opt => {
            const oc = colorMap?.[opt.value];
            return (
              <button key={opt.value} type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[11px] transition-colors hover:bg-[#1e1e1e] ${value === opt.value ? "text-[#B3985B]" : "text-gray-300"}`}>
                {oc && <span className={`w-2 h-2 rounded-full border ${oc.bg} ${oc.border}`} />}
                {opt.label}
                {value === opt.value && <span className="ml-auto text-[#B3985B] text-[10px]">✓</span>}
              </button>
            );
          })}
          {value && (
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[11px] text-[#444] hover:text-red-400 hover:bg-[#1e1e1e] transition-colors border-t border-[#1e1e1e] mt-0.5">
              Quitar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── InlineMultiSelect ────────────────────────────────────────────────────────

function InlineMultiSelect({ options, values, onChange, placeholder = "—", maxSelect = 4, colorMap, renderValue }: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  maxSelect?: number;
  colorMap?: Record<string, string>;
  renderValue?: (values: string[]) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function toggle(v: string) {
    if (values.includes(v)) onChange(values.filter(x => x !== v));
    else if (values.length < maxSelect) onChange([...values, v]);
    setOpen(false);
  }

  const displayLabel = values.length === 0
    ? null
    : values.length === 1
    ? (options.find(o => o.value === values[0])?.label ?? values[0])
    : `${values.length} selec.`;

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium transition-all cursor-pointer ${
          values.length > 0
            ? "border-transparent text-gray-300 hover:border-[#2a2a2a] hover:bg-[#1a1a1a]"
            : "border-transparent text-[#555] hover:text-[#aaa] hover:border-[#2a2a2a] hover:bg-[#1a1a1a]"
        }`}>
        {renderValue ? renderValue(values) : displayLabel
          ? <span>{displayLabel}</span>
          : <span className="text-[#2a2a2a]">{placeholder}</span>
        }
        <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-50 shrink-0"><polyline points="2 4 6 8 10 4"/></svg>
      </button>
      {open && (
        <div className="ms-dropdown left-0 top-full mt-1 min-w-[160px]">
          <p className="text-[9px] text-[#444] uppercase tracking-wider px-3 py-1.5">Selecciona hasta {maxSelect}</p>
          {options.map(opt => {
            const active = values.includes(opt.value);
            const disabled = !active && values.length >= maxSelect;
            return (
              <button key={opt.value} type="button" onClick={() => toggle(opt.value)} disabled={disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] transition-colors ${disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-[#1e1e1e]"} ${active ? "text-white" : "text-gray-400"}`}>
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${active ? "border-transparent" : "border-[#333]"}`}
                  style={active ? { backgroundColor: colorMap?.[opt.value] ?? "#B3985B" } : undefined}>
                  {active && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                </span>
                {opt.label}
              </button>
            );
          })}
          {values.length > 0 && (
            <button type="button" onClick={() => onChange([])}
              className="w-full text-left px-3 py-2 text-[11px] text-[#444] hover:text-red-400 hover:bg-[#1e1e1e] transition-colors border-t border-[#1e1e1e] mt-0.5">
              Quitar todo
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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function select(u: Vendedor | null) {
    setOpen(false); setSaving(true);
    await fetch(`/api/clientes/${clienteId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendedorId: u?.id ?? null }),
    });
    onChange(u); setSaving(false);
  }

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[11px] group cursor-pointer">
        {saving ? <span className="text-[#444] animate-pulse text-[11px]">…</span>
          : vendedor ? (
            <>
              <span className="w-5 h-5 rounded-full bg-[#B3985B]/15 border border-[#B3985B]/25 flex items-center justify-center text-[8px] text-[#B3985B] font-bold shrink-0">
                {inicial(vendedor.name)}
              </span>
              <span className="text-[#666] group-hover:text-[#999] transition-colors truncate max-w-[70px]">
                {vendedor.name.split(" ")[0]}
              </span>
            </>
          ) : <span className="text-[#2a2a2a] group-hover:text-[#444] transition-colors">Sin asignar</span>
        }
      </button>
      {open && (
        <div className="ms-dropdown left-0 top-full mt-1 min-w-[160px]">
          <p className="text-[9px] text-[#444] uppercase tracking-wider px-3 py-1.5">Responsable</p>
          {usuarios.map(u => (
            <button key={u.id} type="button" onClick={() => select(u)}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[11px] transition-colors hover:bg-[#1e1e1e] ${u.id === vendedor?.id ? "text-[#B3985B]" : "text-gray-300"}`}>
              <span className="w-4 h-4 rounded-full bg-[#B3985B]/15 border border-[#B3985B]/25 flex items-center justify-center text-[8px] text-[#B3985B] font-bold shrink-0">
                {inicial(u.name)}
              </span>
              {u.name.split(" ").slice(0, 2).join(" ")}
              {u.id === vendedor?.id && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          ))}
          {vendedor && (
            <button type="button" onClick={() => select(null)}
              className="w-full text-left px-3 py-2 text-[11px] text-[#444] hover:text-red-400 hover:bg-[#1e1e1e] transition-colors border-t border-[#1e1e1e]">
              Quitar asignación
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors focus:outline-none bg-[#0d0d0d] cursor-pointer ${
        value ? "border-[#B3985B]/40 text-[#B3985B]" : "border-[#1a1a1a] text-[#444]"
      }`}>
      <option value="">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── ContactoRow ─────────────────────────────────────────────────────────────

function ContactoRow({
  c, usuarios, tab, actividadMap,
  onSaved, onVendedorChange, onDelete, deleting,
  onConvertir, onReclasificar,
  empresaPopoverOpen, onEmpresaClick, empresaMode, setEmpresaMode,
  empresaSearch, setEmpresaSearch, empresaResults, empresaSearching,
  onVincularEmpresa, onCloseEmpresa,
}: {
  c: Contacto; usuarios: Vendedor[]; tab: Tab;
  actividadMap: Record<string, EstadoActividad>;
  onSaved: (updated: Partial<Contacto>) => void;
  onVendedorChange: (v: Vendedor | null) => void;
  onDelete: () => void; deleting: boolean;
  onConvertir: () => void;
  onReclasificar: (esProspecto: boolean) => void;
  empresaPopoverOpen: boolean; onEmpresaClick: () => void;
  empresaMode: "view" | "search"; setEmpresaMode: (m: "view" | "search") => void;
  empresaSearch: string; setEmpresaSearch: (s: string) => void;
  empresaResults: { id: string; nombre: string }[];
  empresaSearching: boolean;
  onVincularEmpresa: (id: string, nombre: string) => void;
  onCloseEmpresa: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function patch(campo: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch(`/api/clientes/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campo),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); setSaving(false); return; }
    const d = await res.json();
    onSaved(d.cliente ?? campo);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  const eventosActuales = parseTiposEvento(c.tiposEvento);
  const serviciosActuales = parseServicios(c.servicioUsual);
  const estadoActividad = actividadMap[c.id] ?? "INACTIVO";

  return (
    <tr className="ms-tr group cursor-pointer" onClick={() => { window.location.href = `/crm/clientes/${c.id}`; }}>
      {/* Nombre */}
      <td className="px-4 py-2.5 align-middle overflow-visible">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Link href={`/crm/clientes/${c.id}`}
              onClick={e => e.stopPropagation()}
              className="text-[13px] text-white font-semibold leading-tight hover:text-[#B3985B] transition-colors truncate max-w-[155px] block">
              {c.nombre}
            </Link>
            
          </div>
          {c.correo && (
            <span className="flex items-center gap-0.5">
              <p className="text-[10px] text-[#3a3a3a] truncate max-w-[155px]">{c.correo}</p>
              <CopyButton value={c.correo} size="xs" />
            </span>
          )}
          {(saving || saved) && (
            <span className={`text-[9px] ${saving ? "text-[#444] animate-pulse" : "text-emerald-600"}`}>
              {saving ? "Guardando…" : "✓ Guardado"}
            </span>
          )}
        </div>
      </td>

      {/* Empresa */}
      <td className="px-3 py-2.5 align-middle overflow-visible">
        <div className="relative" data-empresa-popover>
          <button onClick={e => { e.stopPropagation(); onEmpresaClick(); }} className="text-left focus:outline-none w-full">
            {c.compania
              ? <span className="text-[12px] text-[#B3985B] hover:text-[#c9a96a] transition-colors truncate block">{c.compania.nombre}</span>
              : c.empresa
              ? <span className="text-[12px] text-[#555] truncate block">{c.empresa}</span>
              : <span className="text-[11px] text-[#252525] hover:text-[#444] transition-colors">+ Vincular</span>
            }
          </button>
          {empresaPopoverOpen && (
            <div className="ms-dropdown left-0 top-full mt-1 py-2" style={{ width: 240 }} onClick={e => e.stopPropagation()}>
              {empresaMode === "view" && c.compania ? (
                <>
                  <p className="text-[9px] text-[#444] uppercase tracking-wider px-3 pb-2">Empresa</p>
                  <a href={`/catalogo/empresas/${c.compania.id}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-300 hover:bg-[#1e1e1e] transition-colors" onClick={onCloseEmpresa}>
                    <span>Ver empresa</span><span className="text-[#444]">→</span>
                  </a>
                  <button onClick={() => { setEmpresaMode("search"); setEmpresaSearch(""); }}
                    className="w-full flex items-center px-3 py-2 text-[11px] text-gray-300 hover:bg-[#1e1e1e] transition-colors">
                    Cambiar empresa
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[9px] text-[#444] uppercase tracking-wider px-3 pb-2">Vincular empresa</p>
                  <div className="px-3 pb-2">
                    <input autoFocus value={empresaSearch} onChange={e => setEmpresaSearch(e.target.value)}
                      placeholder="Buscar empresa..."
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-[#333] focus:outline-none focus:border-[#B3985B]/40" />
                  </div>
                  <div className="max-h-[160px] overflow-y-auto">
                    {empresaSearching && <p className="text-[11px] text-[#444] px-3 py-2">Buscando…</p>}
                    {!empresaSearching && empresaResults.length === 0 && empresaSearch.trim() && (
                      <p className="text-[11px] text-[#444] px-3 py-2">Sin resultados</p>
                    )}
                    {empresaResults.map(emp => (
                      <button key={emp.id} onClick={() => onVincularEmpresa(emp.id, emp.nombre)}
                        className="w-full text-left px-3 py-2 text-[11px] text-gray-300 hover:bg-[#1e1e1e] transition-colors">
                        {emp.nombre}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </td>

      {/* Tipo */}
      <td className="px-3 py-2.5 align-middle overflow-visible">
        <InlineDropdown options={TIPO_CLIENTE_OPTIONS} value={c.tipoCliente}
          onChange={v => patch({ tipoCliente: v })} placeholder="Tipo"
          colorMap={TIPO_COLORS} />
      </td>

      {/* Clasificación */}
      <td className="px-3 py-2.5 align-middle overflow-visible">
        <InlineDropdown options={CLASIFICACION_OPTIONS} value={c.clasificacion}
          onChange={v => patch({ clasificacion: v })} placeholder="Clasif."
          colorMap={CLAS_COLORS} />
      </td>

      {/* Servicio (multi) */}
      <td className="px-3 py-2.5 align-middle overflow-visible">
        <InlineMultiSelect options={SERVICIO_OPTIONS} values={serviciosActuales}
          onChange={v => patch({ servicioUsual: stringifyServicios(v) })}
          placeholder="Servicio" maxSelect={3} colorMap={SERVICIO_COLORS} />
      </td>

      {/* Tipo de Evento (multi) */}
      <td className="px-3 py-2.5 align-middle overflow-visible">
        <InlineMultiSelect options={TIPOS_EVENTO_OPTIONS} values={eventosActuales}
          onChange={v => patch({ tiposEvento: stringifyTiposEvento(v) })}
          placeholder="Tipo evento" maxSelect={3} colorMap={EVENTO_COLORS}
          renderValue={(vals) => {
            if (vals.length === 0) return <span className="text-[#2a2a2a]">Tipo evento</span>;
            return (
              <div className="flex flex-wrap gap-1.5 pointer-events-none">
                {vals.map(t => {
                  const opt = TIPOS_EVENTO_OPTIONS.find(o => o.value === t);
                  const style = TIPO_EVENTO_BADGE[t] ?? TIPO_EVENTO_BADGE.VARIOS;
                  return (
                    <div key={t} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border border-transparent ${style.bg} ${style.text}`}>
                        {opt?.label ?? t}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
      </td>

      {/* Actividad */}
      <td className="px-3 py-2.5 align-middle overflow-visible">
        <EstadoActividadBadge estado={estadoActividad} />
      </td>

      {/* Responsable */}
      <td className="px-3 py-2.5 align-middle overflow-visible">
        <InlineVendedor clienteId={c.id} vendedor={c.vendedor} usuarios={usuarios} onChange={onVendedorChange} />
      </td>

      {/* Tratos */}
      <td className="px-3 py-2.5 text-center align-middle">
        <span className="text-[12px] text-[#555]">{c._count.tratos || "—"}</span>
      </td>

      {/* Acciones — overlay flotante para no encimarse con las columnas vecinas */}
      <td className="relative px-3 py-2.5 align-middle">
        <div className="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 pr-3 pl-14 bg-gradient-to-l from-[#111] from-60% to-transparent opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
          {tab === "prospectos" && (
            <>
              <button onClick={e => { e.stopPropagation(); onConvertir(); }}
                className="cursor-pointer text-[10px] font-medium px-2 py-1 rounded-md border border-emerald-800/30 text-emerald-500/80 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all whitespace-nowrap">
                → Cliente
              </button>
              <a href={`/crm/tratos?clienteId=${c.id}`} onClick={e => e.stopPropagation()}
                className="cursor-pointer text-[10px] font-medium px-2 py-1 rounded-md border border-[#1e1e1e] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/40 hover:bg-[#B3985B]/10 transition-all whitespace-nowrap">
                + Trato
              </a>
            </>
          )}
          {tab === "clientes" && (
            <>
              <a href={`/crm/tratos?clienteId=${c.id}`} onClick={e => e.stopPropagation()}
                className="cursor-pointer text-[10px] font-medium px-2 py-1 rounded-md border border-[#1e1e1e] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/40 hover:bg-[#B3985B]/10 transition-all whitespace-nowrap">
                + Trato
              </a>
              <button onClick={e => { e.stopPropagation(); onReclasificar(true); }} title="Marcar como prospecto (corrección)"
                className="cursor-pointer text-[10px] font-medium px-2 py-1 rounded-md border border-[#1e1e1e] text-[#666] hover:text-purple-300 hover:border-purple-500/40 hover:bg-purple-500/10 transition-all whitespace-nowrap">
                → Prospecto
              </button>
            </>
          )}
          {tab === "sin-clasificar" && (
            <>
              <button onClick={e => { e.stopPropagation(); onReclasificar(false); }}
                className="cursor-pointer text-[10px] font-medium px-2 py-1 rounded-md border border-[#1e1e1e] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/40 hover:bg-[#B3985B]/10 transition-all whitespace-nowrap">
                → Cliente
              </button>
              <a href={`/crm/tratos?clienteId=${c.id}`} onClick={e => e.stopPropagation()}
                className="cursor-pointer text-[10px] font-medium px-2 py-1 rounded-md border border-[#1e1e1e] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/40 hover:bg-[#B3985B]/10 transition-all whitespace-nowrap">
                + Trato
              </a>
            </>
          )}
          <Link href={`/crm/clientes/${c.id}`} onClick={e => e.stopPropagation()}
            className="cursor-pointer p-1.5 rounded-md text-[#555] hover:text-[#B3985B] hover:bg-[#B3985B]/10 transition-all" title="Ver perfil">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </Link>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} disabled={deleting}
            className="cursor-pointer p-1.5 rounded-md text-[#555] hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40" title="Eliminar">
            {deleting ? (
              <span className="text-[10px] font-medium">...</span>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── ModalNuevoContacto ────────────────────────────────────────────────────────

function ModalNuevoContacto({ onClose, onCreado, usuarios }: {
  onClose: () => void;
  onCreado: (c: Contacto) => void;
  usuarios: Vendedor[];
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "", telefono: "", correo: "", empresa: "",
    tipoCliente: "POR_DESCUBRIR",
    clasificacion: "PROSPECTO",
    origenLead: "META_ADS",
    notas: "",
    esCliente: false,
  });
  function setF(k: string, v: unknown) { setForm(p => ({ ...p, [k]: v })); }

  async function crear() {
    if (!form.nombre.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    const res = await fetch("/api/clientes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        correo: form.correo.trim() || null,
        empresa: form.empresa.trim() || null,
        tipoCliente: form.tipoCliente,
        clasificacion: form.esCliente ? (form.clasificacion === "PROSPECTO" ? "NUEVO" : form.clasificacion) : "PROSPECTO",
        origenLead: form.origenLead,
        notas: form.notas.trim() || null,
        esProspecto: !form.esCliente,
      }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al crear"); setSaving(false); return; }
    const d = await res.json();
    onCreado(d.cliente);
    toast.success(`${form.nombre.trim()} registrado correctamente`);
    onClose();
  }

  const inputCls = "ms-input";
  const labelCls = "ms-micro block mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <h3 className="text-white font-semibold text-sm">Nuevo contacto</h3>
          <button onClick={onClose} className="text-[#444] hover:text-white text-xl leading-none transition-colors">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2 p-1.5 bg-[#111] border border-[#1a1a1a] rounded-xl">
            <button onClick={() => setF("esCliente", false)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!form.esCliente ? "bg-purple-900/40 text-purple-300 border border-purple-800/40" : "text-[#444] hover:text-gray-400"}`}>
              Prospecto nuevo
            </button>
            <button onClick={() => setF("esCliente", true)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${form.esCliente ? "bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30" : "text-[#444] hover:text-gray-400"}`}>
              Ya es cliente
            </button>
          </div>
          <p className="text-[10px] text-[#333]">
            {form.esCliente ? "Contacto que ya ha comprado pero no está registrado." : "Se registrará como prospecto. Se convierte a cliente al aprobar una cotización."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Nombre <span className="text-red-500">*</span></label>
              <input value={form.nombre} onChange={e => setF("nombre", e.target.value)} placeholder="Nombre completo" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input value={form.telefono} onChange={e => setF("telefono", e.target.value)} placeholder="55 1234 5678" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Correo</label>
              <input type="email" value={form.correo} onChange={e => setF("correo", e.target.value)} placeholder="correo@ejemplo.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Empresa</label>
              <input value={form.empresa} onChange={e => setF("empresa", e.target.value)} placeholder="Empresa (opcional)" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Origen del lead</label>
              <select value={form.origenLead} onChange={e => setF("origenLead", e.target.value)}
                className="ms-input">
                {ORIGEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tipo de cliente</label>
              <select value={form.tipoCliente} onChange={e => setF("tipoCliente", e.target.value)}
                className="ms-input">
                {TIPO_CLIENTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {form.esCliente && (
              <div>
                <label className={labelCls}>Clasificación inicial</label>
                <select value={form.clasificacion} onChange={e => setF("clasificacion", e.target.value)}
                  className="ms-input">
                  {CLASIFICACION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className={labelCls}>Notas</label>
              <textarea value={form.notas} onChange={e => setF("notas", e.target.value)} rows={2} placeholder="Información adicional…"
                className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1a1a1a]">
          <button onClick={onClose} className="ms-btn-secondary">
            Cancelar
          </button>
          <button onClick={crear} disabled={saving || !form.nombre.trim()}
            className="ms-btn-primary px-5">
            {saving ? "Registrando…" : form.esCliente ? "Registrar como cliente" : "Registrar prospecto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ContactList ──────────────────────────────────────────────────────────────

function ContactList({
  contactos, usuarios, tab, actividadMap,
  onSaved, onVendedorChange, onDelete, deletingId, onConvertir, onReclasificar,
  empresaPopoverId, setEmpresaPopoverId, empresaMode, setEmpresaMode,
  empresaSearch, setEmpresaSearch, empresaResults, empresaSearching,
  handleVincularEmpresa, closeEmpresaPopover,
}: {
  contactos: Contacto[]; usuarios: Vendedor[]; tab: Tab;
  actividadMap: Record<string, EstadoActividad>;
  onSaved: (id: string, updated: Partial<Contacto>) => void;
  onVendedorChange: (id: string, v: Vendedor | null) => void;
  onDelete: (c: Contacto) => void; deletingId: string | null;
  onConvertir: (c: Contacto) => void;
  onReclasificar: (c: Contacto, esProspecto: boolean) => void;
  empresaPopoverId: string | null; setEmpresaPopoverId: (id: string | null) => void;
  empresaMode: "view" | "search"; setEmpresaMode: (m: "view" | "search") => void;
  empresaSearch: string; setEmpresaSearch: (s: string) => void;
  empresaResults: { id: string; nombre: string }[];
  empresaSearching: boolean;
  handleVincularEmpresa: (cid: string, empId: string, empNombre: string) => void;
  closeEmpresaPopover: () => void;
}) {
  if (contactos.length === 0) return (
    <div className="ms-card-deep py-16 text-center">
      <p className="text-[#333] text-sm">No hay registros en esta sección</p>
    </div>
  );

  const HEADERS = ["Nombre", "Empresa", "Tipo", "Clasificación", "Servicio", "Tipo de Evento", "Actividad", "Responsable", "Tratos", ""];

  return (
    <div className="ms-card-deep" style={{ overflowX: "auto" }}>
      <table className="w-full table-fixed" style={{ minWidth: 1100 }}>
        <colgroup>
          <col style={{ width: 220 }} />
          <col style={{ width: 140 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 115 }} />
          <col style={{ width: 130 }} />
          <col style={{ width: 140 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 60 }}  />
          <col style={{ width: 90 }}  />
        </colgroup>
        <thead>
          <tr className="border-b border-[#111]">
            {HEADERS.map((h, i) => (
              <th key={i} className={`text-left text-[9px] uppercase tracking-[0.12em] text-[#333] px-4 py-2.5 font-semibold whitespace-nowrap ${i >= 2 ? "px-3" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contactos.map(c => (
            <ContactoRow
              key={c.id} c={c} usuarios={usuarios} tab={tab} actividadMap={actividadMap}
              onSaved={updated => onSaved(c.id, updated)}
              onVendedorChange={v => onVendedorChange(c.id, v)}
              onDelete={() => onDelete(c)}
              deleting={deletingId === c.id}
              onConvertir={() => onConvertir(c)}
              onReclasificar={esp => onReclasificar(c, esp)}
              empresaPopoverOpen={empresaPopoverId === c.id}
              onEmpresaClick={() => {
                if (empresaPopoverId === c.id) { setEmpresaPopoverId(null); return; }
                setEmpresaMode(c.compania ? "view" : "search");
                setEmpresaSearch("");
                setEmpresaPopoverId(c.id);
              }}
              empresaMode={empresaMode} setEmpresaMode={setEmpresaMode}
              empresaSearch={empresaSearch} setEmpresaSearch={setEmpresaSearch}
              empresaResults={empresaResults} empresaSearching={empresaSearching}
              onVincularEmpresa={(empId, empNombre) => handleVincularEmpresa(c.id, empId, empNombre)}
              onCloseEmpresa={closeEmpresaPopover}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── ResumenTab ───────────────────────────────────────────────────────────────

function DistBar({ label, count, total, color, list }: { label: string; count: number; total: number; color: string; list: Contacto[] }) {
  const [open, setOpen] = useState(false);
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="group/bar">
      <div className="flex items-center gap-2 py-1.5 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <span className="text-[11px] text-[#666] w-[110px] truncate shrink-0">{label}</span>
        <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="text-[10px] text-[#555] w-[28px] text-right shrink-0">{count}</span>
        <span className="text-[9px] text-[#333] w-[28px] text-right shrink-0">{pct}%</span>
        <svg className={`w-3 h-3 text-[#333] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 4 6 8 10 4"/></svg>
      </div>
      {open && list.length > 0 && (
        <div className="ml-[114px] mb-2 border-l border-[#1a1a1a] pl-3 space-y-0.5">
          {list.slice(0, 10).map(c => (
            <Link key={c.id} href={`/crm/clientes/${c.id}`}
              className="block text-[10px] text-[#555] hover:text-[#B3985B] transition-colors truncate">
              {c.nombre}
            </Link>
          ))}
          {list.length > 10 && <p className="text-[9px] text-[#333]">+{list.length - 10} más</p>}
        </div>
      )}
    </div>
  );
}

function ResumenTab({ clientes, prospectos, actividadMap, usuarios }: {
  clientes: Contacto[]; prospectos: Contacto[];
  actividadMap: Record<string, EstadoActividad>;
  usuarios: Vendedor[];
}) {
  const todos = useMemo(() => [...clientes, ...prospectos], [clientes, prospectos]);

  const activosC    = useMemo(() => todos.filter(c => actividadMap[c.id] === "ACTIVO"),     [todos, actividadMap]);
  const enProcesoC  = useMemo(() => todos.filter(c => actividadMap[c.id] === "EN_PROCESO"), [todos, actividadMap]);
  const inactivosC  = useMemo(() => todos.filter(c => actividadMap[c.id] === "INACTIVO"),   [todos, actividadMap]);

  const topClientes = useMemo(() => [...clientes].sort((a, b) => b._count.tratos - a._count.tratos).slice(0, 8), [clientes]);
  const recientes   = useMemo(() => [...todos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10), [todos]);

  // Distribuciones
  const porClasif    = useMemo(() => {
    const m = new Map<string, Contacto[]>();
    for (const c of todos) { if (!m.has(c.clasificacion)) m.set(c.clasificacion, []); m.get(c.clasificacion)!.push(c); }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [todos]);

  const porOrigen    = useMemo(() => {
    const m = new Map<string, Contacto[]>();
    for (const c of todos) { const o = c.origenLead ?? "SIN_ORIGEN"; if (!m.has(o)) m.set(o, []); m.get(o)!.push(c); }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [todos]);

  const porEvento    = useMemo(() => {
    const m = new Map<string, Contacto[]>();
    for (const c of todos) {
      for (const e of parseTiposEvento(c.tiposEvento)) { if (!m.has(e)) m.set(e, []); m.get(e)!.push(c); }
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [todos]);

  const porServicio  = useMemo(() => {
    const m = new Map<string, Contacto[]>();
    for (const c of todos) {
      for (const s of parseServicios(c.servicioUsual)) { if (!m.has(s)) m.set(s, []); m.get(s)!.push(c); }
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [todos]);

  const porResponsable = useMemo(() => {
    const m = new Map<string, { name: string; list: Contacto[] }>();
    for (const c of todos) {
      const key = c.vendedor?.id ?? "__none__";
      const name = c.vendedor?.name ?? "Sin asignar";
      if (!m.has(key)) m.set(key, { name, list: [] });
      m.get(key)!.list.push(c);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].list.length - a[1].list.length);
  }, [todos]);

  const statCards = [
    { label: "Activos", sub: "evento cerrado este mes", count: activosC.length, dot: "#10B981", bg: "from-emerald-900/30 to-[#0d0d0d]", border: "border-emerald-800/20", text: "text-emerald-400", list: activosC },
    { label: "En proceso", sub: "cotización pendiente este mes", count: enProcesoC.length, dot: "#F59E0B", bg: "from-amber-900/20 to-[#0d0d0d]", border: "border-amber-800/20", text: "text-amber-400", list: enProcesoC },
    { label: "Inactivos", sub: "sin actividad este mes", count: inactivosC.length, dot: "#374151", bg: "from-[#111] to-[#0d0d0d]", border: "border-[#1a1a1a]", text: "text-[#555]", list: inactivosC },
  ];

  const [expandedStat, setExpandedStat] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      {/* Estado de actividad — mes actual */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.14em] text-[#333] mb-3">Actividad — mes actual</p>
        <div className="grid grid-cols-3 gap-3">
          {statCards.map((s, i) => (
            <div key={i} className={`bg-gradient-to-b ${s.bg} border ${s.border} rounded-xl p-5 cursor-pointer transition-all hover:brightness-110`}
              onClick={() => setExpandedStat(expandedStat === i ? null : i)}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                <span className="text-[11px] text-[#666] font-medium">{s.label}</span>
              </div>
              <p className={`text-4xl font-bold ${s.text} leading-none mb-1`}>{s.count}</p>
              <p className="text-[10px] text-[#333]">{s.sub}</p>
              {expandedStat === i && s.list.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#1a1a1a] space-y-1">
                  {s.list.slice(0, 6).map(c => (
                    <Link key={c.id} href={`/crm/clientes/${c.id}`}
                      className="block text-[10px] text-[#555] hover:text-[#B3985B] transition-colors truncate">
                      {c.nombre}
                    </Link>
                  ))}
                  {s.list.length > 6 && <p className="text-[9px] text-[#333]">+{s.list.length - 6} más…</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dos columnas: top clientes + recientes */}
      <div className="grid grid-cols-2 gap-4">
        {/* Mejores clientes */}
        <div className="ms-card-deep p-5">
          <p className="text-[9px] uppercase tracking-[0.14em] text-[#333] mb-4">Mejores clientes</p>
          {topClientes.length === 0
            ? <p className="text-[#333] text-xs">Sin datos</p>
            : <div className="space-y-1.5">
                {topClientes.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-[10px] text-[#2a2a2a] w-4 shrink-0 text-right">{i + 1}</span>
                    <Link href={`/crm/clientes/${c.id}`}
                      className="flex-1 text-[12px] text-[#777] hover:text-[#B3985B] transition-colors truncate">
                      {c.nombre}
                    </Link>
                    <span className="text-[10px] text-[#444] shrink-0">{c._count.tratos} tratos</span>
                    <EstadoActividadBadge estado={actividadMap[c.id] ?? "INACTIVO"} />
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Registros recientes */}
        <div className="ms-card-deep p-5">
          <p className="text-[9px] uppercase tracking-[0.14em] text-[#333] mb-4">Registros recientes</p>
          {recientes.length === 0
            ? <p className="text-[#333] text-xs">Sin datos</p>
            : <div className="space-y-1.5">
                {recientes.map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-[10px] text-[#333] shrink-0 w-[30px]">{formatRelativo(c.createdAt)}</span>
                    <Link href={`/crm/clientes/${c.id}`}
                      className="flex-1 text-[12px] text-[#777] hover:text-[#B3985B] transition-colors truncate">
                      {c.nombre}
                    </Link>
                    {c.origenLead && <OrigenBadge origen={c.origenLead} />}
                    {c.vendedor && (
                      <span className="text-[9px] text-[#444] shrink-0 truncate max-w-[50px]">{c.vendedor.name.split(" ")[0]}</span>
                    )}
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Distribuciones */}
      <div className="grid grid-cols-2 gap-4">
        {/* Por clasificación */}
        <div className="ms-card-deep p-5">
          <p className="text-[9px] uppercase tracking-[0.14em] text-[#333] mb-4">Por clasificación</p>
          {porClasif.map(([clas, list]) => {
            const cfg = CLAS_COLORS[clas];
            return <DistBar key={clas} label={CLASIFICACION_LABELS[clas] ?? clas} count={list.length} total={todos.length} color={cfg?.text?.replace("text-", "").replace("[", "").replace("]", "") ?? "#6b7280"} list={list} />;
          })}
          {porClasif.length === 0 && <p className="text-[#333] text-xs">Sin datos</p>}
        </div>

        {/* Por origen */}
        <div className="ms-card-deep p-5">
          <p className="text-[9px] uppercase tracking-[0.14em] text-[#333] mb-4">Por origen de lead</p>
          {porOrigen.map(([orig, list]) => {
            const colors = ["#3B82F6", "#EC4899", "#F59E0B", "#10B981", "#B3985B", "#8B5CF6"];
            const idx = ORIGEN_OPTIONS.findIndex(o => o.value === orig);
            return <DistBar key={orig} label={ORIGEN_LABELS[orig] ?? orig} count={list.length} total={todos.length} color={colors[idx] ?? "#6b7280"} list={list} />;
          })}
          {porOrigen.length === 0 && <p className="text-[#333] text-xs">Sin datos</p>}
        </div>

        {/* Por tipo de evento */}
        <div className="ms-card-deep p-5">
          <p className="text-[9px] uppercase tracking-[0.14em] text-[#333] mb-4">Por tipo de evento</p>
          {porEvento.map(([ev, list]) => (
            <DistBar key={ev} label={TIPOS_EVENTO_OPTIONS.find(o => o.value === ev)?.label ?? ev} count={list.length} total={todos.length} color={EVENTO_COLORS[ev] ?? "#6b7280"} list={list} />
          ))}
          {porEvento.length === 0 && <p className="text-[#333] text-xs">Sin datos registrados de tipo evento</p>}
        </div>

        {/* Por servicio */}
        <div className="ms-card-deep p-5">
          <p className="text-[9px] uppercase tracking-[0.14em] text-[#333] mb-4">Por servicio habitual</p>
          {porServicio.map(([sv, list]) => (
            <DistBar key={sv} label={SERVICIO_OPTIONS.find(o => o.value === sv)?.label ?? sv} count={list.length} total={todos.length} color={SERVICIO_COLORS[sv] ?? "#6b7280"} list={list} />
          ))}
          {porServicio.length === 0 && <p className="text-[#333] text-xs">Sin servicios registrados</p>}
        </div>
      </div>

      {/* Por responsable */}
      <div className="ms-card-deep p-5">
        <p className="text-[9px] uppercase tracking-[0.14em] text-[#333] mb-4">Por responsable</p>
        <div className="space-y-0.5">
          {porResponsable.map(([id, { name, list }]) => (
            <DistBar key={id} label={name} count={list.length} total={todos.length} color={id === "__none__" ? "#374151" : "#B3985B"} list={list} />
          ))}
          {porResponsable.length === 0 && <p className="text-[#333] text-xs">Sin datos</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

function WaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  );
}

export default function BaseDeDatosClient({ clientes: initClientes, prospectos: initProspectos, sinClasificar: initSin, usuarios, actividadMap }: Props) {
  const confirm = useConfirm();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("clientes");
  const [clientes, setClientes]         = useState<Contacto[]>(initClientes);
  const [prospectos, setProspectos]     = useState<Contacto[]>(initProspectos);
  const [sinClasificar, setSinClasificar] = useState<Contacto[]>(initSin);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [showModal, setShowModal]       = useState(false);

  // Empresa popover
  const [empresaPopoverId, setEmpresaPopoverId] = useState<string | null>(null);
  const [empresaMode, setEmpresaMode]           = useState<"view" | "search">("view");
  const [empresaSearch, setEmpresaSearch]       = useState("");
  const [empresaResults, setEmpresaResults]     = useState<{ id: string; nombre: string }[]>([]);
  const [empresaSearching, setEmpresaSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [busqueda, setBusqueda]                     = useState("");
  const [filtroTipo, setFiltroTipo]                 = useState("");
  const [filtroClasificacion, setFiltroClasificacion] = useState("");
  const [filtroServicio, setFiltroServicio]         = useState("");
  const [filtroEvento, setFiltroEvento]             = useState("");
  const [filtroVendedor, setFiltroVendedor]         = useState("");
  const [filtroActividad, setFiltroActividad]       = useState("");

  const hayFiltros = busqueda || filtroTipo || filtroClasificacion || filtroServicio || filtroEvento || filtroVendedor || filtroActividad;
  function limpiarFiltros() {
    setBusqueda(""); setFiltroTipo(""); setFiltroClasificacion(""); setFiltroServicio("");
    setFiltroEvento(""); setFiltroVendedor(""); setFiltroActividad("");
  }

  const vendedorOptions = usuarios.map(u => ({ value: u.id, label: u.name }));

  // Empresa search
  useEffect(() => {
    if (!empresaSearch.trim() || empresaSearch.length < 2) { setEmpresaResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setEmpresaSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/empresas?q=${encodeURIComponent(empresaSearch)}&limit=10`);
        const d = await res.json();
        setEmpresaResults(d.empresas ?? []);
      } catch { setEmpresaResults([]); }
      setEmpresaSearching(false);
    }, 300);
  }, [empresaSearch]);

  function closeEmpresaPopover() {
    setEmpresaPopoverId(null); setEmpresaMode("view"); setEmpresaSearch(""); setEmpresaResults([]);
  }
  useEffect(() => {
    if (!empresaPopoverId) return;
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-empresa-popover]")) closeEmpresaPopover(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [empresaPopoverId]);

  // ── State updaters ───────────────────────────────────────────────────────────

  function actualizarCampos(id: string, updated: Partial<Contacto>) {
    const apply = (prev: Contacto[]) => prev.map(c => c.id === id ? { ...c, ...updated } : c);
    setClientes(apply); setProspectos(apply); setSinClasificar(apply);
  }
  function actualizarVendedor(id: string, v: Vendedor | null) {
    const apply = (prev: Contacto[]) => prev.map(c => c.id === id ? { ...c, vendedor: v, vendedorId: v?.id ?? null } : c);
    setClientes(apply); setProspectos(apply); setSinClasificar(apply);
  }
  function removerDe(id: string, source: Tab) {
    const apply = (prev: Contacto[]) => prev.filter(c => c.id !== id);
    if (source === "clientes") setClientes(apply);
    else if (source === "prospectos") setProspectos(apply);
    else setSinClasificar(apply);
  }

  // ── Empresa ──────────────────────────────────────────────────────────────────

  async function handleVincularEmpresa(cid: string, empId: string, empNombre: string) {
    closeEmpresaPopover();
    const res = await fetch(`/api/clientes/${cid}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId: empId }),
    });
    if (!res.ok) { toast.error("Error al vincular empresa"); return; }
    const d = await res.json();
    actualizarCampos(cid, { compania: d.cliente?.compania ?? { id: empId, nombre: empNombre }, empresa: empNombre });
  }

  // ── Convertir / Reclasificar ─────────────────────────────────────────────────

  async function convertirACliente(c: Contacto) {
    const ok = await confirm({ message: `¿Confirmar que "${c.nombre}" ya es cliente?`, confirmText: "Convertir a Cliente" });
    if (!ok) return;
    const res = await fetch(`/api/clientes/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ esProspecto: false, clasificacion: c.clasificacion === "PROSPECTO" ? "NUEVO" : c.clasificacion }),
    });
    if (!res.ok) { toast.error("Error al convertir"); return; }
    const d = await res.json();
    // Fusionar sobre el contacto existente: la respuesta del PATCH no trae _count
    // ni el resto de campos que la fila necesita para renderizar.
    removerDe(c.id, tab); setClientes(prev => [{ ...c, ...d.cliente }, ...prev]);
    toast.success(`${c.nombre} movido a Clientes`); setTab("clientes");
  }
  async function reclasificar(c: Contacto, esProspecto: boolean) {
    const res = await fetch(`/api/clientes/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ esProspecto, clasificacion: !esProspecto && c.clasificacion === "PROSPECTO" ? "NUEVO" : c.clasificacion }),
    });
    if (!res.ok) { toast.error("Error al reclasificar"); return; }
    const d = await res.json();
    const merged = { ...c, ...d.cliente };
    removerDe(c.id, tab);
    if (esProspecto) setProspectos(prev => [merged, ...prev]);
    else setClientes(prev => [merged, ...prev]);
    toast.success(`${c.nombre} movido a ${esProspecto ? "Prospectos" : "Clientes"}`);
  }
  async function eliminar(c: Contacto) {
    const ok = await confirm({ message: `¿Eliminar a "${c.nombre}"? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    setDeletingId(c.id);
    const res = await fetch(`/api/clientes/${c.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); setDeletingId(null); return; }
    removerDe(c.id, tab); setDeletingId(null); toast.success("Contacto eliminado");
  }
  function onCreado(c: Contacto) {
    if (c.esProspecto) { setProspectos(prev => [c, ...prev]); setTab("prospectos"); }
    else { setClientes(prev => [c, ...prev]); setTab("clientes"); }
  }

  // ── Filtrado ─────────────────────────────────────────────────────────────────

  function filtrar(lista: Contacto[]): Contacto[] {
    const q = busqueda.toLowerCase().trim();
    return lista.filter(c => {
      const emp = c.compania?.nombre ?? c.empresa ?? "";
      if (q && !c.nombre.toLowerCase().includes(q) && !emp.toLowerCase().includes(q)
        && !(c.correo ?? "").toLowerCase().includes(q) && !(c.telefono ?? "").includes(q)) return false;
      if (filtroTipo && c.tipoCliente !== filtroTipo) return false;
      if (filtroClasificacion && c.clasificacion !== filtroClasificacion) return false;
      if (filtroServicio && !parseServicios(c.servicioUsual).includes(filtroServicio)) return false;
      if (filtroEvento && !parseTiposEvento(c.tiposEvento).includes(filtroEvento)) return false;
      if (filtroVendedor && c.vendedorId !== filtroVendedor) return false;
      if (filtroActividad && (actividadMap[c.id] ?? "INACTIVO") !== filtroActividad) return false;
      return true;
    });
  }

  const clientesFiltrados    = useMemo(() => filtrar(clientes),      [clientes,      busqueda, filtroTipo, filtroClasificacion, filtroServicio, filtroEvento, filtroVendedor, filtroActividad]);
  const prospectosFiltrados  = useMemo(() => filtrar(prospectos),    [prospectos,    busqueda, filtroTipo, filtroClasificacion, filtroServicio, filtroEvento, filtroVendedor, filtroActividad]);
  const sinClasifFiltrados   = useMemo(() => filtrar(sinClasificar), [sinClasificar, busqueda, filtroTipo, filtroClasificacion, filtroServicio, filtroEvento, filtroVendedor, filtroActividad]);

  const listaActual = tab === "clientes" ? clientesFiltrados : tab === "prospectos" ? prospectosFiltrados : sinClasifFiltrados;

  // ── Shared table props ────────────────────────────────────────────────────────

  const tableProps = {
    usuarios, tab, actividadMap,
    onSaved: actualizarCampos, onVendedorChange: actualizarVendedor, onDelete: eliminar, deletingId,
    onConvertir: convertirACliente, onReclasificar: reclasificar,
    empresaPopoverId, setEmpresaPopoverId, empresaMode, setEmpresaMode,
    empresaSearch, setEmpresaSearch, empresaResults, empresaSearching,
    handleVincularEmpresa, closeEmpresaPopover,
  };

  // ─── Counts ──────────────────────────────────────────────────────────────────
  const activosTotal    = useMemo(() => [...clientes, ...prospectos].filter(c => actividadMap[c.id] === "ACTIVO").length,     [clientes, prospectos, actividadMap]);
  const enProcesoTotal  = useMemo(() => [...clientes, ...prospectos].filter(c => actividadMap[c.id] === "EN_PROCESO").length, [clientes, prospectos, actividadMap]);

  const tabs: { key: Tab; label: string; count: number; color: string }[] = [
    { key: "resumen",        label: "Resumen",        count: 0,                      color: "text-[#B3985B]"  },
    { key: "clientes",       label: "Clientes",       count: clientes.length,        color: "text-[#B3985B]"  },
    { key: "prospectos",     label: "Prospectos",     count: prospectos.length,      color: "text-purple-300" },
    { key: "sin-clasificar", label: "Sin Clasificar", count: sinClasificar.length,   color: "text-amber-400"  },
  ];

  return (
    <>
      {showModal && <ModalNuevoContacto onClose={() => setShowModal(false)} onCreado={onCreado} usuarios={usuarios} />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="ms-h1">Base de Datos</h1>
          <p className="text-[#333] text-xs mt-1">
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
            {" · "}{prospectos.length} prospecto{prospectos.length !== 1 ? "s" : ""}
            {sinClasificar.length > 0 && ` · ${sinClasificar.length} sin clasificar`}
            {" · "}<span className="text-emerald-600/80">{activosTotal} activos</span>
            {" · "}<span className="text-amber-600/80">{enProcesoTotal} en proceso</span>
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="ms-btn-primary flex items-center gap-2 shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo contacto
        </button>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-5 bg-[#0a0a0a] border border-[#151515] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-[#1a1a1a] text-white shadow-sm" : "text-[#3a3a3a] hover:text-[#666]"
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tab === t.key ? `${t.color} bg-[#111]` : "text-[#333] bg-[#111]"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Resumen ──────────────────────────────────────────────────────────── */}
      {tab === "resumen" && (
        <ResumenTab clientes={clientes} prospectos={prospectos} actividadMap={actividadMap} usuarios={usuarios} />
      )}

      {/* ── Lista ────────────────────────────────────────────────────────────── */}
      {tab !== "resumen" && (
        <>
          {tab === "sin-clasificar" && sinClasificar.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-950/20 border border-amber-900/20 flex items-start gap-2.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-amber-400/70 text-[11px]">
                Estos contactos tienen el mismo teléfono o correo que otro registro. Clasifícalos o elimina el duplicado.
              </p>
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, correo, teléfono o empresa…"
                className="w-full pl-9 pr-4 py-2 bg-[#0a0a0a] border border-[#151515] rounded-lg text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/30 transition-colors" />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#333] hover:text-white transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FilterSelect label="Tipo" value={filtroTipo} onChange={setFiltroTipo} options={TIPO_CLIENTE_OPTIONS} />
              <FilterSelect label="Clasificación" value={filtroClasificacion} onChange={setFiltroClasificacion}
                options={[{ value: "NUEVO", label: "Nuevo" }, { value: "REGULAR", label: "Regular" }, { value: "PRIORITY", label: "Priority" }, { value: "EVITABLE", label: "Evitable" }, { value: "PROSPECTO", label: "Prospecto" }]} />
              <FilterSelect label="Servicio" value={filtroServicio} onChange={setFiltroServicio} options={SERVICIO_OPTIONS} />
              <FilterSelect label="Tipo de evento" value={filtroEvento} onChange={setFiltroEvento} options={TIPOS_EVENTO_OPTIONS} />
              <FilterSelect label="Responsable" value={filtroVendedor} onChange={setFiltroVendedor} options={vendedorOptions} />
              <FilterSelect label="Actividad" value={filtroActividad} onChange={setFiltroActividad}
                options={[{ value: "ACTIVO", label: "Activo" }, { value: "EN_PROCESO", label: "En proceso" }, { value: "INACTIVO", label: "Inactivo" }]} />
              {hayFiltros && (
                <button onClick={limpiarFiltros}
                  className="text-[10px] text-[#444] hover:text-red-400 border border-[#1a1a1a] hover:border-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors">
                  Limpiar filtros
                </button>
              )}
              <span className="ml-auto text-[10px] text-[#2a2a2a]">
                {listaActual.length} resultado{listaActual.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-[#222] mb-3">
            ✎ Haz clic en cualquier campo para editar — se guarda automáticamente
          </p>

          <ContactList contactos={listaActual} {...tableProps} />
        </>
      )}
    </>
  );
}
