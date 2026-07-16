"use client";

import React from "react";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ETAPA_LABELS, TIPO_EVENTO_LABELS, ORIGEN_LEAD_LABELS, MOMENTO_LABELS, MOMENTO_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { Combobox } from "@/components/Combobox";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";
import { BadgeDias } from "@/components/ui/BadgeDias";
import { NuevoTratoDropdown } from "@/components/NuevoTratoDropdown";
import { diasTrato } from "@/lib/contadores";
import { EtapaInternaBar } from "@/components/crm/EtapaInternaBar";

type Usuario = { id: string; name: string; area?: string };

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
  etapaInterna?: string | null;
  tipoEvento: string;
  tipoServicio: string | null;
  tipoProspecto: string;
  nombreEvento: string | null;
  fechaEventoEstimada: string | null;
  presupuestoEstimado: number | null;
  lugarEstimado: string | null;
  origenLead: string;
  momentoContratacion?: string | null;
  posibleDuplicado?: boolean;
  fechaProximaAccion: string | null;
  createdAt: string;
  updatedAt?: string | null;
  etapaCambiadaEn?: string | null;
  fechaCierre: string | null;
  confirmadaEn: string | null;    // ✅ confirmación operativa
  cliente: { id: string; nombre: string; empresa: string | null; telefono: string | null };
  responsable: { id: string; name: string } | null;
  cotizaciones: Cotizacion[];
  nurturingData: string | null;
  descubrimientoCompleto?: boolean;
  formEstado?: string | null;
  modoDescubrimiento?: string | null;
  preferenciaContacto?: string | null;
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

const TIPO_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  MUSICAL:     { bg: 'bg-indigo-900/30',  text: 'text-indigo-400',  dot: 'bg-indigo-400' },
  SOCIAL:      { bg: 'bg-rose-900/30',    text: 'text-rose-400',    dot: 'bg-rose-400' },
  EMPRESARIAL: { bg: 'bg-teal-900/30',    text: 'text-teal-400',    dot: 'bg-teal-400' },
  VARIOS:      { bg: 'bg-gray-800/50',    text: 'text-gray-500',    dot: 'bg-gray-600' },
  OTRO:        { bg: 'bg-gray-800/50',    text: 'text-gray-500',    dot: 'bg-gray-600' },
};
const TIPO_LABEL_SHORT: Record<string, string> = {
  MUSICAL: 'Musical', SOCIAL: 'Social', EMPRESARIAL: 'Empresarial', VARIOS: 'Varios', OTRO: 'Otro',
};

const TIPO_SERVICIO_LABELS: Record<string, string> = {
  PRODUCCION_TECNICA: 'Producción',
  RENTA:              'Renta',
  DIRECCION_TECNICA:  'Dirección',
};

type OrdenTrato = 'urgencia' | 'fechaEvento' | 'fechaAgregado' | 'sinActividad';

function calcularUrgencia(t: { fechaProximaAccion?: string | null; fechaEventoEstimada?: string | null; presupuestoEstimado?: number | null }): number {
  let score = 0;
  if (!t.fechaProximaAccion) {
    score += 30;
  } else {
    const diasVencido = Math.floor((Date.now() - new Date(t.fechaProximaAccion).getTime()) / 86400000);
    if (diasVencido > 0) score += diasVencido * 3;
  }
  if (t.fechaEventoEstimada) {
    const diasEvento = Math.floor((new Date(t.fechaEventoEstimada).getTime() - Date.now()) / 86400000);
    if (diasEvento < 30 && diasEvento >= 0) score += (30 - diasEvento) * 2;
    if (diasEvento < 0) score += 60;
  }
  if (t.presupuestoEstimado) score += Math.min(t.presupuestoEstimado / 10000, 10);
  return score;
}

// Retorna grupos por mes pero el mes actual se divide en:
//   - próximos/hoy  (fechaEventoEstimada >= hoy o sin fecha)
//   - pasados del mes (fechaEventoEstimada < hoy pero mismo mes)
// Los meses anteriores al actual van agrupados al final como "archivados".
function groupTratosByMes(tratos: Trato[], ordenTrato: OrdenTrato = 'fechaEvento') {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  type MesGroup = { label: string; yearMonth: string; tratos: Trato[]; isPast: boolean; isIntraMonthPast?: boolean };
  const map: Record<string, MesGroup> = {};
  // Bucket especial para los del mes actual que ya pasaron
  const intraPastBucket: Trato[] = [];

  for (const t of tratos) {
    const ref = t.fechaEventoEstimada ?? null;
    if (!ref) {
      // Sin fecha: va al bucket del mes actual como próximo
      const yearMonth = currentYearMonth;
      const label = now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      if (!map[yearMonth]) map[yearMonth] = { label, yearMonth, tratos: [], isPast: false };
      map[yearMonth].tratos.push(t);
      continue;
    }
    const d = new Date(ref.substring(0, 10) + 'T12:00:00Z');
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    const isPast = yearMonth < currentYearMonth;
    // Evento del mes actual pero ya pasó → va al bucket de pasados del mes
    const isIntraMonthPast = yearMonth === currentYearMonth && ref < todayStr;
    if (isIntraMonthPast) {
      intraPastBucket.push(t);
      continue;
    }
    const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    if (!map[yearMonth]) map[yearMonth] = { label, yearMonth, tratos: [], isPast };
    map[yearMonth].tratos.push(t);
  }

  const sortGroup = (list: Trato[]) => list.sort((a, b) => {
    switch (ordenTrato) {
      case 'fechaAgregado':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'sinActividad': {
        const dA = a.fechaProximaAccion ? (Date.now() - new Date(a.fechaProximaAccion).getTime()) / 86400000 : 9999;
        const dB = b.fechaProximaAccion ? (Date.now() - new Date(b.fechaProximaAccion).getTime()) / 86400000 : 9999;
        return dB - dA;
      }
      case 'urgencia':
        return calcularUrgencia(b) - calcularUrgencia(a);
      case 'fechaEvento':
      default: {
        if (!a.fechaEventoEstimada && !b.fechaEventoEstimada) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (!a.fechaEventoEstimada) return 1;
        if (!b.fechaEventoEstimada) return -1;
        return a.fechaEventoEstimada.localeCompare(b.fechaEventoEstimada);
      }
    }
  });

  for (const g of Object.values(map)) sortGroup(g.tratos);
  sortGroup(intraPastBucket);

  const future = Object.values(map).filter(g => !g.isPast).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  const past   = Object.values(map).filter(g =>  g.isPast).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

  // Construimos el grupo especial de pasados del mes actual
  const intraPastGroup: MesGroup | null = intraPastBucket.length > 0 ? {
    label: now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) + ' — eventos pasados',
    yearMonth: currentYearMonth + '-PAST',
    tratos: intraPastBucket,
    isPast: false,
    isIntraMonthPast: true,
  } : null;

  // Orden final: futuros primero (mes actual primero), luego pasados del mes actual, luego meses anteriores
  const all: MesGroup[] = [
    ...future,
    ...(intraPastGroup ? [intraPastGroup] : []),
    ...past,
  ];
  return { future, past, all, intraPastGroup };
}


