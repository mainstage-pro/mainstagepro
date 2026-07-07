"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIPO_CLIENTE_LABELS, CLASIFICACION_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/constants";
import { CopyButton } from "@/components/CopyButton";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Vendedor { id: string; name: string }

interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
  compania: { id: string; nombre: string } | null;
  correo: string | null;
  tipoCliente: string;
  clasificacion: string;
  servicioUsual: string | null;
  tiposEvento: string | null;
  vendedorId: string | null;
  vendedor: Vendedor | null;
  _count: { tratos: number; proyectos: number };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPOS_EVENTO_OPTIONS = [
  { value: "MUSICAL",     label: "Musical" },
  { value: "SOCIAL",      label: "Social" },
  { value: "EMPRESARIAL", label: "Empresarial" },
  { value: "VARIOS",      label: "Varios" },
];

const SERVICIO_OPTIONS = [
  { value: "RENTA",               label: "Renta de Equipo" },
  { value: "PRODUCCION_TECNICA",  label: "Producción Técnica" },
  { value: "DIRECCION_TECNICA",   label: "Dirección Técnica" },
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

// ─── Helper ──────────────────────────────────────────────────────────────────

function parseTiposEvento(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function stringifyTiposEvento(arr: string[]): string | null {
  return arr.length ? JSON.stringify(arr) : null;
}

// ─── Small display components ────────────────────────────────────────────────

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
          <span
            key={t}
            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: EVENTO_COLORS[t] ?? "#6b7280" }}
          >
            {opt?.label ?? t}
          </span>
        );
      })}
    </div>
  );
}

// ─── InlineDropdown ───────────────────────────────────────────────────────────

