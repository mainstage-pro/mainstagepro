"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Usuario { id: string; name: string }

interface ProspeccionData {
  id: string;
  tipo: string;
  etapa: string;
  estado: string;
  tipoEvento: string;
  origen: string;
  notas: string | null;
  fechaProximoContacto: Date | null;
  contacto1Fecha: Date | null; contacto1Nota: string | null; contacto1Hecho: boolean;
  contacto2Fecha: Date | null; contacto2Nota: string | null; contacto2Hecho: boolean;
  contacto3Fecha: Date | null; contacto3Nota: string | null; contacto3Hecho: boolean;
  contacto4Fecha: Date | null; contacto4Nota: string | null; contacto4Hecho: boolean;
  contacto5Fecha: Date | null; contacto5Nota: string | null; contacto5Hecho: boolean;
  tipoServicioInteres: string | null;
  fechaEventoEstimada: Date | null;
  lugarEstimado: string | null;
  presupuestoAprox: number | null;
  notasEvento: string | null;
  cliente: {
    id: string; nombre: string; empresa: string | null; empresaId: string | null;
    telefono: string | null; correo: string | null; tipoCliente: string; clasificacion: string;
  };
  responsable: { id: string; name: string } | null;
  trato: { id: string; etapa: string; nombreEvento: string | null; createdAt: Date } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ETAPAS_ORDEN = [
  "SIN_ETAPA", "NUEVO_CONTACTO", "EN_SEGUIMIENTO",
  "INTERES_CONFIRMADO", "EN_EVALUACION", "LISTO_PARA_CERRAR",
] as const;

const ETAPA_LABELS: Record<string, string> = {
  SIN_ETAPA: "Sin Etapa", NUEVO_CONTACTO: "Nuevo Contacto", EN_SEGUIMIENTO: "En Seguimiento",
  INTERES_CONFIRMADO: "Interés Confirmado", EN_EVALUACION: "En Evaluación", LISTO_PARA_CERRAR: "Listo para Cerrar",
};
const ETAPA_DOT: Record<string, string> = {
  SIN_ETAPA: "#374151", NUEVO_CONTACTO: "#1e3a5f", EN_SEGUIMIENTO: "#1e40af",
  INTERES_CONFIRMADO: "#065f46", EN_EVALUACION: "#78350f", LISTO_PARA_CERRAR: "#b3985b",
};
const TIPO_EVENTO_LABELS: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", VARIOS: "Varios",
};
const ORIGEN_LABELS: Record<string, string> = {
  META_ADS: "Meta Ads", MANUAL: "Manual", REFERIDO: "Referido", RECOMPRA: "Recompra",
  ORGANICO: "Orgánico", NETWORKING: "Networking", REDES_SOCIALES: "Redes Sociales", OTRO: "Otro",
};
const TRATO_ETAPA_LABELS: Record<string, string> = {
  DESCUBRIMIENTO: "Descubrimiento", OPORTUNIDAD: "Oportunidad",
  VENTA_CERRADA: "Venta Cerrada", VENTA_PERDIDA: "Venta Perdida",
};
const SERVICIO_LABELS: Record<string, string> = {
  RENTA: "Renta de Equipo", PRODUCCION_TECNICA: "Producción Técnica", DIRECCION_TECNICA: "Dirección Técnica",
};

