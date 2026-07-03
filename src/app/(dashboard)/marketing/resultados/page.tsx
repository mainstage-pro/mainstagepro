"use client";

import { useEffect, useState, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { useToast } from "@/components/Toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Publicacion {
  id: string; fecha: string; formato: string | null; objetivo: string | null;
  descripcion: string | null; tipo: { nombre: string; formato: string } | null;
  enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean;
  estado: string; comentarios: string | null; pruebaPubUrl: string | null;
}

interface MetricaOrganica {
  id: string; mes: string; plataforma: string;
  seguidores: number | null; alcance: number | null; impresiones: number | null;
  interacciones: number | null; guardados: number | null; publicaciones: number | null;
}

interface EjecucionCampana {
  id: string; nombre: string; objetivo: string | null; canal: string | null;
  fechaInicio: string; fechaFin: string; estado: string; presupuesto: number | null;
  mes: string; alcance: number | null; impresiones: number | null; clics: number | null;
  ctr: number | null; cantResultados: number | null; costoResultado: number | null;
  tipo: { nombre: string } | null;
}

interface ReporteOrganico {
  id: string; mes: string; comentariosGenerales: string | null; logros: string | null; estado: string;
}
interface ReporteResultados {
  id: string; mes: string; analisis: string | null;
  propuesta1: string | null; propuesta2: string | null; propuesta3: string | null;
  comentariosFinales: string | null; estado: string;
}
interface ReporteCampanasEj {
  id: string; mes: string; comentariosEjecucion: string | null; comentariosFinales: string | null; estado: string;
}
interface ReporteCampanasRes {
  id: string; mes: string; analisis: string | null;
  propuesta1: string | null; propuesta2: string | null; propuesta3: string | null;
  comentariosFinales: string | null; estado: string;
}

type TabKey = "ejecucion-organica" | "resultados-organicos" | "ejecucion-campanas" | "resultados-campanas";

// Panel de apelación por publicación
interface ApelaciónState {
  pubId: string;
  uploading: boolean;
  file: File | null;
  previewUrl: string | null;
  comentario: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESES_LABEL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const PLT_COLORS: Record<string, string> = {
  Instagram: "#E1306C", Facebook: "#1877F2", TikTok: "#69C9D0", YouTube: "#FF0000",
};
const PLATAFORMAS = ["Instagram", "Facebook", "TikTok", "YouTube"];
const FORMATO_COLORS: Record<string, string> = {
  POST: "#3b82f6", REEL: "#a855f7", STORIE: "#ec4899", TIK_TOK: "#06b6d4",
};
const ESTADO_COLORS_PIE: Record<string, string> = {
  PUBLICADO: "#10b981", EN_PROCESO: "#3b82f6", LISTO: "#f59e0b",
  PENDIENTE: "#6b7280", CANCELADO: "#ef4444",
};
const ESTADO_LABEL: Record<string, string> = {
  PUBLICADO: "Publicado", EN_PROCESO: "En proceso", LISTO: "Listo",
  PENDIENTE: "Pendiente", CANCELADO: "Cancelado",
};
const CAMP_ESTADO_COLORS: Record<string, string> = {
  PLANIFICADA: "bg-gray-800 text-gray-300",
  EN_EJECUCION: "bg-blue-900/40 text-blue-300",
  COMPLETADA: "bg-emerald-900/40 text-emerald-300",
  CANCELADA: "bg-red-900/40 text-red-400",
};
const METRICS_COLS = [
  { key: "seguidores", label: "Seguidores" },
  { key: "alcance", label: "Alcance" },
  { key: "impresiones", label: "Impresiones" },
  { key: "interacciones", label: "Interacciones" },
  { key: "guardados", label: "Guardados" },
  { key: "publicaciones", label: "Publicaciones" },
] as const;

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "ejecucion-organica",    label: "Ejecución Orgánica",   icon: "📋" },
  { key: "resultados-organicos",  label: "Resultados Orgánicos", icon: "📊" },
  { key: "ejecucion-campanas",    label: "Ejecución Campañas",   icon: "📣" },
  { key: "resultados-campanas",   label: "Resultados Campañas",  icon: "🎯" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMesAnterior() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getMesesRange(endMes: string, n: number): string[] {
  const [y, m] = endMes.split("-").map(Number);
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}
function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES_LABEL[parseInt(m) - 1]} ${y}`;
}
function mesLabelShort(mes: string) {
  const [, m] = mes.split("-");
  return MESES_LABEL[parseInt(m) - 1].slice(0, 3);
}
function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function fmx(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
// Fecha segura desde ISO string (evita "Invalid Date" por doble formato)
function parseFechaPub(fecha: string): Date {
  // fecha puede venir como "2026-07-15T06:00:00.000Z" o "2026-07-15"
  return new Date(fecha);
}
function fechaCorta(fecha: string) {
  const d = parseFechaPub(fecha);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
}
function getPlatformsStr(p: Publicacion) {
  const pl = [];
  if (p.enFacebook) pl.push("FB");
  if (p.enInstagram) pl.push("IG");
  if (p.enTiktok) pl.push("TT");
  if (p.enYoutube) pl.push("YT");
  return pl.join(", ") || "—";
}
function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|avif|heic)(\?|$)/i.test(url);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = "text-white" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <p className="text-[#6b7280] text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[#555] text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

function AnalisisSection({ title, color, fields, values, onChange, saving }: {
  title: string; color: string;
  fields: { key: string; label: string; placeholder: string; rows?: number }[];
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
  saving: boolean;
}) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${color}`}>{title}</h3>
        {saving && <span className="text-[10px] text-[#555] animate-pulse">Guardando…</span>}
      </div>
      <div className="p-5 space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1.5">{f.label}</label>
            <textarea
              value={values[f.key] ?? ""}
              onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={f.rows ?? 3}
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/40 resize-none leading-relaxed"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DevBanner() {
  return (
    <div className="flex items-center gap-3 bg-purple-950/30 border border-purple-500/20 rounded-xl px-5 py-3">
      <span className="text-xl">🚧</span>
      <div>
        <p className="text-purple-300 text-sm font-semibold">Módulo en desarrollo</p>
        <p className="text-purple-400/70 text-xs">La estructura y los campos están listos para conectarse cuando se active el módulo de campañas.</p>
      </div>
    </div>
  );
}

