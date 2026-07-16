"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DiscoveryForm from "@/components/crm/DiscoveryForm";
import { useToast } from "@/components/Toast";
import { Combobox } from "@/components/Combobox";
import { ORIGEN_LEAD_OPTIONS, MOMENTO_OPTIONS } from "@/lib/constants";
import {
  CONTACTOS_INBOUND,
  CONTACTOS_OUTBOUND,
  PlanContactosSteps,
  MaterialCompartir,
  NotasSeguimiento,
  SeguimientosTracker,
  type NotaSeg,
  type SegItem,
} from "@/components/crm/PlanContactos";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Trato {
  id: string;
  etapa: string;
  tipoLead: string;
  origenLead: string;
  tipoProspecto: string;
  nurturingData: string | null;
  cliente: { id: string; nombre: string; empresa: string | null; telefono: string | null };
  responsable: { id: string; name: string } | null;
  canalAtencion: string | null;
  descubrimientoCompleto: boolean;
  formToken: string | null;
  formEstado: string;
  formRecibidoEn: string | null;
  tipoEvento: string | null;
  nombreEvento: string | null;
  momentoContratacion: string | null;
  modoDescubrimiento: string | null;
  preferenciaContacto: string | null;
  origenVenta: string | null;
  vendedorId: string | null;
}

type NurturingData = {
  etapa: string;
  log: { fecha: string; etapa: string; templateId: string; templateLabel: string }[];
  notas?: Record<string, string>;
  notasSeguimiento?: NotaSeg[];
  pasosMarcados?: number[];
  // Legacy (una sola tanda de seguimientos, sin distinguir etapa). Se migra a
  // seguimientosPorEtapa.LEAD al cargar; se conserva por compatibilidad.
  seguimientos?: SegItem[];
  maxSeguimientos?: number;
  // Seguimientos independientes por etapa del pipeline (LEAD, DESCUBRIMIENTO, …).
  seguimientosPorEtapa?: Record<string, SegItem[]>;
  maxSeguimientosPorEtapa?: Record<string, number>;
  // Preparación previa al descubrimiento: seguimientos + modalidad de propuesta.
  preparacionHecha?: boolean;
  modalidadPropuesta?: "INVENTARIO" | "CONTRA_RIDER";
};

