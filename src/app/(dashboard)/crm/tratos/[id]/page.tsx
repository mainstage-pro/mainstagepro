"use client";

import { useEffect, useState, useRef, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FORM_KEY_LABELS } from "@/lib/form-labels";
import TimePicker from "@/components/ui/TimePicker";
import VenuePicker from "@/components/ui/VenuePicker";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";

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
  scoutingData: string | null;
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

// ─── Ícono WhatsApp ──────────────────────────────────────────────────────────
const WA_ICON = (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);

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

// ─── Playbook de Nurturing ────────────────────────────────────────────────────
type NTpl = { id: string; tipo: string; icon: string; label: string; msg: (n: string, ctx: { evento?: string | null; fecha?: string | null }) => string };
type NPlaybookEtapa = {
  objetivo: string;
  intervalo: string;
  acciones: string[];
  contenido: string[];
  templates: { MUSICAL: NTpl[]; SOCIAL: NTpl[]; EMPRESARIAL: NTpl[]; OTRO: NTpl[] };
};

const NURTURING_PLAYBOOK: Record<string, NPlaybookEtapa> = {
  PRIMER_CONTACTO: {
    objetivo: "Romper el hielo y sembrar la semilla. El prospecto debe saber quiénes somos y qué podemos hacer por ellos — sin presión, sin venta.",
    intervalo: "Día 1 — primer mensaje",
    acciones: [
      "Enviar mensaje de presentación adaptado a su tipo de evento",
      "Confirmar que el número es correcto y está activo",
      "Registrar el canal preferido de comunicación",
      "Anotar cualquier detalle que el prospecto comparta sobre su evento",
    ],
    contenido: ["Presentación de empresa", "Frase de valor clara", "Invitación a platicar sin compromiso"],
    templates: {
      MUSICAL: [
        {
          id: "pc_musical_intro", tipo: "WA_INFO", icon: "🎸", label: "Presentación Musical",
          msg: (n, ctx) => `Hola ${n}, buen día.\n\nTe escribo de *Mainstage Pro*, producción técnica de audio, iluminación y video con base en Querétaro.\n\nNos especializamos en eventos en vivo — conciertos, shows, festivales y lanzamientos de artistas. Trabajamos con equipo de grado profesional y técnicos con experiencia en escenario, porque sabemos que en un show no hay margen para fallas.\n\n${ctx.evento ? `Me comentaron que tienen en mente *${ctx.evento}*. ` : ""}Si tienen algo próximo o están en etapa de planeación, con gusto platicamos — sin compromiso de ningún tipo.`,
        },
        {
          id: "pc_musical_rider", tipo: "WA_INFO", icon: "📋", label: "Rider técnico",
          msg: (n, ctx) => `Hola ${n}.\n\nTe escribo de *Mainstage Pro*, producción técnica para eventos musicales en Querétaro.\n\nSi tienen un rider técnico del artista o una lista de requerimientos, con gusto lo revisamos y les preparamos una cotización punto por punto. Tenemos experiencia cubriendo inputs exigentes y coordinando con técnicos de artistas.\n\n${ctx.evento ? `¿Para *${ctx.evento}* ya cuentan con el rider? ` : "¿Tienen algo en puerta? "}Aquí estamos para apoyarles cuando quieran.`,
        },
      ],
      SOCIAL: [
        {
          id: "pc_social_intro", tipo: "WA_INFO", icon: "🎊", label: "Presentación Social",
          msg: (n, ctx) => `Hola ${n}, buen día.\n\nSoy de *Mainstage Pro* — producción de audio, iluminación, efectos y DJ para eventos sociales en Querétaro.\n\nTrabajamos bodas, XV años, cumpleaños y celebraciones privadas. La idea siempre es que cada detalle técnico acompañe la experiencia que tienen en mente — no que sea un servicio genérico.\n\n${ctx.evento ? `Me comentaron que están planeando *${ctx.evento}*. ` : ""}¿Ya están en proceso de armar los detalles? Con gusto platicamos cuando les venga bien.`,
        },
        {
          id: "pc_social_atmosfera", tipo: "WA_INFO", icon: "✨", label: "Ambiente y atmósfera",
          msg: (n, ctx) => `Hola ${n}.\n\nTe escribo de *Mainstage Pro*, producción para eventos sociales en Querétaro.\n\nLo que más nos importa cuando trabajamos una fiesta es la atmósfera: la iluminación que cambia con la música, el sonido que se siente bien en todo el salón, los efectos en los momentos que importan. Eso es lo que diferencia una buena fiesta de una noche que la gente recuerda.\n\n${ctx.evento ? `Para *${ctx.evento}*, ` : "Para tu próxima celebración, "}podemos ayudarte a definir exactamente eso. ¿Tienes un momento para platicar?`,
        },
      ],
      EMPRESARIAL: [
        {
          id: "pc_emp_intro", tipo: "WA_INFO", icon: "🤝", label: "Presentación Corporativo",
          msg: (n, ctx) => `Hola ${n}, buen día.\n\nTe escribo de *Mainstage Pro*, producción audiovisual para eventos corporativos en Querétaro y zona centro.\n\nNos especializamos en que cada evento — presentación, convención, lanzamiento — comunique lo que la organización necesita: audio impecable, proyección profesional, transmisión en vivo y producción ejecutiva.\n\n${ctx.evento ? `Entiendo que tienen en vista *${ctx.evento}*. ` : ""}Si tienen algo próximo, con gusto preparamos una propuesta técnica sin costo. ¿Les parece si platicamos 10 minutos esta semana?`,
        },
        {
          id: "pc_emp_streaming", tipo: "WA_INFO", icon: "🎥", label: "Streaming y grabación",
          msg: (n, ctx) => `Hola ${n}.\n\nTe escribo de *Mainstage Pro*, producción técnica para eventos corporativos.\n\nCada vez más empresas necesitan llegar a su audiencia más allá del salón: transmisión en vivo, grabación profesional, contenido para post-evento. Eso lo manejamos de manera integral para que el equipo interno se concentre en el mensaje y no en la parte técnica.\n\n${ctx.evento ? `¿Para *${ctx.evento}* contemplan algo de streaming o grabación? ` : "¿Tienen algún evento próximo que contemple transmisión o grabación? "}Con gusto exploramos opciones.`,
        },
      ],
      OTRO: [
        {
          id: "pc_otro_intro", tipo: "WA_INFO", icon: "🎵", label: "Presentación General",
          msg: (n, ctx) => `Hola ${n}, buen día.\n\nTe escribo de *Mainstage Pro*, producción de audio, iluminación y video para todo tipo de eventos en Querétaro.\n\nTrabajamos desde shows en vivo hasta eventos privados y corporativos. Lo que buscamos siempre es que el lado técnico no sea un problema — que el evento fluya y el cliente pueda estar en otra cosa.\n\n${ctx.evento ? `Para *${ctx.evento}*, ` : "Para tu próximo evento, "}con gusto preparamos una propuesta. ¿Tienes unos minutos para platicar?`,
        },
      ],
    },
  },

  COMPARTIENDO_VALOR: {
    objetivo: "Demostrar expertise compartiendo contenido relevante. El prospecto debe pensar 'estos cuates saben lo que hacen' sin sentir que le están vendiendo.",
    intervalo: "3–5 días después del primer contacto",
    acciones: [
      "Enviar portfolio o caso de éxito similar a su tipo de evento",
      "Compartir un dato de valor educativo específico para su industria",
      "Mencionar un logro reciente o evento relevante que hayan producido",
      "Si respondió antes: retomar el hilo de la conversación anterior",
    ],
    contenido: ["Portfolio de eventos similares", "Caso de éxito (fotos/video)", "Dato educativo / tip de producción", "Ficha técnica de servicios"],
    templates: {
      MUSICAL: [
        {
          id: "cv_musical_portfolio", tipo: "PORTFOLIO", icon: "📸", label: "Portfolio musical",
          msg: (n, ctx) => `Hola ${n}, buen día.\n\nPaso a compartirte algo del trabajo reciente de *Mainstage Pro* en eventos musicales.\n\nHemos producido shows desde aforos de 200 hasta 5,000 personas — bandas, DJs, orquestas y artistas invitados. Manejo de riders complejos, consolas digitales, sistemas de línea de arreglos y coordinación técnica completa.\n\n¿Te gustaría ver fotos o videos de algún evento en particular?${ctx.evento ? ` Con gusto te mando material de algo similar a lo que tienen en mente para *${ctx.evento}*.` : " Con gusto te comparto lo que más se acerque a lo que planeas."}`,
        },
        {
          id: "cv_musical_tip", tipo: "VALOR", icon: "💡", label: "Tip: sonido en vivo",
          msg: (n) => `Hola ${n}.\n\nTe comparto algo que hemos notado en la mayoría de los shows que producimos:\n\n*El 80% de los problemas de audio en eventos en vivo ocurren antes de la prueba de sonido* — cables mal etiquetados, patch lists desactualizados, falta de coordinación entre el técnico del artista y el de sala.\n\nEn *Mainstage Pro* hacemos una revisión técnica previa con el road manager o técnico del artista para anticipar todo eso. El resultado es que los shows arrancan a tiempo y suenan como deben.\n\nCuando tengas algo próximo, con gusto te cuento cómo lo manejaríamos.`,
        },
      ],
      SOCIAL: [
        {
          id: "cv_social_portfolio", tipo: "PORTFOLIO", icon: "📸", label: "Portfolio social",
          msg: (n, ctx) => `Hola ${n}.\n\nPaso a compartirte algo del trabajo de *Mainstage Pro* en eventos sociales.\n\nBodas, XV años, cumpleaños — lo que más cuidamos es que la atmósfera sea la que imaginaron: desde la iluminación de llegada hasta el cierre con efectos. DJ profesional, audio limpio en todo el salón, luces que acompañan la música.\n\n¿Qué tipo de ambiente tienen en mente?${ctx.evento ? ` Para *${ctx.evento}* con gusto te muestro opciones similares.` : " ¿Te mando algunas fotos de eventos recientes?"}`,
        },
        {
          id: "cv_social_efectos", tipo: "VALOR", icon: "🎆", label: "Efectos especiales",
          msg: (n) => `Hola ${n}.\n\nTe comparto algo que vale la pena considerar para cualquier evento social:\n\nLos efectos especiales suelen ser lo que la gente más recuerda al día siguiente. En *Mainstage Pro* manejamos humo frío, confeti, chispas frías y globos LED — y los coordinamos con el audio y la iluminación para que cada momento tenga el impacto correcto.\n\nNo son un extra decorativo — son parte de la experiencia.\n\n¿Te gustaría saber cuáles encajarían mejor con lo que tienes en mente?`,
        },
      ],
      EMPRESARIAL: [
        {
          id: "cv_emp_portfolio", tipo: "PORTFOLIO", icon: "📸", label: "Portfolio corporativo",
          msg: (n, ctx) => `Hola ${n}.\n\nPaso a compartirte algo del trabajo reciente de *Mainstage Pro* en el sector empresarial.\n\nConvenciones, lanzamientos de producto, reuniones de consejo, transmisiones en vivo — manejamos desde el equipo técnico hasta la coordinación logística para que el equipo interno no tenga que ocuparse de esa parte.\n\n${ctx.evento ? `Para *${ctx.evento}*: ` : ""}¿Qué tipo de evento están planeando? Con el contexto adecuado puedo mandarte ejemplos más relevantes.`,
        },
        {
          id: "cv_emp_tip", tipo: "VALOR", icon: "💡", label: "Tip: producción corporativa",
          msg: (n) => `Hola ${n}.\n\nTe comparto algo que muchos organizadores de eventos corporativos descubren tarde:\n\n*La calidad del audio impacta directamente en cómo perciben la profesionalidad de la empresa.* Un micrófono que falla, una presentación que no se ve bien o un corte de transmisión en el momento clave — esos detalles quedan en la memoria del público, especialmente si hay invitados importantes.\n\nEn *Mainstage Pro* trabajamos con un checklist técnico por evento para que todo funcione desde la primera toma. Sin improvisar el día de.\n\n¿Les gustaría revisar cómo podríamos apoyarlos en lo que tienen en mente?`,
        },
      ],
      OTRO: [
        {
          id: "cv_otro_portfolio", tipo: "PORTFOLIO", icon: "📸", label: "Portfolio general",
          msg: (n) => `Hola ${n}.\n\nPaso a compartirte algo del trabajo de *Mainstage Pro* en distintos tipos de eventos.\n\nAudio, iluminación, video, efectos y coordinación técnica. Nos adaptamos al tipo de evento porque cada uno tiene sus propias necesidades y no tiene sentido proponer lo mismo para todos.\n\n¿Qué tipo de evento tienes en mente? Con gusto te mando ejemplos de algo similar.`,
        },
      ],
    },
  },

  CONSTRUYENDO: {
    objetivo: "Profundizar la relación humana. Que el prospecto vea que estás genuinamente interesado en su evento — no solo en venderle. Que confíe en ti como persona antes de confiar en la empresa.",
    intervalo: "1–2 semanas después del primer contacto",
    acciones: [
      "Preguntar específicamente sobre la visión o el sueño que tienen para su evento",
      "Mencionar algo personal o relevante que hayan compartido antes",
      "Ofrecer una llamada corta o reunión sin agenda de venta",
      "Si hay fecha: acercarse a eventos similares para entender expectativas",
    ],
    contenido: ["Preguntas abiertas sobre la visión del evento", "Invitación a llamada/reunión exploratoria", "Referencia a cliente o evento similar que conocen"],
    templates: {
      MUSICAL: [
        {
          id: "c_musical_vision", tipo: "FOLLOW_UP", icon: "🎤", label: "Visión del show",
          msg: (n, ctx) => `Hola ${n}.\n\nPaso a saludarte. Seguimos pensando en cómo podríamos apoyarles.\n\nUna pregunta: cuando imaginas${ctx.evento ? ` *${ctx.evento}*` : " el show"} ya en el escenario — ¿qué es lo que más te importa que el público sienta? ¿La potencia del sonido, la presencia visual del escenario, la precisión técnica durante todo el set?\n\nCada show tiene una personalidad propia y queremos entender exactamente lo que buscan antes de proponer algo.`,
        },
        {
          id: "c_musical_checkin", tipo: "FOLLOW_UP", icon: "👋", label: "Check-in de proceso",
          msg: (n) => `Hola ${n}.\n\n¿Cómo va la organización? Los shows en vivo tienen muchas piezas moviéndose al mismo tiempo — contar con un aliado técnico desde etapas tempranas suele evitar problemas el día de.\n\nSi en algún momento quieren revisar el aspecto técnico de lo que están planeando — riders, requerimientos de escenario, logística — aquí estamos, sin compromiso de contratación.`,
        },
      ],
      SOCIAL: [
        {
          id: "c_social_sueno", tipo: "FOLLOW_UP", icon: "✨", label: "El sueño del evento",
          msg: (n, ctx) => `Hola ${n}.\n\nHa pasado un poco de tiempo — ¿cómo van los preparativos?\n\nMe da curiosidad saber: cuando imaginas${ctx.evento ? ` *${ctx.evento}*` : " tu evento"} en el momento más especial de la noche — ¿qué ves exactamente? ¿La primera canción, la entrada, el momento en que la pista se llena?\n\nEsa imagen es exactamente lo que convertimos en realidad técnica. Me gustaría entenderla mejor para que lo que propongamos tenga sentido con lo que tienes en mente.`,
        },
        {
          id: "c_social_inspiracion", tipo: "FOLLOW_UP", icon: "💫", label: "Referencias e inspiración",
          msg: (n) => `Hola ${n}.\n\n¿Has visto algo que te inspire para el evento — un video, una foto, algo que viviste en otra fiesta y que dijiste "así quiero que sea la mía"?\n\nEn *Mainstage Pro* trabajamos mucho mejor cuando el cliente llega con referencias, porque eso nos permite ser muy precisos en lo que proponemos. No hay una respuesta correcta genérica — hay la que funciona para ese evento en particular.\n\nSi tienes algo guardado, compártelo sin pena.`,
        },
      ],
      EMPRESARIAL: [
        {
          id: "c_emp_llamada", tipo: "FOLLOW_UP", icon: "📞", label: "Llamada exploratoria",
          msg: (n, ctx) => `Hola ${n}.\n\n¿Cómo van los preparativos${ctx.evento ? ` para *${ctx.evento}*` : ""}?\n\nSé que los eventos corporativos tienen muchas partes moviéndose al mismo tiempo. Si les ayudaría, podemos hacer una llamada de 15 minutos — sin agenda de venta, solo para entender qué tienen planeado y cómo está el lado técnico desde donde están hoy.\n\nUna conversación temprana suele evitar ajustes costosos más adelante. ¿Les viene esta semana o la próxima?`,
        },
        {
          id: "c_emp_necesidad", tipo: "FOLLOW_UP", icon: "💬", label: "Entendiendo la necesidad",
          msg: (n) => `Hola ${n}.\n\nUna pregunta que me ayuda a entender cómo apoyarles de verdad:\n\n¿Cuál es el resultado más importante que necesitan lograr con este evento? ¿Comunicar un mensaje clave, impresionar a un cliente importante, motivar al equipo, documentarlo para uso interno?\n\nCada objetivo tiene implicaciones técnicas distintas. Con esa claridad puedo proponer algo que realmente sirva — no la solución genérica.`,
        },
      ],
      OTRO: [
        {
          id: "c_otro_checkin", tipo: "FOLLOW_UP", icon: "👋", label: "Check-in general",
          msg: (n) => `Hola ${n}.\n\nPaso a saludarte — ¿cómo van los planes para el evento?\n\nEn *Mainstage Pro* siempre estamos disponibles para platicar sin compromiso. Si necesitan apoyo para definir qué equipo técnico requieren o quieren saber qué es posible dentro de su presupuesto, aquí estamos.\n\n¿Hay algo específico en lo que podamos ayudarles hoy?`,
        },
      ],
    },
  },

  DETECTANDO: {
    objetivo: "Identificar si hay una ventana de oportunidad próxima. Preguntar directamente — con tacto — si hay un evento en puerta para el que podamos cotizar.",
    intervalo: "2–3 semanas después, o cuando suba la temperatura",
    acciones: [
      "Hacer la pregunta directa sobre eventos próximos con fecha estimada",
      "Si mencionó una fecha antes: retomar ese dato y acercarse con urgencia suave",
      "Si hay silencio prolongado: reactivar con contenido fresco antes de preguntar",
      "Registrar la respuesta y actualizar temperatura y próxima acción",
    ],
    contenido: ["Pregunta directa sobre fechas", "Urgencia suave (disponibilidad limitada)", "Oferta de presupuesto express sin compromiso"],
    templates: {
      MUSICAL: [
        {
          id: "d_musical_fecha", tipo: "DETECCION", icon: "🎯", label: "¿Hay show próximo?",
          msg: (n, ctx) => `Hola ${n}.\n\nHa pasado un tiempo desde que platicamos. ¿Cómo van los planes${ctx.evento ? ` para *${ctx.evento}*` : ""}?\n\nLa razón por la que te escribo: queremos asegurarnos de que si tienen algo próximo, podamos apoyarles a tiempo. La producción técnica de un show requiere anticipación — especialmente si hay rider, backline o requerimientos especiales de escenario.\n\n¿Tienen algo confirmado o en proceso?`,
        },
        {
          id: "d_musical_disponibilidad", tipo: "DETECCION", icon: "📅", label: "Disponibilidad de fecha",
          msg: (n) => `Hola ${n}.\n\nQuería preguntarte: ¿ya tienen fecha confirmada para el próximo evento?\n\nEl equipo de *Mainstage Pro* está tomando compromisos para los próximos meses y quiero asegurarme de tenerlos considerados si hay algo próximo. Si hay una fecha o algo en proceso, dímelo y lo contemplamos.`,
        },
      ],
      SOCIAL: [
        {
          id: "d_social_fecha", tipo: "DETECCION", icon: "🎊", label: "¿Fecha confirmada?",
          msg: (n, ctx) => `Hola ${n}.\n\nPaso a preguntarte: ¿ya tienen fecha y venue definidos${ctx.evento ? ` para *${ctx.evento}*` : ""}?\n\nLo pregunto porque para eventos sociales nos gusta anticiparnos — coordinar con el salón, entender el espacio, proponer la ambientación correcta. Con más tiempo podemos hacer algo mejor y a mejor costo.\n\n¿Están en proceso de definir eso, o ya tienen algo confirmado?`,
        },
        {
          id: "d_social_urgencia", tipo: "DETECCION", icon: "⏰", label: "Disponibilidad agendada",
          msg: (n) => `Hola ${n}.\n\nTe cuento: estamos llenando agenda para los próximos meses. Si la fecha está próxima, necesitamos saberla con tiempo para poder dar lo mejor.\n\n¿Ya tienen la fecha del evento? Con eso te confirmo disponibilidad y lo que podemos preparar. Sin compromiso — solo para tenerlo claro.`,
        },
      ],
      EMPRESARIAL: [
        {
          id: "d_emp_fecha", tipo: "DETECCION", icon: "🎯", label: "¿Hay evento próximo?",
          msg: (n, ctx) => `Hola ${n}.\n\nPaso a preguntarte directo: ¿tienen algún evento corporativo confirmado o en proceso para los próximos meses${ctx.evento ? `, incluyendo *${ctx.evento}*` : ""}?\n\nEn *Mainstage Pro* nos gusta conocer los proyectos con anticipación, sobre todo si contemplan streaming, grabación o producción especial. Eso nos permite proponer algo que funcione dentro de sus tiempos y presupuesto.\n\n¿Hay algo concreto en el que podamos empezar a trabajar?`,
        },
        {
          id: "d_emp_q", tipo: "DETECCION", icon: "💬", label: "Pregunta directa budget",
          msg: (n) => `Hola ${n}.\n\nUna pregunta directa que suele hacer el proceso más eficiente:\n\n¿Tienen ya un presupuesto estimado para la parte de producción audiovisual del evento?\n\nNo te pregunto para ajustarnos a cualquier número — te lo pregunto para proponer la mejor opción posible dentro de lo disponible. Con eso puedo preparar algo concreto y útil, no una cotización genérica.\n\n¿Tienen alguna referencia de rango?`,
        },
      ],
      OTRO: [
        {
          id: "d_otro_fecha", tipo: "DETECCION", icon: "🎯", label: "¿Algo en puerta?",
          msg: (n) => `Hola ${n}.\n\nPaso a preguntarte: ¿hay algo próximo en camino? ¿Algún evento para el que ya estén en proceso de planeación?\n\nEn *Mainstage Pro* nos gustaría apoyarles a tiempo para proponer algo que realmente funcione. Si hay fecha o idea en puerta, con gusto platicamos.`,
        },
      ],
    },
  },

  LISTO: {
    objetivo: "Cerrar la transición al proceso de venta activo. El prospecto está listo — hay que guiarlo al siguiente paso con claridad y sin fricción.",
    intervalo: "Cuando hay señales de compra o el prospecto lo indica",
    acciones: [
      "Proponer discovery call o reunión formal con agenda clara",
      "Ofrecer presupuesto express en 24–48 horas si ya tienen la información",
      "Pedir el rider técnico o briefing del evento para arrancar la cotización",
      "Asignar al trato como ACTIVO y registrar en el pipeline de ventas",
    ],
    contenido: ["Propuesta de discovery call con agenda", "Presupuesto express", "Formulario de briefing técnico", "Riders o requerimientos del evento"],
    templates: {
      MUSICAL: [
        {
          id: "l_musical_propuesta", tipo: "WA_INFO", icon: "✅", label: "Propuesta de discovery",
          msg: (n, ctx) => `Hola ${n}.\n\nEstamos listos para arrancar con la propuesta técnica${ctx.evento ? ` para *${ctx.evento}*` : ""}.\n\nPara preparar algo concreto, necesitaría:\n- Rider técnico del artista (si lo tienen)\n- Venue o tipo de espacio\n- Aforo estimado\n- Fecha del evento\n\n¿Hacemos una llamada de 20–30 minutos para alinear todo? Con esa información les confirmo en menos de 24 horas qué podemos ofrecer y a qué costo.`,
        },
        {
          id: "l_musical_rapido", tipo: "WA_INFO", icon: "⚡", label: "Cotización express",
          msg: (n) => `Hola ${n}.\n\nSi ya tienen la información del evento, puedo tener una cotización lista en menos de 24 horas.\n\nSolo necesito:\n- Tipo de evento y aforo\n- Venue o tipo de espacio\n- Rider técnico (si aplica)\n- Fecha del evento\n\nMándame lo que tengan y arranco hoy mismo.`,
        },
      ],
      SOCIAL: [
        {
          id: "l_social_propuesta", tipo: "WA_INFO", icon: "✅", label: "Propuesta de discovery",
          msg: (n, ctx) => `Hola ${n}.\n\nEstamos listos para arrancar con la propuesta${ctx.evento ? ` para *${ctx.evento}*` : ""}.\n\nPara preparar algo que tenga sentido con lo que imaginan, me ayudaría saber:\n- Venue y capacidad del espacio\n- Fecha confirmada\n- Los 2–3 momentos más importantes de la noche\n- Referencias o inspiración visual que tengan\n\n¿Hacemos una llamada rápida esta semana? Les tengo propuesta formal en 48 horas después de esa conversación.`,
        },
        {
          id: "l_social_rapido", tipo: "WA_INFO", icon: "⚡", label: "Cotización express",
          msg: (n) => `Hola ${n}.\n\n¿Listos para arrancar con los detalles? En *Mainstage Pro* podemos tener su cotización en 24–48 horas con esta información:\n\n- Fecha y hora del evento\n- Venue (nombre o dirección)\n- Número aproximado de invitados\n- Servicios que les interesan (DJ, luces, efectos, pantalla)\n\nMándenme lo que tengan y arrancamos.`,
        },
      ],
      EMPRESARIAL: [
        {
          id: "l_emp_propuesta", tipo: "WA_INFO", icon: "✅", label: "Propuesta de discovery",
          msg: (n, ctx) => `Hola ${n}.\n\nEstamos listos para preparar una propuesta técnica formal${ctx.evento ? ` para *${ctx.evento}*` : ""}.\n\nPara que sea lo más precisa posible, necesitaría:\n- Venue o tipo de espacio\n- Número de asistentes\n- Objetivos principales del evento\n- ¿Contemplan streaming, grabación o contenido para redes?\n- Fecha y duración\n\n¿Podemos agendar 20 minutos esta semana? Con esa información les entrego propuesta técnica y económica en 24–48 horas, sin costo y sin compromiso.`,
        },
        {
          id: "l_emp_rapido", tipo: "WA_INFO", icon: "⚡", label: "Cotización express",
          msg: (n) => `Hola ${n}.\n\nSi ya tienen el brief del evento, podemos tener una propuesta técnica y económica lista en 24 horas.\n\nEntendemos que los tiempos corporativos son ajustados. Solo necesito:\n- Descripción del evento y objetivos\n- Venue o tipo de espacio\n- Número de asistentes\n- Fecha y duración estimada\n- ¿Streaming o grabación? Sí / No\n\nMándenme lo que tengan y arrancamos de inmediato.`,
        },
      ],
      OTRO: [
        {
          id: "l_otro_propuesta", tipo: "WA_INFO", icon: "✅", label: "Arrancar propuesta",
          msg: (n, ctx) => `Hola ${n}.\n\nEstamos listos para preparar una propuesta${ctx.evento ? ` para *${ctx.evento}*` : " para tu evento"}.\n\nPara hacerla lo más precisa posible, compárteme:\n- Venue o lugar del evento\n- Fecha confirmada\n- Número de asistentes\n- Qué servicios necesitas\n\nCon eso en mano te tengo una cotización en menos de 24 horas.`,
        },
      ],
    },
  },
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TratoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
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
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);

  // Formulario para prospecto
  const [generandoToken, setGenerandoToken] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  // Modo de descubrimiento: "VENDEDOR" | "CLIENTE" (inferido del formToken, editable)
  const [modoDescubrimiento, setModoDescubrimiento] = useState<"VENDEDOR" | "CLIENTE">("VENDEDOR");
  // Gate primario: muestra selector de canal dentro del gate
  const [showCanales, setShowCanales] = useState(false);

  // Nurturing state
  type NurturingLogEntry = { fecha: string; etapa: string; templateId: string; templateLabel: string };
  type NurturingData = { etapa: string; temperatura: string; log: NurturingLogEntry[] };
  const NURTURING_EMPTY: NurturingData = { etapa: "PRIMER_CONTACTO", temperatura: "FRIO", log: [] };
  const [nurturing, setNurturing] = useState<NurturingData>(NURTURING_EMPTY);
  const [savingNurturing, setSavingNurturing] = useState(false);

  // Cadencia de contacto por etapa (días hasta el próximo)
  const STAGE_CADENCE: Record<string, number> = {
    PRIMER_CONTACTO: 4, COMPARTIENDO_VALOR: 7, CONSTRUYENDO: 14, DETECTANDO: 21, LISTO: 2,
  };
  function calcNextContact(etapa: string): string {
    const days = STAGE_CADENCE[etapa] ?? 7;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }
  function fmtProximoContacto(iso: string) {
    const d = new Date(iso + "T12:00:00");
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);
    const label = d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
    if (diff === 0) return { label: `Hoy · ${label}`, color: "text-yellow-400" };
    if (diff < 0) return { label: `Vencido · ${label}`, color: "text-red-400" };
    if (diff === 1) return { label: `Mañana · ${label}`, color: "text-emerald-400" };
    return { label: `En ${diff} días · ${label}`, color: "text-emerald-300" };
  }

  // Brief levantamiento de contenido
  type LevantamientoForm = {
    nombreEvento: string; tipoEvento: string; fecha: string; horarioEvento: string; horarioCobertura: string;
    lugar: string; nombreCliente: string; redesSocialesCliente: string;
    tieneProveedoresAdicionales: string; proveedoresDetalle: string;
    objetivosContenido: string[]; detalleObjetivo: string;
    planCobertura: string; planCoberturaOtro: string; temasSugeridos: string;
    colaboradoresCamara: string; colaboradoresNombres: string; notasAdicionales: string;
  };
  const BRIEF_EMPTY: LevantamientoForm = {
    nombreEvento: "", tipoEvento: "", fecha: "", horarioEvento: "", horarioCobertura: "",
    lugar: "", nombreCliente: "", redesSocialesCliente: "",
    tieneProveedoresAdicionales: "", proveedoresDetalle: "",
    objetivosContenido: [], detalleObjetivo: "",
    planCobertura: "", planCoberturaOtro: "", temasSugeridos: "",
    colaboradoresCamara: "", colaboradoresNombres: "", notasAdicionales: "",
  };
  const [briefForm, setBriefForm] = useState<LevantamientoForm>(BRIEF_EMPTY);
  const [briefGuardado, setBriefGuardado] = useState(false);
  const [savingBrief, setSavingBrief] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState(false);

  // Scouting state
  const [scoutingForm, setScoutingForm] = useState({
    nombreVenue: "", direccion: "", contactoVenue: "", telefonoVenue: "",
    largo: "", ancho: "", alturaMaxima: "",
    capacidadPersonas: "",
    accesoVehicular: "", puntoDescarga: "",
    voltajeDisponible: "", amperajeTotalDisponible: "", fases: "", ubicacionTablero: "",
    restriccionDecibeles: "", restriccionHorarioAcceso: "", restriccionInstalacion: "",
    estadoGeneral: "", notasScouting: "",
  });
  const [savingScouting, setSavingScouting] = useState(false);
  const [scoutingTab, setScoutingTab] = useState<"form" | "resumen">("form");
  const [scoutingVisible, setScoutingVisible] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveDiscTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveScoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Track whether initial load is done to avoid auto-saving on first render
  const discLoaded = useRef(false);
  const scoutLoaded = useRef(false);

  useEffect(() => {
    if (!discLoaded.current) { discLoaded.current = true; return; }
    autoSaveDisc(discForm);
  }, [discForm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!scoutLoaded.current) { scoutLoaded.current = true; return; }
    autoSaveScouting(scoutingForm);
  }, [scoutingForm]); // eslint-disable-line react-hooks/exhaustive-deps

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
          // Pre-fill scouting
          if (t.scoutingData) {
            try { setScoutingForm(prev => ({ ...prev, ...JSON.parse(t.scoutingData!) })); } catch { /* defaults */ }
          }
          // Inferir modo: si tiene formToken activo → cliente, si no → vendedor
          if (t.formToken) setModoDescubrimiento("CLIENTE");
          // Pre-fill nurturing
          if (t.nurturingData) {
            try { setNurturing({ ...NURTURING_EMPTY, ...JSON.parse(t.nurturingData) }); } catch { /* defaults */ }
          }
          setBriefingText(t.notas ?? "");
          setArchivos(t.archivos ?? []);
          // Pre-fill brief from trato data (user can override)
          setBriefForm(prev => ({
            ...prev,
            nombreEvento: t.nombreEvento ?? "",
            tipoEvento: t.tipoEvento ?? "",
            fecha: t.fechaEventoEstimada ? t.fechaEventoEstimada.split("T")[0] : "",
            horarioEvento: t.horaInicioEvento ?? "",
            lugar: t.lugarEstimado ?? "",
            nombreCliente: t.cliente.nombre ?? "",
          }));
          // Load existing levantamiento if any
          fetch(`/api/levantamiento-contenido/${t.id}`)
            .then(r => r.json())
            .then(({ levantamiento }) => {
              if (levantamiento) {
                setBriefGuardado(true);
                setBriefForm({
                  nombreEvento: levantamiento.nombreEvento ?? "",
                  tipoEvento: levantamiento.tipoEvento ?? "",
                  fecha: levantamiento.fecha ? levantamiento.fecha.split("T")[0] : "",
                  horarioEvento: levantamiento.horarioEvento ?? "",
                  horarioCobertura: levantamiento.horarioCobertura ?? "",
                  lugar: levantamiento.lugar ?? "",
                  nombreCliente: levantamiento.nombreCliente ?? "",
                  redesSocialesCliente: levantamiento.redesSocialesCliente ?? "",
                  tieneProveedoresAdicionales: levantamiento.tieneProveedoresAdicionales ?? "",
                  proveedoresDetalle: levantamiento.proveedoresDetalle ?? "",
                  objetivosContenido: levantamiento.objetivosContenido ? JSON.parse(levantamiento.objetivosContenido) : [],
                  detalleObjetivo: levantamiento.detalleObjetivo ?? "",
                  planCobertura: levantamiento.planCobertura ?? "",
                  planCoberturaOtro: levantamiento.planCoberturaOtro ?? "",
                  temasSugeridos: levantamiento.temasSugeridos ?? "",
                  colaboradoresCamara: levantamiento.colaboradoresCamara === true ? "SI" : levantamiento.colaboradoresCamara === false ? "NO" : "",
                  colaboradoresNombres: levantamiento.colaboradoresNombres ?? "",
                  notasAdicionales: levantamiento.notasAdicionales ?? "",
                });
              }
            })
            .catch(() => {});
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

  async function guardarNurturing(data: NurturingData, extra?: Record<string, unknown>) {
    setSavingNurturing(true);
    await patch({ nurturingData: JSON.stringify(data), ...extra });
    setTrato(prev => prev ? { ...prev, nurturingData: JSON.stringify(data), ...extra } : prev);
    setSavingNurturing(false);
  }

  async function registrarEnvioWA(templateId: string, templateLabel: string) {
    const entry: NurturingLogEntry = {
      fecha: new Date().toISOString().split("T")[0],
      etapa: nurturing.etapa,
      templateId,
      templateLabel,
    };
    const nextDate = calcNextContact(nurturing.etapa);
    const nextStageIdx = NURTURING_ETAPAS.findIndex(e => e.id === nurturing.etapa) + 1;
    const nextEtapa = NURTURING_ETAPAS[nextStageIdx];
    const proximaAccion = nextEtapa
      ? `Enviar guión "${nextEtapa.label}" al prospecto`
      : "Evaluar si está listo para propuesta formal";
    const updated = { ...nurturing, log: [...nurturing.log, entry] };
    setNurturing(updated);
    await guardarNurturing(updated, {
      fechaProximaAccion: nextDate,
      proximaAccion,
    });
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

  async function saveScouting() {
    setSavingScouting(true);
    await patch({ scoutingData: JSON.stringify(scoutingForm) });
    setTrato(prev => prev ? { ...prev, scoutingData: JSON.stringify(scoutingForm) } : prev);
    setSavingScouting(false);
  }

  // ── Auto-save discovery form (debounced 1.2s) ─────────────────────────────
  const autoSaveDisc = useCallback((form: typeof discForm) => {
    if (autoSaveDiscTimer.current) clearTimeout(autoSaveDiscTimer.current);
    setAutoSaveStatus("saving");
    autoSaveDiscTimer.current = setTimeout(async () => {
      const isRenta = form.tipoServicio === "RENTA";
      await patch({
        tipoEvento: form.tipoEvento,
        nombreEvento: form.nombreEvento || null,
        fechaEventoEstimada: form.fechaEventoEstimada === "por-definir" ? null : (form.fechaEventoEstimada || null),
        lugarEstimado: form.lugarEstimado === "por-definir" ? "Por definir" : (form.lugarEstimado || null),
        duracionEvento: form.duracionEvento || null,
        asistentesEstimados: form.asistentesEstimados ? parseInt(form.asistentesEstimados) : null,
        presupuestoEstimado: form.presupuestoEstimado ? parseFloat(form.presupuestoEstimado) : null,
        tipoServicio: form.tipoServicio || null,
        etapaContratacion: form.etapaContratacion || null,
        continuarPor: form.continuarPor || null,
        notas: form.notas || null,
        proximaAccion: form.proximaAccion || null,
        horaInicioEvento: form.horaInicioEvento || null,
        horaFinEvento: form.horaFinEvento || null,
        duracionMontajeHrs: form.duracionMontajeHrs ? parseFloat(form.duracionMontajeHrs) : null,
        ventanaMontajeInicio: form.ventanaMontajeInicio || null,
        ventanaMontajeFin: form.ventanaMontajeFin || null,
        serviciosInteres: JSON.stringify(form.serviciosInteres),
        ideasReferencias: isRenta
          ? JSON.stringify({
              modalidadServicio: form.rentaModalidadServicio || null,
              modalidadEntrega: form.rentaModalidadEntrega || null,
              direccionEntrega: form.rentaDireccionEntrega || null,
              fechaEntrega: form.rentaFechaEntrega || null,
              horaEntrega: form.rentaHoraEntrega || null,
              fechaDevolucion: form.rentaFechaDevolucion || null,
              horaDevolucion: form.rentaHoraDevolucion || null,
              descripcionEquipos: form.rentaDescripcionEquipos || null,
              tecnicoPropio: form.rentaTecnicoPropio || null,
            })
          : (form.ideasReferencias || null),
      });
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    }, 1200);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save scouting form (debounced 1.2s) ──────────────────────────────
  const autoSaveScouting = useCallback((form: typeof scoutingForm) => {
    if (autoSaveScoutTimer.current) clearTimeout(autoSaveScoutTimer.current);
    autoSaveScoutTimer.current = setTimeout(async () => {
      await patch({ scoutingData: JSON.stringify(form) });
      setTrato(prev => prev ? { ...prev, scoutingData: JSON.stringify(form) } : prev);
    }, 1200);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveBrief() {
    setSavingBrief(true);
    await fetch(`/api/levantamiento-contenido/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...briefForm,
        colaboradoresCamara: briefForm.colaboradoresCamara === "SI" ? true : briefForm.colaboradoresCamara === "NO" ? false : null,
      }),
    });
    setBriefGuardado(true);
    setSavingBrief(false);
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

  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>, tipo: string) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingTipo(tipo);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tipo", tipo);
      fd.append("nombre", file.name);
      const res = await fetch(`/api/tratos/${id}/archivos`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.archivo) setArchivos(prev => [...prev, data.archivo]);
    }
    setUploadingTipo(null);
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

  if (loading) return <SkeletonPage rows={5} cols={4} />;
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
                if (!await confirm({ message: "¿Eliminar este trato? Esta acción no se puede deshacer.", danger: true, confirmText: "Eliminar" })) return;
                await fetch(`/api/tratos/${trato.id}`, { method: "DELETE" });
                toast.success("Trato eliminado");
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
                    const d = await patch({ tipoProspecto: "NURTURING", tipoLead: "OUTBOUND", origenLead: "PROSPECCION" });
                    setTrato(prev => prev ? { ...prev, tipoProspecto: d.trato.tipoProspecto, tipoLead: "OUTBOUND", origenLead: "PROSPECCION" } : prev);
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
      {trato.tipoProspecto === "NURTURING" && (() => {
        const etapaKey = nurturing.etapa as keyof typeof NURTURING_PLAYBOOK;
        const playbook = NURTURING_PLAYBOOK[etapaKey];
        const tipoEvKey = (trato.tipoEvento ?? "OTRO") as keyof NPlaybookEtapa["templates"];
        const tplsEvento = playbook?.templates[tipoEvKey] ?? playbook?.templates["OTRO"] ?? [];
        const nombre = trato.cliente.nombre.split(" ")[0];
        const ctx = { evento: trato.nombreEvento, fecha: trato.fechaEventoEstimada };
        const tel = trato.cliente.telefono?.replace(/\D/g, "");
        const num = tel ? (tel.startsWith("52") ? tel : `52${tel}`) : null;

        return (
          <div className="bg-[#0d0d0d] border-2 border-emerald-700/40 rounded-xl overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-700/20 flex items-center justify-center text-lg">🌱</div>
                <div>
                  <p className="text-white font-semibold">Nurturing — Prospecto en frío</p>
                  <p className="text-gray-500 text-xs">Construye confianza, comparte valor, sé paciente</p>
                </div>
              </div>
              <button onClick={async () => { const d = await patch({ tipoProspecto: "ACTIVO" }); setTrato(p => p ? { ...p, tipoProspecto: d.trato.tipoProspecto } : p); }}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Cambiar a activo
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* ── Selector de tipo de evento (si no está definido) ── */}
              {!trato.tipoEvento || trato.tipoEvento === "OTRO" ? (
                <div className="bg-[#111] border border-emerald-900/40 rounded-xl p-4">
                  <p className="text-xs text-emerald-400 font-semibold mb-1">¿Qué tipo de eventos organiza este prospecto?</p>
                  <p className="text-[10px] text-gray-500 mb-3">Esto define qué guiones y cadencia usar en el seguimiento.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { id: "MUSICAL",     icon: "🎸", label: "Musical",    desc: "Conciertos, shows" },
                      { id: "SOCIAL",      icon: "🎊", label: "Social",      desc: "Bodas, XV años" },
                      { id: "EMPRESARIAL", icon: "🏢", label: "Empresarial", desc: "Corporativos" },
                      { id: "OTRO",        icon: "🎵", label: "General",     desc: "Mixto / otro" },
                    ].map(te => (
                      <button key={te.id}
                        onClick={async () => { const d = await patch({ tipoEvento: te.id }); setTrato(p => p ? { ...p, tipoEvento: d.trato.tipoEvento } : p); }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#333] text-gray-400 hover:border-emerald-700 hover:text-white text-left transition-colors">
                        <span>{te.icon}</span>
                        <div>
                          <p className="text-xs font-semibold leading-none">{te.label}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">{te.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Tipo de evento definido — mostrar con opción de cambiar */
                <div className="flex items-center justify-between bg-[#111] border border-[#1e1e1e] rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {trato.tipoEvento === "MUSICAL" ? "🎸" : trato.tipoEvento === "SOCIAL" ? "🎊" : trato.tipoEvento === "EMPRESARIAL" ? "🏢" : "🎵"}
                    </span>
                    <div>
                      <span className="text-xs text-gray-400">Tipo de evento: </span>
                      <span className="text-xs font-semibold text-white">
                        {trato.tipoEvento === "MUSICAL" ? "Musical" : trato.tipoEvento === "SOCIAL" ? "Social" : trato.tipoEvento === "EMPRESARIAL" ? "Empresarial" : "General"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {["MUSICAL","SOCIAL","EMPRESARIAL","OTRO"].filter(t => t !== trato.tipoEvento).map(te => (
                      <button key={te}
                        onClick={async () => { const d = await patch({ tipoEvento: te }); setTrato(p => p ? { ...p, tipoEvento: d.trato.tipoEvento } : p); }}
                        className="text-[10px] text-gray-600 hover:text-emerald-400 transition-colors px-1.5 py-1">
                        {te === "MUSICAL" ? "🎸" : te === "SOCIAL" ? "🎊" : te === "EMPRESARIAL" ? "🏢" : "🎵"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Temperatura + Pipeline de etapas ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest shrink-0">Temperatura</label>
                  <div className="flex gap-1.5 flex-1">
                    {[
                      { id: "FRIO",     icon: "❄️", label: "Frío",     cls: "border-blue-700/60 bg-blue-900/20 text-blue-300" },
                      { id: "TIBIO",    icon: "🌡️", label: "Tibio",    cls: "border-yellow-600/60 bg-yellow-900/20 text-yellow-300" },
                      { id: "CALIENTE", icon: "🔥", label: "Caliente", cls: "border-red-700/60 bg-red-900/20 text-red-300" },
                    ].map(t => (
                      <button key={t.id}
                        onClick={() => { const u = { ...nurturing, temperatura: t.id }; setNurturing(u); guardarNurturing(u); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${nurturing.temperatura === t.id ? t.cls : "border-[#333] text-gray-500 hover:text-white hover:border-[#555]"}`}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Etapa del proceso</label>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {NURTURING_ETAPAS.map((e, idx) => {
                      const currentIdx = NURTURING_ETAPAS.findIndex(x => x.id === nurturing.etapa);
                      const isPast = idx < currentIdx;
                      const isCurrent = e.id === nurturing.etapa;
                      return (
                        <button key={e.id}
                          onClick={() => { const u = { ...nurturing, etapa: e.id }; setNurturing(u); guardarNurturing(u, { fechaProximaAccion: calcNextContact(e.id), proximaAccion: `Enviar guión etapa "${e.label}"` }); }}
                          className={`flex-1 min-w-20 px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${
                            isCurrent ? "border-emerald-500 bg-emerald-900/40 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.12)]"
                            : isPast ? "border-emerald-900/40 bg-emerald-900/10 text-emerald-700"
                            : "border-[#2a2a2a] text-gray-600 hover:text-white hover:border-[#444]"
                          }`}>
                          <span className="block text-base mb-0.5">{e.icon}</span>
                          <span className="block leading-tight">{e.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Próximo contacto auto-calculado ── */}
              {trato.fechaProximaAccion && (() => {
                const info = fmtProximoContacto(trato.fechaProximaAccion.split("T")[0]);
                return (
                  <div className="flex items-center gap-3 bg-[#0a1a0f] border border-emerald-900/40 rounded-lg px-4 py-3">
                    <span className="text-lg shrink-0">🗓️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Próximo contacto programado</p>
                      <p className={`text-sm font-semibold ${info.color}`}>{info.label}</p>
                      {trato.proximaAccion && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{trato.proximaAccion}</p>}
                    </div>
                    {trato.responsable && (
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-600">Asignado a</p>
                        <p className="text-xs text-gray-400 font-medium">{trato.responsable.name.split(" ")[0]}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Plan de acción de la etapa actual ── */}
              {playbook && (
                <div className="bg-[#0a1a0f] border border-emerald-900/40 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-emerald-800/40 flex items-center justify-center text-sm shrink-0 mt-0.5">
                      {NURTURING_ETAPAS.find(e => e.id === etapaKey)?.icon}
                    </div>
                    <div>
                      <p className="text-emerald-300 text-sm font-semibold">
                        {NURTURING_ETAPAS.find(e => e.id === etapaKey)?.label}
                        <span className="ml-2 text-[10px] text-emerald-700 font-normal">{playbook.intervalo}</span>
                      </p>
                      <p className="text-gray-400 text-xs mt-1 leading-relaxed">{playbook.objetivo}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-emerald-700 uppercase tracking-widest mb-2 font-semibold">Qué hacer</p>
                      <ul className="space-y-1.5">
                        {playbook.acciones.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                            <span className="text-emerald-600 mt-0.5 shrink-0">›</span><span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-700 uppercase tracking-widest mb-2 font-semibold">Qué compartir</p>
                      <ul className="space-y-1.5">
                        {playbook.contenido.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                            <span className="text-[#B3985B] mt-0.5 shrink-0">◆</span><span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Guiones WA — etapa actual + tipo de evento ── */}
              <div className="border-t border-[#1a1a1a] pt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    Guiones WhatsApp — {NURTURING_ETAPAS.find(e => e.id === etapaKey)?.label}
                    {trato.tipoEvento && trato.tipoEvento !== "OTRO" && (
                      <span className="ml-2 text-[#B3985B]">
                        · {trato.tipoEvento === "MUSICAL" ? "Musical" : trato.tipoEvento === "SOCIAL" ? "Social" : "Empresarial"}
                      </span>
                    )}
                  </p>
                  {!num && <span className="text-[10px] text-orange-400">Sin teléfono en cliente</span>}
                </div>

                {tplsEvento.length > 0 ? (
                  <div className="space-y-2">
                    {tplsEvento.map(tpl => {
                      const msg = tpl.msg(nombre, ctx);
                      const yaEnviado = nurturing.log.some(l => l.templateId === tpl.id);
                      return (
                        <div key={tpl.id} className={`bg-[#111] border rounded-xl overflow-hidden ${yaEnviado ? "border-emerald-900/60" : "border-[#222]"}`}>
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a]">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-emerald-300">{tpl.icon} {tpl.label}</span>
                              {yaEnviado && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-900/20 border border-emerald-900/40 px-1.5 py-0.5 rounded">
                                  ✓ Enviado
                                </span>
                              )}
                            </div>
                            {num ? (
                              <a href={`https://wa.me/${num}?text=${encodeURIComponent(msg)}`}
                                target="_blank" rel="noopener noreferrer"
                                onClick={() => registrarEnvioWA(tpl.id, tpl.label)}
                                className="flex items-center gap-1.5 bg-green-900/30 hover:bg-green-800/50 border border-green-700/40 text-green-400 text-xs px-3 py-1.5 rounded-lg transition-colors">
                                {WA_ICON} {yaEnviado ? "Reenviar" : "Enviar"}
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-600">Sin teléfono</span>
                            )}
                          </div>
                          <div className="px-4 py-3">
                            <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-line">{msg}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs">Define el tipo de evento arriba para ver los guiones correspondientes.</p>
                )}

                {playbook?.contenido && (
                  <div className="mt-3 p-3 bg-[#111] border border-[#1e1e1e] rounded-lg flex flex-wrap gap-1.5">
                    {playbook.contenido.map((c, i) => (
                      <span key={i} className="text-[10px] text-gray-500 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-1 rounded">{c}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Historial de mensajes enviados ── */}
              {nurturing.log.length > 0 && (
                <div className="border-t border-[#1a1a1a] pt-5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">
                    Mensajes enviados ({nurturing.log.length})
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {[...nurturing.log].reverse().map((entry, i) => {
                      const etapaInfo = NURTURING_ETAPAS.find(e => e.id === entry.etapa);
                      return (
                        <div key={i} className="flex items-center gap-3 text-xs bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2">
                          <span className="text-gray-600 shrink-0 tabular-nums">{entry.fecha}</span>
                          <span className="text-base shrink-0">{etapaInfo?.icon ?? "💬"}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-300 font-medium">{entry.templateLabel}</span>
                            <span className="text-gray-600 ml-1.5">· {etapaInfo?.label ?? entry.etapa}</span>
                          </div>
                          <span className="text-[10px] text-green-600 shrink-0">✓ WA</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Links de presentación para compartir ── */}
              <div className="border-t border-[#1a1a1a] pt-5">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Presentaciones para compartir</p>
                <div className="flex flex-wrap gap-2">
                  {trato.tipoEvento && trato.tipoEvento !== "OTRO" && (() => {
                    const tipo = trato.tipoEvento === "MUSICAL" ? "musical" : trato.tipoEvento === "SOCIAL" ? "social" : "empresarial";
                    const url  = `${typeof window !== "undefined" ? window.location.origin : "https://mainstagepro.vercel.app"}/presentacion/evento/${tipo}`;
                    const label = trato.tipoEvento === "MUSICAL" ? "🎸 Eventos Musicales" : trato.tipoEvento === "SOCIAL" ? "🎊 Eventos Sociales" : "🏢 Eventos Empresariales";
                    return (
                      <button
                        onClick={() => { navigator.clipboard.writeText(url); }}
                        className="flex items-center gap-2 text-xs bg-[#111] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#B3985B]/40 text-gray-300 px-3 py-2 rounded-lg transition-all">
                        <span>{label}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    );
                  })()}
                  {[
                    { label: "📋 Servicios", url: "/presentacion/servicios" },
                    { label: "🎛 Inventario", url: "/presentacion/inventario" },
                  ].map(item => {
                    const fullUrl = `${typeof window !== "undefined" ? window.location.origin : "https://mainstagepro.vercel.app"}${item.url}`;
                    return (
                      <button key={item.url}
                        onClick={() => { navigator.clipboard.writeText(fullUrl); }}
                        className="flex items-center gap-2 text-xs bg-[#111] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#B3985B]/40 text-gray-300 px-3 py-2 rounded-lg transition-all">
                        <span>{item.label}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-600 mt-2">Clic para copiar el link y pegarlo en WhatsApp</p>
              </div>

              {/* ── Transición ── */}
              <div className="border-t border-[#1a1a1a] pt-5">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">¿El prospecto ya está listo para avanzar?</p>
                <p className="text-gray-600 text-xs mb-4">Cuando el prospecto tenga una necesidad concreta, pásalo al flujo de venta activo.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={async () => { const d = await patch({ tipoProspecto: "ACTIVO", canalAtencion: null }); setTrato(prev => prev ? { ...prev, ...d.trato } : prev); }}
                    className="border border-[#B3985B]/40 bg-[#B3985B]/5 hover:bg-[#B3985B]/10 text-[#B3985B] text-sm font-medium px-4 py-3 rounded-xl transition-colors">
                    <p className="font-semibold">🔍 Iniciar descubrimiento</p>
                    <p className="text-xs text-[#B3985B]/60 mt-0.5">Tienen necesidad, hay que calificarla</p>
                  </button>
                  <button onClick={async () => { const d = await patch({ tipoProspecto: "ACTIVO", rutaEntrada: "RIDER_DIRECTO", canalAtencion: "LLAMADA" }); setTrato(prev => prev ? { ...prev, ...d.trato } : prev); }}
                    className="border border-blue-700/40 bg-blue-900/10 hover:bg-blue-900/20 text-blue-300 text-sm font-medium px-4 py-3 rounded-xl transition-colors">
                    <p className="font-semibold">📋 Tienen rider técnico</p>
                    <p className="text-xs text-blue-300/60 mt-0.5">Saben lo que necesitan, cotizar directo</p>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

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
                  <VenuePicker value={discForm.lugarEstimado} onChange={(v) => setDiscForm(p => ({ ...p, lugarEstimado: v }))} placeholder="Ej: CDMX · Salón Versalles" />
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
                    <TimePicker value={discForm.horaInicioEvento} onChange={v => setDiscForm(p => ({ ...p, horaInicioEvento: v }))} placeholder="Hora inicio" />
                  </div>
                  <span className="text-gray-600 text-sm pt-4">→</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">Fin del evento</label>
                    <TimePicker value={discForm.horaFinEvento} onChange={v => setDiscForm(p => ({ ...p, horaFinEvento: v }))} placeholder="Hora fin" />
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
                    <TimePicker value={discForm.rentaHoraEntrega} onChange={v => setDiscForm(p => ({ ...p, rentaHoraEntrega: v }))} placeholder="Hora entrega" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Fecha de devolución/recolección</label>
                    <input type="date" value={discForm.rentaFechaDevolucion}
                      onChange={e => setDiscForm(p => ({ ...p, rentaFechaDevolucion: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Hora de recolección</label>
                    <TimePicker value={discForm.rentaHoraDevolucion} onChange={v => setDiscForm(p => ({ ...p, rentaHoraDevolucion: v }))} placeholder="Hora recolección" />
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
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1a1a1a]">
              <div className="flex items-center gap-3">
                {/* Auto-save indicator */}
                {autoSaveStatus === "saving" && <span className="text-xs text-gray-500 animate-pulse">Guardando…</span>}
                {autoSaveStatus === "saved"  && <span className="text-xs text-green-500">✓ Guardado</span>}
                {/* Scouting button — only show if not already visible */}
                {!scoutingVisible && !trato.scoutingData && trato.canalAtencion !== "SCOUTING" && (
                  <button onClick={() => setScoutingVisible(true)}
                    className="flex items-center gap-1.5 text-xs text-[#B3985B] border border-[#B3985B]/30 hover:border-[#B3985B]/70 px-3 py-1.5 rounded-lg transition-colors">
                    🗺️ Iniciar scouting de venue
                  </button>
                )}
              </div>
              <button onClick={() => guardarDescubrimiento(true)} disabled={saving || (!discForm.fechaEventoEstimada && discForm.fechaEventoEstimada !== "por-definir") || (!discForm.lugarEstimado && discForm.lugarEstimado !== "por-definir")}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-lg transition-colors">
                {saving ? "Guardando..." : "Descubrimiento completo → Oportunidad"}
              </button>
            </div>
          </div>}
        </div>
      )}

      {/* ── Scouting de venue ── */}
      {(trato.canalAtencion === "SCOUTING" || trato.scoutingData || scoutingVisible) && (
        <div className="bg-[#0d0d0d] border-2 border-[#B3985B]/40 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗺️</span>
              <div>
                <p className="text-white font-semibold">Scouting del venue</p>
                <p className="text-gray-500 text-xs">Ficha técnica del lugar capturada en visita presencial</p>
              </div>
            </div>
            <div className="flex gap-1">
              {(["form", "resumen"] as const).map(t => (
                <button key={t} onClick={() => setScoutingTab(t)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${scoutingTab === t ? "bg-[#B3985B] text-black" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>
                  {t === "form" ? "Editar" : "Resumen"}
                </button>
              ))}
            </div>
          </div>

          {scoutingTab === "resumen" && trato.scoutingData ? (() => {
            const s = scoutingForm;
            const row = (label: string, val: string) => val ? (
              <div key={label} className="flex gap-2 text-sm">
                <span className="text-gray-500 min-w-[160px]">{label}</span>
                <span className="text-white">{val}</span>
              </div>
            ) : null;
            return (
              <div className="space-y-4">
                {s.nombreVenue && <div>
                  <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-2">Venue</p>
                  <div className="space-y-1 pl-2">
                    {row("Nombre", s.nombreVenue)}
                    {row("Dirección", s.direccion)}
                    {row("Contacto", s.contactoVenue + (s.telefonoVenue ? ` · ${s.telefonoVenue}` : ""))}
                  </div>
                </div>}
                {(s.largo || s.ancho || s.alturaMaxima || s.capacidadPersonas) && <div>
                  <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-2">Espacio</p>
                  <div className="space-y-1 pl-2">
                    {(s.largo || s.ancho) && row("Dimensiones", `${s.largo || "?"}m × ${s.ancho || "?"}m`)}
                    {row("Altura máx.", s.alturaMaxima ? `${s.alturaMaxima}m` : "")}
                    {row("Capacidad", s.capacidadPersonas ? `${s.capacidadPersonas} personas` : "")}
                  </div>
                </div>}
                {(s.accesoVehicular || s.puntoDescarga) && <div>
                  <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-2">Accesos y logística</p>
                  <div className="space-y-1 pl-2">
                    {row("Acceso vehicular", s.accesoVehicular)}
                    {row("Punto de descarga", s.puntoDescarga)}
                  </div>
                </div>}
                {(s.voltajeDisponible || s.amperajeTotalDisponible || s.fases || s.ubicacionTablero) && <div>
                  <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-2">Instalación eléctrica</p>
                  <div className="space-y-1 pl-2">
                    {row("Voltaje disponible", s.voltajeDisponible ? `${s.voltajeDisponible}V` : "")}
                    {row("Amperaje total", s.amperajeTotalDisponible ? `${s.amperajeTotalDisponible}A` : "")}
                    {row("Fases", s.fases)}
                    {row("Ubicación del tablero", s.ubicacionTablero)}
                  </div>
                </div>}
                {(s.restriccionDecibeles || s.restriccionHorarioAcceso || s.restriccionInstalacion) && <div>
                  <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-2">Restricciones</p>
                  <div className="space-y-1 pl-2">
                    {row("Límite de decibeles", s.restriccionDecibeles)}
                    {row("Horario de acceso", s.restriccionHorarioAcceso)}
                    {row("Instalación", s.restriccionInstalacion)}
                  </div>
                </div>}
                {(s.estadoGeneral || s.notasScouting) && <div>
                  <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-2">Observaciones</p>
                  <div className="space-y-1 pl-2">
                    {row("Estado del lugar", s.estadoGeneral)}
                    {s.notasScouting && <p className="text-sm text-gray-300 whitespace-pre-wrap">{s.notasScouting}</p>}
                  </div>
                </div>}
              </div>
            );
          })() : null}

          {scoutingTab === "form" && (
            <div className="space-y-5">
              {/* Venue */}
              <div>
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-3">Venue / Recinto</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Nombre del venue</label>
                    <input value={scoutingForm.nombreVenue} onChange={e => setScoutingForm(p => ({ ...p, nombreVenue: e.target.value }))}
                      placeholder="Ej: Teatro de la Ciudad, Hacienda El Rosario..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Dirección</label>
                    <input value={scoutingForm.direccion} onChange={e => setScoutingForm(p => ({ ...p, direccion: e.target.value }))}
                      placeholder="Calle, número, colonia, ciudad"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Contacto en el venue</label>
                    <input value={scoutingForm.contactoVenue} onChange={e => setScoutingForm(p => ({ ...p, contactoVenue: e.target.value }))}
                      placeholder="Nombre del encargado / administrador"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Teléfono del contacto</label>
                    <input value={scoutingForm.telefonoVenue} onChange={e => setScoutingForm(p => ({ ...p, telefonoVenue: e.target.value }))}
                      placeholder="+52 442 000 0000"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>

              {/* Espacio */}
              <div>
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-3">Dimensiones del espacio</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Largo (m)</label>
                    <input type="number" value={scoutingForm.largo} onChange={e => setScoutingForm(p => ({ ...p, largo: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Ancho (m)</label>
                    <input type="number" value={scoutingForm.ancho} onChange={e => setScoutingForm(p => ({ ...p, ancho: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Altura máx. (m)</label>
                    <input type="number" value={scoutingForm.alturaMaxima} onChange={e => setScoutingForm(p => ({ ...p, alturaMaxima: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Capacidad (personas)</label>
                    <input type="number" value={scoutingForm.capacidadPersonas} onChange={e => setScoutingForm(p => ({ ...p, capacidadPersonas: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>

              {/* Accesos */}
              <div>
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-3">Accesos y logística</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Acceso vehicular</label>
                    <input value={scoutingForm.accesoVehicular} onChange={e => setScoutingForm(p => ({ ...p, accesoVehicular: e.target.value }))}
                      placeholder="Ej: Sí, por calle lateral / No, solo peatonal"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Punto de descarga</label>
                    <input value={scoutingForm.puntoDescarga} onChange={e => setScoutingForm(p => ({ ...p, puntoDescarga: e.target.value }))}
                      placeholder="Ej: Entrada trasera, rampa norte..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>

              {/* Eléctrico */}
              <div>
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-3">Instalación eléctrica</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Voltaje disponible (V)</label>
                    <input type="number" value={scoutingForm.voltajeDisponible} onChange={e => setScoutingForm(p => ({ ...p, voltajeDisponible: e.target.value }))}
                      placeholder="Ej: 127 / 220"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Amperaje total disponible (A)</label>
                    <input type="number" value={scoutingForm.amperajeTotalDisponible} onChange={e => setScoutingForm(p => ({ ...p, amperajeTotalDisponible: e.target.value }))}
                      placeholder="Ej: 200"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Fases</label>
                    <select value={scoutingForm.fases} onChange={e => setScoutingForm(p => ({ ...p, fases: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                      <option value="">Seleccionar...</option>
                      <option value="Monofásico 127V">Monofásico 127V</option>
                      <option value="Bifásico 220V">Bifásico 220V</option>
                      <option value="Trifásico 220V">Trifásico 220V</option>
                      <option value="Trifásico 440V">Trifásico 440V</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Ubicación del tablero</label>
                    <input value={scoutingForm.ubicacionTablero} onChange={e => setScoutingForm(p => ({ ...p, ubicacionTablero: e.target.value }))}
                      placeholder="Ej: Cuarto de máquinas, entrada lateral..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>

              {/* Restricciones */}
              <div>
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-3">Restricciones del venue</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Límite de decibeles</label>
                    <input value={scoutingForm.restriccionDecibeles} onChange={e => setScoutingForm(p => ({ ...p, restriccionDecibeles: e.target.value }))}
                      placeholder="Ej: Máx. 95 dB, no aplica..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Horario de acceso / montaje</label>
                    <input value={scoutingForm.restriccionHorarioAcceso} onChange={e => setScoutingForm(p => ({ ...p, restriccionHorarioAcceso: e.target.value }))}
                      placeholder="Ej: Entrada 08:00, salida máx. 02:00"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Restricciones de instalación</label>
                    <input value={scoutingForm.restriccionInstalacion} onChange={e => setScoutingForm(p => ({ ...p, restriccionInstalacion: e.target.value }))}
                      placeholder="Ej: No se permite anclar en techo, no se puede instalar rigging..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wide mb-3">Observaciones generales</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Estado general del venue</label>
                    <input value={scoutingForm.estadoGeneral} onChange={e => setScoutingForm(p => ({ ...p, estadoGeneral: e.target.value }))}
                      placeholder="Ej: Buenas condiciones, humedad en muros, piso de madera..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Notas adicionales del scouting</label>
                    <textarea value={scoutingForm.notasScouting} onChange={e => setScoutingForm(p => ({ ...p, notasScouting: e.target.value }))}
                      rows={3} placeholder="Cualquier detalle relevante para la producción: acústica, reflejos, obstáculos, condiciones especiales..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#1a1a1a]">
                <button onClick={saveScouting} disabled={savingScouting}
                  className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-lg transition-colors">
                  {savingScouting ? "Guardando..." : "Guardar ficha de scouting"}
                </button>
              </div>
            </div>
          )}
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

        {/* Archivos por categoría */}
        <div className="mt-4 border-t border-[#1a1a1a] pt-4 space-y-5">

          {/* Helper: renders a file grid for a given category */}
          {(["SCOUTING", "REFERENCIA", "DOCUMENTO"] as const).map((cat) => {
            const catMeta = {
              SCOUTING:   { label: "Fotos de scouting",           icon: "🗺️", accept: "image/*", hint: "Fotos del venue, accesos, instalaciones" },
              REFERENCIA: { label: "Referencias del cliente",      icon: "🖼️", accept: "image/*,.pdf", hint: "Imágenes o docs que el cliente comparte como inspiración" },
              DOCUMENTO:  { label: "Archivos adicionales del cliente", icon: "📁", accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip", hint: "Contratos, riders, planos, cualquier archivo adicional" },
            }[cat];
            const catArchivos = archivos.filter(a => a.tipo === cat);
            const uploading = uploadingTipo === cat;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{catMeta.icon} {catMeta.label}</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">{catMeta.hint}</p>
                  </div>
                  <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[11px] cursor-pointer transition-colors ${uploading ? "opacity-40 pointer-events-none text-gray-500" : "text-gray-500 hover:text-white hover:border-[#444]"}`}>
                    {uploading ? "Subiendo..." : "+ Agregar"}
                    <input type="file" className="hidden" accept={catMeta.accept} multiple={cat === "SCOUTING"} onChange={e => subirArchivo(e, cat)} />
                  </label>
                </div>
                {catArchivos.length === 0 ? (
                  <p className="text-gray-700 text-[11px] italic">Sin archivos aún</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {catArchivos.map((a) => {
                      const esImagen = /\.(jpe?g|png|gif|webp|heic)$/i.test(a.url);
                      return (
                        <div key={a.id} className="group relative bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                          {esImagen ? (
                            <a href={a.url} target="_blank" rel="noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={a.url} alt={a.nombre} className="w-full h-20 object-cover hover:opacity-90 transition-opacity" />
                            </a>
                          ) : (
                            <a href={a.url} target="_blank" rel="noreferrer"
                              className="flex flex-col items-center justify-center gap-1 px-2 py-4 hover:bg-[#1a1a1a] transition-colors min-h-[5rem]">
                              <span className="text-xl">
                                {/\.pdf$/i.test(a.url) ? "📄" : /\.(doc|docx)$/i.test(a.url) ? "📝" : /\.(xls|xlsx)$/i.test(a.url) ? "📊" : "📎"}
                              </span>
                              <span className="text-gray-400 text-[10px] truncate w-full text-center px-1">{a.nombre}</span>
                            </a>
                          )}
                          <button
                            onClick={() => eliminarArchivo(a.id)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-red-400 text-xs items-center justify-center hidden group-hover:flex hover:bg-red-900/60 transition-colors"
                          >×</button>
                          <p className="px-2 py-1 text-gray-600 text-[10px] truncate border-t border-[#1a1a1a]">{a.nombre}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Legacy: show any files with other types (IMAGEN/OTRO) not caught above */}
          {archivos.filter(a => !["SCOUTING","REFERENCIA","DOCUMENTO"].includes(a.tipo)).length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Otros archivos</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {archivos.filter(a => !["SCOUTING","REFERENCIA","DOCUMENTO"].includes(a.tipo)).map((a) => {
                  const esImagen = a.tipo === "IMAGEN" || /\.(jpe?g|png|gif|webp|heic)$/i.test(a.url);
                  return (
                    <div key={a.id} className="group relative bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                      {esImagen ? (
                        <a href={a.url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.url} alt={a.nombre} className="w-full h-20 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <a href={a.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-4 hover:bg-[#1a1a1a] transition-colors">
                          <span className="text-xl">
                            {/\.pdf$/i.test(a.url) ? "📄" : /\.(doc|docx)$/i.test(a.url) ? "📝" : "📎"}
                          </span>
                          <span className="text-gray-300 text-[10px] truncate">{a.nombre}</span>
                        </a>
                      )}
                      <button
                        onClick={() => eliminarArchivo(a.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-red-400 text-xs items-center justify-center hidden group-hover:flex hover:bg-red-900/60 transition-colors"
                      >×</button>
                      <p className="px-2 py-1 text-gray-600 text-[10px] truncate border-t border-[#1a1a1a]">{a.nombre}</p>
                    </div>
                  );
                })}
              </div>
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
                  <VenuePicker value={form.lugarEstimado || ""} onChange={(v) => setForm(p => ({ ...p, lugarEstimado: v }))} />
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

      {/* ── Brief Levantamiento de Contenido ── */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <button
          onClick={() => setBriefExpanded(p => !p)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-[#161616] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📸</span>
            <div>
              <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Brief Levantamiento de Contenido</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {briefGuardado ? "Brief completado — click para editar" : "Formulario para cobertura fotográfica/video del evento"}
              </p>
            </div>
            {briefGuardado && <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/40 text-green-300">Guardado</span>}
          </div>
          <span className="text-gray-500 text-lg">{briefExpanded ? "▲" : "▼"}</span>
        </button>

        {briefExpanded && (
          <div className="px-5 pb-6 border-t border-[#222] space-y-5 pt-5">
            {/* Datos del evento */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Datos del evento</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Nombre del evento</label>
                  <input value={briefForm.nombreEvento} onChange={e => setBriefForm(p => ({ ...p, nombreEvento: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Tipo de evento</label>
                  <select value={briefForm.tipoEvento} onChange={e => setBriefForm(p => ({ ...p, tipoEvento: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">Seleccionar</option>
                    <option value="EMPRESARIAL">Empresarial</option>
                    <option value="SOCIAL">Social</option>
                    <option value="MUSICAL">Musical</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Fecha</label>
                  <input type="date" value={briefForm.fecha} onChange={e => setBriefForm(p => ({ ...p, fecha: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Horario del evento</label>
                  <input value={briefForm.horarioEvento} onChange={e => setBriefForm(p => ({ ...p, horarioEvento: e.target.value }))}
                    placeholder="ej. 18:00" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Horario de cobertura</label>
                  <input value={briefForm.horarioCobertura} onChange={e => setBriefForm(p => ({ ...p, horarioCobertura: e.target.value }))}
                    placeholder="ej. 17:00 (llegada del fotógrafo)" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Lugar / Venue</label>
                  <input value={briefForm.lugar} onChange={e => setBriefForm(p => ({ ...p, lugar: e.target.value }))}
                    placeholder="Nombre del venue y dirección" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cliente y proveedores</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Nombre del cliente</label>
                  <input value={briefForm.nombreCliente} onChange={e => setBriefForm(p => ({ ...p, nombreCliente: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Redes sociales del cliente/proveedores</label>
                  <input value={briefForm.redesSocialesCliente} onChange={e => setBriefForm(p => ({ ...p, redesSocialesCliente: e.target.value }))}
                    placeholder="@usuario, @usuario2..." className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs text-gray-400 block mb-2">¿El evento cuenta con proveedores adicionales?</label>
                <div className="flex gap-3">
                  {["SI", "NO", "SIN_INFO"].map(v => (
                    <button key={v} onClick={() => setBriefForm(p => ({ ...p, tieneProveedoresAdicionales: v }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors border ${briefForm.tieneProveedoresAdicionales === v ? "bg-[#B3985B] text-black border-[#B3985B]" : "bg-[#1a1a1a] text-gray-400 border-[#2a2a2a] hover:border-[#B3985B]"}`}>
                      {v === "SIN_INFO" ? "Sin información" : v === "SI" ? "Sí" : "No"}
                    </button>
                  ))}
                </div>
                {briefForm.tieneProveedoresAdicionales === "SI" && (
                  <textarea value={briefForm.proveedoresDetalle} onChange={e => setBriefForm(p => ({ ...p, proveedoresDetalle: e.target.value }))}
                    placeholder="¿Quién es el proveedor y qué servicios ofrecerán?" rows={2}
                    className="w-full mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                )}
              </div>
            </div>

            {/* Objetivos de contenido */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Objetivos del contenido</p>
              {[
                "Contenido para redes sociales",
                "Material para portafolio",
                "Mostrar antes/después",
                "Documentar operación técnica",
                "Mostrar funcionamiento/operación de equipo específico",
                "Todas las anteriores (Cobertura General)",
                "Otro",
              ].map(obj => (
                <label key={obj} className="flex items-center gap-2 py-1 cursor-pointer group">
                  <input type="checkbox"
                    checked={briefForm.objetivosContenido.includes(obj)}
                    onChange={e => setBriefForm(p => ({
                      ...p,
                      objetivosContenido: e.target.checked
                        ? [...p.objetivosContenido, obj]
                        : p.objetivosContenido.filter(x => x !== obj),
                    }))}
                    className="w-4 h-4 rounded border-gray-600 bg-[#1a1a1a] accent-[#B3985B]" />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{obj}</span>
                </label>
              ))}
              {briefForm.objetivosContenido.length > 0 && (
                <textarea value={briefForm.detalleObjetivo} onChange={e => setBriefForm(p => ({ ...p, detalleObjetivo: e.target.value }))}
                  placeholder="Detalla el objetivo seleccionado..." rows={2}
                  className="w-full mt-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              )}
            </div>

            {/* Plan de cobertura */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Plan de cobertura</p>
              <div className="space-y-2">
                {[
                  { id: "BASICO", label: "Básico", desc: "Fotografía + 1 Reel · $1,600" },
                  { id: "ESTANDAR", label: "Estándar", desc: "Fotografía + 2 Reels · $2,000" },
                  { id: "PLUS", label: "Plus", desc: "Estándar + Video con presentador · $2,500" },
                  { id: "INTEGRAL", label: "Integral", desc: "Plus + Contenido de experiencia influencer · Costo variable" },
                  { id: "OTRO", label: "Otro", desc: "" },
                ].map(plan => (
                  <button key={plan.id} onClick={() => setBriefForm(p => ({ ...p, planCobertura: plan.id }))}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${briefForm.planCobertura === plan.id ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#444]"}`}>
                    <span className="text-sm font-medium text-white">{plan.label}</span>
                    {plan.desc && <span className="text-xs text-gray-400 ml-2">— {plan.desc}</span>}
                  </button>
                ))}
              </div>
              {briefForm.planCobertura === "OTRO" && (
                <input value={briefForm.planCoberturaOtro} onChange={e => setBriefForm(p => ({ ...p, planCoberturaOtro: e.target.value }))}
                  placeholder="Describe el plan de cobertura" className="w-full mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              )}
            </div>

            {/* Temas y colaboradores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs text-gray-400 block mb-1">¿Qué temas te interesa desarrollar en el contenido?</label>
                <textarea value={briefForm.temasSugeridos} onChange={e => setBriefForm(p => ({ ...p, temasSugeridos: e.target.value }))}
                  rows={3} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2">¿Hay colaboradores de Mainstage Pro disponibles frente a cámara?</label>
                <div className="flex gap-3 mb-2">
                  {["SI", "NO"].map(v => (
                    <button key={v} onClick={() => setBriefForm(p => ({ ...p, colaboradoresCamara: v }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors border ${briefForm.colaboradoresCamara === v ? "bg-[#B3985B] text-black border-[#B3985B]" : "bg-[#1a1a1a] text-gray-400 border-[#2a2a2a] hover:border-[#B3985B]"}`}>
                      {v === "SI" ? "Sí" : "No"}
                    </button>
                  ))}
                </div>
                {briefForm.colaboradoresCamara === "SI" && (
                  <textarea value={briefForm.colaboradoresNombres} onChange={e => setBriefForm(p => ({ ...p, colaboradoresNombres: e.target.value }))}
                    placeholder="Nombre(s) de los participantes" rows={2}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                )}
              </div>
            </div>

            {/* Notas adicionales */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notas adicionales y consideraciones del evento</label>
              <textarea value={briefForm.notasAdicionales} onChange={e => setBriefForm(p => ({ ...p, notasAdicionales: e.target.value }))}
                rows={3} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
            </div>

            <button onClick={saveBrief} disabled={savingBrief}
              className="w-full py-3 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors disabled:opacity-60">
              {savingBrief ? "Guardando..." : briefGuardado ? "Actualizar brief" : "Guardar brief"}
            </button>
          </div>
        )}
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