function InlineDropdown({
  options, value, onChange, placeholder = "—", colorMap,
}: {
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
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent hover:border-[#B3985B]/40 hover:bg-[#B3985B]/5 transition-all group"
      >
        {current ? (
          <span
            className={`text-xs font-medium ${colorMap ? "" : "text-[#ccc]"}`}
            style={colorMap && current ? { color: colorMap[current.value] } : undefined}
          >
            {current.label}
          </span>
        ) : (
          <span className="text-xs text-[#444]">{placeholder}</span>
        )}
        <svg className="text-[#444] group-hover:text-[#B3985B] transition-colors" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[150px]">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[#1a1a1a] ${value === opt.value ? "text-[#B3985B]" : "text-gray-300"}`}
            >
              {opt.label}
              {value === opt.value && <span className="ml-2 text-[#B3985B]">✓</span>}
            </button>
          ))}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-[#555] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors border-t border-[#222]"
            >
              Quitar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── InlineMultiSelect ────────────────────────────────────────────────────────

function InlineMultiSelect({
  options, values, onChange, placeholder = "—", maxSelect = 3, colorMap,
}: {
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
    if (values.includes(v)) {
      onChange(values.filter(x => x !== v));
    } else {
      if (values.length >= maxSelect) return; // max cap
      onChange([...values, v]);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent hover:border-[#B3985B]/40 hover:bg-[#B3985B]/5 transition-all group"
      >
        {values.length === 0 ? (
          <span className="text-xs text-[#444]">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-0.5">
            {values.map(v => {
              const opt = options.find(o => o.value === v);
              return (
                <span
                  key={v}
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white"
                  style={{ backgroundColor: colorMap?.[v] ?? "#6b7280" }}
                >
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
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                disabled={disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                  disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-[#1a1a1a]"
                } ${active ? "text-white" : "text-gray-400"}`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                    active ? "border-transparent" : "border-[#444]"
                  }`}
                  style={active ? { backgroundColor: colorMap?.[opt.value] ?? "#B3985B" } : undefined}
                >
                  {active && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                </span>
                {opt.label}
              </button>
            );
          })}
          {values.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-2 text-xs text-[#555] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors border-t border-[#222] mt-1"
            >
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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendedorId: vendedorId || null }),
    });
    if (r.ok) {
      const found = usuarios.find(u => u.id === vendedorId) ?? null;
      onChange(found);
    }
    setSaving(false);
  }

  return (
    <div onClick={e => e.stopPropagation()} className="max-w-[140px]">
      <Combobox
        value={vendedor?.id ?? ""}
        onChange={asignar}
        disabled={saving}
        options={[{ value: "", label: "Sin asignar" }, ...usuarios.map(u => ({ value: u.id, label: `${u.name.split(" ")[0]} ${u.name.split(" ")[1] ?? ""}`.trim() }))]}
        placeholder="Sin asignar"
        className="bg-transparent border-0 text-xs text-[#9ca3af] focus:outline-none focus:ring-0 cursor-pointer hover:text-white disabled:opacity-50 w-full truncate"
      />
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const active = value !== "";
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={[{ value: "", label: label }, ...options]}
      placeholder={label}
      className={`pl-3 pr-3 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none focus:ring-1 focus:ring-[#B3985B]/40
        ${active
          ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]"
          : "bg-[#111] border-[#2a2a2a] text-[#777] hover:border-[#3a3a3a] hover:text-[#aaa]"
        }`}
    />
  );
}

// ─── Inline Row (list view) ───────────────────────────────────────────────────

type InlineState = {
  tipoCliente: string;
  clasificacion: string;
  servicioUsual: string;
  tiposEvento: string[];
  dirty: boolean;
};

function ClienteRow({
  c, usuarios, onSaved, onVendedorChange, onDelete, deleting,
  onEmpresaClick, empresaPopoverOpen,
  empresaMode, setEmpresaMode, empresaSearch, setEmpresaSearch,
  empresaResults, empresaSearching, onVincularEmpresa, onCloseEmpresa,
}: {
  c: Cliente;
  usuarios: Vendedor[];
  onSaved: (updated: Partial<Cliente>) => void;
  onVendedorChange: (v: Vendedor | null) => void;
  onDelete: () => void;
  deleting: boolean;
  onEmpresaClick: () => void;
  empresaPopoverOpen: boolean;
  empresaMode: "view" | "search";
  setEmpresaMode: (m: "view" | "search") => void;
  empresaSearch: string;
  setEmpresaSearch: (s: string) => void;
  empresaResults: { id: string; nombre: string }[];
  empresaSearching: boolean;
  onVincularEmpresa: (empId: string, empNombre: string) => void;
  onCloseEmpresa: () => void;
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

  // Sync when parent updates
  useEffect(() => {
    setInline({
      tipoCliente: c.tipoCliente,
      clasificacion: c.clasificacion,
      servicioUsual: c.servicioUsual ?? "",
      tiposEvento: parseTiposEvento(c.tiposEvento),
      dirty: false,
    });
  }, [c.tipoCliente, c.clasificacion, c.servicioUsual, c.tiposEvento]);

  function patch<K extends keyof InlineState>(key: K, val: InlineState[K]) {
    setInline(prev => ({ ...prev, [key]: val, dirty: true }));
  }

  async function guardar() {
    setSaving(true);
    try {
      const r = await fetch(`/api/clientes/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoCliente: inline.tipoCliente || null,
          clasificacion: inline.clasificacion || null,
          servicioUsual: inline.servicioUsual || null,
          tiposEvento: stringifyTiposEvento(inline.tiposEvento),
        }),
      });
      if (!r.ok) throw new Error();
      onSaved({
        tipoCliente: inline.tipoCliente,
        clasificacion: inline.clasificacion,
        servicioUsual: inline.servicioUsual || null,
        tiposEvento: stringifyTiposEvento(inline.tiposEvento),
      });
      setInline(prev => ({ ...prev, dirty: false }));
      toast.success("Cliente actualizado");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function cancelar() {
    setInline({
      tipoCliente: c.tipoCliente,
      clasificacion: c.clasificacion,
      servicioUsual: c.servicioUsual ?? "",
      tiposEvento: parseTiposEvento(c.tiposEvento),
      dirty: false,
    });
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
      </td>

      {/* Empresa */}
      <td className="px-4 py-3">
        <div className="relative">
          <button onClick={onEmpresaClick} className="text-left focus:outline-none">
            {c.compania ? (
              <span className="text-sm text-[#B3985B] hover:text-[#c9a96a] transition-colors cursor-pointer">{c.compania.nombre}</span>
            ) : (
              <span className="text-xs text-gray-700 hover:text-gray-400 transition-colors cursor-pointer">+ Vincular</span>
            )}
          </button>
          {empresaPopoverOpen && (
            <div
              className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-2"
              style={{ width: 260 }}
              onClick={e => e.stopPropagation()}
            >
              {empresaMode === "view" && c.compania ? (
                <>
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider px-3 pb-2">Empresa</p>
                  <a href={`/catalogo/empresas/${c.compania.id}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] transition-colors"
                    onClick={onCloseEmpresa}>
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
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-[#c9a96a]/30" />
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

      {/* Tipo de Cliente (inline) */}
      <td className="px-3 py-3">
        <InlineDropdown
          options={TIPO_CLIENTE_OPTIONS}
          value={inline.tipoCliente}
          onChange={v => patch("tipoCliente", v)}
          placeholder="Tipo"
          colorMap={Object.fromEntries(Object.entries(TIPO_COLORS).map(([k]) => [k, TIPO_COLORS[k]]))}
        />
      </td>

      {/* Clasificación (inline) */}
      <td className="px-3 py-3">
        <InlineDropdown
          options={CLASIFICACION_OPTIONS}
          value={inline.clasificacion}
          onChange={v => patch("clasificacion", v)}
          placeholder="Clasificación"
          colorMap={Object.fromEntries(Object.entries(CLAS_COLORS).map(([k, css]) => [k, css.replace("text-", "")]))}
        />
      </td>

      {/* Servicio Usual (inline) */}
      <td className="px-3 py-3">
        <InlineDropdown
          options={SERVICIO_OPTIONS}
          value={inline.servicioUsual}
          onChange={v => patch("servicioUsual", v)}
          placeholder="Servicio"
        />
      </td>

      {/* Tipos de Evento (inline multi) */}
      <td className="px-3 py-3">
        <InlineMultiSelect
          options={TIPOS_EVENTO_OPTIONS}
          values={inline.tiposEvento}
          onChange={v => patch("tiposEvento", v)}
          placeholder="Evento"
          maxSelect={3}
          colorMap={EVENTO_COLORS}
        />
      </td>

      {/* Responsable */}
      <td className="px-3 py-3">
        <InlineVendedor clienteId={c.id} vendedor={c.vendedor} usuarios={usuarios} onChange={onVendedorChange} />
      </td>

      {/* Tratos / Proyectos */}
      <td className="px-3 py-3 text-sm text-[#9ca3af] text-center">{c._count.tratos}</td>
      <td className="px-3 py-3 text-sm text-[#9ca3af] text-center">{c._count.proyectos}</td>

      {/* Acciones */}
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {inline.dirty ? (
            <>
              <button
                onClick={guardar}
                disabled={saving}
                className="text-[10px] px-2.5 py-1 rounded-md bg-[#B3985B] text-black font-semibold hover:bg-[#c9a96a] disabled:opacity-50 transition-colors"
              >
                {saving ? "…" : "Guardar"}
              </button>
              <button
                onClick={cancelar}
                className="text-[10px] px-2 py-1 rounded-md text-[#555] hover:text-white border border-[#2a2a2a] hover:border-[#444] transition-colors"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <Link href={`/crm/clientes/${c.id}`} className="text-[#B3985B] text-xs hover:underline">Ver →</Link>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientesClient({ clientes: initial, usuarios }: { clientes: Cliente[]; usuarios: Vendedor[] }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [view, setView] = useState<"list" | "card">("list");
  const [clientes, setClientes] = useState<Cliente[]>(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  // Empresa popover state (one at a time)
  const [empresaPopoverId, setEmpresaPopoverId] = useState<string | null>(null);
  const [empresaMode, setEmpresaMode] = useState<"view" | "search">("view");
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [empresaResults, setEmpresaResults] = useState<{ id: string; nombre: string }[]>([]);
  const [empresaSearching, setEmpresaSearching] = useState(false);

  // Filters
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroClasificacion, setFiltroClasificacion] = useState("");
  const [filtroServicio, setFiltroServicio] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");

  const hayFiltros = busqueda || filtroTipo || filtroClasificacion || filtroServicio || filtroEvento || filtroVendedor;

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return clientes.filter(c => {
      const empresaNombre = c.compania?.nombre ?? c.empresa ?? "";
      if (q && !c.nombre.toLowerCase().includes(q) && !empresaNombre.toLowerCase().includes(q) && !(c.correo ?? "").toLowerCase().includes(q)) return false;
      if (filtroTipo && c.tipoCliente !== filtroTipo) return false;
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
      return true;
    });
  }, [clientes, busqueda, filtroTipo, filtroClasificacion, filtroServicio, filtroEvento, filtroVendedor]);

  function limpiarFiltros() {
    setBusqueda(""); setFiltroTipo(""); setFiltroClasificacion("");
    setFiltroServicio(""); setFiltroEvento(""); setFiltroVendedor("");
  }

  // Empresa search effect
  useEffect(() => {
    if (!empresaPopoverId || empresaMode !== "search") { setEmpresaResults([]); return; }
    if (!empresaSearch.trim()) { setEmpresaResults([]); return; }
    setEmpresaSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/empresas?q=${encodeURIComponent(empresaSearch.trim())}&limit=6`);
        const data = await res.json();
        setEmpresaResults(data.empresas ?? []);
      } catch { setEmpresaResults([]); }
      finally { setEmpresaSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [empresaSearch, empresaMode, empresaPopoverId]);

  function openEmpresaPopover(c: Cliente) {
    if (empresaPopoverId === c.id) { closeEmpresaPopover(); return; }
    setEmpresaPopoverId(c.id);
    setEmpresaMode(c.compania ? "view" : "search");
    setEmpresaSearch("");
    setEmpresaResults([]);
  }
  function closeEmpresaPopover() {
    setEmpresaPopoverId(null); setEmpresaMode("view"); setEmpresaSearch(""); setEmpresaResults([]);
  }

  async function handleVincularEmpresa(clienteId: string, empresaId: string, empresaNombre: string) {
    setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, empresa: empresaNombre, compania: { id: empresaId, nombre: empresaNombre } } : c));
    closeEmpresaPopover();
    await fetch(`/api/clientes/${clienteId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId }),
    });
  }

  function actualizarVendedor(clienteId: string, vendedor: Vendedor | null) {
    setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, vendedor } : c));
  }

  function actualizarCampos(clienteId: string, updated: Partial<Cliente>) {
    setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, ...updated } : c));
  }

  async function eliminar(c: Cliente) {
    if (!await confirm({ message: `¿Eliminar a ${c.nombre}? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" })) return;
    setDeletingId(c.id);
    const r = await fetch(`/api/clientes/${c.id}`, { method: "DELETE" });
    if (r.ok) {
      setClientes(prev => prev.filter(x => x.id !== c.id));
      router.refresh();
    } else {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar cliente");
    }
    setDeletingId(null);
  }

  const vendedorOptions = [
    { value: "__sin_asignar__", label: "Sin asignar" },
    ...usuarios.map(u => ({ value: u.id, label: u.name })),
  ];

  return (
    <>
      {/* Backdrop para popover empresa */}
      {empresaPopoverId && <div className="fixed inset-0 z-40" onClick={closeEmpresaPopover} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Clientes</h1>
          <p className="text-[#6b7280] text-sm">
            {hayFiltros
              ? <>{clientesFiltrados.length} <span className="text-[#555]">de {clientes.length}</span></>
              : <>{clientes.length} clientes registrados</>
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5">
            <button onClick={() => setView("list")} title="Vista lista"
              className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="11" width="14" height="2" rx="1" fill="currentColor"/></svg>
            </button>
            <button onClick={() => setView("card")} title="Vista tarjetas"
              className={`p-1.5 rounded-md transition-colors ${view === "card" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/></svg>
            </button>
          </div>
          <Link href="/crm/clientes/nuevo"
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nuevo cliente
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Buscar por nombre, empresa o correo…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#B3985B]/50 focus:ring-1 focus:ring-[#B3985B]/20 transition-colors" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect label="Tipo" value={filtroTipo} onChange={setFiltroTipo} options={TIPO_CLIENTE_OPTIONS} />
          <FilterSelect label="Clasificación" value={filtroClasificacion} onChange={setFiltroClasificacion} options={CLASIFICACION_OPTIONS} />
          <FilterSelect label="Servicio" value={filtroServicio} onChange={setFiltroServicio} options={SERVICIO_OPTIONS} />
          <FilterSelect label="Evento" value={filtroEvento} onChange={setFiltroEvento} options={TIPOS_EVENTO_OPTIONS} />
          <FilterSelect label="Vendedor" value={filtroVendedor} onChange={setFiltroVendedor} options={vendedorOptions} />
          {hayFiltros && (
            <button onClick={limpiarFiltros}
              className="text-[10px] text-[#555] hover:text-red-400 border border-[#2a2a2a] hover:border-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Leyenda inline edit */}
      {view === "list" && (
        <p className="text-[10px] text-[#444] mb-3">
          ✎ Haz clic en cualquier campo (Tipo, Clasificación, Servicio, Evento) para editar directamente en la lista.
        </p>
      )}

      {/* Resultados */}
      {clientesFiltrados.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
          <p className="text-[#6b7280] text-sm">
            {hayFiltros ? "Sin resultados para los filtros aplicados" : "No hay clientes registrados"}
          </p>
          {hayFiltros && <button onClick={limpiarFiltros} className="mt-3 text-[#B3985B] text-xs hover:underline">Limpiar filtros</button>}
        </div>
      ) : view === "list" ? (
        /* ── LISTA (tabla con inline editing) ── */
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Cliente", "Empresa", "Tipo", "Clasificación", "Servicio", "Tipo de Evento", "Responsable", "Tratos", "Proyectos", ""].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {clientesFiltrados.map(c => (
                <ClienteRow
                  key={c.id}
                  c={c}
                  usuarios={usuarios}
                  onSaved={updated => actualizarCampos(c.id, updated)}
                  onVendedorChange={v => actualizarVendedor(c.id, v)}
                  onDelete={() => eliminar(c)}
                  deleting={deletingId === c.id}
                  onEmpresaClick={() => openEmpresaPopover(c)}
                  empresaPopoverOpen={empresaPopoverId === c.id}
                  empresaMode={empresaMode}
                  setEmpresaMode={setEmpresaMode}
                  empresaSearch={empresaSearch}
                  setEmpresaSearch={setEmpresaSearch}
                  empresaResults={empresaResults}
                  empresaSearching={empresaSearching}
                  onVincularEmpresa={(empId, empNombre) => handleVincularEmpresa(c.id, empId, empNombre)}
                  onCloseEmpresa={closeEmpresaPopover}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── TARJETAS ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clientesFiltrados.map(c => (
            <div key={c.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 hover:bg-[#141414] hover:border-[#2a2a2a] transition-all group">
              <Link href={`/crm/clientes/${c.id}`} className="block">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
                  <span className="text-[#B3985B] text-base font-bold">{c.nombre.charAt(0).toUpperCase()}</span>
                </div>
                <p className="text-white text-sm font-semibold leading-tight">{c.nombre}</p>
                {(c.compania?.nombre ?? c.empresa) && <p className="text-[#6b7280] text-xs mt-0.5">{c.compania?.nombre ?? c.empresa}</p>}
                {c.correo && <p className="text-[#444] text-xs mt-0.5 truncate">{c.correo}</p>}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <TipoBadge tipo={c.tipoCliente} />
                  <ClasificacionBadge clasificacion={c.clasificacion} />
                </div>
                {c.servicioUsual && (
                  <p className="text-[#555] text-xs mt-2">{TIPO_SERVICIO_LABELS[c.servicioUsual] ?? c.servicioUsual}</p>
                )}
                {parseTiposEvento(c.tiposEvento).length > 0 && (
                  <div className="mt-2">
                    <EventoPills tiposEvento={parseTiposEvento(c.tiposEvento)} />
                  </div>
                )}
              </Link>
              <div className="mt-3 flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <InlineVendedor clienteId={c.id} vendedor={c.vendedor} usuarios={usuarios} onChange={v => actualizarVendedor(c.id, v)} />
              </div>
              <div className="flex gap-4 mt-4 pt-3 border-t border-[#1a1a1a]">
                <div className="text-center"><p className="text-white text-sm font-semibold">{c._count.tratos}</p><p className="text-[#555] text-[10px]">tratos</p></div>
                <div className="text-center"><p className="text-white text-sm font-semibold">{c._count.proyectos}</p><p className="text-[#555] text-[10px]">proyectos</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
