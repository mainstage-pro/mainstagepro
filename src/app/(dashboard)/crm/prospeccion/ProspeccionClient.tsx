"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Usuario { id: string; name: string }

interface Prospeccion {
  id: string;
  tipo: string;
  etapa: string;
  estado: string;
  tipoEvento: string;
  origen: string;
  notas: string | null;
  fechaProximoContacto: string | null;
  contacto1Hecho: boolean;
  contacto2Hecho: boolean;
  contacto3Hecho: boolean;
  contacto4Hecho: boolean;
  contacto5Hecho: boolean;
  cliente: {
    id: string;
    nombre: string;
    empresa: string | null;
    telefono: string | null;
    correo: string | null;
    tipoCliente: string;
  };
  responsable: { id: string; name: string } | null;
  trato: { id: string; etapa: string; nombreEvento: string | null } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ETAPAS_ORDEN = [
  "SIN_ETAPA",
  "NUEVO_CONTACTO",
  "EN_SEGUIMIENTO",
  "INTERES_CONFIRMADO",
  "EN_EVALUACION",
  "LISTO_PARA_CERRAR",
] as const;

const ETAPA_LABELS: Record<string, string> = {
  SIN_ETAPA: "Sin Etapa",
  NUEVO_CONTACTO: "Nuevo Contacto",
  EN_SEGUIMIENTO: "En Seguimiento",
  INTERES_CONFIRMADO: "Interés Confirmado",
  EN_EVALUACION: "En Evaluación",
  LISTO_PARA_CERRAR: "Listo para Cerrar",
};

const ETAPA_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  SIN_ETAPA:           { bg: "bg-[#1f2937]/60", text: "text-gray-400",   border: "border-gray-700/40",   dot: "#374151" },
  NUEVO_CONTACTO:      { bg: "bg-blue-950/40",   text: "text-blue-400",  border: "border-blue-900/40",   dot: "#1e3a5f" },
  EN_SEGUIMIENTO:      { bg: "bg-blue-900/30",   text: "text-blue-300",  border: "border-blue-800/40",   dot: "#1e40af" },
  INTERES_CONFIRMADO:  { bg: "bg-emerald-950/40",text: "text-emerald-400",border: "border-emerald-900/40",dot: "#065f46" },
  EN_EVALUACION:       { bg: "bg-amber-950/40",  text: "text-amber-400", border: "border-amber-900/40",  dot: "#78350f" },
  LISTO_PARA_CERRAR:   { bg: "bg-[#B3985B]/10",  text: "text-[#B3985B]", border: "border-[#B3985B]/30",  dot: "#b3985b" },
};

const TIPO_EVENTO_COLORS: Record<string, { bg: string; text: string }> = {
  MUSICAL:     { bg: "bg-[#C9A84C]/15", text: "text-[#C9A84C]" },
  SOCIAL:      { bg: "bg-purple-900/30", text: "text-purple-300" },
  EMPRESARIAL: { bg: "bg-blue-900/30",  text: "text-blue-300" },
  VARIOS:      { bg: "bg-gray-800",     text: "text-gray-400" },
};

const TIPO_EVENTO_LABELS: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", VARIOS: "Varios",
};

