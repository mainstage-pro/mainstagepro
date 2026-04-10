"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FORM_KEY_LABELS } from "@/lib/form-labels";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface TratoArchivo {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  createdAt: string;
}

interface Trato {
  id: string;
  etapa: string;
  estatusContacto: string;
  tipoEvento: string;
  tipoLead: string;
  origenLead: string;
  origenVenta: string;
  vendedorOrigen: { id: string; name: string } | null;
  tipoServicio: string | null;
  lugarEstimado: string | null;
  fechaEventoEstimada: string | null;
  presupuestoEstimado: number | null;
  clasificacion: string;
  notas: string | null;
  proximaAccion: string | null;
  fechaProximaAccion: string | null;
  motivoPerdida: string | null;
  createdAt: string;
  formToken: string | null;
  formEstado: string;
  formRespuestas: string | null;
  rutaEntrada: string | null;
  // Descubrimiento
  canalAtencion: string | null;
  nombreEvento: string | null;
  duracionEvento: string | null;
  asistentesEstimados: number | null;
  serviciosInteres: string | null;
  ideasReferencias: string | null;
  etapaContratacion: string | null;
  continuarPor: string | null;
  descubrimientoCompleto: boolean;
  cliente: {
    id: string; nombre: string; empresa: string | null;
    tipoCliente: string; clasificacion: string;
    telefono: string | null; correo: string | null;
  };
  responsable: { id: string; name: string } | null;
  cotizaciones: Array<{ id: string; numeroCotizacion: string; estado: string; granTotal: number; createdAt: string }>;
  archivos: TratoArchivo[];
}

// ─── Catálogos / Constantes ───────────────────────────────────────────────────
const ETAPAS = ["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"];
const ETAPA_LABELS: Record<string, string> = {
  DESCUBRIMIENTO: "Descubrimiento", OPORTUNIDAD: "Oportunidad",
  VENTA_CERRADA: "Venta Cerrada", VENTA_PERDIDA: "Venta Perdida",
};
const ETAPA_COLORS: Record<string, string> = {
  DESCUBRIMIENTO: "bg-gray-700 text-gray-200",
  OPORTUNIDAD: "bg-yellow-900/50 text-yellow-300",
  VENTA_CERRADA: "bg-green-900/50 text-green-300",
  VENTA_PERDIDA: "bg-red-900/50 text-red-300",
};
const TIPO_EVENTO_COLORS: Record<string, string> = {
  MUSICAL: "#1A2E4A", SOCIAL: "#B3985B", EMPRESARIAL: "#6B7280", OTRO: "#1F2937",
};
const ORIGEN_LABELS: Record<string, string> = {
  META_ADS: "Meta Ads", GOOGLE_ADS: "Google Ads", ORGANICO: "Orgánico",
  RECOMPRA: "Recompra", REFERIDO: "Referido", PROSPECCION: "Prospección", OTRO: "Otro",
};
const ESTADO_COT_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-700 text-gray-300", ENVIADA: "bg-blue-900/50 text-blue-300",
  APROBADA: "bg-green-900/50 text-green-300", RECHAZADA: "bg-red-900/50 text-red-300",
  VENCIDA: "bg-gray-800 text-gray-500",
};

// Canales de atención
const CANALES = [
  { id: "WHATSAPP",    icon: "💬", label: "WhatsApp",      desc: "Rápido · 2-5 min",          profundidad: "RAPIDO",   border: "border-green-700",  badge: "bg-green-900/40 text-green-300" },
  { id: "FORMULARIO",  icon: "📋", label: "Formulario",    desc: "Medio · 5-10 min",           profundidad: "MEDIO",    border: "border-blue-700",   badge: "bg-blue-900/40 text-blue-300" },
  { id: "LLAMADA",     icon: "📞", label: "Llamada",       desc: "Profundo · 15-30 min",       profundidad: "PROFUNDO", border: "border-[#B3985B]",  badge: "bg-yellow-900/40 text-yellow-300" },
  { id: "REUNION",     icon: "👥", label: "Reunión",       desc: "Profundo · presencial",      profundidad: "PROFUNDO", border: "border-[#B3985B]",  badge: "bg-yellow-900/40 text-yellow-300" },
  { id: "SCOUTING",    icon: "🗺️", label: "Scouting",      desc: "Profundo · visita en sitio", profundidad: "PROFUNDO", border: "border-[#B3985B]",  badge: "bg-yellow-900/40 text-yellow-300" },
  { id: "INFORMACION", icon: "ℹ️", label: "Solo info",    desc: "Nutrir al lead",             profundidad: "INFO",     border: "border-gray-600",   badge: "bg-gray-700 text-gray-400" },
] as const;

