"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DiscoveryForm from "@/components/crm/DiscoveryForm";
import { useToast } from "@/components/Toast";

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
}

type SeguimientoItem = {
  id: string;
  titulo: string;
  canal: string;
  fechaProgramada: string;
  completado: boolean;
  fechaCompletado: string | null;
  nota: string | null;
};

type NurturingData = {
  etapa: string;
  log: { fecha: string; etapa: string; templateId: string; templateLabel: string }[];
  notas?: Record<string, string>;
  pasosMarcados?: number[];
};

// ─── Constantes ───────────────────────────────────────────────────────────────
const CONTACTOS_INBOUND = [
  { num: 1, label: "Presentación", objetivo: "Primer contacto. Preséntate y da a conocer quién es Mainstage Pro." },
  { num: 2, label: "Generación de confianza", objetivo: "Comparte trabajo, referencias, casos de éxito relevantes al perfil del cliente." },
  { num: 3, label: "Orientar a información", objetivo: "Hacer preguntas clave para obtener info suficiente para cotizar." },
];
const CONTACTOS_OUTBOUND = [
  { num: 1, label: "Presentación de Mainstage Pro", objetivo: "Dar a conocer la empresa, servicios y diferenciadores clave." },
  { num: 2, label: "Generación de confianza #1", objetivo: "Portfolio, reseñas, casos de éxito relevantes al sector del prospecto." },
  { num: 3, label: "Generación de confianza #2", objetivo: "Seguimiento proactivo. Nuevo material, estadísticas, mantener presencia." },
  { num: 4, label: "Prospección de evento", objetivo: "Preguntar si tienen algún evento próximo que podamos atender o cotizar." },
  { num: 5, label: "Propuesta de reunión", objetivo: "Invitar a una reunión para conocernos y detectar oportunidades." },
];