const ORIGEN_LABELS: Record<string, string> = {
  META_ADS: "Meta Ads", MANUAL: "Manual", REFERIDO: "Referido", RECOMPRA: "Recompra",
  ORGANICO: "Orgánico", NETWORKING: "Networking", REDES_SOCIALES: "Redes Sociales", OTRO: "Otro",
};

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  EN_TRATO:   { label: "En trato",   className: "bg-purple-900/40 text-purple-300 border border-purple-800/30" },
  CONVERTIDO: { label: "Convertido", className: "bg-emerald-900/40 text-emerald-300 border border-emerald-800/30" },
  CANCELADO:  { label: "Cancelado",  className: "bg-red-900/40 text-red-400 border border-red-800/30" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function progreso(p: Prospeccion): number {
  return [p.contacto1Hecho, p.contacto2Hecho, p.contacto3Hecho, p.contacto4Hecho, p.contacto5Hecho]
    .filter(Boolean).length;
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function isVencido(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ─── EtapaDropdown ───────────────────────────────────────────────────────────

function EtapaDropdown({ prospeccionId, etapaActual, onChanged }: {
  prospeccionId: string;
  etapaActual: string;
  onChanged: (nuevaEtapa: string) => void;
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

  async function cambiarEtapa(nuevaEtapa: string) {
    setSaving(true);
    await fetch(`/api/prospeccion/${prospeccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: nuevaEtapa, estado: "ACTIVO" }),
    });
    onChanged(nuevaEtapa);
    setSaving(false);
    setOpen(false);
  }

  const colors = ETAPA_COLORS[etapaActual] ?? ETAPA_COLORS.SIN_ETAPA;

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colors.bg} ${colors.text} ${colors.border} hover:brightness-110 transition-all disabled:opacity-50`}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.dot }} />
        {ETAPA_LABELS[etapaActual] ?? etapaActual}
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2 4 6 8 10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[200px]">
          {ETAPAS_ORDEN.map(e => {
            const c = ETAPA_COLORS[e];
            return (
              <button key={e} onClick={() => cambiarEtapa(e)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[#1a1a1a] ${e === etapaActual ? c.text + " font-medium" : "text-gray-400"}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.dot }} />
                {ETAPA_LABELS[e]}
                {e === etapaActual && <span className="ml-auto text-[#B3985B]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ProspeccionCard ─────────────────────────────────────────────────────────

function ProspeccionCard({ p, onEtapaChange, onDelete }: {
  p: Prospeccion;
  onEtapaChange: (id: string, etapa: string) => void;
  onDelete: (id: string) => void;
}) {
  const evtColors = TIPO_EVENTO_COLORS[p.tipoEvento] ?? TIPO_EVENTO_COLORS.VARIOS;
  const prog = progreso(p);
  const proximoVencido = isVencido(p.fechaProximoContacto);
  const estadoBadge = ESTADO_BADGE[p.estado];

  return (
    <div className="group bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 hover:border-[#2a2a2a] hover:bg-[#141414] transition-all">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[#B3985B] text-xs font-bold">{p.cliente.nombre.charAt(0).toUpperCase()}</span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/crm/prospeccion/${p.id}`} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors truncate">
              {p.cliente.nombre}
            </Link>
            {p.cliente.empresa && (
              <span className="text-[#555] text-xs truncate hidden sm:block">· {p.cliente.empresa}</span>
            )}
            {estadoBadge && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${estadoBadge.className}`}>
                {estadoBadge.label}
              </span>
            )}
          </div>

          {/* Row 2: tipo evento + etapa dropdown + origen */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${evtColors.bg} ${evtColors.text}`}>
              {TIPO_EVENTO_LABELS[p.tipoEvento] ?? p.tipoEvento}
            </span>
            <EtapaDropdown
              prospeccionId={p.id}
              etapaActual={p.etapa}
              onChanged={nuevaEtapa => onEtapaChange(p.id, nuevaEtapa)}
            />
            <span className="text-[10px] text-[#444]">{ORIGEN_LABELS[p.origen] ?? p.origen}</span>
          </div>

          {/* Row 3: responsable + próximo contacto + progreso */}
          <div className="flex items-center gap-4 mt-2 text-xs text-[#6b7280]">
            {/* Responsable */}
            <span className="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              {p.responsable ? p.responsable.name.split(" ")[0] : "Sin asignar"}
            </span>

            {/* Próximo contacto */}
            <span className={`flex items-center gap-1 ${proximoVencido ? "text-red-400" : ""}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {p.fechaProximoContacto ? formatFecha(p.fechaProximoContacto) : "Sin fecha"}
            </span>

            {/* Progreso de contactos */}
            <span className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className={`w-2 h-2 rounded-full border ${n <= prog ? "bg-[#B3985B] border-[#B3985B]" : "bg-transparent border-[#333]"}`} />
                ))}
              </div>
              <span className="text-[10px]">{prog}/5</span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <Link href={`/crm/prospeccion/${p.id}`}
            className="text-[#B3985B] text-xs hover:underline whitespace-nowrap">
            Ver →
          </Link>
          {(p.estado === "SIN_ETAPA" || p.estado === "CANCELADO") && (
            <button onClick={() => onDelete(p.id)}
              className="text-gray-700 hover:text-red-400 transition-colors text-xs" title="Eliminar">✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EtapaSection ────────────────────────────────────────────────────────────

function EtapaSection({ etapa, prospecciones, onEtapaChange, onDelete, defaultCollapsed = false }: {
  etapa: string;
  prospecciones: Prospeccion[];
  onEtapaChange: (id: string, etapa: string) => void;
  onDelete: (id: string) => void;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed && prospecciones.length === 0);
  const colors = ETAPA_COLORS[etapa] ?? ETAPA_COLORS.SIN_ETAPA;

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-2 w-full text-left mb-2 group"
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors.dot }} />
        <span className="text-xs font-semibold text-[#ccc] group-hover:text-white transition-colors">
          {ETAPA_LABELS[etapa] ?? etapa}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
          {prospecciones.length}
        </span>
        <svg
          className={`ml-auto text-[#444] transition-transform ${collapsed ? "" : "rotate-180"}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>

      {!collapsed && (
        <div className="space-y-2 pl-1">
          {prospecciones.length === 0 ? (
            <div className="text-center py-4 text-[#444] text-xs border border-[#1a1a1a] border-dashed rounded-xl">
              Sin prospectos en esta etapa
            </div>
          ) : (
            prospecciones.map(p => (
              <ProspeccionCard key={p.id} p={p} onEtapaChange={onEtapaChange} onDelete={onDelete} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── ModalNuevoProspecto ──────────────────────────────────────────────────────

function ModalNuevoProspecto({ usuarios, tipo, onClose, onCreated }: {
  usuarios: Usuario[];
  tipo: "NUEVO_PROSPECTO" | "CLIENTE_PROPIO";
  onClose: () => void;
  onCreated: (p: Prospeccion) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [clienteResults, setClienteResults] = useState<{ id: string; nombre: string; empresa: string | null; tipoCliente: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<{ id: string; nombre: string } | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    correo: "",
    empresa: "",
    tipoEvento: "VARIOS",
    origen: tipo === "NUEVO_PROSPECTO" ? "MANUAL" : "RECOMPRA",
    responsableId: "",
    fechaProximoContacto: "",
    notas: "",
  });

  // Search existing clients
  useEffect(() => {
    if (!search.trim() || search.length < 2) { setClienteResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const qs = tipo === "CLIENTE_PROPIO" ? `&tipoCliente=B2C,B2B` : "";
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(search.trim())}&limit=6${qs}`);
        const d = await res.json();
        setClienteResults(d.clientes ?? []);
      } catch { setClienteResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [search, tipo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        tipo,
        tipoEvento: form.tipoEvento,
        origen: form.origen,
        responsableId: form.responsableId || null,
        notas: form.notas || null,
        fechaProximoContacto: form.fechaProximoContacto || null,
        etapa: "NUEVO_CONTACTO",
        estado: "ACTIVO",
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
    } catch {
      // Error handled silently — parent will show toast
    } finally {
      setSaving(false);
    }
  }

  const tipoEventoOpts = [
    { value: "MUSICAL", label: "Musical" },
    { value: "SOCIAL", label: "Social" },
    { value: "EMPRESARIAL", label: "Empresarial" },
    { value: "VARIOS", label: "Varios" },
  ];
  const origenOpts = tipo === "NUEVO_PROSPECTO"
    ? [
        { value: "MANUAL", label: "Manual" }, { value: "REFERIDO", label: "Referido" },
        { value: "ORGANICO", label: "Orgánico" }, { value: "REDES_SOCIALES", label: "Redes Sociales" },
        { value: "NETWORKING", label: "Networking" }, { value: "OTRO", label: "Otro" },
      ]
    : [
        { value: "RECOMPRA", label: "Recompra" }, { value: "REFERIDO", label: "Referido" },
        { value: "OTRO", label: "Otro" },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="text-white font-semibold text-sm">
              {tipo === "NUEVO_PROSPECTO" ? "Nuevo Prospecto" : "Agregar Cliente Propio"}
            </h2>
            <p className="text-[#555] text-xs mt-0.5">
              {tipo === "NUEVO_PROSPECTO" ? "Contacto nuevo en la ruta de prospección" : "Cliente existente a prospectar"}
            </p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Search existing client */}
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">
              {tipo === "CLIENTE_PROPIO" ? "Buscar cliente *" : "Buscar contacto existente"}
            </label>
            <div className="relative">
              <input
                value={clienteSeleccionado ? clienteSeleccionado.nombre : search}
                onChange={e => { setSearch(e.target.value); setClienteSeleccionado(null); }}
                placeholder={tipo === "CLIENTE_PROPIO" ? "Nombre del cliente B2C o B2B..." : "Buscar por nombre..."}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
              />
              {clienteSeleccionado && (
                <button type="button" onClick={() => { setClienteSeleccionado(null); setSearch(""); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            {/* Results dropdown */}
            {!clienteSeleccionado && search.trim() && (
              <div className="mt-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                {searching && <p className="text-xs text-[#555] px-3 py-2">Buscando...</p>}
                {!searching && clienteResults.length === 0 && (
                  <p className="text-xs text-[#555] px-3 py-2">Sin resultados</p>
                )}
                {clienteResults.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => { setClienteSeleccionado({ id: c.id, nombre: c.nombre }); setSearch(""); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#1a1a1a] transition-colors flex items-center justify-between">
                    <span>{c.nombre}</span>
                    {c.empresa && <span className="text-[#555]">{c.empresa}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New client fields (only when no existing selected and NUEVO_PROSPECTO) */}
          {!clienteSeleccionado && tipo === "NUEVO_PROSPECTO" && (
            <>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Nombre completo *</label>
                  <input
                    required={!clienteSeleccionado}
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
                    placeholder="Nombre del prospecto"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Teléfono</label>
                    <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
                      placeholder="55 1234 5678" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Correo</label>
                    <input type="email" value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
                      placeholder="correo@ejemplo.com" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Empresa</label>
                  <input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
                    placeholder="Empresa (opcional)" />
                </div>
              </div>
            </>
          )}

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Tipo de evento *</label>
              <Combobox
                value={form.tipoEvento}
                onChange={v => setForm(f => ({ ...f, tipoEvento: v }))}
                options={tipoEventoOpts}
                placeholder="Tipo de evento"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Origen *</label>
              <Combobox
                value={form.origen}
                onChange={v => setForm(f => ({ ...f, origen: v }))}
                options={origenOpts}
                placeholder="Origen"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Responsable *</label>
              <Combobox
                value={form.responsableId}
                onChange={v => setForm(f => ({ ...f, responsableId: v }))}
                options={[{ value: "", label: "Sin asignar" }, ...usuarios.map(u => ({ value: u.id, label: u.name.split(" ").slice(0, 2).join(" ") }))]}
                placeholder="Responsable"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Próximo contacto</label>
              <input type="date" value={form.fechaProximoContacto} onChange={e => setForm(f => ({ ...f, fechaProximoContacto: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Notas iniciales</label>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              rows={2}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50 resize-none"
              placeholder="Notas iniciales sobre el prospecto..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-[#777] border border-[#2a2a2a] rounded-lg hover:text-white hover:border-[#444] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || (tipo === "CLIENTE_PROPIO" && !clienteSeleccionado)}
              className="flex-1 px-4 py-2 text-sm bg-[#B3985B] text-black font-semibold rounded-lg hover:bg-[#C9A84C] disabled:opacity-50 transition-colors">
              {saving ? "Creando..." : "Crear prospecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type CountItem = { etapa: string; tipo: string; estado: string; _count: { id: number } };

export default function ProspeccionClient({
  usuarios,
  serverCounts,
}: {
  usuarios: Usuario[];
  serverCounts: CountItem[];
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"NUEVO_PROSPECTO" | "CLIENTE_PROPIO">("NUEVO_PROSPECTO");
  const [showModal, setShowModal] = useState(false);
  const [prospecciones, setProspecciones] = useState<Prospeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Filters
  const [busqueda, setBusqueda] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("");
  const [filtroResponsable, setFiltroResponsable] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");

  // Load data
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showAll) params.set("showAll", "true");
      const res = await fetch(`/api/prospeccion?${params}`);
      if (res.ok) {
        const d = await res.json();
        setProspecciones(d.prospecciones ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [showAll]);

  useEffect(() => { cargar(); }, [cargar]);

  // Filtered + grouped
  const filtradas = useMemo(() => {
    return prospecciones.filter(p => {
      if (p.tipo !== activeTab) return false;
      if (!showAll && (p.estado === "CONVERTIDO" || p.estado === "CANCELADO")) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!p.cliente.nombre.toLowerCase().includes(q) && !(p.cliente.empresa ?? "").toLowerCase().includes(q)) return false;
      }
      if (filtroEvento && p.tipoEvento !== filtroEvento) return false;
      if (filtroResponsable) {
        if (filtroResponsable === "__sin__" && p.responsable !== null) return false;
        if (filtroResponsable !== "__sin__" && p.responsable?.id !== filtroResponsable) return false;
      }
      if (filtroOrigen && p.origen !== filtroOrigen) return false;
      return true;
    });
  }, [prospecciones, activeTab, showAll, busqueda, filtroEvento, filtroResponsable, filtroOrigen]);

  const porEtapa = useMemo(() => {
    const map: Record<string, Prospeccion[]> = {};
    for (const e of ETAPAS_ORDEN) map[e] = [];
    for (const p of filtradas) {
      const e = ETAPAS_ORDEN.includes(p.etapa as typeof ETAPAS_ORDEN[number]) ? p.etapa : "SIN_ETAPA";
      map[e].push(p);
    }
    return map;
  }, [filtradas]);

  // Total counts from server for tab badges
  const totalNuevo = serverCounts.filter(c => c.tipo === "NUEVO_PROSPECTO").reduce((a, c) => a + c._count.id, 0);
  const totalPropio = serverCounts.filter(c => c.tipo === "CLIENTE_PROPIO").reduce((a, c) => a + c._count.id, 0);

  function handleEtapaChange(id: string, etapa: string) {
    setProspecciones(prev => prev.map(p => p.id === id ? { ...p, etapa, estado: "ACTIVO" } : p));
  }

  async function handleDelete(id: string) {
    if (!await confirm({ message: "¿Eliminar este prospecto? Esta acción no se puede deshacer.", danger: true, confirmText: "Eliminar" })) return;
    const r = await fetch(`/api/prospeccion/${id}`, { method: "DELETE" });
    if (r.ok) {
      setProspecciones(prev => prev.filter(p => p.id !== id));
      toast.success("Prospecto eliminado");
    } else {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
    }
  }

  function handleCreated(p: Prospeccion) {
    setProspecciones(prev => [p, ...prev]);
    toast.success("Prospecto creado");
  }

  const hayFiltros = busqueda || filtroEvento || filtroResponsable || filtroOrigen;

  const vendedorOptions = [
    { value: "", label: "Todos" },
    { value: "__sin__", label: "Sin asignar" },
    ...usuarios.map(u => ({ value: u.id, label: u.name.split(" ").slice(0, 2).join(" ") })),
  ];

  return (
    <>
      {showModal && (
        <ModalNuevoProspecto
          usuarios={usuarios}
          tipo={activeTab}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Prospección</h1>
          <p className="text-[#6b7280] text-sm">
            {filtradas.length} {hayFiltros ? <><span className="text-[#444]">de {prospecciones.filter(p => p.tipo === activeTab).length}</span></> : ""} prospectos activos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAll(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showAll ? "bg-[#B3985B]/10 border-[#B3985B]/30 text-[#B3985B]" : "border-[#2a2a2a] text-[#555] hover:border-[#444] hover:text-[#aaa]"}`}
          >
            {showAll ? "Ocultar cerrados" : "Ver todos"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#B3985B] hover:bg-[#C9A84C] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
          >
            + Nuevo prospecto
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 mb-5 bg-[#111] border border-[#1e1e1e] rounded-xl p-1 w-fit">
        {([
          { key: "NUEVO_PROSPECTO", label: "Prospectos Nuevos", count: totalNuevo },
          { key: "CLIENTE_PROPIO", label: "Clientes Propios", count: totalPropio },
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

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por nombre o empresa…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50 transition-colors" />
          {busqueda && <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
        </div>
        <Combobox value={filtroEvento} onChange={setFiltroEvento}
          options={[{ value: "", label: "Evento" }, { value: "MUSICAL", label: "Musical" }, { value: "SOCIAL", label: "Social" }, { value: "EMPRESARIAL", label: "Empresarial" }, { value: "VARIOS", label: "Varios" }]}
          placeholder="Evento"
          className={`px-3 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none ${filtroEvento ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        <Combobox value={filtroResponsable} onChange={setFiltroResponsable}
          options={vendedorOptions}
          placeholder="Responsable"
          className={`px-3 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none ${filtroResponsable ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        <Combobox value={filtroOrigen} onChange={setFiltroOrigen}
          options={[{ value: "", label: "Origen" }, ...Object.entries(ORIGEN_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
          placeholder="Origen"
          className={`px-3 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none ${filtroOrigen ? "bg-[#B3985B]/10 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#111] border-[#2a2a2a] text-[#777]"}`} />
        {hayFiltros && (
          <button onClick={() => { setBusqueda(""); setFiltroEvento(""); setFiltroResponsable(""); setFiltroOrigen(""); }}
            className="text-[10px] text-[#555] hover:text-red-400 border border-[#2a2a2a] hover:border-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors">
            Limpiar
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="py-20 text-center text-[#444] text-sm">Cargando prospectos…</div>
      ) : (
        <div>
          {ETAPAS_ORDEN.map((etapa, i) => (
            <EtapaSection
              key={etapa}
              etapa={etapa}
              prospecciones={porEtapa[etapa] ?? []}
              onEtapaChange={handleEtapaChange}
              onDelete={handleDelete}
              defaultCollapsed={i === 0 && (porEtapa[etapa]?.length ?? 0) === 0}
            />
          ))}
          {filtradas.length === 0 && !loading && (
            <div className="py-20 text-center border border-[#1a1a1a] border-dashed rounded-xl">
              <p className="text-[#444] text-sm">
                {hayFiltros ? "Sin resultados para los filtros aplicados" : `No hay ${activeTab === "NUEVO_PROSPECTO" ? "prospectos nuevos" : "clientes propios"} activos`}
              </p>
              <button onClick={() => setShowModal(true)}
                className="mt-4 text-[#B3985B] text-xs hover:underline">
                + Agregar {activeTab === "NUEVO_PROSPECTO" ? "prospecto" : "cliente propio"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
