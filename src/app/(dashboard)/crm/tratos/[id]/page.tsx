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
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
  duracionMontajeHrs: number | null;
  ventanaMontajeInicio: string | null;
  tipoProspecto: string;
  nurturingData: string | null;
  ventanaMontajeFin: string | null;
  cliente: {
    id: string; nombre: string; empresa: string | null;
    tipoCliente: string; clasificacion: string;
    telefono: string | null; correo: string | null;
  };
  responsable: { id: string; name: string } | null;
  cotizaciones: Array<{ id: string; numeroCotizacion: string; estado: string; granTotal: number; createdAt: string; proyecto: { id: string } | null }>;
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

// ─── Constantes Renta ─────────────────────────────────────────────────────────
const CATEGORIAS_RENTA = [
  { id: "AUDIO_PA",      label: "Audio PA" },
  { id: "SUBWOOFERS",    label: "Subwoofers" },
  { id: "MONITORES",     label: "Monitores" },
  { id: "CONSOLA",       label: "Consola" },
  { id: "MICROFONOS",    label: "Micrófonos" },
  { id: "ILUMINACION",   label: "Iluminación" },
  { id: "PANTALLAS_LED", label: "Pantallas LED" },
  { id: "PROYECTOR",     label: "Proyector" },
  { id: "DJ_EQUIPO",     label: "Equipo DJ" },
  { id: "CABLES_ACC",    label: "Cables / accesorios" },
];

const RENTA_NIVEL = [
  { id: "SOLO_RENTA",    label: "Solo renta",           desc: "Cliente instala y opera" },
  { id: "RENTA_ENTREGA", label: "Renta + entrega",      desc: "Llevamos y recogemos" },
  { id: "RENTA_MONTAJE", label: "Renta + montaje",      desc: "Instalamos, cliente opera" },
  { id: "RENTA_FULL",    label: "Renta + operación",    desc: "Instalamos + técnico" },
];

const RENTA_ENTREGA = [
  { id: "RECOGE_BODEGA",  label: "Recoge en bodega",     desc: "Querétaro, Qro." },
  { id: "ENTREGA_BODEGA", label: "Llevamos a su bodega", desc: "A su almacén" },
  { id: "ENTREGA_VENUE",  label: "Llevamos al venue",    desc: "Directo al evento" },
];

// ─── Nurturing / Prospecto en frío ───────────────────────────────────────────
const NURTURING_ETAPAS = [
  { id: "PRIMER_CONTACTO",    icon: "🌱", label: "Primer contacto" },
  { id: "COMPARTIENDO_VALOR", icon: "📚", label: "Compartiendo valor" },
  { id: "CONSTRUYENDO",       icon: "🤝", label: "Construyendo relación" },
  { id: "DETECTANDO",         icon: "🎯", label: "Detectando momento" },
  { id: "LISTO",              icon: "✅", label: "Listo para propuesta" },
];

const TOUCHPOINT_TYPES = [
  { id: "WA_INFO",   icon: "💬", label: "WA Info" },
  { id: "PORTFOLIO", icon: "📸", label: "Portfolio" },
  { id: "VALOR",     icon: "💡", label: "Dato de valor" },
  { id: "FOLLOW_UP", icon: "👋", label: "Follow-up" },
  { id: "LLAMADA",   icon: "📞", label: "Llamada" },
  { id: "DETECCION", icon: "🎯", label: "Detección" },
];

