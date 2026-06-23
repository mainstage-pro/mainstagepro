"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIPO_CLIENTE_LABELS, CLASIFICACION_LABELS } from "@/lib/constants";
import { CopyButton } from "@/components/CopyButton";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Usuario { id: string; name: string }

interface Cliente {
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
  vendedor: { id: string; name: string } | null;
  _count: { tratos: number; proyectos: number; prospecciones: number };
}

interface Prospeccion {
  id: string;
  tipo: string;
  etapa: string;
  estado: string;
  tipoEvento: string;
  origen: string;
  fechaProximoContacto: Date | null;
  tipoServicioInteres: string | null;
  contacto1Hecho: boolean;
  contacto2Hecho: boolean;
  contacto3Hecho: boolean;
  contacto4Hecho: boolean;
  contacto5Hecho: boolean;
  notas: string | null;
  createdAt: Date;
  cliente: {
    id: string; nombre: string; empresa: string | null;
    telefono: string | null; correo: string | null;
    tipoCliente: string; clasificacion: string;
  };
  responsable: { id: string; name: string } | null;
  trato: { id: string; etapa: string } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPO_EVENTO_LABELS: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", VARIOS: "Varios",
};
const TIPO_EVENTO_COLORS: Record<string, string> = {
  MUSICAL: "#3B82F6", SOCIAL: "#10B981", EMPRESARIAL: "#F59E0B", VARIOS: "#8B5CF6",
};
const ORIGEN_LABELS: Record<string, string> = {
  META_ADS: "Meta Ads", MANUAL: "Manual", REFERIDO: "Referido", RECOMPRA: "Recompra",
  ORGANICO: "Orgánico", NETWORKING: "Networking", REDES_SOCIALES: "Redes Sociales", OTRO: "Otro",
};
const ETAPA_LABELS: Record<string, string> = {
  SIN_ETAPA: "Sin Etapa", NUEVO_CONTACTO: "Nuevo Contacto", EN_SEGUIMIENTO: "En Seguimiento",
  INTERES_CONFIRMADO: "Interés Confirmado", EN_EVALUACION: "En Evaluación", LISTO_PARA_CERRAR: "Listo para Cerrar",
};
const ETAPA_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  SIN_ETAPA:           { dot: "#374151", text: "text-gray-400",   bg: "bg-gray-800/60" },
  NUEVO_CONTACTO:      { dot: "#1e3a5f", text: "text-blue-400",   bg: "bg-blue-950/40" },
  EN_SEGUIMIENTO:      { dot: "#1e40af", text: "text-blue-300",   bg: "bg-blue-900/30" },
  INTERES_CONFIRMADO:  { dot: "#065f46", text: "text-emerald-400",bg: "bg-emerald-950/40" },
  EN_EVALUACION:       { dot: "#78350f", text: "text-amber-400",  bg: "bg-amber-950/40" },
  LISTO_PARA_CERRAR:   { dot: "#b3985b", text: "text-[#B3985B]",  bg: "bg-[#B3985B]/10" },
};
const ESTADO_COLORS: Record<string, string> = {
  SIN_ETAPA: "text-gray-500", ACTIVO: "text-emerald-400", EN_TRATO: "text-purple-400",
  CONVERTIDO: "text-[#B3985B]", CANCELADO: "text-red-400",
};
const ESTADO_LABELS: Record<string, string> = {
  SIN_ETAPA: "Sin etapa", ACTIVO: "Activo", EN_TRATO: "En trato",
  CONVERTIDO: "Convertido", CANCELADO: "Cancelado",
};
const TIPO_COLORS: Record<string, string> = {
  B2B: "bg-blue-900/40 text-blue-300",
  B2C: "bg-purple-900/40 text-purple-300",
  POR_DESCUBRIR: "bg-gray-800 text-gray-400",
};
const CLAS_COLORS: Record<string, string> = {
  NUEVO: "text-[#6b7280]", REGULAR: "text-yellow-400", PRIORITY: "text-[#B3985B]", BASIC: "text-blue-400",
};
const SERVICIO_OPTIONS = [
  { value: "RENTA", label: "Renta de Equipo" },
  { value: "PRODUCCION_TECNICA", label: "Producción Técnica" },
  { value: "DIRECCION_TECNICA", label: "Dirección Técnica" },
];
const SERVICIO_LABELS: Record<string, string> = {
  RENTA: "Renta", PRODUCCION_TECNICA: "Prod. Técnica", DIRECCION_TECNICA: "Dir. Técnica",
};
const TIPO_EVENTO_OPTIONS = [
  { value: "MUSICAL", label: "Musical" }, { value: "SOCIAL", label: "Social" },
  { value: "EMPRESARIAL", label: "Empresarial" }, { value: "VARIOS", label: "Varios" },
];
const TIPO_CLIENTE_OPTIONS = Object.entries(TIPO_CLIENTE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const CLASIFICACION_OPTIONS = Object.entries(CLASIFICACION_LABELS)
  .filter(([v]) => v !== "BASIC")
  .map(([v, l]) => ({ value: v, label: l }));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTiposEvento(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function progreso(p: Prospeccion) {
  return [p.contacto1Hecho, p.contacto2Hecho, p.contacto3Hecho, p.contacto4Hecho, p.contacto5Hecho]
    .filter(Boolean).length;
}

function formatFecha(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// ─── InlineDropdown ───────────────────────────────────────────────────────────

function InlineDropdown({ options, value, onChange, colorMap }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  colorMap?: Record<string, string>;
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
  return (
    <div ref={ref} className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent hover:border-[#B3985B]/40 hover:bg-[#B3985B]/5 transition-all group">
        {current ? (
          <span className="text-xs font-medium" style={colorMap ? { color: colorMap[current.value] } : { color: "#ccc" }}>
            {current.label}
          </span>
        ) : <span className="text-xs text-[#444]">—</span>}
        <svg className="text-[#444] group-hover:text-[#B3985B]" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[150px]">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[#1a1a1a] ${value === opt.value ? "text-[#B3985B]" : "text-gray-300"}`}>
              {opt.label}{value === opt.value && <span className="ml-2">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal: Nuevo Prospecto (from DB) ────────────────────────────────────────

function ModalNuevoProspectoDB({ usuarios, onClose, onCreated }: {
  usuarios: Usuario[];
  onClose: () => void;
  onCreated: (p: Prospeccion) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [clienteResults, setClienteResults] = useState<{ id: string; nombre: string; empresa: string | null; tipoCliente: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<{ id: string; nombre: string } | null>(null);
  const [tipo, setTipo] = useState<"NUEVO_PROSPECTO" | "CLIENTE_PROPIO">("NUEVO_PROSPECTO");
  const [form, setForm] = useState({
    nombre: "", telefono: "", correo: "", empresa: "",
    tipoEvento: "VARIOS", origen: "MANUAL", responsableId: "",
  });

  useEffect(() => {
    if (!search.trim() || search.length < 2) { setClienteResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(search.trim())}&limit=6`);
        const d = await res.json();
        setClienteResults(d.clientes ?? []);
      } catch { setClienteResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        tipo, tipoEvento: form.tipoEvento, origen: form.origen,
        responsableId: form.responsableId || null,
        etapa: "NUEVO_CONTACTO", estado: "ACTIVO",
      };
      if (clienteSeleccionado) {
        body.clienteId = clienteSeleccionado.id;
      } else {
        body.nombre = form.nombre;
        body.telefono = form.telefono || null;
        body.correo = form.correo || null;
        body.empresa = form.empresa || null;
      }
      const res = await fetch("/api/prospeccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      onCreated(d.prospeccion);
      onClose();
    } catch { /* handled by parent toast */ }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <h2 className="text-white font-semibold text-sm">Agregar Prospecto</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Tipo */}
          <div className="flex gap-2">
            {(["NUEVO_PROSPECTO", "CLIENTE_PROPIO"] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={`flex-1 py-2 text-xs rounded-lg border transition-all ${tipo === t ? "bg-[#B3985B] text-black border-[#B3985B] font-semibold" : "border-[#2a2a2a] text-[#777] hover:text-white"}`}>
                {t === "NUEVO_PROSPECTO" ? "Prospecto nuevo" : "Cliente propio"}
              </button>
            ))}
          </div>

          {/* Search existing */}
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">
              {clienteSeleccionado ? "Cliente seleccionado" : "Buscar cliente existente"}
            </label>
            <div className="relative">
              <input value={clienteSeleccionado ? clienteSeleccionado.nombre : search}
                onChange={e => { setSearch(e.target.value); setClienteSeleccionado(null); }}
                placeholder="Buscar por nombre..." className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50" />
              {clienteSeleccionado && (
                <button type="button" onClick={() => { setClienteSeleccionado(null); setSearch(""); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white">✕</button>
              )}
            </div>
            {!clienteSeleccionado && search.trim() && (
              <div className="mt-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                {searching && <p className="text-xs text-[#555] px-3 py-2">Buscando...</p>}
                {!searching && clienteResults.length === 0 && <p className="text-xs text-[#555] px-3 py-2">Sin resultados</p>}
                {clienteResults.map(c => (
                  <button key={c.id} type="button" onClick={() => { setClienteSeleccionado({ id: c.id, nombre: c.nombre }); setSearch(""); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#1a1a1a] flex items-center justify-between">
                    <span>{c.nombre}</span>
                    {c.empresa && <span className="text-[#555]">{c.empresa}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New client fields */}
          {!clienteSeleccionado && tipo === "NUEVO_PROSPECTO" && (
            <div className="space-y-3">
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
            </div>
          )}

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Tipo de evento</label>
              <Combobox value={form.tipoEvento} onChange={v => setForm(f => ({ ...f, tipoEvento: v }))}
                options={TIPO_EVENTO_OPTIONS} placeholder="Tipo evento"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Origen</label>
              <Combobox value={form.origen} onChange={v => setForm(f => ({ ...f, origen: v }))}
                options={Object.entries(ORIGEN_LABELS).map(([v, l]) => ({ value: v, label: l }))} placeholder="Origen"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Responsable</label>
            <Combobox value={form.responsableId} onChange={v => setForm(f => ({ ...f, responsableId: v }))}
              options={[{ value: "", label: "Sin asignar" }, ...usuarios.map(u => ({ value: u.id, label: u.name.split(" ").slice(0, 2).join(" ") }))]}
              placeholder="Responsable"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-[#777] border border-[#2a2a2a] rounded-lg hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving || (tipo === "CLIENTE_PROPIO" && !clienteSeleccionado)}
              className="flex-1 px-4 py-2 text-sm bg-[#B3985B] text-black font-semibold rounded-lg hover:bg-[#C9A84C] disabled:opacity-50 transition-colors">
              {saving ? "Creando..." : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Nuevo Cliente ─────────────────────────────────────────────────────

function ModalNuevoCliente({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (c: Cliente) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "", telefono: "", correo: "", empresa: "",
    tipoCliente: "POR_DESCUBRIR", clasificacion: "NUEVO",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      onCreated({ ...d.cliente, _count: { tratos: 0, proyectos: 0, prospecciones: 0 }, esProspecto: false });
      onClose();
    } catch { /* parent toast */ }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <h2 className="text-white font-semibold text-sm">Nuevo Cliente</h2>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Tipo</label>
              <Combobox value={form.tipoCliente} onChange={v => setForm(f => ({ ...f, tipoCliente: v }))}
                options={TIPO_CLIENTE_OPTIONS} placeholder="Tipo"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Clasificación</label>
              <Combobox value={form.clasificacion} onChange={v => setForm(f => ({ ...f, clasificacion: v }))}
                options={CLASIFICACION_OPTIONS} placeholder="Clasificación"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-[#777] border border-[#2a2a2a] rounded-lg hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-[#B3985B] text-black font-semibold rounded-lg hover:bg-[#C9A84C] disabled:opacity-50 transition-colors">
              {saving ? "Creando..." : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── TabProspectos ────────────────────────────────────────────────────────────

function TabProspectos({ prospecciones: initialProspecciones, usuarios }: {
  prospecciones: Prospeccion[];
  usuarios: Usuario[];
}) {
  const toast = useToast();
  const [prospecciones, setProspecciones] = useState(initialProspecciones);
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("");
  const [filtroResponsable, setFiltroResponsable] = useState("");

  const filtradas = useMemo(() => {
    return prospecciones.filter(p => {
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!p.cliente.nombre.toLowerCase().includes(q) && !(p.cliente.empresa ?? "").toLowerCase().includes(q)) return false;
      }
      if (filtroTipo && p.tipo !== filtroTipo) return false;
      if (filtroEtapa && p.etapa !== filtroEtapa) return false;
      if (filtroOrigen && p.origen !== filtroOrigen) return false;
      if (filtroEvento && p.tipoEvento !== filtroEvento) return false;
      if (filtroResponsable) {
        if (filtroResponsable === "__sin__" && p.responsable !== null) return false;
        if (filtroResponsable !== "__sin__" && p.responsable?.id !== filtroResponsable) return false;
      }
      return true;
    });
  }, [prospecciones, busqueda, filtroTipo, filtroEtapa, filtroOrigen, filtroEvento, filtroResponsable]);

  const hayFiltros = busqueda || filtroTipo || filtroEtapa || filtroOrigen || filtroEvento || filtroResponsable;

  function handleCreated(p: Prospeccion) {
    setProspecciones(prev => [p, ...prev]);
    toast.success("Prospecto agregado");
  }

  async function patchEtapa(id: string, etapa: string) {
    await fetch(`/api/prospeccion/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa, estado: "ACTIVO" }),
    });
    setProspecciones(prev => prev.map(p => p.id === id ? { ...p, etapa, estado: "ACTIVO" } : p));
  }

  return (
    <>
      {showModal && <ModalNuevoProspectoDB usuarios={usuarios} onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      {/* Filters + CTA */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por nombre o empresa…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50" />
          {busqueda && <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
        </div>
        <Combobox value={filtroTipo} onChange={setFiltroTipo}
          options={[{ value: "", label: "Tipo" }, { value: "NUEVO_PROSPECTO", label: "Prospecto nuevo" }, { value: "CLIENTE_PROPIO", label: "Cliente propio" }]}
          placeholder="Tipo" className={`px-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-colors ${filtroTipo ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        <Combobox value={filtroEtapa} onChange={setFiltroEtapa}
          options={[{ value: "", label: "Etapa" }, ...Object.entries(ETAPA_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
          placeholder="Etapa" className={`px-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-colors ${filtroEtapa ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        <Combobox value={filtroEvento} onChange={setFiltroEvento}
          options={[{ value: "", label: "Evento" }, ...TIPO_EVENTO_OPTIONS]}
          placeholder="Evento" className={`px-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-colors ${filtroEvento ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        <Combobox value={filtroResponsable} onChange={setFiltroResponsable}
          options={[{ value: "", label: "Responsable" }, { value: "__sin__", label: "Sin asignar" }, ...usuarios.map(u => ({ value: u.id, label: u.name.split(" ").slice(0, 2).join(" ") }))]}
          placeholder="Responsable" className={`px-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-colors ${filtroResponsable ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        {hayFiltros && (
          <button onClick={() => { setBusqueda(""); setFiltroTipo(""); setFiltroEtapa(""); setFiltroOrigen(""); setFiltroEvento(""); setFiltroResponsable(""); }}
            className="text-[10px] text-[#555] hover:text-red-400 border border-[#2a2a2a] hover:border-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors">
            Limpiar
          </button>
        )}
        <div className="ml-auto">
          <button onClick={() => setShowModal(true)}
            className="bg-[#B3985B] hover:bg-[#C9A84C] text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            + Agregar prospecto
          </button>
        </div>
      </div>

      {/* Counter */}
      <p className="text-[#555] text-xs mb-3">
        {filtradas.length} {hayFiltros ? `de ${prospecciones.length} ` : ""}prospectos
      </p>

      {/* Table header */}
      <div className="hidden md:grid grid-cols-[1fr_140px_120px_100px_120px_90px_80px] gap-3 px-4 py-2 text-[9px] text-[#444] uppercase tracking-wider border-b border-[#1a1a1a] mb-1">
        <span>Nombre</span>
        <span>Etapa</span>
        <span>Tipo evento</span>
        <span>Origen</span>
        <span>Responsable</span>
        <span>Progreso</span>
        <span>Próximo</span>
      </div>

      {/* Rows */}
      <div className="space-y-px">
        {filtradas.length === 0 ? (
          <div className="py-16 text-center text-[#444] text-sm border border-[#1a1a1a] border-dashed rounded-xl mt-2">
            {hayFiltros ? "Sin resultados para los filtros aplicados" : "No hay prospectos en la base de datos"}
          </div>
        ) : (
          filtradas.map(p => {
            const etC = ETAPA_COLORS[p.etapa] ?? ETAPA_COLORS.SIN_ETAPA;
            const prog = progreso(p);
            const evColor = TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#6b7280";
            return (
              <div key={p.id}
                className="group grid grid-cols-1 md:grid-cols-[1fr_140px_120px_100px_120px_90px_80px] gap-3 items-center px-4 py-3 rounded-lg hover:bg-[#111] transition-colors border border-transparent hover:border-[#1e1e1e]">
                {/* Nombre + empresa */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                    <span className="text-[#B3985B] text-[10px] font-bold">{p.cliente.nombre.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <Link href={`/crm/prospeccion/${p.id}`} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors truncate block">
                      {p.cliente.nombre}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.cliente.empresa && <span className="text-[#555] text-xs truncate">{p.cliente.empresa}</span>}
                      {p.trato && (
                        <span className="text-[9px] bg-purple-900/40 text-purple-300 border border-purple-800/30 px-1.5 py-0.5 rounded-full">En trato</span>
                      )}
                      {p.estado === "CONVERTIDO" && (
                        <span className="text-[9px] bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30 px-1.5 py-0.5 rounded-full">Convertido</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Etapa dropdown */}
                <div>
                  <InlineDropdown
                    value={p.etapa}
                    onChange={etapa => patchEtapa(p.id, etapa)}
                    options={Object.entries(ETAPA_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                  />
                </div>

                {/* Tipo evento */}
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: evColor + "33", color: evColor }}>
                    {TIPO_EVENTO_LABELS[p.tipoEvento] ?? p.tipoEvento}
                  </span>
                </div>

                {/* Origen */}
                <div>
                  <span className="text-xs text-[#555]">{ORIGEN_LABELS[p.origen] ?? p.origen}</span>
                </div>

                {/* Responsable */}
                <div>
                  <span className="text-xs text-[#777]">{p.responsable ? p.responsable.name.split(" ").slice(0, 2).join(" ") : "—"}</span>
                </div>

                {/* Progreso */}
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className={`w-2 h-2 rounded-full border ${n <= prog ? "bg-[#B3985B] border-[#B3985B]" : "bg-transparent border-[#333]"}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#555]">{prog}/5</span>
                </div>

                {/* Próximo contacto */}
                <div className="flex items-center gap-1">
                  <span className={`text-xs ${p.fechaProximoContacto && new Date(p.fechaProximoContacto) < new Date() ? "text-red-400" : "text-[#555]"}`}>
                    {formatFecha(p.fechaProximoContacto)}
                  </span>
                  <Link href={`/crm/prospeccion/${p.id}`}
                    className="text-[#333] hover:text-[#B3985B] transition-colors opacity-0 group-hover:opacity-100 ml-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

// ─── TabClientes ─────────────────────────────────────────────────────────────

function TabClientes({ clientes: initialClientes, usuarios }: {
  clientes: Cliente[];
  usuarios: Usuario[];
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [clientes, setClientes] = useState(initialClientes);
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroClasificacion, setFiltroClasificacion] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("");

  const filtrados = useMemo(() => {
    return clientes.filter(c => {
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!c.nombre.toLowerCase().includes(q) && !(c.empresa ?? "").toLowerCase().includes(q) && !(c.correo ?? "").toLowerCase().includes(q)) return false;
      }
      if (filtroTipo && c.tipoCliente !== filtroTipo) return false;
      if (filtroClasificacion && c.clasificacion !== filtroClasificacion) return false;
      if (filtroEvento) {
        const tipos = parseTiposEvento(c.tiposEvento);
        if (!tipos.includes(filtroEvento)) return false;
      }
      if (filtroVendedor) {
        if (filtroVendedor === "__sin__" && c.vendedor !== null) return false;
        if (filtroVendedor !== "__sin__" && c.vendedor?.id !== filtroVendedor) return false;
      }
      return true;
    });
  }, [clientes, busqueda, filtroTipo, filtroClasificacion, filtroEvento, filtroVendedor]);

  const hayFiltros = busqueda || filtroTipo || filtroClasificacion || filtroEvento || filtroVendedor;

  async function patchCliente(id: string, field: string, value: string) {
    await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setClientes(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  function handleCreated(c: Cliente) {
    setClientes(prev => [c, ...prev]);
    toast.success("Cliente creado");
  }

  return (
    <>
      {showModal && <ModalNuevoCliente onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por nombre, empresa o correo…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50" />
          {busqueda && <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
        </div>
        <Combobox value={filtroTipo} onChange={setFiltroTipo}
          options={[{ value: "", label: "Tipo" }, ...TIPO_CLIENTE_OPTIONS]}
          placeholder="Tipo" className={`px-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-colors ${filtroTipo ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        <Combobox value={filtroClasificacion} onChange={setFiltroClasificacion}
          options={[{ value: "", label: "Clasificación" }, ...CLASIFICACION_OPTIONS]}
          placeholder="Clasificación" className={`px-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-colors ${filtroClasificacion ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        <Combobox value={filtroEvento} onChange={setFiltroEvento}
          options={[{ value: "", label: "Evento" }, ...TIPO_EVENTO_OPTIONS]}
          placeholder="Evento" className={`px-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-colors ${filtroEvento ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        <Combobox value={filtroVendedor} onChange={setFiltroVendedor}
          options={[{ value: "", label: "Vendedor" }, { value: "__sin__", label: "Sin asignar" }, ...usuarios.map(u => ({ value: u.id, label: u.name.split(" ").slice(0, 2).join(" ") }))]}
          placeholder="Vendedor" className={`px-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-colors ${filtroVendedor ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        {hayFiltros && (
          <button onClick={() => { setBusqueda(""); setFiltroTipo(""); setFiltroClasificacion(""); setFiltroEvento(""); setFiltroVendedor(""); }}
            className="text-[10px] text-[#555] hover:text-red-400 border border-[#2a2a2a] hover:border-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors">
            Limpiar
          </button>
        )}
        <div className="ml-auto">
          <button onClick={() => setShowModal(true)}
            className="bg-[#B3985B] hover:bg-[#C9A84C] text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            + Nuevo cliente
          </button>
        </div>
      </div>

      <p className="text-[#555] text-xs mb-3">
        {filtrados.length} {hayFiltros ? `de ${clientes.length} ` : ""}clientes
      </p>

      {/* Table header */}
      <div className="hidden md:grid grid-cols-[1fr_90px_90px_130px_110px_80px_60px] gap-3 px-4 py-2 text-[9px] text-[#444] uppercase tracking-wider border-b border-[#1a1a1a] mb-1">
        <span>Nombre</span>
        <span>Tipo</span>
        <span>Clasificación</span>
        <span>Tipos de evento</span>
        <span>Vendedor</span>
        <span>Tratos / Proyectos</span>
        <span></span>
      </div>

      <div className="space-y-px">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center text-[#444] text-sm border border-[#1a1a1a] border-dashed rounded-xl mt-2">
            {hayFiltros ? "Sin resultados para los filtros aplicados" : "No hay clientes en la base de datos"}
          </div>
        ) : (
          filtrados.map(c => {
            const tiposEvento = parseTiposEvento(c.tiposEvento);
            return (
              <div key={c.id}
                className="group grid grid-cols-1 md:grid-cols-[1fr_90px_90px_130px_110px_80px_60px] gap-3 items-center px-4 py-3 rounded-lg hover:bg-[#111] transition-colors border border-transparent hover:border-[#1e1e1e]">
                {/* Nombre */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                    <span className="text-[#B3985B] text-[10px] font-bold">{c.nombre.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <Link href={`/crm/clientes/${c.id}`} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors truncate block">
                      {c.nombre}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.empresa && <span className="text-[#555] text-xs truncate">{c.empresa}</span>}
                      {c.correo && (
                        <span className="text-[#444] text-xs hidden lg:block truncate">{c.correo}</span>
                      )}
                      {c.esProspecto && (
                        <span className="text-[9px] bg-amber-950/40 text-amber-400 border border-amber-900/30 px-1.5 py-0.5 rounded-full">Prospecto</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <InlineDropdown
                    value={c.tipoCliente}
                    onChange={v => patchCliente(c.id, "tipoCliente", v)}
                    options={TIPO_CLIENTE_OPTIONS}
                  />
                </div>

                {/* Clasificación */}
                <div>
                  <InlineDropdown
                    value={c.clasificacion}
                    onChange={v => patchCliente(c.id, "clasificacion", v)}
                    options={CLASIFICACION_OPTIONS}
                    colorMap={{ NUEVO: "#6b7280", REGULAR: "#FBBF24", PRIORITY: "#B3985B", BASIC: "#60A5FA" }}
                  />
                </div>

                {/* Tipos de evento */}
                <div className="flex flex-wrap gap-0.5">
                  {tiposEvento.length === 0 ? (
                    <span className="text-[#444] text-xs">—</span>
                  ) : (
                    tiposEvento.map(t => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white"
                        style={{ backgroundColor: TIPO_EVENTO_COLORS[t] ? TIPO_EVENTO_COLORS[t] + "33" : "#6b728033", color: TIPO_EVENTO_COLORS[t] ?? "#6b7280" }}>
                        {TIPO_EVENTO_LABELS[t] ?? t}
                      </span>
                    ))
                  )}
                </div>

                {/* Vendedor */}
                <div>
                  <span className="text-xs text-[#777]">{c.vendedor ? c.vendedor.name.split(" ").slice(0, 2).join(" ") : "—"}</span>
                </div>

                {/* Counts */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#555]">
                    <span className="text-white">{c._count.tratos}</span> T
                  </span>
                  <span className="text-xs text-[#555]">
                    <span className="text-white">{c._count.proyectos}</span> P
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/crm/clientes/${c.id}`}
                    className="text-[#333] hover:text-[#B3985B] transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </Link>
                  {c.telefono && (
                    <CopyButton value={c.telefono} className="text-[#333] hover:text-[#B3985B] transition-colors" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BaseDeDatosClient({
  clientes,
  prospecciones,
  usuarios,
}: {
  clientes: Cliente[];
  prospecciones: Prospeccion[];
  usuarios: Usuario[];
}) {
  const [activeTab, setActiveTab] = useState<"prospectos" | "clientes">("prospectos");

  const totalProspectos = prospecciones.length;
  const totalClientes = clientes.length;
  const prospectos_activos = prospecciones.filter(p => p.estado === "ACTIVO" || p.estado === "SIN_ETAPA").length;

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Base de Datos</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {totalProspectos} prospectos · {totalClientes} clientes
          </p>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Prospectos totales", value: totalProspectos, color: "text-[#B3985B]" },
          { label: "Activos en ruta", value: prospectos_activos, color: "text-emerald-400" },
          { label: "Convertidos", value: prospecciones.filter(p => p.estado === "CONVERTIDO").length, color: "text-blue-400" },
          { label: "Clientes totales", value: totalClientes, color: "text-white" },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[#555] text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 mb-6 bg-[#111] border border-[#1e1e1e] rounded-xl p-1 w-fit">
        {([
          { key: "prospectos", label: "Base de Prospectos", count: totalProspectos },
          { key: "clientes",   label: "Base de Clientes",   count: totalClientes },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-[#B3985B] text-black"
                : "text-[#6b7280] hover:text-white"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === tab.key ? "bg-black/20 text-black" : "bg-[#1e1e1e] text-[#555]"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "prospectos" ? (
        <TabProspectos prospecciones={prospecciones} usuarios={usuarios} />
      ) : (
        <TabClientes clientes={clientes} usuarios={usuarios} />
      )}
    </>
  );
}
