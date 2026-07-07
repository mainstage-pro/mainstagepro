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
import { useCelebration } from "@/components/CelebrationToast";
import { Combobox } from "@/components/Combobox";
import { BackButton } from "@/components/BackButton";
import { SEGUIMIENTO_TIPOS, SEGUIMIENTO_TIPO_LABELS, getWaMensajePrimerContacto } from '@/lib/seguimientoTypes';

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
  etapaCambiadaEn: string | null;
  createdAt: string;
  formToken: string | null;
  formEstado: string;
  formRespuestas: string | null;
  briefToken: string | null;
  briefRecibidoEn: string | null;
  rutaEntrada: string | null;
  // Descubrimiento
  canalAtencion: string | null;
  nombreEvento: string | null;
  duracionEvento: string | null;
  diasServicio: number | null;
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
  tradeCalificado: boolean;
  tradeNivel: number | null;
  familyAndFriends: boolean;
  realizarRender: boolean;
  tipoProspecto: string;
  nurturingData: string | null;
  ventanaMontajeFin: string | null;
  horaTerminoMontaje: string | null;
  contactoVenueNombre: string | null;
  contactoVenueTelefono: string | null;
  camposCliente: string | null;
  cliente: {
    id: string; nombre: string; empresa: string | null;
    tipoCliente: string; clasificacion: string;
    telefono: string | null; correo: string | null;
  };
  responsableId: string | null;
  responsable: { id: string; name: string } | null;
  vendedorId: string | null;
  vendedor: { id: string; name: string } | null;
  // ── Confirmación operativa ──
  confirmadaEn: string | null;
  metodoConfirmacion: string | null;
  notaConfirmacion: string | null;
  // ── Cierre comercial ──
  montoFinal: number | null;
  // ── Descubrimiento adicional ──
  contactoDecisorNombre: string | null;
  contactoDecisorCargo: string | null;
  cotizaciones: Array<{
    id: string; numeroCotizacion: string; opcionLetra: string; grupoId: string | null;
    estado: string; granTotal: number; nombreEvento: string | null; nombreCotizacion: string | null;
    fechaEvento: string | null; lugarEvento: string | null;
    gastosProduccionActivo: boolean; gastosProduccionMonto: number;
    createdAt: string; proyecto: { id: string } | null;
  }>;
  archivos: TratoArchivo[];
  _canViewFinances?: boolean;
}

// ─── Catálogos / Constantes ───────────────────────────────────────────────────
const ETAPAS = ["LEAD", "DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"];
const ETAPA_LABELS: Record<string, string> = {
  LEAD: "Lead", DESCUBRIMIENTO: "Descubrimiento", OPORTUNIDAD: "Oportunidad",
  VENTA_CERRADA: "Venta Cerrada", VENTA_PERDIDA: "Venta Perdida",
};
const ETAPA_COLORS: Record<string, string> = {
  LEAD: "bg-violet-900/50 text-violet-300",
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
  INSTAGRAM_DM: "Instagram DM", LINKEDIN: "LinkedIn", BASE_DATOS: "Base de datos",
  LLAMADA_FRIA: "Llamada fría", NETWORKING: "Networking", WHATSAPP_DIRECTO: "WhatsApp directo",
};

const ORIGENES_OUTBOUND = [
  { id: "REDES_SOCIALES", icon: "📱", label: "Redes sociales",  desc: "Instagram DM, LinkedIn, WhatsApp" },
  { id: "BASE_DATOS",     icon: "📋", label: "Base de datos",   desc: "Lista, directorio, búsqueda" },
  { id: "NETWORKING",     icon: "🤝", label: "Networking",      desc: "Evento, referencia interna, contacto personal" },
];
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

// Pasos del wizard de descubrimiento
const PASOS_DISCOVERY_FULL = [
  { id: 1, icon: "📋", label: "Básico" },
  { id: 2, icon: "✨", label: "Servicios" },
  { id: 3, icon: "📊", label: "Detalles" },
  { id: 4, icon: "📸", label: "Contenido" },
];
const PASOS_DISCOVERY_RENTA = [
  { id: 1, icon: "📋", label: "Básico" },
  { id: 2, icon: "📦", label: "Equipos y logística" },
  { id: 3, icon: "✅", label: "Finalizar" },
];

// Servicios por tipo de evento
interface ServicioItem { id: string; label: string; grupo: string }

// Categorías base — siempre se muestran para todos los tipos de evento
const CATEGORIAS_BASE: ServicioItem[] = [
  // Audio
  { id: "AUDIO_PA",     label: "Audio PA / Bocinas",                   grupo: "Audio" },
  { id: "SUBWOOFERS",   label: "Subwoofers",                            grupo: "Audio" },
  { id: "CONSOLAS",     label: "Consolas de audio",                     grupo: "Audio" },
  { id: "MICROFONOS",   label: "Micrófonos inalámbricos",               grupo: "Audio" },
  { id: "IEM",          label: "IEMs / In-ear monitors",                grupo: "Audio" },
  { id: "MONITORES",    label: "Monitores de escenario",                grupo: "Audio" },
  // Iluminación
  { id: "ILUMINACION",  label: "Iluminación (cabezas, pars, barras)",   grupo: "Iluminación" },
  { id: "CONSOLA_ILUM", label: "Consolas de iluminación",               grupo: "Iluminación" },
  // Video
  { id: "PANTALLAS_LED",label: "Pantallas LED",                         grupo: "Video / Pantallas" },
  { id: "PROYECCION",   label: "Proyección",                            grupo: "Video / Pantallas" },
  // Estructuras
  { id: "RIGGING",      label: "Rigging / Estructuras",                 grupo: "Estructuras" },
  { id: "ENTARIMADO",   label: "Entarimado / Escenario",                grupo: "Estructuras" },
  // Energía
  { id: "CORRIENTE",    label: "Corriente eléctrica / Plantas de luz",  grupo: "Energía" },
  // DJ / Música
  { id: "DJ_EQUIPO",    label: "Consolas / Equipo para DJ",             grupo: "DJ / Música" },
  { id: "DJ_BOOTH",     label: "DJ Booths",                             grupo: "DJ / Música" },
  { id: "BACKLINE",     label: "Backline (amps, batería)",               grupo: "DJ / Música" },
];

// Extras específicos por tipo de evento
const EXTRAS_EVENTO: Record<string, ServicioItem[]> = {
  SOCIAL: [
    { id: "PISTA_BAILE",  label: "Pista de baile iluminada",  grupo: "extra" },
    { id: "ILUM_ARQ",     label: "Iluminación arquitectónica", grupo: "extra" },
    { id: "CHISPEROS",    label: "Chisperos",                  grupo: "extra" },
    { id: "HUMO_FRIO",    label: "Humo frío",                  grupo: "extra" },
    { id: "CONFETI",      label: "Cañones de confeti",         grupo: "extra" },
    { id: "KARAOKE",      label: "Karaoke",                    grupo: "extra" },
  ],
  EMPRESARIAL: [
    { id: "AUDIO_CONF",   label: "Sistema para conferencia",  grupo: "extra" },
    { id: "STREAMING",    label: "Streaming en vivo",         grupo: "extra" },
    { id: "GRABACION",    label: "Grabación del evento",      grupo: "extra" },
    { id: "BRANDING",     label: "Branding en pantallas",     grupo: "extra" },
    { id: "ESCENOGRAFIA", label: "Escenografía / Backdrop",   grupo: "extra" },
  ],
  MUSICAL: [
    { id: "EFECTOS",      label: "Efectos especiales",        grupo: "extra" },
    { id: "CHISPEROS",    label: "Chisperos",                 grupo: "extra" },
    { id: "HUMO_FRIO",    label: "Humo frío",                 grupo: "extra" },
    { id: "CONFETI",      label: "Confeti",                   grupo: "extra" },
    { id: "STREAMING",    label: "Streaming en vivo",         grupo: "extra" },
  ],
  OTRO: [
    { id: "EFECTOS",            label: "Efectos especiales",  grupo: "extra" },
    { id: "PRODUCCION_GENERAL", label: "Producción completa", grupo: "extra" },
  ],
};

// Lista unificada para lookups en el resumen de Estado 3
// Alias para el resumen (Estado 3 usa SERVICIOS para chips de servicios solicitados)
const SERVICIOS: Record<string, ServicioItem[]> = {
  SOCIAL:      [...CATEGORIAS_BASE, ...EXTRAS_EVENTO.SOCIAL],
  EMPRESARIAL: [...CATEGORIAS_BASE, ...EXTRAS_EVENTO.EMPRESARIAL],
  MUSICAL:     [...CATEGORIAS_BASE, ...EXTRAS_EVENTO.MUSICAL],
  OTRO:        [...CATEGORIAS_BASE, ...EXTRAS_EVENTO.OTRO],
};

// ── ideasReferencias helpers ─────────────────────────────────────────────────
function parseLinks(raw: string | null | undefined): { label: string; url: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* legacy string */ }
  return [];
}

function isLegacyString(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try { const p = JSON.parse(raw); return !Array.isArray(p); }
  catch { return true; }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function getCanal(id: string) {
  return CANALES.find(c => c.id === id);
}
function getProfundidad(canal: string | null) {
  return getCanal(canal ?? "")?.profundidad ?? null;
}

// ─── Fecha evento helper ─────────────────────────────────────────────────────
function fmtFechaEvento(iso: string | null | undefined): string {
  if (!iso) return 'Por definir';
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
    if (isNaN(d.getTime())) return 'Por definir';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return 'Por definir'; }
}