// ─── Constantes ───────────────────────────────────────────────────────────────
const ETAPA_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
  LEAD:         { color: "text-amber-400",   bg: "bg-amber-900/20",   border: "border-amber-700/40",   label: "Prospección",    icon: "🔭" },
  DESCUBRIMIENTO: { color: "text-blue-400",  bg: "bg-blue-900/20",    border: "border-blue-700/40",    label: "Descubrimiento", icon: "🔍" },
  OPORTUNIDAD:  { color: "text-violet-400",  bg: "bg-violet-900/20",  border: "border-violet-700/40",  label: "Oportunidad",    icon: "📋" },
  VENTA_CERRADA:{ color: "text-emerald-400", bg: "bg-emerald-900/20", border: "border-emerald-700/40", label: "Venta Cerrada",  icon: "✅" },
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TratoWizardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();

  const [trato, setTrato] = useState<Trato | null>(null);
  const [loading, setLoading] = useState(true);
  const [nurturing, setNurturing] = useState<NurturingData>({ etapa: "PRIMER_CONTACTO", log: [], pasosMarcados: [] });
  const [saving, setSaving] = useState(false);
  const [creandoCotizacion, setCreandoCotizacion] = useState(false);
  const [isEditingDiscovery, setIsEditingDiscovery] = useState(false);
  const [showEditInicial, setShowEditInicial] = useState(false);

  // Estados para formulario cliente
  const [generandoToken, setGenerandoToken] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [forzarFormulario, setForzarFormulario] = useState(false);
  const formUrl = trato?.formToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${trato.formToken}` : "";

  function copiarLink(url: string) {
    navigator.clipboard.writeText(url);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  }

  async function generarFormToken() {
    setGenerandoToken(true);
    try {
      const res = await fetch(`/api/tratos/${id}/form-token`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setTrato(prev => prev ? { ...prev, formToken: data.formToken, formEstado: "NO_ENVIADO" } : prev);
      }
    } finally {
      setGenerandoToken(false);
    }
  }

  async function marcarFormEnviado() {
    const res = await fetch(`/api/tratos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formEstado: "ENVIADO" }),
    });
    if (res.ok) {
      setTrato(prev => prev ? { ...prev, formEstado: "ENVIADO" } : prev);
    }
  }

  // Cargar trato
  useEffect(() => {
    fetch(`/api/tratos/${id}`)
      .then(r => r.json())
      .then(d => {
        const t = d.trato as Trato;
        setTrato(t);
        if (t.nurturingData) {
          try {
            const parsed = JSON.parse(t.nurturingData) as NurturingData;
            // Migración: la tanda antigua de seguimientos pertenece a la etapa LEAD.
            if (parsed.seguimientos && !parsed.seguimientosPorEtapa) {
              parsed.seguimientosPorEtapa = { LEAD: parsed.seguimientos };
              parsed.maxSeguimientosPorEtapa = { LEAD: parsed.maxSeguimientos ?? 3 };
            }
            setNurturing(parsed);
          } catch { /* noop */ }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Guardar nurturing
  const guardarNurturing = useCallback(async (data: NurturingData) => {
    await fetch(`/api/tratos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nurturingData: JSON.stringify(data) }),
    });
  }, [id]);

  // Marcar / desmarcar paso
  function togglePaso(num: number) {
    const actuales = nurturing.pasosMarcados ?? [];
    const nuevos = actuales.includes(num)
      ? actuales.filter(n => n !== num)
      : [...actuales, num];
    const u = { ...nurturing, pasosMarcados: nuevos };
    setNurturing(u);
    guardarNurturing(u);
  }

  // Marcar todos
  async function marcarTodos(contactos: typeof CONTACTOS_INBOUND) {
    const todos = contactos.map(c => c.num);
    const u = { ...nurturing, pasosMarcados: todos };
    setNurturing(u);
    await guardarNurturing(u);
  }

  // Agregar nota de seguimiento
  async function agregarNota(texto: string) {
    const nueva: NotaSeg = { texto, fecha: new Date().toISOString() };
    const u = { ...nurturing, notasSeguimiento: [...(nurturing.notasSeguimiento ?? []), nueva] };
    setNurturing(u);
    await guardarNurturing(u);
  }

  // ── Seguimientos por etapa (marcar 1/2/3 como completados) ──
  const segsDe = (e: string): SegItem[] => nurturing.seguimientosPorEtapa?.[e] ?? [];
  const maxDe = (e: string): number => nurturing.maxSeguimientosPorEtapa?.[e] ?? 3;

  async function marcarSeguimiento(etapaKey: string, num: number) {
    setSaving(true);
    const item: SegItem = { num, fecha: new Date().toISOString(), nota: "" };
    const prev = nurturing.seguimientosPorEtapa?.[etapaKey] ?? [];
    const nuevos = [...prev.filter(s => s.num !== num), item].sort((a, b) => a.num - b.num);
    const u: NurturingData = {
      ...nurturing,
      seguimientosPorEtapa: { ...(nurturing.seguimientosPorEtapa ?? {}), [etapaKey]: nuevos },
    };
    setNurturing(u);
    await guardarNurturing(u);
    setSaving(false);
  }

  function agregarSlotSeguimiento(etapaKey: string) {
    const cur = maxDe(etapaKey);
    const u: NurturingData = {
      ...nurturing,
      maxSeguimientosPorEtapa: { ...(nurturing.maxSeguimientosPorEtapa ?? {}), [etapaKey]: cur + 1 },
    };
    setNurturing(u);
    guardarNurturing(u);
  }

  // ── Preparación previa al descubrimiento: modalidad + cerrar el paso ──
  function elegirModalidad(m: "INVENTARIO" | "CONTRA_RIDER") {
    const u = { ...nurturing, modalidadPropuesta: m };
    setNurturing(u);
    guardarNurturing(u);
  }

  function completarPreparacion() {
    const u: NurturingData = {
      ...nurturing,
      modalidadPropuesta: nurturing.modalidadPropuesta ?? "INVENTARIO",
      preparacionHecha: true,
    };
    setNurturing(u);
    guardarNurturing(u);
  }

  async function marcarPerdida(motivo: string) {
    setSaving(true);
    const res = await fetch(`/api/tratos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: "VENTA_PERDIDA", motivoPerdida: motivo }),
    });
    if (res.ok) {
      toast.success("Trato marcado como perdido");
      router.push(`/crm/tratos/${id}`);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al marcar como perdida");
    }
    setSaving(false);
  }

  // Avanzar a descubrimiento

  async function crearNuevaCotizacion() {
    if (!trato) return;
    const nombre = window.prompt(
      "Nombre del evento (puedes cambiarlo después):",
      "Evento " + ((((trato as any).cotizaciones || [])?.filter((c: any) => !c.grupoId || c.opcionLetra === "A").length + 1) || 1)
    );
    if (nombre === null) return;
    setCreandoCotizacion(true);
    try {
      const res = await fetch(`/api/tratos/${trato.id}/cotizaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreCotizacion: nombre || undefined }),
      });
      const d = await res.json();
      if (res.ok) {
        router.push(`/cotizaciones/nuevo?editId=${d.id}`);
      } else {
        toast.error(d.error ?? "Error al crear cotización");
      }
    } finally {
      setCreandoCotizacion(false);
    }
  }

  async function iniciarDescubrimiento() {
    setSaving(true);
    const res = await fetch(`/api/tratos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: "DESCUBRIMIENTO", tipoProspecto: "ACTIVO", canalAtencion: null }),
    });
    if (res.ok) {
      router.push(`/crm/tratos/${id}?tab=descubrimiento`);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
      </div>
    );
  }

  if (!trato) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        No se encontró el trato.{" "}
        <Link href="/crm/tratos" className="text-[#B3985B] hover:underline">Volver</Link>
      </div>
    );
  }

  const etapa = trato.etapa;
  const cfg = ETAPA_CONFIG[etapa] ?? ETAPA_CONFIG.LEAD;
  const nombre1 = trato.cliente.nombre.split(" ")[0];
  const esOutbound = trato.tipoLead === "OUTBOUND";
  const contactos = esOutbound ? CONTACTOS_OUTBOUND : CONTACTOS_INBOUND;

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* ─── Header fijo ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#181818]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/crm/tratos/${id}`)}
              className="text-gray-600 hover:text-white transition-colors text-sm"
            >
              ←
            </button>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{trato.cliente.nombre}</p>
              {trato.cliente.empresa && (
                <p className="text-gray-600 text-[11px]">{trato.cliente.empresa}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditInicial(true)}
              className="text-[11px] text-gray-500 hover:text-white border border-[#2a2a2a] hover:border-[#444] rounded-lg px-2.5 py-1 transition-colors"
            >
              ✎ Editar datos iniciales
            </button>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.border} border ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </div>
          </div>
        </div>
      </div>

      {showEditInicial && (
        <EditarDatosInicialesModal
          trato={trato}
          onClose={() => setShowEditInicial(false)}
          onSaved={(t) => { setTrato(prev => prev ? { ...prev, ...t } : prev); setShowEditInicial(false); }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ═══════════════════════════════════════════════════════════
            PANEL: LEAD — Plan de contactos
        ═══════════════════════════════════════════════════════════ */}
        {etapa === "LEAD" && (
          <>
            {/* ── Seguimientos 1/2/3 de la etapa de Prospección ── */}
            <SeguimientosTracker
              seguimientos={segsDe("LEAD")}
              maxSlots={maxDe("LEAD")}
              esOutbound={esOutbound}
              saving={saving}
              onMarcar={(num) => marcarSeguimiento("LEAD", num)}
              onAgregarSlot={() => agregarSlotSeguimiento("LEAD")}
              onPasarDescubrimiento={() => iniciarDescubrimiento()}
              onMarcarPerdida={marcarPerdida}
            />

            {/* ── Plan de contactos (pasos) ── */}
            <PlanContactosSteps
              contactos={contactos}
              esOutbound={esOutbound}
              pasosMarcados={nurturing.pasosMarcados ?? []}
              onToggle={togglePaso}
              onMarcarTodos={() => marcarTodos(contactos)}
            />

            {/* ── Material para compartir ── */}
            <MaterialCompartir tipoEvento={trato.tipoEvento} esOutbound={esOutbound} />

            {/* ── Notas de seguimiento ── */}
            <NotasSeguimiento
              notas={nurturing.notasSeguimiento ?? []}
              onAdd={agregarNota}
              esOutbound={esOutbound}
            />

            {/* ── CTA: Iniciar descubrimiento o Enviar Formulario ── */}
            <div className="pt-2 space-y-4">
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-5">
                <p className="text-white font-semibold text-sm mb-1">¿{nombre1} está listo para el siguiente paso?</p>
                <p className="text-gray-600 text-xs mb-4 leading-relaxed">
                  {esOutbound
                    ? "Cuando el prospecto muestre interés en un evento concreto, es hora de recopilar los detalles técnicos."
                    : "Cuando tengas suficiente información y el cliente muestre intención clara, es hora de recopilar los detalles técnicos."}
                </p>
                
                {/* Arista de publicidad: para leads META_ADS / REDES_SOCIALES priorizamos
                    la presentación antes de pedir el formulario. El formulario solo se ofrece
                    cuando el lead ya está cotizando o el vendedor lo fuerza. */}
                {(() => {
                  const esPublicidad = ["META_ADS", "REDES_SOCIALES"].includes(trato.origenLead);
                  const yaCotizando = trato.momentoContratacion === "COTIZANDO";
                  const ofrecerFormulario = !esPublicidad || yaCotizando || forzarFormulario;
                  return (
                    <>
                      {esPublicidad && !ofrecerFormulario && (
                        <div className="mb-4 p-3 rounded-xl border border-amber-700/40 bg-amber-900/10">
                          <p className="text-amber-300 text-xs font-semibold mb-1">📣 Lead de publicidad</p>
                          <p className="text-gray-500 text-[11px] leading-relaxed">
                            Primero comparte la presentación (arriba). Cuando muestre interés concreto en cotizar,
                            se habilita el formulario para que el cliente lo llene.
                          </p>
                        </div>
                      )}
                      <div className={`grid grid-cols-1 ${ofrecerFormulario ? "sm:grid-cols-2" : ""} gap-3 mb-4`}>
                        {/* Opción A: Yo recopilo */}
                        <button
                          onClick={iniciarDescubrimiento}
                          disabled={saving}
                          className="border border-[#2a2a2a] bg-[#111] hover:bg-[#1a1a1a] rounded-xl p-4 text-left transition-all group disabled:opacity-50"
                        >
                          <div className="text-2xl mb-2">🎙️</div>
                          <p className="text-white text-sm font-semibold group-hover:text-[#B3985B] transition-colors">Yo recopilo (Vendedor)</p>
                          <p className="text-gray-600 text-xs mt-1 leading-relaxed">Lleno el brief en llamada o reunión con el cliente</p>
                        </button>
                        {/* Opción B: El cliente llena (oculta para publicidad hasta cotización) */}
                        {ofrecerFormulario && (
                          <button
                            onClick={async () => {
                              if (!trato.formToken) await generarFormToken();
                            }}
                            disabled={generandoToken || saving}
                            className="border border-[#B3985B]/30 bg-[#B3985B]/5 hover:bg-[#B3985B]/10 rounded-xl p-4 text-left transition-all group disabled:opacity-50"
                          >
                            <div className="text-2xl mb-2">{generandoToken ? "⏳" : "📲"}</div>
                            <p className="text-[#B3985B] text-sm font-semibold group-hover:text-[#c9a96a] transition-colors">
                              {generandoToken ? "Generando..." : "El cliente llena"}
                            </p>
                            <p className="text-gray-600 text-xs mt-1 leading-relaxed">Generar link para que el cliente complete su info</p>
                          </button>
                        )}
                      </div>
                      {esPublicidad && !yaCotizando && !forzarFormulario && (
                        <button
                          onClick={() => setForzarFormulario(true)}
                          className="text-[11px] text-gray-500 hover:text-white transition-colors mb-2"
                        >
                          Forzar envío de formulario de todos modos →
                        </button>
                      )}
                    </>
                  );
                })()}

                {trato.formToken && (
                  <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                    <p className="text-white text-sm font-semibold mb-1">Formulario para el cliente</p>
                    <p className="text-[#555] text-[11px] mb-3">
                      {trato.formEstado === "ENVIADO" ? "Link enviado · esperando respuesta" : "Link generado · compártelo"}
                    </p>
                    <div className="flex items-center gap-2 bg-[#000] border border-[#222] rounded-lg px-3 py-2 mb-3">
                      <span className="text-[#666] text-[11px] truncate flex-1 font-mono">{formUrl}</span>
                      <button
                        onClick={() => { copiarLink(formUrl); if (trato.formEstado === "NO_ENVIADO") marcarFormEnviado(); }}
                        className="text-[#B3985B] text-xs font-medium hover:underline shrink-0"
                      >
                        {linkCopiado ? "¡Copiado!" : "Copiar"}
                      </button>
                    </div>
                    {trato.cliente.telefono && (
                      <a
                        href={`https://wa.me/52${trato.cliente.telefono}?text=${encodeURIComponent(`Hola ${nombre1} 👋, para prepararte la mejor propuesta para tu evento necesito que llenes este breve formulario (toma menos de 3 minutos): ${formUrl}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={() => { if (trato.formEstado === "NO_ENVIADO") marcarFormEnviado(); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold bg-green-900/20 border border-green-800/40 text-green-400 hover:border-green-700 transition-colors"
                      >
                        Enviar link por WhatsApp
                      </a>
                    )}
                    <div className="mt-4 pt-4 border-t border-[#1e1e1e] flex justify-center">
                      <button onClick={iniciarDescubrimiento} className="text-xs text-gray-500 hover:text-white transition-colors">
                        O continuar y llenar el formulario yo mismo →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        
        {/* ═══════════════════════════════════════════════════════════
            PANEL: DESCUBRIMIENTO
        ═══════════════════════════════════════════════════════════ */}
        {etapa === "DESCUBRIMIENTO" && (
          <div className="space-y-5">
            {(!nurturing.preparacionHecha && !trato.descubrimientoCompleto) ? (
              <>
                {/* ── Paso previo al descubrimiento: modalidad de la propuesta ── */}
                <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-5 space-y-4">
                  <div>
                    <p className="text-white font-bold text-base">Antes de empezar: ¿cómo armaremos la propuesta?</p>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                      Define la ruta del descubrimiento. La opción recomendada usa el inventario Mainstage;
                      elige la otra solo si el cliente necesita equipos de marcas específicas o quiere compartir su propio rider.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { value: "INVENTARIO", icon: "📦", label: "Inventario Mainstage", desc: "Armamos la propuesta con nuestro equipo. Recomendado.", recomendado: true },
                      { value: "CONTRA_RIDER", icon: "📄", label: "Rider específico / Contra-rider", desc: "El cliente necesita otras marcas o quiere subir su rider técnico para que propongamos un contra-rider.", recomendado: false },
                    ] as const).map(m => {
                      const activo = (nurturing.modalidadPropuesta ?? "INVENTARIO") === m.value;
                      return (
                        <button key={m.value} type="button" onClick={() => elegirModalidad(m.value)}
                          className={`text-left p-4 rounded-xl border transition-all relative ${activo ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#222] bg-[#111] hover:border-[#444]"}`}>
                          {m.recomendado && (
                            <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-[#B3985B] bg-[#B3985B]/15 px-1.5 py-0.5 rounded">Recomendado</span>
                          )}
                          <div className="text-2xl mb-2">{m.icon}</div>
                          <p className={`text-sm font-semibold mb-1 ${activo ? "text-[#B3985B]" : "text-white"}`}>{m.label}</p>
                          <p className="text-[11px] text-gray-500 leading-relaxed">{m.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Seguimientos 1/2/3 propios de la etapa de Descubrimiento ── */}
                <SeguimientosTracker
                  seguimientos={segsDe("DESCUBRIMIENTO")}
                  maxSlots={maxDe("DESCUBRIMIENTO")}
                  esOutbound={esOutbound}
                  saving={saving}
                  onMarcar={(num) => marcarSeguimiento("DESCUBRIMIENTO", num)}
                  onAgregarSlot={() => agregarSlotSeguimiento("DESCUBRIMIENTO")}
                  onPasarDescubrimiento={completarPreparacion}
                  onMarcarPerdida={marcarPerdida}
                  labelContinuar="🔍 Continuar al descubrimiento →"
                />
              </>
            ) : (
              <DiscoveryForm
                id={id}
                trato={trato}
                setTrato={setTrato}
                modalidad={nurturing.modalidadPropuesta}
                onComplete={() => setTrato(p => p ? { ...p, etapa: "OPORTUNIDAD" } : p)}
              />
            )}
          </div>
        )}

        {etapa === "OPORTUNIDAD" && (
          <div className="bg-[#0d0a1a] border border-violet-800/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-900/30 flex items-center justify-center text-xl">📋</div>
              <div>
                <p className="text-white font-bold text-base">Oportunidad activa</p>
                <p className="text-violet-400/70 text-xs mt-0.5">{nombre1} está en proceso de decisión</p>
              </div>
            </div>

            {/* El cliente completó su descubrimiento por su cuenta → retomar y cotizar */}
            {trato.modoDescubrimiento === "CLIENTE" && trato.formEstado === "COMPLETADO" && (
              <div className="p-3 rounded-xl border border-emerald-800/40 bg-emerald-900/15">
                <p className="text-emerald-300 text-xs font-semibold mb-1">👤 El cliente completó su descubrimiento</p>
                <p className="text-emerald-200/70 text-[11px] leading-relaxed">
                  Avanzó automáticamente a oportunidad. Retoma el proceso y arma la cotización con la información que dejó.
                  {trato.preferenciaContacto === "LLAMADA" && " Pidió que lo contacten por llamada primero."}
                  {trato.preferenciaContacto === "PROPUESTA" && " Pidió recibir una propuesta lo antes posible."}
                </p>
              </div>
            )}

            {!trato.descubrimientoCompleto || isEditingDiscovery ? (
              <div className="mt-4">
                {!trato.descubrimientoCompleto && (
                  <div className="p-3 bg-red-900/20 border border-red-800/40 rounded-lg mb-4">
                    <p className="text-red-400 text-xs font-semibold mb-1">⚠️ Acción requerida</p>
                    <p className="text-red-300/80 text-[11px] leading-relaxed">
                      Antes de poder generar una cotización para esta oportunidad, debes completar el formulario de descubrimiento con los detalles técnicos del evento.
                    </p>
                  </div>
                )}
                {isEditingDiscovery && (
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[#B3985B] text-sm font-semibold">Editando descubrimiento</p>
                    <button onClick={() => setIsEditingDiscovery(false)} className="text-xs text-gray-500 hover:text-white transition-colors">✕ Cancelar edición</button>
                  </div>
                )}
                <DiscoveryForm 
                  id={id} 
                  trato={trato} 
                  setTrato={setTrato} 
                  onComplete={() => {
                    setTrato(p => p ? { ...p, descubrimientoCompleto: true } : p);
                    setIsEditingDiscovery(false);
                  }}
                />
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-sm leading-relaxed mb-2">
                  El descubrimiento está completo. A continuación la guía rápida del proyecto para elaborar tu cotización.
                </p>

                {/* Guía minimalista para el vendedor */}
                <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Tipo de Evento</p>
                      <p className="text-white text-sm font-medium">{trato.tipoEvento || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Nombre del Proyecto</p>
                      <p className="text-white text-sm font-medium">{trato.nombreEvento || "—"}</p>
                    </div>
                  </div>

                  {(() => {
                    let equipos = [];
                    try {
                      // Obtenemos los equipos directamente del campo de descubrimiento, o del brief
                      const dbForm = (trato as any).brief ? JSON.parse((trato as any).brief) : {};
                      if (dbForm.equiposInteres) {
                        const parsed = typeof dbForm.equiposInteres === "string" ? JSON.parse(dbForm.equiposInteres) : dbForm.equiposInteres;
                        equipos = parsed.categorias || [];
                      }
                    } catch (e) {}

                    if (equipos.length > 0) {
                      return (
                        <div className="mb-4">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Categorías Seleccionadas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {equipos.map((cat: string) => (
                              <span key={cat} className="px-2 py-1 bg-[#222] border border-[#333] text-gray-300 text-xs rounded-md">
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {(() => {
                    let notasGenerales = "";
                    try {
                      const dbForm = (trato as any).brief ? JSON.parse((trato as any).brief) : {};
                      notasGenerales = dbForm.notasEquipos || dbForm.notas || "";
                    } catch (e) {}

                    if (notasGenerales) {
                      return (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Notas / Equipo Manual</p>
                          <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap bg-[#080808] p-3 rounded-lg border border-[#1a1a1a]">
                            {notasGenerales}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <button
                  onClick={crearNuevaCotizacion}
                  disabled={creandoCotizacion}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-violet-700/20 border border-violet-700/40 text-violet-300 text-sm font-bold hover:bg-violet-700/30 transition-colors disabled:opacity-40 cursor-pointer mb-3"
                >
                  {creandoCotizacion ? "Creando..." : "📄 Retomar el proceso y cotizar →"}
                </button>

                <div className="flex justify-center border-t border-[#1a1a1a] pt-3">
                  <button onClick={() => setIsEditingDiscovery(true)} className="text-[11px] text-gray-500 hover:text-white transition-colors underline">
                    Editar detalles del descubrimiento
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PANEL: VENTA_CERRADA
        ═══════════════════════════════════════════════════════════ */}
        {etapa === "VENTA_CERRADA" && (
          <div className="bg-[#061209] border border-emerald-800/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-xl">✅</div>
              <div>
                <p className="text-white font-bold text-base">¡Venta cerrada!</p>
                <p className="text-emerald-400/70 text-xs mt-0.5">{nombre1} ya confirmó — iniciamos producción</p>
              </div>
            </div>

            {!trato.descubrimientoCompleto || isEditingDiscovery ? (
              <div className="mt-4">
                {!trato.descubrimientoCompleto && (
                  <div className="p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg mb-4">
                    <p className="text-amber-400 text-xs font-semibold mb-1">⚠️ Información faltante</p>
                    <p className="text-amber-300/80 text-[11px] leading-relaxed">
                      Aunque la fecha ya está apartada, debes recabar la información técnica (descubrimiento) para poder operar el evento correctamente.
                    </p>
                  </div>
                )}
                {isEditingDiscovery && (
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[#B3985B] text-sm font-semibold">Editando descubrimiento</p>
                    <button onClick={() => setIsEditingDiscovery(false)} className="text-xs text-gray-500 hover:text-white transition-colors">✕ Cancelar edición</button>
                  </div>
                )}
                <DiscoveryForm 
                  id={id} 
                  trato={trato} 
                  setTrato={setTrato} 
                  onComplete={() => {
                    setTrato(p => p ? { ...p, descubrimientoCompleto: true } : p);
                    setIsEditingDiscovery(false);
                  }}
                />
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-sm leading-relaxed">
                  El cliente reservó. Ahora toca confirmar formalmente y arrancar el levantamiento técnico.
                </p>
                <Link
                  href={`/crm/tratos/${id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-700/20 border border-emerald-700/40 text-emerald-300 text-sm font-bold hover:bg-emerald-700/30 transition-colors mb-3"
                >
                  🎯 Ver trato y confirmar evento →
                </Link>

                <div className="flex justify-center border-t border-[#1a1a1a] pt-3">
                  <button onClick={() => setIsEditingDiscovery(true)} className="text-[11px] text-gray-500 hover:text-white transition-colors underline">
                    Editar detalles del descubrimiento
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Pie: link al trato completo ── */}
        <div className="flex justify-center pt-6 pb-8">
          <Link
            href={`/crm/tratos/${id}`}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1a1a1a] border border-[#333] text-gray-300 text-sm font-semibold hover:bg-[#222] hover:text-white transition-colors"
          >
            📋 Ver trato completo
          </Link>
        </div>

      </div>
    </div>
  );
}

// ─── Modal: editar los datos iniciales del trato (no re-crea, hace PATCH) ──────
const ETAPAS_EDITABLES = [
  { value: "LEAD", label: "🔭 Prospección" },
  { value: "DESCUBRIMIENTO", label: "🔍 Descubrimiento" },
  { value: "OPORTUNIDAD", label: "📋 Oportunidad" },
  { value: "VENTA_CERRADA", label: "✅ Venta Cerrada" },
];
const ORIGEN_VENTA_OPTIONS = [
  { value: "CLIENTE_PROPIO", label: "Cliente propio (10% comisión)" },
  { value: "PUBLICIDAD",     label: "Lead por publicidad (5%)" },
  { value: "ASIGNADO",       label: "Cliente asignado (5%+5%)" },
];

function EditarDatosInicialesModal({
  trato,
  onClose,
  onSaved,
}: {
  trato: Trato;
  onClose: () => void;
  onSaved: (t: Partial<Trato>) => void;
}) {
  const toast = useToast();
  const [clientes, setClientes] = useState<{ id: string; nombre: string; empresa: string | null }[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const [clienteId, setClienteId] = useState(trato.cliente.id);
  const [etapa, setEtapa] = useState(trato.etapa);
  const [momento, setMomento] = useState(trato.momentoContratacion ?? "");
  const [origenLead, setOrigenLead] = useState(trato.origenLead);
  const [tipoLead, setTipoLead] = useState(trato.tipoLead);
  const [origenVenta, setOrigenVenta] = useState(trato.origenVenta ?? "CLIENTE_PROPIO");
  const [vendedorId, setVendedorId] = useState(trato.vendedorId ?? "");

  useEffect(() => {
    fetch("/api/clientes").then(r => r.json()).then(d => setClientes(d.clientes || []));
    fetch("/api/usuarios-activos").then(r => r.json()).then(d => setUsuarios(d.usuarios || []));
  }, []);

  async function guardar() {
    setSaving(true);
    try {
      const payload = {
        clienteId,
        etapa,
        momentoContratacion: momento || null,
        origenLead,
        tipoLead,
        origenVenta,
        vendedorId: vendedorId || null,
      };
      const res = await fetch(`/api/tratos/${trato.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "No se pudieron guardar los cambios");
        return;
      }
      const cli = clientes.find(c => c.id === clienteId);
      toast.success("Datos actualizados");
      onSaved({
        etapa,
        momentoContratacion: momento || null,
        origenLead,
        tipoLead,
        origenVenta,
        vendedorId: vendedorId || null,
        ...(cli ? { cliente: { id: cli.id, nombre: cli.nombre, empresa: cli.empresa, telefono: trato.cliente.telefono } } : {}),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0d0d0d] border border-[#222] rounded-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-white font-bold text-base">Editar datos iniciales</p>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-sm">✕</button>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
          <Combobox
            value={clienteId}
            onChange={setClienteId}
            options={clientes.map(c => ({ value: c.id, label: c.nombre + (c.empresa ? ` · ${c.empresa}` : "") }))}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Momento de contratación</label>
          <Combobox
            value={momento}
            onChange={v => {
              setMomento(v);
              const m = MOMENTO_OPTIONS.find(o => o.value === v);
              if (m) setEtapa(m.etapa);
            }}
            options={[{ value: "", label: "Sin definir" }, ...MOMENTO_OPTIONS.map(m => ({ value: m.value, label: m.label }))]}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Etapa</label>
          <Combobox
            value={etapa}
            onChange={setEtapa}
            options={ETAPAS_EDITABLES}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
          <p className="text-[11px] text-gray-600 mt-1">Cambiar la etapa reinicia su sub-etapa interna al primer paso.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Origen del contacto</label>
            <Combobox
              value={origenLead}
              onChange={setOrigenLead}
              options={ORIGEN_LEAD_OPTIONS}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tipo de lead</label>
            <Combobox
              value={tipoLead}
              onChange={setTipoLead}
              options={[
                { value: "INBOUND", label: "Inbound (nos buscó)" },
                { value: "OUTBOUND", label: "Outbound (prospección)" },
              ]}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Origen de venta</label>
            <Combobox
              value={origenVenta}
              onChange={setOrigenVenta}
              options={ORIGEN_VENTA_OPTIONS}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Comisión para</label>
            <Combobox
              value={vendedorId}
              onChange={setVendedorId}
              options={[{ value: "", label: "Yo (quien captura)" }, ...usuarios.map(u => ({ value: u.id, label: u.name }))]}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#333] text-gray-400 hover:text-white text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#B3985B] text-black text-sm font-bold hover:bg-[#c9a96a] transition-colors disabled:opacity-40"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
