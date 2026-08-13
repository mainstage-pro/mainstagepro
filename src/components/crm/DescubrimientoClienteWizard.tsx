"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  PartyPopper, Music, Building2, Sparkles, Check, ChevronRight, ChevronLeft,
  Wand2, Wrench, ClipboardCheck, Star, HelpCircle, Loader2,
  Mic, Monitor, Disc3, Lightbulb, Zap, Volume2, Boxes, Languages,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { preguntasVisibles } from "@/lib/descubrimiento";

// ─── Formulario público del cliente (3 pantallas con barra de progreso) ──────
// Reemplaza al DiscoveryForm en modo cliente SOLO en /descubrimiento/[token].
// Escribe a los MISMOS campos del trato vía /api/f/[token] (POST _discoveryMode),
// con guardado parcial por pantalla. NUNCA muestra precios de costo, subrentas,
// márgenes, proveedores ni notas internas. Todo es sugerencia; nada obliga.

type TipoCat = { slug: string; nombre: string; emoji: string | null; subtitulo: string | null; orden: number };
type NichoCat = { id: string; tipoEventoSlug: string; nombre: string; slug: string; descripcion: string | null; orden: number };
type AdicionalCat = { id: string; nombre: string; descripcion: string | null; tiposEvento: string; nichos: string | null; frecuencia: string; imagenUrl: string | null; orden: number };
type PreguntaCat = { id: string; texto: string; tipoRespuesta: string; opciones: string | null; nichos: string | null; alcance?: string | null; tipoEventoSlug?: string | null; bloque?: string | null; obligatoria?: boolean; preguntaPadreId?: string | null; condicionValor?: string | null; orden: number };
type RangoCat = { id: string; label: string; orden: number };

type Catalogo = { tipos: TipoCat[]; nichos: NichoCat[]; adicionales: AdicionalCat[]; preguntas: PreguntaCat[]; rangos: RangoCat[] };

type Contacto = { nombre: string; whatsapp: string; correo: string; momentoContratacion: string };

// Paquete asignado por el vendedor + adicionales que sugiere (bloque "Tu paquete").
type PaquetePresentado = {
  id: string;
  nombre: string;
  resumen: string | null;
  rangoPersonas: string | null;
  portada: string | null;
  adicionales: { id: string; nombre: string; descripcion: string | null; imagenUrl: string | null }[];
};