const ETAPAS = ["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"];
const TIPOS_EVENTO = ["MUSICAL", "SOCIAL", "EMPRESARIAL", "OTRO"];

const ALL_ETAPAS = [
  { key: 'TODOS',          label: 'Todos',          color: '#6B7280' },
  { key: 'LEAD',           label: 'Prospección',    color: '#F59E0B' },
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
    <div className="bg-[#0a0a0a] border-t border-[#1a1a1a] px-4 py-3 space-y-3">

      {/* ── Cotizaciones ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B3985B] shrink-0" />
          <p className="text-[10px] uppercase tracking-wider text-[#B3985B]/70 font-semibold">Cotizaciones</p>
        </div>
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
        <div className="border-t border-[#1e1e1e] pt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-[10px] uppercase tracking-wider text-emerald-500/70 font-semibold">Proyecto de evento</p>
          </div>
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
        <div className="border-t border-[#1e1e1e] pt-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-800 shrink-0" />
            <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-semibold">Proyecto de evento</p>
          </div>
          <p className="text-[#444] text-xs italic pl-3.5">Se creará al aprobar una cotización</p>
        </div>
      ) : null}

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
      className="ms-card p-3 space-y-2 cursor-pointer hover:border-[#B3985B]/40 transition-colors">
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
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${TIPO_BADGE[trato.tipoEvento]?.dot ?? TIPO_BADGE.OTRO.dot}`}></span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border border-transparent ${TIPO_BADGE[trato.tipoEvento]?.bg ?? TIPO_BADGE.OTRO.bg} ${TIPO_BADGE[trato.tipoEvento]?.text ?? TIPO_BADGE.OTRO.text}`}>
          {trato.nombreEvento || TIPO_LABEL_SHORT[trato.tipoEvento] || trato.tipoEvento}
        </span>
        {trato.momentoContratacion && MOMENTO_LABELS[trato.momentoContratacion] && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${MOMENTO_COLORS[trato.momentoContratacion] ?? ""}`}>
            {MOMENTO_LABELS[trato.momentoContratacion]}
          </span>
        )}
        {trato.posibleDuplicado && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-amber-500/40 bg-amber-500/15 text-amber-300" title="Posible duplicado — revisar">
            ⚠ revisar duplicado
          </span>
        )}
      </div>
      <EtapaInternaBar etapa={trato.etapa} etapaInterna={trato.etapaInterna} />
      {(trato.fechaEventoEstimada || trato.presupuestoEstimado || trato.confirmadaEn) && (
        <div className="flex items-center gap-2 flex-wrap">
          {trato.fechaEventoEstimada && (
            <span className="text-[10px] text-[#555]">{fmtFecha(trato.fechaEventoEstimada)}</span>
          )}
          {trato.presupuestoEstimado && (
            <span className="text-[10px] text-[#B3985B]">{formatCurrency(trato.presupuestoEstimado)}</span>
          )}
          {trato.confirmadaEn && (
            <span className="text-[10px] text-emerald-400 font-semibold">✓ Conf.</span>
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-1 h-1 rounded-full ${TIPO_BADGE[t.tipoEvento]?.dot ?? TIPO_BADGE.OTRO.dot}`}></span>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border border-transparent ${TIPO_BADGE[t.tipoEvento]?.bg ?? TIPO_BADGE.OTRO.bg} ${TIPO_BADGE[t.tipoEvento]?.text ?? TIPO_BADGE.OTRO.text}`}>
                        {t.nombreEvento || TIPO_LABEL_SHORT[t.tipoEvento] || t.tipoEvento}
                      </span>
                    </div>
                    <p className="text-gray-600 text-[11px] truncate">
                      {t.lugarEstimado && <span className="text-gray-700">· {t.lugarEstimado}</span>}
                      {cots.length > 0 && <span className="text-gray-700 ml-1">· {cots.length} cot.</span>}
                    </p>
                  </div>
                  <div className="mt-1.5 max-w-[220px]">
                    <EtapaInternaBar etapa={t.etapa} etapaInterna={t.etapaInterna} compact />
                  </div>
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

                <div className="flex items-center justify-end gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {aprobada?.proyecto && (
                    <Link href={`/proyectos/${aprobada.proyecto.id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-[10px] font-medium px-2 py-1 rounded-md border border-[#1e1e1e] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/40 hover:bg-[#B3985B]/10 transition-all whitespace-nowrap">
                      Proyecto →
                    </Link>
                  )}
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded-md text-green-700/80 hover:text-green-400 hover:bg-green-500/10 transition-all" title="WhatsApp">
                      <WaIcon />
                    </a>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); eliminar(t.id, t.cliente.nombre); }}
                    disabled={deletingId === t.id}
                    className="p-1.5 rounded-md text-[#555] hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40" title="Eliminar">
                    {deletingId === t.id ? (
                      <span className="text-[10px] font-medium">...</span>
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
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

// ── Indicador del sub-proceso comercial de cada trato ───────────────────────────
function SubProcesoChips({ t }: { t: Trato }) {
  const chips: { label: string; cls: string }[] = [];

  // Seguimientos registrados (solo relevante en prospección)
  if (t.etapa === 'LEAD') {
    let hechos = 0, max = 3;
    try {
      const nd = t.nurturingData ? JSON.parse(t.nurturingData) : null;
      if (nd?.seguimientos) hechos = nd.seguimientos.length;
      if (nd?.maxSeguimientos) max = nd.maxSeguimientos;
    } catch { /* noop */ }
    if (hechos > 0) chips.push({ label: `📌 ${hechos}/${max} seg.`, cls: 'text-amber-400/80 bg-amber-900/15' });
  }

  // Formulario contestado por el cliente
  if (t.formEstado === 'COMPLETADO') {
    chips.push({ label: '📥 Formulario contestado', cls: 'text-[#B3985B] bg-[#B3985B]/10' });
  }

  // Estado del descubrimiento
  if (t.descubrimientoCompleto) {
    chips.push({ label: '🔍 Descubrimiento ✓', cls: 'text-emerald-400/80 bg-emerald-900/15' });
  } else if (['OPORTUNIDAD', 'VENTA_CERRADA'].includes(t.etapa)) {
    chips.push({ label: '🔍 Descubrimiento pendiente', cls: 'text-red-400/80 bg-red-900/15' });
  }

  // Quién hizo el descubrimiento
  if (t.modoDescubrimiento === 'CLIENTE') {
    chips.push({ label: '👤 Lo llenó el cliente', cls: 'text-blue-400/70 bg-blue-900/15' });
  }

  // Preferencia de contacto declarada por el cliente
  if (t.preferenciaContacto === 'LLAMADA') {
    chips.push({ label: '📞 Pidió llamada', cls: 'text-violet-400/70 bg-violet-900/15' });
  } else if (t.preferenciaContacto === 'PROPUESTA') {
    chips.push({ label: '⚡ Pidió propuesta', cls: 'text-violet-400/70 bg-violet-900/15' });
  }

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1 pl-3">
      {chips.map((c, i) => (
        <span key={i} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${c.cls}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

// ── Compact Trato Row — Rediseño ────────────────────────────────────────────────
function CompactTratoRow({
  trato: t,
  onEliminar,
  onCambiarEtapa,
  onCambiarServicio,
  onQuickNote,
  onCambiarResponsable,
  deletingId,
  isExpanded,
  onToggle,
  usuarios,
}: {
  trato: Trato;
  onEliminar: () => void;
  onCambiarEtapa: (nuevaEtapa: string) => void;
  onCambiarServicio: (servicio: string | null) => void;
  onQuickNote: () => void;
  onCambiarResponsable: (responsableId: string | null) => void;
  deletingId: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const wa = waUrl(t);
  const [respOpen, setRespOpen] = useState(false);
  const respRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown responsable al click fuera
  useEffect(() => {
    if (!respOpen) return;
    const handler = (e: MouseEvent) => {
      if (respRef.current && !respRef.current.contains(e.target as Node)) setRespOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [respOpen]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getSeguimientoBadge = (fecha: string | null) => {
    if (!fecha) return { label: 'Sin seguimiento', variant: 'none' as const };
    const diff = Math.floor((new Date(fecha).getTime() - Date.now()) / 86400000);
    if (diff < 0)  return { label: `Vencido ${Math.abs(diff)}d`, variant: 'danger' as const };
    if (diff === 0) return { label: 'Hoy',                        variant: 'today' as const };
    if (diff <= 3)  return { label: fmtFechaCorta(fecha),         variant: 'soon' as const };
    return           { label: fmtFechaCorta(fecha),               variant: 'ok' as const };
  };

  function fmtFechaCorta(iso: string) {
    return new Date(iso.substring(0, 10) + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }

  // Fecha completa del evento
  const fechaCompletaEvento = t.fechaEventoEstimada
    ? new Date(t.fechaEventoEstimada.substring(0, 10) + 'T12:00:00Z').toLocaleDateString('es-MX', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
      })
    : null;

  // Proyecto vinculado
  const proyectoVinculado = t.cotizaciones.find(c => c.proyecto)?.proyecto ?? null;
  const nombreProyecto = proyectoVinculado?.nombre ?? t.nombreEvento ?? null;


  const ETAPA_STYLE: Record<string, { dot: string; text: string; bg: string }> = {
    LEAD:           { dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-900/20' },
    DESCUBRIMIENTO: { dot: 'bg-blue-400',    text: 'text-blue-400',    bg: 'bg-blue-900/20' },
    OPORTUNIDAD:    { dot: 'bg-violet-400',  text: 'text-violet-400',  bg: 'bg-violet-900/20' },
    VENTA_CERRADA:  { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-900/20' },
    VENTA_PERDIDA:  { dot: 'bg-red-400',     text: 'text-red-400',     bg: 'bg-red-900/20' },
  };
  const SEG_VARIANT_CLS: Record<string, string> = {
    none:   'text-[#333]',
    danger: 'text-red-400 bg-red-900/15 px-2 py-0.5 rounded-md',
    today:  'text-yellow-400 bg-yellow-900/15 px-2 py-0.5 rounded-md',
    soon:   'text-amber-400/80 bg-amber-900/10 px-2 py-0.5 rounded-md',
    ok:     'text-[#555] bg-[#181818] px-2 py-0.5 rounded-md',
  };

  const tipoStyle = TIPO_BADGE[t.tipoEvento] ?? TIPO_BADGE.OTRO;
  const etapaStyle = ETAPA_STYLE[t.etapa] ?? { dot: 'bg-gray-600', text: 'text-gray-500', bg: 'bg-gray-800/20' };
  const seg = getSeguimientoBadge(t.fechaProximaAccion);

  return (
    <>
      <div className="group flex items-center border-b border-[#0f0f0f] last:border-0 hover:bg-[#0b0b0b] transition-colors">

        {/* ── Toggle ──────────────────────────────────────── */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="shrink-0 w-10 self-stretch flex items-center justify-center text-[#252525] hover:text-gray-500 transition-colors"
          title="Ver cotizaciones"
        >
          <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* ── COL 1 · Cliente + Empresa  ─── flex-[3] ──── */}
        <div
          className="flex-[3] min-w-0 py-3 pr-4 cursor-pointer"
          onClick={() => router.push(`/crm/tratos/${t.id}`)}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tipoStyle.dot}`} />
            <span className="text-[14px] text-white font-semibold leading-tight truncate">
              {t.cliente.nombre}
            </span>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="shrink-0 text-green-700 hover:text-green-400 transition-colors"
                title="WhatsApp"
              >
                <WaIcon />
              </a>
            )}
          </div>
          {t.cliente.empresa && (
            <p className="text-[11px] text-[#444] mt-0.5 truncate pl-3">{t.cliente.empresa}</p>
          )}
          <SubProcesoChips t={t} />
        </div>

        {/* ── COL 2 · Proyecto / Evento ─── flex-[2] ──── */}
        <div
          className="hidden lg:block flex-[2] min-w-0 pr-4 cursor-pointer"
          onClick={() => router.push(`/crm/tratos/${t.id}`)}
        >
          {nombreProyecto ? (
            <p className="text-[12px] text-[#666] truncate">{nombreProyecto}</p>
          ) : (
            <span className="text-[11px] text-[#2a2a2a]">&mdash;</span>
          )}
        </div>

        {/* ── COL 3 · Fecha del evento ─── 130px ───── */}
        <div className="hidden md:block w-[130px] shrink-0 pr-4">
          {fechaCompletaEvento ? (
            <span className="text-[12px] text-[#777] font-medium capitalize leading-tight block truncate">
              {fechaCompletaEvento}
            </span>
          ) : (
            <span className="text-[11px] text-[#2a2a2a]">&mdash;</span>
          )}
        </div>

        {/* ── COL 3b · Tipo de servicio ─── 85px ────── */}
        <div className="hidden md:block w-[85px] shrink-0 pr-3" onClick={e => e.stopPropagation()}>
          <select
            value={t.tipoServicio ?? ''}
            onChange={e => onCambiarServicio(e.target.value || null)}
            onClick={e => e.stopPropagation()}
            className="w-full bg-transparent border-none text-[11px] focus:outline-none cursor-pointer text-[#555] hover:text-gray-300 transition-colors"
            title="Tipo de servicio"
          >
            <option value="" className="bg-[#111] text-[#555]">—</option>
            <option value="PRODUCCION_TECNICA" className="bg-[#111] text-white">Producción</option>
            <option value="RENTA" className="bg-[#111] text-white">Renta</option>
            <option value="DIRECCION_TECNICA" className="bg-[#111] text-white">Dirección</option>
          </select>
        </div>

        {/* ── COL 4 · Tipo evento ─────── 90px ────── */}
        <div className="hidden sm:flex w-[90px] shrink-0 pr-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${tipoStyle.bg} ${tipoStyle.text}`}>
            {TIPO_LABEL_SHORT[t.tipoEvento] ?? t.tipoEvento}
          </span>
        </div>

        {/* ── COL 5 · Responsable ─────── 110px ────── */}
        <div
          ref={respRef}
          className="hidden lg:flex w-[110px] shrink-0 pr-3 items-center relative"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setRespOpen(o => !o)}
            className="flex items-center gap-1 text-[11px] text-[#444] hover:text-gray-300 transition-colors truncate max-w-full"
            title="Cambiar responsable"
          >
            {t.responsable ? (
              <>
                <span className="w-4 h-4 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 flex items-center justify-center text-[8px] text-[#B3985B] shrink-0 font-bold">
                  {t.responsable.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{t.responsable.name.split(' ')[0]}</span>
              </>
            ) : (
              <span className="text-[#2a2a2a] text-[11px] hover:text-[#555] transition-colors">— asignar</span>
            )}
          </button>
          {respOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-[#111] border border-[#2a2a2a] rounded-xl shadow-xl overflow-hidden min-w-[140px]">
              {t.responsable && (
                <button
                  onClick={() => { onCambiarResponsable(null); setRespOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-red-500/70 hover:bg-[#1a1a1a] transition-colors border-b border-[#1e1e1e]"
                >
                  Sin asignar
                </button>
              )}
              {usuarios.map(u => (
                <button
                  key={u.id}
                  onClick={() => { onCambiarResponsable(u.id); setRespOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#1a1a1a] transition-colors flex items-center gap-2 ${
                    t.responsable?.id === u.id ? 'text-[#B3985B]' : 'text-gray-400'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#B3985B]/15 border border-[#B3985B]/20 flex items-center justify-center text-[8px] text-[#B3985B] shrink-0 font-bold">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{u.name}</span>
                  {t.responsable?.id === u.id && <span className="ml-auto text-[9px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── COL 6 · Seguimiento ─────── 110px ────── */}
        <div className="hidden lg:flex w-[110px] shrink-0 pr-3 items-center">
          {seg.variant === 'none' ? (
            <button
              onClick={e => { e.stopPropagation(); onQuickNote(); }}
              className="text-[10px] text-[#2a2a2a] hover:text-[#B3985B] border border-[#1e1e1e] hover:border-[#B3985B]/30 rounded-md px-2 py-0.5 transition-colors whitespace-nowrap"
            >
              + Agendar
            </button>
          ) : (
            <span className={`text-[11px] ${SEG_VARIANT_CLS[seg.variant]}`}>
              {seg.label}
            </span>
          )}
        </div>

        {/* ── COL 7 · Etapa ───────────── 130px ────── */}
        <div className="hidden sm:flex items-center gap-1.5 w-[130px] shrink-0 pr-3">
          <span className={`w-2 h-2 rounded-full shrink-0 ${etapaStyle.dot}`} />
          <select
            value={t.etapa}
            onChange={e => { e.stopPropagation(); onCambiarEtapa(e.target.value); }}
            onClick={e => e.stopPropagation()}
            className={`flex-1 min-w-0 bg-transparent border-none text-[11px] focus:outline-none cursor-pointer transition-colors ${etapaStyle.text}`}
            title="Cambiar etapa"
          >
            {ALL_ETAPAS.filter(e => e.key !== 'TODOS').map(e => (
              <option key={e.key} value={e.key} className="bg-[#111] text-white">{e.label}</option>
            ))}
          </select>
        </div>

        {/* ── COL 8 · Acciones (hover) ── auto ───────────── */}
        <div className="flex items-center justify-end gap-1.5 w-auto shrink-0 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onQuickNote(); }}
            className="text-[10px] font-medium px-2 py-1 rounded-md border border-[#1e1e1e] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/40 hover:bg-[#B3985B]/10 transition-all whitespace-nowrap"
            title="Seguimiento"
          >
            + Nota
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEliminar(); }}
            disabled={deletingId === t.id}
            className="p-1.5 rounded-md text-[#555] hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40"
            title="Eliminar"
          >
            {deletingId === t.id ? (
              <span className="text-[10px] font-medium">...</span>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            )}
          </button>
        </div>
      </div>

      {isExpanded && <CotizacionesSublista trato={t} />}
    </>
  );
}

// ── ResizeHandle: divisor invisible que activa cursor col-resize al hover ──────
function ResizeHandle({ onResize, onReset }: { onResize: (dx: number) => void; onReset: () => void }) {
  const dragging = useRef(false);
  const startX = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      onResize(ev.clientX - startX.current);
      startX.current = ev.clientX;
    };
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onReset}
      className="absolute right-0 top-0 h-full w-3 cursor-col-resize flex items-center justify-center group/handle z-10"
      title="Arrastra para redimensionar · Doble click para restablecer"
    >
      <div className="w-px h-3/4 bg-[#2a2a2a] opacity-0 group-hover/handle:opacity-100 transition-opacity rounded-full" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ORIGEN_COLORS: Record<string, string> = {
  META_ADS:       'bg-blue-900/40 text-blue-400 border-blue-700/30',
  REDES_SOCIALES: 'bg-pink-900/40 text-pink-400 border-pink-700/30',
  REFERIDO:       'bg-yellow-900/40 text-yellow-400 border-yellow-700/30',
  PROSPECCION:    'bg-[#B3985B]/10 text-[#B3985B] border-[#B3985B]/30',
  RECOMPRA:       'bg-emerald-900/40 text-emerald-400 border-emerald-700/30',
  // Legacy — mantener por datos existentes
  GOOGLE_ADS: 'bg-sky-900/30 text-sky-600 border-sky-900/20',
  ORGANICO:   'bg-emerald-900/20 text-emerald-700 border-emerald-900/20',
  OTRO:       'bg-gray-800/50 text-gray-600 border-gray-700/20',
  MANUAL:     'bg-gray-800/50 text-gray-600 border-gray-700/20',
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
            <div key={t.id} className="ms-stat-card hover:border-[#2a2a2a] transition-all">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-white font-medium text-sm">{t.cliente.nombre}</p>
                  {t.cliente.empresa && <p className="text-gray-500 text-xs">{t.cliente.empresa}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ORIGEN_COLORS[t.origenLead] ?? ORIGEN_COLORS.OTRO}`}>
                    {ORIGEN_LEAD_LABELS[t.origenLead] ?? t.origenLead}
                  </span>
                  {t.momentoContratacion && MOMENTO_LABELS[t.momentoContratacion] && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${MOMENTO_COLORS[t.momentoContratacion] ?? ""}`}>
                      {MOMENTO_LABELS[t.momentoContratacion]}
                    </span>
                  )}
                  {t.posibleDuplicado && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 font-medium" title="Posible duplicado — revisar">
                      ⚠ duplicado
                    </span>
                  )}
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
                      <span>{new Date(t.fechaProximaAccion.substring(0, 10) + 'T12:00:00Z').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-600">Sin seguimiento</span>
                  )}
                  <span className="text-[10px] text-gray-600">{diasRegistrado}d</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onAbrirPopover(t.id)}
                    className="text-[10px] font-medium px-2 py-1 rounded-md border border-[#1e1e1e] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/40 hover:bg-[#B3985B]/10 transition-all whitespace-nowrap"
                  >
                    Seguimiento ✓
                  </button>
                  <button
                    onClick={() => onConvertirOportunidad(t)}
                    className="text-[10px] font-medium px-2 py-1 rounded-md border border-emerald-800/30 text-emerald-500/80 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all whitespace-nowrap"
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

  const toast = useToast();
  const confirm = useConfirm();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

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
  const [modalCandado, setModalCandado] = useState<{
    tipo: 'perdida' | 'cierre' | null;
    tratoId: string;
    motivoPerdida: string;
    motivoPerdidaOtro: string;
    montoFinal: string;
  } | null>(null);

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
    // Sync fechaProximaAccion primero (limpia seguimientos vencidos borrados) → luego carga datos frescos
    const load = async () => {
      try { await fetch("/api/admin/sync-fechas", { method: "POST" }); } catch { /* ignore */ }
      const data = await fetch("/api/tratos").then(r => r.json());
      setTratos(data.tratos ?? []);
      setLoading(false);
    };
    load();
    fetch("/api/usuarios-activos").then(r => r.json()).then(d => setUsuarios(d.usuarios ?? []));
  }, []);

  async function cambiarResponsable(tratoId: string, responsableId: string | null) {
    // Optimistic update
    setTratos(prev => prev.map(t => {
      if (t.id !== tratoId) return t;
      const u = responsableId ? usuarios.find(u => u.id === responsableId) ?? null : null;
      return { ...t, responsable: u ? { id: u.id, name: u.name } : null };
    }));
    await fetch(`/api/tratos/${tratoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responsableId: responsableId ?? null }),
    });
  }

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

  async function ejecutarCambioEtapa(tratoId: string, nuevaEtapa: string, extras: Record<string, unknown> = {}) {
    setTratos(prev => prev.map(t => t.id === tratoId ? { ...t, etapa: nuevaEtapa } : t));
    try {
      const res = await fetch(`/api/tratos/${tratoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa: nuevaEtapa, ...extras }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Error al cambiar etapa');
        const refreshed = await fetch('/api/tratos').then(r => r.json());
        setTratos(refreshed.tratos ?? []);
        return;
      }
      toast.success(`Movido a ${ETAPA_LABELS[nuevaEtapa] ?? nuevaEtapa}`);
    } catch {
      toast.error('Error al cambiar etapa');
      const refreshed = await fetch('/api/tratos').then(r => r.json());
      setTratos(refreshed.tratos ?? []);
    }
  }

  async function cambiarEtapa(tratoId: string, nuevaEtapa: string) {
    if (nuevaEtapa === 'VENTA_PERDIDA') {
      setModalCandado({ tipo: 'perdida', tratoId, motivoPerdida: '', motivoPerdidaOtro: '', montoFinal: '' });
      return;
    }
    if (nuevaEtapa === 'VENTA_CERRADA') {
      setModalCandado({ tipo: 'cierre', tratoId, motivoPerdida: '', motivoPerdidaOtro: '', montoFinal: '' });
      return;
    }
    await ejecutarCambioEtapa(tratoId, nuevaEtapa, {});
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
    if (filtroEtapa === 'FORMULARIOS') {
      const qf = busqueda.toLowerCase();
      const matchBf = !qf || t.cliente.nombre.toLowerCase().includes(qf) || (t.cliente.empresa ?? '').toLowerCase().includes(qf) || (t.nombreEvento ?? '').toLowerCase().includes(qf);
      return matchBf && t.formEstado === 'COMPLETADO';
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
    const d = new Date(fecha.substring(0, 10) + "T12:00:00Z");
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

  const getTratoValor = (t: Trato) => {
    // Ignorar tratos cuyo evento ya pasó
    if (t.fechaEventoEstimada) {
      const hoyStr = new Date().toISOString().split('T')[0];
      if (t.fechaEventoEstimada.substring(0, 10) < hoyStr) return 0;
    }
    const cots = t.cotizaciones ?? [];
    const ap = cots.find(c => c.estado === "APROBADA");
    if (ap) return ap.granTotal;
    const en = cots.find(c => c.estado === "ENVIADA" || c.estado === "REENVIADA");
    if (en) return en.granTotal;
    if (cots.length > 0) return cots[0].granTotal;
    return t.presupuestoEstimado ?? 0;
  };

  const fmtM = (n: number) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Pipeline de Ventas</h1>
          <p className="ms-subtitle">
            {loading ? "Cargando..." : `${tratosProximos.length} próximos${tratosArchivados.length > 0 ? ` · ${tratosArchivados.length} archivados` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#111] border border-[#1e1e1e] rounded-lg p-0.5">
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
          className="ms-input-search" />
        {busqueda && (
          <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white text-xs">✕</button>
        )}
      </div>

      {/* ── Vista Lista ── */}
      {vista === "lista" && (
        <div className="space-y-4">

          {/* ── Dashboard resumen del pipeline ── */}
          {(() => {
            const activos = tratos.filter(t => !['VENTA_CERRADA', 'VENTA_PERDIDA'].includes(t.etapa));
            const cerradas = tratos.filter(t => t.etapa === 'VENTA_CERRADA');
            const perdidas = tratos.filter(t => t.etapa === 'VENTA_PERDIDA');
            const sinSeguimiento = activos.filter(t => !t.fechaProximaAccion);
            const hoyStr = new Date().toISOString().split('T')[0];
            const vencidos = activos.filter(t => t.fechaProximaAccion && t.fechaProximaAccion < hoyStr);
            const valorPipeline = activos.reduce((s, t) => s + getTratoValor(t), 0);
            const valorCerrado = cerradas.reduce((s, t) => s + getTratoValor(t), 0);
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-2 p-3 bg-[#080808] border border-[#141414] rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#444] font-semibold">Activos</span>
                  <span className="text-xl font-bold text-white tabular-nums">{activos.length}</span>
                  <span className="text-[10px] text-[#555]">{tratos.length} total</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#444] font-semibold">Valor pipeline</span>
                  <span className="text-xl font-bold text-[#B3985B] tabular-nums">{fmtM(valorPipeline)}</span>
                  <span className="text-[10px] text-[#555]">{activos.filter(t => t.presupuestoEstimado).length} con monto</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#444] font-semibold">Cerradas</span>
                  <span className="text-xl font-bold text-emerald-400 tabular-nums">{cerradas.length}</span>
                  <span className="text-[10px] text-[#555]">{valorCerrado > 0 ? fmtM(valorCerrado) : '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#444] font-semibold">Perdidas</span>
                  <span className="text-xl font-bold text-red-400/70 tabular-nums">{perdidas.length}</span>
                  <span className="text-[10px] text-[#555]">
                    {tratos.length > 0 ? `${Math.round((cerradas.length / Math.max(cerradas.length + perdidas.length, 1)) * 100)}% cierre` : '—'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#444] font-semibold">Sin seguimiento</span>
                  <span className={`text-xl font-bold tabular-nums ${sinSeguimiento.length > 0 ? 'text-orange-400' : 'text-[#333]'}`}>{sinSeguimiento.length}</span>
                  <span className="text-[10px] text-[#555]">de activos</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#444] font-semibold">Vencidos</span>
                  <span className={`text-xl font-bold tabular-nums ${vencidos.length > 0 ? 'text-red-400' : 'text-[#333]'}`}>{vencidos.length}</span>
                  <span className="text-[10px] text-[#555]">seguim. vencidos</span>
                </div>
              </div>
            );
          })()}

          {/* ── Pipeline — Funnel visual ── */}
          {(() => {
            const all = tratos;
            const pipeline = [
              {
                filter: 'TODOS',
                label: 'Todos',
                count: all.length,
                valor: all.reduce((s, t) => s + getTratoValor(t), 0),
                color: '#6B7280',
                activeGrad: 'from-gray-800/60 to-gray-900/40',
                activeBorder: 'border-gray-600/40',
                activeDot: 'bg-gray-400',
                inactiveDot: 'bg-gray-700',
              },
              {
                filter: 'LEAD',
                label: 'Prospección',
                count: all.filter(t => t.etapa === 'LEAD').length,
                valor: all.filter(t => t.etapa === 'LEAD').reduce((s, t) => s + getTratoValor(t), 0),
                color: '#F59E0B',
                activeGrad: 'from-amber-900/50 to-amber-950/30',
                activeBorder: 'border-amber-500/40',
                activeDot: 'bg-amber-400',
                inactiveDot: 'bg-amber-900/60',
              },
              {
                filter: 'DESCUBRIMIENTO',
                label: 'Descubrimiento',
                count: all.filter(t => t.etapa === 'DESCUBRIMIENTO').length,
                valor: all.filter(t => t.etapa === 'DESCUBRIMIENTO').reduce((s, t) => s + getTratoValor(t), 0),
                color: '#3B82F6',
                activeGrad: 'from-blue-900/50 to-blue-950/30',
                activeBorder: 'border-blue-500/40',
                activeDot: 'bg-blue-400',
                inactiveDot: 'bg-blue-900/60',
              },
              {
                filter: 'OPORTUNIDAD',
                label: 'Oportunidad',
                count: all.filter(t => t.etapa === 'OPORTUNIDAD').length,
                valor: all.filter(t => t.etapa === 'OPORTUNIDAD').reduce((s, t) => s + getTratoValor(t), 0),
                color: '#8B5CF6',
                activeGrad: 'from-violet-900/50 to-violet-950/30',
                activeBorder: 'border-violet-500/40',
                activeDot: 'bg-violet-400',
                inactiveDot: 'bg-violet-900/60',
              },
              {
                filter: 'VENTA_CERRADA',
                label: 'Cerradas',
                count: all.filter(t => t.etapa === 'VENTA_CERRADA').length,
                valor: all.filter(t => t.etapa === 'VENTA_CERRADA').reduce((s, t) => s + getTratoValor(t), 0),
                activeCount: all.filter(t => !['VENTA_CERRADA', 'VENTA_PERDIDA'].includes(t.etapa)).length,
                color: '#10B981',
                activeGrad: 'from-emerald-900/50 to-emerald-950/30',
                activeBorder: 'border-emerald-500/40',
                activeDot: 'bg-emerald-400',
                inactiveDot: 'bg-emerald-900/60',
              },
              {
                filter: 'VENTA_PERDIDA',
                label: 'Perdidas',
                count: all.filter(t => t.etapa === 'VENTA_PERDIDA').length,
                valor: all.filter(t => t.etapa === 'VENTA_PERDIDA').reduce((s, t) => s + getTratoValor(t), 0),
                color: '#EF4444',
                activeGrad: 'from-red-900/40 to-red-950/30',
                activeBorder: 'border-red-500/30',
                activeDot: 'bg-red-400',
                inactiveDot: 'bg-red-900/50',
              },
            ];
            const maxCount = Math.max(...pipeline.slice(1).map(p => p.count), 1);
            return (
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5 mb-5">
                {pipeline.map((card, idx) => {
                  const isActive = filtroEtapa === card.filter;
                  const pct = idx === 0 ? 100 : Math.max(4, Math.round((card.count / maxCount) * 100));
                  return (
                    <button
                      key={card.filter}
                      onClick={() => setFiltroEtapa(card.filter)}
                      className={`relative flex flex-col items-start px-3 pt-3 pb-2.5 rounded-xl border text-left transition-all overflow-hidden ${
                        isActive
                          ? `bg-gradient-to-b ${card.activeGrad} ${card.activeBorder} shadow-sm`
                          : 'bg-[#0d0d0d] border-[#181818] hover:border-[#252525] hover:bg-[#111]'
                      }`}
                    >
                      {/* Funnel fill bar — bottom aligned */}
                      {idx > 0 && (
                        <div
                          className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
                            isActive ? card.inactiveDot.replace('bg-', 'bg-').replace('/60', '/20') : 'bg-white/[0.025]'
                          }`}
                          style={{ height: `${pct}%`, opacity: isActive ? 0.3 : 0.15 }}
                        />
                      )}
                      <div className="relative z-10 w-full">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? card.activeDot : card.inactiveDot}`} />
                          <span className={`text-[10px] font-medium uppercase tracking-wider truncate ${
                            isActive ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {card.label}
                          </span>
                        </div>
                        <p className={`text-2xl font-bold tabular-nums leading-none ${
                          isActive
                            ? 'text-white'
                            : card.count > 0 ? 'text-gray-400' : 'text-[#2a2a2a]'
                        }`}>
                          {card.count}
                        </p>
                        {card.valor !== undefined && card.valor > 0 && (
                          <p className={`text-[10px] mt-1.5 font-bold tabular-nums ${
                            isActive ? 'text-[#B3985B]' : 'text-[#B3985B]/60'
                          }`}>
                            {fmtM(card.valor)}
                          </p>
                        )}
                        {'activeCount' in card && card.activeCount !== undefined && (
                          <p className={`text-[9px] mt-0.5 tabular-nums ${
                            isActive ? 'text-emerald-400/60' : 'text-[#333]'
                          }`}>
                            {card.activeCount} activos
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Bandeja: formularios contestados por el cliente ── */}
          {(() => {
            const contestados = tratos.filter(t => t.formEstado === 'COMPLETADO');
            if (contestados.length === 0) return null;
            const activo = filtroEtapa === 'FORMULARIOS';
            return (
              <button
                onClick={() => setFiltroEtapa(activo ? 'TODOS' : 'FORMULARIOS')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl border text-left transition-all ${
                  activo
                    ? 'bg-gradient-to-r from-[#B3985B]/20 to-[#B3985B]/5 border-[#B3985B]/50'
                    : 'bg-[#0d0d0d] border-[#181818] hover:border-[#B3985B]/30'
                }`}
              >
                <span className="text-lg">📥</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${activo ? 'text-[#B3985B]' : 'text-white'}`}>
                    Formularios contestados
                  </p>
                  <p className="text-[11px] text-gray-500">Descubrimientos que el cliente ya completó · listos para cotizar</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold tabular-nums shrink-0 ${
                  activo ? 'bg-[#B3985B] text-black' : 'bg-[#B3985B]/20 text-[#B3985B]'
                }`}>
                  {contestados.length}
                </span>
              </button>
            );
          })()}

          {/* ── Filtro tipo de evento ── */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] text-[#555] uppercase tracking-wider font-medium">Tipo:</span>
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
            <span className="text-[10px] text-[#555] uppercase tracking-wider font-medium shrink-0">Orden:</span>
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
                    return calcularUrgencia(b) - calcularUrgencia(a);
                  }
                }
              });

            if (tabTratos.length === 0) {
              return (
                <div className="text-center py-20 text-[#555]">
                  <p className="text-3xl mb-3">📭</p>
                  <p className="text-sm">
                    {busqueda ? `Sin resultados para "${busqueda}"` : `No hay tratos en ${ALL_ETAPAS.find(e => e.key === filtroEtapa)?.label ?? filtroEtapa}`}
                  </p>
                </div>
              );
            }

            // ── Agrupación por mes con separación de pasados del mes actual ──
            {
              const { all } = groupTratosByMes(tabTratos, ordenTrato);

              const renderRow = (t: Trato) => (
                <CompactTratoRow
                  key={t.id}
                  trato={t}
                  onEliminar={() => eliminar(t.id, t.cliente.nombre)}
                  onCambiarEtapa={nuevaEtapa => cambiarEtapa(t.id, nuevaEtapa)}
                  onCambiarServicio={async (servicio) => {
                    setTratos(prev => prev.map(x => x.id === t.id ? { ...x, tipoServicio: servicio } : x));
                    await fetch(`/api/tratos/${t.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tipoServicio: servicio }),
                    });
                  }}
                  onCambiarResponsable={uid => cambiarResponsable(t.id, uid)}
                  onQuickNote={() => { setQuickNoteId(t.id); setQuickNoteText(''); }}
                  deletingId={deletingId}
                  isExpanded={expandedRowId === t.id}
                  onToggle={() => setExpandedRowId(expandedRowId === t.id ? null : t.id)}
                  usuarios={usuarios}
                />
              );

              type MesGroup = ReturnType<typeof groupTratosByMes>['all'][0];

              // ── Header de columnas siempre visible ────────────────────────────
              const colHeader = (
                <div className="hidden md:flex items-center border-b border-[#0f0f0f] bg-[#0a0a0a] px-0 py-2 mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#333]">
                  <div className="w-10 shrink-0" />
                  <div className="flex-[3] min-w-0 pr-4">Cliente</div>
                  <div className="hidden lg:block flex-[2] min-w-0 pr-4">Proyecto / Evento</div>
                  <div className="w-[130px] shrink-0 pr-4">Fecha evento</div>
                  <div className="hidden md:block w-[85px] shrink-0 pr-3">Servicio</div>
                  <div className="hidden sm:block w-[90px] shrink-0 pr-3">Tipo</div>
                  <div className="hidden lg:block w-[110px] shrink-0 pr-3">Responsable</div>
                  <div className="hidden lg:block w-[110px] shrink-0 pr-3">Seguimiento</div>
                  <div className="hidden sm:block w-[130px] shrink-0 pr-3">Etapa</div>
                  <div className="w-[72px] shrink-0" />
                </div>
              );

              const renderGroup = (g: MesGroup) => {
                const isPastMonth = g.isPast;
                const isIntraPast = !!(g as MesGroup & { isIntraMonthPast?: boolean }).isIntraMonthPast;

                return (
                  <div key={g.yearMonth}>
                    {/* ── Encabezado de grupo ───────────────────────────────── */}
                    <div className={`flex items-center gap-3 mb-2 px-1 ${
                      isPastMonth ? 'opacity-50' : isIntraPast ? 'opacity-70' : ''
                    }`}>
                      {isIntraPast ? (
                        /* Pasados del mes actual — separador especial */
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-700 shrink-0" />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-600 whitespace-nowrap">
                            {g.label}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-800/80 text-gray-600 border border-gray-700/30 uppercase tracking-wider">
                            {g.tratos.length} evento{g.tratos.length !== 1 ? 's' : ''} pasado{g.tratos.length !== 1 ? 's' : ''}
                          </span>
                        </>
                      ) : (
                        /* Mes futuro o pasado anterior */
                        <>
                          <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] capitalize ${
                            isPastMonth ? 'text-gray-700' : 'text-gray-500'
                          }`}>
                            {g.label}
                          </span>
                          <span className="text-[9px] text-gray-700 tabular-nums">
                            {g.tratos.length}
                          </span>
                          {isPastMonth && (
                            <span className="text-[9px] text-gray-800 uppercase tracking-wider">archivado</span>
                          )}
                        </>
                      )}
                      <div className={`flex-1 border-t ${
                        isIntraPast ? 'border-[#1a1a1a] border-dashed' :
                        isPastMonth ? 'border-[#111]' :
                        'border-[#1e1e1e]'
                      }`} />
                    </div>

                    {/* ── Tabla de tratos ───────────────────────────────────── */}

                    <div className={`rounded-xl border overflow-hidden ${
                      isIntraPast ? 'border-[#181818] opacity-60' :
                      isPastMonth ? 'border-[#141414] opacity-50' :
                      'border-[#1e1e1e]'
                    }`}>
                      {g.tratos.map(renderRow)}
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-6">
                  {colHeader}
                  {all.map(renderGroup)}
                </div>
              );
            }

          })()}
        </div>
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

      {/* ── Modal candado: Venta Perdida ── */}
      {modalCandado?.tipo === 'perdida' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-[#111] border border-red-900/50 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div>
              <h3 className="text-white font-semibold text-base">¿Por qué se perdió?</h3>
              <p className="text-[#555] text-xs mt-1">Requerido para marcar como Venta Perdida</p>
            </div>
            <div className="space-y-2">
              {(['SIN_PRESUPUESTO','ELIGIO_COMPETENCIA','FECHA_NO_DISPONIBLE','PROYECTO_CANCELADO','SIN_RESPUESTA','OTRO'] as const).map(m => (
                <button key={m}
                  onClick={() => setModalCandado(prev => prev ? { ...prev, motivoPerdida: m } : null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    modalCandado.motivoPerdida === m
                      ? 'bg-red-900/40 border border-red-500/50 text-red-300'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-red-900/40'
                  }`}>
                  {({ SIN_PRESUPUESTO: 'Sin presupuesto', ELIGIO_COMPETENCIA: 'Eligió competencia', FECHA_NO_DISPONIBLE: 'Fecha no disponible', PROYECTO_CANCELADO: 'Proyecto cancelado', SIN_RESPUESTA: 'Sin respuesta', OTRO: 'Otro motivo' } as Record<string,string>)[m]}
                </button>
              ))}
              {modalCandado.motivoPerdida === 'OTRO' && (
                <input
                  value={modalCandado.motivoPerdidaOtro}
                  onChange={e => setModalCandado(prev => prev ? { ...prev, motivoPerdidaOtro: e.target.value } : null)}
                  placeholder="Especifica el motivo..."
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalCandado(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
              <button
                disabled={!modalCandado.motivoPerdida || (modalCandado.motivoPerdida === 'OTRO' && !modalCandado.motivoPerdidaOtro.trim())}
                onClick={async () => {
                  const motivo = modalCandado.motivoPerdida === 'OTRO' ? modalCandado.motivoPerdidaOtro : modalCandado.motivoPerdida;
                  await ejecutarCambioEtapa(modalCandado.tratoId, 'VENTA_PERDIDA', { motivoPerdida: motivo });
                  setModalCandado(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-40 transition-colors">
                Confirmar pérdida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal candado: Venta Cerrada ── */}
      {modalCandado?.tipo === 'cierre' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-[#111] border border-emerald-900/50 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div>
              <h3 className="text-white font-semibold text-base">Monto final de cierre</h3>
              <p className="text-[#555] text-xs mt-1">Requerido para marcar como Venta Cerrada</p>
            </div>
            <div>
              <label className="text-xs text-[#6b7280] block mb-1">Monto final (MXN) *</label>
              <input
                type="number"
                value={modalCandado.montoFinal}
                onChange={e => setModalCandado(prev => prev ? { ...prev, montoFinal: e.target.value } : null)}
                placeholder="0.00"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalCandado(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
              <button
                disabled={!modalCandado.montoFinal || parseFloat(modalCandado.montoFinal) <= 0}
                onClick={async () => {
                  await ejecutarCambioEtapa(modalCandado.tratoId, 'VENTA_CERRADA', { montoFinal: parseFloat(modalCandado.montoFinal) });
                  setModalCandado(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 transition-colors">
                ✓ Cerrar venta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