// Panel de conexión con publicidad — info de dónde vendrá cada dato
function ConexionPublicidadInfo({ tab }: { tab: "ejecucion" | "resultados" }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 text-xs space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[#B3985B]">🔗</span>
        <p className="text-[#9ca3af] font-semibold uppercase tracking-wider text-[10px]">Conexión con el Módulo de Publicidad</p>
      </div>
      {tab === "ejecucion" ? (
        <div className="space-y-2">
          <div className="flex gap-3">
            <span className="text-purple-400 shrink-0 mt-0.5">→</span>
            <div>
              <p className="text-white font-medium">Tabla de campañas</p>
              <p className="text-[#555]">Fuente: <code className="text-[#B3985B] bg-[#111] px-1 rounded">EjecucionCampana</code> filtrada por campo <code className="text-[#B3985B] bg-[#111] px-1 rounded">mes</code>. Se alimenta desde <strong className="text-white">Publicidad → Campañas → Calendario</strong>.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-purple-400 shrink-0 mt-0.5">→</span>
            <div>
              <p className="text-white font-medium">Estado de ejecución</p>
              <p className="text-[#555]">Campo <code className="text-[#B3985B] bg-[#111] px-1 rounded">estado</code>: <code className="text-white">PLANIFICADA | EN_EJECUCION | COMPLETADA | CANCELADA</code>. Se actualiza desde el módulo de campañas.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-purple-400 shrink-0 mt-0.5">→</span>
            <div>
              <p className="text-white font-medium">Presupuesto</p>
              <p className="text-[#555]">Campo <code className="text-[#B3985B] bg-[#111] px-1 rounded">presupuesto</code> de cada ejecución. Se define al crear la campaña en Publicidad.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-3">
            <span className="text-blue-400 shrink-0 mt-0.5">→</span>
            <div>
              <p className="text-white font-medium">KPIs por campaña</p>
              <p className="text-[#555]">Fuente: campos <code className="text-[#B3985B] bg-[#111] px-1 rounded">alcance</code>, <code className="text-[#B3985B] bg-[#111] px-1 rounded">impresiones</code>, <code className="text-[#B3985B] bg-[#111] px-1 rounded">clics</code>, <code className="text-[#B3985B] bg-[#111] px-1 rounded">ctr</code>, <code className="text-[#B3985B] bg-[#111] px-1 rounded">cantResultados</code>, <code className="text-[#B3985B] bg-[#111] px-1 rounded">costoResultado</code> en <code className="text-[#B3985B] bg-[#111] px-1 rounded">EjecucionCampana</code>. Se actualizan desde <strong className="text-white">Publicidad → Campañas</strong>.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-400 shrink-0 mt-0.5">→</span>
            <div>
              <p className="text-white font-medium">Meta Ads detallado</p>
              <p className="text-[#555]">Para campañas de Meta, los resultados granulares vienen de <code className="text-[#B3985B] bg-[#111] px-1 rounded">MetaResultado</code> → <strong className="text-white">Publicidad → Meta Ads</strong>. Incluye CPM, CPC, CPL y frecuencia.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-400 shrink-0 mt-0.5">→</span>
            <div>
              <p className="text-white font-medium">Para activar este módulo</p>
              <p className="text-[#555]">Cuando el equipo empiece a operar campañas, ve a <strong className="text-white">Publicidad → Campañas → Calendario</strong>, crea campañas del mes y registra sus resultados. Aparecerán aquí automáticamente.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ResultadosMarketingPage() {
  const toast = useToast();
  const [mes, setMes] = useState(getMesAnterior());
  const [tab, setTab] = useState<TabKey>("ejecucion-organica");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  async function handleDescargarPDF() {
    setDownloadingPDF(true);
    try {
      const r = await fetch(`/api/marketing/pdf?mes=${mes}&tipo=${tab}`);
      if (!r.ok) { toast.error("Error al generar el PDF"); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = r.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `Reporte-Marketing-${tab}-${mes}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { toast.error("Error al generar el PDF"); }
    finally { setDownloadingPDF(false); }
  }

  // ── Tab 1: Ejecución Orgánica
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [loadingPub, setLoadingPub] = useState(true);
  const [rpOrganico, setRpOrganico] = useState<ReporteOrganico | null>(null);
  const [rpOrganicoForm, setRpOrganicoForm] = useState({ comentariosGenerales: "", logros: "" });
  const [savingRpOrg, setSavingRpOrg] = useState(false);
  const [editingComentario, setEditingComentario] = useState<string | null>(null);
  const [comentarioDraft, setComentarioDraft] = useState("");
  // Apelaciones
  const [apelacion, setApelacion] = useState<ApelaciónState | null>(null);

  // ── Tab 2: Resultados Orgánicos
  const [metricas, setMetricas] = useState<MetricaOrganica[]>([]);
  const [loadingMet, setLoadingMet] = useState(true);
  const [rpResultados, setRpResultados] = useState<ReporteResultados | null>(null);
  const [rpResultadosForm, setRpResultadosForm] = useState({
    analisis: "", propuesta1: "", propuesta2: "", propuesta3: "", comentariosFinales: "",
  });
  const [savingRpRes, setSavingRpRes] = useState(false);
  const [savingMetrica, setSavingMetrica] = useState<string | null>(null);
  const [chartMetrica, setChartMetrica] = useState<string>("seguidores");

  // ── Tab 3: Ejecución Campañas
  const [ejecuciones, setEjecuciones] = useState<EjecucionCampana[]>([]);
  const [loadingEj, setLoadingEj] = useState(true);
  const [rpCampEj, setRpCampEj] = useState<ReporteCampanasEj | null>(null);
  const [rpCampEjForm, setRpCampEjForm] = useState({ comentariosEjecucion: "", comentariosFinales: "" });
  const [savingRpCampEj, setSavingRpCampEj] = useState(false);

  // ── Tab 4: Resultados Campañas
  const [rpCampRes, setRpCampRes] = useState<ReporteCampanasRes | null>(null);
  const [rpCampResForm, setRpCampResForm] = useState({
    analisis: "", propuesta1: "", propuesta2: "", propuesta3: "", comentariosFinales: "",
  });
  const [savingRpCampRes, setSavingRpCampRes] = useState(false);

  // ─── Load ─────────────────────────────────────────────────────────────────

  const loadPublicaciones = useCallback(async () => {
    setLoadingPub(true);
    const r = await fetch(`/api/marketing/publicaciones?mes=${mes}`);
    if (r.ok) setPublicaciones((await r.json()).publicaciones ?? []);
    setLoadingPub(false);
  }, [mes]);

  const loadReporteOrganico = useCallback(async () => {
    const r = await fetch(`/api/marketing/reportes/organico-ejecucion?mes=${mes}`);
    if (r.ok) {
      const d = (await r.json()).reporte;
      setRpOrganico(d);
      setRpOrganicoForm({ comentariosGenerales: d.comentariosGenerales ?? "", logros: d.logros ?? "" });
    }
  }, [mes]);

  const loadMetricas = useCallback(async () => {
    setLoadingMet(true);
    const meses3 = getMesesRange(mes, 3);
    const r = await fetch(`/api/marketing/metricas?meses=3`);
    if (r.ok) {
      const all: MetricaOrganica[] = (await r.json()).metricas ?? [];
      setMetricas(all.filter(m => meses3.includes(m.mes)));
    }
    setLoadingMet(false);
  }, [mes]);

  const loadReporteResultados = useCallback(async () => {
    const r = await fetch(`/api/marketing/reportes/organico-resultados?mes=${mes}`);
    if (r.ok) {
      const d = (await r.json()).reporte;
      setRpResultados(d);
      setRpResultadosForm({
        analisis: d.analisis ?? "", propuesta1: d.propuesta1 ?? "",
        propuesta2: d.propuesta2 ?? "", propuesta3: d.propuesta3 ?? "",
        comentariosFinales: d.comentariosFinales ?? "",
      });
    }
  }, [mes]);

  const loadEjecuciones = useCallback(async () => {
    setLoadingEj(true);
    const r = await fetch(`/api/marketing/ejecuciones?mes=${mes}`);
    if (r.ok) setEjecuciones((await r.json()).ejecuciones ?? []);
    setLoadingEj(false);
  }, [mes]);

  const loadReporteCampEj = useCallback(async () => {
    const r = await fetch(`/api/marketing/reportes/campanas-ejecucion?mes=${mes}`);
    if (r.ok) {
      const d = (await r.json()).reporte;
      setRpCampEj(d);
      setRpCampEjForm({ comentariosEjecucion: d.comentariosEjecucion ?? "", comentariosFinales: d.comentariosFinales ?? "" });
    }
  }, [mes]);

  const loadReporteCampRes = useCallback(async () => {
    const r = await fetch(`/api/marketing/reportes/campanas-resultados?mes=${mes}`);
    if (r.ok) {
      const d = (await r.json()).reporte;
      setRpCampRes(d);
      setRpCampResForm({
        analisis: d.analisis ?? "", propuesta1: d.propuesta1 ?? "",
        propuesta2: d.propuesta2 ?? "", propuesta3: d.propuesta3 ?? "",
        comentariosFinales: d.comentariosFinales ?? "",
      });
    }
  }, [mes]);

  useEffect(() => {
    loadPublicaciones(); loadReporteOrganico();
    loadMetricas(); loadReporteResultados();
    loadEjecuciones(); loadReporteCampEj(); loadReporteCampRes();
  }, [mes, loadPublicaciones, loadReporteOrganico, loadMetricas, loadReporteResultados,
      loadEjecuciones, loadReporteCampEj, loadReporteCampRes]);

  // ─── Save helpers ─────────────────────────────────────────────────────────

  async function patchPublicacion(id: string, data: Record<string, unknown>) {
    const r = await fetch(`/api/marketing/publicaciones/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (r.ok) {
      const updated = (await r.json()).publicacion;
      setPublicaciones(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    }
    return r.ok;
  }

  async function saveReporteOrganico(updates: Partial<typeof rpOrganicoForm>) {
    setSavingRpOrg(true);
    try {
      const r = await fetch(`/api/marketing/reportes/organico-ejecucion?mes=${mes}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates),
      });
      if (r.ok) setRpOrganico((await r.json()).reporte);
    } finally { setSavingRpOrg(false); }
  }

  async function saveReporteResultados(updates: Partial<typeof rpResultadosForm>) {
    setSavingRpRes(true);
    try {
      const r = await fetch(`/api/marketing/reportes/organico-resultados?mes=${mes}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates),
      });
      if (r.ok) setRpResultados((await r.json()).reporte);
    } finally { setSavingRpRes(false); }
  }

  async function saveReporteCampEj(updates: Partial<typeof rpCampEjForm>) {
    setSavingRpCampEj(true);
    try {
      const r = await fetch(`/api/marketing/reportes/campanas-ejecucion?mes=${mes}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates),
      });
      if (r.ok) setRpCampEj((await r.json()).reporte);
    } finally { setSavingRpCampEj(false); }
  }

  async function saveReporteCampRes(updates: Partial<typeof rpCampResForm>) {
    setSavingRpCampRes(true);
    try {
      const r = await fetch(`/api/marketing/reportes/campanas-resultados?mes=${mes}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates),
      });
      if (r.ok) setRpCampRes((await r.json()).reporte);
    } finally { setSavingRpCampRes(false); }
  }

  async function saveMetrica(mes: string, plataforma: string, campo: string, valor: string) {
    const key = `${mes}|${plataforma}|${campo}`;
    setSavingMetrica(key);
    try {
      const r = await fetch("/api/marketing/metricas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes, plataforma, [campo]: parseInt(valor) || 0 }),
      });
      if (r.ok) {
        const v = parseInt(valor) || 0;
        setMetricas(prev => {
          const existe = prev.find(m => m.mes === mes && m.plataforma === plataforma);
          if (existe) return prev.map(m => m.mes === mes && m.plataforma === plataforma ? { ...m, [campo]: v } : m);
          return [...prev, {
            id: "", mes, plataforma, seguidores: null, alcance: null, impresiones: null,
            interacciones: null, guardados: null, publicaciones: null, [campo]: v,
          }];
        });
      }
    } finally { setSavingMetrica(null); }
  }

  // ─── Apelación (Marcar como publicado + adjuntar prueba) ──────────────────

  function abrirApelacion(pub: Publicacion) {
    setApelacion({ pubId: pub.id, uploading: false, file: null, previewUrl: null, comentario: pub.comentarios ?? "" });
  }

  function cerrarApelacion() {
    setApelacion(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setApelacion(prev => prev ? { ...prev, file, previewUrl: isImageUrl(file.name) ? URL.createObjectURL(file) : null } : prev);
  }

  async function confirmarApelacion() {
    if (!apelacion) return;
    setApelacion(prev => prev ? { ...prev, uploading: true } : prev);

    let pruebaPubUrl: string | null = null;
    const pub = publicaciones.find(p => p.id === apelacion.pubId);

    if (apelacion.file) {
      try {
        const ext = apelacion.file.name.split(".").pop();
        const pathname = `marketing/pruebas/${apelacion.pubId}-${Date.now()}.${ext}`;
        const blob = await upload(pathname, apelacion.file, {
          access: "public",
          handleUploadUrl: "/api/upload/token",
        });
        pruebaPubUrl = blob.url;
      } catch {
        toast.error("Error al subir el archivo. Inténtalo de nuevo.");
        setApelacion(prev => prev ? { ...prev, uploading: false } : prev);
        return;
      }
    }

    const ok = await patchPublicacion(apelacion.pubId, {
      estado: "PUBLICADO",
      comentarios: apelacion.comentario || pub?.comentarios || null,
      ...(pruebaPubUrl ? { pruebaPubUrl } : {}),
    });

    if (ok) {
      toast.success("✅ Publicación marcada como publicada");
      cerrarApelacion();
    } else {
      toast.error("Error al guardar. Inténtalo de nuevo.");
      setApelacion(prev => prev ? { ...prev, uploading: false } : prev);
    }
  }

  // ─── Cálculos Tab 1 ──────────────────────────────────────────────────────

  const total = publicaciones.length;
  const publicadas = publicaciones.filter(p => p.estado === "PUBLICADO").length;
  const canceladas = publicaciones.filter(p => p.estado === "CANCELADO").length;
  const noPublicadas = publicaciones.filter(p => p.estado !== "PUBLICADO" && p.estado !== "CANCELADO").length;
  const rendimiento = total > 0 ? Math.round((publicadas / total) * 100) : 0;

  const estadoPieData = Object.entries(
    publicaciones.reduce((acc, p) => { acc[p.estado] = (acc[p.estado] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const formatoBarData = ["POST", "REEL", "STORIE", "TIK_TOK"].map(fmtKey => {
    const items = publicaciones.filter(p => (p.formato ?? p.tipo?.formato) === fmtKey);
    return { formato: fmtKey, Total: items.length, Publicadas: items.filter(p => p.estado === "PUBLICADO").length };
  }).filter(d => d.Total > 0);

  const noPublicadasList = publicaciones.filter(p => p.estado !== "PUBLICADO");

  // ─── Cálculos Tab 2 ──────────────────────────────────────────────────────

  const meses3 = getMesesRange(mes, 3);

  function getMet(m: string, plt: string, campo: string): number | null {
    const found = metricas.find(x => x.mes === m && x.plataforma === plt);
    return found ? (found[campo as keyof MetricaOrganica] as number | null) : null;
  }

  const chartData2 = meses3.map(m => {
    const row: Record<string, unknown> = { mes: mesLabelShort(m) };
    PLATAFORMAS.forEach(plt => { row[plt] = getMet(m, plt, chartMetrica); });
    return row;
  });

  // ─── Cálculos Tab 3/4 ────────────────────────────────────────────────────

  const gastoTotal = ejecuciones.reduce((s, e) => s + (e.presupuesto ?? 0), 0);
  const alcanceTotal = ejecuciones.reduce((s, e) => s + (e.alcance ?? 0), 0);
  const impresionesTotal = ejecuciones.reduce((s, e) => s + (e.impresiones ?? 0), 0);
  const ctrProm = ejecuciones.filter(e => e.ctr).length > 0
    ? ejecuciones.reduce((s, e) => s + (e.ctr ?? 0), 0) / ejecuciones.filter(e => e.ctr).length
    : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>

      {/* Modal de apelación */}
      {apelacion && (() => {
        const pub = publicaciones.find(p => p.id === apelacion.pubId);
        if (!pub) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl">
              {/* Header */}
              <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-start justify-between gap-3">
                <div>
                  <p className="text-white font-semibold text-sm">Apelar publicación</p>
                  <p className="text-[#6b7280] text-xs mt-0.5">{pub.tipo?.nombre ?? pub.descripcion ?? "Publicación"}</p>
                  <p className="text-[#444] text-[10px] mt-0.5">Fecha programada: {fechaCorta(pub.fecha)}</p>
                </div>
                <button onClick={cerrarApelacion} className="text-[#444] hover:text-white transition-colors shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Prueba existente */}
                {pub.pruebaPubUrl && (
                  <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-emerald-400 text-xs font-medium mb-1.5">✅ Prueba ya adjuntada</p>
                    {isImageUrl(pub.pruebaPubUrl) ? (
                      <img src={pub.pruebaPubUrl} alt="Prueba" className="rounded-lg w-full max-h-40 object-contain bg-[#0d0d0d]" />
                    ) : (
                      <a href={pub.pruebaPubUrl} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:underline text-xs flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Ver archivo adjunto
                      </a>
                    )}
                  </div>
                )}

                {/* Upload prueba */}
                <div>
                  <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-2">
                    {pub.pruebaPubUrl ? "Reemplazar prueba (opcional)" : "Adjuntar prueba de publicación"}
                  </label>
                  <label className="flex flex-col items-center gap-2 border border-dashed border-[#333] hover:border-[#B3985B]/40 rounded-lg p-4 cursor-pointer transition-colors group">
                    <input type="file" className="hidden" accept="image/*,application/pdf,video/*" onChange={onFileChange} />
                    {apelacion.previewUrl ? (
                      <img src={apelacion.previewUrl} alt="Preview" className="w-full max-h-32 object-contain rounded" />
                    ) : (
                      <>
                        <svg className="text-[#444] group-hover:text-[#B3985B] transition-colors" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <span className="text-[#555] text-xs">
                          {apelacion.file ? apelacion.file.name : "Click para seleccionar imagen, PDF o video"}
                        </span>
                      </>
                    )}
                    {apelacion.file && !apelacion.previewUrl && (
                      <span className="text-[#9ca3af] text-xs">{apelacion.file.name}</span>
                    )}
                  </label>
                </div>

                {/* Comentario */}
                <div>
                  <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1.5">Nota del responsable (opcional)</label>
                  <textarea
                    value={apelacion.comentario}
                    onChange={e => setApelacion(prev => prev ? { ...prev, comentario: e.target.value } : prev)}
                    rows={2}
                    placeholder="Explica brevemente por qué se marcó como publicado ahora…"
                    className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/40 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex gap-2">
                <button onClick={cerrarApelacion} disabled={apelacion.uploading}
                  className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg hover:border-[#444] transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={confirmarApelacion} disabled={apelacion.uploading}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {apelacion.uploading ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Guardando…
                    </>
                  ) : "✓ Marcar como publicado"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-0">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-xl font-semibold text-white">Resultados de Marketing</h1>
            <p className="text-[#555] text-xs mt-0.5">Reporte mensual operativo</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[#555] text-xs">Mes:</label>
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#B3985B]/50"
            />
            <button
              onClick={handleDescargarPDF}
              disabled={downloadingPDF}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
            >
              {downloadingPDF ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              )}
              {downloadingPDF ? "Generando…" : "Descargar PDF"}
            </button>
          </div>
        </div>



        {/* ── Tab Bar ────────────────────────────────────────────────────── */}
        <div className="border-b border-[#1a1a1a] -mx-4 md:-mx-6 px-4 md:px-6 flex gap-0 mb-6 overflow-x-auto no-print">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm border-b-2 transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
                tab === t.key ? "border-[#B3985B] text-white font-medium" : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            TAB 1 — EJECUCIÓN ORGÁNICA
        ════════════════════════════════════════════════════════════════ */}
        {tab === "ejecucion-organica" && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KpiCard label="Total programadas" value={String(total)} sub="del mes" />
              <KpiCard label="Publicadas" value={String(publicadas)} color="text-emerald-400" sub="estado PUBLICADO" />
              <KpiCard label="No publicadas" value={String(noPublicadas)} color="text-yellow-400" sub="pendiente / en proceso / listo" />
              <KpiCard label="Canceladas" value={String(canceladas)} color="text-red-400" />
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <p className="text-[#6b7280] text-xs mb-1">Rendimiento</p>
                <p className={`text-2xl font-bold tabular-nums ${rendimiento >= 80 ? "text-emerald-400" : rendimiento >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                  {rendimiento}%
                </p>
                <p className="text-[#555] text-[10px] mt-0.5">publicadas / programadas</p>
              </div>
            </div>

            {/* Gráficas */}
            {!loadingPub && publicaciones.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                  <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-3">Distribución por estado</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={estadoPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {estadoPieData.map((entry, i) => (
                          <Cell key={i} fill={ESTADO_COLORS_PIE[entry.name] ?? "#555"} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8, fontSize: 11 }}
                        formatter={(v, n) => [v, ESTADO_LABEL[n as string] ?? n]}
                      />
                      <Legend formatter={v => ESTADO_LABEL[v] ?? v} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {formatoBarData.length > 0 && (
                  <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                    <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-3">Publicadas vs Total por formato</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={formatoBarData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis dataKey="formato" tick={{ fontSize: 10, fill: "#6b7280" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="Total" fill="#2a2a2a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Publicadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Tabla de no publicadas */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  Publicaciones no publicadas
                  {noPublicadasList.length > 0 && (
                    <span className="ml-2 text-[10px] text-[#555]">({noPublicadasList.length})</span>
                  )}
                </p>
                <span className="text-[10px] text-[#555] no-print">Columna Causa: click para editar · ✓ Apelar para marcar como publicado</span>
              </div>
              {loadingPub ? (
                <p className="text-center text-[#333] text-sm py-8">Cargando…</p>
              ) : noPublicadasList.length === 0 ? (
                <p className="text-center text-[#333] text-sm py-8">¡Todo fue publicado este mes! 🎉</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                        <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Fecha prog.</th>
                        <th className="text-left px-4 py-2.5 font-medium">Publicación</th>
                        <th className="text-left px-4 py-2.5 font-medium w-16">Formato</th>
                        <th className="text-left px-4 py-2.5 font-medium w-16">Redes</th>
                        <th className="text-center px-4 py-2.5 font-medium w-24">Estado</th>
                        <th className="text-left px-4 py-2.5 font-medium">Causa</th>
                        <th className="text-center px-3 py-2.5 font-medium no-print">Apelar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {noPublicadasList.map(p => (
                        <tr key={p.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                          {/* Fecha programada — fix de Invalid Date */}
                          <td className="px-4 py-2.5 text-[#6b7280] whitespace-nowrap font-medium">
                            {fechaCorta(p.fecha)}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-white font-medium">{p.tipo?.nombre ?? p.descripcion ?? "—"}</p>
                            {p.objetivo && <p className="text-[#555] text-[10px]">{p.objetivo}</p>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`font-medium ${FORMATO_COLORS[p.formato ?? p.tipo?.formato ?? ""] ?? "text-gray-400"}`}>
                              {p.formato ?? p.tipo?.formato ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[#6b7280]">{getPlatformsStr(p)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${
                              p.estado === "CANCELADO" ? "bg-red-900/40 text-red-400" :
                              p.estado === "LISTO" ? "bg-yellow-900/40 text-yellow-300" :
                              p.estado === "EN_PROCESO" ? "bg-blue-900/40 text-blue-300" :
                              "bg-gray-800 text-gray-400"
                            }`}>{ESTADO_LABEL[p.estado] ?? p.estado}</span>
                          </td>
                          {/* Causa: inline editable */}
                          <td className="px-4 py-2.5">
                            {editingComentario === p.id ? (
                              <input
                                autoFocus
                                value={comentarioDraft}
                                onChange={e => setComentarioDraft(e.target.value)}
                                onBlur={() => { patchPublicacion(p.id, { comentarios: comentarioDraft }); setEditingComentario(null); }}
                                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingComentario(null); }}
                                placeholder="Escribe la causa…"
                                className="w-full bg-[#0d0d0d] border border-[#B3985B]/30 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[#B3985B]/60"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => { setEditingComentario(p.id); setComentarioDraft(p.comentarios ?? ""); }}
                                  className="text-left flex-1 text-[#6b7280] hover:text-white transition-colors"
                                >
                                  {p.comentarios
                                    ? <span className="text-[#9ca3af]">{p.comentarios}</span>
                                    : <span className="text-[#333] italic">Click para agregar causa…</span>
                                  }
                                </button>
                                {/* Indicador de prueba adjunta */}
                                {p.pruebaPubUrl && (
                                  <a href={p.pruebaPubUrl} target="_blank" rel="noopener noreferrer"
                                    className="shrink-0 text-emerald-500 hover:text-emerald-400 transition-colors" title="Ver prueba adjunta">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                                    </svg>
                                  </a>
                                )}
                              </div>
                            )}
                          </td>
                          {/* Botón apelar */}
                          <td className="px-3 py-2.5 text-center no-print">
                            <button
                              onClick={() => abrirApelacion(p)}
                              title="Marcar como publicado con prueba"
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-950/50 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-500/20 transition-colors whitespace-nowrap"
                            >
                              ✓ Apelar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Formulario análisis */}
            <AnalisisSection
              title="Comentarios del responsable"
              color="text-[#B3985B]"
              fields={[
                { key: "comentariosGenerales", label: "Resumen ejecutivo de la ejecución", placeholder: "Describe cómo fue la ejecución del plan de contenido este mes…", rows: 4 },
                { key: "logros", label: "Logros y destacados del mes", placeholder: "¿Qué funcionó bien? ¿Qué publicación tuvo mejor recepción?", rows: 3 },
              ]}
              values={rpOrganicoForm}
              onChange={(k, v) => setRpOrganicoForm(prev => ({ ...prev, [k]: v }))}
              saving={savingRpOrg}
            />

            {/* Botones */}
            <div className="flex items-center gap-3 no-print">
              <button onClick={() => saveReporteOrganico(rpOrganicoForm)} disabled={savingRpOrg}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg hover:border-[#444] transition-colors disabled:opacity-50">
                {savingRpOrg ? "Guardando…" : "💾 Guardar análisis"}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 2 — RESULTADOS ORGÁNICOS
        ════════════════════════════════════════════════════════════════ */}
        {tab === "resultados-organicos" && (
          <div className="space-y-5">
            {(() => {
              const ig = metricas.find(m => m.mes === mes && m.plataforma === "Instagram");
              const fb = metricas.find(m => m.mes === mes && m.plataforma === "Facebook");
              const tt = metricas.find(m => m.mes === mes && m.plataforma === "TikTok");
              const yt = metricas.find(m => m.mes === mes && m.plataforma === "YouTube");
              const totalSeg = [ig, fb, tt, yt].reduce((s, x) => s + (x?.seguidores ?? 0), 0);
              const totalAlc = [ig, fb, tt, yt].reduce((s, x) => s + (x?.alcance ?? 0), 0);
              const totalInt = [ig, fb, tt, yt].reduce((s, x) => s + (x?.interacciones ?? 0), 0);
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard label="Seguidores totales" value={fmt(totalSeg)} sub="suma todas las redes" />
                  <KpiCard label="Alcance total" value={fmt(totalAlc)} color="text-emerald-400" />
                  <KpiCard label="Interacciones" value={fmt(totalInt)} color="text-blue-400" />
                  <KpiCard label="Período" value={mesLabel(mes)} color="text-[#B3985B]" sub="Comparativa 3 meses" />
                </div>
              );
            })()}

            {/* Tabla métricas */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e1e1e]">
                <p className="text-sm font-semibold text-white">Registro — {mesLabel(mes)}</p>
                <p className="text-[10px] text-[#555] mt-0.5 no-print">Click en cualquier número para editarlo</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                      <th className="text-left px-4 py-2.5 font-medium">Red social</th>
                      {METRICS_COLS.map(c => (
                        <th key={c.key} className="text-right px-3 py-2.5 font-medium">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLATAFORMAS.map(plt => {
                      const found = metricas.find(m => m.mes === mes && m.plataforma === plt);
                      return (
                        <tr key={plt} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PLT_COLORS[plt] }} />
                              <span className="text-white font-medium">{plt}</span>
                            </div>
                          </td>
                          {METRICS_COLS.map(col => {
                            const val = found ? (found[col.key as keyof MetricaOrganica] as number | null) : null;
                            const isSaving = savingMetrica === `${mes}|${plt}|${col.key}`;
                            return (
                              <td key={col.key} className="px-3 py-2.5 text-right">
                                <input
                                  type="number"
                                  defaultValue={val ?? ""}
                                  placeholder="—"
                                  disabled={isSaving}
                                  className="w-24 text-right bg-transparent border-b border-transparent hover:border-[#333] focus:border-[#B3985B]/50 focus:outline-none text-white text-xs py-0.5 tabular-nums transition-colors disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  onBlur={e => { if (e.target.value !== String(val ?? "")) saveMetrica(mes, plt, col.key, e.target.value); }}
                                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gráfica comparativa */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-sm font-semibold text-white">Comparativa — últimos 3 meses</p>
                <div className="flex gap-1 no-print flex-wrap">
                  {METRICS_COLS.map(c => (
                    <button key={c.key} onClick={() => setChartMetrica(c.key)}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${chartMetrica === c.key ? "bg-[#B3985B] text-black" : "text-[#555] hover:text-white"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData2} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {PLATAFORMAS.map(plt => (
                    <Bar key={plt} dataKey={plt} fill={PLT_COLORS[plt]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <AnalisisSection
              title="Análisis y propuestas de mejora"
              color="text-emerald-400"
              fields={[
                { key: "analisis", label: "Análisis objetivo del resultado", placeholder: "¿Qué creció? ¿Qué bajó? ¿Por qué?", rows: 5 },
                { key: "propuesta1", label: "Propuesta de mejora 1", placeholder: "Primera acción de mejora…", rows: 2 },
                { key: "propuesta2", label: "Propuesta de mejora 2", placeholder: "Segunda acción de mejora…", rows: 2 },
                { key: "propuesta3", label: "Propuesta de mejora 3", placeholder: "Tercera acción de mejora…", rows: 2 },
                { key: "comentariosFinales", label: "Comentarios finales", placeholder: "Notas adicionales, contexto externo…", rows: 3 },
              ]}
              values={rpResultadosForm}
              onChange={(k, v) => setRpResultadosForm(prev => ({ ...prev, [k]: v }))}
              saving={savingRpRes}
            />

            <div className="flex items-center gap-3 no-print">
              <button onClick={() => saveReporteResultados(rpResultadosForm)} disabled={savingRpRes}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg hover:border-[#444] transition-colors disabled:opacity-50">
                {savingRpRes ? "Guardando…" : "💾 Guardar análisis"}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 3 — EJECUCIÓN CAMPAÑAS
        ════════════════════════════════════════════════════════════════ */}
        {tab === "ejecucion-campanas" && (
          <div className="space-y-5">
            <DevBanner />
            <ConexionPublicidadInfo tab="ejecucion" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Total campañas" value={String(ejecuciones.length)} sub={mesLabel(mes)} />
              <KpiCard label="En ejecución" value={String(ejecuciones.filter(e => e.estado === "EN_EJECUCION").length)} color="text-blue-400" />
              <KpiCard label="Completadas" value={String(ejecuciones.filter(e => e.estado === "COMPLETADA").length)} color="text-emerald-400" />
              <KpiCard label="Canceladas" value={String(ejecuciones.filter(e => e.estado === "CANCELADA").length)} color="text-red-400" />
            </div>

            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e1e1e]">
                <p className="text-sm font-semibold text-white">Campañas del mes</p>
              </div>
              {loadingEj ? (
                <p className="text-center text-[#333] py-8 text-sm">Cargando…</p>
              ) : ejecuciones.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-[#444] text-sm">No hay campañas registradas para {mesLabel(mes)}.</p>
                  <p className="text-[#333] text-xs">Ve a <strong className="text-[#555]">Publicidad → Campañas → Calendario</strong> para crear campañas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                        <th className="text-left px-4 py-2.5 font-medium">Campaña</th>
                        <th className="text-left px-4 py-2.5 font-medium">Canal</th>
                        <th className="text-right px-4 py-2.5 font-medium">Presupuesto</th>
                        <th className="text-left px-4 py-2.5 font-medium">Fechas</th>
                        <th className="text-center px-4 py-2.5 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ejecuciones.map(e => (
                        <tr key={e.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="text-white font-medium">{e.nombre}</p>
                            {e.objetivo && <p className="text-[#555] text-[10px]">{e.objetivo}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-[#6b7280]">{e.canal ?? "—"}</td>
                          <td className="px-4 py-2.5 text-right text-[#B3985B] font-medium">{e.presupuesto ? fmx(e.presupuesto) : "—"}</td>
                          <td className="px-4 py-2.5 text-[#6b7280] whitespace-nowrap">
                            {new Date(e.fechaInicio).toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "America/Mexico_City" })} →{" "}
                            {new Date(e.fechaFin).toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "America/Mexico_City" })}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${CAMP_ESTADO_COLORS[e.estado] ?? "bg-gray-800 text-gray-400"}`}>
                              {e.estado.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {ejecuciones.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-[#222] bg-[#0d0d0d]">
                          <td colSpan={2} className="px-4 py-2.5 text-[#555] text-xs font-semibold uppercase">Total presupuesto</td>
                          <td className="px-4 py-2.5 text-right text-[#B3985B] font-bold">{fmx(gastoTotal)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>

            <AnalisisSection
              title="Comentarios de ejecución"
              color="text-purple-400"
              fields={[
                { key: "comentariosEjecucion", label: "Análisis de la ejecución de campañas", placeholder: "¿Cómo fue la ejecución? ¿Qué salió bien? ¿Qué mejorar?", rows: 4 },
                { key: "comentariosFinales", label: "Comentarios finales", placeholder: "Observaciones adicionales…", rows: 3 },
              ]}
              values={rpCampEjForm}
              onChange={(k, v) => setRpCampEjForm(prev => ({ ...prev, [k]: v }))}
              saving={savingRpCampEj}
            />

            <div className="flex items-center gap-3 no-print">
              <button onClick={() => saveReporteCampEj(rpCampEjForm)} disabled={savingRpCampEj}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg hover:border-[#444] transition-colors disabled:opacity-50">
                {savingRpCampEj ? "Guardando…" : "💾 Guardar comentarios"}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 4 — RESULTADOS CAMPAÑAS
        ════════════════════════════════════════════════════════════════ */}
        {tab === "resultados-campanas" && (
          <div className="space-y-5">
            <DevBanner />
            <ConexionPublicidadInfo tab="resultados" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Gasto total" value={fmx(gastoTotal)} color="text-[#B3985B]" sub="presupuesto ejecutado" />
              <KpiCard label="Alcance" value={fmt(alcanceTotal)} color="text-blue-400" sub="suma de campañas" />
              <KpiCard label="Impresiones" value={fmt(impresionesTotal)} color="text-purple-400" />
              <KpiCard label="CTR promedio" value={ctrProm != null ? `${ctrProm.toFixed(2)}%` : "—"} color="text-emerald-400" sub="click-through rate" />
            </div>

            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e1e1e]">
                <p className="text-sm font-semibold text-white">KPIs por campaña — {mesLabel(mes)}</p>
              </div>
              {ejecuciones.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-[#444] text-sm">No hay campañas con resultados para {mesLabel(mes)}.</p>
                  <p className="text-[#333] text-xs">Los KPIs (alcance, impresiones, CTR, etc.) se registran en <strong className="text-[#555]">Publicidad → Campañas</strong>.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                        <th className="text-left px-4 py-2.5 font-medium">Campaña</th>
                        <th className="text-right px-3 py-2.5 font-medium">Gasto</th>
                        <th className="text-right px-3 py-2.5 font-medium">Alcance</th>
                        <th className="text-right px-3 py-2.5 font-medium">Impr.</th>
                        <th className="text-right px-3 py-2.5 font-medium">Clics</th>
                        <th className="text-right px-3 py-2.5 font-medium">CTR</th>
                        <th className="text-right px-3 py-2.5 font-medium">Resultados</th>
                        <th className="text-right px-3 py-2.5 font-medium">Costo/res.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ejecuciones.map(e => (
                        <tr key={e.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="text-white font-medium">{e.nombre}</p>
                            {e.tipo && <p className="text-[#555] text-[10px]">{e.tipo.nombre}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-[#B3985B] font-medium tabular-nums">{e.presupuesto ? fmx(e.presupuesto) : "—"}</td>
                          <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{fmt(e.alcance)}</td>
                          <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{fmt(e.impresiones)}</td>
                          <td className="px-3 py-2.5 text-right text-[#9ca3af] tabular-nums">{fmt(e.clics)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {e.ctr != null ? <span className="text-blue-400">{e.ctr.toFixed(2)}%</span> : <span className="text-[#333]">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-emerald-400 tabular-nums">{fmt(e.cantResultados)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {e.costoResultado != null ? fmx(e.costoResultado) : <span className="text-[#333]">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#222] bg-[#0d0d0d]">
                        <td className="px-4 py-2.5 text-[#555] text-xs font-semibold uppercase">Total</td>
                        <td className="px-3 py-2.5 text-right text-[#B3985B] font-bold tabular-nums">{fmx(gastoTotal)}</td>
                        <td className="px-3 py-2.5 text-right text-[#9ca3af] font-bold tabular-nums">{fmt(alcanceTotal)}</td>
                        <td className="px-3 py-2.5 text-right text-[#9ca3af] font-bold tabular-nums">{fmt(impresionesTotal)}</td>
                        <td colSpan={4} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <AnalisisSection
              title="Análisis y propuestas de mejora"
              color="text-blue-400"
              fields={[
                { key: "analisis", label: "Análisis objetivo de resultados de campaña", placeholder: "¿Cuál fue la campaña más eficiente? ¿Mejor costo por resultado?", rows: 5 },
                { key: "propuesta1", label: "Propuesta de mejora 1", placeholder: "Primera acción de mejora…", rows: 2 },
                { key: "propuesta2", label: "Propuesta de mejora 2", placeholder: "Segunda acción de mejora…", rows: 2 },
                { key: "propuesta3", label: "Propuesta de mejora 3", placeholder: "Tercera acción de mejora…", rows: 2 },
                { key: "comentariosFinales", label: "Comentarios finales", placeholder: "Contexto adicional, comparativas externas…", rows: 3 },
              ]}
              values={rpCampResForm}
              onChange={(k, v) => setRpCampResForm(prev => ({ ...prev, [k]: v }))}
              saving={savingRpCampRes}
            />

            <div className="flex items-center gap-3 no-print">
              <button onClick={() => saveReporteCampRes(rpCampResForm)} disabled={savingRpCampRes}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg hover:border-[#444] transition-colors disabled:opacity-50">
                {savingRpCampRes ? "Guardando…" : "💾 Guardar análisis"}
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