// ─── Lo que busca editable field ─────────────────────────────────────────────
// ─── ConfirmarEventoPanel ─────────────────────────────────────────────────────
function ConfirmarEventoPanel({
  tratoId,
  onConfirmado,
}: {
  tratoId: string;
  onConfirmado: (data: { confirmadaEn: string; metodoConfirmacion: string; notaConfirmacion: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [metodo, setMetodo] = useState('VERBAL');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  async function confirmar() {
    setSaving(true);
    try {
      const confirmadaEn = new Date().toISOString();
      const res = await fetch(`/api/tratos/${tratoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmadaEn, metodoConfirmacion: metodo, notaConfirmacion: nota || null }),
      });
      if (res.ok) {
        onConfirmado({ confirmadaEn, metodoConfirmacion: metodo, notaConfirmacion: nota });
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Botón de confirmación */}
      <div className="bg-[#0d0d0d] border border-amber-800/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-900/20 flex items-center justify-center text-base">🎯</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">Evento sin confirmar</p>
            <p className="text-[#555] text-xs">El cliente aún no ha confirmado formalmente</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-700/20 border border-amber-700/40 text-amber-400 text-xs font-semibold hover:bg-amber-700/30 transition-colors"
          >
            ✓ Confirmar
          </button>
        </div>
      </div>

      {/* Modal de confirmación */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div>
              <h3 className="text-white font-semibold text-base">Confirmar evento</h3>
              <p className="text-[#555] text-xs mt-1">¿Cómo se confirmó el evento?</p>
            </div>
            <div className="space-y-2">
              {(['VERBAL', 'ANTICIPO', 'CONTRATO', 'OTRO'] as const).map(m => (
                <button key={m}
                  onClick={() => setMetodo(m)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    metodo === m
                      ? 'bg-amber-900/30 border border-amber-600/50 text-amber-300'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-amber-900/40'
                  }`}>
                  {{ VERBAL: '🗣 Verbal', ANTICIPO: '💰 Anticipo recibido', CONTRATO: '📝 Contrato firmado', OTRO: '📌 Otro' }[m]}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-[#6b7280] block mb-1">Nota adicional (opcional)</label>
              <input
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="ej: anticipo del 50% vía transferencia..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-600/50"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                disabled={saving}
                onClick={confirmar}
                className="flex-1 py-2.5 rounded-xl bg-amber-700 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors">
                {saving ? 'Confirmando…' : '✓ Confirmar evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LoQueBuscaField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">Lo que busca</p>
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            rows={3}
            className="w-full bg-[#0d0d0d] border border-[#B3985B]/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/60 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => { onSave(val); setEditing(false); }}
              className="text-xs px-3 py-1 bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] rounded-lg hover:bg-[#B3985B]/20 transition-colors">
              Guardar
            </button>
            <button onClick={() => { setVal(value); setEditing(false); }}
              className="text-xs px-3 py-1 text-gray-600 hover:text-gray-400 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 group cursor-pointer" onClick={() => setEditing(true)}>
          <p className="text-sm text-white flex-1">{val || <span className="text-gray-600 italic">Sin especificar</span>}</p>
          <span className="text-[10px] text-gray-700 group-hover:text-gray-500 transition-colors shrink-0 mt-0.5">editar</span>
        </div>
      )}
    </div>
  );
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

// ─── Panel de Seguimientos del trato ─────────────────────────────────────────

type SeguimientoItem = {
  id: string; tipo: string; numero: number | null; canal: string;
  titulo: string; nota: string | null; notaResultado: string | null;
  fechaProgramada: string; fechaCompletado: string | null; completado: boolean;
};

const CANAL_ICON_MAP: Record<string, string> = { whatsapp: "📱", llamada: "📞", reunion: "🤝" };

function SeguimientosPanel({ tratoId, etapa, tipoEvento, clienteNombre }: {
  tratoId: string;
  etapa: string;
  tipoEvento: string;
  clienteNombre: string;
}) {
  const confirm = useConfirm();
  const [segs, setSegs] = useState<SeguimientoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);
  const [notaRes, setNotaRes] = useState("");
  const [showForm, setShowForm] = useState(true);
  const [formTipoKey, setFormTipoKey] = useState("");
  const [formNota, setFormNota] = useState("");
  const [formCanal, setFormCanal] = useState("whatsapp");
  const [formFecha, setFormFecha] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().substring(0, 10); });

  const [saving, setSaving] = useState(false);
  const [expandedSeg, setExpandedSeg] = useState<string | null>(null);
  const [editandoSegId, setEditandoSegId] = useState<string | null>(null);
  const [guiasCustom, setGuiasCustom] = useState<Record<string, string>>({});
  const [editandoGuia, setEditandoGuia] = useState(false);
  const [guiaEditVal, setGuiaEditVal] = useState('');

  // Guide text computed from selected tipo key and client/event context
  const tiposDisponibles = SEGUIMIENTO_TIPOS[etapa] ?? [];
  const tipoSeleccionado = tiposDisponibles.find(t => t.key === formTipoKey) ?? null;
  const guiaTextoBase = tipoSeleccionado ? tipoSeleccionado.getGuia(clienteNombre, tipoEvento) : '';
  const guiaTexto = guiasCustom[formTipoKey] ?? guiaTextoBase;

  const loadSegs = useCallback(async () => {
    const r = await fetch(`/api/seguimientos?tratoId=${tratoId}`);
    const d = await r.json();
    setSegs((d.seguimientos ?? []).sort((a: SeguimientoItem, b: SeguimientoItem) =>
      new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime()
    ));
    setLoading(false);
  }, [tratoId]);

  useEffect(() => { loadSegs(); }, [loadSegs]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('msp_seguimiento_guias_v1');
      if (stored) setGuiasCustom(JSON.parse(stored));
    } catch {}
  }, []);

  async function marcarHecho(id: string) {
    await fetch(`/api/seguimientos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completado: true, notaResultado: notaRes || null }),
    });
    setMarcandoId(null);
    setNotaRes("");
    loadSegs();
  }

  async function crearSeguimiento() {
    if (!formTipoKey) return;
    setSaving(true);
    const fechaProgramada = new Date(`${formFecha}T10:00:00`);
    if (editandoSegId !== null) {
      const res = await fetch(`/api/seguimientos/${editandoSegId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: formTipoKey, canal: formCanal, fechaProgramada: fechaProgramada.toISOString(), nota: formNota || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSegs(prev => prev.map(s => s.id === editandoSegId ? { ...s, ...updated.seguimiento } : s));
      }
      setEditandoSegId(null);
    } else {
      await fetch("/api/seguimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tratoId, tipo: "manual", canal: formCanal, titulo: formTipoKey, nota: formNota || null, fechaProgramada: fechaProgramada.toISOString() }),
      });
      loadSegs();
    }
    setSaving(false);
    setShowForm(false);
    setFormTipoKey(""); setFormNota("");
  }

  async function eliminarSeg(id: string) {
    const ok = await confirm({ message: '¿Eliminar este seguimiento?', danger: true, confirmText: 'Eliminar' });
    if (!ok) return;
    await fetch(`/api/seguimientos/${id}`, { method: "DELETE" });
    loadSegs();
  }

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);

  function estadoBadge(seg: SeguimientoItem) {
    if (seg.completado) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-800/40">Hecho</span>;
    const fp = new Date(seg.fechaProgramada);
    if (fp < hoy) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/40">Vencido</span>;
    if (fp >= hoy && fp < manana) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/30">Hoy</span>;
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#555] border border-[#222]">Programado</span>;
  }

  function fmtFechaSeg(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  }

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider flex items-center gap-2">
            Seguimientos
            {segs.length > 0 && <span className="text-[#555] font-normal text-xs normal-case tracking-normal">({segs.filter(s => !s.completado).length} pendientes)</span>}
          </h2>
          <p className="text-[10px] text-gray-700 mt-0.5">Manual · se generan cuando el vendedor los crea</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/ventas/seguimientos" className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors">
            Ver todos →
          </Link>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] text-xs font-medium hover:bg-[#B3985B]/25 transition-colors"
            >
              + Agregar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-[#555] text-sm">Cargando…</p>
      ) : segs.length === 0 ? (
        <p className="text-[#444] text-sm mb-4">Sin seguimientos registrados</p>
      ) : (
        <div className="relative mb-4">
          <div className="absolute left-[9px] top-0 bottom-0 w-px bg-[#1e1e1e]" />
          <div className="space-y-3">
            {segs.map((seg) => {
              const isExpanded = expandedSeg === seg.id;
              const canalLabel: Record<string, string> = { whatsapp: 'WhatsApp', llamada: 'Llamada', reunion: 'Reunión' };
              return (
                <div key={seg.id} className="flex gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center z-10 ${seg.completado ? 'bg-green-500 border-green-500' : 'bg-[#111] border-[#333]'}`}>
                    {seg.completado && <span className="text-black text-[9px] font-bold">✓</span>}
                  </div>
                  <div className={`flex-1 pb-3 ${seg.completado ? 'opacity-60' : ''}`}>
                    <button className="w-full text-left" onClick={() => setExpandedSeg(isExpanded ? null : seg.id)}>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium flex-1">{seg.titulo}</p>
                        <span className="text-[10px] text-gray-600 shrink-0">{canalLabel[seg.canal] ?? seg.canal}</span>
                        <span className="text-[#444] text-[11px] shrink-0">{fmtFechaSeg(seg.fechaProgramada)}</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {seg.nota && <p className="text-[#666] text-xs">{seg.nota}</p>}
                        <div className="flex items-center gap-3 pt-1">
                          {!seg.completado && (
                            <>
                              <button onClick={() => { setEditandoSegId(seg.id); setFormTipoKey(seg.titulo); setFormCanal(seg.canal); setFormFecha(seg.fechaProgramada.slice(0, 10)); setFormNota(seg.nota ?? ''); setShowForm(true); }} className="text-[11px] text-[#555] hover:text-[#B3985B]">Editar</button>
                            </>
                          )}
                          <button onClick={() => eliminarSeg(seg.id)} className="text-[11px] text-[#333] hover:text-red-400">Eliminar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div id="seguimiento-form" className="border border-[#2a2a2a] rounded-xl p-4 bg-[#0d0d0d] space-y-3">
          {/* Tipo de seguimiento — chips visuales */}
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Tipo de seguimiento</p>
            <div className="grid grid-cols-1 gap-1.5">
              {tiposDisponibles.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFormTipoKey(t.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                    formTipoKey === t.key
                      ? "border-[#B3985B]/50 bg-[#B3985B]/10 text-[#B3985B]"
                      : "border-[#1e1e1e] bg-[#111] text-gray-400 hover:border-[#2a2a2a] hover:text-gray-300"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${formTipoKey === t.key ? "bg-[#B3985B]" : "bg-[#333]"}`} />
                  <span className="text-xs font-medium flex-1">{t.label}</span>
                  {formTipoKey === t.key && <span className="text-[#B3985B] text-[10px]">✓</span>}
                </button>
              ))}
              {tiposDisponibles.length === 0 && (
                <p className="text-[11px] text-gray-700 italic">No hay tipos predefinidos para esta etapa. Escribe el título manualmente.</p>
              )}
            </div>
          </div>
          {/* Campo título manual si no hay tipos o se quiere personalizar */}
          {(tiposDisponibles.length === 0 || formTipoKey === "") && (
            <input
              type="text"
              value={formTipoKey}
              onChange={e => setFormTipoKey(e.target.value)}
              placeholder="Título del seguimiento…"
              className="w-full bg-[#111] border border-[#222] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50"
            />
          )}
          {guiaTexto && (
            <div className="relative bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3">
              {editandoGuia ? (
                <div className="space-y-1">
                  <textarea value={guiaEditVal} onChange={e => setGuiaEditVal(e.target.value)} rows={4} className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-xs text-gray-300" />
                  <div className="flex gap-2">
                    <button onClick={() => { const updated = { ...guiasCustom, [formTipoKey]: guiaEditVal }; setGuiasCustom(updated); try { localStorage.setItem('msp_seguimiento_guias_v1', JSON.stringify(updated)); } catch {} setEditandoGuia(false); }} className="text-[10px] text-gray-400">Guardar</button>
                    <button onClick={() => setEditandoGuia(false)} className="text-[10px] text-gray-700 hover:text-gray-500">Cancelar</button>
                    {guiasCustom[formTipoKey] && (
                      <button onClick={() => { const updated = { ...guiasCustom }; delete updated[formTipoKey]; setGuiasCustom(updated); try { localStorage.setItem('msp_seguimiento_guias_v1', JSON.stringify(updated)); } catch {} setEditandoGuia(false); }} className="text-[10px] text-gray-700 hover:text-red-400 ml-auto">Restablecer</button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 group">
                  <p className="text-xs text-gray-500 flex-1 whitespace-pre-wrap leading-relaxed">{guiaTexto}</p>
                  <button onClick={() => { setGuiaEditVal(guiasCustom[formTipoKey] ?? guiaTextoBase ?? ''); setEditandoGuia(true); }} className="text-[10px] text-gray-700 group-hover:text-gray-500">editar</button>
                </div>
              )}
              {!editandoGuia && (
                <button type="button" onClick={() => navigator.clipboard.writeText(guiaTexto)} className="mt-2 text-[10px] text-gray-600 hover:text-[#B3985B] transition-colors">
                  Copiar texto
                </button>
              )}
            </div>
          )}

          {/* Canal */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">Canal</label>
            <div className="flex gap-2">
              {(["whatsapp", "llamada", "reunion"] as const).map(c => (
                <button key={c} type="button" onClick={() => setFormCanal(c)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${formCanal === c ? 'bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]' : 'border-[#222] text-gray-600 hover:border-[#333] hover:text-gray-400'}`}>
                  {c === 'whatsapp' ? 'WhatsApp' : c === 'llamada' ? 'Llamada' : 'Reunión'}
                </button>
              ))}
            </div>
          </div>

          <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)}
            className="w-full bg-[#111] border border-[#222] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50" />

          <textarea value={formNota} onChange={e => setFormNota(e.target.value)} rows={2}
            placeholder="Contexto, acuerdos o resultado..."
            className="w-full bg-[#111] border border-[#222] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/50 resize-none placeholder-[#444]" />

          <div className="flex gap-2 pt-1">
            <button onClick={crearSeguimiento} disabled={saving || !formTipoKey}
              className="flex-1 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? 'Guardando...' : editandoSegId ? 'Guardar cambios' : 'Agregar seguimiento'}
            </button>
            <button onClick={() => { setShowForm(false); setFormTipoKey(''); setFormNota(''); setEditandoSegId(null); }}
              className="px-4 py-2 rounded-lg border border-[#222] text-gray-500 text-sm hover:border-[#333] hover:text-gray-400 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {!showForm && segs.length > 0 && (
        <button onClick={() => setShowForm(true)}
          className="text-xs text-[#555] hover:text-[#B3985B] transition-colors border border-dashed border-[#222] rounded-lg w-full py-2 hover:border-[#B3985B]/40">
          + Agregar nota o seguimiento manual
        </button>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TratoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { celebrate, Toast: CelebrationToastEl } = useCelebration();
  const [trato, setTrato] = useState<Trato | null>(null);
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Partial<Trato>>({});
  // Modal razón de pérdida
  const [modalPerdida, setModalPerdida] = useState(false);
  const [razonPerdida, setRazonPerdida] = useState("");
  const [notasPerdida, setNotasPerdida] = useState("");

  // Archivos del briefing
  const [archivos, setArchivos] = useState<TratoArchivo[]>([]);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);

  // Formulario para prospecto
  const [generandoToken, setGenerandoToken] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [tipoEventoUnlocked, setTipoEventoUnlocked] = useState(false);
  // Modo de descubrimiento: "VENDEDOR" | "CLIENTE" (inferido del formToken, editable)
  const [modoDescubrimiento, setModoDescubrimiento] = useState<"VENDEDOR" | "CLIENTE">("VENDEDOR");
  // Gate primario: muestra selector de canal dentro del gate
  const [showCanales, setShowCanales] = useState(false);

  // Nurturing state
  type NurturingLogEntry = { fecha: string; etapa: string; templateId: string; templateLabel: string };
  type NurturingData = { etapa: string; temperatura: string; log: NurturingLogEntry[]; notas?: Record<string, string> };
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
  const [discoveryExpanded, setDiscoveryExpanded] = useState(!trato?.descubrimientoCompleto);

  // Scouting state
  const [scoutingForm, setScoutingForm] = useState({
    nombreVenue: "", direccion: "", contactoVenue: "", telefonoVenue: "",
    largo: "", ancho: "", alturaMaxima: "",
    capacidadPersonas: "",
    accesoVehicular: "", puntoDescarga: "",
    voltajeDisponible: "", amperajeTotalDisponible: "", fases: "", ubicacionTablero: "",
    restriccionDecibeles: "", restriccionHorarioAcceso: "", restriccionInstalacion: "",
    estadoGeneral: "", notasScouting: "",
    // Renta logistics
    rentaPiso: "", rentaHayElevador: "", rentaHorarioEntrega: "", rentaHorarioRecoleccion: "",
    rentaZonaCarga: "", rentaAccesoVehicular: "", rentaNotasEntrega: "",
    // Campos libres por sección
    libreVenue: "",
    libreDimensiones: "",
    libreElectrico: "",
    libreAcceso: "",
    libreRestricciones: "",
  });
  const [savingScouting, setSavingScouting] = useState(false);
  const [scoutingTab, setScoutingTab] = useState<"form" | "resumen">("form");
  const [scoutingVisible, setScoutingVisible] = useState(false);
  const [scoutingAplica, setScoutingAplica] = useState<boolean | null>(null);
  const [briefAplica, setBriefAplica] = useState<boolean | null>(null);
  const [linkDraft, setLinkDraft] = useState({ label: '', url: '' });
  const [linkUrlError, setLinkUrlError] = useState('');
  const [levantamientoCreado, setLevantamientoCreado] = useState(false);
  // Trade state
  const [tradeCalificado, setTradeCalificado] = useState(false);
  const [tradeNivel, setTradeNivel] = useState<number | null>(null);
  const [savingTrade, setSavingTrade] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [skipGate, setSkipGate] = useState(false);
  // Cambiar cliente del trato
  const [cambiarCliente, setCambiarCliente] = useState(false);
  const [clientesOpciones, setClientesOpciones] = useState<{ value: string; label: string }[]>([]);
  const [savingCliente, setSavingCliente] = useState(false);
  const autoSaveDiscTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveScoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Paso activo del wizard de descubrimiento (persisted in localStorage)
  const [pasoActivo, setPasoActivo] = useState(1);
  const [creandoCotizacion, setCreandoCotizacion] = useState(false);
  const [eliminandoCotizacion, setEliminandoCotizacion] = useState<string | null>(null);

  // Discovery state
  const [discForm, setDiscForm] = useState({
    tipoEvento: "MUSICAL",
    nombreEvento: "",
    fechaEventoEstimada: "",
    lugarEstimado: "",
    asistentesEstimados: "",
    diasServicio: "",
    presupuestoEstimado: "",
    tipoServicio: "",
    ideasReferencias: "",
    notas: "",
    serviciosInteres: [] as string[],
    familyAndFriends: false,
    realizarRender: false,
    tradeAplica: false,
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
    horaTerminoMontaje: "",
    contactoVenueNombre: "",
    contactoVenueTelefono: "",
    rentaNotas: "",
  });

  // Track whether initial load is done to avoid auto-saving on first render
  const discLoaded = useRef(false);
  const scoutLoaded = useRef(false);

  useEffect(() => {
    if (!discLoaded.current) { discLoaded.current = true; return; }
    autoSaveDisc(discForm);
  }, [discForm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (discForm.tipoServicio === "RENTA") setBriefAplica(false);
  }, [discForm.tipoServicio]); // eslint-disable-line react-hooks/exhaustive-deps

  const PASOS_DISCOVERY = discForm.tipoServicio === "RENTA" ? PASOS_DISCOVERY_RENTA : PASOS_DISCOVERY_FULL;

  useEffect(() => {
    if (!scoutLoaded.current) { scoutLoaded.current = true; return; }
    autoSaveScouting(scoutingForm);
  }, [scoutingForm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist active step in localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`trato-paso-${id}`);
    if (saved) setPasoActivo(parseInt(saved) || 1);
  }, [id]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(`trato-paso-${id}`, String(pasoActivo));
  }, [pasoActivo, id]);

  useEffect(() => {
    fetch("/api/usuarios-activos").then(r => r.json()).then(d => setUsuarios(d.usuarios ?? []));
  }, []);

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
          setArchivos(t.archivos ?? []);
          // Pre-fill Trade state
          setTradeCalificado(t.tradeCalificado ?? false);
          setTradeNivel(t.tradeNivel ?? null);
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
                // Mark as created if it exists and is not cancelled
                if (levantamiento.estadoLevantamiento !== 'CANCELADO') {
                  setLevantamientoCreado(true);
                }
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
            asistentesEstimados: t.asistentesEstimados?.toString() ?? "",
            diasServicio: t.diasServicio?.toString() ?? "",
            presupuestoEstimado: t.presupuestoEstimado?.toString() ?? "",
            tipoServicio: t.tipoServicio ?? "",
            ideasReferencias: t.tipoServicio !== "RENTA" ? (t.ideasReferencias ?? "") : "",
            notas: t.notas ?? "",
            serviciosInteres: t.serviciosInteres ? JSON.parse(t.serviciosInteres) : [],
            familyAndFriends: t.familyAndFriends ?? false,
            realizarRender: t.realizarRender ?? false,
            tradeAplica: t.tradeCalificado ?? false,
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
            horaTerminoMontaje:     t.horaTerminoMontaje ?? "",
            contactoVenueNombre:    t.contactoVenueNombre ?? "",
            contactoVenueTelefono:  t.contactoVenueTelefono ?? "",
            rentaNotas:             rentaData.notas ?? "",
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
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return null;
    }
    return res.json();
  }

  async function seleccionarCanal(canal: string) {
    setSaving(true);
    const d = await patch({ canalAtencion: canal });
    if (d) setTrato(prev => prev ? { ...prev, canalAtencion: d.trato.canalAtencion } : prev);
    setSaving(false);
  }

  async function crearNuevaCotizacion() {
    if (!trato) return;
    const nombre = window.prompt(
      "Nombre del evento (puedes cambiarlo después):",
      `Evento ${trato.cotizaciones.filter(c => !c.grupoId || c.opcionLetra === "A").length + 1}`
    );
    if (nombre === null) return; // canceló
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

  async function eliminarCotizacion(cotId: string, numCot: string) {
    if (!confirm(`¿Eliminar ${numCot}? Esta acción no se puede deshacer.`)) return;
    setEliminandoCotizacion(cotId);
    try {
      const res = await fetch(`/api/cotizaciones/${cotId}`, { method: "DELETE" });
      if (res.ok) {
        setTrato(prev => prev ? { ...prev, cotizaciones: prev.cotizaciones.filter(c => c.id !== cotId) } : prev);
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Error al eliminar");
      }
    } finally {
      setEliminandoCotizacion(null);
    }
  }

  async function guardarNurturing(data: NurturingData, extra?: Record<string, unknown>) {
    setSavingNurturing(true);
    const d = await patch({ nurturingData: JSON.stringify(data), ...extra });
    if (d) setTrato(prev => prev ? { ...prev, nurturingData: JSON.stringify(data), ...extra } : prev);
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

  function addLink() {
    const url = linkDraft.url.trim();
    const label = linkDraft.label.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setLinkUrlError('URL inválida — debe empezar con http:// o https://');
      return;
    }
    setLinkUrlError('');
    const current = parseLinks(discForm.ideasReferencias);
    const next = [...current, { label: label || url, url }];
    setDiscForm(p => ({ ...p, ideasReferencias: JSON.stringify(next) }));
    setLinkDraft({ label: '', url: '' });
  }

  function removeLink(idx: number) {
    const current = parseLinks(discForm.ideasReferencias);
    const next = current.filter((_, i) => i !== idx);
    setDiscForm(p => ({ ...p, ideasReferencias: next.length > 0 ? JSON.stringify(next) : null as unknown as string }));
  }

  async function guardarDescubrimiento(completar = false) {
    setSaving(true);
    const isRenta = discForm.tipoServicio === "RENTA";
    const payload: Record<string, unknown> = {
      tipoEvento: discForm.tipoEvento,
      nombreEvento: discForm.nombreEvento || null,
      fechaEventoEstimada: discForm.fechaEventoEstimada === "por-definir" ? null : (discForm.fechaEventoEstimada || null),
      lugarEstimado: discForm.lugarEstimado === "por-definir" ? "Por definir" : (discForm.lugarEstimado || null),
      asistentesEstimados: discForm.asistentesEstimados ? parseInt(discForm.asistentesEstimados) : null,
      diasServicio: discForm.diasServicio ? parseInt(discForm.diasServicio) : null,
      presupuestoEstimado: discForm.presupuestoEstimado ? parseFloat(discForm.presupuestoEstimado) : null,
      tipoServicio: discForm.tipoServicio || null,
      notas: discForm.notas || null,
      familyAndFriends: discForm.familyAndFriends,
      realizarRender: discForm.realizarRender,
      tradeCalificado: discForm.tradeAplica,
      horaInicioEvento:     discForm.horaInicioEvento || null,
      horaFinEvento:        discForm.horaFinEvento || null,
      duracionMontajeHrs:   discForm.duracionMontajeHrs ? parseFloat(discForm.duracionMontajeHrs) : null,
      ventanaMontajeInicio: discForm.ventanaMontajeInicio || null,
      ventanaMontajeFin:    discForm.ventanaMontajeFin || null,
      horaTerminoMontaje:   discForm.horaTerminoMontaje || null,
      contactoVenueNombre:  discForm.contactoVenueNombre || null,
      contactoVenueTelefono:discForm.contactoVenueTelefono || null,
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
            notas:              discForm.rentaNotas || null,
          })
        : (discForm.ideasReferencias || null),
    };
    if (completar) {
      payload.descubrimientoCompleto = true;
      payload.etapa = "OPORTUNIDAD";
    }
    const d = await patch(payload);
    if (d) setTrato(prev => prev ? { ...prev, ...d.trato } : prev);
    setSaving(false);
  }

  async function saveScouting() {
    setSavingScouting(true);
    const d = await patch({ scoutingData: JSON.stringify(scoutingForm) });
    if (d) setTrato(prev => prev ? { ...prev, scoutingData: JSON.stringify(scoutingForm) } : prev);
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
        asistentesEstimados: form.asistentesEstimados ? parseInt(form.asistentesEstimados) : null,
        diasServicio: form.diasServicio ? parseInt(form.diasServicio) : null,
        presupuestoEstimado: form.presupuestoEstimado ? parseFloat(form.presupuestoEstimado) : null,
        tipoServicio: form.tipoServicio || null,
        notas: form.notas || null,
        familyAndFriends: form.familyAndFriends,
        realizarRender: form.realizarRender,
        tradeCalificado: form.tradeAplica,
        horaInicioEvento: form.horaInicioEvento || null,
        horaFinEvento: form.horaFinEvento || null,
        duracionMontajeHrs: form.duracionMontajeHrs ? parseFloat(form.duracionMontajeHrs) : null,
        ventanaMontajeInicio: form.ventanaMontajeInicio || null,
        ventanaMontajeFin: form.ventanaMontajeFin || null,
        horaTerminoMontaje: form.horaTerminoMontaje || null,
        contactoVenueNombre: form.contactoVenueNombre || null,
        contactoVenueTelefono: form.contactoVenueTelefono || null,
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
              notas: form.rentaNotas || null,
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
    const res = await fetch(`/api/levantamiento-contenido/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...briefForm,
        colaboradoresCamara: briefForm.colaboradoresCamara === "SI" ? true : briefForm.colaboradoresCamara === "NO" ? false : null,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSavingBrief(false);
      return;
    }
    setBriefGuardado(true);
    setSavingBrief(false);
  }

  async function cambiarEtapa(etapa: string) {
    if (etapa === "VENTA_PERDIDA") { setModalPerdida(true); return; }
    setSaving(true);
    const d = await patch({ etapa });
    if (d) {
      setTrato(prev => prev ? { ...prev, etapa: d.trato.etapa, etapaCambiadaEn: d.trato.etapaCambiadaEn ?? null } : prev);
      if (etapa === "VENTA_CERRADA") celebrate("venta");
    }
    setSaving(false);
  }

  async function confirmarPerdida() {
    setSaving(true);
    const motivoPerdida = [razonPerdida, notasPerdida].filter(Boolean).join(" — ");
    const d = await patch({ etapa: "VENTA_PERDIDA", motivoPerdida: motivoPerdida || null });
    if (d) {
      setTrato(prev => prev ? { ...prev, etapa: "VENTA_PERDIDA", motivoPerdida: d.trato.motivoPerdida, etapaCambiadaEn: d.trato.etapaCambiadaEn ?? null } : prev);
      setModalPerdida(false);
      setRazonPerdida("");
      setNotasPerdida("");
    }
    setSaving(false);
  }

  async function guardar() {
    setSaving(true);
    const d = await patch(form as Record<string, unknown>);
    if (d) {
      setTrato(prev => prev ? { ...prev, ...d.trato } : prev);
      setEditando(false);
    }
    setSaving(false);
  }

  async function abrirCambiarCliente() {
    if (clientesOpciones.length === 0) {
      const r = await fetch("/api/clientes");
      const d = await r.json();
      setClientesOpciones(
        (d.clientes ?? []).map((c: { id: string; nombre: string; empresa: string | null }) => ({
          value: c.id,
          label: c.empresa ? `${c.nombre} — ${c.empresa}` : c.nombre,
        }))
      );
    }
    setCambiarCliente(true);
  }

  async function confirmarCambioCliente(nuevoClienteId: string) {
    if (!nuevoClienteId || nuevoClienteId === trato?.cliente.id) {
      setCambiarCliente(false);
      return;
    }
    setSavingCliente(true);
    const res = await fetch(`/api/tratos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId: nuevoClienteId }),
    });
    if (res.ok) {
      // Reload full trato to get updated cliente object
      const r2 = await fetch(`/api/tratos/${id}`);
      const d2 = await r2.json();
      if (d2.trato) setTrato(d2.trato);
      toast.success("Cliente actualizado");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al cambiar cliente");
    }
    setSavingCliente(false);
    setCambiarCliente(false);
  }

  async function generarBriefToken() {
    const res = await fetch(`/api/tratos/${id}/brief`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setTrato(prev => prev ? { ...prev, briefToken: data.token, briefRecibidoEn: null } : prev);
  }

  async function generarFormToken() {
    setGenerandoToken(true);
    const res = await fetch(`/api/tratos/${id}/form-token`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Error al guardar");
      setGenerandoToken(false);
      return;
    }
    const data = await res.json();
    setTrato(prev => prev ? { ...prev, formToken: data.token, formEstado: "NO_ENVIADO" } : prev);
    setGenerandoToken(false);
  }

  async function marcarFormEnviado() {
    const res = await fetch(`/api/tratos/${id}/form-token`, { method: "PATCH" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
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
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("tipo", tipo);
        fd.append("nombre", file.name);
        const res = await fetch(`/api/tratos/${id}/archivos`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Error al subir archivo");
          continue;
        }
        if (data.archivo) setArchivos(prev => [...prev, data.archivo]);
      }
    } catch {
      toast.error("Error de conexión al subir archivo");
    } finally {
      setUploadingTipo(null);
      e.target.value = "";
    }
  }

  async function eliminarArchivo(archivoId: string) {
    const res = await fetch(`/api/tratos/${id}/archivos/${archivoId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
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
  const serviciosSel: string[] = trato.serviciosInteres ? JSON.parse(trato.serviciosInteres) : [];
  const canalInfo = getCanal(trato.canalAtencion ?? "");

  const formUrl = trato.formToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/f/${trato.formToken}` : "";
  const briefUrl = trato.briefToken ? `${typeof window !== "undefined" ? window.location.origin : "https://mainstagepro.vercel.app"}/brief/${trato.briefToken}` : "";
  const _telefono = trato.cliente.telefono?.replace(/\D/g, "");
  const waUrl = _telefono ? `https://wa.me/52${_telefono}?text=${encodeURIComponent(`Hola ${trato.cliente.nombre.split(" ")[0]}, para prepararte una propuesta personalizada necesito que completes este breve formulario: ${formUrl}`)}` : null;

  const waLink = (() => {
    const tel = trato.cliente.telefono?.replace(/^p:/i, '').replace(/[^\d+]/g, '');
    if (!tel) return null;
    const msg = getWaMensajePrimerContacto(trato.cliente.nombre, trato.tipoEvento);
    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
  })();

  const telefonoLimpio = trato.cliente.telefono?.replace(/^p:/i, '').trim() ?? null;

  const tiempoSinContacto = (() => {
    const ref = trato.fechaProximaAccion
      ? new Date(trato.fechaProximaAccion)
      : new Date(trato.createdAt);
    const diff = Date.now() - ref.getTime();
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);
    if (horas < 1) return 'Hace menos de 1h';
    if (horas < 24) return `Hace ${horas}h`;
    if (dias === 1) return 'Hace 1 día';
    return `Hace ${dias} días`;
  })();

  const notaInicial = (() => {
    try { const n = JSON.parse(trato.nurturingData ?? '{}'); return n.notaInicial || null; } catch { return null; }
  })();

  const campanaOrigen = (() => {
    try { const n = JSON.parse(trato.nurturingData ?? '{}'); return n.campana || null; } catch { return null; }
  })();

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto pb-12">
      <div className="mb-2"><BackButton /></div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mt-4">
      {/* ── LEFT COLUMN ── */}
      <div className="space-y-4 min-w-0">

      {/* ── Compact Header ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${ETAPA_COLORS[trato.etapa] ?? 'bg-gray-800 text-gray-400'}`}>
                {ETAPA_LABELS[trato.etapa] ?? trato.etapa}
              </span>
              <span className="text-[10px] text-gray-600">
                {trato.tipoEvento}
              </span>
              {trato.etapa === 'LEAD' && (
                <span className="text-[10px] text-amber-500/70">{tiempoSinContacto}</span>
              )}
              {trato.descubrimientoCompleto && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#B3985B]/20 text-[#B3985B]">✓ Descubrimiento</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white truncate">{trato.cliente.nombre}</h1>
            {trato.cliente.empresa && <p className="text-gray-500 text-sm">{trato.cliente.empresa}</p>}
            {trato.nombreEvento && <p className="text-gray-400 text-sm italic mt-0.5">"{trato.nombreEvento}"</p>}
            {notaInicial && <p className="text-gray-600 text-xs mt-1.5 line-clamp-2">{notaInicial}</p>}
            {campanaOrigen && <p className="text-gray-700 text-[10px] mt-1">📣 {campanaOrigen}</p>}
          </div>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-900/20 border border-green-800/30 text-green-500 hover:bg-green-900/30 transition-colors text-xs font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
              </svg>
              WhatsApp
            </a>
          )}
        </div>
        <div className="flex items-center gap-3 pt-3 border-t border-[#1a1a1a] flex-wrap">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider shrink-0">Etapa:</span>
          <select
            value={trato.etapa}
            disabled={saving}
            onChange={e => cambiarEtapa(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#B3985B] hover:border-[#333] transition-colors cursor-pointer disabled:opacity-40"
          >
            {ETAPAS.map(e => (
              <option key={e} value={e}>{ETAPA_LABELS[e] ?? e}</option>
            ))}
          </select>
          {trato.etapa === 'LEAD' && (
            <button
              onClick={() => cambiarEtapa('DESCUBRIMIENTO')}
              disabled={saving}
              className="px-3 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors disabled:opacity-40"
            >
              Convertir a oportunidad →
            </button>
          )}
          <button
            onClick={crearNuevaCotizacion}
            disabled={creandoCotizacion}
            className="ml-auto px-3 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors disabled:opacity-40"
          >
            {creandoCotizacion ? "Creando..." : "+ Nueva cotización"}
          </button>
        </div>
      </div>

      {/* Cotizaciones — Vista multi-evento */}
      {trato._canViewFinances !== false && (
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Cotizaciones del proyecto</h2>
            <p className="text-[10px] text-gray-600 mt-0.5">{trato.cotizaciones.length} cotización{trato.cotizaciones.length !== 1 ? "es" : ""} · {fmt(trato.cotizaciones.reduce((s, c) => s + c.granTotal, 0))} total</p>
          </div>
          <div className="flex items-center gap-2">
            {trato.cotizaciones.length > 0 && (
              <>
                <Link
                  href={`/contratos/${trato.id}`}
                  target="_blank"
                  className="text-xs text-gray-500 hover:text-[#B3985B] hover:underline transition-colors"
                >
                  Contrato →
                </Link>
                {trato.cotizaciones.length >= 2 && (
                  <Link
                    href={`/cotizaciones/${trato.cotizaciones[0].id}/resumen-global`}
                    className="text-xs text-[#B3985B]/70 hover:text-[#B3985B] border border-[#B3985B]/20 hover:border-[#B3985B]/50 rounded-md px-2 py-1 transition-colors"
                  >
                    Resumen global →
                  </Link>
                )}
              </>
            )}
            <button
              onClick={crearNuevaCotizacion}
              disabled={creandoCotizacion}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] text-xs font-semibold rounded-lg hover:bg-[#B3985B]/20 transition-colors disabled:opacity-40"
            >
              {creandoCotizacion ? "Creando..." : "+ Nuevo evento"}
            </button>
          </div>
        </div>

        {trato.cotizaciones.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-sm mb-3">Sin cotizaciones aún.</p>
            <button
              onClick={crearNuevaCotizacion}
              disabled={creandoCotizacion}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] text-sm font-semibold rounded-lg hover:bg-[#B3985B]/20 transition-colors disabled:opacity-40"
            >
              + Crear primera cotización del proyecto
            </button>
          </div>
        ) : (() => {
          // Agrupar cotizaciones por grupoId (o por id si no tiene grupo)
          const grupos = new Map<string, typeof trato.cotizaciones>();
          for (const c of trato.cotizaciones) {
            const key = c.grupoId ?? c.id;
            if (!grupos.has(key)) grupos.set(key, []);
            grupos.get(key)!.push(c);
          }
          return (
            <div className="space-y-3">
              {Array.from(grupos.entries()).map(([grupoKey, opciones], gi) => {
                // Ordenar: A primero
                const ordenadas = [...opciones].sort((a, b) => a.opcionLetra.localeCompare(b.opcionLetra));
                const principal = ordenadas.find(o => o.opcionLetra === "A") ?? ordenadas[0];
                const tieneOpciones = ordenadas.length > 1;
                const eventoLabel = principal.nombreCotizacion || principal.nombreEvento || `Evento ${gi + 1}`;
                const fechaLabel = principal.fechaEvento
                  ? new Date(principal.fechaEvento).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })
                  : null;

                return (
                  <div key={grupoKey} className="border border-[#1e1e1e] rounded-xl overflow-hidden">
                    {/* Header del evento */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#151515]">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{eventoLabel}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {fechaLabel && (
                            <span className="text-gray-500 text-xs">📅 {fechaLabel}</span>
                          )}
                          {principal.lugarEvento && (
                            <span className="text-gray-600 text-xs truncate max-w-[180px]">· 📍 {principal.lugarEvento}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white text-sm font-semibold tabular-nums">
                          {fmt(Math.max(...ordenadas.map(o => o.granTotal)))}
                        </p>
                        {tieneOpciones && (
                          <p className="text-gray-600 text-[10px]">{ordenadas.length} opciones</p>
                        )}
                      </div>
                    </div>

                    {/* Opciones A / B / C... */}
                    <div className="divide-y divide-[#1a1a1a]">
                      {ordenadas.map(op => (
                        <div key={op.id} className="flex items-center hover:bg-[#1a1a1a] transition-colors group">
                          <Link
                            href={`/cotizaciones/${op.id}`}
                            className="flex flex-1 items-center justify-between px-4 py-2.5 min-w-0"
                          >
                            <div className="flex items-center gap-2.5">
                              {tieneOpciones && (
                                <span className="text-[10px] font-bold text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/30 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                  {op.opcionLetra}
                                </span>
                              )}
                              <span className="text-gray-500 text-xs font-mono">{op.numeroCotizacion}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_COT_COLORS[op.estado] || "bg-gray-700 text-gray-300"}`}>
                                {op.estado}
                              </span>
                              {op.proyecto && (
                                <span className="text-[10px] text-green-500 bg-green-900/20 border border-green-800/30 px-1.5 py-0.5 rounded-full">proyecto</span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-gray-300 text-xs font-medium tabular-nums">{fmt(op.granTotal)}</p>
                            </div>
                          </Link>
                          <button
                            onClick={() => eliminarCotizacion(op.id, op.numeroCotizacion)}
                            disabled={eliminandoCotizacion === op.id}
                            className="opacity-0 group-hover:opacity-100 mr-3 p-1.5 rounded text-red-500/60 hover:text-red-400 hover:bg-red-900/20 transition-all disabled:opacity-30 shrink-0"
                            title="Eliminar cotización"
                          >
                            {eliminandoCotizacion === op.id ? "..." : "🗑"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Totales globales */}
              {trato.cotizaciones.length > 1 && (() => {
                // Solo tomar el "mejor" de cada grupo para el total
                const grupos2 = new Map<string, typeof trato.cotizaciones[0]>();
                for (const c of trato.cotizaciones) {
                  const key = c.grupoId ?? c.id;
                  if (!grupos2.has(key)) grupos2.set(key, c);
                }
                const granTotal = Array.from(grupos2.values()).reduce((s, c) => s + c.granTotal, 0);
                return (
                  <div className="border-t border-[#222] pt-3 flex items-center justify-between">
                    <p className="text-xs text-gray-500">Total proyecto ({grupos2.size} evento{grupos2.size !== 1 ? "s" : ""})</p>
                    <p className="text-[#B3985B] font-bold text-base tabular-nums">{fmt(granTotal)}</p>
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>
      )}

      {/* ══ GATE PRIMARIO ══ */}
      {!skipGate && !trato.canalAtencion && trato.tipoProspecto !== "NURTURING" && (
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
                    if (d) setTrato(prev => prev ? { ...prev, tipoProspecto: d.trato.tipoProspecto, tipoLead: "OUTBOUND", origenLead: "PROSPECCION" } : prev);
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
          <div className="text-center mt-6 pt-4 border-t border-[#1a1a1a]">
            <button onClick={() => setSkipGate(true)} className="text-gray-600 hover:text-gray-400 text-xs transition-colors underline underline-offset-2">
              Saltar este paso y cotizar directamente →
            </button>
          </div>
        </div>
      )}

      {/* ── Tipo de prospecto (read-only badge) ── */}
      {(trato.canalAtencion || trato.tipoProspecto === "NURTURING") && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-[#1e1e1e] rounded-lg">
          {trato.tipoProspecto === "NURTURING" ? (
            <span className="text-xs text-emerald-400">🌱 Prospecto en frío</span>
          ) : (
            <span className="text-xs text-[#B3985B]">Tiene necesidad concreta</span>
          )}
          <button
            onClick={async () => {
              const next = trato.tipoProspecto === "NURTURING" ? "ACTIVO" : "NURTURING";
              const d = await patch({ tipoProspecto: next });
              if (d) setTrato(p => p ? { ...p, tipoProspecto: d.trato.tipoProspecto } : p);
            }}
            className="ml-auto text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            cambiar
          </button>
        </div>
      )}

      {trato.etapa === "VENTA_PERDIDA" && trato.motivoPerdida && (
        <p className="text-xs text-red-400/80 bg-red-900/10 border border-red-900/30 rounded-xl px-4 py-2">
          Motivo pérdida: {trato.motivoPerdida}
        </p>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CONFIRMACIÓN OPERATIVA DEL EVENTO
      ══════════════════════════════════════════════════════════════════════ */}
      {trato.etapa !== 'VENTA_PERDIDA' && (() => {
        // Ya confirmado
        if (trato.confirmadaEn) {
          const fechaConf = new Date(trato.confirmadaEn).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
          const metodoLabel: Record<string, string> = { VERBAL: 'Verbal', ANTICIPO: 'Anticipo recibido', CONTRATO: 'Contrato firmado', OTRO: 'Otro' };
          return (
            <div className="bg-[#0d0d0d] border border-emerald-800/40 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-900/30 flex items-center justify-center text-base">✅</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">Evento confirmado</p>
                  <p className="text-emerald-400/70 text-xs">{fechaConf} · {metodoLabel[trato.metodoConfirmacion ?? ''] ?? trato.metodoConfirmacion}</p>
                  {trato.notaConfirmacion && <p className="text-[#555] text-xs mt-0.5">{trato.notaConfirmacion}</p>}
                </div>
              </div>
            </div>
          );
        }

        // Aún no confirmado — solo mostrar si hay fecha de evento estimada
        if (!trato.fechaEventoEstimada) return null;

        return (
          <ConfirmarEventoPanel
            tratoId={trato.id}
            onConfirmado={(data) => setTrato(p => p ? { ...p, ...data } : p)}
          />
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          BRIEF DEL CLIENTE
      ══════════════════════════════════════════════════════════════════════ */}
      {trato.tipoProspecto === "ACTIVO" && (() => {
        // Estado B — brief recibido
        if (trato.briefRecibidoEn) {
          const fecha = new Date(trato.briefRecibidoEn).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
          return (
            <div className="bg-[#0d0d0d] border border-green-800/40 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center text-lg">✅</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">Brief recibido</p>
                  <p className="text-green-400/70 text-xs">El cliente completó el formulario el {fecha}</p>
                </div>
                <button
                  onClick={generarBriefToken}
                  className="text-[10px] text-[#555] hover:text-white transition-colors shrink-0"
                >
                  Regenerar
                </button>
              </div>
            </div>
          );
        }

        // Estado A — sin brief o pendiente
        const nombre1 = trato.cliente.nombre.split(" ")[0];
        const waBrief = _telefono && briefUrl
          ? `https://wa.me/52${_telefono}?text=${encodeURIComponent(`Hola ${nombre1} 👋, para prepararte la mejor propuesta para tu evento necesito que llenes este breve formulario (toma menos de 2 minutos): ${briefUrl}`)}`
          : null;

        return (
          <div className="bg-[#0d0d0d] border border-[#B3985B]/20 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#B3985B]/10 flex items-center justify-center text-base">📋</div>
                <div>
                  <p className="text-white text-sm font-semibold">Brief del cliente</p>
                  <p className="text-[#555] text-xs">Pide al cliente que comparta los detalles de su evento</p>
                </div>
              </div>
            </div>

            {briefUrl ? (
              <div className="space-y-2">
                {/* Link copiable */}
                <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-lg px-3 py-2">
                  <span className="text-[#666] text-xs truncate flex-1 font-mono">{briefUrl}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(briefUrl); }}
                    className="text-[#B3985B] text-xs hover:underline shrink-0"
                  >
                    Copiar
                  </button>
                </div>
                {/* Botones de acción */}
                <div className="flex gap-2">
                  {waBrief && (
                    <a
                      href={waBrief}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-green-900/20 border border-green-800/40 text-green-400 hover:border-green-700 transition-colors"
                    >
                      <span>📱</span> Enviar por WhatsApp
                    </a>
                  )}
                  <button
                    onClick={generarBriefToken}
                    className="text-xs text-[#555] hover:text-white transition-colors px-2"
                  >
                    Regenerar link
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={generarBriefToken}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/20 transition-colors"
              >
                + Generar link de brief
              </button>
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


      {/* ── Lead rápido (inbound) — vista simple ── */}
      {trato.tipoProspecto === "NURTURING" && trato.origenLead !== "PROSPECCION" && (
        <div className="bg-[#0d0d0d] border border-[#B3985B]/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#B3985B]/10 flex items-center justify-center text-lg">⚡</div>
            <div>
              <p className="text-white font-bold text-base">Lead registrado</p>
              <p className="text-gray-500 text-xs">Inbound · {ORIGEN_LABELS[trato.origenLead] ?? trato.origenLead}</p>
            </div>
          </div>
          <div className="mb-3 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
            <LoQueBuscaField
              value={trato.nombreEvento ?? ''}
              onSave={(val) => patch({ nombreEvento: val }).then(d => { if (d) setTrato(prev => prev ? { ...prev, nombreEvento: d.trato.nombreEvento } : prev); })}
            />
          </div>
          {trato.fechaEventoEstimada && (
            <div className="mb-3 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Fecha del evento</p>
              <p className="text-sm text-white">{fmtFechaEvento(trato.fechaEventoEstimada)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Nurturing — Prospección en frío (outbound) ── */}
      {trato.tipoProspecto === "NURTURING" && trato.origenLead === "PROSPECCION" && (() => {
        const etapaKey = nurturing.etapa as keyof typeof NURTURING_PLAYBOOK;
        const playbook = NURTURING_PLAYBOOK[etapaKey];
        const tipoEvKey = (trato.tipoEvento ?? "OTRO") as keyof NPlaybookEtapa["templates"];
        const tplsEvento = playbook?.templates[tipoEvKey] ?? playbook?.templates["OTRO"] ?? [];
        const nombre = trato.cliente.nombre.split(" ")[0];
        const ctx = { evento: trato.nombreEvento, fecha: trato.fechaEventoEstimada };
        const tel = trato.cliente.telefono?.replace(/\D/g, "");
        const num = tel ? (tel.startsWith("52") ? tel : `52${tel}`) : null;

        // Presentación principal según tipo de evento (para "Qué compartir")
        const origin = typeof window !== "undefined" ? window.location.origin : "https://mainstagepro.vercel.app";
        const COPY_ICON = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
        const presentacionPrincipal: { label: string; url: string } | null =
          trato.tipoEvento === "MUSICAL"     ? { label: "🎸 Presentación Eventos Musicales",    url: `${origin}/presentacion/evento/musical` }
          : trato.tipoEvento === "SOCIAL"      ? { label: "🎊 Presentación Eventos Sociales",     url: `${origin}/presentacion/evento/social` }
          : trato.tipoEvento === "EMPRESARIAL" ? { label: "🏢 Presentación Eventos Empresariales", url: `${origin}/presentacion/evento/empresarial` }
          : null;
        const presentacionesSecundarias = [
          { label: "📋 Presentación de Servicios", url: `${origin}/presentacion/servicios` },
          { label: "🎛 Catálogo de Inventario",    url: `${origin}/presentacion/inventario` },
        ];

        return (
          <div className="bg-[#0d0d0d] border-2 border-emerald-700/40 rounded-xl overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-700/20 flex items-center justify-center text-lg">🌱</div>
                <div>
                  <p className="text-white font-bold text-base">Prospección en frío</p>
                  <p className="text-gray-500 text-xs">Outbound · construye confianza, comparte valor, sé paciente</p>
                </div>
              </div>
              <button onClick={async () => { const d = await patch({ tipoProspecto: "ACTIVO" }); if (d) setTrato(p => p ? { ...p, tipoProspecto: d.trato.tipoProspecto } : p); }}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Cambiar a activo
              </button>
            </div>

            <div className="p-6 space-y-6">

              {/* ── Tipo de evento ── */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <p className="text-xs font-bold text-white mb-3">Tipo de evento que organiza</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "MUSICAL",     icon: "🎸", label: "Musical" },
                    { id: "SOCIAL",      icon: "🎊", label: "Social" },
                    { id: "EMPRESARIAL", icon: "🏢", label: "Empresarial" },
                    { id: "OTRO",        icon: "📅", label: "Otro" },
                  ].map(te => (
                    <button key={te.id}
                      onClick={async () => { const d = await patch({ tipoEvento: te.id }); if (d) setTrato(p => p ? { ...p, tipoEvento: d.trato.tipoEvento } : p); }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${trato.tipoEvento === te.id ? "border-emerald-600/60 bg-emerald-900/20 text-emerald-300" : "border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#444]"}`}>
                      <span>{te.icon}</span><span>{te.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Temperatura del lead + Etapa ── */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-4">
                {/* Temperatura */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-sm font-bold text-white">Temperatura del lead</p>
                    <span className="text-[10px] text-gray-600">nivel de interés y apertura mostrados hasta ahora</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "FRIO",     icon: "❄️", label: "Frío",     desc: "Sin respuesta o primera interacción",  cls: "border-blue-700/60 bg-blue-900/20 text-blue-300" },
                      { id: "TIBIO",    icon: "🌡️", label: "Tibio",    desc: "Respondió, mostró algo de interés",    cls: "border-yellow-600/60 bg-yellow-900/20 text-yellow-300" },
                      { id: "CALIENTE", icon: "🔥", label: "Caliente", desc: "Tiene evento próximo o pidió cotizar", cls: "border-red-700/60 bg-red-900/20 text-red-300" },
                    ].map(t => (
                      <button key={t.id}
                        onClick={() => { const u = { ...nurturing, temperatura: t.id }; setNurturing(u); guardarNurturing(u); }}
                        title={t.desc}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${nurturing.temperatura === t.id ? t.cls : "border-[#2a2a2a] text-gray-600 hover:text-white hover:border-[#555]"}`}>
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Etapa del proceso */}
                <div>
                  <p className="text-sm font-bold text-white mb-2">Etapa del proceso</p>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {NURTURING_ETAPAS.map((e, idx) => {
                      const currentIdx = NURTURING_ETAPAS.findIndex(x => x.id === nurturing.etapa);
                      const isPast = idx < currentIdx;
                      const isCurrent = e.id === nurturing.etapa;
                      return (
                        <button key={e.id}
                          onClick={() => { const u = { ...nurturing, etapa: e.id }; setNurturing(u); guardarNurturing(u, { fechaProximaAccion: calcNextContact(e.id), proximaAccion: `Etapa "${e.label}" — enviar guión correspondiente` }); }}
                          className={`flex-1 min-w-20 px-2 py-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
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

              {/* ── Próximo contacto ── */}
              {trato.fechaProximaAccion && (() => {
                const info = fmtProximoContacto(trato.fechaProximaAccion.split("T")[0]);
                return (
                  <div className="flex items-center gap-3 bg-[#0a1a0f] border border-emerald-900/40 rounded-xl px-4 py-3">
                    <span className="text-lg shrink-0">🗓️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Próximo contacto</p>
                      <p className={`text-sm font-semibold ${info.color}`}>{info.label}</p>
                    </div>
                    {trato.responsable && (
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-600">Responsable</p>
                        <p className="text-xs text-gray-400 font-medium">{trato.responsable.name.split(" ")[0]}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Plan de acción ── */}
              {playbook && (
                <div className="bg-[#0a1a0f] border border-emerald-900/40 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{NURTURING_ETAPAS.find(e => e.id === etapaKey)?.icon}</span>
                    <p className="text-base font-bold text-white">{NURTURING_ETAPAS.find(e => e.id === etapaKey)?.label}</p>
                    <span className="text-[10px] text-emerald-700 ml-1">{playbook.intervalo}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-5">{playbook.objetivo}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Qué hacer */}
                    <div>
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Qué hacer</p>
                      {/* Acción principal */}
                      <div className="flex items-start gap-2.5 bg-emerald-900/25 border border-emerald-900/50 rounded-xl px-3 py-2.5 mb-3">
                        <span className="text-emerald-400 font-bold text-base shrink-0 leading-tight mt-0.5">→</span>
                        <span className="text-sm text-white font-medium leading-snug">{playbook.acciones[0]}</span>
                      </div>
                      {/* Sugerencias */}
                      {playbook.acciones.slice(1).length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">También puedes:</p>
                          <ul className="space-y-1.5">
                            {playbook.acciones.slice(1).map((a, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                                <span className="text-gray-700 mt-0.5 shrink-0">›</span><span>{a}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Qué compartir */}
                    <div>
                      <p className="text-xs font-bold text-[#B3985B] uppercase tracking-widest mb-3">Qué compartir</p>
                      {/* Presentación principal de la plataforma */}
                      {(presentacionPrincipal ?? presentacionesSecundarias[0]) && (() => {
                        const pres = presentacionPrincipal ?? presentacionesSecundarias[0];
                        return (
                          <button
                            onClick={() => navigator.clipboard.writeText(pres.url)}
                            className="w-full flex items-center justify-between gap-2 bg-[#B3985B]/10 border border-[#B3985B]/30 rounded-xl px-3 py-2.5 mb-3 text-left hover:bg-[#B3985B]/15 transition-colors">
                            <span className="text-sm text-white font-medium leading-snug">{pres.label}</span>
                            <div className="flex items-center gap-1 text-[#B3985B] text-[10px] shrink-0">
                              {COPY_ICON}<span>Copiar link</span>
                            </div>
                          </button>
                        );
                      })()}
                      {/* Sugerencias de contenido */}
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">También puedes usar:</p>
                        <ul className="space-y-1.5">
                          {playbook.contenido.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                              <span className="text-gray-700 mt-0.5 shrink-0">›</span><span>{c}</span>
                            </li>
                          ))}
                        </ul>
                        {/* Otras presentaciones secundarias */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {(presentacionPrincipal ? presentacionesSecundarias : presentacionesSecundarias.slice(1)).map(p => (
                            <button key={p.url}
                              onClick={() => navigator.clipboard.writeText(p.url)}
                              className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 bg-[#111] border border-[#2a2a2a] hover:border-[#444] px-2 py-1 rounded-lg transition-colors">
                              <span>{p.label}</span>{COPY_ICON}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Guión estándar ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-base font-bold text-white">
                    Guión de contacto
                    {trato.tipoEvento && trato.tipoEvento !== "OTRO" && (
                      <span className="ml-2 text-sm text-emerald-600 font-normal">
                        · {trato.tipoEvento === "MUSICAL" ? "Musical" : trato.tipoEvento === "SOCIAL" ? "Social" : "Empresarial"}
                      </span>
                    )}
                  </p>
                  {!num && <span className="text-[10px] text-orange-400">Sin teléfono en cliente</span>}
                </div>

                {tplsEvento.length > 0 ? (() => {
                  const tpl = tplsEvento[0];
                  const msg = tpl.msg(nombre, ctx);
                  const yaEnviado = nurturing.log.some(l => l.templateId === tpl.id);
                  return (
                    <div className={`bg-[#111] border rounded-xl overflow-hidden ${yaEnviado ? "border-emerald-900/60" : "border-[#222]"}`}>
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-300">{tpl.icon} {tpl.label}</span>
                          {yaEnviado && <span className="text-[10px] text-emerald-600 bg-emerald-900/20 border border-emerald-900/40 px-1.5 py-0.5 rounded">✓ Enviado</span>}
                          <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#2a2a2a]">Guión base</span>
                        </div>
                        {num ? (
                          <a href={`https://wa.me/${num}?text=${encodeURIComponent(msg)}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={() => registrarEnvioWA(tpl.id, tpl.label)}
                            className="flex items-center gap-1.5 bg-green-900/30 hover:bg-green-800/50 border border-green-700/40 text-green-400 text-xs px-3 py-1.5 rounded-lg transition-colors">
                            {WA_ICON} {yaEnviado ? "Reenviar" : "Enviar WA"}
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-600">Sin teléfono</span>
                        )}
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line">{msg}</p>
                      </div>
                      <div className="px-4 py-3 bg-[#0a0a0a] border-t border-[#1a1a1a]">
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Guión base — el vendedor puede adaptarlo según el contexto, siempre manteniendo el objetivo: <span className="text-gray-300 italic">{playbook?.objetivo}</span>
                        </p>
                      </div>
                    </div>
                  );
                })() : (
                  <p className="text-gray-600 text-xs">Define el tipo de evento arriba para ver el guión correspondiente.</p>
                )}
              </div>

              {/* ── Actividad y notas de seguimiento ── */}
              <div>
                <p className="text-base font-bold text-white mb-1">Actividad y notas</p>
                <p className="text-xs text-gray-500 mb-3">Registra respuestas recibidas, avances, solicitudes o cualquier dato relevante en esta etapa.</p>
                <textarea
                  key={etapaKey}
                  defaultValue={nurturing.notas?.[etapaKey] ?? ""}
                  onBlur={e => {
                    const notas = { ...(nurturing.notas ?? {}), [etapaKey]: e.target.value };
                    const u = { ...nurturing, notas };
                    setNurturing(u);
                    guardarNurturing(u);
                  }}
                  rows={4}
                  placeholder={`Ej: Respondió el ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, mostró interés en audio, dijo que tiene evento en junio...`}
                  className="w-full bg-[#111] border border-[#222] hover:border-[#333] focus:border-emerald-700/60 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none placeholder-gray-700 transition-colors"
                />
              </div>

              {/* ── Historial de mensajes enviados ── */}
              {nurturing.log.length > 0 && (
                <div className="border-t border-[#1a1a1a] pt-5">
                  <p className="text-sm font-bold text-white mb-3">
                    Historial de mensajes <span className="text-gray-600 font-normal text-xs">({nurturing.log.length})</span>
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

              {/* ── Transición al pipeline de venta ── */}
              <div className="border-t border-[#1a1a1a] pt-5">
                <p className="text-sm font-bold text-white mb-1">¿El prospecto ya está listo para avanzar?</p>
                <p className="text-gray-600 text-xs mb-4">Cuando el prospecto tenga una necesidad concreta, pásalo al flujo de venta activo.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={async () => { const d = await patch({ tipoProspecto: "ACTIVO", canalAtencion: null }); if (d) setTrato(prev => prev ? { ...prev, ...d.trato } : prev); }}
                    className="border border-[#B3985B]/40 bg-[#B3985B]/5 hover:bg-[#B3985B]/10 text-[#B3985B] text-sm font-medium px-4 py-3 rounded-xl transition-colors">
                    <p className="font-semibold">🔍 Iniciar descubrimiento</p>
                    <p className="text-xs text-[#B3985B]/60 mt-0.5">Tienen necesidad, hay que calificarla</p>
                  </button>
                  <button onClick={async () => { const d = await patch({ tipoProspecto: "ACTIVO", rutaEntrada: "RIDER_DIRECTO", canalAtencion: "LLAMADA" }); if (d) setTrato(prev => prev ? { ...prev, ...d.trato } : prev); }}
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

      {/* ── WIZARD DE DESCUBRIMIENTO ── */}
      {trato.tipoProspecto !== "NURTURING" && trato.canalAtencion && profundidad !== "INFO" && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <button
            onClick={() => setDiscoveryExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-[#0d0d0d] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Brief técnico</span>
              {trato.descubrimientoCompleto && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#B3985B]/20 text-[#B3985B] font-medium">Completo ✓</span>
              )}
            </div>
            <span className="text-gray-600 text-xs">{discoveryExpanded ? '▾ Contraer' : '▸ Expandir'}</span>
          </button>
          {discoveryExpanded && (
            <div className="border-t border-[#1a1a1a]">
        <div className="bg-[#0d0d0d] border-0 rounded-none overflow-hidden">
          {/* Wizard header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#B3985B]/20 flex items-center justify-center text-[#B3985B] font-bold text-sm">
                {trato.descubrimientoCompleto ? "✓" : "2"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold">Brief técnico</p>
                  {canalInfo && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${canalInfo.badge}`}>
                      {canalInfo.icon} {canalInfo.label}
                    </span>
                  )}
                  {trato.descubrimientoCompleto && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#B3985B]/20 text-[#B3985B]">✓ Completo</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs">Todo se guarda automáticamente</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {autoSaveStatus === "saving" && <span className="text-xs text-gray-500 animate-pulse">Guardando…</span>}
              {autoSaveStatus === "saved" && <span className="text-xs text-green-500">✓ Guardado</span>}
              <button onClick={() => seleccionarCanal("")} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Cambiar canal</button>
            </div>
          </div>

          <>
            {/* Step tabs */}
            <div className="px-5 pt-4 pb-2 overflow-x-auto border-b border-[#1a1a1a]">
              <div className="flex gap-1 min-w-max pb-1">
                {PASOS_DISCOVERY.map(paso => (
                  <button key={paso.id} onClick={() => { setPasoActivo(paso.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      pasoActivo === paso.id
                        ? "bg-[#B3985B] text-black"
                        : "bg-[#111] text-gray-500 hover:text-white border border-[#222] hover:border-[#444]"
                    }`}>
                    {paso.icon} {paso.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-5">

            {/* PASO 1: Información básica */}
            {pasoActivo === 1 && (<div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Tipo de evento</label>
                </div>
                {discForm.tipoEvento && !tipoEventoUnlocked ? (
                  <div className="flex items-center gap-3 px-3 py-2 bg-[#111] border border-[#1e1e1e] rounded-lg w-fit">
                    <span className="text-sm text-white font-medium">
                      {discForm.tipoEvento === "MUSICAL" ? "🎵 Musical" : discForm.tipoEvento === "SOCIAL" ? "🥂 Social" : discForm.tipoEvento === "EMPRESARIAL" ? "🏢 Empresarial" : "📅 Otro"}
                    </span>
                    <button onClick={() => setTipoEventoUnlocked(true)} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">cambiar</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {["MUSICAL", "SOCIAL", "EMPRESARIAL", "OTRO"].map(te => (
                      <button key={te} onClick={() => { setDiscForm(p => ({ ...p, tipoEvento: te, serviciosInteres: [] })); setTipoEventoUnlocked(false); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        discForm.tipoEvento === te
                          ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10"
                          : "border-[#333] text-gray-500 hover:text-white hover:border-[#555]"
                      }`}>
                      {te === "MUSICAL" ? "🎵 Musical" : te === "SOCIAL" ? "🥂 Social" : te === "EMPRESARIAL" ? "🏢 Empresarial" : "📅 Otro"}
                    </button>
                  ))}
                  </div>
                )}
              </div>

            {/* Step 1 continuation: base fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Tipo de servicio</label>
                <Combobox
                  value={discForm.tipoServicio}
                  onChange={v => setDiscForm(p => ({ ...p, tipoServicio: v }))}
                  options={[{ value: "", label: "— Seleccionar —" }, { value: "POR_DESCUBRIR", label: "Por descubrir" }, { value: "RENTA", label: "Renta de equipo" }, { value: "PRODUCCION_TECNICA", label: "Producción técnica" }, { value: "DIRECCION_TECNICA", label: "Dirección técnica" }]}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre del evento / proyecto</label>
                <input value={discForm.nombreEvento} onChange={e => setDiscForm(p => ({ ...p, nombreEvento: e.target.value }))}
                  placeholder="Ej: Boda García-López, Concierto Verano..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Presupuesto estimado del cliente</label>
                <input type="number" value={discForm.presupuestoEstimado} onChange={e => setDiscForm(p => ({ ...p, presupuestoEstimado: e.target.value }))}
                  placeholder="0"
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

              {/* Días de servicio */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Días de servicio del equipo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="1" max="30"
                    value={discForm.diasServicio}
                    onChange={e => setDiscForm(p => ({ ...p, diasServicio: e.target.value }))}
                    placeholder="1"
                    className="w-24 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                  <span className="text-xs text-gray-500">día(s) · se pre-llena en la cotización</span>
                </div>
              </div>

            </div>

            </div>)} {/* /paso1 */}

            {/* PASO 2: Servicios de interés */}
            {pasoActivo === 2 && (<div className="space-y-4">
              {discForm.tipoServicio === "RENTA" ? (
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold">Detalles de renta</p>

                {/* Descripción de equipos */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Descripción del equipo solicitado (rider o listado libre)</label>
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

                {/* Notas de la renta */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Notas adicionales de la renta</label>
                  <textarea value={discForm.rentaNotas}
                    onChange={e => setDiscForm(p => ({ ...p, rentaNotas: e.target.value }))}
                    rows={3} placeholder="Cualquier información adicional sobre la renta, condiciones especiales, preferencias del cliente..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Categorías de equipo / inventario</label>
                  {['Audio', 'Iluminación', 'Video / Pantallas', 'Estructuras', 'Energía', 'DJ / Música'].map(grupo => {
                    const items = CATEGORIAS_BASE.filter(c => c.grupo === grupo);
                    return (
                      <div key={grupo} className="mb-3 last:mb-0">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">{grupo}</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map(srv => (
                            <button key={srv.id} onClick={() => toggleServicio(srv.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                discForm.serviciosInteres.includes(srv.id)
                                  ? 'border-[#B3985B] text-black bg-[#B3985B]'
                                  : 'border-[#2a2a2a] text-gray-300 hover:border-[#555] hover:text-white'
                              }`}>
                              {srv.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(EXTRAS_EVENTO[discForm.tipoEvento] ?? EXTRAS_EVENTO.OTRO).length > 0 && (
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-semibold">Add-ons específicos del evento</p>
                    <div className="flex flex-wrap gap-2">
                      {(EXTRAS_EVENTO[discForm.tipoEvento] ?? EXTRAS_EVENTO.OTRO).map(srv => (
                        <button key={srv.id} onClick={() => toggleServicio(srv.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            discForm.serviciosInteres.includes(srv.id)
                              ? "border-[#B3985B] text-black bg-[#B3985B]"
                              : "border-[#2a2a2a] text-gray-400 hover:border-[#555] hover:text-white"
                          }`}>
                          {srv.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

              {/* Referencias y archivos del cliente — solo en paso 2 para RENTA; en paso 3 para producción */}
              {discForm.tipoServicio === "RENTA" && <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Referencias y archivos del cliente</p>
                {(["REFERENCIA", "DOCUMENTO"] as const).map((cat) => {
                  const catMeta = {
                    REFERENCIA: { label: "Referencias del cliente", icon: "🖼️", accept: "image/*,.pdf", hint: "Imágenes o docs que el cliente comparte como inspiración" },
                    DOCUMENTO:  { label: "Otros documentos",  icon: "📁", accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip", hint: "Contratos, riders, planos, cualquier archivo" },
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
                          <input type="file" className="hidden" accept={catMeta.accept} multiple onChange={e => subirArchivo(e, cat)} />
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
                                  <a href={a.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-1 px-2 py-4 hover:bg-[#1a1a1a] transition-colors min-h-[5rem]">
                                    <span className="text-xl">{/\.pdf$/i.test(a.url) ? "📄" : /\.(doc|docx)$/i.test(a.url) ? "📝" : /\.(xls|xlsx)$/i.test(a.url) ? "📊" : "📎"}</span>
                                    <span className="text-gray-400 text-[10px] truncate w-full text-center px-1">{a.nombre}</span>
                                  </a>
                                )}
                                <button onClick={() => eliminarArchivo(a.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-red-400 text-xs items-center justify-center hidden group-hover:flex hover:bg-red-900/60 transition-colors">×</button>
                                <p className="px-2 py-1 text-gray-600 text-[10px] truncate border-t border-[#1a1a1a]">{a.nombre}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>}

            </div>)} {/* /paso2 */}

            {/* PASO 3: Detalles operativos (solo producción técnica / no-renta) */}
            {discForm.tipoServicio !== "RENTA" && pasoActivo === 3 && (<div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 block mb-1.5">Ideas / Referencias (links)</label>

                  {/* Legacy text — show as text, don't edit */}
                  {isLegacyString(discForm.ideasReferencias) && (
                    <p className="text-xs text-gray-500 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 mb-2 leading-relaxed">
                      {discForm.ideasReferencias}
                    </p>
                  )}

                  {/* Lista de links */}
                  {parseLinks(discForm.ideasReferencias).map((link, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1.5">
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                         className="flex-1 text-xs text-[#B3985B] hover:underline truncate">
                        {link.label} →
                      </a>
                      <button onClick={() => removeLink(i)}
                              className="text-gray-600 hover:text-red-400 transition-colors text-xs shrink-0">
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Input para agregar */}
                  <div className="flex gap-2 mt-1">
                    <input
                      value={linkDraft.label}
                      onChange={e => setLinkDraft(p => ({ ...p, label: e.target.value }))}
                      placeholder="Ej: Referencia de iluminación"
                      className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B] placeholder-gray-700"
                    />
                    <input
                      value={linkDraft.url}
                      onChange={e => { setLinkDraft(p => ({ ...p, url: e.target.value })); setLinkUrlError(''); }}
                      placeholder="https://..."
                      className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B] placeholder-gray-700"
                      onKeyDown={e => e.key === 'Enter' && addLink()}
                    />
                    <button onClick={addLink}
                            className="shrink-0 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-gray-300 hover:text-white hover:border-[#555] text-xs transition-colors">
                      + Agregar
                    </button>
                  </div>
                  {linkUrlError && <p className="text-red-400 text-xs mt-1">{linkUrlError}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Notas del descubrimiento</label>
                <textarea value={discForm.notas} onChange={e => setDiscForm(p => ({ ...p, notas: e.target.value }))}
                  rows={4} placeholder="Detalles específicos, necesidades especiales, contexto del evento, expectativas del cliente..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>

              {/* Referencias y archivos del cliente */}
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Referencias y archivos del cliente</p>
                {(["REFERENCIA", "DOCUMENTO"] as const).map((cat) => {
                  const catMeta = {
                    REFERENCIA: { label: "Referencias del cliente", icon: "🖼️", accept: "image/*,.pdf", hint: "Imágenes o docs que el cliente comparte como inspiración" },
                    DOCUMENTO:  { label: "Otros documentos",  icon: "📁", accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip", hint: "Contratos, riders, planos, cualquier archivo" },
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
                          <input type="file" className="hidden" accept={catMeta.accept} multiple onChange={e => subirArchivo(e, cat)} />
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
                                  <a href={a.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-1 px-2 py-4 hover:bg-[#1a1a1a] transition-colors min-h-[5rem]">
                                    <span className="text-xl">{/\.pdf$/i.test(a.url) ? "📄" : /\.(doc|docx)$/i.test(a.url) ? "📝" : /\.(xls|xlsx)$/i.test(a.url) ? "📊" : "📎"}</span>
                                    <span className="text-gray-400 text-[10px] truncate w-full text-center px-1">{a.nombre}</span>
                                  </a>
                                )}
                                <button onClick={() => eliminarArchivo(a.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-red-400 text-xs items-center justify-center hidden group-hover:flex hover:bg-red-900/60 transition-colors">×</button>
                                <p className="px-2 py-1 text-gray-600 text-[10px] truncate border-t border-[#1a1a1a]">{a.nombre}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>)} {/* /paso3 */}


            {/* PASO 4 (no-renta) / PASO 3 (renta): Brief de contenido */}
            {(discForm.tipoServicio === "RENTA" ? pasoActivo === 3 : pasoActivo === 4) && (<div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-gray-300">¿Aplica levantamiento de contenido?</p>
                <button onClick={async () => {
                  setBriefAplica(true);
                  try {
                    await fetch(`/api/tratos/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ requiereRevision: true }),
                    });
                    setLevantamientoCreado(true);
                  } catch { /* silent */ }
                }} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${briefAplica === true ? "border-[#B3985B] text-black bg-[#B3985B]" : "border-[#333] text-gray-400 hover:text-white"}`}>Sí aplica</button>
                <button onClick={async () => {
                  setBriefAplica(false);
                  setLevantamientoCreado(false);
                  try {
                    await fetch(`/api/tratos/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ requiereRevision: false }),
                    });
                  } catch { /* silent */ }
                }} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${briefAplica === false ? "border-gray-500 text-white bg-gray-700" : "border-[#333] text-gray-400 hover:text-white"}`}>No aplica</button>
                {briefGuardado && <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/40 text-green-300">Guardado</span>}
                {levantamientoCreado && (
                  <p className="text-xs text-green-400">✓ Solicitud de levantamiento creada — Marketing será notificado</p>
                )}
              </div>
              {briefAplica === false && <p className="text-gray-600 text-xs italic">No se requiere levantamiento de contenido para este proyecto.</p>}
              {briefAplica === true && (
                <div className="bg-[#0d1a0f] border border-green-900/40 rounded-xl px-4 py-3 flex items-start gap-3">
                  <span className="text-green-400 text-base mt-0.5">✓</span>
                  <div>
                    <p className="text-green-300 text-sm font-medium">Levantamiento marcado como requerido</p>
                    <p className="text-green-700 text-xs mt-0.5">El equipo de Marketing recibirá la orden automáticamente cuando se apruebe la cotización.</p>
                  </div>
                </div>
              )}



              {/* Toggles: Family & Friends + Mainstage Trade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1a1a1a]">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">Descuento especial</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Se aplicará en la cotización automáticamente</p>
                    </div>
                    <button
                      onClick={() => setDiscForm(p => ({ ...p, familyAndFriends: !p.familyAndFriends }))}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${discForm.familyAndFriends ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${discForm.familyAndFriends ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-3">
                      <p className="text-sm text-white font-medium">Aplica Mainstage Trade</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">Intercambio de servicios por contenido o difusión. El cliente obtiene descuento a cambio de publicar en redes, crear contenido de calidad o mencionar a Mainstage Pro.</p>
                    </div>
                    <button
                      onClick={() => setDiscForm(p => ({ ...p, tradeAplica: !p.tradeAplica }))}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${discForm.tradeAplica ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${discForm.tradeAplica ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
                {discForm.tipoServicio !== "RENTA" && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">Realizar render para facilitar venta</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Se habilitará el botón de solicitud en la cotización</p>
                    </div>
                    <button
                      onClick={() => setDiscForm(p => ({ ...p, realizarRender: !p.realizarRender }))}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${discForm.realizarRender ? "bg-purple-600" : "bg-[#333]"}`}>
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${discForm.realizarRender ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
                )}
              </div>

              {/* CTA Hacer propuesta — solo en el último paso */}
              {!trato.descubrimientoCompleto && (
                <div className="border border-[#B3985B]/30 bg-[#B3985B]/5 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-semibold">¿Ya tienes toda la información?</p>
                    <p className="text-gray-500 text-xs mt-0.5">Es hora de preparar la propuesta</p>
                  </div>
                  <Link
                    href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
                    onClick={() => { if (!trato.descubrimientoCompleto) guardarDescubrimiento(true); }}
                    className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-5 py-2 rounded-lg transition-colors shrink-0"
                  >
                    Hacer propuesta →
                  </Link>
                </div>
              )}
            </div>)} {/* /paso5 */}

            </div> {/* /p-5 space-y-5 */}

            {/* Wizard footer navigation */}
            <div className="px-5 py-4 border-t border-[#1a1a1a] flex items-center justify-between">
              <button onClick={() => { setPasoActivo(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={pasoActivo === 1}
                className="text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-30 px-3 py-2 rounded-lg border border-[#222] hover:border-[#444]">
                ← Anterior
              </button>
              <span className="text-[10px] text-gray-600">{pasoActivo} / {PASOS_DISCOVERY.length}</span>
              {pasoActivo < PASOS_DISCOVERY.length ? (
                <button onClick={() => { setPasoActivo(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs px-4 py-2 bg-[#B3985B] text-black font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors">
                  Siguiente →
                </button>
              ) : (
                trato.descubrimientoCompleto
                  ? <span className="text-xs text-[#B3985B] font-medium">✓ Descubrimiento completo</span>
                  : <span />
              )}
            </div>
          </>
        </div>
        </div>
        )}
        </div>
      )}


      {/* ── SCOUTING DE VENUE ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <button
          onClick={() => setScoutingVisible(prev => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-[#0d0d0d] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🗺️</span>
            <span className="text-gray-400">Scouting del venue</span>
            {(scoutingForm.notasScouting || scoutingForm.libreVenue || scoutingForm.libreDimensiones || scoutingForm.libreElectrico) ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#B3985B]/20 text-[#B3985B] font-medium">Con datos</span>
            ) : null}
          </div>
          <span className="text-gray-600 text-xs">{scoutingVisible ? "▾ Contraer" : "▸ Expandir"}</span>
        </button>

        {scoutingVisible && (
          <div className="border-t border-[#1a1a1a] p-5 space-y-5">

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600">Todo se guarda automáticamente</p>
              {savingScouting && <span className="text-xs text-gray-500 animate-pulse">Guardando…</span>}
            </div>

            {/* Estado general — botones rápidos */}
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs text-gray-500 shrink-0">Estado del venue:</p>
              {[
                { val: "EXCELENTE", label: "✅ Excelente", cls: "border-emerald-700/40 text-emerald-400 bg-emerald-900/10" },
                { val: "BUENO",     label: "🟡 Bueno",     cls: "border-yellow-700/40 text-yellow-400 bg-yellow-900/10" },
                { val: "REGULAR",   label: "🟠 Regular",   cls: "border-orange-700/40 text-orange-400 bg-orange-900/10" },
                { val: "COMPLEJO",  label: "🔴 Complejo",  cls: "border-red-700/40 text-red-400 bg-red-900/10" },
              ].map(o => (
                <button key={o.val}
                  onClick={() => setScoutingForm(p => ({ ...p, estadoGeneral: p.estadoGeneral === o.val ? "" : o.val }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    scoutingForm.estadoGeneral === o.val ? o.cls : "border-[#2a2a2a] text-gray-600 hover:text-gray-400"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Secciones libres */}
            {([
              { key: "notasScouting",      label: "📝 Notas generales",        placeholder: "Impresiones generales del venue, observaciones del scouting, puntos clave para la producción…",                                        rows: 4 },
              { key: "libreVenue",         label: "🏛️ Datos del venue",         placeholder: "Nombre, dirección, contacto, teléfono, página web, horarios de acceso al lugar…",                                                     rows: 3 },
              { key: "libreDimensiones",   label: "📐 Dimensiones del espacio", placeholder: "Largo, ancho, altura máxima, capacidad, distribución del espacio, escenario, pista de baile…",                                         rows: 3 },
              { key: "libreElectrico",     label: "⚡ Instalación eléctrica",   placeholder: "Voltaje disponible, amperaje total, fases, ubicación del tablero, breakers disponibles, distancia al área de trabajo…",                rows: 3 },
              { key: "libreAcceso",        label: "🚛 Acceso y logística",      placeholder: "Acceso vehicular, punto de descarga, elevador de carga, escaleras, restricciones de horario para cargar…",                             rows: 3 },
              { key: "libreRestricciones", label: "🚫 Restricciones",           placeholder: "Límite de decibeles, horario límite de operación, restricciones de instalación o rigging, reglas del venue…",                          rows: 3 },
            ] as { key: keyof typeof scoutingForm; label: string; placeholder: string; rows: number }[]).map(sec => (
              <div key={sec.key} className="space-y-1.5">
                <p className="text-xs text-gray-500 font-medium">{sec.label}</p>
                <textarea
                  value={scoutingForm[sec.key]}
                  onChange={e => setScoutingForm(p => ({ ...p, [sec.key]: e.target.value }))}
                  rows={sec.rows}
                  placeholder={sec.placeholder}
                  className="w-full bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#2a2a2a] focus:border-[#B3985B]/40 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none placeholder-[#3a3a3a] transition-colors leading-relaxed"
                />
              </div>
            ))}

          </div>
        )}
      </div>


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
              <Combobox
                value={discForm.tipoEvento}
                onChange={v => setDiscForm(p => ({ ...p, tipoEvento: v }))}
                options={[{ value: "MUSICAL", label: "Musical" }, { value: "SOCIAL", label: "Social" }, { value: "EMPRESARIAL", label: "Empresarial" }, { value: "OTRO", label: "Otro" }]}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
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
            <button onClick={async () => { const d = await patch({ descubrimientoCompleto: false }); if (d) setTrato(prev => prev ? { ...prev, ...d.trato } : prev); }}
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
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Categorías para cotización</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(serviciosSel.includes("AUDIO_PA") || serviciosSel.includes("AUDIO_CONF")) && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🔊 Audio</div>}
                {serviciosSel.includes("AUDIO_MONITOR") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎧 Monitores / IEM</div>}
                {(serviciosSel.includes("ILUM_ARTISTICA") || serviciosSel.includes("ILUM_ESCENARIO") || serviciosSel.includes("ILUM_AMBIENTAL") || serviciosSel.includes("ILUM_ARQ")) && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">💡 Iluminación</div>}
                {serviciosSel.includes("PISTA_BAILE") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">💃 Pista de baile iluminada</div>}
                {serviciosSel.includes("ILUM_ARQ") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🏛️ Iluminación arquitectónica</div>}
                {(serviciosSel.includes("VIDEO_LED") || serviciosSel.includes("PROYECCION")) && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">📺 Video / LED</div>}
                {serviciosSel.includes("DJ") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎚️ Setup DJ</div>}
                {serviciosSel.includes("BACKLINE") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎸 Backline</div>}
                {serviciosSel.includes("ESTRUCTURAS") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🏗️ Torres y truss</div>}
                {(serviciosSel.includes("CHISPEROS") || serviciosSel.includes("HUMO_FRIO") || serviciosSel.includes("CONFETI") || serviciosSel.includes("EFECTOS")) && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">✨ Efectos especiales</div>}
                {serviciosSel.includes("CHISPEROS") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎆 Chisperos</div>}
                {serviciosSel.includes("HUMO_FRIO") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🌫️ Humo frío</div>}
                {serviciosSel.includes("CONFETI") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎊 Confeti</div>}
                {serviciosSel.includes("KARAOKE") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎤 Karaoke</div>}
                {serviciosSel.includes("STREAMING") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">📡 Streaming en vivo</div>}
                {serviciosSel.includes("GRABACION") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎬 Grabación</div>}
                {serviciosSel.includes("BRANDING") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🖥️ Branding en pantallas</div>}
                {serviciosSel.includes("ESCENOGRAFIA") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">🎭 Escenografía / Backdrop</div>}
                {serviciosSel.includes("PRODUCCION_GENERAL") && <div className="text-xs bg-[#1a1a1a] rounded px-3 py-2 text-gray-300">⚙️ Producción completa</div>}
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


      {/* ── Modal: Razón de pérdida ── */}
      {modalPerdida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalPerdida(false)} />
          <div className="relative bg-[#111] border border-[#333] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-semibold">Marcar como perdido</h3>
              <button onClick={() => setModalPerdida(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Razón principal</label>
                <Combobox
                  value={razonPerdida}
                  onChange={v => setRazonPerdida(v)}
                  options={[{ value: "", label: "— Seleccionar —" }, { value: "Precio", label: "Precio fuera de presupuesto" }, { value: "Fechas", label: "Fechas no coinciden" }, { value: "Eligió a otro proveedor", label: "Eligió a otro proveedor" }, { value: "No respondió", label: "No respondió / se enfrió" }, { value: "Evento cancelado", label: "Evento cancelado" }, { value: "Fuera de cobertura", label: "Fuera de cobertura geográfica" }, { value: "Otro", label: "Otro" }]}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Notas adicionales (opcional)</label>
                <textarea value={notasPerdida} onChange={e => setNotasPerdida(e.target.value)}
                  rows={2} placeholder="Contexto o detalles que ayuden a entender la pérdida..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setModalPerdida(false)} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors">Cancelar</button>
                <button onClick={confirmarPerdida} disabled={saving}
                  className="px-4 py-2 rounded-lg bg-red-900/60 border border-red-700/40 text-red-300 hover:bg-red-900 text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? "Guardando..." : "Confirmar pérdida"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar trato ── */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditando(false)} />
          <div className="relative bg-[#111] border border-[#333] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-semibold">Editar trato</h3>
              <button onClick={() => setEditando(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cliente</label>
                <Combobox
                  value={trato.cliente.id}
                  onChange={async (nuevoId) => {
                    if (!nuevoId || nuevoId === trato.cliente.id) return;
                    setSavingCliente(true);
                    const res = await fetch(`/api/tratos/${id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clienteId: nuevoId }),
                    });
                    if (res.ok) {
                      const r2 = await fetch(`/api/tratos/${id}`);
                      const d2 = await r2.json();
                      if (d2.trato) setTrato(d2.trato);
                      toast.success("Cliente actualizado");
                    } else {
                      const d = await res.json().catch(() => ({}));
                      toast.error(d.error ?? "Error al cambiar cliente");
                    }
                    setSavingCliente(false);
                  }}
                  options={clientesOpciones}
                  placeholder={clientesOpciones.length === 0 ? "Cargando clientes..." : "Buscar cliente..."}
                  disabled={savingCliente}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre del evento / proyecto</label>
                <input value={form.nombreEvento || ""} onChange={e => setForm(p => ({ ...p, nombreEvento: e.target.value }))}
                  placeholder="Ej: Boda García-López, Concierto Verano..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo de evento</label>
                  <Combobox
                    value={form.tipoEvento || ""}
                    onChange={v => setForm(p => ({ ...p, tipoEvento: v }))}
                    options={[{ value: "MUSICAL", label: "Musical" }, { value: "SOCIAL", label: "Social" }, { value: "EMPRESARIAL", label: "Empresarial" }, { value: "OTRO", label: "Otro" }]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo de servicio</label>
                  <Combobox
                    value={form.tipoServicio || ""}
                    onChange={v => setForm(p => ({ ...p, tipoServicio: v }))}
                    options={[{ value: "", label: "— Sin especificar —" }, { value: "RENTA", label: "Renta de Equipo" }, { value: "PRODUCCION_TECNICA", label: "Producción Técnica" }, { value: "DIRECCION_TECNICA", label: "Dirección Técnica" }]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
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
                  <Combobox
                    value={form.clasificacion || "PROSPECTO"}
                    onChange={v => setForm(p => ({ ...p, clasificacion: v }))}
                    options={[{ value: "PROSPECTO", label: "Prospecto" }, { value: "BASIC", label: "Basic" }, { value: "REGULAR", label: "Regular" }, { value: "PRIORITY", label: "Priority" }]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
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
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditando(false)} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seguimientos */}
      <SeguimientosPanel
        tratoId={trato.id}
        etapa={trato.etapa}
        tipoEvento={trato.tipoEvento}
        clienteNombre={trato.cliente.nombre}
      />

      </div> {/* end left column */}

      {/* ── RIGHT COLUMN ── */}
      <div className="space-y-4 lg:sticky lg:top-6 self-start">
        {/* Client card */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Cliente</p>
          </div>
          <Link href={`/crm/clientes/${trato.cliente.id}`} className="text-white font-semibold text-sm hover:text-[#B3985B] transition-colors block">
            {trato.cliente.nombre}
          </Link>
          {trato.cliente.empresa && <p className="text-gray-500 text-xs mt-0.5">{trato.cliente.empresa}</p>}
          {telefonoLimpio && (
            <div className="flex items-center gap-2 mt-3">
              <p className="text-gray-400 text-xs font-mono flex-1">{telefonoLimpio}</p>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-500 transition-colors shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
                  </svg>
                </a>
              )}
            </div>
          )}
          {trato.cliente.correo && <p className="text-gray-600 text-xs mt-1">{trato.cliente.correo}</p>}
        </div>

        {/* Event info */}
        {(trato.fechaEventoEstimada || trato.lugarEstimado || trato.presupuestoEstimado) && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Evento</p>
            {trato.fechaEventoEstimada && (
              <div className="flex items-start gap-2">
                <span className="text-gray-700 text-xs shrink-0">📅</span>
                <p className="text-gray-300 text-xs">
                  {fmtFechaEvento(trato.fechaEventoEstimada)}
                </p>
              </div>
            )}
            {trato.lugarEstimado && (
              <div className="flex items-start gap-2">
                <span className="text-gray-700 text-xs shrink-0">📍</span>
                <p className="text-gray-300 text-xs">{trato.lugarEstimado}</p>
              </div>
            )}
            {trato.presupuestoEstimado && (
              <div className="flex items-start gap-2">
                <span className="text-gray-700 text-xs shrink-0">💰</span>
                <p className="text-[#B3985B] text-xs font-medium">
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(trato.presupuestoEstimado)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Origin info */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Origen</p>
          <div className="flex items-center gap-2">
            <span className="text-gray-700 text-xs">📣</span>
            <p className="text-gray-400 text-xs">{trato.origenLead}</p>
          </div>
          {campanaOrigen && (
            <div className="flex items-center gap-2">
              <span className="text-gray-700 text-xs">🎯</span>
              <p className="text-gray-500 text-xs truncate">{campanaOrigen}</p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-2 border-t border-[#1a1a1a] mt-1">
            <span className="text-gray-700 text-xs">🗓</span>
            <p className="text-gray-600 text-xs">
              {new Date(trato.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setEditando(true)}
            className="w-full py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-sm rounded-xl hover:border-[#3a3a3a] hover:text-white transition-colors"
          >
            ✏️ Editar trato
          </button>
          <button
            onClick={async () => {
              const tieneProyecto = trato.cotizaciones.some(c => c.proyecto);
              const tieneCotizaciones = trato.cotizaciones.length > 0;
              const resumen = tieneProyecto
                ? `Se eliminarán: el trato, ${trato.cotizaciones.length} cotización(es) y el proyecto asociado con todas sus cuentas y datos. Esta acción no se puede deshacer.`
                : tieneCotizaciones
                ? `Se eliminarán: el trato y ${trato.cotizaciones.length} cotización(es) asociada(s). Esta acción no se puede deshacer.`
                : "Se eliminará este trato. Esta acción no se puede deshacer.";
              const ok = await confirm({ message: resumen, danger: true, confirmText: 'Eliminar todo' });
              if (!ok) return;
              const res = await fetch(`/api/tratos/${trato.id}`, { method: 'DELETE' });
              if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                toast.error(d.error ?? 'Error al eliminar el trato');
                return;
              }
              toast.success('Trato eliminado');
              router.push('/crm/tratos');
            }}
            className="w-full py-2 bg-transparent border border-red-900/30 text-red-600 text-sm rounded-xl hover:bg-red-900/10 hover:text-red-400 transition-colors"
          >
            🗑 Eliminar
          </button>
        </div>
      </div>

      </div> {/* end 2-column grid */}

      {/* ── Modal: Razón de pérdida ── */}
      {modalPerdida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalPerdida(false)} />
          <div className="relative bg-[#111] border border-[#333] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-semibold">Marcar como perdido</h3>
              <button onClick={() => setModalPerdida(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Razón principal</label>
                <Combobox
                  value={razonPerdida}
                  onChange={v => setRazonPerdida(v)}
                  options={[{ value: "", label: "— Seleccionar —" }, { value: "Precio", label: "Precio fuera de presupuesto" }, { value: "Fechas", label: "Fechas no coinciden" }, { value: "Eligió a otro proveedor", label: "Eligió a otro proveedor" }, { value: "No respondió", label: "No respondió / se enfrió" }, { value: "Evento cancelado", label: "Evento cancelado" }, { value: "Fuera de cobertura", label: "Fuera de cobertura geográfica" }, { value: "Otro", label: "Otro" }]}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Notas adicionales (opcional)</label>
                <textarea value={notasPerdida} onChange={e => setNotasPerdida(e.target.value)}
                  rows={2} placeholder="Contexto o detalles que ayuden a entender la pérdida..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setModalPerdida(false)} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors">Cancelar</button>
                <button onClick={confirmarPerdida} disabled={saving}
                  className="px-4 py-2 rounded-lg bg-red-900/60 border border-red-700/40 text-red-300 hover:bg-red-900 text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? "Guardando..." : "Confirmar pérdida"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar trato ── */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditando(false)} />
          <div className="relative bg-[#111] border border-[#333] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-semibold">Editar trato</h3>
              <button onClick={() => setEditando(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cliente</label>
                <Combobox
                  value={trato.cliente.id}
                  onChange={async (nuevoId) => {
                    if (!nuevoId || nuevoId === trato.cliente.id) return;
                    setSavingCliente(true);
                    const res = await fetch(`/api/tratos/${id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clienteId: nuevoId }),
                    });
                    if (res.ok) {
                      const r2 = await fetch(`/api/tratos/${id}`);
                      const d2 = await r2.json();
                      if (d2.trato) setTrato(d2.trato);
                      toast.success("Cliente actualizado");
                    } else {
                      const d = await res.json().catch(() => ({}));
                      toast.error(d.error ?? "Error al cambiar cliente");
                    }
                    setSavingCliente(false);
                  }}
                  options={clientesOpciones}
                  placeholder={clientesOpciones.length === 0 ? "Cargando clientes..." : "Buscar cliente..."}
                  disabled={savingCliente}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre del evento / proyecto</label>
                <input value={form.nombreEvento || ""} onChange={e => setForm(p => ({ ...p, nombreEvento: e.target.value }))}
                  placeholder="Ej: Boda García-López, Concierto Verano..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo de evento</label>
                  <Combobox
                    value={form.tipoEvento || ""}
                    onChange={v => setForm(p => ({ ...p, tipoEvento: v }))}
                    options={[{ value: "MUSICAL", label: "Musical" }, { value: "SOCIAL", label: "Social" }, { value: "EMPRESARIAL", label: "Empresarial" }, { value: "OTRO", label: "Otro" }]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo de servicio</label>
                  <Combobox
                    value={form.tipoServicio || ""}
                    onChange={v => setForm(p => ({ ...p, tipoServicio: v }))}
                    options={[{ value: "", label: "— Sin especificar —" }, { value: "RENTA", label: "Renta de Equipo" }, { value: "PRODUCCION_TECNICA", label: "Producción Técnica" }, { value: "DIRECCION_TECNICA", label: "Dirección Técnica" }]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
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
                  <Combobox
                    value={form.clasificacion || "PROSPECTO"}
                    onChange={v => setForm(p => ({ ...p, clasificacion: v }))}
                    options={[{ value: "PROSPECTO", label: "Prospecto" }, { value: "BASIC", label: "Basic" }, { value: "REGULAR", label: "Regular" }, { value: "PRIORITY", label: "Priority" }]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
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
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditando(false)} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {CelebrationToastEl}
    </div>
  );
}