const CONTACTO_LABELS: Record<string, Record<string, { titulo: string; desc: string }>> = {
  MUSICAL:     {
    "1": { titulo: "Apertura", desc: "Presentarse, confirmar interés en producción para show/concierto" },
    "2": { titulo: "Descubrimiento", desc: "Rider técnico, venue, fecha, número de shows, aforo estimado" },
    "3": { titulo: "Calificación", desc: "¿Tienen presupuesto? ¿Ya tienen venue? ¿Otros proveedores?" },
    "4": { titulo: "Maduración", desc: "Mostrar casos de éxito similares, resolver dudas técnicas" },
    "5": { titulo: "Solicitud de cotización", desc: "Confirmar detalles técnicos finales → Generar cotización" },
  },
  SOCIAL:      {
    "1": { titulo: "Apertura", desc: "Conocer al cliente, confirmar fecha y tipo de celebración" },
    "2": { titulo: "Descubrimiento", desc: "Lista de invitados, estilo, venue, detalles de producción deseados" },
    "3": { titulo: "Calificación", desc: "¿Ya tienen venue? ¿Trabajan con planners? ¿Cuánto están dispuestos?" },
    "4": { titulo: "Maduración", desc: "Mostrar portafolio de bodas/eventos, generar confianza" },
    "5": { titulo: "Solicitud de cotización", desc: "Confirmar rider completo → Generar cotización" },
  },
  EMPRESARIAL: {
    "1": { titulo: "Apertura", desc: "Identificar al tomador de decisión, entender objetivo del evento" },
    "2": { titulo: "Descubrimiento", desc: "Presupuesto disponible, objetivos del evento, número de asistentes" },
    "3": { titulo: "Calificación", desc: "¿Hay proceso de licitación? ¿Quién aprueba? ¿Otras cotizaciones?" },
    "4": { titulo: "Maduración", desc: "Presentar casos corporativos, hablar de proceso y garantías" },
    "5": { titulo: "Solicitud de cotización", desc: "Confirmar alcance y requerimientos finales → Generar cotización" },
  },
  VARIOS:      {
    "1": { titulo: "Apertura", desc: "Primer vínculo. ¿Quién es? ¿Qué necesita? ¿Hay intención real?" },
    "2": { titulo: "Descubrimiento", desc: "Profundizar necesidades. Definir alcance del servicio." },
    "3": { titulo: "Calificación", desc: "Confirmar que es una oportunidad real. Descartar si no aplica." },
    "4": { titulo: "Maduración", desc: "Calentar al prospecto. Posicionarse como la opción correcta." },
    "5": { titulo: "Solicitud de cotización", desc: "El cliente pide o acepta recibir cotización." },
  },
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function toDateInput(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
}

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function formatCurrency(n: number | null): string {
  if (!n) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

// ─── ContactoStep ─────────────────────────────────────────────────────────────

function ContactoStep({
  n, tipoEvento, hecho, fecha, nota,
  onChange, isLast,
}: {
  n: number;
  tipoEvento: string;
  hecho: boolean; fecha: Date | null; nota: string | null;
  onChange: (field: "hecho" | "fecha" | "nota", val: unknown) => void;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(hecho || false);
  const labels = CONTACTO_LABELS[tipoEvento]?.[String(n)] ?? CONTACTO_LABELS.VARIOS[String(n)];
  const [localFecha, setLocalFecha] = useState(toDateInput(fecha));
  const [localNota, setLocalNota] = useState(nota ?? "");

  function handleHecho() {
    const newVal = !hecho;
    if (newVal && !fecha) onChange("fecha", new Date().toISOString());
    onChange("hecho", newVal);
    if (!expanded) setExpanded(true);
  }

  function handleSaveDetails() {
    onChange("fecha", localFecha || null);
    onChange("nota", localNota || null);
  }

  return (
    <div className={`relative flex gap-4 ${!isLast ? "pb-6" : ""}`}>
      {/* Line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-[#1e1e1e]" />
      )}

      {/* Circle */}
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border-2 transition-all z-10 mt-0.5 ${
        hecho
          ? "bg-[#B3985B] border-[#B3985B]"
          : isLast
          ? "bg-transparent border-[#B3985B]/40"
          : "bg-[#111] border-[#2a2a2a]"
      }`}>
        {hecho ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="black" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : (
          <span className="text-[10px] font-bold text-[#555]">{n}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex-1">
            <p className={`text-sm font-medium ${hecho ? "text-[#B3985B]" : "text-white"}`}>
              {n}. {labels.titulo}
              {n === 5 && !hecho && (
                <span className="ml-2 text-[9px] bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/30 px-1.5 py-0.5 rounded-full font-medium">
                  → Genera cotización
                </span>
              )}
            </p>
            <p className="text-[#555] text-xs mt-0.5">{labels.desc}</p>
          </div>
          {hecho && fecha && (
            <span className="text-[10px] text-[#555] shrink-0">{formatDate(fecha)}</span>
          )}
          <svg
            className={`text-[#333] transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={handleHecho}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                    hecho ? "bg-[#B3985B] border-[#B3985B]" : "bg-transparent border-[#444]"
                  }`}
                >
                  {hecho && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="black" strokeWidth="2" strokeLinecap="round"/></svg>}
                </div>
                <span className="text-xs text-[#ccc]">{hecho ? "Contacto realizado" : "Marcar como hecho"}</span>
              </label>
              <input
                type="date"
                value={localFecha}
                onChange={e => setLocalFecha(e.target.value)}
                onBlur={handleSaveDetails}
                className="flex-1 max-w-[160px] bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#B3985B]/50"
              />
            </div>
            <textarea
              value={localNota}
              onChange={e => setLocalNota(e.target.value)}
              onBlur={handleSaveDetails}
              rows={2}
              placeholder="Notas de este contacto..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50 resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProspeccionDetalle({
  prospeccion: initial,
  usuarios,
}: {
  prospeccion: ProspeccionData;
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [p, setP] = useState<ProspeccionData>(initial);
  const [generando, setGenerando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  // Auto-save on field change
  async function save(field: string, value: unknown) {
    const body: Record<string, unknown> = { [field]: value };
    await fetch(`/api/prospeccion/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function updateField<K extends keyof ProspeccionData>(field: K, value: ProspeccionData[K]) {
    setP(prev => ({ ...prev, [field]: value }));
    save(field as string, value);
  }

  async function handleContacto(n: number, field: "hecho" | "fecha" | "nota", val: unknown) {
    const key = `contacto${n}${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof ProspeccionData;
    setP(prev => ({ ...prev, [key]: val }));
    await fetch(`/api/prospeccion/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: val }),
    });
  }

  async function generarCotizacion() {
    if (!await confirm({
      message: "¿Generar cotización para este prospecto? Se creará un nuevo Trato y serás redirigido al formulario de cotización.",
      confirmText: "Generar cotización"
    })) return;

    setGenerando(true);
    try {
      const r = await fetch(`/api/prospeccion/${p.id}/generar-trato`, { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Error al generar");
      }
      const d = await r.json();
      toast.success("Trato creado correctamente");
      // Redirect to cotizacion form with tratoId + clienteId
      router.push(`/cotizaciones/nuevo?tratoId=${d.trato.id}&clienteId=${p.cliente.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al generar cotización");
      setGenerando(false);
    }
  }

  async function cancelarProspeccion() {
    if (!await confirm({
      message: "¿Cancelar esta prospección? El registro no se eliminará, pero desaparecerá de la lista activa.",
      danger: true, confirmText: "Cancelar prospección"
    })) return;
    setCancelando(true);
    try {
      await fetch(`/api/prospeccion/${p.id}/cancelar`, { method: "POST" });
      setP(prev => ({ ...prev, estado: "CANCELADO" }));
      toast.success("Prospección cancelada");
      router.push("/crm/prospeccion");
    } catch {
      toast.error("Error al cancelar");
    } finally {
      setCancelando(false);
    }
  }

  const etapaColors: Record<string, string> = {
    SIN_ETAPA: "#374151", NUEVO_CONTACTO: "#1e3a5f", EN_SEGUIMIENTO: "#1e40af",
    INTERES_CONFIRMADO: "#065f46", EN_EVALUACION: "#78350f", LISTO_PARA_CERRAR: "#b3985b",
  };

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-xs text-[#555]">
        <Link href="/crm/prospeccion" className="hover:text-white transition-colors">Prospección</Link>
        <span>/</span>
        <span className="text-[#888]">{p.cliente.nombre}</span>
      </div>

      {/* ── Header Card ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
              <span className="text-[#B3985B] text-lg font-bold">{p.cliente.nombre.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{p.cliente.nombre}</h1>
              {p.cliente.empresa && <p className="text-[#6b7280] text-sm mt-0.5">{p.cliente.empresa}</p>}
              <div className="flex items-center gap-4 mt-2">
                {p.cliente.telefono && (
                  <a href={`tel:${p.cliente.telefono}`} className="text-[#555] text-xs hover:text-white transition-colors flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.37 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {p.cliente.telefono}
                  </a>
                )}
                {p.cliente.correo && (
                  <a href={`mailto:${p.cliente.correo}`} className="text-[#555] text-xs hover:text-white transition-colors flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {p.cliente.correo}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {p.etapa === "LISTO_PARA_CERRAR" && p.estado !== "EN_TRATO" && p.estado !== "CONVERTIDO" && (
              <button
                onClick={generarCotizacion}
                disabled={generando}
                className="flex items-center gap-2 px-4 py-2 bg-[#B3985B] text-black text-sm font-semibold rounded-lg hover:bg-[#c9a96a] disabled:opacity-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                {generando ? "Generando…" : "Generar cotización"}
              </button>
            )}
            {p.estado !== "CANCELADO" && p.estado !== "CONVERTIDO" && (
              <button
                onClick={cancelarProspeccion}
                disabled={cancelando}
                className="px-3 py-2 text-xs text-[#555] border border-[#2a2a2a] rounded-lg hover:text-red-400 hover:border-red-900/40 disabled:opacity-50 transition-colors"
              >
                {cancelando ? "Cancelando…" : "Cancelar prospección"}
              </button>
            )}
            <Link href={`/crm/clientes/${p.cliente.id}`}
              className="px-3 py-2 text-xs text-[#555] border border-[#2a2a2a] rounded-lg hover:text-white hover:border-[#444] transition-colors">
              Ver cliente →
            </Link>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#1a1a1a]">
          {/* Etapa */}
          <div>
            <p className="text-[9px] text-[#444] uppercase tracking-wider mb-1.5">Etapa</p>
            <div className="relative">
              <select
                value={p.etapa}
                onChange={e => updateField("etapa", e.target.value)}
                className="w-full appearance-none bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]/50 cursor-pointer pr-6"
                style={{ borderLeftColor: etapaColors[p.etapa] ?? "#374151", borderLeftWidth: 3 }}
              >
                {ETAPAS_ORDEN.map(e => (
                  <option key={e} value={e}>{ETAPA_LABELS[e]}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          {/* Tipo evento */}
          <div>
            <p className="text-[9px] text-[#444] uppercase tracking-wider mb-1.5">Tipo de evento</p>
            <select
              value={p.tipoEvento}
              onChange={e => updateField("tipoEvento", e.target.value)}
              className="w-full appearance-none bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]/50 cursor-pointer"
            >
              {["MUSICAL","SOCIAL","EMPRESARIAL","VARIOS"].map(v => (
                <option key={v} value={v}>{TIPO_EVENTO_LABELS[v]}</option>
              ))}
            </select>
          </div>

          {/* Responsable */}
          <div>
            <p className="text-[9px] text-[#444] uppercase tracking-wider mb-1.5">Responsable</p>
            <Combobox
              value={p.responsable?.id ?? ""}
              onChange={v => {
                const found = usuarios.find(u => u.id === v) ?? null;
                setP(prev => ({ ...prev, responsable: found }));
                save("responsableId", v || null);
              }}
              options={[{ value: "", label: "Sin asignar" }, ...usuarios.map(u => ({ value: u.id, label: u.name.split(" ").slice(0, 2).join(" ") }))]}
              placeholder="Sin asignar"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]/50"
            />
          </div>

          {/* Origen */}
          <div>
            <p className="text-[9px] text-[#444] uppercase tracking-wider mb-1.5">Origen</p>
            <select
              value={p.origen}
              onChange={e => updateField("origen", e.target.value)}
              className="w-full appearance-none bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]/50 cursor-pointer"
            >
              {Object.entries(ORIGEN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Próximo contacto */}
        <div className="mt-4">
          <p className="text-[9px] text-[#444] uppercase tracking-wider mb-1.5">Próximo contacto</p>
          <input
            type="date"
            defaultValue={toDateInput(p.fechaProximoContacto)}
            onBlur={e => save("fechaProximoContacto", e.target.value || null)}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]/50"
          />
        </div>
      </div>

      {/* ── Ruta de Prospección ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Ruta de Prospección
        </h2>
        <div>
          {([
            { n: 1, hecho: p.contacto1Hecho, fecha: p.contacto1Fecha, nota: p.contacto1Nota },
            { n: 2, hecho: p.contacto2Hecho, fecha: p.contacto2Fecha, nota: p.contacto2Nota },
            { n: 3, hecho: p.contacto3Hecho, fecha: p.contacto3Fecha, nota: p.contacto3Nota },
            { n: 4, hecho: p.contacto4Hecho, fecha: p.contacto4Fecha, nota: p.contacto4Nota },
            { n: 5, hecho: p.contacto5Hecho, fecha: p.contacto5Fecha, nota: p.contacto5Nota },
          ] as const).map(({ n, hecho, fecha, nota }) => (
            <ContactoStep
              key={n}
              n={n}
              tipoEvento={p.tipoEvento}
              hecho={hecho}
              fecha={fecha}
              nota={nota}
              onChange={(field, val) => handleContacto(n, field, val)}
              isLast={n === 5}
            />
          ))}
        </div>

        {/* Generar cotización CTA (at bottom of stepper when ready) */}
        {p.etapa === "LISTO_PARA_CERRAR" && p.estado !== "EN_TRATO" && p.estado !== "CONVERTIDO" && (
          <div className="mt-6 pt-6 border-t border-[#1a1a1a]">
            <div className="bg-[#B3985B]/5 border border-[#B3985B]/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[#B3985B] text-sm font-medium">Listo para generar cotización</p>
                <p className="text-[#555] text-xs mt-0.5">Este prospecto completó el ciclo de 5 contactos</p>
              </div>
              <button
                onClick={generarCotizacion}
                disabled={generando}
                className="px-4 py-2 bg-[#B3985B] text-black text-sm font-semibold rounded-lg hover:bg-[#c9a96a] disabled:opacity-50 transition-colors"
              >
                {generando ? "Generando…" : "Generar cotización →"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Info del Evento ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Información del Evento
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-[9px] text-[#444] uppercase tracking-wider block mb-1.5">Servicio de interés</label>
            <select
              defaultValue={p.tipoServicioInteres ?? ""}
              onBlur={e => save("tipoServicioInteres", e.target.value || null)}
              className="w-full appearance-none bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#B3985B]/50"
            >
              <option value="">Sin definir</option>
              {Object.entries(SERVICIO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-[#444] uppercase tracking-wider block mb-1.5">Fecha estimada del evento</label>
            <input type="date" defaultValue={toDateInput(p.fechaEventoEstimada)}
              onBlur={e => save("fechaEventoEstimada", e.target.value || null)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#B3985B]/50" />
          </div>
          <div>
            <label className="text-[9px] text-[#444] uppercase tracking-wider block mb-1.5">Lugar estimado</label>
            <input type="text" defaultValue={p.lugarEstimado ?? ""}
              onBlur={e => save("lugarEstimado", e.target.value || null)}
              placeholder="Ciudad, venue o zona…"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#333] focus:outline-none focus:border-[#B3985B]/50" />
          </div>
          <div>
            <label className="text-[9px] text-[#444] uppercase tracking-wider block mb-1.5">Presupuesto aproximado</label>
            <input type="number" defaultValue={p.presupuestoAprox ?? ""}
              onBlur={e => save("presupuestoAprox", e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0.00"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#333] focus:outline-none focus:border-[#B3985B]/50" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[9px] text-[#444] uppercase tracking-wider block mb-1.5">Notas del evento</label>
            <textarea defaultValue={p.notasEvento ?? ""}
              onBlur={e => save("notasEvento", e.target.value || null)}
              rows={3} placeholder="Detalles específicos del evento, rider, requerimientos especiales…"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#333] focus:outline-none focus:border-[#B3985B]/50 resize-none" />
          </div>
        </div>
      </div>

      {/* ── Notas Generales ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Notas Generales
        </h2>
        <textarea
          defaultValue={p.notas ?? ""}
          onBlur={e => save("notas", e.target.value || null)}
          rows={4}
          placeholder="Observaciones generales sobre el proceso de prospección…"
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#333] focus:outline-none focus:border-[#B3985B]/50 resize-none"
        />
      </div>

      {/* ── Historial (si tiene trato) ── */}
      {p.trato && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Trato Generado
          </h2>
          <div className="flex items-center justify-between bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
            <div>
              <p className="text-white text-sm font-medium">{p.trato.nombreEvento ?? "Trato sin nombre"}</p>
              <p className="text-[#555] text-xs mt-0.5">
                Etapa: <span className="text-[#B3985B]">{TRATO_ETAPA_LABELS[p.trato.etapa] ?? p.trato.etapa}</span>
                {" · "}{new Date(p.trato.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <Link href={`/crm/tratos/${p.trato.id}`}
              className="text-[#B3985B] text-xs hover:underline whitespace-nowrap">
              Ver trato →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