// Servicios por tipo de evento
const SERVICIOS: Record<string, Array<{ id: string; label: string }>> = {
  MUSICAL: [
    { id: "AUDIO_PA", label: "PA / Sistema principal" },
    { id: "AUDIO_MONITOR", label: "Monitores / IEM" },
    { id: "ILUM_ARTISTICA", label: "Iluminación artística" },
    { id: "ILUM_ESCENARIO", label: "Iluminación escenario" },
    { id: "VIDEO_LED", label: "Pantallas LED / Video" },
    { id: "VIDEO_PRODUCCION", label: "Producción de video" },
    { id: "BACKLINE", label: "Backline (amps, batería)" },
    { id: "EFECTOS", label: "Efectos especiales" },
    { id: "DJ", label: "Soporte DJ" },
    { id: "PRODUCCION_GENERAL", label: "Producción general" },
  ],
  SOCIAL: [
    { id: "DJ", label: "DJ" },
    { id: "AUDIO_PA", label: "Sistema de audio" },
    { id: "ILUM_PISTA", label: "Iluminación de pista" },
    { id: "ILUM_AMBIENTAL", label: "Iluminación ambiental" },
    { id: "VIDEO_LED", label: "Pantalla LED / Proyección" },
    { id: "PISTA_BAILE", label: "Pista de baile iluminada" },
    { id: "EFECTOS", label: "Efectos (confeti, humo frío)" },
    { id: "KARAOKE", label: "Karaoke" },
    { id: "PRODUCCION_GENERAL", label: "Producción completa" },
  ],
  EMPRESARIAL: [
    { id: "AUDIO_PA", label: "Audio / PA system" },
    { id: "AUDIO_CONF", label: "Audio para conferencia" },
    { id: "PROYECCION", label: "Proyección / pantalla" },
    { id: "VIDEO_LED", label: "Videowall / LED" },
    { id: "ILUM_ESCENARIO", label: "Iluminación escenario" },
    { id: "STREAMING", label: "Transmisión en vivo" },
    { id: "GRABACION", label: "Grabación del evento" },
    { id: "BRANDING", label: "Branding / pantallas custom" },
    { id: "TRADUCCION", label: "Traducción simultánea" },
    { id: "PRODUCCION_GENERAL", label: "Producción ejecutiva" },
  ],
  OTRO: [
    { id: "AUDIO_PA", label: "Sistema de audio" },
    { id: "ILUM_ARTISTICA", label: "Iluminación" },
    { id: "VIDEO_LED", label: "Video / Pantallas" },
    { id: "EFECTOS", label: "Efectos especiales" },
    { id: "DJ", label: "DJ" },
    { id: "PRODUCCION_GENERAL", label: "Producción general" },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function getCanal(id: string) {
  return CANALES.find(c => c.id === id);
}
function getProfundidad(canal: string | null) {
  return getCanal(canal ?? "")?.profundidad ?? null;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TratoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trato, setTrato] = useState<Trato | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Partial<Trato>>({});

  // Briefing libre
  const [briefingText, setBriefingText] = useState("");
  const [savingBriefing, setSavingBriefing] = useState(false);

  // Archivos del briefing
  const [archivos, setArchivos] = useState<TratoArchivo[]>([]);
  const [uploadingArchivo, setUploadingArchivo] = useState(false);

  // Formulario para prospecto
  const [generandoToken, setGenerandoToken] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Discovery state
  const [discForm, setDiscForm] = useState({
    tipoEvento: "MUSICAL",
    nombreEvento: "",
    fechaEventoEstimada: "",
    lugarEstimado: "",
    duracionEvento: "",
    asistentesEstimados: "",
    presupuestoEstimado: "",
    tipoServicio: "",
    etapaContratacion: "EXPLORANDO",
    continuarPor: "WHATSAPP",
    ideasReferencias: "",
    notas: "",
    proximaAccion: "",
    serviciosInteres: [] as string[],
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/tratos/${id}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(async ([d, me]) => {
      // Auto-asignar al usuario actual si el trato no tiene responsable
      if (d.trato && !d.trato.responsableId && me.user) {
        await fetch(`/api/tratos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responsableId: me.user.id }),
        });
        d.trato.responsableId = me.user.id;
        d.trato.responsable = { id: me.user.id, name: me.user.name };
      }
      setTrato(d.trato);
      setForm(d.trato);
        // Pre-fill briefing and discovery form from existing trato data
        if (d.trato) {
          const t = d.trato as Trato;
          setBriefingText(t.notas ?? "");
          setArchivos(t.archivos ?? []);
          setDiscForm(prev => ({
            ...prev,
            tipoEvento: t.tipoEvento ?? "MUSICAL",
            nombreEvento: t.nombreEvento ?? "",
            fechaEventoEstimada: t.fechaEventoEstimada ? t.fechaEventoEstimada.split("T")[0] : "",
            lugarEstimado: t.lugarEstimado ?? "",
            duracionEvento: t.duracionEvento ?? "",
            asistentesEstimados: t.asistentesEstimados?.toString() ?? "",
            presupuestoEstimado: t.presupuestoEstimado?.toString() ?? "",
            tipoServicio: t.tipoServicio ?? "",
            etapaContratacion: t.etapaContratacion ?? "EXPLORANDO",
            continuarPor: t.continuarPor ?? "WHATSAPP",
            ideasReferencias: t.ideasReferencias ?? "",
            notas: t.notas ?? "",
            proximaAccion: t.proximaAccion ?? "",
            serviciosInteres: t.serviciosInteres ? JSON.parse(t.serviciosInteres) : [],
          }));
        }
        setLoading(false);
      });
  }, [id]);

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/tratos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async function seleccionarCanal(canal: string) {
    setSaving(true);
    const d = await patch({ canalAtencion: canal });
    setTrato(prev => prev ? { ...prev, canalAtencion: d.trato.canalAtencion } : prev);
    setSaving(false);
  }

  async function guardarDescubrimiento(completar = false) {
    setSaving(true);
    const payload: Record<string, unknown> = {
      tipoEvento: discForm.tipoEvento,
      nombreEvento: discForm.nombreEvento || null,
      fechaEventoEstimada: discForm.fechaEventoEstimada || null,
      lugarEstimado: discForm.lugarEstimado || null,
      duracionEvento: discForm.duracionEvento || null,
      asistentesEstimados: discForm.asistentesEstimados ? parseInt(discForm.asistentesEstimados) : null,
      presupuestoEstimado: discForm.presupuestoEstimado ? parseFloat(discForm.presupuestoEstimado) : null,
      tipoServicio: discForm.tipoServicio || null,
      etapaContratacion: discForm.etapaContratacion || null,
      continuarPor: discForm.continuarPor || null,
      ideasReferencias: discForm.ideasReferencias || null,
      notas: discForm.notas || null,
      proximaAccion: discForm.proximaAccion || null,
      serviciosInteres: JSON.stringify(discForm.serviciosInteres),
    };
    if (completar) {
      payload.descubrimientoCompleto = true;
      payload.etapa = "OPORTUNIDAD";
    }
    const d = await patch(payload);
    setTrato(prev => prev ? { ...prev, ...d.trato } : prev);
    setSaving(false);
  }

  async function cambiarEtapa(etapa: string) {
    setSaving(true);
    const d = await patch({ etapa });
    setTrato(prev => prev ? { ...prev, etapa: d.trato.etapa } : prev);
    setSaving(false);
  }

  async function guardar() {
    setSaving(true);
    const d = await patch(form as Record<string, unknown>);
    setTrato(prev => prev ? { ...prev, ...d.trato } : prev);
    setEditando(false);
    setSaving(false);
  }

  async function guardarBriefing() {
    setSavingBriefing(true);
    const d = await patch({ notas: briefingText || null });
    setTrato(prev => prev ? { ...prev, notas: d.trato.notas } : prev);
    setSavingBriefing(false);
  }

  async function generarFormToken() {
    setGenerandoToken(true);
    const res = await fetch(`/api/tratos/${id}/form-token`, { method: "POST" });
    const data = await res.json();
    setTrato(prev => prev ? { ...prev, formToken: data.token, formEstado: "NO_ENVIADO" } : prev);
    setGenerandoToken(false);
  }

  async function marcarFormEnviado() {
    await fetch(`/api/tratos/${id}/form-token`, { method: "PATCH" });
    setTrato(prev => prev ? { ...prev, formEstado: "ENVIADO" } : prev);
  }

  function copiarLink(url: string) {
    navigator.clipboard.writeText(url);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  }

  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingArchivo(true);
    const fd = new FormData();
    fd.append("file", file);
    // Detectar tipo según mime
    const mime = file.type;
    const tipo = mime.startsWith("image/") ? "IMAGEN" : "DOCUMENTO";
    fd.append("tipo", tipo);
    fd.append("nombre", file.name);
    const res = await fetch(`/api/tratos/${id}/archivos`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.archivo) setArchivos(prev => [...prev, data.archivo]);
    setUploadingArchivo(false);
    e.target.value = "";
  }

  async function eliminarArchivo(archivoId: string) {
    await fetch(`/api/tratos/${id}/archivos/${archivoId}`, { method: "DELETE" });
    setArchivos(prev => prev.filter(a => a.id !== archivoId));
  }

  function toggleServicio(servId: string) {
    setDiscForm(prev => ({
      ...prev,
      serviciosInteres: prev.serviciosInteres.includes(servId)
        ? prev.serviciosInteres.filter(s => s !== servId)
        : [...prev.serviciosInteres, servId],
    }));
  }

  if (loading) return <div className="text-gray-400 text-sm">Cargando...</div>;
  if (!trato) return <div className="text-red-400 text-sm">Trato no encontrado</div>;

  const profundidad = getProfundidad(trato.canalAtencion);
  const serviciosDisponibles = SERVICIOS[discForm.tipoEvento] ?? SERVICIOS.OTRO;
  const serviciosSel: string[] = trato.serviciosInteres ? JSON.parse(trato.serviciosInteres) : [];
  const canalInfo = getCanal(trato.canalAtencion ?? "");

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TIPO_EVENTO_COLORS[trato.tipoEvento] || "#555" }} />
            <span className="text-gray-400 text-sm">{trato.tipoEvento}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ETAPA_COLORS[trato.etapa]}`}>
              {ETAPA_LABELS[trato.etapa]}
            </span>
            {trato.canalAtencion && canalInfo && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${canalInfo.badge}`}>
                {canalInfo.icon} {canalInfo.label}
              </span>
            )}
            {trato.descubrimientoCompleto && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#B3985B]/20 text-[#B3985B]">
                ✓ Descubrimiento completo
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{trato.cliente.nombre}</h1>
          {trato.cliente.empresa && <p className="text-gray-400 text-sm">{trato.cliente.empresa}</p>}
          {trato.nombreEvento && <p className="text-gray-300 text-sm italic">"{trato.nombreEvento}"</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
            className="px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors">
            + Nueva cotización
          </Link>
          {(trato.etapa === "VENTA_CERRADA" || trato.cotizaciones.length > 0) && (
            <Link
              href={`/contratos/${trato.id}`}
              target="_blank"
              className="px-4 py-2 rounded-lg border border-[#B3985B] text-[#B3985B] hover:bg-[#B3985B]/10 text-sm transition-colors font-medium"
            >
              Contrato
            </Link>
          )}
          <button onClick={() => setEditando(!editando)}
            className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors">
            {editando ? "Cancelar" : "Editar info"}
          </button>
          <button onClick={async () => {
            if (!confirm("¿Eliminar este trato?")) return;
            await fetch(`/api/tratos/${trato.id}`, { method: "DELETE" });
            router.push("/crm/tratos");
          }} className="px-4 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 text-sm transition-colors">
            Eliminar
          </button>
        </div>
      </div>

      {/* ── Etapa pipeline ── */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Etapa del pipeline</p>
        <div className="flex gap-2">
          {ETAPAS.map((e) => (
            <button key={e} disabled={saving || e === trato.etapa} onClick={() => cambiarEtapa(e)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                e === trato.etapa ? ETAPA_COLORS[e] : "bg-[#1a1a1a] text-gray-500 hover:text-white border border-[#2a2a2a]"
              }`}>
              {ETAPA_LABELS[e]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Siguiente acción recomendada + Formulario para prospecto ── */}
      {(() => {
        const formUrl = trato.formToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/f/${trato.formToken}` : "";
        const telefono = trato.cliente.telefono?.replace(/\D/g, "");
        const waUrl = telefono ? `https://wa.me/52${telefono}?text=${encodeURIComponent(`Hola ${trato.cliente.nombre.split(" ")[0]}, para prepararte una propuesta personalizada necesito que completes este breve formulario: ${formUrl}`)}` : null;

        // Acción recomendada
        const acciones: Record<string, { icon: string; titulo: string; desc: string; color: string }> = {
          PIDIENDO_INFO:   { icon: "ℹ️",  titulo: "Enviar información + formulario",     desc: "El cliente está investigando. Envía el formulario para conocer su proyecto.", color: "border-blue-700/40 bg-blue-900/10" },
          EXPLORANDO:      { icon: "📋", titulo: "Enviar formulario de descubrimiento",  desc: "Que el cliente comparta los detalles de su evento para poder cotizar.", color: "border-[#B3985B]/40 bg-[#B3985B]/5" },
          COMPARANDO:      { icon: "📞", titulo: "Agendar llamada o reunión",            desc: "Está comparando. Una reunión puede hacer la diferencia.", color: "border-yellow-700/40 bg-yellow-900/10" },
          LISTO_CONTRATAR: { icon: "⚡", titulo: "Generar cotización ya",                desc: "El cliente está listo. Cotiza cuanto antes.", color: "border-green-700/40 bg-green-900/10" },
        };
        const accion = trato.formEstado === "COMPLETADO"
          ? { icon: "✅", titulo: "Generar cotización", desc: "El prospecto completó el formulario. Tienes toda la info.", color: "border-green-700/40 bg-green-900/10" }
          : acciones[trato.etapaContratacion ?? "EXPLORANDO"] ?? acciones["EXPLORANDO"];

        return (
          <div className="space-y-3">
            {/* Banner acción recomendada */}
            <div className={`border rounded-xl p-4 flex items-start gap-3 ${accion.color}`}>
              <span className="text-xl mt-0.5">{accion.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">{accion.titulo}</p>
                <p className="text-gray-400 text-xs mt-0.5">{accion.desc}</p>
              </div>
              {(trato.etapa !== "VENTA_CERRADA" && trato.etapa !== "VENTA_PERDIDA") && (
                <Link href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
                  className="shrink-0 text-xs text-[#B3985B] hover:text-[#c9a96a] border border-[#B3985B]/30 px-3 py-1.5 rounded-lg transition-colors">
                  + Cotización
                </Link>
              )}
            </div>

            {/* Formulario para prospecto */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Formulario para prospecto</p>
                  {trato.formEstado === "COMPLETADO" && <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded">Completado ✓</span>}
                  {trato.formEstado === "ENVIADO" && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">Enviado · En espera</span>}
                  {trato.formEstado === "NO_ENVIADO" && trato.formToken && <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded">Link generado</span>}
                </div>
              </div>

              {!trato.formToken ? (
                <div className="flex items-center gap-3">
                  <p className="text-gray-600 text-xs flex-1">Genera un link personalizado para que el prospecto llene los detalles de su evento.</p>
                  <button onClick={generarFormToken} disabled={generandoToken}
                    className="shrink-0 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 hover:text-white text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                    {generandoToken ? "Generando..." : "Generar link"}
                  </button>
                </div>
              ) : trato.formEstado === "COMPLETADO" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-green-400 text-xs">✓ El prospecto completó el formulario. La información se sincronizó al trato.</p>
                    <a
                      href={`/api/tratos/${trato.id}/form-pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      ↓ PDF
                    </a>
                  </div>
                  {trato.formRespuestas && (() => {
                    let resp: Record<string, unknown> = {};
                    try { resp = JSON.parse(trato.formRespuestas!); } catch { /* empty */ }
                    const entries = Object.entries(resp).filter(([, v]) => v !== "" && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0));
                    return entries.length > 0 ? (
                      <div className="bg-[#0d0d0d] rounded-lg p-3 space-y-1.5">
                        {entries.map(([key, val]) => (
                          <div key={key} className="flex gap-2 text-xs">
                            <span className="text-gray-500 w-36 shrink-0">{FORM_KEY_LABELS[key] ?? key}</span>
                            <span className="text-gray-200">{Array.isArray(val) ? val.join(", ") : String(val)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-[#0d0d0d] rounded-lg px-3 py-2">
                    <span className="text-gray-600 text-xs flex-1 truncate">{formUrl}</span>
                    <button onClick={() => copiarLink(formUrl)} className="shrink-0 text-xs text-[#B3985B] hover:text-[#c9a96a] transition-colors">
                      {linkCopiado ? "¡Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {waUrl ? (
                      <a href={waUrl} target="_blank" rel="noopener noreferrer"
                        onClick={marcarFormEnviado}
                        className="flex items-center gap-1.5 bg-green-800 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                        💬 Enviar por WhatsApp
                      </a>
                    ) : (
                      <p className="text-gray-600 text-xs">Agrega el teléfono del cliente para enviar por WhatsApp.</p>
                    )}
                    {trato.formEstado === "NO_ENVIADO" && (
                      <button onClick={marcarFormEnviado} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                        Marcar como enviado (manualmente)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN DESCUBRIMIENTO
          Estado 1: sin canal  →  seleccionar canal
          Estado 2: canal set, no completo  →  formulario de descubrimiento
          Estado 3: completo  →  resumen + recomendaciones
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Estado 1: Seleccionar canal ── */}
      {!trato.canalAtencion && (
        <div className="bg-[#0d0d0d] border-2 border-[#B3985B]/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-[#B3985B]/20 flex items-center justify-center text-[#B3985B] font-bold text-sm">1</div>
            <div>
              <p className="text-white font-semibold">¿Cómo vas a atender este lead?</p>
              <p className="text-gray-500 text-xs">Selecciona la ruta de atención para determinar el nivel de descubrimiento</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CANALES.map(canal => (
              <button key={canal.id} onClick={() => seleccionarCanal(canal.id)} disabled={saving}
                className={`border ${canal.border} bg-[#111] hover:bg-[#1a1a1a] rounded-xl p-4 text-left transition-all group`}>
                <div className="text-2xl mb-2">{canal.icon}</div>
                <p className="text-white text-sm font-semibold group-hover:text-[#B3985B] transition-colors">{canal.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{canal.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Estado 2: Formulario de descubrimiento ── */}
      {trato.canalAtencion && !trato.descubrimientoCompleto && profundidad !== "INFO" && (
        <div className="bg-[#0d0d0d] border-2 border-[#B3985B]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#B3985B]/20 flex items-center justify-center text-[#B3985B] font-bold text-sm">2</div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">Descubrimiento</p>
                  {canalInfo && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${canalInfo.badge}`}>
                      {canalInfo.icon} {canalInfo.label} · {canalInfo.desc}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs">Completa la información del evento para continuar al proceso de cotización</p>
              </div>
            </div>
            <button onClick={() => seleccionarCanal("")} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Cambiar canal
            </button>
          </div>

          <div className="space-y-5">
            {/* Tipo de evento */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Tipo de evento *</label>
              <div className="flex gap-2">
                {["MUSICAL", "SOCIAL", "EMPRESARIAL", "OTRO"].map(te => (
                  <button key={te} onClick={() => setDiscForm(p => ({ ...p, tipoEvento: te, serviciosInteres: [] }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      discForm.tipoEvento === te
                        ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10"
                        : "border-[#333] text-gray-500 hover:text-white hover:border-[#555]"
                    }`}>
                    {te === "MUSICAL" ? "🎵 Musical" : te === "SOCIAL" ? "🥂 Social" : te === "EMPRESARIAL" ? "🏢 Empresarial" : "📅 Otro"}
                  </button>
                ))}
              </div>
            </div>

            {/* Campos base - aparecen en todos los niveles */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre del evento / proyecto</label>
                <input value={discForm.nombreEvento} onChange={e => setDiscForm(p => ({ ...p, nombreEvento: e.target.value }))}
                  placeholder="Ej: Boda García-López, Concierto Verano..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Fecha estimada del evento *</label>
                <input type="date" value={discForm.fechaEventoEstimada} onChange={e => setDiscForm(p => ({ ...p, fechaEventoEstimada: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Ciudad / Lugar del evento *</label>
                <input value={discForm.lugarEstimado} onChange={e => setDiscForm(p => ({ ...p, lugarEstimado: e.target.value }))}
                  placeholder="Ej: CDMX · Salón Versalles"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Tipo de servicio</label>
                <select value={discForm.tipoServicio} onChange={e => setDiscForm(p => ({ ...p, tipoServicio: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                  <option value="">— Por definir —</option>
                  <option value="RENTA">Renta de equipo</option>
                  <option value="PRODUCCION_TECNICA">Producción técnica</option>
                  <option value="DIRECCION_TECNICA">Dirección técnica</option>
                </select>
              </div>
            </div>

            {/* Servicios de interés */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Servicios de interés *</label>
              <div className="flex flex-wrap gap-2">
                {serviciosDisponibles.map(srv => (
                  <button key={srv.id} onClick={() => toggleServicio(srv.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      discForm.serviciosInteres.includes(srv.id)
                        ? "border-[#B3985B] text-black bg-[#B3985B]"
                        : "border-[#333] text-gray-400 hover:border-[#555] hover:text-white"
                    }`}>
                    {srv.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campos medios — formulario y arriba */}
            {(profundidad === "MEDIO" || profundidad === "PROFUNDO") && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#1a1a1a]">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Asistentes estimados</label>
                  <input type="number" value={discForm.asistentesEstimados} onChange={e => setDiscForm(p => ({ ...p, asistentesEstimados: e.target.value }))}
                    placeholder="300"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Presupuesto estimado ($)</label>
                  <input type="number" value={discForm.presupuestoEstimado} onChange={e => setDiscForm(p => ({ ...p, presupuestoEstimado: e.target.value }))}
                    placeholder="50000"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Duración del evento</label>
                  <input value={discForm.duracionEvento} onChange={e => setDiscForm(p => ({ ...p, duracionEvento: e.target.value }))}
                    placeholder="Ej: 6 horas, 2 días"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Etapa de contratación</label>
                  <select value={discForm.etapaContratacion} onChange={e => setDiscForm(p => ({ ...p, etapaContratacion: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="EXPLORANDO">Explorando opciones</option>
                    <option value="COMPARANDO">Comparando proveedores</option>
                    <option value="LISTO_CONTRATAR">Listo para contratar</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Continuar el proceso por</label>
                  <select value={discForm.continuarPor} onChange={e => setDiscForm(p => ({ ...p, continuarPor: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="LLAMADA">Llamada</option>
                    <option value="REUNION">Reunión presencial</option>
                    <option value="COTIZACION">Cotización directa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Ideas / Referencias (links)</label>
                  <input value={discForm.ideasReferencias} onChange={e => setDiscForm(p => ({ ...p, ideasReferencias: e.target.value }))}
                    placeholder="Instagram, Pinterest, YouTube..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
            )}

            {/* Campos profundos — llamada, reunión, scouting */}
            {profundidad === "PROFUNDO" && (
              <div className="space-y-3 pt-2 border-t border-[#1a1a1a]">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Notas detalladas del descubrimiento</label>
                  <textarea value={discForm.notas} onChange={e => setDiscForm(p => ({ ...p, notas: e.target.value }))}
                    rows={4} placeholder="Detalles específicos, necesidades especiales, contexto del evento, expectativas del cliente..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Próxima acción concreta</label>
                    <input value={discForm.proximaAccion} onChange={e => setDiscForm(p => ({ ...p, proximaAccion: e.target.value }))}
                      placeholder="Ej: Enviar cotización el lunes"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
              <button onClick={() => guardarDescubrimiento(false)} disabled={saving}
                className="text-gray-400 text-sm hover:text-white transition-colors">
                Guardar borrador
              </button>
              <button onClick={() => guardarDescubrimiento(true)} disabled={saving || !discForm.fechaEventoEstimada || !discForm.lugarEstimado}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-lg transition-colors">
                {saving ? "Guardando..." : "Descubrimiento completo → Oportunidad"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Estado 2b: Canal INFO ── */}
      {trato.canalAtencion === "INFORMACION" && !trato.descubrimientoCompleto && (
        <div className="bg-[#0d0d0d] border-2 border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="text-white font-semibold">Lead en fase de información</p>
              <p className="text-gray-500 text-xs">El prospecto solo está explorando. Registra los datos básicos y programa un seguimiento.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Tipo de evento</label>
              <select value={discForm.tipoEvento} onChange={e => setDiscForm(p => ({ ...p, tipoEvento: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="MUSICAL">Musical</option>
                <option value="SOCIAL">Social</option>
                <option value="EMPRESARIAL">Empresarial</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Fecha aproximada</label>
              <input type="date" value={discForm.fechaEventoEstimada} onChange={e => setDiscForm(p => ({ ...p, fechaEventoEstimada: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Notas / qué información solicitó</label>
              <textarea value={discForm.notas} onChange={e => setDiscForm(p => ({ ...p, notas: e.target.value }))}
                rows={2} placeholder="¿Qué información buscaba? ¿Qué servicios le interesaron?"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <button onClick={() => seleccionarCanal("")} className="text-xs text-gray-600 hover:text-gray-400">Cambiar canal</button>
            <button onClick={() => guardarDescubrimiento(false)} disabled={saving}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
              Guardar y programar seguimiento
            </button>
          </div>
        </div>
      )}

      {/* ── Estado 3: Descubrimiento completo – resumen + recomendaciones ── */}
      {trato.descubrimientoCompleto && (
        <div className="bg-[#0d0d0d] border border-[#B3985B]/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#B3985B]/20 flex items-center justify-center text-[#B3985B] text-sm">✓</div>
              <div>
                <p className="text-white font-semibold">Descubrimiento completo</p>
                {canalInfo && <p className="text-gray-500 text-xs">Canal: {canalInfo.icon} {canalInfo.label}</p>}
              </div>
            </div>
            <button onClick={() => setTrato(prev => prev ? { ...prev, descubrimientoCompleto: false } : prev)}
              className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors">
              Editar descubrimiento
            </button>
          </div>

          {/* Resumen en chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-[#111] rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Evento</p>
              <p className="text-white text-sm font-medium">{trato.tipoEvento}</p>
              {trato.nombreEvento && <p className="text-gray-400 text-xs">{trato.nombreEvento}</p>}
            </div>
            <div className="bg-[#111] rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Fecha</p>
              <p className="text-white text-sm font-medium">{fmtDate(trato.fechaEventoEstimada)}</p>
              {trato.duracionEvento && <p className="text-gray-400 text-xs">{trato.duracionEvento}</p>}
            </div>
            <div className="bg-[#111] rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Lugar</p>
              <p className="text-white text-sm font-medium">{trato.lugarEstimado ?? "—"}</p>
              {trato.asistentesEstimados && <p className="text-gray-400 text-xs">{trato.asistentesEstimados} asistentes</p>}
            </div>
            <div className="bg-[#111] rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Presupuesto</p>
              <p className="text-white text-sm font-medium">{trato.presupuestoEstimado ? fmt(trato.presupuestoEstimado) : "—"}</p>
              {trato.etapaContratacion && (
                <p className="text-gray-400 text-xs">{
                  trato.etapaContratacion === "EXPLORANDO" ? "Explorando" :
                  trato.etapaContratacion === "COMPARANDO" ? "Comparando" : "Listo para contratar"
                }</p>
              )}
            </div>
          </div>

          {/* Servicios de interés */}
          {serviciosSel.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Servicios solicitados</p>
              <div className="flex flex-wrap gap-2">
                {serviciosSel.map(sid => {
                  const srv = (SERVICIOS[trato.tipoEvento] ?? SERVICIOS.OTRO).find(s => s.id === sid);
                  return srv ? (
                    <span key={sid} className="px-3 py-1 bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] text-xs rounded-full">
                      {srv.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Recomendaciones de categorías de equipo */}
          {serviciosSel.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Categorías recomendadas para la cotización</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {serviciosSel.includes("AUDIO_PA") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🔊 Audio principal (PA)</div>}
                {serviciosSel.includes("AUDIO_MONITOR") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎧 Monitores / IEM</div>}
                {serviciosSel.includes("AUDIO_CONF") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎙️ Audio conferencia</div>}
                {(serviciosSel.includes("ILUM_ARTISTICA") || serviciosSel.includes("ILUM_ESCENARIO") || serviciosSel.includes("ILUM_PISTA") || serviciosSel.includes("ILUM_AMBIENTAL")) && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">💡 Iluminación</div>}
                {(serviciosSel.includes("VIDEO_LED") || serviciosSel.includes("PROYECCION")) && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">📺 Video / LED / Proyección</div>}
                {serviciosSel.includes("VIDEO_PRODUCCION") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎥 Producción de video</div>}
                {serviciosSel.includes("BACKLINE") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎸 Backline</div>}
                {serviciosSel.includes("EFECTOS") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">✨ Efectos especiales</div>}
                {serviciosSel.includes("DJ") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎚️ DJ / Soporte DJ</div>}
                {serviciosSel.includes("PISTA_BAILE") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">💃 Pista de baile</div>}
                {serviciosSel.includes("STREAMING") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">📡 Streaming en vivo</div>}
                {serviciosSel.includes("GRABACION") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎬 Grabación</div>}
                {(serviciosSel.includes("PRODUCCION_GENERAL")) && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">⚙️ Producción general</div>}
              </div>
            </div>
          )}

          {/* Próximo paso */}
          {trato.continuarPor && (
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-xs">
                Siguiente paso:&nbsp;
                <span className="text-white">
                  {trato.continuarPor === "WHATSAPP" ? "💬 Seguimiento por WhatsApp" :
                   trato.continuarPor === "LLAMADA" ? "📞 Llamada de seguimiento" :
                   trato.continuarPor === "REUNION" ? "👥 Reunión presencial" :
                   "📄 Generar cotización"}
                </span>
              </p>
              <Link href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
                className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                Crear cotización →
              </Link>
            </div>
          )}

          {trato.ideasReferencias && (
            <p className="text-gray-600 text-xs mt-3">Referencias: {trato.ideasReferencias}</p>
          )}
        </div>
      )}

      {/* ── Briefing del cliente ── */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Briefing del cliente</h2>
            <p className="text-gray-500 text-xs mt-0.5">Escribe, pega o adjunta todo lo que el cliente comparta — libre, sin estructura</p>
          </div>
          <button
            onClick={guardarBriefing}
            disabled={savingBriefing}
            className="px-4 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#333] text-gray-400 hover:text-white text-xs transition-colors disabled:opacity-40"
          >
            {savingBriefing ? "Guardando..." : "Guardar"}
          </button>
        </div>
        <textarea
          value={briefingText}
          onChange={(e) => setBriefingText(e.target.value)}
          onBlur={guardarBriefing}
          rows={8}
          placeholder={`Escribe o pega aquí todo lo que el cliente comparta:\n\n• Descripción del evento\n• Requerimientos técnicos\n• Expectativas y referencias\n• Mensajes de WhatsApp, correos, notas de llamada...\n• Cualquier detalle relevante`}
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-3 text-gray-200 text-sm focus:outline-none focus:border-[#B3985B] resize-y leading-relaxed placeholder:text-gray-700"
        />

        {/* Adjuntos */}
        <div className="mt-4 border-t border-[#1a1a1a] pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Archivos adjuntos</p>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333] text-xs cursor-pointer transition-colors ${uploadingArchivo ? "opacity-40 pointer-events-none" : "text-gray-400 hover:text-white hover:border-[#555]"}`}>
              {uploadingArchivo ? "Subiendo..." : "+ Adjuntar archivo"}
              <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" onChange={subirArchivo} />
            </label>
          </div>

          {archivos.length === 0 ? (
            <p className="text-gray-600 text-xs italic">Sin archivos adjuntos aún</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {archivos.map((a) => {
                const esImagen = a.tipo === "IMAGEN" || /\.(jpe?g|png|gif|webp|heic)$/i.test(a.url);
                return (
                  <div key={a.id} className="group relative bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                    {esImagen ? (
                      <a href={a.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.url} alt={a.nombre} className="w-full h-24 object-cover hover:opacity-90 transition-opacity" />
                      </a>
                    ) : (
                      <a href={a.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-4 hover:bg-[#1a1a1a] transition-colors">
                        <span className="text-2xl">
                          {/\.pdf$/i.test(a.url) ? "📄" : /\.(doc|docx)$/i.test(a.url) ? "📝" : /\.(xls|xlsx)$/i.test(a.url) ? "📊" : "📎"}
                        </span>
                        <span className="text-gray-300 text-xs truncate">{a.nombre}</span>
                      </a>
                    )}
                    <button
                      onClick={() => eliminarArchivo(a.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-red-400 text-xs items-center justify-center hidden group-hover:flex hover:bg-red-900/60 transition-colors"
                    >
                      ×
                    </button>
                    <p className="px-2 py-1 text-gray-600 text-xs truncate border-t border-[#1a1a1a]">{a.nombre}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Grid: Detalles + Sidebar ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Datos del evento (editable) */}
        <div className="col-span-2 bg-[#111] border border-[#222] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Detalles del trato</h2>
          </div>
          {editando ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo de evento</label>
                  <select value={form.tipoEvento || ""} onChange={e => setForm(p => ({ ...p, tipoEvento: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="MUSICAL">Musical</option>
                    <option value="SOCIAL">Social</option>
                    <option value="EMPRESARIAL">Empresarial</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo de servicio</label>
                  <select value={form.tipoServicio || ""} onChange={e => setForm(p => ({ ...p, tipoServicio: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">— Sin especificar —</option>
                    <option value="RENTA">Renta de Equipo</option>
                    <option value="PRODUCCION_TECNICA">Producción Técnica</option>
                    <option value="DIRECCION_TECNICA">Dirección Técnica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Lugar estimado</label>
                  <input value={form.lugarEstimado || ""} onChange={e => setForm(p => ({ ...p, lugarEstimado: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fecha estimada</label>
                  <input type="date" value={form.fechaEventoEstimada ? (form.fechaEventoEstimada as string).split("T")[0] : ""}
                    onChange={e => setForm(p => ({ ...p, fechaEventoEstimada: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Presupuesto estimado ($)</label>
                  <input type="number" value={form.presupuestoEstimado || ""} onChange={e => setForm(p => ({ ...p, presupuestoEstimado: parseFloat(e.target.value) }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Clasificación</label>
                  <select value={form.clasificacion || "PROSPECTO"} onChange={e => setForm(p => ({ ...p, clasificacion: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="PROSPECTO">Prospecto</option>
                    <option value="BASIC">Basic</option>
                    <option value="REGULAR">Regular</option>
                    <option value="PRIORITY">Priority</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notas</label>
                <textarea value={form.notas || ""} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                  rows={3} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Próxima acción</label>
                  <input value={form.proximaAccion || ""} onChange={e => setForm(p => ({ ...p, proximaAccion: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fecha próxima acción</label>
                  <input type="date" value={form.fechaProximaAccion ? (form.fechaProximaAccion as string).split("T")[0] : ""}
                    onChange={e => setForm(p => ({ ...p, fechaProximaAccion: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={guardar} disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Lugar estimado</p>
                <p className="text-white">{trato.lugarEstimado || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Fecha estimada</p>
                <p className="text-white">{fmtDate(trato.fechaEventoEstimada)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Presupuesto estimado</p>
                <p className="text-white">{trato.presupuestoEstimado ? fmt(trato.presupuestoEstimado) : "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Tipo de servicio</p>
                <p className="text-white">{trato.tipoServicio?.replace("_", " ") || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Origen del lead</p>
                <p className="text-white">{ORIGEN_LABELS[trato.origenLead] || trato.origenLead}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Origen de venta</p>
                <div className="flex items-center gap-2">
                  <select
                    value={trato.origenVenta}
                    onChange={async (e) => {
                      await fetch(`/api/tratos/${trato.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ origenVenta: e.target.value }),
                      });
                      setTrato(prev => prev ? { ...prev, origenVenta: e.target.value } : prev);
                    }}
                    className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                  >
                    <option value="CLIENTE_PROPIO">Cliente propio (10%)</option>
                    <option value="PUBLICIDAD">Publicidad (5%)</option>
                    <option value="ASIGNADO">Asignado empresa (5%+5%)</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Clasificación</p>
                <p className="text-white">{trato.clasificacion}</p>
              </div>
              {trato.proximaAccion && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Próxima acción</p>
                  <p className="text-white">{trato.proximaAccion}</p>
                  {trato.fechaProximaAccion && (
                    <p className="text-[#B3985B] text-xs mt-0.5">{fmtDate(trato.fechaProximaAccion)}</p>
                  )}
                </div>
              )}
              {trato.notas && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Notas</p>
                  <p className="text-gray-300 leading-relaxed">{trato.notas}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar cliente */}
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Cliente</h2>
            <Link href={`/crm/clientes/${trato.cliente.id}`} className="block hover:opacity-80 transition-opacity">
              <p className="text-white font-medium text-sm">{trato.cliente.nombre}</p>
              {trato.cliente.empresa && <p className="text-gray-400 text-xs">{trato.cliente.empresa}</p>}
            </Link>
            {trato.cliente.telefono && <p className="text-gray-300 text-xs mt-2">{trato.cliente.telefono}</p>}
            {trato.cliente.correo && <p className="text-gray-300 text-xs">{trato.cliente.correo}</p>}
            <div className="flex gap-2 mt-3">
              <span className="px-2 py-0.5 rounded text-xs bg-[#222] text-gray-300">{trato.cliente.tipoCliente}</span>
              <span className="px-2 py-0.5 rounded text-xs bg-[#222] text-gray-300">{trato.cliente.clasificacion}</span>
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Creado el</p>
            <p className="text-white text-sm">{fmtDate(trato.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Cotizaciones */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Cotizaciones</h2>
          <div className="flex items-center gap-3">
            {trato.cotizaciones.length > 0 && (
              <Link
                href={`/contratos/${trato.id}`}
                target="_blank"
                className="text-xs text-[#B3985B] hover:underline"
              >
                Ver contrato →
              </Link>
            )}
            <Link href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
              className="text-xs text-[#B3985B] hover:underline">+ Nueva</Link>
          </div>
        </div>
        {trato.cotizaciones.length === 0 ? (
          <p className="text-gray-500 text-sm">Sin cotizaciones aún.</p>
        ) : (
          <div className="space-y-2">
            {trato.cotizaciones.map((c) => (
              <Link key={c.id} href={`/cotizaciones/${c.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-mono">{c.numeroCotizacion}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${ESTADO_COT_COLORS[c.estado] || "bg-gray-700 text-gray-300"}`}>
                    {c.estado}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{fmt(c.granTotal)}</p>
                  <p className="text-gray-500 text-xs">{fmtDate(c.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
