import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { ClipboardList, Settings, Truck, Handshake, Music, Wine, Building2, Calendar, Package, Palette, Sliders, DollarSign, Eye, Image as ImageIcon, Folder, FileText, PenLine, BarChart3, Paperclip, Lightbulb, Phone, List, Zap, Sparkles, PartyPopper, Clock, type LucideIcon } from "lucide-react";
import TimePicker from "@/components/ui/TimePicker";
import VenuePicker from "@/components/ui/VenuePicker";
import { SelectorEquiposInventario, type SeleccionEquipos, type PaquetePublico, type ProductoPublico } from '@/components/SelectorEquiposInventario';
import { Combobox } from "@/components/Combobox";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useToast } from "@/components/Toast";
import { isLegacyString, parseLinks } from "@/utils/legacyText";
import { parseFechasEvento } from "@/lib/fechas-evento";
import { preguntasVisibles } from "@/lib/descubrimiento";
import { parseCoberturas, coberturaMatch, SUBTIPOS_EVENTO } from "@/lib/constants";

const PASOS_DISCOVERY: Array<{ id: number; label: string; icon: LucideIcon }> = [
  { id: 1, label: "Info Básica", icon: ClipboardList },
  { id: 2, label: "Producción", icon: Settings },
  { id: 3, label: "Contexto", icon: Truck },
  { id: 4, label: "Comercial", icon: Handshake },
];

// Rangos de asistentes: son los MISMOS rangos de tamaño de los paquetes
// (tabla paquete_rangos, editable desde la UI). Se cargan por API; este arreglo
// es solo el fallback si la API no responde. La columna `asistentesEstimados`
// es Int?, así que se guarda el tope del rango (ej. "500-800" → 800).
const RANGOS_ASISTENTES_FALLBACK = [
  "0-100", "100-200", "200-300", "300-500", "500-800", "800-1000", "1000-1500", "1500-2000", "2000-2500", "2500-3000",
];

// Tope numérico de un label de rango ("500-800" → 800, "1-100" → 100).
function rangoMax(label: string): number {
  const nums = label.match(/\d+/g);
  return nums && nums.length ? Math.max(...nums.map(Number)) : 0;
}

// Mapea un número guardado (incluidos valores libres antiguos) al tope del
// rango que le corresponde, para re-seleccionar la opción correcta.
function snapRango(n: number | string, rangos: { value: number }[]): string {
  const num = typeof n === "string" ? parseInt(n) : n;
  if (!num || Number.isNaN(num) || rangos.length === 0) return "";
  const ordenados = [...rangos].sort((a, b) => a.value - b.value);
  const rango = ordenados.find(r => num <= r.value) ?? ordenados[ordenados.length - 1];
  return String(rango.value);
}

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

const EXTRAS_EVENTO: Record<string, any[]> = {
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
    { id: "STREAMING",          label: "Streaming en vivo",   grupo: "extra" },
    { id: "GRABACION",          label: "Grabación del evento", grupo: "extra" },
    { id: "ESCENOGRAFIA",       label: "Escenografía / Backdrop", grupo: "extra" },
    { id: "AUDIO_CONF",         label: "Sistema para conferencia", grupo: "extra" },
    { id: "EFECTOS",            label: "Efectos especiales",  grupo: "extra" },
    { id: "PRODUCCION_GENERAL", label: "Producción completa", grupo: "extra" },
  ],
};

// Combina el día 1 (fechaEventoEstimada) con los días extra en una lista canónica.
// Devuelve el JSON a guardar (o null si es 0-1 día) y los días derivados del conteo.
function calcFechasEvento(form: { fechaEventoEstimada: string; fechasEventoExtra: string[] }): {
  fechasEvento: string | null;
  diasDerivados: number | null;
} {
  const dia1 = form.fechaEventoEstimada === "por-definir" ? "" : form.fechaEventoEstimada;
  if (!dia1) return { fechasEvento: null, diasDerivados: null };
  const lista = Array.from(new Set([dia1, ...form.fechasEventoExtra.filter(Boolean)])).sort();
  if (lista.length <= 1) return { fechasEvento: null, diasDerivados: null };
  return { fechasEvento: JSON.stringify(lista), diasDerivados: lista.length };
}