// Tope numérico de un label de rango ("500-800" → 800).
function rangoMax(label: string): number {
  const nums = label.match(/\d+/g);
  return nums && nums.length ? Math.max(...nums.map(Number)) : 0;
}
function jsonArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}
function jsonObj(s: string | null | undefined): Record<string, string> {
  if (!s) return {};
  try { const v = JSON.parse(s); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
// Las respuestas pueden venir como string plano (legacy) o como envelope de
// trazabilidad {valor, origen, ts}. Extrae solo el valor para editar en cliente.
function valoresRespuestas(s: string | null | undefined): Record<string, string> {
  const raw = jsonObj(s);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
    else if (v && typeof v === "object") out[k] = String((v as { valor?: unknown }).valor ?? "");
  }
  return out;
}

// Ícono representativo por adicional (cuando no hay imagen). Se elige por palabra
// clave del nombre; siempre devuelve algo visible para no dejar la tarjeta vacía.
function iconoAdicional(nombre: string): LucideIcon {
  const n = nombre.toLowerCase();
  if (/(planta de luz|energ|ups|corriente)/.test(n)) return Zap;
  if (/(audio|backline|monitoreo|in-ear|delay|intercom|sonido)/.test(n)) return Volume2;
  if (/(micr|ceremonia|brindis|traducc)/.test(n)) return /traducc/.test(n) ? Languages : Mic;
  if (/(pantalla|led|video|proyec|switcher|streaming|cctv|teleprompter|retorno)/.test(n)) return Monitor;
  if (/(dj|reproductores|mixer)/.test(n)) return Disc3;
  if (/(luz|ilumina|washes|pinspot|bruma|gobos|hazer)/.test(n)) return Lightbulb;
  if (/(chispero|bazuca|confeti|impacto)/.test(n)) return Sparkles;
  if (/(layher|ground|rigging|estructura|templete|tarima|pista|riser)/.test(n)) return Boxes;
  return Sparkles;
}

// Fuente de servicio expresada por RESULTADO (no por jerga técnica).
const SERVICIOS = [
  { value: "PRODUCCION_TECNICA", titulo: "Producción completa", desc: "Quiero que todo suene y se vea increíble. Ustedes se encargan de todo.", icon: Wand2 },
  { value: "RENTA",             titulo: "Renta de equipo",     desc: "Solo necesito rentar equipo para mi evento.", icon: Wrench },
  { value: "DIRECCION_TECNICA", titulo: "Dirección técnica",   desc: "Ya tengo equipo o proveedores, necesito quien dirija la producción.", icon: ClipboardCheck },
];

// Bandas de presupuesto (rangos, nunca cifra exacta). Guardamos el tope como referencia.
const PRESUPUESTOS = [
  { label: "Menos de $30,000", value: 30000 },
  { label: "$30,000 – $60,000", value: 60000 },
  { label: "$60,000 – $120,000", value: 120000 },
  { label: "$120,000 – $250,000", value: 250000 },
  { label: "Más de $250,000", value: 400000 },
  { label: "Aún no lo sé", value: 0 },
];

// Iconos por tipo de evento (fallback al emoji del catálogo).
const TIPO_ICON: Record<string, typeof Music> = {
  MUSICAL: Music, SOCIAL: PartyPopper, EMPRESARIAL: Building2, OTRO: Sparkles,
};

export default function DescubrimientoClienteWizard({
  token, trato, huerfano = false, contacto, setContacto, onComplete, paquetePresentado = null,
}: {
  token: string;
  trato: any;
  huerfano?: boolean;
  contacto?: Contacto;
  setContacto?: Dispatch<SetStateAction<Contacto>>;
  onComplete?: () => void;
  paquetePresentado?: PaquetePresentado | null;
}) {
  const toast = useToast();
  const [cat, setCat] = useState<Catalogo | null>(null);
  const [paso, setPaso] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // ── Estado del formulario (prefill desde el trato) ──
  const [tipoEvento, setTipoEvento] = useState<string>(trato?.tipoEvento || "");
  const [nichoSlug, setNichoSlug] = useState<string>(trato?.nichoSlug || "");
  const [subtipoEvento, setSubtipoEvento] = useState<string>(trato?.subtipoEvento || "");
  const [nombreEvento, setNombreEvento] = useState<string>(trato?.nombreEvento || "");
  const [lugar, setLugar] = useState<string>(trato?.lugarEstimado || "");
  const [fecha, setFecha] = useState<string>(
    trato?.fechaEventoEstimada ? String(trato.fechaEventoEstimada).slice(0, 10) : ""
  );
  const [asistentes, setAsistentes] = useState<number | "">(trato?.asistentesEstimados ?? "");
  const [tipoServicio, setTipoServicio] = useState<string>(trato?.tipoServicio || "");
  const [respuestas, setRespuestas] = useState<Record<string, string>>(() => valoresRespuestas(trato?.respuestasDescubrimiento));
  const [adicionales, setAdicionales] = useState<string[]>(() => jsonArr(trato?.adicionalesSeleccionados));
  const [notas, setNotas] = useState<string>(trato?.notas || "");
  const [presupuesto, setPresupuesto] = useState<number | "">(trato?.presupuestoEstimado ?? "");

  // Carga del catálogo público (sin auth).
  useEffect(() => {
    let cancel = false;
    fetch("/api/catalogo/publico")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancel && d) setCat(d); })
      .catch(() => { /* si falla, el paso 1 muestra un fallback mínimo */ });
    return () => { cancel = true; };
  }, []);

  const nichosDelTipo = useMemo(
    () => (cat?.nichos || []).filter(n => n.tipoEventoSlug === tipoEvento),
    [cat, tipoEvento]
  );
  const preguntasDelNicho = useMemo(() => {
    if (!cat) return [];
    return preguntasVisibles(cat.preguntas, tipoEvento, nichoSlug, respuestas).slice(0, 10);
  }, [cat, tipoEvento, nichoSlug, respuestas]);
  // IDs de adicionales que ya vienen en el bloque "Tu paquete": se excluyen del
  // grid genérico para no mostrarlos dos veces.
  const idsDelPaquete = useMemo(
    () => new Set((paquetePresentado?.adicionales || []).map(a => a.id)),
    [paquetePresentado]
  );
  const adicionalesDelContexto = useMemo(() => {
    if (!cat || !tipoEvento) return [];
    return cat.adicionales.filter(a => {
      if (idsDelPaquete.has(a.id)) return false;
      const tipos = jsonArr(a.tiposEvento);
      const nichosA = jsonArr(a.nichos);
      return tipos.includes(tipoEvento) && (nichosA.length === 0 || (nichoSlug && nichosA.includes(nichoSlug)));
    });
  }, [cat, tipoEvento, nichoSlug, idsDelPaquete]);

  const rangos = useMemo(() => {
    const list = (cat?.rangos || []).map(r => ({ label: r.label, value: rangoMax(r.label) })).filter(r => r.value > 0);
    return list.length ? list : [
      { label: "0-100", value: 100 }, { label: "100-200", value: 200 }, { label: "200-300", value: 300 },
      { label: "300-500", value: 500 }, { label: "500-800", value: 800 }, { label: "800-1000", value: 1000 },
      { label: "2000-2500", value: 2500 }, { label: "2500-3000", value: 3000 },
    ];
  }, [cat]);

  // ── Guardado ──
  function buildPayload(final: boolean) {
    const p: Record<string, unknown> = {
      _discoveryMode: true,
      tipoEvento: tipoEvento || null,
      subtipoEvento: subtipoEvento || null,
      nichoSlug: nichoSlug || null,
      nombreEvento: nombreEvento || null,
      lugarEstimado: lugar || null,
      fechaEventoEstimada: fecha || null,
      asistentesEstimados: asistentes === "" ? null : asistentes,
      tipoServicio: tipoServicio || null,
      presupuestoEstimado: presupuesto === "" || presupuesto === 0 ? null : presupuesto,
      notas: notas || null,
      respuestasDescubrimiento: (() => {
        const claves = Object.keys(respuestas).filter(k => respuestas[k]);
        if (!claves.length) return null;
        const ts = new Date().toISOString();
        // Trazabilidad: se marca origen "cliente"; el backend no sobrescribe lo del vendedor.
        return JSON.stringify(Object.fromEntries(claves.map(k => [k, { valor: respuestas[k], origen: "cliente", ts }])));
      })(),
      adicionalesSeleccionados: adicionales.length ? JSON.stringify(adicionales) : null,
    };
    if (final) {
      p._final = true;
      if (huerfano && contacto) {
        p.nombreContacto = contacto.nombre?.trim() || null;
        p.telefonoContacto = contacto.whatsapp?.trim() || null;
        p.correoContacto = contacto.correo?.trim() || null;
        p.momentoContratacion = contacto.momentoContratacion || null;
      }
    }
    return p;
  }

  async function guardarParcial() {
    setGuardando(true);
    try {
      await fetch(`/api/f/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(false)),
        keepalive: true,
      });
    } catch { /* el guardado parcial es best-effort */ }
    finally { setGuardando(false); }
  }

  async function enviar() {
    if (huerfano) {
      const nombre = (contacto?.nombre || "").trim();
      const whatsapp = (contacto?.whatsapp || "").trim();
      if (!nombre || !whatsapp) { toast.error("Escribe tu nombre y WhatsApp para enviar."); return; }
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/f/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(true)),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d?.error || "No se pudo enviar. Intenta de nuevo."); setEnviando(false); return; }
      onComplete?.();
    } catch {
      toast.error("Error de conexión. Intenta de nuevo.");
      setEnviando(false);
    }
  }

  function avanzar() {
    guardarParcial();
    setPaso(p => Math.min(3, p + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function retroceder() {
    setPaso(p => Math.max(1, p - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const puedeAvanzar1 = Boolean(tipoEvento) && (!huerfano || (contacto?.nombre?.trim() && contacto?.whatsapp?.trim()));

  // Tipos con fallback si el catálogo no cargó.
  const tipos: TipoCat[] = cat?.tipos.length ? cat.tipos : [
    { slug: "musical", nombre: "Musical", emoji: "🎵", subtitulo: "Conciertos · Festivales · DJ", orden: 0 },
    { slug: "social", nombre: "Social", emoji: "🥂", subtitulo: "Bodas · XV · Fiestas", orden: 1 },
    { slug: "empresarial", nombre: "Empresarial", emoji: "🏢", subtitulo: "Congresos · Lanzamientos", orden: 2 },
    { slug: "otro", nombre: "Otro", emoji: "✨", subtitulo: "Cualquier otro evento", orden: 3 },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de progreso */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white text-sm font-semibold">
            {paso === 1 ? "Tu evento" : paso === 2 ? "¿Qué necesitas?" : "Opciones para tu evento"}
          </p>
          <p className="text-gray-500 text-xs">Paso {paso} de 3</p>
        </div>
        <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div className="h-full bg-[#B3985B] transition-all duration-300" style={{ width: `${(paso / 3) * 100}%` }} />
        </div>
      </div>

      {/* ══ PANTALLA 1 — Tu evento ══ */}
      {paso === 1 && (
        <div className="space-y-5">
          {huerfano && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
              <p className="text-sm text-white font-semibold">Tus datos de contacto</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Nombre *</label>
                  <input type="text" value={contacto?.nombre || ""}
                    onChange={e => setContacto?.({ ...(contacto as Contacto), nombre: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">WhatsApp *</label>
                  <input type="tel" value={contacto?.whatsapp || ""}
                    onChange={e => setContacto?.({ ...(contacto as Contacto), whatsapp: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 block mb-1">Correo (opcional)</label>
                  <input type="email" value={contacto?.correo || ""}
                    onChange={e => setContacto?.({ ...(contacto as Contacto), correo: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-white font-semibold block mb-3">¿Qué tipo de evento es?</label>
            <div className="grid grid-cols-2 gap-3">
              {tipos.map(t => {
                const legacy = t.slug.toUpperCase();
                const activo = tipoEvento === legacy;
                const Icon = TIPO_ICON[legacy] || Sparkles;
                return (
                  <button key={t.slug} type="button"
                    onClick={() => { setTipoEvento(legacy); setNichoSlug(""); setSubtipoEvento(""); }}
                    className={`text-left p-4 rounded-xl border transition-all ${activo ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#222] bg-[#111] hover:border-[#444]"}`}>
                    <Icon strokeWidth={1.75} className={`w-6 h-6 mb-2 ${activo ? "text-[#B3985B]" : "text-gray-500"}`} />
                    <p className={`text-sm font-semibold ${activo ? "text-[#B3985B]" : "text-white"}`}>{t.nombre}</p>
                    {t.subtitulo && <p className="text-[11px] text-gray-500 mt-0.5">{t.subtitulo}</p>}
                  </button>
                );
              })}
            </div>
          </div>

          {tipoEvento && nichosDelTipo.length > 0 && (
            <div>
              <label className="text-sm text-white font-semibold block mb-3">¿Cuál describe mejor tu evento?</label>
              <div className="flex flex-wrap gap-2">
                {nichosDelTipo.map(n => {
                  const activo = nichoSlug === n.slug;
                  return (
                    <button key={n.id} type="button"
                      onClick={() => { setNichoSlug(n.slug); setSubtipoEvento(n.nombre); }}
                      className={`px-3.5 py-2 rounded-lg border text-sm transition-all ${activo ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]" : "border-[#222] bg-[#111] text-gray-300 hover:border-[#444]"}`}>
                      {n.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Nombre del evento (opcional)</label>
              <input type="text" value={nombreEvento} onChange={e => setNombreEvento(e.target.value)}
                placeholder="Ej. Boda Ana & Luis"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Fecha tentativa</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Lugar o ciudad</label>
              <input type="text" value={lugar} onChange={e => setLugar(e.target.value)}
                placeholder="Ej. Salón Jardín, León"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Número de asistentes</label>
              <select value={asistentes} onChange={e => setAsistentes(e.target.value ? Number(e.target.value) : "")}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">— Selecciona —</option>
                {rangos.map(r => <option key={r.label} value={r.value}>{r.label} personas</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="button" disabled={!puedeAvanzar1} onClick={avanzar}
              className="inline-flex items-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              Continuar <ChevronRight strokeWidth={2} className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══ PANTALLA 2 — ¿Qué necesitas? ══ */}
      {paso === 2 && (
        <div className="space-y-6">
          <div>
            <label className="text-sm text-white font-semibold block mb-3">¿Cómo te podemos ayudar?</label>
            <div className="space-y-2.5">
              {SERVICIOS.map(s => {
                const activo = tipoServicio === s.value;
                return (
                  <button key={s.value} type="button"
                    onClick={() => setTipoServicio(activo ? "" : s.value)}
                    className={`w-full text-left p-4 rounded-xl border flex items-start gap-3 transition-all ${activo ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#222] bg-[#111] hover:border-[#444]"}`}>
                    <s.icon strokeWidth={1.75} className={`w-5 h-5 mt-0.5 shrink-0 ${activo ? "text-[#B3985B]" : "text-gray-500"}`} />
                    <div>
                      <p className={`text-sm font-semibold ${activo ? "text-[#B3985B]" : "text-white"}`}>{s.titulo}</p>
                      <p className="text-[12px] text-gray-500 mt-0.5">{s.desc}</p>
                    </div>
                    {activo && <Check strokeWidth={2.5} className="w-4 h-4 text-[#B3985B] ml-auto mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {preguntasDelNicho.length > 0 && (
            <div>
              <label className="text-sm text-white font-semibold block mb-1">Cuéntanos un poco más</label>
              <p className="text-[12px] text-gray-500 mb-3">Responde lo que sepas. Si no estás seguro, no hay problema — lo vemos juntos.</p>
              <div className="space-y-3">
                {preguntasDelNicho.map(q => {
                  const val = respuestas[q.id] || "";
                  const opciones = q.tipoRespuesta === "SI_NO"
                    ? ["Sí", "No", "No estoy seguro"]
                    : [...jsonArr(q.opciones), "No estoy seguro"];
                  return (
                    <div key={q.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                      <p className="text-sm text-gray-200 mb-2.5">{q.texto}</p>
                      {q.tipoRespuesta === "NUMERO" ? (
                        <input type="number" min={0} value={val}
                          onChange={e => setRespuestas(p => ({ ...p, [q.id]: e.target.value }))}
                          className="w-32 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                      ) : q.tipoRespuesta === "TEXTO" ? (
                        <input type="text" value={val}
                          onChange={e => setRespuestas(p => ({ ...p, [q.id]: e.target.value }))}
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {opciones.map(op => {
                            const activo = val === op;
                            const inseguro = op === "No estoy seguro";
                            return (
                              <button key={op} type="button"
                                onClick={() => setRespuestas(p => ({ ...p, [q.id]: activo ? "" : op }))}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                                  activo
                                    ? inseguro ? "border-amber-600/60 bg-amber-900/20 text-amber-300" : "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]"
                                    : "border-[#222] bg-[#1a1a1a] text-gray-300 hover:border-[#444]"}`}>
                                {inseguro && <HelpCircle strokeWidth={1.75} className="w-3.5 h-3.5" />}
                                {op}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={retroceder}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm font-medium px-3 py-2.5 transition-colors">
              <ChevronLeft strokeWidth={2} className="w-4 h-4" /> Atrás
            </button>
            <button type="button" onClick={avanzar}
              className="inline-flex items-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              Continuar <ChevronRight strokeWidth={2} className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══ PANTALLA 3 — Galería de opciones ══ */}
      {paso === 3 && (
        <div className="space-y-6">
          {/* Tu paquete — el que tu asesor te preparó, con sus adicionales sugeridos */}
          {paquetePresentado && (
            <div className="rounded-2xl border border-[#B3985B]/30 bg-gradient-to-br from-[#B3985B]/[0.08] to-transparent overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                {paquetePresentado.portada && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={paquetePresentado.portada} alt={paquetePresentado.nombre} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[11px] text-[#B3985B] uppercase tracking-wider font-semibold">Tu paquete</p>
                  <p className="text-white text-sm font-semibold truncate">{paquetePresentado.nombre}</p>
                  {paquetePresentado.rangoPersonas && <p className="text-[11px] text-gray-500 mt-0.5">{paquetePresentado.rangoPersonas} personas</p>}
                  {paquetePresentado.resumen && <p className="text-[12px] text-gray-400 mt-0.5 line-clamp-2">{paquetePresentado.resumen}</p>}
                </div>
              </div>
              {paquetePresentado.adicionales.length > 0 && (
                <div className="border-t border-[#B3985B]/15 p-4">
                  <p className="text-sm text-white font-semibold mb-1">Complementa tu paquete</p>
                  <p className="text-[12px] text-gray-500 mb-3">Adicionales que van perfecto con este paquete. Toca los que te interesen.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {paquetePresentado.adicionales.map(a => {
                      const activo = adicionales.includes(a.id);
                      return (
                        <button key={a.id} type="button"
                          onClick={() => setAdicionales(p => activo ? p.filter(x => x !== a.id) : [...p, a.id])}
                          className={`text-left rounded-xl border overflow-hidden transition-all ${activo ? "border-[#B3985B] ring-1 ring-[#B3985B]/40" : "border-[#222] hover:border-[#444]"}`}>
                          <div className="relative aspect-[4/3] bg-gradient-to-br from-[#1c1c1c] to-[#0e0e0e]">
                            {a.imagenUrl
                              ? <img src={a.imagenUrl} alt={a.nombre} className="w-full h-full object-cover" />
                              : (() => { const Ico = iconoAdicional(a.nombre); return (
                                  <div className="w-full h-full flex items-center justify-center text-[#B3985B]/70"><Ico strokeWidth={1.5} className="w-9 h-9" /></div>
                                ); })()}
                            {activo && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#B3985B] flex items-center justify-center"><Check strokeWidth={3} className="w-3.5 h-3.5 text-black" /></div>}
                          </div>
                          <div className="p-2.5 bg-[#111]">
                            <p className={`text-[13px] font-semibold ${activo ? "text-[#B3985B]" : "text-white"}`}>{a.nombre}</p>
                            {a.descripcion && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{a.descripcion}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {adicionalesDelContexto.length > 0 && (
            <div>
              <label className="text-sm text-white font-semibold block mb-1">¿Algo de esto le vendría bien a tu evento?</label>
              <p className="text-[12px] text-gray-500 mb-3">Toca lo que te llame la atención. Son ideas, no un compromiso.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {adicionalesDelContexto.map(a => {
                  const activo = adicionales.includes(a.id);
                  const frecuente = a.frecuencia === "frecuente";
                  return (
                    <button key={a.id} type="button"
                      onClick={() => setAdicionales(p => activo ? p.filter(x => x !== a.id) : [...p, a.id])}
                      className={`text-left rounded-xl border overflow-hidden transition-all ${activo ? "border-[#B3985B] ring-1 ring-[#B3985B]/40" : "border-[#222] hover:border-[#444]"}`}>
                      <div className="relative aspect-[4/3] bg-gradient-to-br from-[#1c1c1c] to-[#0e0e0e]">
                        {a.imagenUrl
                          ? <img src={a.imagenUrl} alt={a.nombre} className="w-full h-full object-cover" />
                          : (() => { const Ico = iconoAdicional(a.nombre); return (
                              <div className="w-full h-full flex items-center justify-center text-[#B3985B]/70"><Ico strokeWidth={1.5} className="w-9 h-9" /></div>
                            ); })()}
                        {activo && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#B3985B] flex items-center justify-center"><Check strokeWidth={3} className="w-3.5 h-3.5 text-black" /></div>}
                        {frecuente && <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-black/60 backdrop-blur rounded-full px-2 py-0.5 text-[10px] text-[#B3985B] font-semibold"><Star strokeWidth={2} className="w-3 h-3 fill-[#B3985B]" /> Popular</div>}
                      </div>
                      <div className="p-2.5 bg-[#111]">
                        <p className={`text-[13px] font-semibold ${activo ? "text-[#B3985B]" : "text-white"}`}>{a.nombre}</p>
                        {a.descripcion && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{a.descripcion}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">¿Algo más que debamos saber? (opcional)</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              placeholder="Cuéntanos cualquier detalle, idea o referencia de tu evento…"
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
          </div>

          <div>
            <label className="text-sm text-white font-semibold block mb-3">¿Cuál es tu presupuesto aproximado?</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESUPUESTOS.map(b => {
                const activo = (presupuesto === "" && b.value === 0) ? false : presupuesto === b.value;
                return (
                  <button key={b.label} type="button"
                    onClick={() => setPresupuesto(b.value === 0 ? "" : b.value)}
                    className={`p-3 rounded-lg border text-sm text-center transition-all ${activo ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]" : "border-[#222] bg-[#111] text-gray-300 hover:border-[#444]"}`}>
                    {b.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-600 mt-2">Solo es una referencia para proponerte lo mejor dentro de tu rango.</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={retroceder}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm font-medium px-3 py-2.5 transition-colors">
              <ChevronLeft strokeWidth={2} className="w-4 h-4" /> Atrás
            </button>
            <button type="button" disabled={enviando} onClick={enviar}
              className="inline-flex items-center gap-2 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
              {enviando ? <><Loader2 strokeWidth={2} className="w-4 h-4 animate-spin" /> Enviando…</> : <>Enviar información <Check strokeWidth={2.5} className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {guardando && <p className="text-[11px] text-gray-600 text-center">Guardando…</p>}
    </div>
  );
}