const WA_TEMPLATES: Array<{ id: string; tipo: string; icon: string; label: string; msg: (n: string) => string }> = [
  {
    id: "presentacion", tipo: "WA_INFO", icon: "🤝", label: "Presentación",
    msg: (n) => `Hola ${n}! 👋 Somos *Mainstage Pro*, empresa de producción de audio e iluminación en Querétaro. Nos especializamos en hacer que los eventos suenen y se vean increíbles — conciertos, bodas, eventos corporativos y más.\n\nSi en algún momento planeas un evento y necesitas apoyo técnico, aquí estamos. ¡Saludos! 🎵✨`,
  },
  {
    id: "portfolio", tipo: "PORTFOLIO", icon: "📸", label: "Portfolio",
    msg: (n) => `Hola ${n}! 😊 Quería compartirte un poco del trabajo reciente de *Mainstage Pro* — producción de audio e iluminación en eventos de todo tipo.\n\nLa calidad del sonido y la luz hacen toda la diferencia para crear una experiencia memorable. ¿Te gustaría ver ejemplos de nuestro trabajo? Con gusto te compartimos nuestro portfolio. 📩`,
  },
  {
    id: "valor", tipo: "VALOR", icon: "💡", label: "Dato de valor",
    msg: (n) => `Hola ${n}! 💡 ¿Sabías que uno de los errores más comunes en eventos es subestimar el audio?\n\nUn sistema bien diseñado y calibrado transforma completamente la experiencia de los asistentes. En *Mainstage Pro* lo hacemos con equipo de primer nivel y operadores certificados.\n\nEspero te sea útil para cuando planees tu próximo evento. 🙌`,
  },
  {
    id: "follow_up", tipo: "FOLLOW_UP", icon: "👋", label: "Check-in",
    msg: (n) => `Hola ${n}! 😊 Paso a saludarte por parte del equipo de *Mainstage Pro*. ¿Todo bien por allá?\n\nSin prisa ni presión — cuando tengas un evento en mente y quieras explorar opciones, aquí estaremos con gusto. ¡Que tengas un excelente día! 🎉`,
  },
  {
    id: "deteccion", tipo: "DETECCION", icon: "🎯", label: "¿Hay algo pronto?",
    msg: (n) => `Hola ${n}! 🙋 Ha pasado un tiempo desde que hablamos. ¿Cómo van los planes?\n\nSi tienes algún evento próximo en el que podamos apoyarte — producción de audio, iluminación, renta de equipo — con mucho gusto platicamos. ¿Hay algo en puerta? 📅`,
  },
];

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
  // Modo de descubrimiento: "VENDEDOR" | "CLIENTE" (inferido del formToken, editable)
  const [modoDescubrimiento, setModoDescubrimiento] = useState<"VENDEDOR" | "CLIENTE">("VENDEDOR");
  // Gate primario: muestra selector de canal dentro del gate
  const [showCanales, setShowCanales] = useState(false);

  // Nurturing state
  type NurturingData = { etapa: string; temperatura: string; nextFollowup: string; nextMotivo: string; log: Array<{ fecha: string; tipo: string; notas: string }> };
  const NURTURING_EMPTY: NurturingData = { etapa: "PRIMER_CONTACTO", temperatura: "FRIO", nextFollowup: "", nextMotivo: "", log: [] };
  const [nurturing, setNurturing] = useState<NurturingData>(NURTURING_EMPTY);
  const [nuevoTP, setNuevoTP] = useState({ tipo: "WA_INFO", notas: "" });
  const [savingNurturing, setSavingNurturing] = useState(false);

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
    // Campos específicos de Renta
    rentaModalidadServicio: "",
    rentaModalidadEntrega: "",
    rentaDireccionEntrega: "",
    rentaFechaEntrega: "",
    rentaHoraEntrega: "",
    rentaFechaDevolucion: "",
    rentaHoraDevolucion: "",
    rentaDescripcionEquipos: "",
    rentaTecnicoPropio: "",
    horaInicioEvento: "",
    horaFinEvento: "",
    duracionMontajeHrs: "",
    ventanaMontajeInicio: "",
    ventanaMontajeFin: "",
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
          // Inferir modo: si tiene formToken activo → cliente, si no → vendedor
          if (t.formToken) setModoDescubrimiento("CLIENTE");
          // Pre-fill nurturing
          if (t.nurturingData) {
            try { setNurturing({ ...NURTURING_EMPTY, ...JSON.parse(t.nurturingData) }); } catch { /* defaults */ }
          }
          setBriefingText(t.notas ?? "");
          setArchivos(t.archivos ?? []);
          // Parse rental-specific fields from ideasReferencias if service is RENTA
          let rentaData: Record<string, string> = {};
          if (t.tipoServicio === "RENTA" && t.ideasReferencias) {
            try { rentaData = JSON.parse(t.ideasReferencias); } catch { /* plain text */ }
          }
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
            ideasReferencias: t.tipoServicio !== "RENTA" ? (t.ideasReferencias ?? "") : "",
            notas: t.notas ?? "",
            proximaAccion: t.proximaAccion ?? "",
            serviciosInteres: t.serviciosInteres ? JSON.parse(t.serviciosInteres) : [],
            // Rental fields
            rentaModalidadServicio: rentaData.modalidadServicio ?? "",
            rentaModalidadEntrega:  rentaData.modalidadEntrega ?? "",
            rentaDireccionEntrega:  rentaData.direccionEntrega ?? "",
            rentaFechaEntrega:      rentaData.fechaEntrega ?? "",
            rentaHoraEntrega:       rentaData.horaEntrega ?? "",
            rentaFechaDevolucion:   rentaData.fechaDevolucion ?? "",
            rentaHoraDevolucion:    rentaData.horaDevolucion ?? "",
            rentaDescripcionEquipos:rentaData.descripcionEquipos ?? "",
            rentaTecnicoPropio:     rentaData.tecnicoPropio ?? "",
            horaInicioEvento:       t.horaInicioEvento ?? "",
            horaFinEvento:          t.horaFinEvento ?? "",
            duracionMontajeHrs:     t.duracionMontajeHrs?.toString() ?? "",
            ventanaMontajeInicio:   t.ventanaMontajeInicio ?? "",
            ventanaMontajeFin:      t.ventanaMontajeFin ?? "",
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

  async function guardarNurturing(data: NurturingData) {
    setSavingNurturing(true);
    await patch({ nurturingData: JSON.stringify(data) });
    setTrato(prev => prev ? { ...prev, nurturingData: JSON.stringify(data) } : prev);
    setSavingNurturing(false);
  }

  async function registrarTouchpoint(tipo: string, notas: string) {
    const entry = { fecha: new Date().toISOString().split("T")[0], tipo, notas: notas.trim() || tipo };
    const updated = { ...nurturing, log: [...nurturing.log, entry] };
    setNurturing(updated);
    setNuevoTP(p => ({ ...p, notas: "" }));
    await guardarNurturing(updated);
  }

  async function guardarDescubrimiento(completar = false) {
    setSaving(true);
    const isRenta = discForm.tipoServicio === "RENTA";
    const payload: Record<string, unknown> = {
      tipoEvento: discForm.tipoEvento,
      nombreEvento: discForm.nombreEvento || null,
      fechaEventoEstimada: discForm.fechaEventoEstimada === "por-definir" ? null : (discForm.fechaEventoEstimada || null),
      lugarEstimado: discForm.lugarEstimado === "por-definir" ? "Por definir" : (discForm.lugarEstimado || null),
      duracionEvento: discForm.duracionEvento || null,
      asistentesEstimados: discForm.asistentesEstimados ? parseInt(discForm.asistentesEstimados) : null,
      presupuestoEstimado: discForm.presupuestoEstimado ? parseFloat(discForm.presupuestoEstimado) : null,
      tipoServicio: discForm.tipoServicio || null,
      etapaContratacion: discForm.etapaContratacion || null,
      continuarPor: discForm.continuarPor || null,
      notas: discForm.notas || null,
      proximaAccion: discForm.proximaAccion || null,
      horaInicioEvento: discForm.horaInicioEvento || null,
      horaFinEvento: discForm.horaFinEvento || null,
      duracionMontajeHrs: discForm.duracionMontajeHrs ? parseFloat(discForm.duracionMontajeHrs) : null,
      ventanaMontajeInicio: discForm.ventanaMontajeInicio || null,
      ventanaMontajeFin: discForm.ventanaMontajeFin || null,
      serviciosInteres: JSON.stringify(discForm.serviciosInteres),
      ideasReferencias: isRenta
        ? JSON.stringify({
            modalidadServicio:  discForm.rentaModalidadServicio || null,
            modalidadEntrega:   discForm.rentaModalidadEntrega || null,
            direccionEntrega:   discForm.rentaDireccionEntrega || null,
            fechaEntrega:       discForm.rentaFechaEntrega || null,
            horaEntrega:        discForm.rentaHoraEntrega || null,
            fechaDevolucion:    discForm.rentaFechaDevolucion || null,
            horaDevolucion:     discForm.rentaHoraDevolucion || null,
            descripcionEquipos: discForm.rentaDescripcionEquipos || null,
            tecnicoPropio:      discForm.rentaTecnicoPropio || null,
          })
        : (discForm.ideasReferencias || null),
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

  const formUrl = trato.formToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/f/${trato.formToken}` : "";
  const _telefono = trato.cliente.telefono?.replace(/\D/g, "");
  const waUrl = _telefono ? `https://wa.me/52${_telefono}?text=${encodeURIComponent(`Hola ${trato.cliente.nombre.split(" ")[0]}, para prepararte una propuesta personalizada necesito que completes este breve formulario: ${formUrl}`)}` : null;

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
          {(() => {
            const tieneProyecto = trato.cotizaciones.some(c => c.proyecto);
            if (tieneProyecto) {
              return (
                <span title="Elimina primero el proyecto desde el módulo de Proyectos"
                  className="px-4 py-2 rounded-lg border border-[#333] text-gray-600 text-sm cursor-not-allowed select-none">
                  Eliminar
                </span>
              );
            }
            return (
              <button onClick={async () => {
                if (!confirm("¿Eliminar este trato? Esta acción no se puede deshacer.")) return;
                await fetch(`/api/tratos/${trato.id}`, { method: "DELETE" });
                router.push("/crm/tratos");
              }} className="px-4 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 text-sm transition-colors">
                Eliminar
              </button>
            );
          })()}
        </div>
      </div>

      {/* ══ GATE PRIMARIO ══ */}
      {!trato.canalAtencion && trato.tipoProspecto !== "NURTURING" && (
        <div className="bg-[#0a0a0a] border-2 border-[#B3985B]/30 rounded-xl p-6">
          {!showCanales ? (
            <>
              <div className="text-center mb-6">
                <p className="text-white font-semibold text-lg">¿Cómo es este prospecto?</p>
                <p className="text-gray-500 text-sm mt-1">Esta selección define toda la ruta de trabajo</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={async () => {
                    const d = await patch({ tipoProspecto: "NURTURING" });
                    setTrato(prev => prev ? { ...prev, tipoProspecto: d.trato.tipoProspecto } : prev);
                  }}
                  disabled={saving}
                  className="border-2 border-emerald-700/50 bg-emerald-950/30 hover:bg-emerald-900/20 rounded-xl p-5 text-left transition-all group">
                  <div className="text-3xl mb-3">🌱</div>
                  <p className="text-emerald-300 font-semibold text-base group-hover:text-emerald-200 transition-colors">Prospecto en frío</p>
                  <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">Sin necesidad inmediata · Construir confianza a largo plazo · Seguimiento de valor</p>
                  <p className="text-emerald-700 text-xs mt-3 font-medium">Proceso de semanas o meses →</p>
                </button>
                <button
                  onClick={() => setShowCanales(true)}
                  className="border-2 border-[#B3985B]/50 bg-[#B3985B]/5 hover:bg-[#B3985B]/10 rounded-xl p-5 text-left transition-all group">
                  <div className="text-3xl mb-3">🎯</div>
                  <p className="text-[#B3985B] font-semibold text-base group-hover:text-[#c9a96a] transition-colors">Tiene necesidad concreta</p>
                  <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">Ya tiene un evento en mente · Hay que descubrir y cotizar · Proceso de venta activo</p>
                  <p className="text-[#B3985B]/60 text-xs mt-3 font-medium">Iniciar descubrimiento →</p>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setShowCanales(false)} className="text-gray-600 hover:text-gray-400 text-sm transition-colors">← Volver</button>
                <div>
                  <p className="text-white font-semibold">¿Cómo vas a atender este lead?</p>
                  <p className="text-gray-500 text-xs">Selecciona el canal de descubrimiento</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {CANALES.map(canal => (
                  <button key={canal.id} onClick={() => { seleccionarCanal(canal.id); setShowCanales(false); }} disabled={saving}
                    className={`border ${canal.border} bg-[#111] hover:bg-[#1a1a1a] rounded-xl p-4 text-left transition-all group`}>
                    <div className="text-2xl mb-2">{canal.icon}</div>
                    <p className="text-white text-sm font-semibold group-hover:text-[#B3985B] transition-colors">{canal.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{canal.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Toggle pequeño (solo cuando ya están en un flujo) ── */}
      {(trato.canalAtencion || trato.tipoProspecto === "NURTURING") && (
        <div className="flex gap-2">
          <button
            onClick={async () => { const d = await patch({ tipoProspecto: "ACTIVO" }); setTrato(p => p ? { ...p, tipoProspecto: d.trato.tipoProspecto } : p); }}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium border transition-colors ${
              trato.tipoProspecto !== "NURTURING"
                ? "bg-[#B3985B] text-black border-[#B3985B]"
                : "bg-[#111] text-gray-400 border-[#333] hover:text-white"
            }`}>
            🎯 Tiene necesidad concreta
          </button>
          <button
            onClick={async () => { const d = await patch({ tipoProspecto: "NURTURING" }); setTrato(p => p ? { ...p, tipoProspecto: d.trato.tipoProspecto } : p); }}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium border transition-colors ${
              trato.tipoProspecto === "NURTURING"
                ? "bg-emerald-800 text-white border-emerald-700"
                : "bg-[#111] text-gray-400 border-[#333] hover:text-white"
            }`}>
            🌱 Prospecto en frío
          </button>
        </div>
      )}

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

      {/* ── Siguiente acción recomendada ── */}
      {trato.tipoProspecto !== "NURTURING" && (() => {
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
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN DESCUBRIMIENTO
          Estado 1: sin canal  →  seleccionar canal
          Estado 2: canal set, no completo  →  formulario de descubrimiento
          Estado 3: completo  →  resumen + recomendaciones
      ══════════════════════════════════════════════════════════════════════ */}


      {/* ── Nurturing — Prospecto en frío ── */}
      {trato.tipoProspecto === "NURTURING" && (
        <div className="bg-[#0d0d0d] border-2 border-emerald-700/40 rounded-xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-700/20 flex items-center justify-center text-lg">🌱</div>
              <div>
                <p className="text-white font-semibold">Nurturing — Prospecto en frío</p>
                <p className="text-gray-500 text-xs">Construye confianza, comparte valor, sé paciente</p>
              </div>
            </div>
            <button onClick={async () => { const d = await patch({ tipoProspecto: "ACTIVO" }); setTrato(p => p ? { ...p, tipoProspecto: d.trato.tipoProspecto } : p); }} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Cambiar a activo</button>
          </div>

          {/* Temperatura */}
          <div className="mb-5">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Temperatura del prospecto</label>
            <div className="flex gap-2">
              {[
                { id: "FRIO",     icon: "❄️", label: "Frío",     cls: "border-blue-700/60 bg-blue-900/20 text-blue-300" },
                { id: "TIBIO",    icon: "🌡️", label: "Tibio",    cls: "border-yellow-600/60 bg-yellow-900/20 text-yellow-300" },
                { id: "CALIENTE", icon: "🔥", label: "Caliente", cls: "border-red-700/60 bg-red-900/20 text-red-300" },
              ].map(t => (
                <button key={t.id}
                  onClick={() => { const u = { ...nurturing, temperatura: t.id }; setNurturing(u); guardarNurturing(u); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${nurturing.temperatura === t.id ? t.cls : "border-[#333] text-gray-500 hover:text-white hover:border-[#555]"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Etapa */}
          <div className="mb-5">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Etapa del proceso</label>
            <div className="flex flex-wrap gap-2">
              {NURTURING_ETAPAS.map(e => (
                <button key={e.id}
                  onClick={() => { const u = { ...nurturing, etapa: e.id }; setNurturing(u); guardarNurturing(u); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${nurturing.etapa === e.id ? "border-emerald-600 bg-emerald-900/30 text-emerald-300" : "border-[#333] text-gray-500 hover:text-white hover:border-[#555]"}`}>
                  {e.icon} {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Próximo seguimiento */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Fecha del próximo contacto</label>
              <input type="date" value={nurturing.nextFollowup}
                onChange={e => setNurturing(p => ({ ...p, nextFollowup: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">¿Qué vas a compartirle?</label>
              <input value={nurturing.nextMotivo}
                onChange={e => setNurturing(p => ({ ...p, nextMotivo: e.target.value }))}
                placeholder="Ej: Portfolio de bodas, caso de éxito..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600" />
            </div>
          </div>
          <div className="flex justify-end mb-6">
            <button onClick={() => guardarNurturing(nurturing)} disabled={savingNurturing}
              className="bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition-colors">
              {savingNurturing ? "Guardando..." : "Guardar seguimiento"}
            </button>
          </div>

          {/* Plantillas de WhatsApp */}
          <div className="border-t border-[#1a1a1a] pt-5 mb-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Plantillas de WhatsApp — enviar valor</p>
            {trato.cliente.telefono ? (
              <div className="flex flex-wrap gap-2">
                {WA_TEMPLATES.map(tpl => {
                  const tel = trato.cliente.telefono!.replace(/\D/g, "");
                  const num = tel.startsWith("52") ? tel : `52${tel}`;
                  const msg = tpl.msg(trato.cliente.nombre.split(" ")[0]);
                  return (
                    <a key={tpl.id}
                      href={`https://wa.me/${num}?text=${encodeURIComponent(msg)}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => registrarTouchpoint(tpl.tipo, `Plantilla: ${tpl.label}`)}
                      className="flex items-center gap-1.5 bg-[#111] hover:bg-[#1a1a1a] border border-emerald-700/30 text-emerald-400 hover:text-emerald-300 text-xs px-3 py-2 rounded-lg transition-colors">
                      {tpl.icon} {tpl.label}
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-xs">Agrega el teléfono del cliente para usar las plantillas de WhatsApp.</p>
            )}
          </div>

          {/* Registrar touchpoint manual */}
          <div className="border-t border-[#1a1a1a] pt-5 mb-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Registrar contacto manual</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {TOUCHPOINT_TYPES.map(tp => (
                <button key={tp.id} onClick={() => setNuevoTP(p => ({ ...p, tipo: tp.id }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${nuevoTP.tipo === tp.id ? "border-emerald-600 text-emerald-300 bg-emerald-900/20" : "border-[#333] text-gray-500 hover:text-white hover:border-[#555]"}`}>
                  {tp.icon} {tp.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={nuevoTP.notas} onChange={e => setNuevoTP(p => ({ ...p, notas: e.target.value }))}
                placeholder="Notas del contacto..."
                onKeyDown={e => e.key === "Enter" && nuevoTP.notas.trim() && registrarTouchpoint(nuevoTP.tipo, nuevoTP.notas)}
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600" />
              <button onClick={() => registrarTouchpoint(nuevoTP.tipo, nuevoTP.notas)} disabled={savingNurturing || !nuevoTP.notas.trim()}
                className="bg-[#1a1a1a] hover:bg-[#222] border border-emerald-700/50 text-emerald-400 disabled:opacity-40 text-xs px-4 py-2 rounded-lg transition-colors">
                + Agregar
              </button>
            </div>
          </div>

          {/* Historial de touchpoints */}
          {nurturing.log.length > 0 && (
            <div className="border-t border-[#1a1a1a] pt-5 mb-6">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Historial de contactos ({nurturing.log.length})</p>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {[...nurturing.log].reverse().map((entry, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <span className="text-gray-600 shrink-0 tabular-nums">{entry.fecha}</span>
                    <span className="shrink-0">{TOUCHPOINT_TYPES.find(t => t.id === entry.tipo)?.icon ?? "📌"}</span>
                    <span className="text-gray-300">{entry.notas}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transición — prospecto listo para avanzar */}
          <div className="border-t border-[#1a1a1a] pt-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">¿El prospecto ya está listo para avanzar?</p>
            <p className="text-gray-600 text-xs mb-4">Selecciona la siguiente ruta cuando estén listos para una propuesta formal.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={async () => { const d = await patch({ tipoProspecto: "ACTIVO", canalAtencion: null }); setTrato(prev => prev ? { ...prev, ...d.trato } : prev); }}
                className="border border-[#B3985B]/40 bg-[#B3985B]/5 hover:bg-[#B3985B]/10 text-[#B3985B] text-sm font-medium px-4 py-3 rounded-xl transition-colors">
                <p className="font-semibold">🔍 Iniciar descubrimiento</p>
                <p className="text-xs text-[#B3985B]/60 mt-0.5">Tienen necesidad, hay que calificarla</p>
              </button>
              <button
                onClick={async () => {
                  const d = await patch({ tipoProspecto: "ACTIVO", rutaEntrada: "RIDER_DIRECTO", canalAtencion: "LLAMADA" });
                  setTrato(prev => prev ? { ...prev, ...d.trato } : prev);
                }}
                className="border border-blue-700/40 bg-blue-900/10 hover:bg-blue-900/20 text-blue-300 text-sm font-medium px-4 py-3 rounded-xl transition-colors">
                <p className="font-semibold">📋 Tienen rider técnico</p>
                <p className="text-xs text-blue-300/60 mt-0.5">Saben lo que necesitan, cotizar directo</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Estado 2: Formulario de descubrimiento ── */}
      {trato.tipoProspecto !== "NURTURING" && trato.canalAtencion && !trato.descubrimientoCompleto && profundidad !== "INFO" && (
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

          {/* Modo de descubrimiento */}
          <div className="flex gap-2 mb-5">
            <button onClick={() => setModoDescubrimiento("VENDEDOR")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
                modoDescubrimiento === "VENDEDOR"
                  ? "bg-[#B3985B] text-black border-[#B3985B]"
                  : "bg-[#111] text-gray-400 border-[#333] hover:text-white"
              }`}>
              🧑‍💼 Yo descubro ahora
            </button>
            <button onClick={() => setModoDescubrimiento("CLIENTE")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
                modoDescubrimiento === "CLIENTE"
                  ? "bg-blue-800 text-white border-blue-700"
                  : "bg-[#111] text-gray-400 border-[#333] hover:text-white"
              }`}>
              📱 El cliente llena formulario
            </button>
          </div>

          {modoDescubrimiento === "CLIENTE" && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Formulario para el cliente</p>
                {trato.formEstado === "COMPLETADO" && <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded">Completado ✓</span>}
                {trato.formEstado === "ENVIADO" && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">Enviado · En espera</span>}
                {trato.formEstado === "NO_ENVIADO" && trato.formToken && <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded">Link generado</span>}
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
                    <a href={`/api/tratos/${trato.id}/form-pdf`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
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
                  <button onClick={() => guardarDescubrimiento(true)} disabled={saving}
                    className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-lg transition-colors">
                    {saving ? "Guardando..." : "Marcar descubrimiento completo → Oportunidad"}
                  </button>
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
          )}

          {modoDescubrimiento === "VENDEDOR" && <div className="space-y-5">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Fecha estimada del evento *</label>
                  <button type="button" onClick={() => setDiscForm(p => ({ ...p, fechaEventoEstimada: p.fechaEventoEstimada === "por-definir" ? "" : "por-definir" }))}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${discForm.fechaEventoEstimada === "por-definir" ? "border-[#B3985B]/60 text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-600 hover:text-gray-400"}`}>
                    Por definir
                  </button>
                </div>
                {discForm.fechaEventoEstimada === "por-definir" ? (
                  <div className="w-full bg-[#1a1a1a] border border-[#B3985B]/30 rounded-lg px-3 py-2 text-[#B3985B] text-sm italic">Fecha por definir</div>
                ) : (
                  <input type="date" value={discForm.fechaEventoEstimada} onChange={e => setDiscForm(p => ({ ...p, fechaEventoEstimada: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Ciudad / Lugar del evento *</label>
                  <button type="button" onClick={() => setDiscForm(p => ({ ...p, lugarEstimado: p.lugarEstimado === "por-definir" ? "" : "por-definir" }))}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${discForm.lugarEstimado === "por-definir" ? "border-[#B3985B]/60 text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-600 hover:text-gray-400"}`}>
                    Por definir
                  </button>
                </div>
                {discForm.lugarEstimado === "por-definir" ? (
                  <div className="w-full bg-[#1a1a1a] border border-[#B3985B]/30 rounded-lg px-3 py-2 text-[#B3985B] text-sm italic">Lugar por definir</div>
                ) : (
                  <input value={discForm.lugarEstimado} onChange={e => setDiscForm(p => ({ ...p, lugarEstimado: e.target.value }))}
                    placeholder="Ej: CDMX · Salón Versalles"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Tipo de servicio</label>
                <select value={discForm.tipoServicio} onChange={e => setDiscForm(p => ({ ...p, tipoServicio: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                  <option value="">— Seleccionar —</option>
                  <option value="POR_DESCUBRIR">Por descubrir</option>
                  <option value="RENTA">Renta de equipo</option>
                  <option value="PRODUCCION_TECNICA">Producción técnica</option>
                  <option value="DIRECCION_TECNICA">Dirección técnica</option>
                </select>
              </div>

              {/* Horarios del evento */}
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-2">Horarios del evento</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">Inicio del evento</label>
                    <input type="time" value={discForm.horaInicioEvento}
                      onChange={e => setDiscForm(p => ({ ...p, horaInicioEvento: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <span className="text-gray-600 text-sm pt-4">→</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">Fin del evento</label>
                    <input type="time" value={discForm.horaFinEvento}
                      onChange={e => setDiscForm(p => ({ ...p, horaFinEvento: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">Duración montaje (hrs)</label>
                    <input type="number" min="0" step="0.5" value={discForm.duracionMontajeHrs}
                      onChange={e => setDiscForm(p => ({ ...p, duracionMontajeHrs: e.target.value }))}
                      placeholder="ej: 4"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>

              {/* Ventana de montaje del venue */}
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-2">
                  Horario permitido de montaje en el venue
                  <span className="ml-1 text-gray-600">(según el cliente / contrato del lugar)</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">Entrada permitida desde</label>
                    <input type="time" value={discForm.ventanaMontajeInicio}
                      onChange={e => setDiscForm(p => ({ ...p, ventanaMontajeInicio: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <span className="text-gray-600 text-sm pt-4">→</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">Límite para terminar montaje</label>
                    <input type="time" value={discForm.ventanaMontajeFin}
                      onChange={e => setDiscForm(p => ({ ...p, ventanaMontajeFin: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Servicios de interés (producción) o campos de renta */}
            {discForm.tipoServicio === "RENTA" ? (
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold">Detalles de renta</p>

                {/* Categorías de equipo */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Categorías de equipo que necesita</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIAS_RENTA.map(cat => (
                      <button key={cat.id} onClick={() => toggleServicio(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          discForm.serviciosInteres.includes(cat.id)
                            ? "border-[#B3985B] text-black bg-[#B3985B]"
                            : "border-[#333] text-gray-400 hover:border-[#555] hover:text-white"
                        }`}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descripción de equipos */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Descripción del equipo (o rider técnico)</label>
                  <textarea value={discForm.rentaDescripcionEquipos}
                    onChange={e => setDiscForm(p => ({ ...p, rentaDescripcionEquipos: e.target.value }))}
                    rows={3} placeholder="Ej: 2 bafles EV EKX-15P, 1 sub EKX-18SP, 4 micrófonos inalámbricos Shure BLX..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                </div>

                {/* Nivel de servicio */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Nivel de servicio</label>
                  <div className="grid grid-cols-2 gap-2">
                    {RENTA_NIVEL.map(n => (
                      <button key={n.id} onClick={() => setDiscForm(p => ({ ...p, rentaModalidadServicio: n.id }))}
                        className={`px-3 py-2.5 rounded-lg text-left transition-colors border ${
                          discForm.rentaModalidadServicio === n.id
                            ? "border-[#B3985B] bg-[#B3985B]/10"
                            : "border-[#333] hover:border-[#555]"
                        }`}>
                        <p className={`text-xs font-medium ${discForm.rentaModalidadServicio === n.id ? "text-[#B3985B]" : "text-white"}`}>{n.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{n.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modalidad de entrega */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Modalidad de entrega</label>
                  <div className="grid grid-cols-3 gap-2">
                    {RENTA_ENTREGA.map(e => (
                      <button key={e.id} onClick={() => setDiscForm(p => ({ ...p, rentaModalidadEntrega: e.id }))}
                        className={`px-3 py-2.5 rounded-lg text-left transition-colors border ${
                          discForm.rentaModalidadEntrega === e.id
                            ? "border-[#B3985B] bg-[#B3985B]/10"
                            : "border-[#333] hover:border-[#555]"
                        }`}>
                        <p className={`text-xs font-medium ${discForm.rentaModalidadEntrega === e.id ? "text-[#B3985B]" : "text-white"}`}>{e.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{e.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dirección + fechas de entrega/devolución */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Dirección de entrega (si aplica)</label>
                    <input value={discForm.rentaDireccionEntrega}
                      onChange={e => setDiscForm(p => ({ ...p, rentaDireccionEntrega: e.target.value }))}
                      placeholder="Calle, colonia, ciudad, CP"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Fecha de entrega del equipo</label>
                    <input type="date" value={discForm.rentaFechaEntrega}
                      onChange={e => setDiscForm(p => ({ ...p, rentaFechaEntrega: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Hora de entrega</label>
                    <input value={discForm.rentaHoraEntrega}
                      onChange={e => setDiscForm(p => ({ ...p, rentaHoraEntrega: e.target.value }))}
                      placeholder="Ej: 9:00 AM"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Fecha de devolución</label>
                    <input type="date" value={discForm.rentaFechaDevolucion}
                      onChange={e => setDiscForm(p => ({ ...p, rentaFechaDevolucion: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Hora de recolección</label>
                    <input value={discForm.rentaHoraDevolucion}
                      onChange={e => setDiscForm(p => ({ ...p, rentaHoraDevolucion: e.target.value }))}
                      placeholder="Ej: 12:00 PM"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>

                {/* Técnico propio */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">¿El cliente tiene técnico propio?</label>
                  <div className="flex gap-2">
                    {["Sí", "No", "Parcialmente"].map(op => (
                      <button key={op} onClick={() => setDiscForm(p => ({ ...p, rentaTecnicoPropio: op }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          discForm.rentaTecnicoPropio === op
                            ? "border-[#B3985B] text-black bg-[#B3985B]"
                            : "border-[#333] text-gray-400 hover:border-[#555] hover:text-white"
                        }`}>{op}</button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
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
            )}

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
              <button onClick={() => guardarDescubrimiento(true)} disabled={saving || (!discForm.fechaEventoEstimada && discForm.fechaEventoEstimada !== "por-definir") || (!discForm.lugarEstimado && discForm.lugarEstimado !== "por-definir")}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-lg transition-colors">
                {saving ? "Guardando..." : "Descubrimiento completo → Oportunidad"}
              </button>
            </div>
          </div>}
        </div>
      )}

      {/* ── Estado 2b: Canal INFO ── */}
      {trato.tipoProspecto !== "NURTURING" && trato.canalAtencion === "INFORMACION" && !trato.descubrimientoCompleto && (
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
      {trato.tipoProspecto !== "NURTURING" && trato.descubrimientoCompleto && (
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