// Duración del evento a partir de las horas de inicio y fin ("HH:MM"). Si el fin
// es menor o igual al inicio, se asume que cruza medianoche (+24h). Devuelve un
// texto legible ("5h", "5h 30min") o null si faltan datos. Se guarda en
// `duracionEvento` para alimentar cotización, contrato y fichas operativas.
function calcDuracionEvento(inicio: string, fin: string): string | null {
  if (!inicio || !fin) return null;
  const [sh, sm] = inicio.split(":").map(Number);
  const [eh, em] = fin.split(":").map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return null;
  let m = (eh * 60 + em) - (sh * 60 + sm);
  if (m <= 0) m += 24 * 60; // cruza medianoche
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}min`;
  return min === 0 ? `${h}h` : `${h}h ${min}min`;
}

// ── Descubrimiento por nicho (catálogo comercial) ──────────────────────────────
// Bloque del Paso 2 que deriva sugerencias del catálogo único: paquete(s) base,
// descubrimiento guiado (preguntas → adicionales) y adicionales frecuentes del
// nicho. Todo es sugerencia: nada bloquea, valida ni oculta las 14 categorías.
type AdicionalCat = { id: string; nombre: string; descripcion: string | null; tiposEvento: string; nichos: string | null; frecuencia: string; imagenUrl: string | null; composicion?: string | null };

// Cuenta las piezas (equipos/productos) que un adicional trae ligadas en su
// composición, para hacer visible el linkeo en el descubrimiento. La expansión
// real a la cotización ocurre en el cotizador (agregarAdicionalDescubrimiento).
function contarComposicion(composicion: string | null | undefined): { equipos: number; productos: number } {
  const out = { equipos: 0, productos: 0 };
  if (!composicion) return out;
  try {
    const arr = JSON.parse(composicion);
    if (Array.isArray(arr)) for (const l of arr) {
      if (l?.tipo === "equipo") out.equipos++;
      else if (l?.tipo === "producto") out.productos++;
    }
  } catch { /* noop */ }
  return out;
}
type PreguntaCat = { id: string; texto: string; tipoRespuesta: string; opciones: string | null; nichos: string | null; alcance?: string | null; tipoEventoSlug?: string | null; bloque?: string | null; obligatoria?: boolean; preguntaPadreId?: string | null; condicionValor?: string | null; orden?: number; reglas: { categoriasEquipo: string | null; adicionalIds: string | null }[] };

function rangoIncluye(label: string | null, asistentes: number | null): boolean {
  if (!label || asistentes == null) return true; // sin dato → no filtra
  const nums = (label.match(/\d+/g) || []).map(Number);
  if (nums.length === 0) return true;
  const min = nums[0];
  const max = nums.length > 1 ? nums[1] : Infinity;
  return asistentes >= min && asistentes <= max;
}

function jsonArr(s: string | null): string[] {
  if (!s) return [];
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return []; }
}

// Trazabilidad de respuestas de descubrimiento: cada respuesta guarda quién la
// contestó (vendedor|cliente) y cuándo. Compatible hacia atrás: un valor string
// legacy se normaliza como respuesta del vendedor.
type RespuestaTraza = { valor: string; origen: "vendedor" | "cliente"; ts: string };
type MapaRespuestas = Record<string, RespuestaTraza>;

function normalizarRespuestas(raw: unknown): MapaRespuestas {
  if (!raw || typeof raw !== "object") return {};
  const out: MapaRespuestas = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") { if (v) out[k] = { valor: v, origen: "vendedor", ts: "" }; }
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const valor = String(o.valor ?? "");
      if (valor) out[k] = { valor, origen: o.origen === "cliente" ? "cliente" : "vendedor", ts: String(o.ts ?? "") };
    }
  }
  return out;
}

function DescubrimientoCatalogo({
  tipoEvento, nichoSlug, nichoNombre, asistentes,
  adicionales, preguntas, respuestas, adicionalesSel,
  categoriasSel, categoriaIdPorNombre, productosSel,
  onRespuesta, onToggleAdicional, onToggleCategoria, onUsarPaquete, onUsarProducto, readOnly,
  seccion,
}: {
  tipoEvento: string;
  nichoSlug: string;
  nichoNombre: string;
  asistentes: number | null;
  adicionales: AdicionalCat[];
  preguntas: PreguntaCat[];
  respuestas: MapaRespuestas;
  adicionalesSel: string[];
  categoriasSel: string[];
  categoriaIdPorNombre: Map<string, string>;
  productosSel: string[];
  onRespuesta: (preguntaId: string, valor: string) => void;
  onToggleAdicional: (adicionalId: string) => void;
  onToggleCategoria: (categoriaId: string) => void;
  onUsarPaquete: (paquete: PaquetePublico) => void;
  onUsarProducto: (producto: ProductoPublico) => void;
  readOnly: boolean;
  // Fase 3: separa el sub-paso de Selección (paquetes/productos base) del de
  // Adicionales (complementos + preguntas guiadas). undefined = mostrar todo.
  seccion?: "seleccion" | "adicionales";
}) {
  const [paquetes, setPaquetes] = useState<PaquetePublico[]>([]);
  const [productos, setProductos] = useState<ProductoPublico[]>([]);
  const [openGuia, setOpenGuia] = useState(false);
  const [modoLlamada, setModoLlamada] = useState(false);
  const [idxLlamada, setIdxLlamada] = useState(0);

  useEffect(() => {
    if (!tipoEvento) { setPaquetes([]); return; }
    let cancel = false;
    fetch(`/api/paquetes?tipoEvento=${encodeURIComponent(tipoEvento)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancel && Array.isArray(d?.paquetes)) setPaquetes(d.paquetes); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [tipoEvento]);

  // Productos armados del catálogo comercial (para recomendarlos por capacidad).
  useEffect(() => {
    let cancel = false;
    fetch("/api/productos/publico")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancel && Array.isArray(d?.productos)) setProductos(d.productos); })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  // Paquetes candidatos: mismo tipo y rango que cubre a los asistentes estimados.
  const candidatos = paquetes.filter(p => rangoIncluye(p.rangoPersonas, asistentes));

  // Adicionales sugeridos por los paquetes candidatos (unión, sin duplicados).
  // Solo los que existen en el catálogo activo de adicionales.
  const adicIdsPorPaquete = (() => {
    const set = new Set<string>();
    for (const p of candidatos) for (const id of jsonArr(p.adicionalesSugeridos)) set.add(id);
    return set;
  })();
  const adicionalesDelPaquete = adicionales.filter(a => adicIdsPorPaquete.has(a.id));

  // Productos recomendados: mismo criterio que la pestaña "Por producto" del
  // selector — cobertura por tipo de evento + capacidad (rango de asistentes).
  // Solo mostramos los que hacen "match" explícito; nada obliga ni oculta.
  const subtipos = nichoNombre ? [nichoNombre] : [];
  const productosRecomendados = productos.filter(p =>
    coberturaMatch(parseCoberturas(p.coberturas), { tipoEvento, asistentes, subtipos }, p.capacidadUniversal) === "match"
  );

  // Adicionales específicos del nicho (frecuentes primero). Un adicional sin nichos
  // aplica a todo su tipo; con nichos, solo al nicho elegido. Si no hay nicho aún,
  // se muestran los del tipo.
  const adicionalesDelTipo = adicionales
    .filter(a => {
      if (!jsonArr(a.tiposEvento).includes(tipoEvento)) return false;
      const ns = jsonArr(a.nichos);
      return ns.length === 0 || !nichoSlug || ns.includes(nichoSlug);
    })
    .sort((x, y) => (x.frecuencia === "frecuente" ? 0 : 1) - (y.frecuencia === "frecuente" ? 0 : 1));

  // Jerarquía general → tipo → nicho, con condicionales resueltas por las respuestas.
  const valoresResp: Record<string, string> = {};
  for (const [k, v] of Object.entries(respuestas)) valoresResp[k] = v.valor;
  const preguntasDelNicho = preguntasVisibles(preguntas, tipoEvento, nichoSlug, valoresResp);

  if (candidatos.length === 0 && productosRecomendados.length === 0 && adicionalesDelTipo.length === 0 && preguntasDelNicho.length === 0) return null;

  const etiquetaNicho = nichoNombre || "este evento";
  const showSel = seccion !== "adicionales";
  const showAdic = seccion !== "seleccion";

  return (
    <div className="space-y-4 rounded-xl border border-[#B3985B]/25 bg-gradient-to-br from-[#B3985B]/[0.06] to-transparent p-4">
      <div className="flex items-center gap-2">
        <Sparkles strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" />
        <p className="text-sm text-white font-semibold">{seccion === "adicionales" ? `Adicionales para ${etiquetaNicho}` : `Sugerencias para ${etiquetaNicho}`}</p>
      </div>

      {/* 1. Paquete(s) base sugerido(s) */}
      {showSel && candidatos.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">Paquete como punto de partida</p>
          <div className="flex flex-wrap gap-2">
            {candidatos.slice(0, 4).map(p => (
              <div key={p.id} className="flex-1 min-w-[220px] rounded-lg border border-[#2a2a2a] bg-[#111] p-3">
                <p className="text-sm text-white font-medium">{p.nombre}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {p.rangoPersonas ? `${p.rangoPersonas} personas · ` : ""}{p.items.length} equipos · {p.conceptos.length} conceptos
                </p>
                {p.resumen && <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{p.resumen}</p>}
                {!readOnly && (
                  <button type="button" onClick={() => onUsarPaquete(p)}
                    className="mt-2 text-[11px] font-semibold text-black bg-[#B3985B] hover:bg-[#c9a96a] px-3 py-1.5 rounded-lg transition-colors">
                    Usar como base
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1a-bis. Adicionales que sugieren los paquetes candidatos */}
      {showAdic && adicionalesDelPaquete.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider inline-flex items-center gap-1.5">
            <Sparkles strokeWidth={1.75} className="w-3 h-3 text-[#B3985B]" /> Recomendados por el paquete
          </p>
          <p className="text-[10px] text-gray-500 -mt-1">Complementos que el paquete sugiere. Al usar el paquete como base se encienden solos; también puedes marcarlos aquí.</p>
          <div className="flex flex-wrap gap-2">
            {adicionalesDelPaquete.map(a => {
              const on = adicionalesSel.includes(a.id);
              const comp = contarComposicion(a.composicion);
              const piezas = comp.equipos + comp.productos;
              return (
                <button key={a.id} type="button" disabled={readOnly} onClick={() => onToggleAdicional(a.id)}
                  title={a.descripcion || undefined}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors inline-flex items-center gap-1.5 ${
                    on ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-400 hover:text-white"
                  }`}>
                  {a.nombre}
                  {piezas > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                      <Package strokeWidth={1.75} className="w-2.5 h-2.5" />{piezas}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1b. Productos recomendados por capacidad (mismo criterio que "Por producto") */}
      {showSel && productosRecomendados.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider inline-flex items-center gap-1.5">
            <Package strokeWidth={1.75} className="w-3 h-3" /> Productos recomendados para {asistentes ?? "—"} asistentes
          </p>
          <div className="flex flex-wrap gap-2">
            {productosRecomendados.slice(0, 6).map(p => {
              const on = productosSel.includes(p.id);
              return (
                <div key={p.id} className="flex-1 min-w-[220px] rounded-lg border border-[#2a2a2a] bg-[#111] p-3">
                  <p className="text-sm text-white font-medium">{p.nombre}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {p.categoria ? `${p.categoria} · ` : ""}{p.items.length} equipos
                    {p.capacidadUniversal ? " · cualquier capacidad" : ""}
                  </p>
                  {p.descripcion && <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{p.descripcion}</p>}
                  {!readOnly && (
                    <button type="button" onClick={() => onUsarProducto(p)} disabled={on}
                      className={`mt-2 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        on ? "text-[#B3985B] border border-[#B3985B]/40 bg-[#B3985B]/10 cursor-default"
                           : "text-black bg-[#B3985B] hover:bg-[#c9a96a]"
                      }`}>
                      {on ? "✓ Agregado" : "Agregar producto"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Descubrimiento guiado (preguntas del nicho) — plegable, opcional */}
      {showAdic && preguntasDelNicho.length > 0 && (() => {
        const opcionesDe = (q: PreguntaCat) => q.tipoRespuesta === "SI_NO" ? ["Sí", "No", "No estoy seguro"] : jsonArr(q.opciones).concat("No estoy seguro");
        // Categorías ligadas a una pregunta (ids de inventario resueltos por nombre).
        const catsDe = (q: PreguntaCat) => q.reglas
          .flatMap(r => jsonArr(r.categoriasEquipo))
          .map(nm => categoriaIdPorNombre.get(nm))
          .filter((x): x is string => !!x);
        const responder = (q: PreguntaCat, opt: string) => {
          const val = respuestas[q.id]?.valor || "";
          const next = val === opt ? "" : opt;
          onRespuesta(q.id, next);
          const enciendeQ = q.reglas.flatMap(r => jsonArr(r.adicionalIds));
          const catsQ = catsDe(q);
          const antesSi = val === "Sí";
          const despuesSi = next === "Sí";
          if (despuesSi && !antesSi) {
            // Encender adicionales y categorías ligadas a esta respuesta.
            for (const aid of enciendeQ) if (!adicionalesSel.includes(aid)) onToggleAdicional(aid);
            for (const cid of catsQ) if (!categoriasSel.includes(cid)) onToggleCategoria(cid);
          } else if (antesSi && !despuesSi) {
            // Apagar lo que esta pregunta encendía, salvo que otra respuesta "Sí" vigente
            // también lo pida (regla bidireccional).
            const adicNecesarios = new Set<string>();
            const catNecesarias = new Set<string>();
            for (const otra of preguntasDelNicho) {
              if (otra.id === q.id) continue;
              if ((respuestas[otra.id]?.valor || "") === "Sí") {
                for (const aid of otra.reglas.flatMap(r => jsonArr(r.adicionalIds))) adicNecesarios.add(aid);
                for (const cid of catsDe(otra)) catNecesarias.add(cid);
              }
            }
            for (const aid of enciendeQ) if (adicionalesSel.includes(aid) && !adicNecesarios.has(aid)) onToggleAdicional(aid);
            for (const cid of catsQ) if (categoriasSel.includes(cid) && !catNecesarias.has(cid)) onToggleCategoria(cid);
          }
        };
        const contestadas = preguntasDelNicho.filter(q => respuestas[q.id]?.valor).length;
        return (
        <div className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f]">
          <button type="button" onClick={() => setOpenGuia(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left">
            <span className="text-xs text-white font-medium inline-flex items-center gap-1.5">
              <Lightbulb strokeWidth={1.75} className="w-3.5 h-3.5 text-[#B3985B]" /> Descubrimiento guiado (opcional)
              {contestadas > 0 && <span className="text-[10px] text-gray-500">· {contestadas}/{preguntasDelNicho.length}</span>}
            </span>
            <span className="text-gray-500 text-xs">{openGuia ? "−" : "+"}</span>
          </button>
          {openGuia && (
            <div className="px-3 pb-3 border-t border-[#1a1a1a] pt-3">
              {/* Selector de modo: lista vs llamada */}
              <div className="flex items-center gap-1 mb-3">
                {(["lista", "llamada"] as const).map(m => {
                  const activo = (m === "llamada") === modoLlamada;
                  return (
                    <button key={m} type="button" onClick={() => { setModoLlamada(m === "llamada"); setIdxLlamada(0); }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${activo ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#2a2a2a] text-gray-500 hover:text-gray-300"}`}>
                      {m === "llamada" ? <Phone className="w-3 h-3" /> : <List className="w-3 h-3" />}
                      {m === "llamada" ? "Modo llamada" : "Modo lista"}
                    </button>
                  );
                })}
                {modoLlamada && <span className="ml-auto text-[10px] text-gray-500">Pregunta {Math.min(idxLlamada + 1, preguntasDelNicho.length)} de {preguntasDelNicho.length}</span>}
              </div>

              {/* ── MODO LISTA ── */}
              {!modoLlamada && (
                <div className="space-y-3">
                  {preguntasDelNicho.map(q => {
                    const r = respuestas[q.id];
                    return (
                      <div key={q.id}>
                        <p className="text-xs text-gray-300 mb-1.5 flex items-center gap-1.5">
                          {q.texto}
                          {r?.origen === "cliente" && <span className="text-[9px] uppercase tracking-wide text-emerald-400 border border-emerald-500/30 rounded px-1 py-0.5">respondió el cliente</span>}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {opcionesDe(q).map(opt => (
                            <button key={opt} type="button" disabled={readOnly} onClick={() => responder(q, opt)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
                                r?.valor === opt ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-500 hover:text-white"
                              }`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── MODO LLAMADA (una pregunta a la vez, tipografía grande) ── */}
              {modoLlamada && (() => {
                const idx = Math.min(idxLlamada, preguntasDelNicho.length - 1);
                const q = preguntasDelNicho[idx];
                const r = respuestas[q.id];
                const ultima = idx >= preguntasDelNicho.length - 1;
                return (
                  <div className="rounded-lg bg-[#0a0a0a] border border-[#1f1f1f] p-4">
                    {r?.origen === "cliente" && <p className="text-[10px] uppercase tracking-wide text-emerald-400 mb-2">respondió el cliente — no se sobrescribe</p>}
                    <p className="text-lg text-white leading-snug mb-4">{q.texto}</p>
                    <div className="flex flex-col gap-2">
                      {opcionesDe(q).map(opt => (
                        <button key={opt} type="button" disabled={readOnly}
                          onClick={() => { responder(q, opt); if (!ultima) setIdxLlamada(idx + 1); }}
                          className={`w-full text-left px-4 py-3 rounded-lg text-sm border transition-colors ${
                            r?.valor === opt ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-300 hover:border-[#555] hover:text-white"
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <button type="button" onClick={() => setIdxLlamada(Math.max(0, idx - 1))} disabled={idx === 0}
                        className="text-xs text-gray-500 hover:text-white disabled:opacity-30 px-2 py-1">← Anterior</button>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { if (!ultima) setIdxLlamada(idx + 1); }}
                          className="text-xs text-gray-400 hover:text-white px-2 py-1">Saltar</button>
                        {!ultima ? (
                          <button type="button" onClick={() => setIdxLlamada(idx + 1)}
                            className="text-xs font-semibold text-black bg-[#B3985B] hover:bg-[#c9a96a] px-3 py-1.5 rounded-lg">Siguiente →</button>
                        ) : (
                          <button type="button" onClick={() => setModoLlamada(false)}
                            className="text-xs font-semibold text-black bg-[#B3985B] hover:bg-[#c9a96a] px-3 py-1.5 rounded-lg">Terminar</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        );
      })()}

      {/* 3. Adicionales frecuentes en el nicho */}
      {showAdic && adicionalesDelTipo.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">Adicionales frecuentes en {etiquetaNicho}</p>
          <div className="flex flex-wrap gap-2">
            {adicionalesDelTipo.map(a => {
              const on = adicionalesSel.includes(a.id);
              const comp = contarComposicion(a.composicion);
              const piezas = comp.equipos + comp.productos;
              const ligadoTitle = piezas > 0
                ? `Incluye ${[comp.equipos ? `${comp.equipos} equipo(s)` : "", comp.productos ? `${comp.productos} producto(s)` : ""].filter(Boolean).join(" y ")} — bajan a la cotización`
                : undefined;
              return (
                <button key={a.id} type="button" disabled={readOnly} onClick={() => onToggleAdicional(a.id)}
                  title={ligadoTitle || a.descripcion || undefined}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors inline-flex items-center gap-1.5 ${
                    on ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-400 hover:text-white"
                  }`}>
                  {a.frecuencia === "frecuente" && <span className="text-[#B3985B]">★</span>}
                  {a.nombre}
                  {piezas > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                      <Package strokeWidth={1.75} className="w-2.5 h-2.5" />{piezas}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiscoveryForm({
  id, trato, setTrato, onComplete, readOnly = false,
  clientMode = false, token, huerfano = false, contacto, setContacto, modalidad, renderScouting,
}: {
  id: string, trato: any, setTrato: any, onComplete?: () => void, readOnly?: boolean,
  // Tarjeta de Scouting (estado en la página); se coloca dentro del Paso 3 (Contexto).
  renderScouting?: ReactNode,
  // Modalidad de la propuesta elegida en el paso previo: INVENTARIO (equipo Mainstage)
  // o CONTRA_RIDER (el cliente trae un rider específico / equipos de otras marcas).
  modalidad?: "INVENTARIO" | "CONTRA_RIDER",
  // ── Modo cliente (link público /f/[token]) ──────────────────────────────
  // Cuando clientMode=true el formulario guarda vía /api/f/[token] (POST con
  // `_discoveryMode`) en lugar de /api/tratos/[id], oculta la UI interna del
  // vendedor (propuesta, Trade, render) y muestra un botón "Enviar" final.
  clientMode?: boolean,
  token?: string,
  huerfano?: boolean,
  contacto?: { nombre: string; whatsapp: string; correo?: string; momentoContratacion?: string },
  setContacto?: (c: any) => void,
}) {
  const toast = useToast();
  // Fase 5: el sub-paso se refleja en la URL (?paso=2b) para que sea compartible
  // y sobreviva al botón atrás. Solo se usa fuera del modo cliente.
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Rutas base según el modo. En modo cliente todo pasa por el endpoint por token.
  const archivosBase = clientMode ? `/api/f/${token}/archivos` : `/api/tratos/${id}/archivos`;
  
  
  
  
  const [tipoEventoUnlocked, setTipoEventoUnlocked] = useState(!trato?.tipoEvento);
  const [discoveryExpanded, setDiscoveryExpanded] = useState(!trato?.descubrimientoCompleto);
  
  // Archivos state
  const [archivos, setArchivos] = useState<any[]>([]);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  
  const [linkDraft, setLinkDraft] = useState({ label: '', url: '' });
  const [linkUrlError, setLinkUrlError] = useState('');
  const [briefAplica, setBriefAplica] = useState<boolean | null>(null);
  const [levantamientoCreado, setLevantamientoCreado] = useState(false);
  const [briefGuardado, setBriefGuardado] = useState(false);

  useEffect(() => {
    // En modo huérfano aún no hay trato → no hay archivos que listar.
    if (clientMode && huerfano) return;
    fetch(archivosBase)
      .then(r => r.json())
      .then(d => setArchivos(d.archivos || []))
      .catch(() => {});
  }, [archivosBase, clientMode, huerfano]);

  async function patch(data: Record<string, unknown>) {
    // ── Modo cliente: guardar vía endpoint por token ──────────────────────
    if (clientMode) {
      const res = await fetch(`/api/f/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, _discoveryMode: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al guardar");
        return null;
      }
      const d = await res.json();
      // El trato local se mantiene sincronizado con lo que el cliente escribe.
      setTrato((prev: any) => prev ? { ...prev, ...data } : prev);
      return d;
    }

    const res = await fetch(`/api/tratos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return null;
    }
    const d = await res.json();
    if (d.trato) {
      setTrato((prev: any) => prev ? { ...prev, ...d.trato } : prev);
    }
    return d;
  }

  async function patchCliente(data: Record<string, unknown>) {
    if (!trato?.cliente?.id) return null;
    const res = await fetch(`/api/clientes/${trato.cliente.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar información del cliente");
      return null;
    }
    const d = await res.json();
    if (d.cliente) {
      setTrato((prev: any) => prev ? { ...prev, cliente: { ...prev.cliente, ...d.cliente } } : prev);
    }
    return d;
  }

  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>, tipo: string) {
    if (!e.target.files?.length) return;
    setUploadingTipo(tipo);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    formData.append("tipo", tipo);
    try {
      const res = await fetch(archivosBase, { method: "POST", body: formData });
      if (res.ok) {
        const d = await res.json();
        setArchivos(prev => [...prev, d.archivo]);
        toast.success("Archivo subido correctamente");
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Error al subir");
      }
    } catch {
      toast.error("Error de red al subir");
    } finally {
      setUploadingTipo(null);
    }
  }

  async function eliminarArchivo(archivoId: string) {
    if (!window.confirm("¿Seguro de eliminar este archivo?")) return;
    try {
      const res = await fetch(`${archivosBase}?archivoId=${archivoId}`, { method: "DELETE" });
      if (res.ok) {
        setArchivos(prev => prev.filter(a => a.id !== archivoId));
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Error al eliminar");
      }
    } catch {
      toast.error("Error de red");
    }
  }

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
  const [avisoPaso1, setAvisoPaso1] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creandoCotizacion, setCreandoCotizacion] = useState(false);
  const [eliminandoCotizacion, setEliminandoCotizacion] = useState<string | null>(null);

  // Rangos de asistentes = mismos rangos de tamaño de los paquetes (editables en BD).
  const [rangosAsistentes, setRangosAsistentes] = useState<{ label: string; value: number }[]>(
    () => RANGOS_ASISTENTES_FALLBACK.map(l => ({ label: l, value: rangoMax(l) }))
  );
  useEffect(() => {
    let cancel = false;
    fetch("/api/paquetes/rangos")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancel || !Array.isArray(d?.rangos)) return;
        const list = d.rangos
          .map((r: { label: string }) => ({ label: r.label, value: rangoMax(r.label) }))
          .filter((r: { value: number }) => r.value > 0);
        if (list.length) setRangosAsistentes(list);
      })
      .catch(() => { /* fallback local */ });
    return () => { cancel = true; };
  }, []);

  // ── Catálogo comercial (fuente única de nichos, adicionales y preguntas) ──────
  // Se lee una sola vez. Si el endpoint falla (p. ej. modo cliente sin sesión) los
  // arrays quedan vacíos y la UI cae al comportamiento previo (subtipos hardcodeados).
  const [catNichos, setCatNichos] = useState<{ id: string; tipoEventoSlug: string; nombre: string; slug: string }[]>([]);
  const [catAdicionales, setCatAdicionales] = useState<{ id: string; nombre: string; descripcion: string | null; tiposEvento: string; nichos: string | null; frecuencia: string; imagenUrl: string | null; composicion?: string | null }[]>([]);
  const [catPreguntas, setCatPreguntas] = useState<PreguntaCat[]>([]);
  // Categorías de inventario (id↔nombre): permiten que una respuesta del descubrimiento
  // encienda su categoría ligada dentro de equiposInteres, para que viaje a la cotización.
  const [catCategorias, setCatCategorias] = useState<{ id: string; nombre: string }[]>([]);
  useEffect(() => {
    let cancel = false;
    fetch("/api/catalogo")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancel || !d) return;
        setCatNichos(Array.isArray(d.nichos) ? d.nichos : []);
        setCatAdicionales(Array.isArray(d.adicionales) ? d.adicionales : []);
        setCatPreguntas(Array.isArray(d.preguntas) ? d.preguntas : []);
      })
      .catch(() => { /* fallback: subtipos hardcodeados */ });
    fetch("/api/inventario/publico")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancel && Array.isArray(d?.categorias)) setCatCategorias(d.categorias.map((c: any) => ({ id: c.id, nombre: c.nombre }))); })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);
  const categoriaIdPorNombre = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of catCategorias) m.set(c.nombre, c.id);
    return m;
  }, [catCategorias]);

  // Cliente state


  // Discovery state
  const [discForm, setDiscForm] = useState({
    tipoEvento: "MUSICAL",
    subtipoEvento: "",
    nombreEvento: "",
    fechaEventoEstimada: "",
    lugarEstimado: "",
    asistentesEstimados: "",
    diasServicio: "",
    // Días adicionales del evento (además del día 1 = fechaEventoEstimada). "YYYY-MM-DD"[]
    fechasEventoExtra: [] as string[],
    presupuestoEstimado: "",
    tipoServicio: "",
    ideasReferencias: "",
    notas: "",
    serviciosInteres: [] as string[],
    equiposInteres: "",
    // Descubrimiento por nicho (catálogo comercial): nicho elegido, respuestas del
    // descubrimiento guiado (preguntaId→valor) y adicionales sugeridos encendidos.
    nichoSlug: "",
    respuestasDescubrimiento: {} as MapaRespuestas,
    adicionalesSeleccionados: [] as string[],
    notasEquipos: "",
    serviciosAdicionalesOtro: "",
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
    // Solo modo cliente: prefiere una llamada para consolidar el descubrimiento
    // o quiere la propuesta lo antes posible. "" = sin elegir.
    preferenciaContacto: "",
  });

  // Refs de apoyo para el auto-guardado global: el último formulario conocido
  // (para hacer flush al salir) y la firma de lo ya guardado (para no re-guardar
  // los datos de hidratación).
  const latestDiscRef = useRef(discForm);
  const lastSavedSigRef = useRef("");
  const autosaveArmedRef = useRef(false);
  // Última selección de equipos ya persistida en el servidor. Se usa para el
  // guardado INMEDIATO de `equiposInteres` (independiente del debounce global),
  // evitando re-guardar el valor hidratado.
  const equiposPersistidosRef = useRef<string | null>(null);
  useEffect(() => { latestDiscRef.current = discForm; });

  // ── Estrategia de cotización (solo vendedor) ──────────────────────────────────
  // Tres formas de armar la propuesta: por equipo, por producto o por paquete. Se
  // guarda dentro de `equiposInteres` (sin migración) y enruta la sub-pestaña del
  // selector. Para "aterrizar" en la sección, traemos su bloque a la vista.
  const selectorEquiposRef = useRef<HTMLDivElement>(null);
  const modoCotizacion = useMemo<"equipos" | "productos" | "paquetes" | null>(() => {
    try { const s = discForm.equiposInteres ? JSON.parse(discForm.equiposInteres) : null; return s?.modoCotizacion ?? null; }
    catch { return null; }
  }, [discForm.equiposInteres]);
  const elegirModoCotizacion = useCallback((m: "equipos" | "productos" | "paquetes") => {
    setDiscForm(p => {
      let sel: SeleccionEquipos;
      try { sel = p.equiposInteres ? JSON.parse(p.equiposInteres) : { categorias: [], equipos: [] }; }
      catch { sel = { categorias: [], equipos: [] }; }
      return { ...p, equiposInteres: JSON.stringify({ ...sel, modoCotizacion: m }) };
    });
  }, []);

  // Ruta del trato: 'full' (descubrimiento completo) vs 'direct' (salta a cotización).
  // Se guarda dentro de `equiposInteres` (sin migración), igual que modoCotizacion.
  const rutaDirecta = useMemo<boolean>(() => {
    try { const s = discForm.equiposInteres ? JSON.parse(discForm.equiposInteres) : null; return s?.ruta === "direct"; }
    catch { return false; }
  }, [discForm.equiposInteres]);
  const setRutaTrato = useCallback((r: "full" | "direct") => {
    setDiscForm(p => {
      let sel: Record<string, unknown> = {};
      try { sel = p.equiposInteres ? JSON.parse(p.equiposInteres) : {}; } catch { sel = {}; }
      return { ...p, equiposInteres: JSON.stringify({ ...sel, ruta: r }) };
    });
    if (r === "direct") setPasoActivo(1);
  }, []);

  // ── Fase 3: sub-paso dentro del Paso 2 (2a Estrategia · 2b Selección · 2c Adicionales) ──
  // Se persiste en `equiposInteres` (sin migración), igual que modoCotizacion/ruta.
  const subPaso = useMemo<"2a" | "2b" | "2c">(() => {
    const fromUrl = clientMode ? null : searchParams.get("paso");
    if (fromUrl === "2a" || fromUrl === "2b" || fromUrl === "2c") return fromUrl;
    try { const s = discForm.equiposInteres ? JSON.parse(discForm.equiposInteres) : null; return (s?.subpaso as "2a" | "2b" | "2c") ?? "2a"; }
    catch { return "2a"; }
  }, [discForm.equiposInteres, searchParams, clientMode]);
  const setSubPaso = useCallback((sp: "2a" | "2b" | "2c") => {
    setDiscForm(p => {
      let sel: Record<string, unknown> = {};
      try { sel = p.equiposInteres ? JSON.parse(p.equiposInteres) : {}; } catch { sel = {}; }
      return { ...p, equiposInteres: JSON.stringify({ ...sel, subpaso: sp }) };
    });
    if (!clientMode) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("paso", sp);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clientMode, searchParams, pathname, router]);
  // Cambiar de estrategia: confirma, limpia la selección base (categorias/equipos/
  // productos/paquetes) pero conserva adicionales; regresa a 2a.
  const cambiarEstrategia = useCallback(() => {
    setDiscForm(p => {
      let sel: Record<string, unknown> = {};
      try { sel = p.equiposInteres ? JSON.parse(p.equiposInteres) : {}; } catch { sel = {}; }
      const tieneBase = ["categorias", "equipos", "productos", "paquetes"].some(k => Array.isArray(sel[k]) && (sel[k] as unknown[]).length > 0);
      if (tieneBase && typeof window !== "undefined" && !window.confirm("Cambiar la estrategia limpiará los equipos y productos ya elegidos (los adicionales se conservan). ¿Continuar?")) return p;
      const resto = { ...sel };
      delete resto.categorias; delete resto.equipos; delete resto.productos; delete resto.paquetes; delete resto.cantidades;
      return { ...p, equiposInteres: JSON.stringify({ ...resto, categorias: [], equipos: [], productos: [], paquetes: [], subpaso: "2a" }) };
    });
    if (!clientMode) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("paso", "2a");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clientMode, searchParams, pathname, router]);
  const resumenSeleccion = useMemo(() => {
    try {
      const s = discForm.equiposInteres ? JSON.parse(discForm.equiposInteres) : {};
      const n = ["equipos", "productos", "paquetes", "categorias"].reduce((acc, k) => acc + (Array.isArray(s[k]) ? s[k].length : 0), 0);
      return n ? `${n} elemento${n === 1 ? "" : "s"}` : "sin elementos aún";
    } catch { return "sin elementos aún"; }
  }, [discForm.equiposInteres]);
  // Fase 5: 2C (adicionales) queda bloqueado hasta que 2B tenga al menos un ítem.
  const tieneSeleccion = useMemo(() => {
    try {
      const s = discForm.equiposInteres ? JSON.parse(discForm.equiposInteres) : {};
      return ["equipos", "productos", "paquetes", "categorias"].some(k => Array.isArray(s[k]) && s[k].length > 0);
    } catch { return false; }
  }, [discForm.equiposInteres]);

  // Hidratar el formulario con la información ya capturada en el trato
  // (ej. nombre y fecha que se ingresan al crear el contacto en Venta Cerrada,
  // o datos guardados en visitas anteriores). Se ejecuta una sola vez para no
  // pisar ediciones en curso.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !trato) return;
    hydratedRef.current = true;
    const isRenta = trato.tipoServicio === "RENTA";
    let renta: Record<string, string> = {};
    if (isRenta && trato.ideasReferencias) {
      try { renta = JSON.parse(trato.ideasReferencias); } catch { renta = {}; }
    }
    let servicios: string[] = [];
    if (trato.serviciosInteres) {
      try { const s = JSON.parse(trato.serviciosInteres); if (Array.isArray(s)) servicios = s; } catch { /* noop */ }
    }
    // Respaldo local: si el servidor no trae equipos pero el navegador guardó un
    // borrador de este trato, lo recuperamos para que no se pierda la selección.
    let equiposRestore = trato.equiposInteres || "";
    let equiposRestauradoLocal = false;
    if (!equiposRestore && !readOnly && !clientMode && !huerfano && typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(`disc-equipos-${trato.id}`);
        if (local) { equiposRestore = local; equiposRestauradoLocal = true; }
      } catch { /* noop */ }
    }
    setDiscForm(prev => {
      const hydrated = {
      ...prev,
      tipoEvento: trato.tipoEvento || prev.tipoEvento,
      subtipoEvento: trato.subtipoEvento || "",
      nombreEvento: trato.nombreEvento || "",
      fechaEventoEstimada: trato.fechaEventoEstimada ? String(trato.fechaEventoEstimada).split("T")[0] : "",
      lugarEstimado: trato.lugarEstimado === "Por definir" ? "por-definir" : (trato.lugarEstimado || ""),
      asistentesEstimados: trato.asistentesEstimados != null ? String(trato.asistentesEstimados) : "",
      diasServicio: trato.diasServicio != null ? String(trato.diasServicio) : "",
      // Días adicionales = todas las fechas guardadas menos el día 1 (fechaEventoEstimada)
      fechasEventoExtra: (() => {
        const dia1 = trato.fechaEventoEstimada ? String(trato.fechaEventoEstimada).split("T")[0] : "";
        return parseFechasEvento(trato.fechasEvento).filter((f) => f !== dia1);
      })(),
      presupuestoEstimado: trato.presupuestoEstimado != null ? String(trato.presupuestoEstimado) : "",
      tipoServicio: trato.tipoServicio || "",
      notas: trato.notas || "",
      serviciosInteres: servicios,
      equiposInteres: equiposRestore,
      nichoSlug: trato.nichoSlug || "",
      respuestasDescubrimiento: (() => {
        try { return normalizarRespuestas(JSON.parse(trato.respuestasDescubrimiento || "{}")); } catch { return {}; }
      })(),
      adicionalesSeleccionados: (() => {
        try { const a = JSON.parse(trato.adicionalesSeleccionados || "[]"); return Array.isArray(a) ? a : []; } catch { return []; }
      })(),
      familyAndFriends: !!trato.familyAndFriends,
      realizarRender: !!trato.realizarRender,
      tradeAplica: !!trato.tradeCalificado,
      horaInicioEvento: trato.horaInicioEvento || "",
      horaFinEvento: trato.horaFinEvento || "",
      duracionMontajeHrs: trato.duracionMontajeHrs != null ? String(trato.duracionMontajeHrs) : "",
      ventanaMontajeInicio: trato.ventanaMontajeInicio || "",
      ventanaMontajeFin: trato.ventanaMontajeFin || "",
      horaTerminoMontaje: trato.horaTerminoMontaje || "",
      contactoVenueNombre: trato.contactoVenueNombre || "",
      contactoVenueTelefono: trato.contactoVenueTelefono || "",
      contactoDecisorNombre: trato.contactoDecisorNombre || "",
      contactoDecisorCargo: trato.contactoDecisorCargo || "",
      preferenciaContacto: trato.preferenciaContacto || "",
      ideasReferencias: isRenta ? "" : (trato.ideasReferencias || ""),
      rentaModalidadServicio: renta.modalidadServicio || "",
      rentaModalidadEntrega: renta.modalidadEntrega || "",
      rentaDireccionEntrega: renta.direccionEntrega || "",
      rentaFechaEntrega: renta.fechaEntrega || "",
      rentaHoraEntrega: renta.horaEntrega || "",
      rentaFechaDevolucion: renta.fechaDevolucion || "",
      rentaHoraDevolucion: renta.horaDevolucion || "",
      rentaDescripcionEquipos: renta.descripcionEquipos || "",
      rentaTecnicoPropio: renta.tecnicoPropio || "",
      rentaNotas: renta.notas || "",
      };
      latestDiscRef.current = hydrated;
      return hydrated;
    });
    // Marcar la selección de equipos cargada como "ya persistida" para que el
    // guardado inmediato no la re-escriba en el primer render tras hidratar.
    equiposPersistidosRef.current = equiposRestore || "";
    // Si recuperamos los equipos del respaldo local, persistirlos de inmediato
    // en el servidor para volver a alinear la BD con lo que el usuario tenía.
    if (equiposRestauradoLocal) {
      patch({ equiposInteres: equiposRestore }).catch(() => {});
    }
  }, [trato]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleServicio = (idService: string) => {
    setDiscForm(p => {
      const isSel = p.serviciosInteres.includes(idService);
      const n = isSel ? p.serviciosInteres.filter(s => s !== idService) : [...p.serviciosInteres, idService];
      return { ...p, serviciosInteres: n };
    });
  };

  

  // Construye el payload de guardado a partir del formulario. Incluye TODOS los
  // campos del descubrimiento para que el auto-guardado sea equivalente al
  // guardado manual (antes omitía subtipo y contacto decisor).
  const buildDiscPayload = useCallback((form: typeof discForm) => {
    const isRenta = form.tipoServicio === "RENTA";
    const { fechasEvento, diasDerivados } = calcFechasEvento(form);
    return {
      tipoEvento: form.tipoEvento,
      subtipoEvento: form.subtipoEvento || null,
      nombreEvento: form.nombreEvento || null,
      fechaEventoEstimada: form.fechaEventoEstimada === "por-definir" ? null : (form.fechaEventoEstimada || null),
      fechasEvento,
      lugarEstimado: form.lugarEstimado === "por-definir" ? "Por definir" : (form.lugarEstimado || null),
      asistentesEstimados: form.asistentesEstimados ? parseInt(form.asistentesEstimados) : null,
      diasServicio: diasDerivados ?? (form.diasServicio ? parseInt(form.diasServicio) : null),
      presupuestoEstimado: form.presupuestoEstimado ? parseFloat(form.presupuestoEstimado) : null,
      tipoServicio: form.tipoServicio || null,
      notas: form.notas || null,
      familyAndFriends: form.familyAndFriends,
      realizarRender: form.realizarRender,
      tradeCalificado: form.tradeAplica,
      horaInicioEvento: form.horaInicioEvento || null,
      horaFinEvento: form.horaFinEvento || null,
      duracionEvento: calcDuracionEvento(form.horaInicioEvento, form.horaFinEvento),
      duracionMontajeHrs: form.duracionMontajeHrs ? parseFloat(form.duracionMontajeHrs) : null,
      ventanaMontajeInicio: form.ventanaMontajeInicio || null,
      ventanaMontajeFin: form.ventanaMontajeFin || null,
      horaTerminoMontaje: form.horaTerminoMontaje || null,
      contactoVenueNombre: form.contactoVenueNombre || null,
      contactoVenueTelefono: form.contactoVenueTelefono || null,
      contactoDecisorNombre: form.contactoDecisorNombre || null,
      contactoDecisorCargo: form.contactoDecisorCargo || null,
      preferenciaContacto: form.preferenciaContacto || null,
      serviciosInteres: JSON.stringify(form.serviciosInteres),
      equiposInteres: form.equiposInteres || null,
      nichoSlug: form.nichoSlug || null,
      respuestasDescubrimiento: Object.keys(form.respuestasDescubrimiento).length ? JSON.stringify(form.respuestasDescubrimiento) : null,
      adicionalesSeleccionados: form.adicionalesSeleccionados.length ? JSON.stringify(form.adicionalesSeleccionados) : null,
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
    };
  }, []);

  const autoSaveDisc = useCallback((form: typeof discForm) => {
    if (autoSaveDiscTimer.current) clearTimeout(autoSaveDiscTimer.current);
    setAutoSaveStatus("saving");
    autoSaveDiscTimer.current = setTimeout(async () => {
      autoSaveDiscTimer.current = null;
      await patch(buildDiscPayload(form));
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    }, 800);
  }, [buildDiscPayload]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush inmediato del guardado pendiente (al retroceder, navegar o cerrar la
  // pestaña). Usa keepalive para que la petición sobreviva a la descarga de la
  // página. Así no se pierden los cambios de los últimos 1.2s antes de salir.
  const flushDisc = useCallback(() => {
    if (!autoSaveDiscTimer.current) return;
    clearTimeout(autoSaveDiscTimer.current);
    autoSaveDiscTimer.current = null;
    try {
      const url = clientMode ? `/api/f/${token}` : `/api/tratos/${id}`;
      const payload = clientMode
        ? { ...buildDiscPayload(latestDiscRef.current), _discoveryMode: true }
        : buildDiscPayload(latestDiscRef.current);
      fetch(url, {
        method: clientMode ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch { /* noop */ }
  }, [id, buildDiscPayload, clientMode, token]);

  // Auto-guardado global: CUALQUIER cambio en el formulario dispara el guardado
  // con debounce. Antes solo la selección de servicios lo hacía, por eso al
  // retroceder se perdía todo el avance del descubrimiento.
  useEffect(() => {
    // En modo huérfano todavía no existe el trato, así que no hay auto-guardado:
    // los datos se persisten de golpe en el envío final.
    if (readOnly || huerfano || !hydratedRef.current) return;
    const sig = JSON.stringify(discForm);
    if (!autosaveArmedRef.current) {
      // Primera pasada tras hidratar: registramos la firma base sin guardar,
      // para no re-escribir los datos ya existentes ni los valores por defecto.
      autosaveArmedRef.current = true;
      lastSavedSigRef.current = JSON.stringify(latestDiscRef.current);
      return;
    }
    if (sig === lastSavedSigRef.current) return;
    lastSavedSigRef.current = sig;
    autoSaveDisc(discForm);
  }, [discForm, readOnly, huerfano, autoSaveDisc]);

  // Flush al desmontar (navegación SPA / botón atrás) y al ocultar la pestaña.
  useEffect(() => {
    if (readOnly) return;
    const handler = () => flushDisc();
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      flushDisc();
    };
  }, [readOnly, flushDisc]);

  // Respaldo local INMEDIATO (sin debounce) de la selección de equipos: se
  // escribe en cada cambio para que nunca se pierda aunque falle la red, se
  // cierre la pestaña o se navegue antes del auto-guardado con debounce.
  useEffect(() => {
    if (readOnly || clientMode || huerfano || !hydratedRef.current) return;
    try {
      if (discForm.equiposInteres) localStorage.setItem(`disc-equipos-${id}`, discForm.equiposInteres);
      else localStorage.removeItem(`disc-equipos-${id}`);
    } catch { /* noop */ }
    // Persistencia INMEDIATA al servidor (sin esperar el debounce global). La
    // selección de equipos son clics discretos, así que guardamos en cada cambio
    // con keepalive: así la selección del paso 2 nunca se pierde aunque el
    // usuario navegue a la cotización de inmediato. Solo re-guardamos si cambió
    // respecto a lo ya persistido (evita re-escribir el valor hidratado).
    const val = discForm.equiposInteres || "";
    if (val === (equiposPersistidosRef.current ?? "")) return;
    equiposPersistidosRef.current = val;
    try {
      fetch(`/api/tratos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equiposInteres: val || null }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* noop */ }
  }, [discForm.equiposInteres, readOnly, clientMode, huerfano, id]);

  async function guardarDescubrimiento(completar = false) {
    setSaving(true);
    const isRenta = discForm.tipoServicio === "RENTA";
    const { fechasEvento, diasDerivados } = calcFechasEvento(discForm);
    const payload: Record<string, unknown> = {
      tipoEvento: discForm.tipoEvento,
      subtipoEvento: discForm.subtipoEvento || null,
      nombreEvento: discForm.nombreEvento || null,
      fechaEventoEstimada: discForm.fechaEventoEstimada === "por-definir" ? null : (discForm.fechaEventoEstimada || null),
      fechasEvento,
      lugarEstimado: discForm.lugarEstimado === "por-definir" ? "Por definir" : (discForm.lugarEstimado || null),
      asistentesEstimados: discForm.asistentesEstimados ? parseInt(discForm.asistentesEstimados) : null,
      diasServicio: diasDerivados ?? (discForm.diasServicio ? parseInt(discForm.diasServicio) : null),
      presupuestoEstimado: discForm.presupuestoEstimado ? parseFloat(discForm.presupuestoEstimado) : null,
      tipoServicio: discForm.tipoServicio || null,
      notas: discForm.notas || null,
      familyAndFriends: discForm.familyAndFriends,
      realizarRender: discForm.realizarRender,
      tradeCalificado: discForm.tradeAplica,
      horaInicioEvento:     discForm.horaInicioEvento || null,
      horaFinEvento:        discForm.horaFinEvento || null,
      duracionEvento:       calcDuracionEvento(discForm.horaInicioEvento, discForm.horaFinEvento),
      duracionMontajeHrs:   discForm.duracionMontajeHrs ? parseFloat(discForm.duracionMontajeHrs) : null,
      ventanaMontajeInicio: discForm.ventanaMontajeInicio || null,
      ventanaMontajeFin:    discForm.ventanaMontajeFin || null,
      horaTerminoMontaje:   discForm.horaTerminoMontaje || null,
      contactoVenueNombre:  discForm.contactoVenueNombre || null,
      contactoVenueTelefono:discForm.contactoVenueTelefono || null,
      serviciosInteres: JSON.stringify(discForm.serviciosInteres),
      equiposInteres: discForm.equiposInteres || null,
      nichoSlug: discForm.nichoSlug || null,
      respuestasDescubrimiento: Object.keys(discForm.respuestasDescubrimiento).length ? JSON.stringify(discForm.respuestasDescubrimiento) : null,
      adicionalesSeleccionados: discForm.adicionalesSeleccionados.length ? JSON.stringify(discForm.adicionalesSeleccionados) : null,
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
    payload.preferenciaContacto = discForm.preferenciaContacto || null;
    if (completar) {
      payload.descubrimientoCompleto = true;
      payload.etapa = "OPORTUNIDAD";
    }
    const d = await patch(payload);
    if (d) setTrato((prev: any) => prev ? { ...prev, ...d.trato } : prev);
    setSaving(false);
    if (completar && onComplete) onComplete();
  }

  // ── Envío final del cliente (modo público) ────────────────────────────────
  // Persiste todo el descubrimiento de una sola vez y marca el formulario como
  // COMPLETADO. En huérfano crea el cliente + trato con los datos de contacto.
  async function enviarFormularioCliente() {
    if (huerfano) {
      const nombre = (contacto?.nombre || "").trim();
      const whatsapp = (contacto?.whatsapp || "").trim();
      if (!nombre || !whatsapp) {
        toast.error("Escribe tu nombre y WhatsApp para enviar el formulario");
        return;
      }
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      ...buildDiscPayload(discForm),
      _discoveryMode: true,
      _final: true,
    };
    if (huerfano && contacto) {
      payload.nombreContacto = contacto.nombre?.trim() || null;
      payload.telefonoContacto = contacto.whatsapp?.trim() || null;
      payload.correoContacto = contacto.correo?.trim() || null;
      payload.momentoContratacion = contacto.momentoContratacion || null;
    }
    try {
      const res = await fetch(`/api/f/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al enviar el formulario");
        return;
      }
      if (onComplete) onComplete();
    } catch {
      toast.error("Error de red al enviar");
    } finally {
      setSaving(false);
    }
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


  // Completitud del brief (derivada del estado, no de un flag manual): cuántos
  // datos esenciales siguen vacíos. Alimenta el chip "Faltan N datos".
  const CAMPOS_BRIEF: { key: string; label: string }[] = [
    { key: "nombreEvento", label: "Nombre del evento" },
    { key: "fechaEventoEstimada", label: "Fecha del evento" },
    { key: "lugarEstimado", label: "Lugar" },
    { key: "asistentesEstimados", label: "Asistentes" },
    { key: "presupuestoEstimado", label: "Presupuesto" },
    { key: "tipoServicio", label: "Tipo de servicio" },
  ];
  const briefFaltantes = CAMPOS_BRIEF.filter(c => {
    const v = (discForm as Record<string, unknown>)[c.key];
    return v == null || String(v).trim() === "";
  });
  const briefFaltanN = briefFaltantes.length;

  // ── Candados del Paso 1 (solo vendedor) ──────────────────────────────────
  // El nicho es candado solo si el tipo de evento tiene nichos configurados en el
  // catálogo; el subtipo "Otro" cuenta como cumplido. El tipo de servicio siempre.
  const tipoTieneNichos = catNichos.some(n => n.tipoEventoSlug === discForm.tipoEvento);
  const nichoOk = !tipoTieneNichos || !!discForm.nichoSlug || (discForm.subtipoEvento?.split(", ").some(s => s.startsWith("Otro")) ?? false);
  const servicioOk = !!discForm.tipoServicio;
  const paso1Incompleto = !clientMode && (!nichoOk || !servicioOk);
  const irAPaso = (target: number) => {
    if (paso1Incompleto && target > 1) { setAvisoPaso1(true); setPasoActivo(1); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setPasoActivo(target); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Pasos visibles: en ruta directa solo se muestra el Paso 1.
  const pasosVisibles = (!clientMode && rutaDirecta) ? PASOS_DISCOVERY.slice(0, 1) : PASOS_DISCOVERY;

  // ── Fase 3: el sub-stepper 2A/2B/2C solo aplica al vendedor en servicios que
  // arman propuesta (no Dirección Técnica). En modo cliente el flujo es único. ──
  const subStepper = !clientMode && !!discForm.tipoEvento && discForm.tipoServicio !== "DIRECCION_TECNICA";
  const modoLabel = modoCotizacion === "equipos" ? "Por equipo" : modoCotizacion === "productos" ? "Por producto" : modoCotizacion === "paquetes" ? "Por paquete" : "";
  const subLabel = subPaso === "2a" ? "Estrategia" : subPaso === "2b" ? "Selección" : "Adicionales";
  const avanzar = () => {
    if (subStepper && pasoActivo === 2) {
      if (subPaso === "2a") { if (!modoCotizacion) return; setSubPaso("2b"); return; }
      if (subPaso === "2b") { if (!tieneSeleccion) return; setSubPaso("2c"); return; }
      irAPaso(3); return;
    }
    irAPaso(pasoActivo + 1);
  };
  const retroceder = () => {
    if (subStepper && pasoActivo === 2) {
      if (subPaso === "2c") { setSubPaso("2b"); return; }
      if (subPaso === "2b") { setSubPaso("2a"); return; }
    }
    setPasoActivo(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden w-full">
                  {/* Step tabs */}
            <div className="px-5 pt-4 pb-2 border-b border-[#1a1a1a]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {pasosVisibles.map(paso => (
                    <button key={paso.id} onClick={() => irAPaso(paso.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                        pasoActivo === paso.id
                          ? "bg-[#B3985B] text-black"
                          : "bg-[#111] text-gray-500 hover:text-white border border-[#222] hover:border-[#444]"
                      }`}>
                      <paso.icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {paso.label}
                    </button>
                  ))}
                </div>
                {!clientMode && (
                  <div className="flex items-center gap-2 shrink-0">
                    {rutaDirecta && (
                      <button type="button" onClick={() => setRutaTrato("full")}
                        title="Volver al descubrimiento completo"
                        className="text-[10px] px-2 py-1 rounded-full bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30 whitespace-nowrap hover:bg-[#B3985B]/25 transition-colors">
                        Ruta directa · volver a descubrimiento
                      </button>
                    )}
                    {autoSaveStatus === "saving" && <span className="text-[10px] text-gray-500">Guardando…</span>}
                    {autoSaveStatus === "saved" && <span className="text-[10px] text-emerald-500">Guardado ✓</span>}
                    {briefFaltanN > 0 ? (
                      <span title={`Faltan: ${briefFaltantes.map(f => f.label).join(", ")}`}
                        className="text-[10px] px-2 py-1 rounded-full bg-amber-900/30 text-amber-300 border border-amber-800/40 whitespace-nowrap cursor-default">
                        Faltan {briefFaltanN} dato{briefFaltanN !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-800/40 whitespace-nowrap">
                        Brief completo
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 space-y-5">

            {/* PASO 1: Información básica */}
            {pasoActivo === 1 && (<div className="space-y-4">
              {/* Título + agradecimiento — solo cuando el cliente llena el formulario */}
              {clientMode && (
                <div className="border border-[#B3985B]/30 bg-gradient-to-br from-[#B3985B]/10 to-transparent rounded-xl p-4">
                  <p className="text-base sm:text-lg text-white font-semibold inline-flex items-center gap-1.5">
                    Cuéntanos sobre tu evento <Sparkles strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" />
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1.5 leading-relaxed">
                    ¡Gracias por tu interés! Este formulario nos ayuda a <span className="text-[#B3985B]">descubrir
                    exactamente lo que necesitas</span> para armarte una propuesta a la medida. Entre más
                    detalles nos compartas, más precisa y personalizada será tu cotización.
                  </p>
                </div>
              )}
              {/* Datos de contacto — solo en links huérfanos (sin trato previo) */}
              {clientMode && huerfano && (
                <div className="border border-[#2a2a2a] bg-[#111] rounded-xl p-4 space-y-3">
                  <p className="text-sm text-white font-semibold">Tus datos de contacto</p>
                  <p className="text-[11px] text-gray-500 -mt-1">Para poder enviarte la propuesta y comunicarnos contigo.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Nombre completo *</label>
                      <input type="text" value={contacto?.nombre || ""}
                        onChange={e => setContacto?.({ ...contacto, nombre: e.target.value })}
                        placeholder="Tu nombre"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">WhatsApp *</label>
                      <input type="tel" value={contacto?.whatsapp || ""}
                        onChange={e => setContacto?.({ ...contacto, whatsapp: e.target.value })}
                        placeholder="10 dígitos"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-400 block mb-1">Correo <span className="text-gray-600">(opcional)</span></label>
                      <input type="email" value={contacto?.correo || ""}
                        onChange={e => setContacto?.({ ...contacto, correo: e.target.value })}
                        placeholder="tucorreo@ejemplo.com"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Tipo de evento</label>
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {([
                      { te: "MUSICAL", icon: Music, label: "Musical", desc: "Conciertos, festivales, giras, etc." },
                      { te: "SOCIAL", icon: Wine, label: "Social", desc: "Bodas, XV años, fiestas privadas." },
                      { te: "EMPRESARIAL", icon: Building2, label: "Empresarial", desc: "Congresos, lanzamientos, expos." },
                      { te: "OTRO", icon: Calendar, label: "Otro", desc: "Algún otro tipo de evento." }
                    ] as const).map(t => (
                      <button key={t.te} type="button" onClick={() => setDiscForm(p => ({ ...p, tipoEvento: t.te, subtipoEvento: "", serviciosInteres: [] }))}
                        className={`text-left p-3 rounded-xl border transition-all ${discForm.tipoEvento === t.te ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#222] bg-[#111] hover:border-[#444]"}`}>
                        <div className="mb-1"><t.icon strokeWidth={1.75} className={`w-5 h-5 ${discForm.tipoEvento === t.te ? "text-[#B3985B]" : "text-gray-500"}`} /></div>
                        <p className={`text-sm font-semibold mb-0.5 ${discForm.tipoEvento === t.te ? "text-[#B3985B]" : "text-white"}`}>{t.label}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                
                {/* Subtipo de evento */}
                {discForm.tipoEvento && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-400 block mb-2">Subtipo de evento (puedes seleccionar varios)</label>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        // Subtipos = nichos del catálogo para este tipo de evento (fuente
                        // única, editable por admin). Fallback a SUBTIPOS_EVENTO si el
                        // catálogo aún no tiene nichos o no cargó (p. ej. modo cliente).
                        const nichosDelTipo = catNichos.filter(n => n.tipoEventoSlug === discForm.tipoEvento);
                        const slugPorLabel = new Map(nichosDelTipo.map(n => [n.nombre, n.slug]));
                        const opts = nichosDelTipo.length
                          ? nichosDelTipo.map(n => n.nombre)
                          : (SUBTIPOS_EVENTO[discForm.tipoEvento] ?? []);
                        const actuales = discForm.subtipoEvento ? discForm.subtipoEvento.split(', ') : [];
                        return (
                          <>
                            {opts.map(opt => (
                              <button key={opt} type="button" onClick={() => {
                                const nuevos = actuales.includes(opt) ? actuales.filter(a => a !== opt) : [...actuales, opt].filter(x => x && !x.startsWith("Otro"));
                                // nichoSlug = slug del primer subtipo elegido que exista en el catálogo.
                                const nichoSlug = nuevos.map(l => slugPorLabel.get(l)).find((s): s is string => !!s) || "";
                                setDiscForm(p => ({ ...p, subtipoEvento: nuevos.join(', '), nichoSlug }));
                              }}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${actuales.includes(opt) ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-500 hover:text-white"}`}>
                                {opt}
                              </button>
                            ))}
                            <button type="button" onClick={() => {
                                const isOtro = actuales.some(a => a.startsWith("Otro"));
                                setDiscForm(p => ({ ...p, subtipoEvento: isOtro ? actuales.filter(a => !a.startsWith("Otro")).join(', ') : [...actuales, "Otro"].join(', ') }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${actuales.some(a => a.startsWith("Otro")) ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-500 hover:text-white"}`}>
                              Otro
                            </button>
                          </>
                        );
                      })()}
                    </div>
                    {discForm.subtipoEvento?.includes("Otro") && (
                      <input type="text" placeholder="Especifica el otro subtipo..."
                        onChange={e => {
                          const actuales = discForm.subtipoEvento.split(', ').filter(x => !x.startsWith("Otro"));
                          setDiscForm(p => ({ ...p, subtipoEvento: [...actuales, `Otro: ${e.target.value}`].join(', ') }));
                        }}
                        className="mt-3 w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                      />
                    )}
                    {!clientMode && avisoPaso1 && !nichoOk && (
                      <p className="text-[11px] text-red-400 mt-2">Selecciona el nicho para continuar</p>
                    )}
                  </div>
                )}
              </div>

            {/* Step 1 continuation: base fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 block mb-2">Tipo de servicio</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {([
                    { value: "RENTA", label: "Renta de equipo", icon: Package, desc: "Solo equipo sin operación técnica compleja." },
                    { value: "PRODUCCION_TECNICA", label: "Producción Técnica", icon: Settings, desc: "Equipo, montaje y operación técnica." },
                    { value: "DIRECCION_TECNICA", label: "Dirección Técnica", icon: ClipboardList, desc: "Desarrollo conceptual, producción técnica y gestión completa de producción." }
                  ] as const).map(ts => (
                    <button key={ts.value} type="button" onClick={() => setDiscForm(p => ({ ...p, tipoServicio: ts.value }))}
                      className={`text-left p-4 rounded-xl border transition-all ${discForm.tipoServicio === ts.value ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#222] bg-[#111] hover:border-[#444]"}`}>
                      <div className="mb-2"><ts.icon strokeWidth={1.75} className={`w-6 h-6 ${discForm.tipoServicio === ts.value ? "text-[#B3985B]" : "text-gray-500"}`} /></div>
                      <p className={`text-sm font-semibold mb-1 ${discForm.tipoServicio === ts.value ? "text-[#B3985B]" : "text-white"}`}>{ts.label}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{ts.desc}</p>
                    </button>
                  ))}
                </div>
                {!clientMode && avisoPaso1 && !servicioOk && (
                  <p className="text-[11px] text-red-400 mt-2">Selecciona el tipo de servicio para continuar</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre del evento / proyecto</label>
                <input value={discForm.nombreEvento} onChange={e => setDiscForm(p => ({ ...p, nombreEvento: e.target.value }))}
                  placeholder="Ej: Boda García-López, Concierto Verano..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{clientMode ? "Tu presupuesto estimado" : "Presupuesto estimado del cliente"}</label>
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
                  <label className="text-xs text-gray-400">Lugar/salón del evento y ciudad *</label>
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

              {/* Horario del evento — inicio/fin y duración autocalculada. Dato clave
                  para cotización, contrato y fichas operativas; por eso vive junto a
                  fecha y lugar desde el primer paso. */}
              {discForm.tipoServicio !== "RENTA" && (
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 block mb-1">Horario del evento (inicio y fin)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <TimePicker value={discForm.horaInicioEvento || ""} onChange={v => setDiscForm(p => ({ ...p, horaInicioEvento: v }))} placeholder="Inicio" />
                    <TimePicker value={discForm.horaFinEvento || ""} onChange={v => setDiscForm(p => ({ ...p, horaFinEvento: v }))} placeholder="Fin" />
                  </div>
                  {(() => {
                    const dur = calcDuracionEvento(discForm.horaInicioEvento, discForm.horaFinEvento);
                    return dur ? (
                      <p className="text-[11px] text-[#B3985B] mt-1.5 inline-flex items-center gap-1">
                        <Clock strokeWidth={1.75} className="w-3 h-3" /> Duración del evento: {dur}
                      </p>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Días del evento — servicio de uno o varios días con fecha específica */}
              {discForm.fechaEventoEstimada && discForm.fechaEventoEstimada !== "por-definir" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Días del evento</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-12 shrink-0">Día 1</span>
                      <div className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-gray-300 text-sm">{discForm.fechaEventoEstimada}</div>
                    </div>
                    {discForm.fechasEventoExtra.map((fecha, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-12 shrink-0">Día {i + 2}</span>
                        <input
                          type="date"
                          value={fecha}
                          min={discForm.fechaEventoEstimada}
                          onChange={e => setDiscForm(p => {
                            const next = [...p.fechasEventoExtra];
                            next[i] = e.target.value;
                            return { ...p, fechasEventoExtra: next };
                          })}
                          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                        />
                        <button type="button"
                          onClick={() => setDiscForm(p => ({ ...p, fechasEventoExtra: p.fechasEventoExtra.filter((_, j) => j !== i) }))}
                          className="text-gray-500 hover:text-red-400 text-lg leading-none px-1" title="Quitar día">×</button>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => setDiscForm(p => ({ ...p, fechasEventoExtra: [...p.fechasEventoExtra, ""] }))}
                      className="text-xs text-[#B3985B] hover:text-[#c9ae70] flex items-center gap-1">
                      <span className="text-base leading-none">+</span> Agregar día
                    </button>
                    <p className="text-[11px] text-gray-500">
                      {1 + discForm.fechasEventoExtra.filter(Boolean).length} día(s) de servicio
                      {clientMode ? "" : " · se pre-llenan en la cotización y el calendario"}
                    </p>
                  </div>
                </div>
              )}

              {/* Número de asistentes — se define desde el primer paso */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Número de asistentes estimado</label>
                <select
                  value={snapRango(discForm.asistentesEstimados, rangosAsistentes)}
                  onChange={e => setDiscForm(p => ({ ...p, asistentesEstimados: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="">— Selecciona —</option>
                  {rangosAsistentes.map(r => (
                    <option key={r.label} value={r.value}>{r.label} personas</option>
                  ))}
                </select>
              </div>

              {/* Cuéntanos más de tu proyecto — se convierte en la nota de la cotización */}
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 block mb-1">
                  {clientMode ? "Cuéntanos un poco más de tu proyecto a detalle" : "Detalle del proyecto (nota para la cotización)"}
                </label>
                <p className="text-[11px] text-gray-600 mb-1.5">
                  {clientMode
                    ? "Todo lo que nos quieras contar: la idea, el ambiente que buscas, referencias, requerimientos especiales… Esto nos ayuda a personalizar tu propuesta."
                    : "Lo que el cliente comparte sobre su proyecto. Aparecerá como nota en la cotización."}
                </p>
                <textarea
                  value={discForm.notas}
                  onChange={e => setDiscForm(p => ({ ...p, notas: e.target.value }))}
                  rows={4}
                  placeholder="Ej: Queremos un ambiente elegante con iluminación cálida, tarima para grupo en vivo, y una entrada especial con humo bajo…"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                />
              </div>

            </div>

            {/* Ruta del trato: descubrimiento completo vs. directo a cotización (solo vendedor) */}
            {!clientMode && (
              <div className="border border-[#2a2a2a] bg-[#111] rounded-xl p-4 space-y-2">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Ruta del trato</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setRutaTrato("full")}
                    className={`rounded-lg border p-3 text-left text-sm font-semibold transition-colors ${!rutaDirecta ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]" : "border-[#2a2a2a] text-white hover:border-[#555]"}`}>
                    Hacer descubrimiento
                  </button>
                  <button type="button" onClick={() => setRutaTrato("direct")}
                    className={`rounded-lg border p-3 text-left text-sm font-semibold transition-colors ${rutaDirecta ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]" : "border-[#2a2a2a] text-white hover:border-[#555]"}`}>
                    Ir directo a cotización
                  </button>
                </div>
              </div>
            )}

            </div>)} {/* /paso1 */}

            {/* PASO 2: Detalles y extras */}
            {pasoActivo === 2 && (<div className="space-y-4">
              {/* ── Sub-stepper 2A/2B/2C (Fase 3) ── */}
              {subStepper && (
                <div className="flex items-center gap-2">
                  {([["2a", "Estrategia"], ["2b", "Selección"], ["2c", "Adicionales"]] as const).map(([sp, lb], i) => {
                    const activo = subPaso === sp;
                    const done = ["2a", "2b", "2c"].indexOf(subPaso) > i;
                    const bloqueado = (sp !== "2a" && !modoCotizacion) || (sp === "2c" && !tieneSeleccion);
                    return (
                      <button key={sp} type="button" disabled={bloqueado}
                        onClick={() => setSubPaso(sp)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${activo ? "border-[#B3985B] bg-[#B3985B]/10" : done ? "border-[#2a2a2a] bg-[#0e0e0e]" : "border-[#1a1a1a] bg-[#0a0a0a]"}`}>
                        <span className={`text-[10px] uppercase tracking-wider ${activo ? "text-[#B3985B]" : "text-gray-600"}`}>Paso {sp.toUpperCase()}</span>
                        <p className={`text-xs font-medium ${activo ? "text-white" : done ? "text-gray-400" : "text-gray-600"}`}>{lb}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* ── Rider específico / Contra-rider (modalidad elegida en el paso previo) ── */}
              {modalidad === "CONTRA_RIDER" && (!subStepper || subPaso === "2b") && (
                <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText strokeWidth={1.75} className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-200 text-sm font-semibold">Rider específico / Contra-rider</p>
                      <p className="text-[11px] text-blue-300/70 leading-relaxed mt-0.5">
                        {clientMode
                          ? "Cuéntanos qué equipos específicos necesitas (marcas/modelos) o sube tu rider técnico. Analizaremos tu solicitud y te propondremos la mejor solución."
                          : "Captura los equipos de otras marcas que pide el cliente o sube su rider técnico. Con esto preparamos un contra-rider. El inventario Mainstage abajo queda como referencia opcional."}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Descripción del rider / equipos requeridos</label>
                    <textarea
                      value={discForm.notasEquipos || ""}
                      onChange={e => setDiscForm(p => ({ ...p, notasEquipos: e.target.value }))}
                      rows={4}
                      placeholder="Ej: Consola DiGiCo SD12, 12x d&b V8, micrófonos Shure Axient... o describe el rider que necesitas."
                      className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-600 resize-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400 font-medium inline-flex items-center gap-1.5"><Folder strokeWidth={1.75} className="w-3.5 h-3.5" /> Rider técnico (archivo)</p>
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[11px] cursor-pointer transition-colors ${uploadingTipo === "DOCUMENTO" ? "opacity-40 pointer-events-none text-gray-500" : "text-gray-500 hover:text-white hover:border-[#444]"}`}>
                        {uploadingTipo === "DOCUMENTO" ? "Subiendo..." : "+ Subir rider"}
                        <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" multiple onChange={e => subirArchivo(e, "DOCUMENTO")} />
                      </label>
                    </div>
                    {archivos.filter(a => a.tipo === "DOCUMENTO").length === 0 ? (
                      <p className="text-gray-700 text-[11px] italic">Sin archivos aún</p>
                    ) : (
                      <ul className="space-y-1">
                        {archivos.filter(a => a.tipo === "DOCUMENTO").map(a => (
                          <li key={a.id} className="flex items-center gap-2 text-[11px] text-blue-300">
                            <Paperclip strokeWidth={1.75} className="w-3 h-3 shrink-0" />
                            <a href={a.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{a.nombre || a.url}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {/* ── 2A Estrategia: elegir cómo cotizar (solo vendedor). No navega solo. ── */}
              {subStepper && subPaso === "2a" && (
                <div className="rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] p-4 space-y-3">
                  <div>
                    <p className="text-sm text-white font-semibold">¿Cómo quieres cotizar este evento?</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "equipos", icon: Sliders, label: "Por equipo", desc: "Arma con equipos sueltos del inventario" },
                      { id: "productos", icon: Package, label: "Por producto", desc: "Soluciones ya armadas por categoría" },
                      { id: "paquetes", icon: Sparkles, label: "Por paquete", desc: "Paquetes completos listos para el evento" },
                    ] as const).map(op => {
                      const activo = modoCotizacion === op.id;
                      return (
                        <button key={op.id} type="button" disabled={readOnly}
                          onClick={() => elegirModoCotizacion(op.id)}
                          className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${activo ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#2a2a2a] hover:border-[#555]"}`}>
                          <op.icon strokeWidth={1.75} className={`w-4 h-4 ${activo ? "text-[#B3985B]" : "text-gray-400"}`} />
                          <p className={`text-xs font-semibold ${activo ? "text-[#B3985B]" : "text-white"}`}>{op.label}</p>
                          <p className="text-[10px] text-gray-500 leading-tight">{op.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Estrategia colapsada a línea editable en 2B/2C. */}
              {subStepper && subPaso !== "2a" && (
                <button type="button" onClick={cambiarEstrategia}
                  className="w-full flex items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#0e0e0e] px-3 py-2 text-left transition-colors hover:border-[#444]">
                  <span className="text-xs text-gray-300">Estrategia: <span className="text-white font-medium">{modoLabel || "—"}</span></span>
                  <span className="text-[11px] text-[#B3985B]">Cambiar</span>
                </button>
              )}
              {/* Selección colapsada a resumen editable en 2C. */}
              {subStepper && subPaso === "2c" && (
                <button type="button" onClick={() => setSubPaso("2b")}
                  className="w-full flex items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#0e0e0e] px-3 py-2 text-left transition-colors hover:border-[#444]">
                  <span className="text-xs text-gray-300">Selección: <span className="text-white font-medium">{resumenSeleccion}</span></span>
                  <span className="text-[11px] text-[#B3985B]">Editar</span>
                </button>
              )}
              {/* Sugerencias del catálogo por nicho (solo vendedor). Nada obliga ni oculta.
                  En sub-stepper: 2B muestra selección (paquetes/productos base), 2C adicionales. */}
              {!clientMode && discForm.tipoEvento && (!subStepper || subPaso !== "2a") && (
                <DescubrimientoCatalogo
                  seccion={subStepper ? (subPaso === "2c" ? "adicionales" : "seleccion") : undefined}
                  tipoEvento={discForm.tipoEvento}
                  nichoSlug={discForm.nichoSlug}
                  nichoNombre={catNichos.find(n => n.slug === discForm.nichoSlug && n.tipoEventoSlug === discForm.tipoEvento)?.nombre || ""}
                  asistentes={discForm.asistentesEstimados ? parseInt(discForm.asistentesEstimados) : null}
                  adicionales={catAdicionales}
                  preguntas={catPreguntas}
                  respuestas={discForm.respuestasDescubrimiento}
                  adicionalesSel={discForm.adicionalesSeleccionados}
                  categoriasSel={(() => {
                    try { const s = discForm.equiposInteres ? JSON.parse(discForm.equiposInteres) : null; return Array.isArray(s?.categorias) ? s.categorias : []; }
                    catch { return []; }
                  })()}
                  categoriaIdPorNombre={categoriaIdPorNombre}
                  productosSel={(() => {
                    try { const s = discForm.equiposInteres ? JSON.parse(discForm.equiposInteres) : null; return Array.isArray(s?.productos) ? s.productos.map((x: { id: string }) => x.id) : []; }
                    catch { return []; }
                  })()}
                  readOnly={readOnly}
                  onRespuesta={(pid, val) => setDiscForm(p => {
                    const next = { ...p.respuestasDescubrimiento };
                    // Trazabilidad: el vendedor no sobrescribe una respuesta del cliente.
                    if (next[pid]?.origen === "cliente") return p;
                    if (val) next[pid] = { valor: val, origen: "vendedor", ts: new Date().toISOString() };
                    else delete next[pid];
                    return { ...p, respuestasDescubrimiento: next };
                  })}
                  onToggleAdicional={(aid) => setDiscForm(p => ({
                    ...p,
                    adicionalesSeleccionados: p.adicionalesSeleccionados.includes(aid)
                      ? p.adicionalesSeleccionados.filter(x => x !== aid)
                      : [...p.adicionalesSeleccionados, aid],
                  }))}
                  onToggleCategoria={(cid) => setDiscForm(p => {
                    let sel: SeleccionEquipos;
                    try { sel = p.equiposInteres ? JSON.parse(p.equiposInteres) : { categorias: [], equipos: [] }; }
                    catch { sel = { categorias: [], equipos: [] }; }
                    const cats = Array.isArray(sel.categorias) ? sel.categorias : [];
                    const next = cats.includes(cid) ? cats.filter((x: string) => x !== cid) : [...cats, cid];
                    return { ...p, equiposInteres: JSON.stringify({ ...sel, categorias: next }) };
                  })}
                  onUsarPaquete={(paq) => setDiscForm(p => {
                    let sel: SeleccionEquipos;
                    try { sel = p.equiposInteres ? JSON.parse(p.equiposInteres) : { categorias: [], equipos: [] }; }
                    catch { sel = { categorias: [], equipos: [] }; }
                    const paquetes = sel.paquetes ? [...sel.paquetes] : [];
                    if (!paquetes.some(x => x.id === paq.id)) paquetes.push({ id: paq.id, cantidad: 1 });
                    // Enciende los adicionales que el paquete sugiere (sin duplicar).
                    let adicIds: string[] = [];
                    try { const arr = JSON.parse(paq.adicionalesSugeridos || "[]"); if (Array.isArray(arr)) adicIds = arr.filter((x): x is string => typeof x === "string"); }
                    catch {}
                    const adicionalesSeleccionados = [...p.adicionalesSeleccionados];
                    for (const aid of adicIds) if (!adicionalesSeleccionados.includes(aid)) adicionalesSeleccionados.push(aid);
                    return { ...p, equiposInteres: JSON.stringify({ ...sel, paquetes }), adicionalesSeleccionados };
                  })}
                  onUsarProducto={(prod) => setDiscForm(p => {
                    let sel: SeleccionEquipos;
                    try { sel = p.equiposInteres ? JSON.parse(p.equiposInteres) : { categorias: [], equipos: [] }; }
                    catch { sel = { categorias: [], equipos: [] }; }
                    const productos = sel.productos ? [...sel.productos] : [];
                    if (!productos.some(x => x.id === prod.id)) productos.push({ id: prod.id, cantidad: 1 });
                    return { ...p, equiposInteres: JSON.stringify({ ...sel, productos }) };
                  })}
                />
              )}
              {(!subStepper || subPaso === "2b") && (discForm.tipoServicio === "RENTA" ? (
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold">Detalles de renta</p>

                {/* ── Selector de equipos del inventario (igual que producción) ── */}
                <div ref={selectorEquiposRef}>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Equipos e inventario de interés</label>
                  {clientMode && (
                    <p className="text-[11px] text-gray-600 mb-3">Elige las categorías que te interesan y cuéntanos los detalles de cada una. No necesitas saber de equipos: tu asesor arma la propuesta.</p>
                  )}
                  <SelectorEquiposInventario
                    clientMode={clientMode}
                    readOnly={readOnly}
                    value={(() => {
                      try { return discForm.equiposInteres ? JSON.parse(discForm.equiposInteres as string) : { categorias: [], equipos: [], cantidades: {} }; }
                      catch { return { categorias: [], equipos: [], cantidades: {} }; }
                    })()}
                    onChange={(sel: SeleccionEquipos) => {
                      setDiscForm(p => ({ ...p, equiposInteres: JSON.stringify(sel) }));
                    }}
                    notas={discForm.notasEquipos || ""}
                    onNotasChange={(v) => setDiscForm(p => ({ ...p, notasEquipos: v }))}
                    capacidad={{
                      tipoEvento: discForm.tipoEvento,
                      asistentes: discForm.asistentesEstimados ? parseInt(discForm.asistentesEstimados) : null,
                      subtipos: discForm.subtipoEvento ? discForm.subtipoEvento.split(", ").filter(Boolean) : [],
                    }}
                    modo={modoCotizacion}
                  />
                </div>

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

              </div>
            ) : discForm.tipoServicio === "DIRECCION_TECNICA" ? (
              /* ── DIRECCIÓN TÉCNICA: Alcance del servicio ── */
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold mb-4">Alcance del servicio</p>

                  {/* Áreas de servicio */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">¿Qué áreas abarca este proyecto? <span className="text-gray-600">(selecciona las que apliquen)</span></label>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { id: "DT_CONCEPTUAL",    icon: Palette,     label: "Desarrollo conceptual",    desc: "Concepto creativo, ambientación, propuesta visual" },
                        { id: "DT_PROVEEDORES",   icon: Handshake,   label: "Gestión de proveedores",   desc: "Coordinación, contratación y supervisión de terceros" },
                        { id: "DT_PT_PROPIA",     icon: Sliders,     label: "PT propia Mainstage",      desc: "Nuestro propio servicio de producción técnica incluido" },
                        { id: "DT_LOGISTICA",     icon: Package,     label: "Logística integral",        desc: "Transporte, tiempos, cronograma y coordinación general" },
                        { id: "DT_PRESUPUESTO",   icon: DollarSign,  label: "Control de presupuesto",   desc: "Gestión del presupuesto global del evento" },
                        { id: "DT_SUPERVISIÓN",   icon: Eye,         label: "Supervisión en sitio",     desc: "Director técnico presente el día del evento" },
                      ] as const).map(area => (
                        <button key={area.id}
                          onClick={() => toggleServicio(area.id)}
                          title={area.desc}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            discForm.serviciosInteres.includes(area.id)
                              ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]"
                              : "border-[#2a2a2a] text-gray-300 hover:border-[#555] hover:text-white"
                          }`}>
                          <area.icon strokeWidth={1.75} className="w-3.5 h-3.5" />
                          <span>{area.label}</span>
                        </button>
                      ))}
                    </div>
                    {discForm.serviciosInteres.filter(s => s.startsWith("DT_")).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {discForm.serviciosInteres.filter(s => s.startsWith("DT_")).map(id => {
                          const area = [
                            { id: "DT_CONCEPTUAL",   desc: "Desarrollo conceptual, ambientación y propuesta visual del evento" },
                            { id: "DT_PROVEEDORES",  desc: "Coordinación, contratación y supervisión de proveedores externos" },
                            { id: "DT_PT_PROPIA",    desc: "Servicio de producción técnica de Mainstage Pro incluido en el paquete" },
                            { id: "DT_LOGISTICA",    desc: "Transporte, cronograma y coordinación general del evento" },
                            { id: "DT_PRESUPUESTO",  desc: "Gestión y control del presupuesto global" },
                            { id: "DT_SUPERVISIÓN",  desc: "Director técnico presente en sitio el día del evento" },
                          ].find(a => a.id === id);
                          return area ? (
                            <p key={id} className="text-[11px] text-gray-600 leading-relaxed">› {area.desc}</p>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  {/* Nivel de involucramiento */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">Nivel de involucramiento esperado</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: "DT_ASESOR",      label: "Solo asesoría",          desc: "Guía y recomendaciones. El cliente ejecuta." },
                        { id: "DT_PARCIAL",     label: "Coordinación parcial",   desc: "Gestionamos algunas áreas; el cliente coordina el resto." },
                        { id: "DT_INTEGRAL",    label: "Dirección integral",     desc: "Mainstage toma el control total de producción y logística." },
                      ].map(niv => (
                        <button key={niv.id}
                          onClick={() => setDiscForm(p => {
                            const sinNiv = p.serviciosInteres.filter(s => !["DT_ASESOR","DT_PARCIAL","DT_INTEGRAL"].includes(s));
                            return { ...p, serviciosInteres: [...sinNiv, niv.id] };
                          })}
                          className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                            discForm.serviciosInteres.includes(niv.id)
                              ? "border-[#B3985B] bg-[#B3985B]/10"
                              : "border-[#2a2a2a] hover:border-[#444]"
                          }`}>
                          <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${discForm.serviciosInteres.includes(niv.id) ? "border-[#B3985B] bg-[#B3985B]" : "border-[#555]"}`} />
                          <div>
                            <p className={`text-sm font-medium ${discForm.serviciosInteres.includes(niv.id) ? "text-[#B3985B]" : "text-white"}`}>{niv.label}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{niv.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Presupuesto global del evento */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-1">Presupuesto global del evento {!clientMode && <span className="text-gray-600">(si el cliente lo comparte)</span>}</label>
                    <input
                      type="text"
                      value={discForm.presupuestoEstimado}
                      onChange={e => setDiscForm(p => ({ ...p, presupuestoEstimado: e.target.value }))}
                      placeholder="Ej: $300,000 MXN total del evento"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
                  </div>

                  {/* Asistentes y detalle del proyecto se capturan en el paso 1 */}
                </div>

                {/* CTA Hacer propuesta — en paso 2 para DT (último paso) — solo vendedor */}
                {!clientMode && !trato.descubrimientoCompleto && (
                  <div className="border border-[#B3985B]/30 bg-[#B3985B]/5 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white text-sm font-semibold">¿Ya tienes todo lo que necesitas?</p>
                      <p className="text-gray-500 text-xs mt-0.5">Es hora de preparar la propuesta de Dirección Técnica</p>
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
              </div>
            ) : (
              <div className="space-y-4">
                {/* ── Selector de equipos del inventario ─────────────────── */}
                <div ref={selectorEquiposRef}>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Equipos e inventario de interés</label>
                  {clientMode && (
                    <p className="text-[11px] text-gray-600 mb-3">Elige las categorías que te interesan y cuéntanos los detalles de cada una. No necesitas saber de equipos: tu asesor arma la propuesta.</p>
                  )}
                  <SelectorEquiposInventario
                    clientMode={clientMode}
                    readOnly={readOnly}
                    value={(() => {
                      try { return discForm.equiposInteres ? JSON.parse(discForm.equiposInteres as string) : { categorias: [], equipos: [], cantidades: {} }; }
                      catch { return { categorias: [], equipos: [], cantidades: {} }; }
                    })()}
                    onChange={(sel: SeleccionEquipos) => {
                      setDiscForm(p => ({ ...p, equiposInteres: JSON.stringify(sel) }));
                    }}
                    notas={discForm.notasEquipos || ""}
                    onNotasChange={(v) => setDiscForm(p => ({ ...p, notasEquipos: v }))}
                    capacidad={{
                      tipoEvento: discForm.tipoEvento,
                      asistentes: discForm.asistentesEstimados ? parseInt(discForm.asistentesEstimados) : null,
                      subtipos: discForm.subtipoEvento ? discForm.subtipoEvento.split(", ").filter(Boolean) : [],
                    }}
                    modo={modoCotizacion}
                  />
                </div>
              </div>
            ))}

            {/* ── Notas Técnicas / Equipos Adicionales (Manual) ───────────────────────
                En producción técnica y renta el campo lo maneja el selector (tras las
                categorías); aquí solo para Dirección Técnica. */}
            {discForm.tipoServicio === "DIRECCION_TECNICA" && (
            <div className="pt-2">
              <label className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold block mb-2">Notas Técnicas y Equipo Adicional (Manual)</label>
              <p className="text-[11px] text-gray-500 mb-2">Detalla marcas, modelos específicos, o lista cualquier equipo que no hayas encontrado en las categorías.</p>
              <textarea
                value={discForm.notasEquipos || ""}
                onChange={e => setDiscForm(p => ({ ...p, notasEquipos: e.target.value }))}
                rows={4}
                placeholder="Ej: Necesitamos 4 micrófonos Shure ULXD, consola Digico SD12, o detalles adicionales técnicos..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
              />
            </div>
            )}

              {/* El número de asistentes se captura en el paso 1 */}

            </div>)} {/* /paso2 */}

            {/* PASO 3: Operativo y Logística — RENTA (entrega y devolución) */}
            {discForm.tipoServicio === "RENTA" && pasoActivo === 3 && (<div className="space-y-4">
              <p className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold">Logística de entrega y devolución</p>

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

              {/* Referencias y archivos del cliente */}
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Referencias y archivos del cliente</p>
                {(["REFERENCIA", "DOCUMENTO"] as const).map((cat) => {
                  const catMeta = {
                    REFERENCIA: { label: "Referencias del cliente", icon: ImageIcon, accept: "image/*,.pdf", hint: "Imágenes o docs que el cliente comparte como inspiración" },
                    DOCUMENTO:  { label: "Otros documentos",  icon: Folder, accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip", hint: "Contratos, riders, planos, cualquier archivo" },
                  }[cat];
                  const catArchivos = archivos.filter(a => a.tipo === cat);
                  const uploading = uploadingTipo === cat;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-400 font-medium inline-flex items-center gap-1.5"><catMeta.icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {catMeta.label}</p>
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
                                    {/\.pdf$/i.test(a.url) ? <FileText strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : /\.(doc|docx)$/i.test(a.url) ? <PenLine strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : /\.(xls|xlsx)$/i.test(a.url) ? <BarChart3 strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : <Paperclip strokeWidth={1.75} className="w-5 h-5 text-gray-500" />}
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
            </div>)} {/* /paso3 RENTA */}

            {/* PASO 3: Operativo y Logística */}
            {discForm.tipoServicio !== "RENTA" && pasoActivo === 3 && (<div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-1.5 inline-flex items-center gap-1.5"><Lightbulb strokeWidth={1.75} className="w-3.5 h-3.5" /> Ideas / Referencias (links)</label>
                  <p className="text-[11px] text-gray-500 mb-3">Links de Pinterest, Instagram, Google Drive o cualquier sitio web que sirva de inspiración (ej: fotos de otros eventos, ideas de internet, etc.) para entender el mood del proyecto.</p>
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

              {/* Las notas del proyecto se capturan en el paso 1 ("Cuéntanos más de tu proyecto") */}

              {/* Referencias y archivos del cliente */}
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Referencias y archivos del cliente</p>
                {(["REFERENCIA", "DOCUMENTO"] as const).map((cat) => {
                  const catMeta = {
                    REFERENCIA: { label: "Referencias del cliente", icon: ImageIcon, accept: "image/*,.pdf", hint: "Imágenes o docs que el cliente comparte como inspiración" },
                    DOCUMENTO:  { label: "Otros documentos",  icon: Folder, accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip", hint: "Contratos, riders, planos, cualquier archivo" },
                  }[cat];
                  const catArchivos = archivos.filter(a => a.tipo === cat);
                  const uploading = uploadingTipo === cat;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-400 font-medium inline-flex items-center gap-1.5"><catMeta.icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {catMeta.label}</p>
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
                                    {/\.pdf$/i.test(a.url) ? <FileText strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : /\.(doc|docx)$/i.test(a.url) ? <PenLine strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : /\.(xls|xlsx)$/i.test(a.url) ? <BarChart3 strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : <Paperclip strokeWidth={1.75} className="w-5 h-5 text-gray-500" />}
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

            {/* Scouting · Visita en sitio — vive dentro del Paso 3 (Contexto) */}
            {!clientMode && pasoActivo === 3 && renderScouting}

            {/* PASO 4: Opciones comerciales */}
            {pasoActivo === 4 && (<div className="space-y-4">

              {/* Toggles: Mainstage Trade + Render — solo vendedor */}
              {!clientMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              )}

              {/* Preferencia de contacto — SOLO cuando el cliente llena el formulario */}
              {clientMode && (
                <div>
                  <label className="text-xs text-gray-400 block mb-2">¿Cómo prefieres continuar?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { value: "LLAMADA", icon: Phone, label: "Quiero una llamada", desc: "Prefiero que me contacten para consolidar juntos los detalles." },
                      { value: "PROPUESTA", icon: Zap, label: "Quiero mi propuesta ya", desc: "Prefiero recibir una propuesta lo antes posible." },
                    ] as const).map(pref => (
                      <button key={pref.value} type="button"
                        onClick={() => setDiscForm(p => ({ ...p, preferenciaContacto: p.preferenciaContacto === pref.value ? "" : pref.value }))}
                        className={`text-left p-3 rounded-xl border transition-all ${discForm.preferenciaContacto === pref.value ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#222] bg-[#111] hover:border-[#444]"}`}>
                        <div className="mb-1"><pref.icon strokeWidth={1.75} className={`w-5 h-5 ${discForm.preferenciaContacto === pref.value ? "text-[#B3985B]" : "text-gray-500"}`} /></div>
                        <p className={`text-sm font-semibold mb-0.5 ${discForm.preferenciaContacto === pref.value ? "text-[#B3985B]" : "text-white"}`}>{pref.label}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{pref.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Panel de envío del cliente — solo modo público */}
              {clientMode && (
                <div className="border border-[#B3985B]/30 bg-[#B3985B]/5 rounded-xl p-5 text-center space-y-3">
                  <p className="text-white text-base font-semibold inline-flex items-center gap-1.5">¡Ya casi terminas! <PartyPopper strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" /></p>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Revisa que la información esté completa y envíanos tu solicitud.
                    Nuestro equipo te contactará con una propuesta a la medida.
                  </p>
                  <button
                    onClick={enviarFormularioCliente}
                    disabled={saving}
                    className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                    {saving ? "Enviando…" : "Enviar formulario →"}
                  </button>
                </div>
              )}

              {/* CTA Hacer cotización — con resumen de equipos y cantidades del descubrimiento */}
              {!clientMode && (
                <div className="border border-[#B3985B]/30 bg-[#B3985B]/5 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white text-sm font-semibold">Descubrimiento completo</p>
                      <p className="text-gray-500 text-xs mt-0.5">Los equipos y cantidades seleccionados se sugieren al armar la cotización — ahí los agregas con un clic.</p>
                    </div>
                    <Link
                      href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
                      onClick={() => { if (!trato.descubrimientoCompleto) guardarDescubrimiento(true); }}
                      className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-5 py-2 rounded-lg transition-colors shrink-0"
                    >
                      Hacer cotización →
                    </Link>
                  </div>
                  {(() => {
                    let sel: SeleccionEquipos | null = null;
                    try { sel = discForm.equiposInteres ? JSON.parse(discForm.equiposInteres) : null; } catch { sel = null; }
                    const tiene = !!sel && ((sel.equipos?.length ?? 0) > 0 || (sel.categorias?.length ?? 0) > 0 || (sel.extras?.length ?? 0) > 0);
                    if (!tiene || !sel) return null;
                    return (
                      <div className="pt-3 border-t border-[#1a1a1a]">
                        <p className="text-[11px] text-[#B3985B] uppercase tracking-wider font-semibold mb-2">Equipos y cantidades seleccionados</p>
                        <SelectorEquiposInventario value={sel} onChange={() => {}} readOnly />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>)} {/* /paso5 */}

            </div> {/* /p-5 space-y-5 */}

            {/* Wizard footer navigation */}
            <div className="px-5 py-4 border-t border-[#1a1a1a] flex items-center justify-between">
              <button onClick={retroceder} disabled={pasoActivo === 1 && (!subStepper || subPaso === "2a")}
                className="text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-30 px-3 py-2 rounded-lg border border-[#222] hover:border-[#444]">
                ← Anterior
              </button>
              <span className="text-[10px] text-gray-600">{pasoActivo} / {pasosVisibles.length}{subStepper && pasoActivo === 2 ? ` · ${subLabel}` : ""}</span>
              {!clientMode && rutaDirecta ? (
                <Link
                  href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
                  onClick={() => { if (!trato.descubrimientoCompleto) guardarDescubrimiento(true); }}
                  className="text-xs px-4 py-2 bg-[#B3985B] text-black font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors">
                  Hacer cotización →
                </Link>
              ) : (pasoActivo < pasosVisibles.length || (subStepper && pasoActivo === 2 && subPaso !== "2c")) ? (
                <button onClick={avanzar}
                  className={`text-xs px-4 py-2 font-semibold rounded-lg transition-colors ${(paso1Incompleto && pasoActivo === 1) || (subStepper && pasoActivo === 2 && ((subPaso === "2a" && !modoCotizacion) || (subPaso === "2b" && !tieneSeleccion))) ? "bg-[#B3985B]/40 text-black/60" : "bg-[#B3985B] text-black hover:bg-[#c9a96a]"}`}>
                  Siguiente →
                </button>
              ) : (
                trato.descubrimientoCompleto
                  ? <span className="text-xs text-[#B3985B] font-medium">✓ Descubrimiento completo</span>
                  : <span />
              )}
            </div>
    </div>
  );
}
