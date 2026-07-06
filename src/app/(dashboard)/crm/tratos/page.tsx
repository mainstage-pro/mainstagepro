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
import { NuevoTratoDropdown } from "@/components/NuevoTratoDropdown";
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
  proyecto: { id: string; numeroProyecto: string; nombre: string; estado: string } | null;
};

type Trato = {
  id: string;
  etapa: string;
  tipoEvento: string;
  tipoServicio: string | null;
  tipoProspecto: string;
  nombreEvento: string | null;
  fechaEventoEstimada: string | null;
  presupuestoEstimado: number | null;
  lugarEstimado: string | null;
  origenLead: string;
  fechaProximaAccion: string | null;
  createdAt: string;
  updatedAt?: string | null;
  etapaCambiadaEn?: string | null;
  fechaCierre: string | null;
  cliente: { id: string; nombre: string; empresa: string | null; telefono: string | null };
  responsable: { id: string; name: string } | null;
  cotizaciones: Cotizacion[];
  nurturingData: string | null;
};

type Cliente = { id: string; nombre: string; empresa: string | null; telefono: string | null };

const ETAPA_COLORS: Record<string, string> = {
  LEAD: "bg-violet-900/40 text-violet-300",
  DESCUBRIMIENTO: "bg-blue-900/40 text-blue-300",
  OPORTUNIDAD: "bg-yellow-900/40 text-yellow-300",
  VENTA_CERRADA: "bg-green-900/40 text-green-300",
  VENTA_PERDIDA: "bg-red-900/40 text-red-400",
};