const TIPO_SEG = [
  { key: "whatsapp", label: "WhatsApp", icon: "📱" },
  { key: "llamada", label: "Llamada", icon: "📞" },
  { key: "reunion", label: "Reunión", icon: "🤝" },
  { key: "email", label: "Email", icon: "📧" },
];

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
  const [seguimientos, setSeguimientos] = useState<SeguimientoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [creandoCotizacion, setCreandoCotizacion] = useState(false);

  // Estado para agendar inline por paso
  const [agendandoPaso, setAgendandoPaso] = useState<number | null>(null);
  const [agendaFecha, setAgendaFecha] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
  });
  const [agendaTipo, setAgendaTipo] = useState("whatsapp");
  const [agendaNota, setAgendaNota] = useState("");
  const [agendandoTodo, setAgendandoTodo] = useState(false);
  const [isEditingDiscovery, setIsEditingDiscovery] = useState(false);

  // Estados para formulario cliente
  const [generandoToken, setGenerandoToken] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
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
          try { setNurturing(JSON.parse(t.nurturingData)); } catch { /* noop */ }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // Cargar seguimientos
    fetch(`/api/seguimientos?tratoId=${id}`)
      .then(r => r.json())
      .then(d => setSeguimientos(d.seguimientos ?? []));
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

  // Agendar seguimiento para un paso
  async function agendarPaso(paso: number, label: string) {
    if (!agendaFecha) return;
    setSaving(true);
    const tipoSel = TIPO_SEG.find(t => t.key === agendaTipo);
    const res = await fetch("/api/seguimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tratoId: id,
        titulo: `Contacto ${paso}: ${label}`,
        canal: agendaTipo,
        fechaProgramada: new Date(agendaFecha + "T10:00:00").toISOString(),
        nota: agendaNota || undefined,
        tipo: "manual",
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setSeguimientos(prev => [d.seguimiento, ...prev]);
      setAgendandoPaso(null);
      setAgendaNota("");
      const d2 = new Date(); d2.setDate(d2.getDate() + 1);
      setAgendaFecha(d2.toISOString().slice(0, 10));
    }
    setSaving(false);
  }

  // Marcar seguimiento como hecho
  async function marcarSegHecho(segId: string) {
    const res = await fetch(`/api/seguimientos/${segId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completado: true, fechaCompletado: new Date().toISOString() }),
    });
    if (res.ok) {
      setSeguimientos(prev => prev.map(s => s.id === segId ? { ...s, completado: true, fechaCompletado: new Date().toISOString() } : s));
    }
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

  function fmtFecha(iso: string) {
    const d = new Date(iso);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);
    const label = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    if (diff < 0) return { text: `Venció · ${label}`, color: "text-red-400" };
    if (diff === 0) return { text: `Hoy · ${label}`, color: "text-yellow-400" };
    if (diff === 1) return { text: `Mañana · ${label}`, color: "text-emerald-400" };
    return { text: `${label}`, color: "text-gray-400" };
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
  const marcados = nurturing.pasosMarcados ?? [];
  const completadosCount = marcados.filter(n => contactos.some(c => c.num === n)).length;
  const pct = contactos.length > 0 ? Math.round((completadosCount / contactos.length) * 100) : 0;
  const todosCompletos = completadosCount === contactos.length;

  // Seguimientos pendientes relacionados
  const segsCliente = seguimientos.filter(s => !s.completado);
  const segsCompletados = seguimientos.filter(s => s.completado);

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
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.border} border ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ═══════════════════════════════════════════════════════════
            PANEL: LEAD — Plan de contactos
        ═══════════════════════════════════════════════════════════ */}
        {etapa === "LEAD" && (
          <>
            {/* Intro */}
            <div className={`rounded-2xl p-5 border ${esOutbound ? "border-emerald-800/30 bg-[#081208]" : "border-amber-800/25 bg-[#120f04]"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${esOutbound ? "bg-emerald-900/30" : "bg-amber-900/25"}`}>
                  {esOutbound ? "🌱" : "⚡"}
                </div>
                <div>
                  <p className="text-white font-bold text-base">
                    {esOutbound ? "Plan de prospección outbound" : "Plan de contactos inbound"}
                  </p>
                  <p className={`text-xs mt-0.5 ${esOutbound ? "text-emerald-600" : "text-amber-600"}`}>
                    {esOutbound
                      ? `${nombre1} aún no conoce Mainstage Pro · construye confianza paso a paso`
                      : `${nombre1} ya llegó con intención · califica y avanza al descubrimiento`}
                  </p>
                </div>
              </div>

              {/* Progreso */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${esOutbound ? "bg-emerald-600" : "bg-amber-600"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-xs font-bold tabular-nums shrink-0 ${todosCompletos ? (esOutbound ? "text-emerald-400" : "text-amber-400") : "text-gray-500"}`}>
                  {completadosCount}/{contactos.length}
                </span>
              </div>
            </div>

            {/* ── Lista de pasos ── */}
            <div className="space-y-2">
              {contactos.map((c) => {
                const marcado = marcados.includes(c.num);
                const segsPaso = seguimientos.filter(s => s.titulo.startsWith(`Contacto ${c.num}:`));
                const segPendiente = segsPaso.find(s => !s.completado);
                const isAgendando = agendandoPaso === c.num;

                return (
                  <div
                    key={c.num}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      marcado
                        ? esOutbound ? "bg-emerald-950/30 border-emerald-800/40" : "bg-amber-950/25 border-amber-800/35"
                        : "bg-[#0d0d0d] border-[#1e1e1e]"
                    }`}
                  >
                    {/* Fila principal */}
                    <div className="flex items-start gap-3 p-4">
                      {/* Checkbox / número */}
                      <button
                        type="button"
                        onClick={() => togglePaso(c.num)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 transition-all ${
                          marcado
                            ? esOutbound ? "bg-emerald-600 text-white" : "bg-amber-600 text-black"
                            : esOutbound ? "bg-emerald-900/30 text-emerald-600 hover:bg-emerald-900/50" : "bg-amber-900/25 text-amber-600 hover:bg-amber-900/40"
                        }`}
                      >
                        {marcado ? "✓" : c.num}
                      </button>

                      {/* Texto */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-tight mb-0.5 ${marcado ? (esOutbound ? "text-emerald-300 line-through" : "text-amber-300 line-through") : "text-white"}`}>
                          {c.label}
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">{c.objetivo}</p>

                        {/* Seguimiento agendado */}
                        {segPendiente && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px]">{TIPO_SEG.find(t => t.key === segPendiente.canal)?.icon ?? "📌"}</span>
                            <span className={`text-[10px] font-medium ${fmtFecha(segPendiente.fechaProgramada).color}`}>
                              {fmtFecha(segPendiente.fechaProgramada).text}
                            </span>
                            <button
                              onClick={() => marcarSegHecho(segPendiente.id)}
                              className="text-[10px] text-gray-700 hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded bg-[#111] hover:bg-emerald-900/20 border border-transparent hover:border-emerald-800/40"
                            >
                              ✓ hecho
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Botón agendar */}
                      {!isAgendando && !segPendiente && (
                        <button
                          onClick={() => setAgendandoPaso(c.num)}
                          className={`shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                            marcado
                              ? "border-[#222] text-gray-700 hover:text-gray-500"
                              : esOutbound
                                ? "border-emerald-800/30 text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/15"
                                : "border-amber-800/25 text-amber-700 hover:text-amber-400 hover:bg-amber-900/10"
                          }`}
                        >
                          + Agendar
                        </button>
                      )}
                      {isAgendando && (
                        <button
                          onClick={() => setAgendandoPaso(null)}
                          className="shrink-0 text-[11px] text-gray-600 hover:text-white transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Panel inline de agendado */}
                    {isAgendando && (
                      <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3 space-y-3">
                        {/* Tipo */}
                        <div className="flex gap-1.5 flex-wrap">
                          {TIPO_SEG.map(t => (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setAgendaTipo(t.key)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                                agendaTipo === t.key
                                  ? "border-[#B3985B]/50 bg-[#B3985B]/10 text-[#B3985B]"
                                  : "border-[#222] text-gray-600 hover:text-gray-300"
                              }`}
                            >
                              {t.icon} {t.label}
                            </button>
                          ))}
                        </div>
                        {/* Fecha */}
                        <input
                          type="date"
                          value={agendaFecha}
                          onChange={e => setAgendaFecha(e.target.value)}
                          className="w-full bg-[#111] border border-[#252525] text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#B3985B]/40"
                        />
                        {/* Nota */}
                        <input
                          type="text"
                          value={agendaNota}
                          onChange={e => setAgendaNota(e.target.value)}
                          placeholder="Nota (opcional)"
                          className="w-full bg-[#111] border border-[#252525] text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#B3985B]/40 placeholder:text-[#444]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAgendandoPaso(null)}
                            className="flex-1 py-2 rounded-xl border border-[#252525] text-gray-500 text-sm hover:text-white transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => agendarPaso(c.num, c.label)}
                            disabled={saving || !agendaFecha}
                            className="flex-1 py-2 rounded-xl bg-[#B3985B] text-black text-sm font-bold disabled:opacity-40 transition-colors hover:bg-[#c9a96a]"
                          >
                            {saving ? "..." : "Agendar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Acciones masivas ── */}
            <div className="flex items-center gap-2">
              {!todosCompletos && (
                <button
                  onClick={() => marcarTodos(contactos)}
                  className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-500 text-xs hover:text-white hover:border-[#444] transition-colors"
                >
                  ✓ Marcar todos como realizados
                </button>
              )}
              <button
                onClick={() => setAgendandoTodo(v => !v)}
                className={`py-2.5 rounded-xl border text-xs transition-colors px-4 ${
                  agendandoTodo
                    ? "border-[#B3985B]/40 bg-[#B3985B]/10 text-[#B3985B]"
                    : "border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#444]"
                }`}
              >
                📅 Agendar próximo contacto
              </button>
            </div>

            {/* Panel de agendado global */}
            {agendandoTodo && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-4 space-y-3">
                <p className="text-white text-sm font-semibold">Agendar próximo contacto con {nombre1}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {TIPO_SEG.map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setAgendaTipo(t.key)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                        agendaTipo === t.key
                          ? "border-[#B3985B]/50 bg-[#B3985B]/10 text-[#B3985B]"
                          : "border-[#222] text-gray-600 hover:text-gray-300"
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={agendaFecha}
                  onChange={e => setAgendaFecha(e.target.value)}
                  className="w-full bg-[#111] border border-[#252525] text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#B3985B]/40"
                />
                <input
                  type="text"
                  value={agendaNota}
                  onChange={e => setAgendaNota(e.target.value)}
                  placeholder="¿Qué se va a hacer? (opcional)"
                  className="w-full bg-[#111] border border-[#252525] text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#B3985B]/40 placeholder:text-[#444]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setAgendandoTodo(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#252525] text-gray-500 text-sm hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!agendaFecha) return;
                      setSaving(true);
                      const res = await fetch("/api/seguimientos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          tratoId: id,
                          titulo: TIPO_SEG.find(t => t.key === agendaTipo)?.label ?? agendaTipo,
                          canal: agendaTipo,
                          fechaProgramada: new Date(agendaFecha + "T10:00:00").toISOString(),
                          nota: agendaNota || undefined,
                          tipo: "manual",
                        }),
                      });
                      if (res.ok) {
                        const d = await res.json();
                        setSeguimientos(prev => [d.seguimiento, ...prev]);
                        setAgendandoTodo(false);
                        setAgendaNota("");
                        const d2 = new Date(); d2.setDate(d2.getDate() + 1);
                        setAgendaFecha(d2.toISOString().slice(0, 10));
                      }
                      setSaving(false);
                    }}
                    disabled={saving || !agendaFecha}
                    className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-bold disabled:opacity-40 transition-colors hover:bg-[#c9a96a]"
                  >
                    {saving ? "..." : "Agendar"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Próximos seguimientos agendados ── */}
            {segsCliente.length > 0 && (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Agenda</p>
                <div className="space-y-2">
                  {segsCliente.map(seg => {
                    const fmt = fmtFecha(seg.fechaProgramada);
                    return (
                      <div key={seg.id} className="flex items-center gap-3 py-1">
                        <span className="text-sm shrink-0">{TIPO_SEG.find(t => t.key === seg.canal)?.icon ?? "📌"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-medium truncate">{seg.titulo}</p>
                          <p className={`text-[11px] ${fmt.color}`}>{fmt.text}</p>
                        </div>
                        <button
                          onClick={() => marcarSegHecho(seg.id)}
                          className="shrink-0 text-[10px] text-gray-700 hover:text-emerald-400 px-2 py-1 rounded border border-transparent hover:border-emerald-800/30 hover:bg-emerald-900/10 transition-colors"
                        >
                          ✓ hecho
                        </button>
                      </div>
                    );
                  })}
                </div>
                {segsCompletados.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-[10px] text-gray-700 hover:text-gray-500 cursor-pointer list-none select-none">
                      {segsCompletados.length} contacto{segsCompletados.length !== 1 ? "s" : ""} realizado{segsCompletados.length !== 1 ? "s" : ""}
                    </summary>
                    <div className="mt-2 space-y-1 pl-2 border-l border-[#1a1a1a]">
                      {segsCompletados.map(seg => (
                        <div key={seg.id} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-700 line-through">{seg.titulo}</span>
                          <span className="text-[9px] text-gray-800">
                            {seg.fechaCompletado ? new Date(seg.fechaCompletado).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* ── CTA: Iniciar descubrimiento o Enviar Formulario ── */}
            <div className="pt-2 space-y-4">
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-5">
                <p className="text-white font-semibold text-sm mb-1">¿{nombre1} está listo para el siguiente paso?</p>
                <p className="text-gray-600 text-xs mb-4 leading-relaxed">
                  {esOutbound
                    ? "Cuando el prospecto muestre interés en un evento concreto, es hora de recopilar los detalles técnicos."
                    : "Cuando tengas suficiente información y el cliente muestre intención clara, es hora de recopilar los detalles técnicos."}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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
                  {/* Opción B: El cliente llena */}
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
                </div>

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
          <DiscoveryForm 
            id={id} 
            trato={trato} 
            setTrato={setTrato} 
            onComplete={() => setTrato(p => p ? { ...p, etapa: "OPORTUNIDAD" } : p)}
          />
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
                  {creandoCotizacion ? "Creando..." : "📄 Crear nueva cotización →"}
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
