"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TIPO_CLIENTE_LABELS, CLASIFICACION_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/constants";
import { CopyButton } from "@/components/CopyButton";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "clientes" | "prospectos" | "sin-clasificar";

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
  tratos: { id: string; etapa: string; origenLead: string; nombreEvento: string | null }[];
  _count: { tratos: number; proyectos: number; prospecciones: number; cotizaciones: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_CLIENTE_OPTIONS = Object.entries(TIPO_CLIENTE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const CLASIFICACION_OPTIONS = Object.entries(CLASIFICACION_LABELS)
  .filter(([v]) => v !== "BASIC")
  .map(([v, l]) => ({ value: v, label: l }));

const SERVICIO_OPTIONS = [
  { value: "RENTA",              label: "Renta de Equipo" },
  { value: "PRODUCCION_TECNICA", label: "Producción Técnica" },
  { value: "DIRECCION_TECNICA",  label: "Dirección Técnica" },
];

const TIPOS_EVENTO_OPTIONS = [
  { value: "MUSICAL",     label: "Musical" },
  { value: "SOCIAL",      label: "Social" },
  { value: "EMPRESARIAL", label: "Empresarial" },
  { value: "VARIOS",      label: "Varios" },
];

const ORIGEN_OPTIONS = [
  { value: "META_ADS",    label: "Meta Ads" },
  { value: "GOOGLE_ADS",  label: "Google Ads" },
  { value: "ORGANICO",    label: "Orgánico" },
  { value: "REFERIDO",    label: "Referido" },
  { value: "RECOMPRA",    label: "Recompra" },
  { value: "PROSPECCION", label: "Prospección" },
  { value: "MANUAL",      label: "Manual" },
  { value: "OTRO",        label: "Otro" },
];

const ORIGEN_LABELS: Record<string, string> = Object.fromEntries(ORIGEN_OPTIONS.map(o => [o.value, o.label]));
const ORIGEN_COLORS: Record<string, { bg: string; text: string }> = {
  META_ADS:    { bg: "bg-blue-900/30",    text: "text-blue-400" },
  GOOGLE_ADS:  { bg: "bg-red-900/30",     text: "text-red-400" },
  ORGANICO:    { bg: "bg-gray-800/60",    text: "text-gray-500" },
  RECOMPRA:    { bg: "bg-emerald-900/30", text: "text-emerald-400" },
  REFERIDO:    { bg: "bg-yellow-900/30",  text: "text-yellow-400" },
  PROSPECCION: { bg: "bg-[#B3985B]/10",   text: "text-[#B3985B]" },
  MANUAL:      { bg: "bg-gray-800/60",    text: "text-gray-500" },
  OTRO:        { bg: "bg-gray-800/60",    text: "text-gray-500" },
};

const ETAPA_LABELS: Record<string, string> = {
  LEAD: "Lead", DESCUBRIMIENTO: "Descubrimiento", OPORTUNIDAD: "Oportunidad",
  VENTA_CERRADA: "Cerrado", VENTA_PERDIDA: "Perdido",
};
const ETAPA_COLORS: Record<string, string> = {
  LEAD: "text-sky-400", DESCUBRIMIENTO: "text-purple-400", OPORTUNIDAD: "text-[#B3985B]",
  VENTA_CERRADA: "text-emerald-400", VENTA_PERDIDA: "text-red-500",
};

const TIPO_COLORS: Record<string, string> = {
  B2B: "bg-blue-900/40 text-blue-300",
  B2C: "bg-purple-900/40 text-purple-300",
  POR_DESCUBRIR: "bg-gray-800 text-gray-400",
};
const CLAS_COLORS: Record<string, string> = {
  PROSPECTO: "text-purple-400", NUEVO: "text-[#6b7280]",
  REGULAR: "text-yellow-400", PRIORITY: "text-[#B3985B]", BASIC: "text-blue-400",
};
const EVENTO_COLORS: Record<string, string> = {
  MUSICAL: "#3B82F6", SOCIAL: "#10B981", EMPRESARIAL: "#F59E0B", VARIOS: "#8B5CF6",
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

function OrigenBadge({ origen }: { origen: string }) {
  const col = ORIGEN_COLORS[origen] ?? { bg: "bg-gray-800/60", text: "text-gray-500" };
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${col.bg} ${col.text}`}>
      {ORIGEN_LABELS[origen] ?? origen}
    </span>
  );
}

function EtapaBadge({ etapa }: { etapa: string }) {
  return (
    <span className={`text-[9px] font-medium ${ETAPA_COLORS[etapa] ?? "text-gray-500"}`}>
      {ETAPA_LABELS[etapa] ?? etapa}
    </span>
  );
}

// ─── InlineDropdown — autosave on change ─────────────────────────────────────

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
              className="w-full text-left px-3 py-2 text-xs text-[#555] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors border-t border-[#222]">
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
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function select(u: Vendedor | null) {
    setOpen(false);
    setSaving(true);
    await fetch(`/api/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendedorId: u?.id ?? null }),
    });
    onChange(u);
    setSaving(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-transparent hover:border-[#B3985B]/40 hover:bg-[#B3985B]/5 transition-all group text-xs">
        {saving
          ? <span className="text-[#555] animate-pulse">…</span>
          : vendedor
          ? <span className="text-gray-300">{vendedor.name}</span>
          : <span className="text-[#444]">Sin asignar</span>}
        <svg className="text-[#444] group-hover:text-[#B3985B] transition-colors" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[160px]">
          {usuarios.map(u => (
            <button key={u.id} type="button" onClick={() => select(u)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[#1a1a1a] ${u.id === vendedor?.id ? "text-[#B3985B]" : "text-gray-300"}`}>
              {u.name}{u.id === vendedor?.id && <span className="ml-2">✓</span>}
            </button>
          ))}
          {vendedor && (
            <button type="button" onClick={() => select(null)}
              className="w-full text-left px-3 py-2 text-xs text-[#555] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors border-t border-[#222]">
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
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors focus:outline-none bg-[#111] cursor-pointer ${
        value ? "border-[#B3985B]/40 text-[#B3985B]" : "border-[#2a2a2a] text-[#555]"
      }`}
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── ContactoRow — one row in the table with full inline autosave ──────────

function ContactoRow({
  c, usuarios, tab,
  onSaved, onVendedorChange, onDelete, deleting,
  onConvertir, onReclasificar,
  empresaPopoverOpen, onEmpresaClick, empresaMode, setEmpresaMode,
  empresaSearch, setEmpresaSearch, empresaResults, empresaSearching,
  onVincularEmpresa, onCloseEmpresa, onOpenDrawer,
}: {
  c: Contacto;
  usuarios: Vendedor[];
  tab: Tab;
  onSaved: (updated: Partial<Contacto>) => void;
  onVendedorChange: (v: Vendedor | null) => void;
  onDelete: () => void;
  deleting: boolean;
  onConvertir: () => void;
  onReclasificar: (esProspecto: boolean) => void;
  empresaPopoverOpen: boolean;
  onEmpresaClick: () => void;
  empresaMode: "view" | "search";
  setEmpresaMode: (m: "view" | "search") => void;
  empresaSearch: string;
  setEmpresaSearch: (s: string) => void;
  empresaResults: { id: string; nombre: string }[];
  empresaSearching: boolean;
  onVincularEmpresa: (id: string, nombre: string) => void;
  onCloseEmpresa: () => void;
  onOpenDrawer: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function patch(campo: Record<string, unknown>) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaving(true);
    const res = await fetch(`/api/clientes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campo),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    const d = await res.json();
    onSaved(d.cliente ?? campo);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const eventosActuales = parseTiposEvento(c.tiposEvento);

  return (
    <tr className="border-b border-[#111] hover:bg-[#141414] transition-colors group cursor-pointer" onClick={onOpenDrawer}>
      {/* Nombre */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5 min-w-[160px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/crm/clientes/${c.id}`} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors">
              {c.nombre}
            </Link>
            {c.clasificacion && !['PROSPECTO', ''].includes(c.clasificacion) && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${
                c.clasificacion === 'VIP' ? 'bg-amber-900/40 text-amber-300 border-amber-800/30' :
                c.clasificacion === 'FRECUENTE' ? 'bg-purple-900/40 text-purple-300 border-purple-800/30' :
                c.clasificacion === 'NUEVO' ? 'bg-blue-900/40 text-blue-300 border-blue-800/30' :
                c.clasificacion === 'PRIORITY' ? 'bg-[#B3985B]/20 text-[#B3985B] border-[#B3985B]/30' :
                c.clasificacion === 'REGULAR' ? 'bg-yellow-900/40 text-yellow-300 border-yellow-800/30' :
                'bg-[#1e1e1e] text-gray-400 border-[#2a2a2a]'
              }`}>{c.clasificacion}</span>
            )}
          </div>
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
          {/* Indicador de guardado */}
          {saving && <span className="text-[9px] text-[#555] animate-pulse">Guardando…</span>}
          {saved && !saving && <span className="text-[9px] text-emerald-500">✓ Guardado</span>}
        </div>
      </td>

      {/* Empresa */}
      <td className="px-4 py-3">
        <div className="relative">
          <button onClick={onEmpresaClick} className="text-left focus:outline-none">
            {c.compania ? (
              <span className="text-sm text-[#B3985B] hover:text-[#C9A84C] transition-colors cursor-pointer">{c.compania.nombre}</span>
            ) : (
              <span className="text-xs text-gray-700 hover:text-gray-400 transition-colors cursor-pointer">+ Vincular</span>
            )}
          </button>
          {empresaPopoverOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-2" style={{ width: 260 }} onClick={e => e.stopPropagation()}>
              {empresaMode === "view" && c.compania ? (
                <>
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider px-3 pb-2">Empresa</p>
                  <a href={`/catalogo/empresas/${c.compania.id}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] transition-colors" onClick={onCloseEmpresa}>
                    <span>Ver empresa</span><span className="text-gray-600">→</span>
                  </a>
                  <button onClick={() => { setEmpresaMode("search"); setEmpresaSearch(""); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] transition-colors">
                    <span>Cambiar empresa</span>
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider px-3 pb-2">Vincular empresa</p>
                  <div className="px-3 pb-2">
                    <input autoFocus value={empresaSearch} onChange={e => setEmpresaSearch(e.target.value)}
                      placeholder="Buscar empresa..."
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-[#C9A84C]/30" />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {empresaSearching && <p className="text-xs text-gray-600 px-3 py-2">Buscando...</p>}
                    {!empresaSearching && empresaResults.length === 0 && empresaSearch.trim() && (
                      <p className="text-xs text-gray-600 px-3 py-2">Sin resultados</p>
                    )}
                    {empresaResults.map(emp => (
                      <button key={emp.id} onClick={() => onVincularEmpresa(emp.id, emp.nombre)}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#1a1a1a] transition-colors">
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

      {/* Origen */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          {c.origenLead ? (
            <OrigenBadge origen={c.origenLead} />
          ) : c.tratos[0] ? (
            <>
              <OrigenBadge origen={c.tratos[0].origenLead} />
              <EtapaBadge etapa={c.tratos[0].etapa} />
            </>
          ) : (
            <span className="text-[#333] text-[10px]">—</span>
          )}
        </div>
      </td>

      {/* Tipo (autosave) */}
      <td className="px-3 py-3">
        <InlineDropdown options={TIPO_CLIENTE_OPTIONS} value={c.tipoCliente}
          onChange={v => patch({ tipoCliente: v })} placeholder="Tipo" />
      </td>

      {/* Clasificación (autosave) */}
      <td className="px-3 py-3">
        <InlineDropdown options={CLASIFICACION_OPTIONS} value={c.clasificacion}
          onChange={v => patch({ clasificacion: v })} placeholder="Clasificación"
          colorMap={Object.fromEntries(Object.entries(CLAS_COLORS).map(([k, css]) => [k, css]))} />
      </td>

      {/* Servicio (autosave) */}
      <td className="px-3 py-3">
        <InlineDropdown options={SERVICIO_OPTIONS} value={c.servicioUsual ?? ""}
          onChange={v => patch({ servicioUsual: v || null })} placeholder="Servicio" />
      </td>

      {/* Tipos de Evento (autosave) */}
      <td className="px-3 py-3">
        <InlineMultiSelect options={TIPOS_EVENTO_OPTIONS} values={eventosActuales}
          onChange={v => patch({ tiposEvento: stringifyTiposEvento(v) })} placeholder="Evento" maxSelect={3} colorMap={EVENTO_COLORS} />
      </td>

      {/* Responsable */}
      <td className="px-3 py-3">
        <InlineVendedor clienteId={c.id} vendedor={c.vendedor} usuarios={usuarios} onChange={onVendedorChange} />
      </td>

      {/* Contadores */}
      <td className="px-3 py-3 text-sm text-[#9ca3af] text-center">{c._count.tratos}</td>
      <td className="px-3 py-3 text-sm text-[#9ca3af] text-center">{c._count.proyectos}</td>

      {/* Acciones */}
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {tab === "prospectos" && (
            <button onClick={onConvertir}
              className="text-[10px] px-2 py-1 rounded-md text-emerald-400 hover:text-emerald-300 border border-emerald-900/40 hover:border-emerald-700/60 transition-colors whitespace-nowrap">
              → Cliente
            </button>
          )}
          {tab === "clientes" && (
            <button onClick={() => onReclasificar(true)}
              className="text-[10px] px-2 py-1 rounded-md text-purple-400 hover:text-purple-300 border border-purple-900/40 hover:border-purple-700/60 transition-colors whitespace-nowrap">
              → Prospecto
            </button>
          )}
          {tab === "sin-clasificar" && (
            <>
              <button onClick={() => onReclasificar(false)}
                className="text-[10px] px-2 py-1 rounded-md text-[#B3985B] hover:text-[#C9A84C] border border-[#B3985B]/30 hover:border-[#B3985B]/60 transition-colors whitespace-nowrap">
                → Cliente
              </button>
              <button onClick={() => onReclasificar(true)}
                className="text-[10px] px-2 py-1 rounded-md text-purple-400 hover:text-purple-300 border border-purple-900/40 hover:border-purple-700/60 transition-colors whitespace-nowrap">
                → Prospecto
              </button>
            </>
          )}
          <Link href={`/crm/clientes/${c.id}`} className="text-[#B3985B] text-xs hover:underline">Ver</Link>
          <button onClick={onDelete} disabled={deleting}
            className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30" title="Eliminar">
            {deleting ? "…" : "✕"}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── ModalNuevoContacto ───────────────────────────────────────────────────────

function ModalNuevoContacto({ onClose, onCreado, usuarios }: {
  onClose: () => void;
  onCreado: (c: Contacto) => void;
  usuarios: Vendedor[];
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    correo: "",
    empresa: "",
    tipoCliente: "POR_DESCUBRIR",
    clasificacion: "PROSPECTO",
    origenLead: "MANUAL",
    notas: "",
    esCliente: false, // toggle: "Ya es cliente (migrado)"
  });

  function setF(k: string, v: unknown) { setForm(p => ({ ...p, [k]: v })); }

  async function crear() {
    if (!form.nombre.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al crear");
      setSaving(false);
      return;
    }
    const d = await res.json();
    onCreado(d.cliente);
    toast.success(`${form.nombre.trim()} registrado correctamente`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <h3 className="text-white font-semibold text-sm">Nuevo contacto</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Toggle: Prospecto vs Cliente migrado */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
            <button
              onClick={() => setF("esCliente", false)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!form.esCliente ? "bg-purple-900/40 text-purple-300 border border-purple-800/40" : "text-[#555] hover:text-gray-400"}`}>
              Prospecto nuevo
            </button>
            <button
              onClick={() => setF("esCliente", true)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${form.esCliente ? "bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30" : "text-[#555] hover:text-gray-400"}`}>
              Ya es cliente (migrado)
            </button>
          </div>

          <p className="text-[10px] text-[#444]">
            {form.esCliente
              ? "Se registrará como cliente confirmado. Úsalo para contactos que ya te han comprado pero no están en el sistema."
              : "Se registrará como prospecto. Cuando se apruebe una cotización, se convertirá automáticamente en cliente."}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] text-gray-500 mb-1.5">Nombre <span className="text-red-500">*</span></label>
              <input value={form.nombre} onChange={e => setF("nombre", e.target.value)} placeholder="Nombre completo"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] placeholder-[#444]" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5">Teléfono</label>
              <input value={form.telefono} onChange={e => setF("telefono", e.target.value)} placeholder="55 1234 5678"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] placeholder-[#444]" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5">Correo</label>
              <input type="email" value={form.correo} onChange={e => setF("correo", e.target.value)} placeholder="correo@ejemplo.com"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] placeholder-[#444]" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5">Empresa</label>
              <input value={form.empresa} onChange={e => setF("empresa", e.target.value)} placeholder="Empresa (opcional)"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] placeholder-[#444]" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5">Origen</label>
              <select value={form.origenLead} onChange={e => setF("origenLead", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {ORIGEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1.5">Tipo de cliente</label>
              <select value={form.tipoCliente} onChange={e => setF("tipoCliente", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {TIPO_CLIENTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {form.esCliente && (
              <div>
                <label className="block text-[10px] text-gray-500 mb-1.5">Clasificación</label>
                <select value={form.clasificacion} onChange={e => setF("clasificacion", e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                  {CLASIFICACION_OPTIONS.filter(o => o.value !== "PROSPECTO").map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-[10px] text-gray-500 mb-1.5">Notas</label>
              <textarea value={form.notas} onChange={e => setF("notas", e.target.value)} rows={2} placeholder="Información adicional…"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none placeholder-[#444]" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1a1a1a]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={crear} disabled={saving || !form.nombre.trim()}
            className="px-5 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50 transition-colors">
            {saving ? "Registrando…" : form.esCliente ? "Registrar como cliente" : "Registrar prospecto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ContactList — reusable table for all 3 tabs ───────────────────────────

function ContactList({
  contactos, usuarios, tab,
  onSaved, onVendedorChange, onDelete, deletingId, onConvertir, onReclasificar,
  empresaPopoverId, setEmpresaPopoverId, empresaMode, setEmpresaMode,
  empresaSearch, setEmpresaSearch, empresaResults, empresaSearching,
  handleVincularEmpresa, closeEmpresaPopover, onOpenDrawer,
}: {
  contactos: Contacto[];
  usuarios: Vendedor[];
  tab: Tab;
  onSaved: (id: string, updated: Partial<Contacto>) => void;
  onVendedorChange: (id: string, v: Vendedor | null) => void;
  onDelete: (c: Contacto) => void;
  deletingId: string | null;
  onConvertir: (c: Contacto) => void;
  onReclasificar: (c: Contacto, esProspecto: boolean) => void;
  empresaPopoverId: string | null;
  setEmpresaPopoverId: (id: string | null) => void;
  empresaMode: "view" | "search";
  setEmpresaMode: (m: "view" | "search") => void;
  empresaSearch: string;
  setEmpresaSearch: (s: string) => void;
  empresaResults: { id: string; nombre: string }[];
  empresaSearching: boolean;
  handleVincularEmpresa: (cid: string, empId: string, empNombre: string) => void;
  closeEmpresaPopover: () => void;
  onOpenDrawer: (c: Contacto) => void;
}) {
  if (contactos.length === 0) return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
      <p className="text-[#6b7280] text-sm">No hay registros en esta sección</p>
    </div>
  );

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
      <table className="w-full min-w-[1100px]">
        <thead>
          <tr className="border-b border-[#1e1e1e]">
            {["Contacto", "Empresa", "Origen", "Tipo", "Clasificación", "Servicio", "Evento", "Responsable", "Tratos", "Proyectos", ""].map(h => (
              <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#111]">
          {contactos.map(c => (
            <ContactoRow
              key={c.id} c={c} usuarios={usuarios} tab={tab}
              onSaved={updated => onSaved(c.id, updated)}
              onVendedorChange={v => onVendedorChange(c.id, v)}
              onDelete={() => onDelete(c)}
              deleting={deletingId === c.id}
              onConvertir={() => onConvertir(c)}
              onReclasificar={esProspecto => onReclasificar(c, esProspecto)}
              empresaPopoverOpen={empresaPopoverId === c.id}
              onEmpresaClick={() => {
                if (empresaPopoverId === c.id) { setEmpresaPopoverId(null); return; }
                setEmpresaMode(c.compania ? "view" : "search");
                setEmpresaSearch("");
                setEmpresaPopoverId(c.id);
              }}
              empresaMode={empresaMode}
              setEmpresaMode={setEmpresaMode}
              empresaSearch={empresaSearch}
              setEmpresaSearch={setEmpresaSearch}
              empresaResults={empresaResults}
              empresaSearching={empresaSearching}
              onVincularEmpresa={(empId, empNombre) => handleVincularEmpresa(c.id, empId, empNombre)}
              onCloseEmpresa={closeEmpresaPopover}
              onOpenDrawer={() => onOpenDrawer(c)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  clientes: Contacto[];
  prospectos: Contacto[];
  sinClasificar: Contacto[];
  usuarios: Vendedor[];
}

export default function BaseDeDatosClient({ clientes: initClientes, prospectos: initProspectos, sinClasificar: initSin, usuarios }: Props) {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("clientes");
  const [clientes, setClientes] = useState<Contacto[]>(initClientes);
  const [prospectos, setProspectos] = useState<Contacto[]>(initProspectos);
  const [sinClasificar, setSinClasificar] = useState<Contacto[]>(initSin);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [clienteSel, setClienteSel] = useState<Contacto | null>(null);

  // Empresa popover
  const [empresaPopoverId, setEmpresaPopoverId] = useState<string | null>(null);
  const [empresaMode, setEmpresaMode] = useState<"view" | "search">("view");
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [empresaResults, setEmpresaResults] = useState<{ id: string; nombre: string }[]>([]);
  const [empresaSearching, setEmpresaSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroClasificacion, setFiltroClasificacion] = useState("");
  const [filtroServicio, setFiltroServicio] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");

  const hayFiltros = busqueda || filtroTipo || filtroClasificacion || filtroServicio || filtroEvento || filtroVendedor || filtroOrigen;
  function limpiarFiltros() {
    setBusqueda(""); setFiltroTipo(""); setFiltroClasificacion(""); setFiltroServicio("");
    setFiltroEvento(""); setFiltroVendedor(""); setFiltroOrigen("");
  }

  const vendedorOptions = usuarios.map(u => ({ value: u.id, label: u.name }));

  // Empresa search effect
  useEffect(() => {
    if (!empresaSearch.trim() || empresaSearch.length < 2) {
      setEmpresaResults([]); return;
    }
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
    setEmpresaPopoverId(null);
    setEmpresaMode("view");
    setEmpresaSearch("");
    setEmpresaResults([]);
  }

  // Click outside to close empresa popover
  useEffect(() => {
    if (!empresaPopoverId) return;
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-empresa-popover]")) closeEmpresaPopover();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [empresaPopoverId]);

  // ── Helpers para actualizar state local ─────────────────────────────────────

  function getSetters(source: Tab) {
    if (source === "clientes") return { get: clientes, set: setClientes };
    if (source === "prospectos") return { get: prospectos, set: setProspectos };
    return { get: sinClasificar, set: setSinClasificar };
  }

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

  // ── Vincular empresa ────────────────────────────────────────────────────────

  async function handleVincularEmpresa(cid: string, empId: string, empNombre: string) {
    closeEmpresaPopover();
    const res = await fetch(`/api/clientes/${cid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId: empId }),
    });
    if (!res.ok) { toast.error("Error al vincular empresa"); return; }
    const d = await res.json();
    actualizarCampos(cid, { compania: d.cliente?.compania ?? { id: empId, nombre: empNombre }, empresa: empNombre });
  }

  // ── Convertir prospecto → cliente ────────────────────────────────────────

  async function convertirACliente(c: Contacto) {
    const ok = await confirm({
      message: `¿Confirmar que "${c.nombre}" ya es un cliente? Esto lo moverá a la pestaña de Clientes.`,
      confirmText: "Convertir a Cliente",
    });
    if (!ok) return;
    const res = await fetch(`/api/clientes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ esProspecto: false, clasificacion: c.clasificacion === "PROSPECTO" ? "NUEVO" : c.clasificacion }),
    });
    if (!res.ok) { toast.error("Error al convertir"); return; }
    const d = await res.json();
    removerDe(c.id, tab);
    setClientes(prev => [d.cliente, ...prev]);
    toast.success(`${c.nombre} movido a Clientes`);
    setTab("clientes");
  }

  // ── Reclasificar (sin-clasificar o cliente → prospecto y viceversa) ─────

  async function reclasificar(c: Contacto, esProspecto: boolean) {
    const label = esProspecto ? "Prospecto" : "Cliente";
    const res = await fetch(`/api/clientes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ esProspecto, clasificacion: !esProspecto && c.clasificacion === "PROSPECTO" ? "NUEVO" : c.clasificacion }),
    });
    if (!res.ok) { toast.error("Error al reclasificar"); return; }
    const d = await res.json();
    removerDe(c.id, tab);
    if (esProspecto) setProspectos(prev => [d.cliente, ...prev]);
    else setClientes(prev => [d.cliente, ...prev]);
    toast.success(`${c.nombre} movido a ${label}s`);
  }

  // ── Eliminar ────────────────────────────────────────────────────────────────

  async function eliminar(c: Contacto) {
    const ok = await confirm({
      message: `¿Eliminar a "${c.nombre}"? Esta acción no se puede deshacer.`,
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    setDeletingId(c.id);
    const res = await fetch(`/api/clientes/${c.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); setDeletingId(null); return; }
    removerDe(c.id, tab);
    setDeletingId(null);
    toast.success("Contacto eliminado");
  }

  // ── Nuevo contacto creado ─────────────────────────────────────────────────

  function onCreado(c: Contacto) {
    if (c.esProspecto) {
      setProspectos(prev => [c, ...prev]);
      setTab("prospectos");
    } else {
      setClientes(prev => [c, ...prev]);
      setTab("clientes");
    }
  }

  // ── Filtrado ─────────────────────────────────────────────────────────────

  function filtrar(lista: Contacto[]): Contacto[] {
    const q = busqueda.toLowerCase().trim();
    return lista.filter(c => {
      const empresaNombre = c.compania?.nombre ?? c.empresa ?? "";
      if (q && !c.nombre.toLowerCase().includes(q) && !empresaNombre.toLowerCase().includes(q)
        && !(c.correo ?? "").toLowerCase().includes(q) && !(c.telefono ?? "").includes(q)) return false;
      if (filtroTipo && c.tipoCliente !== filtroTipo) return false;
      if (filtroClasificacion && c.clasificacion !== filtroClasificacion) return false;
      if (filtroServicio && c.servicioUsual !== filtroServicio) return false;
      if (filtroEvento) {
        const evs = parseTiposEvento(c.tiposEvento);
        if (!evs.includes(filtroEvento)) return false;
      }
      if (filtroVendedor && c.vendedorId !== filtroVendedor) return false;
      if (filtroOrigen) {
        const origen = c.origenLead ?? c.tratos[0]?.origenLead;
        if (origen !== filtroOrigen) return false;
      }
      return true;
    });
  }

  const clientesFiltrados = useMemo(() => filtrar(clientes), [clientes, busqueda, filtroTipo, filtroClasificacion, filtroServicio, filtroEvento, filtroVendedor, filtroOrigen]);
  const prospectosFiltrados = useMemo(() => filtrar(prospectos), [prospectos, busqueda, filtroTipo, filtroClasificacion, filtroServicio, filtroEvento, filtroVendedor, filtroOrigen]);
  const sinClasificarFiltrados = useMemo(() => filtrar(sinClasificar), [sinClasificar, busqueda, filtroTipo, filtroClasificacion, filtroServicio, filtroEvento, filtroVendedor, filtroOrigen]);

  const listaActual = tab === "clientes" ? clientesFiltrados : tab === "prospectos" ? prospectosFiltrados : sinClasificarFiltrados;

  // ── Shared table props ────────────────────────────────────────────────────

  const tableProps = {
    usuarios,
    tab,
    onSaved: actualizarCampos,
    onVendedorChange: actualizarVendedor,
    onDelete: eliminar,
    deletingId,
    onConvertir: convertirACliente,
    onReclasificar: reclasificar,
    empresaPopoverId,
    setEmpresaPopoverId,
    empresaMode,
    setEmpresaMode,
    empresaSearch,
    setEmpresaSearch,
    empresaResults,
    empresaSearching,
    handleVincularEmpresa,
    closeEmpresaPopover,
    onOpenDrawer: setClienteSel,
  };

  return (
    <>
      {showModal && (
        <ModalNuevoContacto onClose={() => setShowModal(false)} onCreado={onCreado} usuarios={usuarios} />
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Base de Datos</h1>
          <p className="text-[#555] text-xs mt-0.5">
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} · {prospectos.length} prospecto{prospectos.length !== 1 ? "s" : ""}
            {sinClasificar.length > 0 && ` · ${sinClasificar.length} sin clasificar`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo contacto
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1 w-fit">
        {([
          { key: "clientes",       label: "Clientes",        count: clientes.length,       color: "text-[#B3985B]" },
          { key: "prospectos",     label: "Prospectos",      count: prospectos.length,      color: "text-purple-300" },
          { key: "sin-clasificar", label: "Sin Clasificar",  count: sinClasificar.length,   color: "text-amber-400" },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-[#1a1a1a] text-white shadow-sm"
                : "text-[#555] hover:text-gray-400"
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                tab === t.key
                  ? `${t.color} bg-[#111]`
                  : "text-[#444] bg-[#1a1a1a]"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Descripción de Sin Clasificar */}
      {tab === "sin-clasificar" && sinClasificar.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-900/10 border border-amber-900/30 flex items-start gap-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-amber-400/80 text-xs">
            Estos contactos aparecen duplicados en la base de datos (mismo teléfono o correo). Usa los botones <strong className="text-[#B3985B]">→ Cliente</strong> o <strong className="text-purple-300">→ Prospecto</strong> para clasificarlos, o elimina el duplicado.
          </p>
        </div>
      )}

      {/* ── Filtros ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono o empresa…"
            className="w-full pl-9 pr-4 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50 transition-colors" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect label="Tipo" value={filtroTipo} onChange={setFiltroTipo} options={TIPO_CLIENTE_OPTIONS} />
          <FilterSelect label="Clasificación" value={filtroClasificacion} onChange={setFiltroClasificacion} options={CLASIFICACION_OPTIONS} />
          <FilterSelect label="Servicio" value={filtroServicio} onChange={setFiltroServicio} options={SERVICIO_OPTIONS} />
          <FilterSelect label="Evento" value={filtroEvento} onChange={setFiltroEvento} options={TIPOS_EVENTO_OPTIONS} />
          <FilterSelect label="Responsable" value={filtroVendedor} onChange={setFiltroVendedor} options={vendedorOptions} />
          <FilterSelect label="Origen" value={filtroOrigen} onChange={setFiltroOrigen} options={ORIGEN_OPTIONS} />
          {hayFiltros && (
            <button onClick={limpiarFiltros}
              className="text-[10px] text-[#555] hover:text-red-400 border border-[#2a2a2a] hover:border-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors">
              Limpiar filtros
            </button>
          )}
          <span className="ml-auto text-[10px] text-[#444]">
            {listaActual.length} resultado{listaActual.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-[#333] mb-3">
        ✎ Haz clic en cualquier campo para editar · Se guarda automáticamente al seleccionar
      </p>

      {/* ── Tabla ─────────────────────────────────────────────────────── */}
      <ContactList contactos={listaActual} {...tableProps} />

      {/* ── Drawer de detalle ───────────────────────────────────────────── */}
      {clienteSel && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setClienteSel(null)}>
          <div className="flex-1" />
          <div className="w-80 bg-[#111] border-l border-[#222] h-full overflow-y-auto p-5"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{clienteSel.nombre}</h3>
              <button onClick={() => setClienteSel(null)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            {(clienteSel.compania?.nombre ?? clienteSel.empresa) && (
              <p className="text-gray-400 text-sm mb-4">{clienteSel.compania?.nombre ?? clienteSel.empresa}</p>
            )}
            <div className="space-y-2">
              {clienteSel.telefono && (
                <a href={`https://wa.me/${clienteSel.telefono.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] rounded-lg text-sm text-white hover:bg-[#222] transition-colors">
                  <span>&#128241;</span>{clienteSel.telefono}
                </a>
              )}
              {clienteSel.correo && (
                <a href={`mailto:${clienteSel.correo}`}
                  className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] rounded-lg text-sm text-white hover:bg-[#222] transition-colors">
                  <span>&#9993;</span>{clienteSel.correo}
                </a>
              )}
            </div>
            {clienteSel.clasificacion && (
              <div className="mt-4 pt-4 border-t border-[#1e1e1e]">
                <p className="text-xs text-gray-500 mb-1">Clasificación</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  clienteSel.clasificacion === 'VIP' ? 'bg-amber-900/40 text-amber-300' :
                  clienteSel.clasificacion === 'FRECUENTE' ? 'bg-purple-900/40 text-purple-300' :
                  clienteSel.clasificacion === 'PRIORITY' ? 'bg-[#B3985B]/20 text-[#B3985B]' :
                  clienteSel.clasificacion === 'REGULAR' ? 'bg-yellow-900/40 text-yellow-300' :
                  'bg-blue-900/40 text-blue-300'
                }`}>{clienteSel.clasificacion}</span>
              </div>
            )}
            {clienteSel.notas && (
              <div className="mt-4 pt-4 border-t border-[#1e1e1e]">
                <p className="text-xs text-gray-500 mb-1">Notas</p>
                <p className="text-sm text-gray-300">{clienteSel.notas}</p>
              </div>
            )}
            <div className="mt-6">
              <a href={`/crm/clientes/${clienteSel.id}`}
                className="w-full block text-center py-2 rounded-lg bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] text-sm hover:bg-[#B3985B]/20 transition-colors">
                Ver perfil completo →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