const ETAPA_TEXT: Record<string, string> = {
  LEAD: "text-violet-500/60",
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

// Subtle accent colors for tipo evento
const TIPO_EVENTO_BORDER: Record<string, string> = {
  MUSICAL:     'border-l-indigo-500/30',
  SOCIAL:      'border-l-rose-500/30',
  EMPRESARIAL: 'border-l-cyan-500/30',
  OTRO:        'border-l-transparent',
};

const TIPO_EVENTO_DOT: Record<string, string> = {
  MUSICAL:     'bg-indigo-400/60',
  SOCIAL:      'bg-rose-400/60',
  EMPRESARIAL: 'bg-cyan-400/60',
  OTRO:        'bg-gray-600/50',
};

const TIPO_EVENTO_TEXT: Record<string, string> = {
  MUSICAL:     'text-indigo-400/70',
  SOCIAL:      'text-rose-400/70',
  EMPRESARIAL: 'text-cyan-400/70',
  OTRO:        'text-gray-500',
};

const TIPO_SERVICIO_LABELS: Record<string, string> = {
  PRODUCCION_TECNICA: 'Producción',
  RENTA:              'Renta',
  DIRECCION_TECNICA:  'Dirección',
};

type OrdenTrato = 'urgencia' | 'fechaEvento' | 'fechaAgregado' | 'sinActividad';

function groupTratosByMes(tratos: Trato[], ordenTrato: OrdenTrato = 'fechaEvento') {
  // SIEMPRE agrupar por fecha del evento (no por createdAt), de más próximo a más lejano
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const map: Record<string, { label: string; yearMonth: string; tratos: Trato[]; isPast: boolean }> = {};

  for (const t of tratos) {
    // Siempre usar fechaEventoEstimada para agrupar. Si no tiene fecha, va al mes actual como referencia.
    const ref = t.fechaEventoEstimada ?? t.createdAt;
    const d = new Date(ref.substring(0, 10) + 'T12:00:00Z');
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    // Un mes es "pasado" solo si es ANTERIOR al mes actual completo
    const isPast = yearMonth < currentYearMonth;
    const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    if (!map[yearMonth]) map[yearMonth] = { label, yearMonth, tratos: [], isPast };
    map[yearMonth].tratos.push(t);
  }

  // Sort each group internally according to the selected order
  for (const g of Object.values(map)) {
    g.tratos.sort((a, b) => {
      switch (ordenTrato) {
        case 'fechaAgregado':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'sinActividad': {
          const dA = a.fechaProximaAccion ? (Date.now() - new Date(a.fechaProximaAccion).getTime()) / 86400000 : 9999;
          const dB = b.fechaProximaAccion ? (Date.now() - new Date(b.fechaProximaAccion).getTime()) / 86400000 : 9999;
          return dB - dA;
        }
        case 'urgencia': {
          if (!a.fechaProximaAccion && !b.fechaProximaAccion) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (!a.fechaProximaAccion) return 1;
          if (!b.fechaProximaAccion) return -1;
          return a.fechaProximaAccion.localeCompare(b.fechaProximaAccion);
        }
        case 'fechaEvento':
        default: {
          // Ascending: soonest event first within the group
          if (!a.fechaEventoEstimada && !b.fechaEventoEstimada) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (!a.fechaEventoEstimada) return 1;
          if (!b.fechaEventoEstimada) return -1;
          return a.fechaEventoEstimada.localeCompare(b.fechaEventoEstimada);
        }
      }
    });
  }

  // SIEMPRE ascendente: el mes más próximo primero, los pasados al final
  const future = Object.values(map).filter(g => !g.isPast).sort((a, b) =>
    a.yearMonth.localeCompare(b.yearMonth)  // más próximo primero
  );
  const past = Object.values(map).filter(g => g.isPast).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

  const all = [
    ...future,
    ...past,
  ];
  return { future, past, all };
}


const ETAPAS = ["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"];
const TIPOS_EVENTO = ["MUSICAL", "SOCIAL", "EMPRESARIAL", "OTRO"];

const ALL_ETAPAS = [
  { key: 'TODOS',          label: 'Todos',          color: '#6B7280' },
  { key: 'LEAD',           label: 'Leads',          color: '#F59E0B' },
  { key: 'DESCUBRIMIENTO', label: 'Descubrimiento', color: '#3B82F6' },
  { key: 'OPORTUNIDAD',    label: 'Oportunidad',    color: '#8B5CF6' },
  { key: 'VENTA_CERRADA',  label: 'Cerrada',        color: '#10B981' },
  { key: 'VENTA_PERDIDA',  label: 'Perdida',        color: '#EF4444' },
];

function urgenciaColor(fechaProximaAccion: string | Date | null): string {
  if (!fechaProximaAccion) return 'text-red-400 bg-red-900/20';
  const diff = (new Date(fechaProximaAccion).getTime() - Date.now()) / 86400000;
  if (diff >= 0 && diff <= 7) return 'text-emerald-400 bg-emerald-900/20';  // próxima acción ≤7d
  if (diff > 7) return 'text-yellow-400 bg-yellow-900/20';                   // programada pero lejos
  return 'text-red-400 bg-red-900/20';                                        // vencida (diff < 0)
}

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

// ── Sublista de cotizaciones + proyecto de evento ─────────────────────────────────
function CotizacionesSublista({ trato }: { trato: Trato }) {
  const cots = trato.cotizaciones;
  // Deduplicate proyectos (multiple cotizaciones may link same project)
  const proyectosMap = new Map<string, NonNullable<Cotizacion['proyecto']>>();
  for (const c of cots) {
    if (c.proyecto) proyectosMap.set(c.proyecto.id, c.proyecto);
  }
  const proyectos = Array.from(proyectosMap.values());

  const ESTADO_PROY_TEXT: Record<string, string> = {
    PLANEACION: 'text-blue-400/70', CONFIRMADO: 'text-emerald-400/70',
    EN_CURSO: 'text-yellow-400/70', PENDIENTE_CIERRE: 'text-orange-400/70',
    COMPLETADO: 'text-gray-500', CANCELADO: 'text-red-400/60',
  };
  const ESTADO_PROY_LABELS: Record<string, string> = {
    PLANEACION: 'Planeación', CONFIRMADO: 'Confirmado', EN_CURSO: 'En curso',
    PENDIENTE_CIERRE: 'Pend. cierre', COMPLETADO: 'Completado', CANCELADO: 'Cancelado',
  };

  return (
    <div className="bg-[#0d0d0d] border-t border-[#1a1a1a] px-4 py-3 space-y-3">

      {/* ── Cotizaciones ────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-700 mb-2">Cotizaciones</p>
        {cots.length === 0 ? (
          <div className="flex items-center justify-between">
            <p className="text-[#555] text-xs italic">Sin cotizaciones — agrega una para avanzar</p>
            <Link
              href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
              className="text-[#B3985B] text-xs font-medium hover:underline"
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
                </div>
              </div>
            ))}
            <div className="pt-1 border-t border-[#1a1a1a] mt-1">
              <Link href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`} className="text-[#555] text-[11px] hover:text-[#B3985B] transition-colors">
                + Nueva cotización →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Proyecto de evento ───────────────────────────────────────────── */}
      {proyectos.length > 0 ? (
        <div className="border-t border-[#1a1a1a] pt-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-700 mb-2">Proyecto de evento</p>
          <div className="space-y-1.5">
            {proyectos.map(p => (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                className="flex items-center gap-3 group hover:bg-[#111] rounded-lg px-2 py-1.5 -mx-2 transition-colors"
              >
                <span className="text-[10px] text-gray-600 font-mono shrink-0">{p.numeroProyecto}</span>
                <span className="text-xs text-gray-400 group-hover:text-white transition-colors flex-1 truncate">{p.nombre}</span>
                <span className={`text-[10px] font-medium shrink-0 ${ESTADO_PROY_TEXT[p.estado] ?? 'text-gray-600'}`}>
                  {ESTADO_PROY_LABELS[p.estado] ?? p.estado}
                </span>
                <span className="text-[10px] text-gray-700 group-hover:text-[#B3985B] transition-colors shrink-0">Ver →</span>
              </Link>
            ))}
          </div>
        </div>
      ) : cots.length > 0 ? (
        <div className="border-t border-[#1a1a1a] pt-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-700 mb-1">Proyecto de evento</p>
          <p className="text-[#444] text-xs italic">Se creará al aprobar una cotización</p>
        </div>
      ) : null}

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
  const [modoModal, setModoModal] = useState<'oportunidad' | 'lead-rapido' | 'prospeccion-fria'>('oportunidad');
  const [form, setForm] = useState<NuevaOportunidadForm>({ ...FORM_EMPTY });
  const [leadRapidoForm, setLeadRapidoForm] = useState({
    nombre: '', telefono: '', origenLead: 'ORGANICO', tipoEvento: '',
    notasIniciales: '', fechaProximaAccion: '',
  });
  const [prospeccionForm, setProspeccionForm] = useState({
    nombre: '', telefono: '', motivo: '', canal: 'WHATSAPP',
    fechaPrimerIntento: '', tipoEvento: '',
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [savingProspeccion, setSavingProspeccion] = useState(false);
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

  async function submitProspeccionFria() {
    if (!prospeccionForm.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSavingProspeccion(true);
    try {
      const body: Record<string, unknown> = {
        clienteNuevo: { nombre: prospeccionForm.nombre.trim(), telefono: prospeccionForm.telefono || null },
        tipoProspecto: 'NURTURING',
        origenLead: 'PROSPECCION',
        tipoEvento: prospeccionForm.tipoEvento || 'OTRO',
        nombreEvento: prospeccionForm.motivo.trim() || 'Prospección en frío',
        nurturingData: JSON.stringify({ canalContacto: prospeccionForm.canal, motivoContacto: prospeccionForm.motivo.trim() }),
      };
      if (prospeccionForm.fechaPrimerIntento) {
        body.primerSeguimiento = { fecha: prospeccionForm.fechaPrimerIntento, canal: prospeccionForm.canal.toLowerCase() };
        body.fechaProximaAccion = prospeccionForm.fechaPrimerIntento;
      }
      const res = await fetch('/api/tratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error('Error al registrar prospecto'); return; }
      toast.success('Prospecto registrado ✓');
      onLeadCreated?.();
      onClose();
    } finally {
      setSavingProspeccion(false);
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
              {modoModal === 'lead-rapido' ? 'Lead rápido' : modoModal === 'prospeccion-fria' ? 'Prospección en frío' : 'Nueva oportunidad'}
            </h2>
            <p className="text-[#555] text-xs mt-0.5">
              {modoModal === 'lead-rapido'
                ? 'Alguien nos contactó — captura rápida sin cotización'
                : modoModal === 'prospeccion-fria'
                ? 'Salida en frío — nosotros los contactamos'
                : 'Crea el trato y la cotización borrador en un paso'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Mode selector tabs */}
        <div className="flex gap-1 bg-[#0d0d0d] rounded-xl p-1 border border-[#1e1e1e]">
          <button
            onClick={() => setModoModal('lead-rapido')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              modoModal === 'lead-rapido'
                ? 'bg-[#B3985B] text-black'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            ⚡ Lead rápido
          </button>
          <button
            onClick={() => setModoModal('prospeccion-fria')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              modoModal === 'prospeccion-fria'
                ? 'bg-violet-600 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            🎯 Frío
          </button>
          <button
            onClick={() => setModoModal('oportunidad')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              modoModal === 'oportunidad'
                ? 'bg-[#B3985B] text-black'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            + Oportunidad
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
        ) : modoModal === 'lead-rapido' ? (
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
        ) : (
          /* ── Prospección en frío ── */
          <>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#6b7280] block mb-1">Nombre o empresa *</label>
                <input value={prospeccionForm.nombre} onChange={e => setProspeccionForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. Empresa XYZ"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-xs text-[#6b7280] block mb-1">Teléfono / contacto</label>
                <input value={prospeccionForm.telefono} onChange={e => setProspeccionForm(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+52 55 0000 0000"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-xs text-[#6b7280] block mb-1">¿Por qué los contactamos?</label>
                <textarea value={prospeccionForm.motivo} onChange={e => setProspeccionForm(p => ({ ...p, motivo: e.target.value }))}
                  placeholder="Empresa con eventos recurrentes, potencial de sonido + iluminación..."
                  rows={2} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Canal de primer contacto</label>
                  <select value={prospeccionForm.canal} onChange={e => setProspeccionForm(p => ({ ...p, canal: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500">
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="LLAMADA">Llamada</option>
                    <option value="EMAIL">Email</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="PRESENCIAL">Visita presencial</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Fecha primer intento</label>
                  <input type="date" value={prospeccionForm.fechaPrimerIntento} onChange={e => setProspeccionForm(p => ({ ...p, fechaPrimerIntento: e.target.value }))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
              <button onClick={submitProspeccionFria} disabled={savingProspeccion || !prospeccionForm.nombre.trim()}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 disabled:opacity-40 transition-colors">
                {savingProspeccion ? 'Registrando...' : '🎯 Registrar prospecto'}
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
                    {(() => {
                      const ref = new Date((t.etapaCambiadaEn ?? t.createdAt) as string);
                      const dias = (Date.now() - ref.getTime()) / 86400000;
                      return dias > 10 && !['VENTA_CERRADA', 'VENTA_PERDIDA'].includes(t.etapa) ? (
                        <span className="text-[9px] text-gray-600 border border-gray-800 rounded px-1 py-0.5 font-medium">ESTANCADO</span>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-gray-600 text-[11px] mt-0.5 truncate">
                    {t.nombreEvento || TIPO_EVENTO_LABELS[t.tipoEvento] || t.tipoEvento}
                    {t.lugarEstimado && <span className="text-gray-700"> · {t.lugarEstimado}</span>}
                    {cots.length > 0 && <span className="text-gray-700"> · {cots.length} cot.</span>}
                  </p>
                </div>

                <div className="shrink-0 hidden sm:block">
                  <BadgeDias inicio={t.createdAt} fin={t.fechaCierre} tipo="trato" cerrado={!activo} labelCerrado={t.etapa === "VENTA_PERDIDA" ? "perdido" : undefined} urgenciaClassName={urgenciaColor(t.fechaProximaAccion)} />
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

// ── Compact Trato Row ────────────────────────────────────────────────────────────
function CompactTratoRow({
  trato: t,
  onEliminar,
  onCambiarEtapa,
  onQuickNote,
  deletingId,
  isExpanded,
  onToggle,
}: {
  trato: Trato;
  onEliminar: () => void;
  onCambiarEtapa: (nuevaEtapa: string) => void;
  onQuickNote: () => void;
  deletingId: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const wa = waUrl(t);

  const getSeguimientoBadge = (fecha: string | null) => {
    if (!fecha) return { label: 'Sin seguimiento', cls: 'text-[#3a3a3a]', pill: false };
    const diff = Math.floor((new Date(fecha).getTime() - Date.now()) / 86400000);
    if (diff < 0) return { label: `Vencido ${Math.abs(diff)}d`, cls: 'bg-red-500/15 text-red-400', pill: true };
    if (diff === 0) return { label: 'Hoy', cls: 'bg-yellow-500/15 text-yellow-400', pill: true };
    const label = new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return { label, cls: 'bg-[#1e1e1e] text-[#555]', pill: true };
  };

  const TIPO_BADGE_CLS: Record<string, string> = {
    MUSICAL: 'bg-[#1E3A5F] text-[#60A5FA]',
    SOCIAL: 'bg-[#3D1F5B] text-[#C084FC]',
    EMPRESARIAL: 'bg-[#1A3A2A] text-[#4ADE80]',
    OTRO: 'bg-[#222] text-[#9CA3AF]',
  };
  const TIPO_LABEL_SHORT: Record<string, string> = {
    MUSICAL: 'Musical', SOCIAL: 'Social', EMPRESARIAL: 'Empresarial', OTRO: 'Otro',
  };
  const ETAPA_DOT_COLOR: Record<string, string> = {
    LEAD: '#F59E0B', DESCUBRIMIENTO: '#3B82F6', OPORTUNIDAD: '#8B5CF6',
    VENTA_CERRADA: '#10B981', VENTA_PERDIDA: '#EF4444',
  };
  const seg = getSeguimientoBadge(t.fechaProximaAccion);

  return (
    <>
      {/* Main row */}
      <div className="group flex items-center gap-3 px-4 py-3 hover:bg-[#0d0d0d] border-b border-[#0f0f0f] last:border-0 transition-colors">
        {/* Expand toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="shrink-0 text-gray-700 hover:text-gray-400 transition-colors p-0.5"
          title="Ver cotizaciones"
        >
          <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* COL 1 — Identidad */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => router.push(`/crm/tratos/${t.id}`)}
        >
          <p className="text-[14px] text-white font-medium leading-tight truncate">
            {t.nombreEvento || t.cliente.nombre}
          </p>
          <p className="text-[12px] text-[#666] mt-0.5 truncate">
            {t.nombreEvento ? t.cliente.nombre : (t.cliente.empresa ?? '')}
          </p>
          {t.nombreEvento && t.cliente.empresa && (
            <p className="text-[11px] text-[#444] truncate">{t.cliente.empresa}</p>
          )}
        </div>

        {/* COL 2 — Tipo de evento */}
        <div className="hidden sm:block w-[90px] shrink-0">
          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${TIPO_BADGE_CLS[t.tipoEvento] ?? TIPO_BADGE_CLS.OTRO}`}>
            {TIPO_LABEL_SHORT[t.tipoEvento] ?? t.tipoEvento}
          </span>
        </div>

        {/* COL 2b — Tipo de servicio */}
        <div className="hidden md:block w-[90px] shrink-0">
          {t.tipoServicio ? (
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
              t.tipoServicio === 'RENTA'
                ? 'bg-amber-900/30 text-amber-400 border border-amber-800/30'
                : t.tipoServicio === 'PRODUCCION_TECNICA'
                ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                : 'bg-violet-900/30 text-violet-400 border border-violet-800/30'
            }`}>
              {TIPO_SERVICIO_LABELS[t.tipoServicio] ?? t.tipoServicio}
            </span>
          ) : (
            <span className="text-[11px] text-[#333]">—</span>
          )}
        </div>

        {/* COL 3 — Fecha evento */}
        <div className="hidden md:block w-[90px] shrink-0">
          {t.fechaEventoEstimada ? (
            <span className="text-[11px] text-[#888]">
              {new Date(t.fechaEventoEstimada + 'T12:00:00Z').toLocaleDateString('es-MX', {
                day: 'numeric', month: 'short', timeZone: 'UTC'
              })}
            </span>
          ) : (
            <span className="text-[11px] text-[#333]">—</span>
          )}
        </div>

        {/* COL 4 — Seguimiento */}
        <div className="hidden md:block w-[110px] shrink-0">
          <span className={`text-[11px] ${seg.pill ? 'px-2 py-0.5 rounded-md' : ''} ${seg.cls}`}>
            {seg.label}
          </span>
        </div>

        {/* COL 4 — Etapa */}
        <div className="hidden sm:flex items-center gap-1.5 w-[140px] shrink-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ETAPA_DOT_COLOR[t.etapa] ?? '#6B7280' }} />
          <select
            value={t.etapa}
            onChange={e => { e.stopPropagation(); onCambiarEtapa(e.target.value); }}
            onClick={e => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent border-none text-gray-500 text-[11px] focus:outline-none cursor-pointer hover:text-white transition-colors"
            title="Cambiar etapa"
          >
            {ALL_ETAPAS.filter(e => e.key !== 'TODOS').map(e => (
              <option key={e.key} value={e.key} className="bg-[#111]">{e.label}</option>
            ))}
          </select>
        </div>

        {/* COL 5 — Acciones (solo en hover) */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onQuickNote(); }}
            className="text-[11px] text-[#B3985B] border border-[#B3985B]/30 rounded-md px-2 py-1 hover:bg-[#B3985B]/10 transition-colors whitespace-nowrap"
          >
            + Seguimiento
          </button>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-green-700 hover:text-green-500 transition-colors p-1"
              title="WhatsApp"
            >
              <WaIcon />
            </a>
          )}
          <button
            onClick={e => { e.stopPropagation(); onEliminar(); }}
            disabled={deletingId === t.id}
            className="text-[#2a2a2a] hover:text-red-500/60 transition-colors disabled:opacity-40 p-1"
            title="Eliminar"
          >
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

      {/* Accordion panel */}
      {isExpanded && (
        <CotizacionesSublista trato={t} />
      )}
    </>
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
  const [filtroEtapa, setFiltroEtapa] = useState<string | null>('TODOS');
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string | null>(null);
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
  const [agrupacion, setAgrupacion] = useState<"todos" | "mes" | "semana">("todos");
  const [gruposOpen, setGruposOpen] = useState<Record<string, boolean>>({});
  const [ordenTrato, setOrdenTrato] = useState<OrdenTrato>('fechaEvento');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [showNueva, setShowNueva] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  // Quick Contactado state
  const [quickNoteId, setQuickNoteId] = useState<string | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [savingQuickNote, setSavingQuickNote] = useState(false);

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

  async function guardarNota(tratoId: string) {
    setSavingQuickNote(true);
    try {
      await fetch(`/api/seguimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tratoId,
          tipo: 'manual',
          canal: 'whatsapp',
          titulo: 'Contactado',
          nota: quickNoteText.trim() || null,
          completado: true,
          fechaProgramada: new Date().toISOString(),
        }),
      });
      toast.success('Contacto registrado ✓');
      setQuickNoteId(null);
      setQuickNoteText('');
    } finally {
      setSavingQuickNote(false);
    }
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

  async function cambiarEtapa(tratoId: string, nuevaEtapa: string) {
    // Optimistic update
    setTratos(prev => prev.map(t => t.id === tratoId ? { ...t, etapa: nuevaEtapa } : t));
    try {
      await fetch(`/api/tratos/${tratoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa: nuevaEtapa }),
      });
      toast.success(`Movido a ${ETAPA_LABELS[nuevaEtapa] ?? nuevaEtapa}`);
    } catch {
      // Revert on error
      toast.error('Error al cambiar etapa');
      const refreshed = await fetch('/api/tratos').then(r => r.json());
      setTratos(refreshed.tratos ?? []);
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
    if (filtroEtapa === 'LEADS') {
      const matchFrio2 = t.tipoProspecto === 'NURTURING';
      const q2 = busqueda.toLowerCase();
      const matchB2 = !q2 || t.cliente.nombre.toLowerCase().includes(q2) || (t.cliente.empresa ?? '').toLowerCase().includes(q2) || (t.nombreEvento ?? '').toLowerCase().includes(q2) || (t.lugarEstimado ?? '').toLowerCase().includes(q2);
      return matchFrio2 && matchB2;
    }
    if (filtroEtapa === 'CIERRE_SEMANA') {
      const hoyD = new Date(); hoyD.setHours(0, 0, 0, 0);
      const finSemana = new Date(hoyD);
      finSemana.setDate(hoyD.getDate() + (6 - hoyD.getDay()));
      finSemana.setHours(23, 59, 59, 999);
      const qcs = busqueda.toLowerCase();
      const matchBcs = !qcs || t.cliente.nombre.toLowerCase().includes(qcs) || (t.cliente.empresa ?? '').toLowerCase().includes(qcs) || (t.nombreEvento ?? '').toLowerCase().includes(qcs);
      return matchBcs && !!t.fechaProximaAccion && new Date(t.fechaProximaAccion) >= hoyD && new Date(t.fechaProximaAccion) <= finSemana;
    }
    if (filtroEtapa === 'ACCION_REQUERIDA') {
      const hoyAR = new Date();
      const qar = busqueda.toLowerCase();
      const matchBar = !qar || t.cliente.nombre.toLowerCase().includes(qar) || (t.cliente.empresa ?? '').toLowerCase().includes(qar) || (t.nombreEvento ?? '').toLowerCase().includes(qar);
      return matchBar && (
        (!!t.fechaProximaAccion && new Date(t.fechaProximaAccion) < hoyAR) ||
        (!t.fechaProximaAccion && (Date.now() - new Date(t.updatedAt ?? t.createdAt).getTime()) / 86400000 > 3)
      );
    }
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
    // Ordenar siempre del evento más próximo al más lejano por defecto
    if (orden === "evento_desc")  return new Date(b.fechaEventoEstimada ?? "0").getTime() - new Date(a.fechaEventoEstimada ?? "0").getTime();
    if (orden === "creacion_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (orden === "creacion_desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    // evento_asc (default): sin fecha van al final
    const aMs = a.fechaEventoEstimada ? new Date(a.fechaEventoEstimada).getTime() : Number.MAX_SAFE_INTEGER;
    const bMs = b.fechaEventoEstimada ? new Date(b.fechaEventoEstimada).getTime() : Number.MAX_SAFE_INTEGER;
    return aMs - bMs;
  });

  // Próximos: sin fecha o fecha del evento >= hoy (siempre más próximo primero)
  const tratosProximos = tratosFiltrados
    .filter(t => !t.fechaEventoEstimada || t.fechaEventoEstimada >= hoy)
    .sort((a, b) => {
      const aMs = a.fechaEventoEstimada ? new Date(a.fechaEventoEstimada).getTime() : Number.MAX_SAFE_INTEGER;
      const bMs = b.fechaEventoEstimada ? new Date(b.fechaEventoEstimada).getTime() : Number.MAX_SAFE_INTEGER;
      return aMs - bMs;
    });
  // Archivados: fecha del evento ya pasó, del más reciente al más antiguo
  const tratosArchivados = tratosFiltrados
    .filter(t => !!t.fechaEventoEstimada && t.fechaEventoEstimada < hoy)
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

          <NuevoTratoDropdown onLeadCreated={async () => {
            const refreshed = await fetch('/api/tratos').then(r => r.json());
            setTratos(refreshed.tratos ?? []);
          }} />
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

          {/* ── Pipeline overview cards ── */}
          {(() => {
            const counts = {
              leads: tratos.filter(t => t.etapa === 'LEAD').length,
              descubrimiento: tratos.filter(t => t.etapa === 'DESCUBRIMIENTO').length,
              oportunidades: tratos.filter(t => t.etapa === 'OPORTUNIDAD').length,
              cerradas: tratos.filter(t => t.etapa === 'VENTA_CERRADA').length,
              perdidas: tratos.filter(t => t.etapa === 'VENTA_PERDIDA').length,
            };
            const cards = [
              { color: '#F59E0B', label: 'Leads',         count: counts.leads,          filter: 'LEAD',           borderClass: '' },
              { color: '#3B82F6', label: 'Descubrimiento', count: counts.descubrimiento, filter: 'DESCUBRIMIENTO', borderClass: '' },
              { color: '#8B5CF6', label: 'Oportunidades',  count: counts.oportunidades,  filter: 'OPORTUNIDAD',    borderClass: '' },
              { color: '#10B981', label: 'Cerradas',       count: counts.cerradas,       filter: 'VENTA_CERRADA',  borderClass: 'border-green-900/30' },
              { color: '#EF4444', label: 'Perdidas',       count: counts.perdidas,       filter: 'VENTA_PERDIDA',  borderClass: 'border-red-900/30' },
            ];
            return (
              <div className="grid grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                {cards.map(card => (
                  <button
                    key={card.filter}
                    onClick={() => setFiltroEtapa(card.filter)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      filtroEtapa === card.filter
                        ? 'bg-[#1a1a1a] border-[#B3985B]/40'
                        : `bg-[#0d0d0d] ${card.borderClass || 'border-[#1a1a1a]'} hover:border-[#2a2a2a]`
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: card.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 truncate">{card.label}</p>
                      <p className={`text-xl font-bold tabular-nums ${
                        card.count > 0 ? 'text-white' : 'text-gray-700'
                      }`}>{card.count}</p>
                    </div>
                  </button>
                ))}
              </div>
            );
          })()}

          {/* ── Filtro tipo de evento ── */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Tipo:</span>
            {([null, 'MUSICAL', 'SOCIAL', 'EMPRESARIAL', 'OTRO'] as const).map(tipo => (
              <button
                key={tipo ?? 'todos'}
                onClick={() => setFiltroTipoEvento(tipo)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  filtroTipoEvento === tipo
                    ? 'bg-[#1a1a1a] border-[#B3985B]/40 text-[#B3985B]'
                    : 'bg-transparent border-[#1a1a1a] text-gray-600 hover:text-gray-300 hover:border-[#2a2a2a]'
                }`}
              >
                {tipo === null ? 'Todos' : tipo === 'MUSICAL' ? 'Musical' : tipo === 'SOCIAL' ? 'Social' : tipo === 'EMPRESARIAL' ? 'Empresarial' : 'Otro'}
              </button>
            ))}
          </div>

          {/* ── Ordering pills ── */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] text-gray-700 uppercase tracking-wider shrink-0">Orden:</span>
            {([
              { key: 'urgencia', label: 'Urgencia' },
              { key: 'fechaEvento', label: 'Fecha evento' },
              { key: 'fechaAgregado', label: 'Más reciente' },
              { key: 'sinActividad', label: 'Sin actividad' },
            ] as { key: OrdenTrato; label: string }[]).map(o => (
              <button
                key={o.key}
                onClick={() => setOrdenTrato(o.key)}
                className={`text-[10px] px-2 py-1 rounded-lg transition-colors ${
                  ordenTrato === o.key
                    ? 'bg-[#1a1a1a] border border-[#B3985B]/30 text-[#B3985B]'
                    : 'text-gray-600 hover:text-gray-400 border border-transparent'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* ── Compact list for active tab ── */}
          {loading ? (
            <SkeletonPage />
          ) : (() => {
            const q = busqueda.toLowerCase();
            const tabTratos = tratos
              .filter(t => {
                const matchEtapa = filtroEtapa === 'TODOS' || t.etapa === filtroEtapa;
                const matchSearch = !q ||
                  t.cliente.nombre.toLowerCase().includes(q) ||
                  (t.cliente.empresa ?? '').toLowerCase().includes(q) ||
                  (t.nombreEvento ?? '').toLowerCase().includes(q) ||
                  (t.cliente.telefono ?? '').includes(q);
                const matchTipo = !filtroTipoEvento || t.tipoEvento === filtroTipoEvento;
                return matchEtapa && matchSearch && matchTipo;
              })
              .sort((a, b) => {
                switch (ordenTrato) {
                  case 'fechaAgregado':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  case 'sinActividad': {
                    const dA = a.fechaProximaAccion ? (Date.now() - new Date(a.fechaProximaAccion).getTime()) / 86400000 : 9999;
                    const dB = b.fechaProximaAccion ? (Date.now() - new Date(b.fechaProximaAccion).getTime()) / 86400000 : 9999;
                    return dB - dA;
                  }
                  case 'fechaEvento':
                    if (!a.fechaEventoEstimada && !b.fechaEventoEstimada) return 0;
                    if (!a.fechaEventoEstimada) return 1;
                    if (!b.fechaEventoEstimada) return -1;
                    return a.fechaEventoEstimada.localeCompare(b.fechaEventoEstimada);
                  case 'urgencia':
                  default: {
                    const etapa = filtroEtapa ?? 'LEAD';
                    if (etapa === 'LEAD' || etapa === 'DESCUBRIMIENTO' || etapa === 'OPORTUNIDAD') {
                      if (!a.fechaProximaAccion && !b.fechaProximaAccion) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      if (!a.fechaProximaAccion) return 1;
                      if (!b.fechaProximaAccion) return -1;
                      return a.fechaProximaAccion.localeCompare(b.fechaProximaAccion);
                    }
                    if (!a.fechaCierre && !b.fechaCierre) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    if (!a.fechaCierre) return 1;
                    if (!b.fechaCierre) return -1;
                    return new Date(b.fechaCierre).getTime() - new Date(a.fechaCierre).getTime();
                  }
                }
              });

            if (tabTratos.length === 0) {
              return (
                <div className="text-center py-20 text-gray-700">
                  <p className="text-3xl mb-3">📭</p>
                  <p className="text-sm">
                    {busqueda ? `Sin resultados para "${busqueda}"` : `No hay tratos en ${ALL_ETAPAS.find(e => e.key === filtroEtapa)?.label ?? filtroEtapa}`}
                  </p>
                </div>
              );
            }

            // ── Unified month grouping — respects ordenTrato ────────────
            {
              const { all } = groupTratosByMes(tabTratos, ordenTrato);


              const renderRow = (t: Trato) => (
                <CompactTratoRow
                  key={t.id}
                  trato={t}
                  onEliminar={() => eliminar(t.id, t.cliente.nombre)}
                  onCambiarEtapa={nuevaEtapa => cambiarEtapa(t.id, nuevaEtapa)}
                  onQuickNote={() => { setQuickNoteId(t.id); setQuickNoteText(''); }}
                  deletingId={deletingId}
                  isExpanded={expandedRowId === t.id}
                  onToggle={() => setExpandedRowId(expandedRowId === t.id ? null : t.id)}
                />
              );

              type MesGroup = ReturnType<typeof groupTratosByMes>['all'][0];
              const renderGroup = (g: MesGroup) => (
                <div key={g.yearMonth} className={g.isPast ? 'opacity-60' : ''}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
                      {g.label} ({g.tratos.length})
                    </span>
                    {g.isPast && (
                      <span className="text-[9px] text-gray-700 uppercase tracking-wider">pasado</span>
                    )}
                    <div className="flex-1 border-t border-[#1a1a1a]" />
                  </div>
                  <div className="rounded-xl border border-[#1a1a1a] overflow-hidden">
                    {g.tratos.map(renderRow)}
                  </div>
                </div>
              );

              return (
                <div className="space-y-5">
                  {all.map(renderGroup)}
                </div>
              );
            }

          })()}
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

      {/* ── Quick Contactado overlay + popover ── */}
      {quickNoteId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setQuickNoteId(null); setQuickNoteText(''); }}
        />
      )}
      {quickNoteId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl p-4 w-80">
          <p className="text-xs text-gray-400 mb-2 font-medium">Registrar contacto</p>
          <textarea
            value={quickNoteText}
            onChange={e => setQuickNoteText(e.target.value)}
            placeholder="Nota rápida (opcional)..."
            rows={2}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none mb-3"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => guardarNota(quickNoteId)}
              disabled={savingQuickNote}
              className="flex-1 py-2 bg-[#B3985B] text-black text-sm font-semibold rounded-xl hover:bg-[#c9a96a] disabled:opacity-40 transition-colors"
            >
              {savingQuickNote ? 'Guardando...' : '✓ Registrar contacto'}
            </button>
            <button
              onClick={() => { setQuickNoteId(null); setQuickNoteText(''); }}
              className="px-3 py-2 bg-[#1a1a1a] text-gray-400 text-sm rounded-xl hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
