"use client";

import React from "react";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ETAPA_LABELS, TIPO_EVENTO_LABELS, ORIGEN_LEAD_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { Combobox } from "@/components/Combobox";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";
import { BadgeDias } from "@/components/ui/BadgeDias";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { diasTrato } from "@/lib/contadores";

type Cotizacion = {
  id: string;
  numeroCotizacion: string;
  estado: string;
  granTotal: number;
  fechaEvento: string | null;
  createdAt: string;
  opcionLetra: string | null;
  grupoId: string | null;
  proyecto: { id: string } | null;
};

type Trato = {
  id: string;
  etapa: string;
  tipoEvento: string;
  tipoProspecto: string;
  nombreEvento: string | null;
  fechaEventoEstimada: string | null;
  presupuestoEstimado: number | null;
  lugarEstimado: string | null;
  origenLead: string;
  fechaProximaAccion: string | null;
  createdAt: string;
  fechaCierre: string | null;
  cliente: { id: string; nombre: string; empresa: string | null; telefono: string | null };
  responsable: { id: string; name: string } | null;
  cotizaciones: Cotizacion[];
  nurturingData: string | null;
};

type Cliente = { id: string; nombre: string; empresa: string | null; telefono: string | null };

const ETAPA_COLORS: Record<string, string> = {
  DESCUBRIMIENTO: "bg-blue-900/40 text-blue-300",
  OPORTUNIDAD: "bg-yellow-900/40 text-yellow-300",
  VENTA_CERRADA: "bg-green-900/40 text-green-300",
  VENTA_PERDIDA: "bg-red-900/40 text-red-400",
};

const ETAPA_TEXT: Record<string, string> = {
  DESCUBRIMIENTO: "text-blue-500/60",
  OPORTUNIDAD:    "text-yellow-500/60",
  VENTA_CERRADA:  "text-emerald-500/60",
  VENTA_PERDIDA:  "text-red-500/40",
};

const COT_COLORS: Record<string, string> = {
  BORRADOR:         "bg-[#222] text-[#888]",
  ENVIADA:          "bg-blue-900/40 text-blue-300",
  APROBADA:         "bg-green-900/40 text-green-300",
  RECHAZADA:        "bg-red-900/40 text-red-400",
  VENCIDA:          "bg-orange-900/40 text-orange-400",
  EN_REVISION:      "bg-yellow-900/40 text-yellow-300",
  AJUSTE_SOLICITADO:"bg-yellow-900/40 text-yellow-300",
  REENVIADA:        "bg-blue-900/40 text-blue-300",
};

const COT_LABELS: Record<string, string> = {
  BORRADOR: "Borrador", ENVIADA: "Enviada", APROBADA: "Aprobada",
  RECHAZADA: "Rechazada", VENCIDA: "Vencida",
  EN_REVISION: "En revisión", AJUSTE_SOLICITADO: "Ajuste", REENVIADA: "Reenviada",
};

const ETAPAS = ["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"];
const TIPOS_EVENTO = ["MUSICAL", "SOCIAL", "EMPRESARIAL", "OTRO"];

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

function waUrl(trato: Trato): string | null {
  const tel = trato.cliente?.telefono?.replace(/\D/g, "");
  if (!tel) return null;
  const nombre = trato.cliente.nombre.split(" ")[0];
  const evento = trato.nombreEvento || TIPO_EVENTO_LABELS[trato.tipoEvento] || "tu evento";
  const fecha = trato.fechaEventoEstimada
    ? new Date(trato.fechaEventoEstimada).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "long" })
    : null;
  const msg = `Hola ${nombre}, te contacto de Mainstage Pro para dar seguimiento a ${evento}${fecha ? ` estimado para el ${fecha}` : ""}. ¿Tienes un momento para platicar?`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

// ── WA icon svg ───────────────────────────────────────────────────────────────
function WaIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
    </svg>
  );
}

