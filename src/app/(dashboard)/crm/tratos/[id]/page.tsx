"use client";

import { useEffect, useState, useRef, use, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { SelectorEquiposInventario, type SeleccionEquipos } from '@/components/SelectorEquiposInventario';

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
  formRecibidoEn: string | null;
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
  equiposInteres: string | null;
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
    createdAt: string;
    proyecto: {
      id: string;
      numeroProyecto: string;
      nombre: string;
      estado: string;
      fechaEvento: string | null;
      lugarEvento: string | null;
    } | null;
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
const ESTADO_COT_LABELS: Record<string, string> = {
  BORRADOR: "Borrador", ENVIADA: "Enviada", APROBADA: "Aprobada",
  RECHAZADA: "Rechazada", VENCIDA: "Vencida",
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
// Paso 1 universal, Paso 2 y 3 dependen del tipo de servicio
const PASOS_DISCOVERY_FULL = [
  { id: 1, icon: "📋", label: "Info del evento" },
  { id: 2, icon: "✨", label: "Equipos y detalles" },
  { id: 3, icon: "📊", label: "Referencias y cierre" },
];
const PASOS_DISCOVERY_RENTA = [
  { id: 1, icon: "📋", label: "Info del evento" },
  { id: 2, icon: "📦", label: "Equipos y logística" },
  { id: 3, icon: "✅", label: "Referencias y cierre" },
];
const PASOS_DISCOVERY_DIR = [
  { id: 1, icon: "📋", label: "Info del evento" },
  { id: 2, icon: "🎯", label: "Alcance del servicio" },
];

// Subtipos de evento — dinámicos según tipoEvento
const SUBTIPOS_EVENTO: Record<string, { value: string; label: string }[]> = {
  MUSICAL: [
    { value: "CONCIERTO",            label: "Concierto" },
    { value: "FESTIVAL",             label: "Festival" },
    { value: "ELECTRONICA",          label: "Música electrónica" },
    { value: "PRESENTACION_MUSICAL", label: "Presentación musical" },
    { value: "FIESTA_PRIVADA",       label: "Fiesta privada" },
    { value: "OTRO",                 label: "Otro" },
  ],
  SOCIAL: [
    { value: "BODA",       label: "Boda" },
    { value: "XV_ANOS",    label: "XV años" },
    { value: "BAUTIZO",    label: "Bautizo" },
    { value: "CUMPLEANIOS",label: "Cumpleaños" },
    { value: "OTRO",       label: "Otro" },
  ],
  EMPRESARIAL: [
    { value: "CONGRESO",    label: "Congreso" },
    { value: "TALLER",      label: "Taller" },
    { value: "LANZAMIENTO", label: "Lanzamiento" },
    { value: "FERIA",       label: "Feria" },
    { value: "OTRO",        label: "Otro" },
  ],
};

// Contactos recomendados para la etapa de Prospección
const CONTACTOS_INBOUND = [
  { num: 1, label: "Presentación",           objetivo: "Primer contacto. Preséntate y da a conocer quién es Mainstage Pro." },
  { num: 2, label: "Generación de confianza", objetivo: "Comparte trabajo, referencias, casos de éxito relevantes al perfil del cliente." },
  { num: 3, label: "Orientar a información", objetivo: "Hacer preguntas clave para obtener info suficiente para cotizar." },
];
const CONTACTOS_OUTBOUND = [
  { num: 1, label: "Presentación de Mainstage Pro", objetivo: "Dar a conocer la empresa, servicios y diferenciadores clave." },
  { num: 2, label: "Generación de confianza #1",     objetivo: "Portfolio, reseñas, casos de éxito relevantes al sector del prospecto." },
  { num: 3, label: "Generación de confianza #2",     objetivo: "Seguimiento proactivo. Nuevo material, estadísticas, mantener presencia." },
  { num: 4, label: "Prospección de evento",           objetivo: "Preguntar si tienen algún evento próximo que podamos atender o cotizar." },
  { num: 5, label: "Propuesta de reunión",            objetivo: "Invitar a una reunión para conocernos y detectar oportunidades en conjunto." },
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
    intervalo: "2–3 semanas después, o cuando haya apertura clara",
    acciones: [
      "Hacer la pregunta directa sobre eventos próximos con fecha estimada",
      "Si mencionó una fecha antes: retomar ese dato y acercarse con urgencia suave",
      "Si hay silencio prolongado: reactivar con contenido fresco antes de preguntar",
      "Registrar la respuesta y definir próxima acción",
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

const TIPO_SEG = [
  { key: "whatsapp", label: "WhatsApp", icon: "📱" },
  { key: "llamada",  label: "Llamada",  icon: "📞" },
  { key: "reunion",  label: "Reunión",  icon: "🤝" },
  { key: "email",    label: "Email",    icon: "📧" },
];

function SeguimientosPanel({ tratoId, telefono, showModal, setShowModal }: {
  tratoId: string;
  telefono: string | null;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
}) {
  const confirm = useConfirm();
  const [segs, setSegs] = useState<SeguimientoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState("whatsapp");

  const [fecha, setFecha] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); });
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [ultimoSeg, setUltimoSeg] = useState<SeguimientoItem | null>(null);

  useEffect(() => {
    fetch(`/api/seguimientos?tratoId=${tratoId}`)
      .then(r => r.json())
      .then(d => { setSegs(d.seguimientos ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tratoId]);

  async function agendar() {
    if (!fecha) return;
    setSaving(true);
    const tipoSel = TIPO_SEG.find(t => t.key === tipo);
    const res = await fetch("/api/seguimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tratoId,
        titulo: tipoSel?.label ?? tipo,
        canal: tipo,
        fechaProgramada: new Date(fecha + "T10:00:00").toISOString(),
        nota: nota || undefined,
        tipo: "manual",
      }),
    });
    if (res.ok) {
      const d = await res.json();
      const nuevo = d.seguimiento as SeguimientoItem;
      setSegs(prev => [nuevo, ...prev]);
      setUltimoSeg(nuevo);
      setShowModal(false);
      setNota("");
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      setFecha(tomorrow.toISOString().slice(0, 10));
    }
    setSaving(false);
  }

  async function marcarHecho(seg: SeguimientoItem) {
    const res = await fetch(`/api/seguimientos/${seg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completado: true, fechaCompletado: new Date().toISOString() }),
    });
    if (res.ok) {
      setSegs(prev => prev.map(s => s.id === seg.id ? { ...s, completado: true, fechaCompletado: new Date().toISOString() } : s));
    }
  }

  async function eliminarSeg(id: string) {
    const ok = await confirm({ message: "¿Eliminar este seguimiento?", danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    await fetch(`/api/seguimientos/${id}`, { method: "DELETE" });
    setSegs(prev => prev.filter(s => s.id !== id));
    if (ultimoSeg?.id === id) setUltimoSeg(null);
  }

  const telLimpio = telefono?.replace(/\D/g, "");
  const waLink = telLimpio ? `https://wa.me/${telLimpio.startsWith("52") ? telLimpio : "52" + telLimpio}` : null;

  function fmtSegFecha(iso: string) {
    const d = new Date(iso);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);
    if (diff < 0) return `Venció hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? "s" : ""}`;
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Mañana";
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  }

  const pendientes = segs.filter(s => !s.completado);
  const completados = segs.filter(s => s.completado);

  return (
    <div className="space-y-3">
      {/* Botón WhatsApp después de agendar */}
      {ultimoSeg && waLink && (
        <div className="bg-green-900/10 border border-green-800/30 rounded-xl p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-green-400 text-xs font-semibold">✓ Seguimiento agendado</p>
            <p className="text-gray-600 text-[10px] mt-0.5">{ultimoSeg.titulo} · {fmtSegFecha(ultimoSeg.fechaProgramada)}</p>
          </div>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-900/30 border border-green-700/40 text-green-400 hover:bg-green-900/50 transition-colors text-xs font-semibold"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
            </svg>
            Abrir WhatsApp
          </a>
        </div>
      )}

      {/* Lista de seguimientos */}
      {loading ? (
        <p className="text-center text-gray-700 text-xs py-4">Cargando...</p>
      ) : segs.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-[#1e1e1e] rounded-xl">
          <p className="text-gray-700 text-xs">Sin seguimientos aún</p>
          <p className="text-gray-800 text-[10px] mt-1">Agenda el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendientes.map(seg => {
            const vencido = new Date(seg.fechaProgramada) < new Date();
            return (
              <div key={seg.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${vencido ? "border-red-900/30 bg-red-900/5" : "border-[#1e1e1e] bg-[#0d0d0d]"}`}>
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${vencido ? "bg-red-900/30 text-red-400" : "bg-[#1a1a1a] text-gray-500"}`}>
                  {TIPO_SEG.find(t => t.key === seg.canal)?.icon ?? "📌"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium">{seg.titulo}</p>
                  <p className={`text-[10px] mt-0.5 ${vencido ? "text-red-400" : "text-gray-600"}`}>{fmtSegFecha(seg.fechaProgramada)}</p>
                  {seg.nota && <p className="text-gray-600 text-[10px] mt-1 line-clamp-1">{seg.nota}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => marcarHecho(seg)}
                    className="text-[10px] text-gray-700 hover:text-green-400 transition-colors px-2 py-1 rounded hover:bg-green-900/10" title="Marcar como hecho">✓</button>
                  <button onClick={() => eliminarSeg(seg.id)}
                    className="text-[10px] text-gray-700 hover:text-red-400 transition-colors px-1 py-1 rounded" title="Eliminar">×</button>
                </div>
              </div>
            );
          })}

          {/* Historial completados */}
          {completados.length > 0 && (
            <details className="group">
              <summary className="text-[10px] text-gray-700 hover:text-gray-500 cursor-pointer list-none flex items-center gap-1.5 py-1 select-none">
                <span className="group-open:rotate-90 transition-transform inline-block text-[8px]">▶</span>
                {completados.length} completado{completados.length !== 1 ? "s" : ""}
              </summary>
              <div className="mt-2 space-y-1.5 pl-3 border-l border-[#1a1a1a]">
                {completados.map(seg => (
                  <div key={seg.id} className="flex items-center gap-2 py-0.5">
                    <span className="text-[10px]">{TIPO_SEG.find(t => t.key === seg.canal)?.icon ?? "📌"}</span>
                    <span className="text-[10px] text-gray-700 line-through flex-1">{seg.titulo}</span>
                    <span className="text-[9px] text-gray-800">{seg.fechaCompletado ? new Date(seg.fechaCompletado).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : ""}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Modal: Agendar seguimiento */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Agendar seguimiento</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-600 hover:text-white text-xl leading-none">×</button>
            </div>

            {/* Tipo */}
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Tipo de contacto</p>
              <div className="grid grid-cols-2 gap-2">
                {TIPO_SEG.map(t => (
                  <button key={t.key} type="button" onClick={() => setTipo(t.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${tipo === t.key ? "border-[#B3985B]/50 bg-[#B3985B]/10 text-[#B3985B]" : "border-[#1e1e1e] bg-[#0d0d0d] text-gray-500 hover:border-[#2a2a2a] hover:text-gray-300"}`}
                  >
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fecha */}
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Fecha</p>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#B3985B]/50" />
            </div>

            {/* Nota opcional */}
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Nota <span className="normal-case text-gray-700">(opcional)</span></p>
              <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2}
                placeholder="¿Qué se va a hacer?"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-xl px-3 py-2.5 resize-none placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-500 text-sm hover:text-gray-300 transition-colors">
                Cancelar
              </button>
              <button onClick={agendar} disabled={saving || !fecha}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-bold hover:bg-[#c9a96a] transition-colors disabled:opacity-40">
                {saving ? "Guardando..." : "Agendar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón para agregar desde historial */}
      {segs.length > 0 && !showModal && (
        <button onClick={() => setShowModal(true)}
          className="w-full py-2 text-[10px] text-gray-700 hover:text-[#B3985B] border border-dashed border-[#1e1e1e] hover:border-[#B3985B]/30 rounded-xl transition-colors">
          + Agendar otro seguimiento
        </button>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TratoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Estado para modal de seguimientos (elevado al padre para evitar problemas con ref)
  const [showSegModal, setShowSegModal] = useState(false);

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
  type NurturingData = { etapa: string; log: NurturingLogEntry[]; notas?: Record<string, string>; pasosMarcados?: number[] };
  const NURTURING_EMPTY: NurturingData = { etapa: "PRIMER_CONTACTO", log: [], pasosMarcados: [] };
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
    subtipoEvento: "",
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
    equiposInteres: "",
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
    contactoDecisorNombre: "",
    contactoDecisorCargo: "",
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

  const PASOS_DISCOVERY = discForm.tipoServicio === "RENTA"
    ? PASOS_DISCOVERY_RENTA
    : discForm.tipoServicio === "DIRECCION_TECNICA"
    ? PASOS_DISCOVERY_DIR
    : PASOS_DISCOVERY_FULL;

  useEffect(() => {
    if (!scoutLoaded.current) { scoutLoaded.current = true; return; }
    autoSaveScouting(scoutingForm);
  }, [scoutingForm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist active step in localStorage — query param ?paso=N takes priority on first load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pasoFromUrl = searchParams.get("paso");
    if (pasoFromUrl) {
      // Query param tiene prioridad: ir al paso indicado
      setPasoActivo(parseInt(pasoFromUrl) || 1);
    } else {
      // Sin query param: restaurar desde localStorage
      const saved = localStorage.getItem(`trato-paso-${id}`);
      if (saved) setPasoActivo(parseInt(saved) || 1);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
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
            equiposInteres: t.equiposInteres ?? "",
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
            contactoDecisorNombre:  t.contactoDecisorNombre ?? "",
            contactoDecisorCargo:   t.contactoDecisorCargo ?? "",
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
      subtipoEvento: discForm.subtipoEvento || null,
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
      equiposInteres: discForm.equiposInteres || null,
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
    payload.contactoDecisorNombre = discForm.contactoDecisorNombre || null;
    payload.contactoDecisorCargo = discForm.contactoDecisorCargo || null;
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
        equiposInteres: form.equiposInteres || null,
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
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-12">
      <div className="mb-2"><BackButton /></div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mt-4">
      {/* ── LEFT COLUMN ── */}
      <div className="space-y-4 min-w-0">

      {/* ── Compact Header ── */}
      <div className="ms-card p-5">
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
            <h1 className="ms-h1 truncate">{trato.cliente.nombre}</h1>
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
          <Link
            href={`/crm/tratos/nuevo?clienteId=${trato.cliente.id}`}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-white border border-[#2a2a2a] hover:border-[#444] rounded-lg transition-colors"
          >
            + Otro trato
          </Link>
        </div>
      </div>

      {/* ═══ DIVIDER: PROPUESTA ECONÓMICA ══════════════════════════════ */}
      {trato._canViewFinances !== false && (
        <div className="flex items-center gap-3 px-1">
          <div className="w-5 h-5 rounded-md bg-[#B3985B]/15 border border-[#B3985B]/25 flex items-center justify-center shrink-0">
            <span className="text-[10px]">💰</span>
          </div>
          <span className="text-[10px] font-bold text-[#B3985B]/60 uppercase tracking-[0.12em]">Propuesta Económica</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#B3985B]/20 to-transparent" />
        </div>
      )}

      {/* ─── SECCIÓN: COTIZACIONES ─────────────────────────────────────── */}
      {trato._canViewFinances !== false && (
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden">
        {/* Header de sección */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center shrink-0">
              <span className="text-sm">💰</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Cotizaciones del proyecto</h2>
              <p className="text-[10px] text-gray-600 mt-0.5">{trato.cotizaciones.length} cotización{trato.cotizaciones.length !== 1 ? "es" : ""} · {fmt(trato.cotizaciones.reduce((s, c) => s + c.granTotal, 0))} total</p>
            </div>
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
        </div>{/* end header */}
        <div className="p-5">

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
                                {ESTADO_COT_LABELS[op.estado] ?? op.estado}
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
      </div>
      )}


      {/* ═══ DIVIDER: PROCESO COMERCIAL ══════════════════════════════ */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-5 h-5 rounded-md bg-blue-900/20 border border-blue-700/20 flex items-center justify-center shrink-0">
          <span className="text-[10px]">🔍</span>
        </div>
        <span className="text-[10px] font-bold text-blue-400/50 uppercase tracking-[0.12em]">Proceso Comercial</span>
        <div className="flex-1 h-px bg-gradient-to-r from-blue-800/20 to-transparent" />
      </div>





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
          FICHA DEL EVENTO
      ══════════════════════════════════════════════════════════════════════ */}
      {trato.tipoProspecto === "ACTIVO" && (() => {
        // Estado B — ficha recibida
        if (trato.briefRecibidoEn) {
          const fecha = new Date(trato.briefRecibidoEn).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

          return (
            <div className="bg-[#0d0d0d] border border-green-800/40 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center text-lg">✅</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">Ficha recibida</p>
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
                  <p className="text-white text-sm font-semibold">Ficha del evento</p>
                  <p className="text-[#555] text-xs">Comparte este link con el cliente para que llene los detalles de su evento</p>
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
          BRIEF TÉCNICO (DESCUBRIMIENTO)
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ══════════════════════════════════════════════════════════════════════
          MÓDULO DE PROSPECCIÓN (ETAPA: LEAD)
          Inbound: el cliente nos buscó → 3 contactos para calificar
          Outbound: nosotros los prospectamos → 5 contactos para generar interés
      ══════════════════════════════════════════════════════════════════════ */}
      {trato.etapa === "LEAD" && (() => {
        const esOutbound = trato.tipoLead === "OUTBOUND";
        const contactos = esOutbound ? CONTACTOS_OUTBOUND : CONTACTOS_INBOUND;
        const etapaKey = nurturing.etapa as keyof typeof NURTURING_PLAYBOOK;
        const nombre = trato.cliente.nombre.split(" ")[0];
        const ctx = { evento: trato.nombreEvento, fecha: trato.fechaEventoEstimada };
        const tel = trato.cliente.telefono?.replace(/\D/g, "");
        const num = tel ? (tel.startsWith("52") ? tel : `52${tel}`) : null;
        const origin = typeof window !== "undefined" ? window.location.origin : "https://mainstagepro.vercel.app";
        const COPY_ICON = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;

        // Presentaciones según tipo de evento
        const presentacionPrincipal: { label: string; url: string } | null =
          trato.tipoEvento === "MUSICAL"     ? { label: "🎸 Presentación Eventos Musicales",    url: `${origin}/presentacion/evento/musical` }
          : trato.tipoEvento === "SOCIAL"      ? { label: "🎊 Presentación Eventos Sociales",     url: `${origin}/presentacion/evento/social` }
          : trato.tipoEvento === "EMPRESARIAL" ? { label: "🏢 Presentación Eventos Empresariales", url: `${origin}/presentacion/evento/empresarial` }
          : null;
        const presentacionesSecundarias = [
          { label: "📋 Presentación de Servicios", url: `${origin}/presentacion/servicios` },
          { label: "🎛 Catálogo de Inventario",    url: `${origin}/presentacion/inventario` },
        ];

        // Guión WA según etapa del nurturing y tipo de evento
        const playbook = NURTURING_PLAYBOOK[etapaKey];
        const tipoEvKey = (trato.tipoEvento ?? "OTRO") as keyof NPlaybookEtapa["templates"];
        const tplsEvento = playbook?.templates[tipoEvKey] ?? playbook?.templates["OTRO"] ?? [];

        return (
          <div className={`bg-[#0d0d0d] border-2 rounded-xl overflow-hidden ${
            esOutbound ? "border-emerald-700/40" : "border-amber-700/30"
          }`}>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                  esOutbound ? "bg-emerald-700/20" : "bg-amber-700/20"
                }`}>{esOutbound ? "🌱" : "⚡"}</div>
                <div>
                  <p className="text-white font-bold text-base">Prospección</p>
                  <p className={`text-xs ${esOutbound ? "text-emerald-600" : "text-amber-600"}`}>
                    {esOutbound ? "Outbound · construye confianza, sé paciente" : `Inbound · ${ORIGEN_LABELS[trato.origenLead] ?? trato.origenLead}`}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const d = await patch({ tipoLead: esOutbound ? "INBOUND" : "OUTBOUND" });
                  if (d) setTrato(p => p ? { ...p, tipoLead: d.trato.tipoLead } : p);
                }}
                className="text-xs text-gray-700 hover:text-gray-400 transition-colors"
              >
                Cambiar a {esOutbound ? "inbound" : "outbound"}
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* ── Playbook de contactos ── */}
              <div className={`rounded-xl p-5 ${esOutbound ? "bg-[#0a1a0f] border border-emerald-900/40" : "bg-[#111a0a] border border-amber-900/30"}`}>
                {/* Progreso */}
                {(() => {
                  const completados = (nurturing.pasosMarcados ?? []).filter(n => contactos.some(c => c.num === n)).length;
                  const total = contactos.length;
                  const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
                  return (
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{esOutbound ? "🗺️" : "📋"}</span>
                        <p className="text-base font-bold text-white">
                          Plan de contactos {esOutbound ? "outbound" : "inbound"}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold tabular-nums ${completados === total ? (esOutbound ? "text-emerald-400" : "text-amber-400") : "text-gray-500"}`}>
                        {completados}/{total}
                      </span>
                    </div>
                  );
                })()}
                {/* Barra de progreso */}
                {(() => {
                  const completados = (nurturing.pasosMarcados ?? []).filter(n => contactos.some(c => c.num === n)).length;
                  const pct = contactos.length > 0 ? Math.round((completados / contactos.length) * 100) : 0;
                  return (
                    <div className="mb-3">
                      <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${esOutbound ? "bg-emerald-600" : "bg-amber-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
                <p className={`text-xs mb-4 leading-relaxed ${esOutbound ? "text-emerald-600" : "text-amber-600"}`}>
                  {esOutbound
                    ? "Sigue este orden para construir confianza y generar interés de forma progresiva."
                    : "El cliente ya llegó con intención. Estos contactos ayudan a calificar y avanzar al descubrimiento."}
                </p>

                <div className="space-y-2">
                  {contactos.map((c) => {
                    const marcado = (nurturing.pasosMarcados ?? []).includes(c.num);
                    return (
                      <button
                        key={c.num}
                        type="button"
                        onClick={() => {
                          const actuales = nurturing.pasosMarcados ?? [];
                          const nuevos = marcado
                            ? actuales.filter(n => n !== c.num)
                            : [...actuales, c.num];
                          const u = { ...nurturing, pasosMarcados: nuevos };
                          setNurturing(u);
                          guardarNurturing(u);
                        }}
                        className={`w-full text-left rounded-xl p-4 border transition-all ${
                          marcado
                            ? esOutbound
                              ? "bg-emerald-950/40 border-emerald-700/50"
                              : "bg-amber-950/30 border-amber-700/40"
                            : "bg-[#111] border-[#1e1e1e] hover:border-[#333]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                            marcado
                              ? esOutbound ? "bg-emerald-700/60 text-emerald-200" : "bg-amber-700/60 text-amber-200"
                              : esOutbound ? "bg-emerald-900/40 text-emerald-600" : "bg-amber-900/40 text-amber-600"
                          }`}>
                            {marcado ? "✓" : c.num}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold mb-0.5 ${
                              marcado ? (esOutbound ? "text-emerald-300 line-through" : "text-amber-300 line-through") : "text-white"
                            }`}>{c.label}</p>
                            <p className="text-xs text-gray-500 leading-relaxed">{c.objetivo}</p>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            marcado
                              ? esOutbound ? "bg-emerald-600 border-emerald-500" : "bg-amber-600 border-amber-500"
                              : "border-[#444]"
                          }`}>
                            {marcado && <span className="text-[9px] text-black font-bold">✓</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Marcar todos */}
                {(() => {
                  const completadosLocal = (nurturing.pasosMarcados ?? []).filter(n => contactos.some(c => c.num === n)).length;
                  if (completadosLocal === contactos.length) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const todos = contactos.map(c => c.num);
                        const u = { ...nurturing, pasosMarcados: todos };
                        setNurturing(u);
                        guardarNurturing(u);
                      }}
                      className="mt-3 w-full py-2 text-[11px] text-gray-600 hover:text-white border border-dashed border-[#2a2a2a] hover:border-[#444] rounded-xl transition-colors"
                    >
                      ✓ Marcar todos como realizados
                    </button>
                  );
                })()}
              </div>

              {/* ── Guión WA ── */}
              {esOutbound && tplsEvento.length > 0 && (() => {
                const tpl = tplsEvento[0];
                const msg = tpl.msg(nombre, ctx);
                const yaEnviado = nurturing.log.some(l => l.templateId === tpl.id);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-base font-bold text-white">Guión de contacto</p>
                      {!num && <span className="text-[10px] text-orange-400">Sin teléfono</span>}
                    </div>
                    <div className={`bg-[#111] border rounded-xl overflow-hidden ${yaEnviado ? "border-emerald-900/60" : "border-[#222]"}`}>
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-300">{tpl.icon} {tpl.label}</span>
                          {yaEnviado && <span className="text-[10px] text-emerald-600 bg-emerald-900/20 border border-emerald-900/40 px-1.5 py-0.5 rounded">✓ Enviado</span>}
                        </div>
                        {num ? (
                          <a href={`https://wa.me/${num}?text=${encodeURIComponent(msg)}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={() => registrarEnvioWA(tpl.id, tpl.label)}
                            className="flex items-center gap-1.5 bg-green-900/30 hover:bg-green-800/50 border border-green-700/40 text-green-400 text-xs px-3 py-1.5 rounded-lg transition-colors">
                            {WA_ICON} {yaEnviado ? "Reenviar" : "Enviar WA"}
                          </a>
                        ) : <span className="text-[10px] text-gray-600">Sin teléfono</span>}
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line">{msg}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Qué compartir (inbound) ── */}
              {!esOutbound && (presentacionPrincipal ?? presentacionesSecundarias[0]) && (
                <div>
                  <p className="text-xs font-bold text-[#B3985B] uppercase tracking-widest mb-2">Material para compartir</p>
                  <button
                    onClick={() => navigator.clipboard.writeText((presentacionPrincipal ?? presentacionesSecundarias[0]).url)}
                    className="w-full flex items-center justify-between gap-2 bg-[#B3985B]/10 border border-[#B3985B]/30 rounded-xl px-3 py-2.5 mb-2 text-left hover:bg-[#B3985B]/15 transition-colors">
                    <span className="text-sm text-white font-medium">{(presentacionPrincipal ?? presentacionesSecundarias[0]).label}</span>
                    <div className="flex items-center gap-1 text-[#B3985B] text-[10px] shrink-0">{COPY_ICON}<span>Copiar</span></div>
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {(presentacionPrincipal ? presentacionesSecundarias : presentacionesSecundarias.slice(1)).map(p => (
                      <button key={p.url} onClick={() => navigator.clipboard.writeText(p.url)}
                        className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 bg-[#111] border border-[#2a2a2a] hover:border-[#444] px-2 py-1 rounded-lg transition-colors">
                        <span>{p.label}</span>{COPY_ICON}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Actividad y notas ── */}
              <div>
                <p className="text-base font-bold text-white mb-1">Notas de seguimiento</p>
                <p className="text-xs text-gray-500 mb-3">Registra respuestas, avances, solicitudes o cualquier dato relevante.</p>
                <textarea
                  key={etapaKey}
                  defaultValue={nurturing.notas?.[etapaKey] ?? ""}
                  onBlur={e => {
                    const notas = { ...(nurturing.notas ?? {}), [etapaKey]: e.target.value };
                    const u = { ...nurturing, notas };
                    setNurturing(u);
                    guardarNurturing(u);
                  }}
                  rows={3}
                  placeholder={`Ej: Respondió el ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, mostró interés en audio...`}
                  className={`w-full bg-[#111] border hover:border-[#333] rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none placeholder-gray-700 transition-colors ${
                    esOutbound ? "border-[#222] focus:border-emerald-700/60" : "border-[#222] focus:border-amber-700/60"
                  }`}
                />
              </div>

              {/* ── Historial de mensajes ── */}
              {nurturing.log.length > 0 && (
                <div className="border-t border-[#1a1a1a] pt-4">
                  <p className="text-sm font-bold text-white mb-3">Historial de contactos <span className="text-gray-600 font-normal text-xs">({nurturing.log.length})</span></p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {[...nurturing.log].reverse().map((entry, i) => {
                      const etapaInfo = NURTURING_ETAPAS.find(e => e.id === entry.etapa);
                      return (
                        <div key={i} className="flex items-center gap-3 text-xs bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2">
                          <span className="text-gray-600 shrink-0 tabular-nums">{entry.fecha}</span>
                          <span className="text-base shrink-0">{etapaInfo?.icon ?? "💬"}</span>
                          <span className="text-gray-300 font-medium flex-1 min-w-0 truncate">{entry.templateLabel}</span>
                          <span className="text-[10px] text-green-600 shrink-0">✓ WA</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── CTA: Avanzar al siguiente paso ── */}
              <div className="border-t border-[#1a1a1a] pt-5">
                <p className="text-sm font-bold text-white mb-1">¿Listo para avanzar?</p>
                <p className="text-gray-600 text-xs mb-4">
                  {esOutbound
                    ? "Cuando el prospecto muestre interés en un evento concreto, inicia el descubrimiento."
                    : "Cuando tengas suficiente información del cliente, inicia el descubrimiento de necesidades."}
                </p>
                <button
                  onClick={async () => {
                    const d = await patch({ etapa: "DESCUBRIMIENTO", tipoProspecto: "ACTIVO", canalAtencion: null });
                    if (d) { setTrato(p => p ? { ...p, ...d.trato } : p); setPasoActivo(1); }
                  }}
                  disabled={saving}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black transition-colors disabled:opacity-40"
                >
                  🔍 Iniciar descubrimiento de necesidades →
                </button>
              </div>

            </div>
          </div>
        );
      })()}


      
      {/* ═══ WIZARD DE DESCUBRIMIENTO (LINK) ══════════════════════════════ */}
      {trato.etapa !== "LEAD" && trato.etapa !== "VENTA_PERDIDA" && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 text-center space-y-4 my-8 ms-card-deep">
          <div className="w-12 h-12 mx-auto rounded-full bg-violet-900/20 border border-violet-800/30 flex items-center justify-center text-2xl">
            🎯
          </div>
          <div>
            <p className="text-white font-bold text-lg">Descubrimiento y Brief Técnico</p>
            <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">Toda la información técnica del evento, formularios del cliente y selección de equipo ahora se gestionan centralmente en el Wizard del trato.</p>
          </div>
          <Link
            href={`/crm/tratos/${id}/wizard`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-700/20 hover:bg-violet-700/30 border border-violet-700/40 text-violet-300 font-bold transition-colors"
          >
            Abrir Wizard de Descubrimiento →
          </Link>
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

      {/* ═══ DIVIDER: SEGUIMIENTO COMERCIAL ═════════════════════════ */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-5 h-5 rounded-md bg-blue-900/20 border border-blue-700/20 flex items-center justify-center shrink-0">
          <span className="text-[10px]">📅</span>
        </div>
        <span className="text-[10px] font-bold text-blue-400/50 uppercase tracking-[0.12em]">Agenda & Seguimiento</span>
        <div className="flex-1 h-px bg-gradient-to-r from-blue-800/20 to-transparent" />
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          SECCIÓN: SEGUIMIENTOS
      ───────────────────────────────────────────────────────────────── */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden">
        {/* Header de sección */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-900/20 border border-blue-800/30 flex items-center justify-center shrink-0">
              <span className="text-sm">📅</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Seguimientos</h2>
              <p className="text-[10px] text-gray-600 mt-0.5">Historial y próximas acciones</p>
            </div>
          </div>
          <button
            onClick={() => setShowSegModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B3985B] text-black text-xs font-bold rounded-lg hover:bg-[#c9a96a] transition-colors"
          >
            + Agendar
          </button>
        </div>
        <div className="p-5">
          <SeguimientosPanel
            tratoId={trato.id}
            telefono={trato.cliente.telefono ?? null}
            showModal={showSegModal}
            setShowModal={setShowSegModal}
          />
        </div>
      </div>

      </div> {/* end left column */}

      {/* ── RIGHT COLUMN ── */}
      <div className="space-y-4 lg:sticky lg:top-6 self-start">
        {/* Client card */}
        <div className="ms-stat-card">
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

        {/* Responsable card */}
        {(() => {
          const patchResponsable = async (uid: string | null) => {
            const u = uid ? usuarios.find(u => u.id === uid) ?? null : null;
            setTrato(prev => prev ? { ...prev, responsableId: uid, responsable: u ? { id: u.id, name: u.name } : null } : prev);
            await fetch(`/api/tratos/${trato.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ responsableId: uid }),
            });
          };
          return (
            <div className="ms-stat-card">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Responsable</p>
              {trato.responsable ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#B3985B]/15 border border-[#B3985B]/30 flex items-center justify-center text-[11px] text-[#B3985B] font-bold shrink-0">
                    {trato.responsable.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm font-medium flex-1 truncate">{trato.responsable.name}</span>
                  {usuarios.length > 0 && (
                    <select
                      value={trato.responsable.id}
                      onChange={e => patchResponsable(e.target.value || null)}
                      onClick={e => e.stopPropagation()}
                      className="bg-transparent border-none text-[10px] text-gray-600 hover:text-gray-400 focus:outline-none cursor-pointer transition-colors"
                      title="Cambiar responsable"
                    >
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id} className="bg-[#111] text-white">{u.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  {usuarios.length > 0 ? (
                    <select
                      value=""
                      onChange={e => { if (e.target.value) patchResponsable(e.target.value); }}
                      className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1.5 text-[12px] text-gray-500 focus:outline-none focus:border-[#B3985B]/40 cursor-pointer"
                    >
                      <option value="">— Sin asignar —</option>
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id} className="bg-[#111] text-white">{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-700 text-xs">Sin asignar</span>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Event info */}

        {(() => {
          // ── Fecha autoritativa: priorizar la primera cotización si existe
          const cotPrincipal = trato.cotizaciones[0];
          const fechaAutoritativa = cotPrincipal?.fechaEvento ?? trato.fechaEventoEstimada;
          const fechaDesde = cotPrincipal?.fechaEvento ? 'cotizacion' : 'estimada';
          const lugarAutoritativo = cotPrincipal?.lugarEvento ?? trato.lugarEstimado;
          const hayInfo = fechaAutoritativa || lugarAutoritativo || trato.presupuestoEstimado || trato.tipoEvento;
          if (!hayInfo) return null;

          // Extraer tipoServicio del brief si existe
          let tipoServicio = "";
          try {
            const dbForm = (trato as any).brief ? JSON.parse((trato as any).brief) : {};
            if (dbForm.tipoServicio) {
              tipoServicio = dbForm.tipoServicio === "RENTA" ? "Renta de Equipo" : 
                             dbForm.tipoServicio === "PRODUCCION_TECNICA" ? "Operación Técnica" : 
                             dbForm.tipoServicio === "DIRECCION_TECNICA" ? "Dirección Técnica" : dbForm.tipoServicio;
            }
          } catch (e) {}

          return (
            <div className="ms-stat-card space-y-2">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#1a1a1a]">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Detalles del Evento</p>
                {fechaDesde === 'cotizacion' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/20 border border-emerald-800/30 text-emerald-400">Confirmado</span>
                )}
              </div>
              {trato.tipoEvento && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-700 text-xs shrink-0">🎫</span>
                  <p className="text-gray-300 text-xs capitalize">{trato.tipoEvento.toLowerCase()}</p>
                </div>
              )}
              {tipoServicio && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-700 text-xs shrink-0">⚙️</span>
                  <p className="text-[#B3985B] text-xs">{tipoServicio}</p>
                </div>
              )}
              {fechaAutoritativa && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-700 text-xs shrink-0">📅</span>
                  <p className="text-gray-300 text-xs">
                    {fmtFechaEvento(fechaAutoritativa)}
                  </p>
                </div>
              )}
              {lugarAutoritativo && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-700 text-xs shrink-0">📍</span>
                  <p className="text-gray-300 text-xs">{lugarAutoritativo}</p>
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
          );
        })()}

        {/* Registro del trato */}
        <div className="ms-card px-4 py-3 flex items-center gap-2">
          <span className="text-gray-700 text-xs">🗓</span>
          <span className="text-[10px] text-gray-600">Registro del trato:</span>
          <span className="text-gray-500 text-[10px] font-medium">
            {new Date(trato.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Proyecto vinculado — rich card con stepper de estado */}
        {(() => {
          const cotConProy = trato.cotizaciones.find(c => c.proyecto);
          const proy = cotConProy?.proyecto;
          if (!proy) return null;

          const PASOS = [
            { key: 'PLANEACION', label: 'Plan.' },
            { key: 'CONFIRMADO', label: 'Conf.' },
            { key: 'ACTIVO',     label: 'Prod.' },
            { key: 'EN_CURSO',   label: 'Curso' },
            { key: 'COMPLETADO', label: 'Listo' },
          ];
          const ESTADO_COLORS: Record<string, { pill: string; dot: string }> = {
            PLANEACION:  { pill: 'text-amber-400 bg-amber-900/20 border-amber-800/30',       dot: 'bg-amber-400' },
            CONFIRMADO:  { pill: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/30', dot: 'bg-emerald-400' },
            ACTIVO:      { pill: 'text-blue-400 bg-blue-900/20 border-blue-800/30',          dot: 'bg-blue-400' },
            EN_CURSO:    { pill: 'text-violet-400 bg-violet-900/20 border-violet-800/30',    dot: 'bg-violet-400' },
            COMPLETADO:  { pill: 'text-gray-400 bg-gray-800/20 border-gray-700/30',          dot: 'bg-gray-400' },
            CANCELADO:   { pill: 'text-red-400 bg-red-900/20 border-red-800/30',             dot: 'bg-red-400' },
          };
          const ec = ESTADO_COLORS[proy.estado] ?? ESTADO_COLORS.PLANEACION;
          const pasoActual = PASOS.findIndex(p => p.key === proy.estado);
          const labelActual = proy.estado === 'ACTIVO' ? 'Producción' : proy.estado === 'EN_CURSO' ? 'En curso' : proy.estado === 'PLANEACION' ? 'Planeación' : proy.estado === 'CONFIRMADO' ? 'Confirmado' : proy.estado === 'COMPLETADO' ? 'Completado' : proy.estado;

          const fechaProy = proy.fechaEvento
            ? new Date(proy.fechaEvento.substring(0, 10) + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
            : null;

          return (
            <div className="bg-[#080d09] border border-emerald-900/40 rounded-2xl overflow-hidden">
              {/* Accent strip */}
              <div className="h-[2px] w-full bg-gradient-to-r from-emerald-700/70 via-emerald-600/30 to-transparent" />
              {/* Header */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-900/30 border border-emerald-800/30 flex items-center justify-center">
                    <span className="text-[11px]">🎬</span>
                  </div>
                  <p className="text-[10px] text-emerald-500/60 uppercase tracking-wider font-bold">Proyecto</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${ec.pill}`}>
                  {labelActual}
                </span>
              </div>
              {/* Name */}
              <div className="px-4 pb-2">
                <p className="text-white text-sm font-semibold leading-tight">{proy.nombre || trato.nombreEvento || trato.cliente.nombre}</p>
                <p className="text-gray-600 text-[10px] mt-0.5 font-mono">{proy.numeroProyecto}</p>
              </div>
              {/* Progress stepper */}
              {proy.estado !== 'CANCELADO' && (
                <div className="px-4 pb-3">
                  <div className="flex items-start w-full">
                    {PASOS.map((paso, i) => {
                      const done = i < pasoActual;
                      const active = i === pasoActual;
                      return (
                        <div key={paso.key} className="flex items-start flex-1">
                          <div className="flex flex-col items-center gap-1 flex-1">
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                              active ? `${ec.dot} border-transparent` :
                              done ? 'bg-emerald-800/50 border-emerald-700/40' :
                              'bg-[#1a1a1a] border-[#252525]'
                            }`}>
                              {done && <span className="text-emerald-400 text-[7px] leading-none">✓</span>}
                            </div>
                            <span className={`text-[7px] font-medium text-center w-full px-0.5 truncate ${active ? 'text-emerald-400' : done ? 'text-emerald-700/60' : 'text-gray-700'}`}>
                              {paso.label}
                            </span>
                          </div>
                          {i < PASOS.length - 1 && (
                            <div className={`h-px mt-[7px] shrink-0 w-2 ${done ? 'bg-emerald-700/40' : 'bg-[#1e1e1e]'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Meta */}
              <div className="px-4 pb-3 space-y-1">
                {fechaProy && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-900/60 text-[10px]">📅</span>
                    <p className="text-gray-500 text-[10px]">{fechaProy}</p>
                  </div>
                )}
                {proy.lugarEvento && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-900/60 text-[10px]">📍</span>
                    <p className="text-gray-500 text-[10px] truncate">{proy.lugarEvento}</p>
                  </div>
                )}
              </div>
              {/* CTA */}
              <div className="px-3 pb-3">
                <a
                  href={`/proyectos/${proy.id}`}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-emerald-900/15 border border-emerald-800/30 text-emerald-400 hover:bg-emerald-900/25 hover:border-emerald-700/50 text-xs font-semibold transition-all"
                >
                  Ver proyecto completo →
                </a>
              </div>
            </div>
          );
        })()}

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

      {/* ── Botón: Nuevo trato con este cliente ── */}
      <div className="flex items-center justify-center pt-4 pb-2">
        <a
          href={`/crm/tratos/nuevo?clienteId=${trato.cliente.id}`}
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-lg px-3 py-2"
        >
          <span>+</span>
          <span>Nuevo trato con {trato.cliente.nombre.split(" ")[0]}</span>
        </a>
      </div>

      {CelebrationToastEl}
    </div>
  );
}