// ── Sublista de cotizaciones ──────────────────────────────────────────────────
function CotizacionesSublista({ trato }: { trato: Trato }) {
  const cots = trato.cotizaciones;
  return (
    <div className="bg-[#0d0d0d] border-t border-[#1a1a1a] px-4 py-3">
      {cots.length === 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-[#555] text-xs italic">Sin cotizaciones — agrega una para avanzar</p>
          <Link
            href={`/crm/tratos/${trato.id}`}
            className="text-[#B3985B] text-xs hover:underline"
          >
            + Nueva cotización →
          </Link>
        </div>
      ) : (
        <div className="space-y-1.5">
          {cots.map(c => (
            <div key={c.id} className="flex items-center gap-3 group">
              <span className="text-[#555] text-[10px] w-3 text-center">·</span>
              <Link
                href={`/cotizaciones/${c.id}`}
                className="text-xs text-[#9ca3af] hover:text-white transition-colors font-mono shrink-0"
              >
                {c.numeroCotizacion}{c.opcionLetra ? ` (${c.opcionLetra})` : ""}
              </Link>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${COT_COLORS[c.estado] ?? "bg-[#222] text-[#888]"}`}>
                {COT_LABELS[c.estado] ?? c.estado}
              </span>
              <span className="text-xs text-[#B3985B] shrink-0">{formatCurrency(c.granTotal)}</span>
              {c.fechaEvento && (
                <span className="text-[10px] text-[#555] shrink-0">{fmtFecha(c.fechaEvento)}</span>
              )}
              <div className="flex items-center gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Link href={`/cotizaciones/${c.id}`} className="text-[#B3985B] text-[11px] hover:underline">
                  Ver cotización →
                </Link>
                {c.proyecto && (
                  <Link href={`/proyectos/${c.proyecto.id}`} className="text-green-400 text-[11px] hover:underline">
                    Ver proyecto →
                  </Link>
                )}
              </div>
            </div>
          ))}
          <div className="pt-1 border-t border-[#1a1a1a] mt-1">
            <Link href={`/crm/tratos/${trato.id}`} className="text-[#555] text-[11px] hover:text-[#B3985B] transition-colors">
              + Nueva cotización desde el trato →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nueva Oportunidad Modal ───────────────────────────────────────────────────

interface NuevaOportunidadForm {
  clienteId: string;
  clienteQuery: string;
  tipoEvento: string;
  nombreEvento: string;
  fechaEventoEstimada: string;
  presupuestoEstimado: string;
}

const FORM_EMPTY: NuevaOportunidadForm = {
  clienteId: "", clienteQuery: "", tipoEvento: "OTRO",
  nombreEvento: "", fechaEventoEstimada: "", presupuestoEstimado: "",
};

function NuevaOportunidadModal({ onClose, onCreated, onLeadCreated }: {
  onClose: () => void;
  onCreated: (trato: Trato, cotizacionId: string) => void;
  onLeadCreated?: () => void;
}) {
  const [modoModal, setModoModal] = useState<'oportunidad' | 'lead-rapido'>('oportunidad');
  const [form, setForm] = useState<NuevaOportunidadForm>({ ...FORM_EMPTY });
  const [leadRapidoForm, setLeadRapidoForm] = useState({
    nombre: '', telefono: '', origenLead: 'ORGANICO', tipoEvento: '',
    notasIniciales: '', fechaProximaAccion: '',
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const toast = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/clientes", { cache: "no-store" }).then(r => r.json()).then(d => setClientes(d.clientes ?? []));
  }, []);

  const filtrados = form.clienteQuery.length >= 1
    ? clientes.filter(c => (c.nombre + " " + (c.empresa ?? "")).toLowerCase().includes(form.clienteQuery.toLowerCase())).slice(0, 8)
    : [];

  async function submit() {
    if (!form.clienteId) { toast.error("Selecciona un cliente"); return; }
    setSaving(true);
    try {
      const rt = await fetch("/api/tratos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: form.clienteId, tipoEvento: form.tipoEvento,
          nombreEvento: form.nombreEvento || null,
          fechaEventoEstimada: form.fechaEventoEstimada || null,
          presupuestoEstimado: form.presupuestoEstimado ? parseFloat(form.presupuestoEstimado) : null,
          etapa: "OPORTUNIDAD",
        }),
      });
      const dt = await rt.json();
      if (!rt.ok) { toast.error(dt.error ?? "Error al crear trato"); return; }

      const rc = await fetch("/api/cotizaciones", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tratoId: dt.trato.id, clienteId: form.clienteId, tipoEvento: form.tipoEvento,
          nombreEvento: form.nombreEvento || null, fechaEvento: form.fechaEventoEstimada || null,
        }),
      });
      const dc = await rc.json();
      if (!rc.ok) { toast.error(dc.error ?? "Error al crear cotización"); return; }
      onCreated({ ...dt.trato, cotizaciones: [] }, dc.cotizacion.id);
    } finally {
      setSaving(false);
    }
  }

  async function submitLeadRapido() {
    if (!leadRapidoForm.nombre.trim()) { toast.error("El nombre es requerido"); return; }
    setSavingLead(true);
    try {
      const body: Record<string, unknown> = {
        clienteNuevo: { nombre: leadRapidoForm.nombre.trim(), telefono: leadRapidoForm.telefono || null },
        tipoProspecto: 'NURTURING',
        origenLead: leadRapidoForm.origenLead,
        tipoEvento: leadRapidoForm.tipoEvento || 'OTRO',
        nombreEvento: leadRapidoForm.notasIniciales.trim() || 'Lead sin evento definido',
      };
      if (leadRapidoForm.fechaProximaAccion) {
        body.primerSeguimiento = { fecha: leadRapidoForm.fechaProximaAccion, canal: 'whatsapp' };
        body.fechaProximaAccion = leadRapidoForm.fechaProximaAccion;
      }
      const res = await fetch('/api/tratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error('Error al registrar lead'); return; }
      toast.success('Lead registrado ✓');
      onLeadCreated?.();
      onClose();
    } finally {
      setSavingLead(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-base">
              {modoModal === 'lead-rapido' ? 'Lead rápido' : 'Nueva oportunidad'}
            </h2>
            <p className="text-[#555] text-xs mt-0.5">
              {modoModal === 'lead-rapido' ? 'Solo nombre y origen — sin cotización' : 'Crea el trato y la cotización borrador en un paso'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Mode selector tabs */}
        <div className="flex gap-1 bg-[#0d0d0d] rounded-xl p-1 border border-[#1e1e1e]">
          <button
            onClick={() => setModoModal('oportunidad')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              modoModal === 'oportunidad'
                ? 'bg-[#B3985B] text-black'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Nueva oportunidad
          </button>
          <button
            onClick={() => setModoModal('lead-rapido')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              modoModal === 'lead-rapido'
                ? 'bg-[#B3985B] text-black'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            + Lead rápido
          </button>
        </div>

        {modoModal === 'oportunidad' ? (
          <>
            <div className="space-y-4">
              <div className="relative" ref={dropdownRef}>
                <label className="text-xs text-[#6b7280] block mb-1">Cliente *</label>
                <input value={form.clienteQuery}
                  onChange={e => { setForm(p => ({ ...p, clienteQuery: e.target.value, clienteId: "" })); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Buscar cliente..."
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                {form.clienteId && <p className="text-[11px] text-[#B3985B] mt-1">✓ Cliente seleccionado</p>}
                {showDropdown && filtrados.length > 0 && !form.clienteId && (
                  <div className="absolute z-10 mt-1 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg max-h-44 overflow-y-auto shadow-xl">
                    {filtrados.map(c => (
                      <button key={c.id}
                        onClick={() => { setForm(p => ({ ...p, clienteId: c.id, clienteQuery: c.nombre + (c.empresa ? ` · ${c.empresa}` : "") })); setShowDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white transition-colors">
                        {c.nombre}{c.empresa ? <span className="text-gray-500"> · {c.empresa}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Tipo de evento</label>
                  <Combobox value={form.tipoEvento} onChange={v => setForm(p => ({ ...p, tipoEvento: v }))}
                    options={TIPOS_EVENTO.map(t => ({ value: t, label: TIPO_EVENTO_LABELS[t] }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Nombre del evento</label>
                  <input value={form.nombreEvento} onChange={e => setForm(p => ({ ...p, nombreEvento: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Fecha estimada</label>
                  <input type="date" value={form.fechaEventoEstimada} onChange={e => setForm(p => ({ ...p, fechaEventoEstimada: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Presupuesto estimado</label>
                  <input type="number" value={form.presupuestoEstimado} onChange={e => setForm(p => ({ ...p, presupuestoEstimado: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
              <button onClick={submit} disabled={saving || !form.clienteId}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c4aa6b] disabled:opacity-40 transition-colors">
                {saving ? "Creando..." : "Crear oportunidad"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#6b7280] block mb-1">Nombre o empresa *</label>
                <input value={leadRapidoForm.nombre} onChange={e => setLeadRapidoForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. María García"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-[#6b7280] block mb-1">Teléfono / WhatsApp</label>
                <input value={leadRapidoForm.telefono} onChange={e => setLeadRapidoForm(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+52 55 0000 0000"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">¿De dónde llegó? *</label>
                  <select value={leadRapidoForm.origenLead} onChange={e => setLeadRapidoForm(p => ({ ...p, origenLead: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="ORGANICO">Orgánico</option>
                    <option value="META_ADS">Meta Ads</option>
                    <option value="GOOGLE_ADS">Google Ads</option>
                    <option value="REFERIDO">Referido</option>
                    <option value="RECOMPRA">Recompra</option>
                    <option value="PROSPECCION">Prospección</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Tipo de evento</label>
                  <select value={leadRapidoForm.tipoEvento} onChange={e => setLeadRapidoForm(p => ({ ...p, tipoEvento: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">— Sin definir —</option>
                    <option value="SOCIAL">Social</option>
                    <option value="MUSICAL">Musical</option>
                    <option value="EMPRESARIAL">Empresarial</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#6b7280] block mb-1">Lo que busca / contexto</label>
                <textarea value={leadRapidoForm.notasIniciales} onChange={e => setLeadRapidoForm(p => ({ ...p, notasIniciales: e.target.value }))}
                  placeholder="Boda en junio, busca sonido e iluminación..."
                  rows={2} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
              <div>
                <label className="text-xs text-[#6b7280] block mb-1">Próximo seguimiento</label>
                <input type="date" value={leadRapidoForm.fechaProximaAccion} onChange={e => setLeadRapidoForm(p => ({ ...p, fechaProximaAccion: e.target.value }))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
              <button onClick={submitLeadRapido} disabled={savingLead || !leadRapidoForm.nombre.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c4aa6b] disabled:opacity-40 transition-colors">
                {savingLead ? 'Registrando...' : 'Registrar lead'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({ trato, onDelete, deleting }: { trato: Trato; onDelete: () => void; deleting: boolean }) {
  const router = useRouter();
  const wa = waUrl(trato);
  const cots = trato.cotizaciones ?? [];
  const aprobada = cots.find(c => c.estado === "APROBADA");
  const { dias: diasTr, activo } = diasTrato(trato);
  return (
    <div
      onClick={() => router.push(`/crm/tratos/${trato.id}`)}
      className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 space-y-2 cursor-pointer hover:border-[#B3985B]/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-white text-sm font-medium leading-tight flex-1">
          {trato.cliente.nombre}
        </span>
        <BadgeDias inicio={trato.createdAt} fin={trato.fechaCierre} tipo="trato" cerrado={!activo} labelCerrado={trato.etapa === "VENTA_PERDIDA" ? "perdido" : undefined} />
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp seguimiento"
            onClick={e => e.stopPropagation()}
            className="shrink-0 text-green-500 hover:text-green-400 transition-colors">
            <WaIcon />
          </a>
        )}
      </div>
      {trato.cliente.empresa && <p className="text-[#6b7280] text-xs">{trato.cliente.empresa}</p>}
      <p className="text-[#9ca3af] text-xs">{trato.nombreEvento || TIPO_EVENTO_LABELS[trato.tipoEvento] || trato.tipoEvento}</p>
      {(trato.fechaEventoEstimada || trato.presupuestoEstimado) && (
        <div className="flex items-center gap-2 flex-wrap">
          {trato.fechaEventoEstimada && (
            <span className="text-[10px] text-[#555]">{fmtFecha(trato.fechaEventoEstimada)}</span>
          )}
          {trato.presupuestoEstimado && (
            <span className="text-[10px] text-[#B3985B]">{formatCurrency(trato.presupuestoEstimado)}</span>
          )}
        </div>
      )}
      {cots.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#1a1a1a]">
          {cots.map(c => (
            <Link key={c.id} href={`/cotizaciones/${c.id}`}
              onClick={e => e.stopPropagation()}
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium hover:opacity-80 transition-opacity ${COT_COLORS[c.estado] ?? "bg-[#222] text-[#888]"}`}
              title={`${c.numeroCotizacion} · ${formatCurrency(c.granTotal)}`}>
              {c.numeroCotizacion}{c.opcionLetra ? ` ${c.opcionLetra}` : ""}
            </Link>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-[#1a1a1a]">
        {aprobada?.proyecto ? (
          <Link href={`/proyectos/${aprobada.proyecto.id}`} onClick={e => e.stopPropagation()} className="text-green-400 text-[11px] hover:underline">
            Ver proyecto →
          </Link>
        ) : (
          <span className="text-[#B3985B] text-[11px]">Ver →</span>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(); }} disabled={deleting}
          className="text-[#333] hover:text-red-400 text-[11px] transition-colors disabled:opacity-40">
          {deleting ? "..." : "Eliminar"}
        </button>
      </div>
    </div>
  );
}

// ── Tabla de tratos (lista) ───────────────────────────────────────────────────

interface TratoTableProps {
  tratos: Trato[];
  showHace: boolean;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  deletingId: string | null;
  eliminar: (id: string, nombre: string) => void;
  dimmed?: boolean;
}

function TratoTable({ tratos, showHace, expandedIds, toggleExpand, deletingId, eliminar, dimmed = false }: TratoTableProps) {
  const router = useRouter();
  return (
    <div className="rounded-xl border border-[#1a1a1a] overflow-hidden">
      <div className="divide-y divide-[#111]">
        {tratos.map(t => {
          const wa = waUrl(t);
          const expanded = expandedIds.has(t.id);
          const cots = t.cotizaciones ?? [];
          const aprobada = cots.find(c => c.estado === "APROBADA");
          const { dias: diasTr, activo } = diasTrato(t);

          const fechaLabel = t.fechaEventoEstimada
            ? showHace
              ? (() => {
                  const eventMs = new Date(t.fechaEventoEstimada.slice(0, 10) + "T00:00:00Z").getTime();
                  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
                  const diff = Math.floor((todayMs - eventMs) / 86400000);
                  return diff === 0 ? "Hoy" : diff === 1 ? "Ayer" : `Hace ${diff}d`;
                })()
              : fmtFecha(t.fechaEventoEstimada)
            : null;

          const presupuesto = t.presupuestoEstimado
            ?? (() => {
                const ap = cots.find(c => c.estado === "APROBADA");
                const en = cots.find(c => c.estado === "ENVIADA" || c.estado === "REENVIADA");
                const ref = ap ?? en ?? (cots.length > 0 ? cots[cots.length - 1] : null);
                return ref ? ref.granTotal : null;
              })();

          return (
            <div key={t.id} className={dimmed ? "opacity-50" : ""}>
              <div
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#0a0a0a] group cursor-pointer"
                onClick={() => router.push(`/crm/tratos/${t.id}`)}>

                <button
                  onClick={e => { e.stopPropagation(); toggleExpand(t.id); }}
                  className="shrink-0 text-[#2e2e2e] hover:text-gray-500 transition-colors">
                  <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium leading-snug">{t.cliente.nombre}</span>
                    {t.cliente.empresa && (
                      <span className="text-gray-600 text-xs truncate max-w-[160px]">{t.cliente.empresa}</span>
                    )}
                    <span className={`text-[10px] font-medium uppercase tracking-wide ${ETAPA_TEXT[t.etapa] ?? "text-gray-700"}`}>
                      {ETAPA_LABELS[t.etapa] ?? t.etapa}
                    </span>
                  </div>
                  <p className="text-gray-600 text-[11px] mt-0.5 truncate">
                    {t.nombreEvento || TIPO_EVENTO_LABELS[t.tipoEvento] || t.tipoEvento}
                    {t.lugarEstimado && <span className="text-gray-700"> · {t.lugarEstimado}</span>}
                    {cots.length > 0 && <span className="text-gray-700"> · {cots.length} cot.</span>}
                  </p>
                </div>

                <div className="shrink-0 hidden sm:block">
                  <BadgeDias inicio={t.createdAt} fin={t.fechaCierre} tipo="trato" cerrado={!activo} labelCerrado={t.etapa === "VENTA_PERDIDA" ? "perdido" : undefined} />
                </div>

                <div className="shrink-0 text-right min-w-[76px] hidden sm:block">
                  {presupuesto ? (
                    <span className={`text-xs ${t.presupuestoEstimado ? "text-[#B3985B]" : "text-gray-600"}`}>{formatCurrency(presupuesto)}</span>
                  ) : (
                    <span className="text-[#222] text-xs">—</span>
                  )}
                </div>

                <div className="shrink-0 text-right min-w-[64px] hidden sm:block">
                  {fechaLabel ? (
                    <span className="text-xs text-gray-500">{fechaLabel}</span>
                  ) : (
                    <span className="text-[#222] text-xs">—</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {aprobada?.proyecto && (
                    <Link href={`/proyectos/${aprobada.proyecto.id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-emerald-600 hover:text-emerald-400 text-[11px] transition-colors whitespace-nowrap">
                      Proyecto →
                    </Link>
                  )}
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-green-700 hover:text-green-400 transition-colors">
                      <WaIcon />
                    </a>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); eliminar(t.id, t.cliente.nombre); }}
                    disabled={deletingId === t.id}
                    className="text-[#252525] hover:text-red-500/60 transition-colors disabled:opacity-40">
                    {deletingId === t.id ? (
                      <span className="text-[10px] text-gray-600">...</span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {expanded && <CotizacionesSublista trato={t} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ORIGEN_COLORS: Record<string, string> = {
  META_ADS: 'bg-blue-900/40 text-blue-400 border-blue-700/30',
  GOOGLE_ADS: 'bg-sky-900/40 text-sky-400 border-sky-700/30',
  ORGANICO: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/30',
  REFERIDO: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/30',
  PROSPECCION: 'bg-violet-900/40 text-violet-400 border-violet-700/30',
  RECOMPRA: 'bg-amber-900/40 text-amber-400 border-amber-700/30',
  OTRO: 'bg-gray-800 text-gray-400 border-gray-700/30',
};

const TEMP_COLORS: Record<string, string> = {
  FRIO: 'bg-blue-900/30 text-blue-400',
  TIBIO: 'bg-orange-900/30 text-orange-400',
  CALIENTE: 'bg-red-900/30 text-red-400',
};

interface LeadsViewProps {
  leads: Trato[];
  activeSeguimientoPopover: string | null;
  seguimientoPendiente: { id: string; titulo: string; nota: string | null; numero: number | null } | null;
  seguimientoForm: { notaResultado: string; proximaFecha: string; opcion: '' | '+1' | '+3' | '+7' | 'otra' | 'ninguna' };
  setSeguimientoForm: React.Dispatch<React.SetStateAction<{ notaResultado: string; proximaFecha: string; opcion: '' | '+1' | '+3' | '+7' | 'otra' | 'ninguna' }>>;
  completandoSeguimiento: boolean;
  onAbrirPopover: (tratoId: string) => void;
  onCompletar: (trato: Trato) => void;
  setActiveSeguimientoPopover: React.Dispatch<React.SetStateAction<string | null>>;
  onConvertirOportunidad: (trato: Trato) => void;
}

function LeadsView({ leads, activeSeguimientoPopover, seguimientoPendiente, seguimientoForm, setSeguimientoForm, completandoSeguimiento, onAbrirPopover, onCompletar, setActiveSeguimientoPopover, onConvertirOportunidad }: LeadsViewProps) {
  const hoyStr = new Date().toISOString().split('T')[0];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1 py-2">
      {leads.length === 0 ? (
        <div className="col-span-3 text-center py-16 text-gray-600 text-sm">No hay leads registrados.</div>
      ) : (
        leads.map(t => {
          const nurturing = (() => { try { return JSON.parse(t.nurturingData ?? '{}'); } catch { return {}; } })();
          const temperatura = nurturing.temperatura ?? null;
          const proxVencida = t.fechaProximaAccion && t.fechaProximaAccion < hoyStr;
          const proxHoy = t.fechaProximaAccion && t.fechaProximaAccion === hoyStr;
          const diasRegistrado = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 86400000);
          return (
            <div key={t.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] transition-all">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-white font-medium text-sm">{t.cliente.nombre}</p>
                  {t.cliente.empresa && <p className="text-gray-500 text-xs">{t.cliente.empresa}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ORIGEN_COLORS[t.origenLead] ?? ORIGEN_COLORS.OTRO}`}>
                    {ORIGEN_LEAD_LABELS[t.origenLead] ?? t.origenLead}
                  </span>
                  {temperatura && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TEMP_COLORS[temperatura] ?? ''}`}>
                      {temperatura}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  {t.fechaProximaAccion ? (
                    <span className={`text-[10px] flex items-center gap-1 ${
                      proxVencida ? 'text-red-400' : proxHoy ? 'text-yellow-400' : 'text-emerald-400'
                    }`}>
                      <span>{proxVencida ? '⚠' : proxHoy ? '📅' : '✓'}</span>
                      <span>{new Date(t.fechaProximaAccion + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-600">Sin seguimiento</span>
                  )}
                  <span className="text-[10px] text-gray-600">{diasRegistrado}d</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onAbrirPopover(t.id)}
                    className="text-xs px-3 py-1 rounded-lg border border-[#2a2a2a] hover:border-[#B3985B]/40 text-gray-400 hover:text-[#B3985B] transition-all"
                  >
                    Seguimiento ✓
                  </button>
                  <button
                    onClick={() => onConvertirOportunidad(t)}
                    className="text-xs px-3 py-1 rounded-lg border border-[#B3985B]/20 hover:border-[#B3985B]/50 text-[#B3985B]/60 hover:text-[#B3985B] transition-all"
                    title="Convertir a oportunidad activa"
                  >
                    → Oportunidad
                  </button>
                </div>
              </div>

              {activeSeguimientoPopover === t.id && (
                <div className="mt-3 pt-3 border-t border-[#1e1e1e]">
                  {seguimientoPendiente ? (
                    <>
                      <p className="text-xs text-gray-400 mb-1 font-medium">{seguimientoPendiente.titulo}</p>
                      {seguimientoPendiente.nota && <p className="text-[10px] text-gray-600 mb-2">{seguimientoPendiente.nota}</p>}
                      <textarea
                        value={seguimientoForm.notaResultado}
                        onChange={e => setSeguimientoForm(p => ({ ...p, notaResultado: e.target.value }))}
                        placeholder="¿Qué pasó? (opcional)"
                        rows={2}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B] mb-2 resize-none"
                      />
                      <p className="text-[10px] text-gray-600 mb-1">Próximo seguimiento:</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(['+1', '+3', '+7', 'otra', 'ninguna'] as const).map(op => (
                          <button
                            key={op}
                            onClick={() => setSeguimientoForm(p => ({ ...p, opcion: p.opcion === op ? '' : op }))}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                              seguimientoForm.opcion === op
                                ? 'bg-[#B3985B]/20 text-[#B3985B] border-[#B3985B]/40'
                                : 'text-gray-500 border-[#2a2a2a] hover:border-[#B3985B]/30'
                            }`}
                          >
                            {op === '+1' ? '+1 día' : op === '+3' ? '+3 días' : op === '+7' ? '+1 semana' : op === 'otra' ? 'Otra fecha' : 'Sin seguimiento'}
                          </button>
                        ))}
                      </div>
                      {seguimientoForm.opcion === 'otra' && (
                        <input
                          type="date"
                          value={seguimientoForm.proximaFecha}
                          onChange={e => setSeguimientoForm(p => ({ ...p, proximaFecha: e.target.value }))}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B] mb-2"
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onCompletar(t)}
                          disabled={completandoSeguimiento}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-[#B3985B] text-black text-xs font-semibold disabled:opacity-40"
                        >
                          {completandoSeguimiento ? 'Guardando...' : 'Confirmar'}
                        </button>
                        <button
                          onClick={() => setActiveSeguimientoPopover(null)}
                          className="px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-500 text-xs hover:text-white"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-xs text-gray-500">No hay seguimiento pendiente.</p>
                      <p className="text-[10px] text-gray-600 mt-1">Usa el botón de Nueva oportunidad para programar uno.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default function TratosPage() {
  const router = useRouter();
  const [tratos, setTratos] = useState<Trato[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filtroEtapa, setFiltroEtapa] = useState<string | null>(null);
  const [filtroFrio, setFiltroFrio] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<"lista" | "kanban">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("tratos-vista") as "lista" | "kanban") ?? "lista";
    }
    return "lista";
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [orden, setOrden] = useState<"evento_asc" | "evento_desc" | "creacion_desc" | "creacion_asc">("evento_asc");
  const [agrupacion, setAgrupacion] = useState<"todos" | "mes" | "semana">("mes");
  const [gruposOpen, setGruposOpen] = useState<Record<string, boolean>>({});
  const [showNueva, setShowNueva] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  // Lead quick capture
  const [showLeadSheet, setShowLeadSheet] = useState(false);
  const [leadForm, setLeadForm] = useState({
    nombre: '', telefono: '', origenLead: 'ORGANICO', tipoEvento: '',
    notasIniciales: '', fechaProximaAccion: '',
  });
  const [guardandoLead, setGuardandoLead] = useState(false);
  const [leadCreado, setLeadCreado] = useState<{ id: string; nombre: string } | null>(null);
  const [showSeguimientoInline, setShowSeguimientoInline] = useState(false);
  const [seguimientoInlineForm, setSeguimientoInlineForm] = useState({ fecha: '', nota: '' });
  const [guardandoSeguimiento, setGuardandoSeguimiento] = useState(false);

  // Lead view & completion popover
  const [activeSeguimientoPopover, setActiveSeguimientoPopover] = useState<string | null>(null);
  const [seguimientoPendiente, setSeguimientoPendiente] = useState<{
    id: string; titulo: string; nota: string | null; numero: number | null;
  } | null>(null);
  const [seguimientoForm, setSeguimientoForm] = useState({
    notaResultado: '', proximaFecha: '', opcion: '' as '' | '+1' | '+3' | '+7' | 'otra' | 'ninguna',
  });
  const [completandoSeguimiento, setCompletandoSeguimiento] = useState(false);

  function toggleVista(v: "lista" | "kanban") {
    setVista(v);
    localStorage.setItem("tratos-vista", v);
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    fetch("/api/tratos").then(r => r.json()).then(data => {
      const list: Trato[] = data.tratos ?? [];
      setTratos(list);
    }).finally(() => setLoading(false));
  }, []);

  async function eliminar(id: string, nombre: string) {
    const ok = await confirm({ message: `¿Eliminar el trato de "${nombre}"? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tratos/${id}`, { method: "DELETE" });
      if (res.ok) { setTratos(prev => prev.filter(t => t.id !== id)); toast.success("Trato eliminado"); }
      else { const d = await res.json(); toast.error(d.error ?? "Error al eliminar"); }
    } finally { setDeletingId(null); }
  }

  async function crearLead() {
    if (!leadForm.nombre.trim() || !leadForm.origenLead) return;
    setGuardandoLead(true);
    try {
      const body: Record<string, unknown> = {
        clienteNuevo: { nombre: leadForm.nombre.trim(), telefono: leadForm.telefono || null },
        tipoProspecto: 'NURTURING',
        origenLead: leadForm.origenLead,
        tipoEvento: leadForm.tipoEvento || 'OTRO',
        nombreEvento: leadForm.notasIniciales.trim() || 'Lead sin evento definido',
      };
      if (leadForm.fechaProximaAccion) {
        body.primerSeguimiento = { fecha: leadForm.fechaProximaAccion, canal: 'whatsapp' };
        body.fechaProximaAccion = leadForm.fechaProximaAccion;
      }
      const res = await fetch('/api/tratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error('Error al crear lead'); return; }
      const { trato } = await res.json();
      const refreshed = await fetch('/api/tratos').then(r => r.json());
      setTratos(refreshed.tratos ?? []);
      setLeadCreado({ id: trato.id, nombre: leadForm.nombre.trim() });
      toast.success('Lead registrado ✓');
      setLeadForm({ nombre: '', telefono: '', origenLead: 'ORGANICO', tipoEvento: '', notasIniciales: '', fechaProximaAccion: '' });
    } finally {
      setGuardandoLead(false);
    }
  }

  async function agregarSeguimientoInline() {
    if (!leadCreado || !seguimientoInlineForm.fecha) return;
    setGuardandoSeguimiento(true);
    try {
      await fetch('/api/seguimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tratoId: leadCreado.id,
          tipo: 'manual',
          canal: 'whatsapp',
          titulo: 'Seguimiento programado',
          fechaProgramada: seguimientoInlineForm.fecha,
          nota: seguimientoInlineForm.nota || null,
        }),
      });
      toast.success('Seguimiento creado ✓');
      setShowLeadSheet(false);
      setLeadCreado(null);
      setShowSeguimientoInline(false);
    } finally {
      setGuardandoSeguimiento(false);
    }
  }

  async function abrirCompletarSeguimiento(tratoId: string) {
    setActiveSeguimientoPopover(prev => prev === tratoId ? null : tratoId);
    setSeguimientoPendiente(null);
    setSeguimientoForm({ notaResultado: '', proximaFecha: '', opcion: '' });
    const res = await fetch(`/api/seguimientos?tratoId=${tratoId}`);
    if (!res.ok) return;
    const data = await res.json();
    const pendiente = (data.seguimientos ?? []).find((s: { completado: boolean }) => !s.completado);
    setSeguimientoPendiente(pendiente ?? null);
  }

  async function completarSeguimiento(trato: Trato) {
    if (!seguimientoPendiente) return;
    setCompletandoSeguimiento(true);
    try {
      await fetch(`/api/seguimientos/${seguimientoPendiente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completado: true, notaResultado: seguimientoForm.notaResultado || null }),
      });

      let nuevaFecha: string | null = null;
      const hoyDate = new Date();
      if (seguimientoForm.opcion === '+1') {
        const d = new Date(hoyDate); d.setDate(d.getDate() + 1);
        nuevaFecha = d.toISOString().split('T')[0];
      } else if (seguimientoForm.opcion === '+3') {
        const d = new Date(hoyDate); d.setDate(d.getDate() + 3);
        nuevaFecha = d.toISOString().split('T')[0];
      } else if (seguimientoForm.opcion === '+7') {
        const d = new Date(hoyDate); d.setDate(d.getDate() + 7);
        nuevaFecha = d.toISOString().split('T')[0];
      } else if (seguimientoForm.opcion === 'otra') {
        nuevaFecha = seguimientoForm.proximaFecha || null;
      }

      if (nuevaFecha) {
        const nextNum = (seguimientoPendiente.numero ?? 0) + 1;
        await fetch('/api/seguimientos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tratoId: trato.id,
            tipo: 'auto',
            canal: 'whatsapp',
            titulo: `Seguimiento #${nextNum}`,
            numero: nextNum,
            fechaProgramada: nuevaFecha,
          }),
        });
      }

      await fetch(`/api/tratos/${trato.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaProximaAccion: nuevaFecha }),
      });

      setTratos(prev => prev.map(t =>
        t.id === trato.id
          ? { ...t, fechaProximaAccion: nuevaFecha }
          : t
      ));

      toast.success('Seguimiento completado ✓');
      setActiveSeguimientoPopover(null);
      setSeguimientoPendiente(null);
    } finally {
      setCompletandoSeguimiento(false);
    }
  }

  function handleCreated(trato: Trato, cotizacionId: string) {
    setTratos(prev => [trato, ...prev]);
    setShowNueva(false);
    toast.success("Oportunidad creada — cotización borrador lista");
    router.push(`/cotizaciones/${cotizacionId}`);
  }

  const hoy = new Date().toISOString().split("T")[0];

  const tratosFiltrados = tratos.filter(t => {
    const matchEtapa = !filtroEtapa || t.etapa === filtroEtapa;
    const matchFrio = !filtroFrio || t.tipoProspecto === "NURTURING";
    const q = busqueda.toLowerCase();
    const matchBusqueda = !q ||
      t.cliente.nombre.toLowerCase().includes(q) ||
      (t.cliente.empresa ?? "").toLowerCase().includes(q) ||
      (t.nombreEvento ?? "").toLowerCase().includes(q) ||
      (t.lugarEstimado ?? "").toLowerCase().includes(q);
    return matchEtapa && matchFrio && matchBusqueda;
  }).sort((a: Trato, b: Trato) => {
    if (orden === "evento_asc")   return new Date(a.fechaEventoEstimada ?? "9999").getTime() - new Date(b.fechaEventoEstimada ?? "9999").getTime();
    if (orden === "evento_desc")  return new Date(b.fechaEventoEstimada ?? "0").getTime() - new Date(a.fechaEventoEstimada ?? "0").getTime();
    if (orden === "creacion_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Tratos próximos: sin fecha o fecha >= hoy. Archivados: fecha pasada.
  const tratosProximos  = tratosFiltrados.filter(t => !t.fechaEventoEstimada || t.fechaEventoEstimada >= hoy);
  const tratosArchivados = tratosFiltrados.filter(t => !!t.fechaEventoEstimada && t.fechaEventoEstimada < hoy)
    .sort((a, b) => new Date(b.fechaEventoEstimada!).getTime() - new Date(a.fechaEventoEstimada!).getTime());

  // Agrupación por mes o semana
  const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  function grupoMes(fecha: string) {
    const [y, m] = fecha.slice(0,7).split("-");
    return { key: fecha.slice(0,7), label: `${MESES_ES[parseInt(m)-1]} ${y}` };
  }

  function grupoSemana(fecha: string) {
    const d = new Date(fecha + "T12:00:00");
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const lunes = new Date(d); lunes.setDate(d.getDate() - dow);
    const dom   = new Date(lunes); dom.setDate(lunes.getDate() + 6);
    const key = lunes.toISOString().slice(0,10);
    const fmt = (x: Date) => x.toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short" });
    return { key, label: `${fmt(lunes)} – ${fmt(dom)}` };
  }

  type Grupo = { key: string; label: string; tratos: Trato[] };

  function agrupar(list: Trato[]): Grupo[] {
    if (agrupacion === "todos") return [{ key: "todos", label: "", tratos: list }];
    const map = new Map<string, Grupo>();
    const sinFecha: Trato[] = [];
    for (const t of list) {
      if (!t.fechaEventoEstimada) { sinFecha.push(t); continue; }
      const g = agrupacion === "mes" ? grupoMes(t.fechaEventoEstimada) : grupoSemana(t.fechaEventoEstimada);
      if (!map.has(g.key)) map.set(g.key, { ...g, tratos: [] });
      map.get(g.key)!.tratos.push(t);
    }
    const ETAPA_ORDEN: Record<string, number> = { VENTA_CERRADA: 0, OPORTUNIDAD: 1, DESCUBRIMIENTO: 2, VENTA_PERDIDA: 3 };
    const sorted = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    for (const g of sorted) {
      g.tratos.sort((a, b) => (ETAPA_ORDEN[a.etapa] ?? 9) - (ETAPA_ORDEN[b.etapa] ?? 9));
    }
    if (sinFecha.length) sorted.push({ key: "sin-fecha", label: "Sin fecha definida", tratos: sinFecha });
    return sorted;
  }

  const gruposProximos = agrupar(tratosProximos);

  const leads = tratos.filter(t =>
    t.tipoProspecto === 'NURTURING' ||
    (t.etapa === 'DESCUBRIMIENTO' && t.tipoProspecto === 'ACTIVO')
  ).sort((a, b) => {
    const hoyStr = new Date().toISOString().split('T')[0];
    const aVencido = a.fechaProximaAccion && a.fechaProximaAccion < hoyStr;
    const bVencido = b.fechaProximaAccion && b.fechaProximaAccion < hoyStr;
    if (aVencido && !bVencido) return -1;
    if (!aVencido && bVencido) return 1;
    if (!a.fechaProximaAccion && b.fechaProximaAccion) return 1;
    if (a.fechaProximaAccion && !b.fechaProximaAccion) return -1;
    if (a.fechaProximaAccion && b.fechaProximaAccion) {
      return a.fechaProximaAccion.localeCompare(b.fechaProximaAccion);
    }
    return 0;
  });

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Tratos</h1>
          <p className="text-[#6b7280] text-sm">
            {loading ? "Cargando..." : `${tratosProximos.length} próximos${tratosArchivados.length > 0 ? ` · ${tratosArchivados.length} archivados` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5">
            <button onClick={() => toggleVista("lista")}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${vista === "lista" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}
              title="Vista lista">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => toggleVista("kanban")}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${vista === "kanban" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}
              title="Vista kanban">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/>
              </svg>
            </button>
          </div>
          <button onClick={() => setShowNueva(true)}
            className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nueva oportunidad
          </button>
          <button
            onClick={() => { setShowLeadSheet(true); setLeadCreado(null); setShowSeguimientoInline(false); }}
            className="border border-[#2a2a2a] hover:border-violet-500/40 text-gray-400 hover:text-violet-400 text-sm px-3 py-2 rounded-lg transition-all"
          >
            + Lead rápido
          </button>
          <Link href="/crm/tratos/nuevo"
            className="border border-[#2a2a2a] text-[#6b7280] hover:text-white text-sm px-3 py-2 rounded-lg transition-colors"
            title="Trato detallado">
            Detallado
          </Link>
        </div>
      </div>

      {/* ── Búsqueda ── */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
        </svg>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, empresa, evento..."
          className="w-full bg-[#111] border border-[#1e1e1e] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50" />
        {busqueda && (
          <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white text-xs">✕</button>
        )}
      </div>

      {/* ── Vista Lista ── */}
      {vista === "lista" && (
        <div className="space-y-4">

          {/* ── Barra de filtros horizontal ── */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Etapas como pills */}
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              <button
                onClick={() => setFiltroEtapa(filtroEtapa === 'LEADS' ? null : 'LEADS')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                  filtroEtapa === 'LEADS'
                    ? 'bg-violet-500/15 text-violet-400 border-violet-500/40'
                    : 'bg-transparent text-gray-500 border-[#2a2a2a] hover:border-violet-500/30 hover:text-violet-400'
                }`}
              >
                Leads
              </button>
              {([{ key: null, label: "Todos" }, ...ETAPAS.map(e => ({ key: e, label: ETAPA_LABELS[e] }))] as { key: string | null; label: string }[]).map(({ key, label }) => {
                const total = tratos.filter(t => !key || t.etapa === key);
                const n = total.filter(t => !t.fechaEventoEstimada || t.fechaEventoEstimada >= hoy).length;
                const archN = total.filter(t => !!t.fechaEventoEstimada && t.fechaEventoEstimada < hoy).length;
                const activo = filtroEtapa === key;
                const accentCls = key === null ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10"
                  : key === "DESCUBRIMIENTO" ? "border-blue-700/60 text-blue-300 bg-blue-950/30"
                  : key === "OPORTUNIDAD"    ? "border-yellow-600/60 text-yellow-300 bg-yellow-950/30"
                  : key === "VENTA_CERRADA"  ? "border-green-700/60 text-green-300 bg-green-950/30"
                  :                            "border-red-700/60 text-red-300 bg-red-950/30";
                return (
                  <button key={String(key)} onClick={() => { setFiltroEtapa(key); setFiltroFrio(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${activo ? accentCls : "border-[#222] text-gray-500 hover:text-white hover:border-[#333]"}`}>
                    {label}
                    <span className={`text-[10px] font-bold ${activo ? "" : "text-gray-600"}`}>{n}</span>
                    {archN > 0 && <span className="text-[9px] text-amber-500">+{archN}</span>}
                  </button>
                );
              })}
            </div>

            {/* Filtro en frío */}
            <button
              onClick={() => { setFiltroFrio(prev => !prev); setFiltroEtapa(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors shrink-0 ${filtroFrio ? "border-blue-700/60 text-blue-300 bg-blue-950/30" : "border-[#222] text-gray-500 hover:text-white hover:border-[#333]"}`}
            >
              ❄️ En frío
              <span className={`text-[10px] font-bold ${filtroFrio ? "" : "text-gray-600"}`}>
                {tratos.filter(t => t.tipoProspecto === "NURTURING").length}
              </span>
            </button>

            {/* Agrupación */}
            <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5 shrink-0">
              {(["todos","mes","semana"] as const).map(ag => (
                <button key={ag} onClick={() => setAgrupacion(ag)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${agrupacion === ag ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
                  {ag === "todos" ? "Todo" : ag === "mes" ? "Por mes" : "Por semana"}
                </button>
              ))}
            </div>

            {/* Orden */}
            <select value={orden} onChange={e => setOrden(e.target.value as typeof orden)}
              className="bg-[#111] border border-[#1e1e1e] text-[#555] text-[10px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]/50 shrink-0">
              <option value="evento_asc">Fecha ↑</option>
              <option value="evento_desc">Fecha ↓</option>
              <option value="creacion_desc">Más recientes</option>
              <option value="creacion_asc">Más antiguos</option>
            </select>
          </div>

          {/* ── Contenido ── */}
          {filtroEtapa === 'LEADS' ? (
            loading ? (
              <SkeletonPage rows={5} cols={5} />
            ) : (
              <LeadsView
                leads={leads}
                activeSeguimientoPopover={activeSeguimientoPopover}
                seguimientoPendiente={seguimientoPendiente}
                seguimientoForm={seguimientoForm}
                setSeguimientoForm={setSeguimientoForm}
                completandoSeguimiento={completandoSeguimiento}
                onAbrirPopover={abrirCompletarSeguimiento}
                onCompletar={completarSeguimiento}
                setActiveSeguimientoPopover={setActiveSeguimientoPopover}
                onConvertirOportunidad={async (t) => {
                  const ok = await confirm({ message: `¿Convertir "${t.cliente.nombre}" a oportunidad activa?`, confirmText: 'Convertir' });
                  if (!ok) return;
                  const res = await fetch(`/api/tratos/${t.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tipoProspecto: 'ACTIVO', etapa: 'OPORTUNIDAD' }),
                  });
                  if (res.ok) {
                    toast.success('Convertido a oportunidad ✓');
                    setTratos(prev => prev.filter(tr => tr.id !== t.id));
                  } else {
                    toast.error('Error al convertir');
                  }
                }}
              />
            )
          ) : loading ? (
            <SkeletonPage rows={5} cols={5} />
          ) : tratos.length === 0 ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-16">
              <p className="text-[#6b7280] text-sm">No hay tratos registrados</p>
              <button onClick={() => setShowNueva(true)} className="inline-block mt-4 text-[#B3985B] text-sm hover:underline">
                Crear primera oportunidad →
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Próximos agrupados */}
              {tratosProximos.length === 0 && tratosArchivados.length === 0 ? (
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-10 text-center text-[#555] text-sm">
                  Sin tratos en esta etapa
                </div>
              ) : agrupacion === "todos" ? (
                <>
                  {tratosProximos.length > 0 && (
                    <TratoTable tratos={tratosProximos} showHace={false} expandedIds={expandedIds} toggleExpand={toggleExpand} deletingId={deletingId} eliminar={eliminar} />
                  )}
                </>
              ) : (
                <div className="space-y-5">
                  {gruposProximos.map(grupo => {
                    const isOpen = gruposOpen[grupo.key] ?? true;
                    return (
                      <div key={grupo.key}>
                        <button onClick={() => setGruposOpen(o => ({ ...o, [grupo.key]: !isOpen }))} className="flex items-center gap-3 mb-2 w-full text-left">
                          <svg className={`w-3 h-3 text-gray-600 transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          <h2 className="text-xs font-semibold text-gray-300">{grupo.label}</h2>
                          <span className="text-[10px] text-gray-600">{grupo.tratos.length}</span>
                          <div className="flex-1 h-px bg-[#1a1a1a]" />
                        </button>
                        {isOpen && <TratoTable tratos={grupo.tratos} showHace={false} expandedIds={expandedIds} toggleExpand={toggleExpand} deletingId={deletingId} eliminar={eliminar} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pasados — sin drama */}
              {tratosArchivados.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 py-3">
                    <div className="flex-1 h-px bg-[#161616]" />
                    <span className="text-[10px] text-gray-700 uppercase tracking-widest">Pasados · {tratosArchivados.length}</span>
                    <div className="flex-1 h-px bg-[#161616]" />
                  </div>
                  <TratoTable tratos={tratosArchivados} showHace dimmed expandedIds={expandedIds} toggleExpand={toggleExpand} deletingId={deletingId} eliminar={eliminar} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Vista Kanban ── */}
      {vista === "kanban" && (
        <div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {ETAPAS.map(e => <div key={e} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 h-64 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ETAPAS.map(etapa => {
                const col = tratosFiltrados.filter(t => t.etapa === etapa);
                const total = col.reduce((s: number, t: Trato) => s + (t.presupuestoEstimado ?? 0), 0);
                return (
                  <div key={etapa} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ETAPA_COLORS[etapa]}`}>
                          {ETAPA_LABELS[etapa]}
                        </span>
                        <span className="text-[#444] text-xs">{col.length}</span>
                      </div>
                      {total > 0 && <span className="text-[10px] text-[#B3985B]">{formatCurrency(total)}</span>}
                    </div>
                    <div className="space-y-2 min-h-[120px]">
                      {col.length === 0 ? (
                        <div className="border border-dashed border-[#1e1e1e] rounded-xl py-8 text-center">
                          <p className="text-[#333] text-xs">Sin tratos</p>
                        </div>
                      ) : col.map((trato: Trato) => (
                        <KanbanCard key={trato.id} trato={trato}
                          onDelete={() => eliminar(trato.id, trato.cliente.nombre)}
                          deleting={deletingId === trato.id} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showNueva && (
        <NuevaOportunidadModal
          onClose={() => setShowNueva(false)}
          onCreated={handleCreated}
          onLeadCreated={async () => {
            const refreshed = await fetch('/api/tratos').then(r => r.json());
            setTratos(refreshed.tratos ?? []);
          }}
        />
      )}

      {/* Sheet: Registro rápido de lead */}
      <Sheet open={showLeadSheet} onOpenChange={(open: boolean) => { setShowLeadSheet(open); if (!open) { setLeadCreado(null); setShowSeguimientoInline(false); }}}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-[#0d0d0d] border-l border-[#1e1e1e]">
          <SheetHeader>
            <SheetTitle className="text-white">Registrar lead</SheetTitle>
            <p className="text-gray-500 text-xs">Se guardará en el CRM automáticamente</p>
          </SheetHeader>

          {!leadCreado ? (
            <div className="mt-6 space-y-4 px-4 pb-6">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nombre o empresa *</label>
                <input value={leadForm.nombre} onChange={e => setLeadForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. María García" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Teléfono / WhatsApp</label>
                <input value={leadForm.telefono} onChange={e => setLeadForm(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+52 55 0000 0000" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">¿De dónde llegó? *</label>
                <select value={leadForm.origenLead} onChange={e => setLeadForm(p => ({ ...p, origenLead: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                  <option value="ORGANICO">Orgánico</option>
                  <option value="META_ADS">Meta Ads (Facebook/Instagram)</option>
                  <option value="GOOGLE_ADS">Google Ads</option>
                  <option value="REFERIDO">Referido</option>
                  <option value="RECOMPRA">Recompra / cliente anterior</option>
                  <option value="PROSPECCION">Prospección</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tipo de evento</label>
                <select value={leadForm.tipoEvento} onChange={e => setLeadForm(p => ({ ...p, tipoEvento: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                  <option value="">— Sin definir —</option>
                  <option value="SOCIAL">Social</option>
                  <option value="MUSICAL">Musical</option>
                  <option value="EMPRESARIAL">Empresarial</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Lo que busca / contexto</label>
                <textarea value={leadForm.notasIniciales} onChange={e => setLeadForm(p => ({ ...p, notasIniciales: e.target.value }))}
                  placeholder="Boda en junio, busca sonido e iluminación..."
                  rows={2} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Próximo seguimiento</label>
                <input type="date" value={leadForm.fechaProximaAccion}
                  onChange={e => setLeadForm(p => ({ ...p, fechaProximaAccion: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <button onClick={crearLead} disabled={guardandoLead || !leadForm.nombre.trim()}
                className="w-full px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40 mt-2">
                {guardandoLead ? 'Registrando...' : 'Registrar lead'}
              </button>
            </div>
          ) : (
            <div className="mt-6 px-4 pb-6">
              <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4 mb-4">
                <p className="text-emerald-400 font-medium text-sm">✓ Lead registrado</p>
                <p className="text-gray-400 text-xs mt-0.5">{leadCreado.nombre} se guardó en el CRM</p>
              </div>
              {!showSeguimientoInline ? (
                <div>
                  <p className="text-gray-300 text-sm mb-3">¿Agregar seguimiento ahora?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowSeguimientoInline(true)}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold">Sí, agregar</button>
                    <button onClick={() => setShowLeadSheet(false)}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#2a2a2a] text-gray-400 text-sm hover:text-white">No, cerrar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Fecha del seguimiento *</label>
                    <input type="date" value={seguimientoInlineForm.fecha}
                      onChange={e => setSeguimientoInlineForm(p => ({ ...p, fecha: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Nota</label>
                    <textarea value={seguimientoInlineForm.nota}
                      onChange={e => setSeguimientoInlineForm(p => ({ ...p, nota: e.target.value }))}
                      placeholder="Llamar para confirmar disponibilidad..."
                      rows={2} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                  </div>
                  <button onClick={agregarSeguimientoInline} disabled={guardandoSeguimiento || !seguimientoInlineForm.fecha}
                    className="w-full px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40">
                    {guardandoSeguimiento ? 'Guardando...' : 'Guardar seguimiento'}
                  </button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
