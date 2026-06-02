"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Area { id: string; nombre: string; color: string; icono: string | null; }
interface SubArea { id: string; nombre: string; entregables: string[]; }
interface Template {
  id: string; nombre: string; tipo: string; descripcion: string | null;
  moduloDestino: string | null; moduloTexto: string | null;
  area: Area; subArea: SubArea;
}
interface Responsable { id: string; name: string; }
interface SubtareaInst { id: string; completada: boolean; subtarea: { id: string; nombre: string; orden: number }; }
interface Comentario { id: string; contenido: string; createdAt: string; autor: Responsable; }
interface HistorialItem { id: string; accion: string; detalles: string | null; createdAt: string; usuario: Responsable; }
interface Instancia {
  id: string; estado: string; esEntregable: boolean; periodoLabel: string | null;
  fechaVencimiento: string; notas: string | null; completadaAt: string | null;
  template: Template; responsable: Responsable;
  subtareasInstancia: SubtareaInst[];
  comentarios: Comentario[];
  historial: HistorialItem[];
}
interface AreaConfig {
  id: string; nombre: string; color: string; icono: string | null;
  _count: { templates: number };
  subareas: { id: string; nombre: string; _count: { templates: number } }[];
}
interface Me { id: string; name: string; role: string; area: string | null; }

// ─── Sistema Operativo types ──────────────────────────────────────────────────
interface SOKPI { id: string; nombre: string; meta: string; formula: string; fuente: string; orden: number; activo: boolean; esTransversal: boolean; areaId: string | null; }
interface SOSubArea { id: string; nombre: string; entregables: string[]; orden: number; }
interface SOArea { id: string; nombre: string; color: string; icono: string | null; objetivo: string | null; subareas: SOSubArea[]; kpis: SOKPI[]; }
interface SOData { areas: SOArea[]; kpisTransversales: SOKPI[]; }

// ─── Constantes ───────────────────────────────────────────────────────────────
const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  PENDIENTE:   { label: "Pendiente",   color: "text-gray-400",  bg: "bg-gray-800/40",  dot: "bg-gray-500" },
  EN_PROGRESO: { label: "En progreso", color: "text-blue-400",  bg: "bg-blue-900/30",  dot: "bg-blue-400" },
  COMPLETADA:  { label: "Completada",  color: "text-green-400", bg: "bg-green-900/30", dot: "bg-green-400" },
  VENCIDA:     { label: "Vencida",     color: "text-red-400",   bg: "bg-red-900/30",   dot: "bg-red-400" },
  OMITIDA:     { label: "Omitida",     color: "text-gray-600",  bg: "bg-gray-900/20",  dot: "bg-gray-700" },
};

const ACCION_LABELS: Record<string, string> = {
  CREADA: "Tarea creada", COMPLETADA: "Completada", REABIERTA: "Reabierta",
  REASIGNADA: "Reasignada", COMENTADA: "Comentario añadido", OMITIDA: "Omitida",
};

const RUTAS_EXISTENTES = ["/finanzas", "/marketing", "/proyectos", "/operaciones", "/crm", "/ventas", "/rrhh", "/cotizaciones", "/formularios"];
function rutaExiste(ruta: string | null) {
  if (!ruta) return false;
  return RUTAS_EXISTENTES.some(r => ruta.startsWith(r));
}

function timeLeftStr(fv: string): { text: string; color: string } {
  const diff = new Date(fv).getTime() - Date.now();
  if (diff < 0) {
    const mins = Math.floor(Math.abs(diff) / 60000);
    const hrs = Math.floor(mins / 60);
    return { text: hrs > 0 ? `Vencida hace ${hrs}h ${mins % 60}m` : `Vencida hace ${mins}m`, color: "text-red-400" };
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (diff < 1800000) return { text: h > 0 ? `${h}h ${m}m` : `${m}m`, color: "text-orange-400" };
  return { text: h > 0 ? `${h}h ${m}m` : `${m}m`, color: "text-white" };
}

function agrupar(instancias: Instancia[]) {
  const map: Record<string, { area: Area; subareas: Record<string, { subarea: SubArea; instancias: Instancia[] }> }> = {};
  for (const inst of instancias) {
    const aId = inst.template.area.id, sId = inst.template.subArea.id;
    if (!map[aId]) map[aId] = { area: inst.template.area, subareas: {} };
    if (!map[aId].subareas[sId]) map[aId].subareas[sId] = { subarea: inst.template.subArea, instancias: [] };
    map[aId].subareas[sId].instancias.push(inst);
  }
  return Object.values(map);
}

function agruparPorPersona(instancias: Instancia[]) {
  const map: Record<string, { responsable: Responsable; instancias: Instancia[] }> = {};
  for (const inst of instancias) {
    const uid = inst.responsable?.id ?? "sin-asignar";
    if (!map[uid]) map[uid] = { responsable: inst.responsable ?? { id: "sin-asignar", name: "Sin asignar" }, instancias: [] };
    map[uid].instancias.push(inst);
  }
  return Object.values(map).sort((a, b) => a.responsable.name.localeCompare(b.responsable.name));
}

function tiempoRelativo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PlanTrabajoPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<"mi-plan" | "hoy" | "equipo" | "por-area" | "sistema-op" | "config">("mi-plan");
  const [instancias, setInstancias] = useState<Instancia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [accionando, setAccionando] = useState<string | null>(null);
  const [configData, setConfigData] = useState<{ totalTemplates: number; areas: AreaConfig[] } | null>(null);
  const [generarLoading, setGenerarLoading] = useState(false);
  const [configMsg, setConfigMsg] = useState<string | null>(null);
  const [equipoFilter, setEquipoFilter] = useState("todos");
  // Vista "Hoy" filters
  const [hoyAreaFilter, setHoyAreaFilter] = useState("todas");
  const [hoyUserFilter, setHoyUserFilter] = useState("todos");
  const [hoySoloPendientes, setHoySoloPendientes] = useState(true);
  // Entregable confirm dialog
  const [entregableDialogId, setEntregableDialogId] = useState<string | null>(null);
  const [notaEntrega, setNotaEntrega] = useState("");
  const [historialOpen, setHistorialOpen] = useState(false);
  // Reasignar
  const [usuarios, setUsuarios] = useState<{id:string;name:string;area:string|null}[]>([]);
  const [reasignandoId, setReasignandoId] = useState<string|null>(null);
  // Sistema Operativo
  const [soData, setSoData] = useState<SOData | null>(null);
  const [soAreaOpen, setSoAreaOpen] = useState<string | null>(null);
  const [contextoOpenIds, setContextoOpenIds] = useState<Set<string>>(new Set());
  const [kpiExpandedAreas, setKpiExpandedAreas] = useState<Set<string>>(new Set());
  const [bannerData, setBannerData] = useState<{
    ingresosDevengados: number;
    margenNeto: number;
    cumpleMetaIngresos: boolean;
    cumpleMetaMargen: boolean;
  } | null>(null);
  // Live countdown
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = me?.role === "ADMIN";

  useEffect(() => {
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        setMe(d);
        if (d.role === "ADMIN") {
          setTab("equipo");
          fetch("/api/admin/usuarios")
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.users) setUsuarios(data.users.filter((u: {active:boolean}) => u.active)); });
        }
      }
    });
    // Cargar Sistema Operativo una sola vez
    fetch("/api/plan-trabajo/sistema-operativo")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSoData(d); })
      .catch(() => { /* silencioso — no rompe la app */ });
    // Countdown every 60s
    timerRef.current = setInterval(() => setTick(t => t + 1), 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Fetch banner KPIs para admins
  useEffect(() => {
    if (me?.role !== 'ADMIN') return;
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const hoyStr = hoy.toISOString().split('T')[0];
    fetch(`/api/kpis/datos?desde=${primerDia}&hasta=${hoyStr}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.estadoResultados) setBannerData(d.estadoResultados); })
      .catch(() => {});
  }, [me]);

  const loadInstancias = useCallback(async () => {
    if (tab === "config" || tab === "sistema-op" || !me) return;
    setLoading(true);
    try {
      const vista = tab === "por-area" ? "semana" : "dia";
      const res = await fetch(`/api/plan-trabajo/instancias?vista=${vista}`);
      if (res.ok) setInstancias((await res.json()).instancias ?? []);
    } finally { setLoading(false); }
  }, [tab, me]);

  useEffect(() => { if (me) loadInstancias(); }, [loadInstancias, me]);

  useEffect(() => {
    if (tab !== "config") return;
    fetch("/api/plan-trabajo/templates").then(r => r.ok ? r.json() : null).then(d => { if (d) setConfigData(d); });
  }, [tab]);

  const selected = instancias.find(i => i.id === selectedId) ?? null;
  const misTareas = me ? instancias.filter(i => i.responsable?.id === me.id) : instancias;
  const pendientesHoy = misTareas.filter(i => i.estado === "PENDIENTE" || i.estado === "EN_PROGRESO").length;
  const completadasHoy = misTareas.filter(i => i.estado === "COMPLETADA").length;
  const vencideasHoy = misTareas.filter(i => i.estado === "VENCIDA").length;

  async function accion(id: string, tipo: "completar" | "reabrir" | "omitir" | "en_progreso", detalles?: string) {
    setAccionando(id);
    const res = await fetch(`/api/plan-trabajo/instancias/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: tipo, detalles }),
    });
    if (res.ok) {
      const d = await res.json();
      setInstancias(prev => prev.map(i => i.id === id ? { ...i, ...d.instancia } : i));
    }
    setAccionando(null);
  }

  async function completarEntregable() {
    if (!entregableDialogId) return;
    await accion(entregableDialogId, "completar", notaEntrega || undefined);
    setEntregableDialogId(null);
    setNotaEntrega("");
  }

  async function toggleSubtarea(instanciaId: string, stId: string, completada: boolean) {
    await fetch(`/api/plan-trabajo/instancias/${instanciaId}/subtareas/${stId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completada }),
    });
    setInstancias(prev => prev.map(i =>
      i.id === instanciaId
        ? { ...i, subtareasInstancia: i.subtareasInstancia.map(st => st.id === stId ? { ...st, completada } : st) }
        : i
    ));
  }

  async function enviarComentario() {
    if (!selectedId || !comentario.trim()) return;
    setEnviandoComentario(true);
    const res = await fetch(`/api/plan-trabajo/instancias/${selectedId}/comentarios`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: comentario }),
    });
    if (res.ok) {
      const d = await res.json();
      setInstancias(prev => prev.map(i => i.id === selectedId ? { ...i, comentarios: [...i.comentarios, d.comentario] } : i));
      setComentario("");
    }
    setEnviandoComentario(false);
  }

  async function generarHoy() {
    setGenerarLoading(true); setConfigMsg(null);
    const res = await fetch("/api/plan-trabajo/generar", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await res.json();
    setConfigMsg(res.ok ? `✅ ${d.generadas} instancias creadas, ${d.omitidas} ya existían` : `❌ ${d.error}`);
    setGenerarLoading(false);
  }

  // Datos para vistas
  const personas = agruparPorPersona(instancias);
  const instanciasEquipo = equipoFilter === "todos" ? instancias : instancias.filter(i => i.responsable?.id === equipoFilter);
  const areas = Array.from(new Map(instancias.map(i => [i.template.area.id, i.template.area])).values());

  // Vista HOY — con filtros
  let instanciasHoy = [...instancias];
  if (hoyAreaFilter !== "todas") instanciasHoy = instanciasHoy.filter(i => i.template.area.id === hoyAreaFilter);
  if (hoyUserFilter !== "todos") instanciasHoy = instanciasHoy.filter(i => i.responsable?.id === hoyUserFilter);
  if (hoySoloPendientes) instanciasHoy = instanciasHoy.filter(i => i.estado !== "COMPLETADA" && i.estado !== "OMITIDA");
  // Vencidas al inicio
  instanciasHoy.sort((a, b) => {
    if (a.estado === "VENCIDA" && b.estado !== "VENCIDA") return -1;
    if (b.estado === "VENCIDA" && a.estado !== "VENCIDA") return 1;
    return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
  });

  const TABS = [
    { key: "mi-plan" as const, label: "Mi Plan" },
    { key: "hoy" as const, label: "Hoy" },
    ...(isAdmin ? [{ key: "equipo" as const, label: "Equipo" }] : []),
    { key: "por-area" as const, label: "Por Área" },
    { key: "sistema-op" as const, label: "Sistema Op." },
    { key: "config" as const, label: "⚙" },
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-3 border-b border-[#1a1a1a]">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="text-xl font-bold text-white">Plan de Trabajo</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {tab === "mi-plan" && [
                { label: "Pendientes", value: pendientesHoy, color: "text-white" },
                { label: "Completadas", value: completadasHoy, color: "text-green-400" },
                { label: "Vencidas", value: vencideasHoy, color: "text-red-400" },
              ].map(k => (
                <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-center min-w-[58px]">
                  <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-gray-600 text-[10px]">{k.label}</p>
                </div>
              ))}
              {tab === "equipo" && isAdmin && [
                { label: "Pendientes", value: instancias.filter(i => i.estado !== "COMPLETADA" && i.estado !== "OMITIDA").length, color: "text-white" },
                { label: "Vencidas", value: instancias.filter(i => i.estado === "VENCIDA").length, color: "text-red-400" },
                { label: "Personas", value: personas.length, color: "text-[#B3985B]" },
              ].map(k => (
                <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-center min-w-[58px]">
                  <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-gray-600 text-[10px]">{k.label}</p>
                </div>
              ))}
              {tab === "mi-plan" && (
                <button onClick={() => {
                  const msg = `[Mainstage Pro] Tienes ${pendientesHoy} tareas pendientes hoy. Revisa tu plan en mainstagepro.vercel.app/plan-trabajo`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-900/20 hover:bg-green-900/40 border border-green-900/30 text-green-400 transition-colors" title="Compartir por WhatsApp">
                  <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/></svg>
                </button>
              )}
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-1 w-fit">
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => { setTab(key); setSelectedId(null); }}
                className={`text-xs px-3 py-1.5 rounded transition-colors font-medium ${tab === key ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
          {/* Filtros Vista Equipo */}
          {tab === "equipo" && isAdmin && personas.length > 1 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button onClick={() => setEquipoFilter("todos")}
                className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${equipoFilter === "todos" ? "border-[#B3985B]/60 bg-[#B3985B]/10 text-[#B3985B]" : "border-[#333] text-gray-500"}`}>Todos</button>
              {personas.map(p => (
                <button key={p.responsable.id} onClick={() => setEquipoFilter(p.responsable.id)}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${equipoFilter === p.responsable.id ? "border-[#B3985B]/60 bg-[#B3985B]/10 text-[#B3985B]" : "border-[#333] text-gray-500"}`}>
                  {p.responsable.name.split(" ")[0]} ({p.instancias.filter(i => i.estado !== "COMPLETADA" && i.estado !== "OMITIDA").length})
                </button>
              ))}
            </div>
          )}
          {/* Filtros Vista Hoy */}
          {tab === "hoy" && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <select value={hoyAreaFilter} onChange={e => setHoyAreaFilter(e.target.value)}
                className="text-xs bg-[#111] border border-[#333] text-gray-400 rounded-lg px-2 py-1">
                <option value="todas">Todas las áreas</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.icono} {a.nombre}</option>)}
              </select>
              {isAdmin && (
                <select value={hoyUserFilter} onChange={e => setHoyUserFilter(e.target.value)}
                  className="text-xs bg-[#111] border border-[#333] text-gray-400 rounded-lg px-2 py-1">
                  <option value="todos">Todos</option>
                  {personas.map(p => <option key={p.responsable.id} value={p.responsable.id}>{p.responsable.name}</option>)}
                </select>
              )}
              <button onClick={() => setHoySoloPendientes(v => !v)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${hoySoloPendientes ? "border-[#B3985B]/60 bg-[#B3985B]/10 text-[#B3985B]" : "border-[#333] text-gray-500"}`}>
                {hoySoloPendientes ? "Solo pendientes" : "Ver todas"}
              </button>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "config" && (
            <div className="max-w-2xl space-y-5">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
                <h2 className="text-white font-semibold text-sm mb-1">Plantillas</h2>
                <p className="text-gray-500 text-xs mb-4">
                  {configData ? `${configData.totalTemplates} plantillas en ${configData.areas.length} áreas` : "Cargando..."}
                </p>
                {configData?.areas.map(area => (
                  <div key={area.id} className="flex items-center gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }} />
                    <span className="text-white/70 text-sm">{area.icono} {area.nombre}</span>
                    <span className="ml-auto text-gray-600 text-xs">{area._count.templates}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
                <h2 className="text-white font-semibold text-sm mb-1">Generar instancias de hoy</h2>
                <p className="text-gray-500 text-xs mb-4">El cron corre a la 01:00 AM México. Úsalo para regenerar manualmente.</p>
                <button onClick={generarHoy} disabled={generarLoading}
                  className="bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
                  {generarLoading ? "Generando..." : "▶ Generar tareas de hoy"}
                </button>
              </div>
              {configMsg && <div className={`text-sm px-4 py-3 rounded-xl border ${configMsg.startsWith("✅") ? "bg-green-900/20 border-green-900/40 text-green-400" : "bg-red-900/20 border-red-900/40 text-red-400"}`}>{configMsg}</div>}
            </div>
          )}

          {tab !== "config" && (
            loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl h-16 animate-pulse" />)}</div>
            ) : instancias.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4" style={{ color: "#B3985B" }}>✓</div>
                <p className="text-white/60 font-semibold text-lg">La operación está al día</p>
                <p className="text-white/20 text-sm mt-1">No hay tareas para hoy</p>
                <button onClick={() => { setTab("por-area"); }} className="mt-5 text-[#B3985B] text-xs border border-[#B3985B]/30 px-4 py-2 rounded-xl hover:bg-[#B3985B]/10 transition-colors">
                  Ver tareas de la semana →
                </button>
                <div className="mt-3">
                  <button onClick={() => setTab("config")} className="text-gray-600 text-xs hover:underline">¿Primera vez? Ir a Config</button>
                </div>
              </div>
            ) : tab === "hoy" ? (
              /* Vista HOY compacta */
              instanciasHoy.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-green-400/60 text-sm">✓ Todo al día con los filtros seleccionados</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {instanciasHoy.map(inst => (
                    <div key={inst.id}
                      onClick={() => setSelectedId(selectedId === inst.id ? null : inst.id)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${
                        selectedId === inst.id ? "border-[#B3985B]/40 bg-[#B3985B]/5" :
                        inst.estado === "VENCIDA" ? "border-red-900/40 bg-red-900/5" :
                        inst.estado === "COMPLETADA" ? "border-[#1a1a1a] bg-[#0d0d0d] opacity-50" :
                        "border-[#1e1e1e] bg-[#111] hover:border-[#2a2a2a]"
                      }`}>
                      {/* Dot estado */}
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ESTADO_CONFIG[inst.estado]?.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${inst.estado === "COMPLETADA" ? "line-through text-gray-600" : "text-white"}`}>
                            {inst.template.nombre}
                          </p>
                          {inst.estado === "VENCIDA" && <span className="text-red-400 text-[9px] font-bold shrink-0">⚠ VENCIDA</span>}
                        </div>
                        <p className="text-gray-600 text-[10px]">
                          {inst.template.area.nombre} · {isAdmin && inst.responsable ? `${inst.responsable.name.split(" ")[0]} · ` : ""}
                          {new Date(inst.fechaVencimiento).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {inst.esEntregable && <span className="text-[9px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded shrink-0">ENTREGABLE</span>}
                    </div>
                  ))}
                </div>
              )
            ) : tab === "por-area" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agrupar(instancias).map(({ area, subareas }) => {
                  const todas = Object.values(subareas).flatMap(s => s.instancias);
                  const completadas = todas.filter(i => i.estado === "COMPLETADA").length;
                  const pct = todas.length > 0 ? Math.round(completadas / todas.length * 100) : 0;
                  const soArea = soData?.areas.find(a => a.nombre === area.nombre);
                  const contextoOpen = contextoOpenIds.has(area.id);
                  return (
                    <div key={area.id} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{area.icono}</span>
                        <span className="text-white font-semibold">{area.nombre}</span>
                        <span className="ml-auto text-white/60 text-sm font-bold">{pct}%</span>
                        {soArea && (
                          <button onClick={() => setContextoOpenIds(prev => {
                            const next = new Set(prev);
                            if (next.has(area.id)) next.delete(area.id); else next.add(area.id);
                            return next;
                          })} title="Ver contexto" className="w-6 h-6 flex items-center justify-center rounded-full bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-500 hover:text-[#B3985B] text-xs transition-colors">ⓘ</button>
                        )}
                      </div>
                      <div className="h-1.5 bg-[#1e1e1e] rounded-full mb-4">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: area.color }} />
                      </div>
                      <div className="grid grid-cols-3 text-center text-xs">
                        <div><p className="text-white font-bold">{completadas}</p><p className="text-gray-600">Completadas</p></div>
                        <div><p className="text-white font-bold">{todas.filter(i => i.estado === "PENDIENTE").length}</p><p className="text-gray-600">Pendientes</p></div>
                        <div><p className="text-red-400 font-bold">{todas.filter(i => i.estado === "VENCIDA").length}</p><p className="text-gray-600">Vencidas</p></div>
                      </div>
                      {contextoOpen && soArea && (
                        <div className="mt-4 pt-4 border-t border-[#1a1a1a] space-y-3">
                          {soArea.objetivo && (
                            <div className="pl-3 border-l-2 py-1" style={{ borderColor: area.color }}>
                              <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Objetivo</p>
                              <p className="text-gray-300 text-xs leading-relaxed">{soArea.objetivo}</p>
                            </div>
                          )}
                          {soArea.subareas.filter(sa => {
                            const saId = sa.id;
                            return Object.values(subareas).some(s => s.subarea.id === saId && s.instancias.length > 0);
                          }).map(sa => sa.entregables.length > 0 && (
                            <div key={sa.id} className="bg-green-950/20 border border-green-900/20 rounded-lg px-3 py-2">
                              <p className="text-green-600 text-[9px] font-bold uppercase tracking-widest mb-1.5">{sa.nombre}</p>
                              <ul className="space-y-0.5">
                                {sa.entregables.map((e, i) => <li key={i} className="text-gray-400 text-xs"><span className="text-green-600 font-bold">→</span> {e}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : tab === "sistema-op" ? (
              <div className="max-w-3xl space-y-3">
                {!soData ? (
                  <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-2xl h-16 animate-pulse" />)}</div>
                ) : (
                  <>
                    {/* Indicadores Maestros — solo ADMIN */}
                    {me?.role === 'ADMIN' && (
                      <div className="mb-6 border border-[#B3985B]/30 rounded-xl bg-[#0d0d0d] p-4">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[#B3985B] font-semibold mb-3">Indicadores Maestros</p>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Ventas del período */}
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Ventas del período</p>
                            <p className="text-lg font-bold text-white">
                              {bannerData ? `$${bannerData.ingresosDevengados.toLocaleString('es-MX', { maximumFractionDigits: 0 })}` : '—'}
                            </p>
                            <p className="text-[10px] text-gray-600">Meta: $500,000 MXN</p>
                            {bannerData && (
                              <span className={`text-[10px] font-medium ${
                                bannerData.cumpleMetaIngresos ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {bannerData.cumpleMetaIngresos ? '🟢 Cumple meta' : '🔴 Bajo meta'}
                              </span>
                            )}
                          </div>
                          {/* Rentabilidad */}
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Rentabilidad</p>
                            <p className="text-lg font-bold text-white">
                              {bannerData ? `${bannerData.margenNeto.toFixed(1)}%` : '—'}
                            </p>
                            <p className="text-[10px] text-gray-600">Meta: ≥ 30%</p>
                            {bannerData && (
                              <span className={`text-[10px] font-medium ${
                                bannerData.cumpleMetaMargen ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {bannerData.cumpleMetaMargen ? '🟢 Cumple meta' : '🔴 Bajo meta'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {soData.areas.map(area => (
                      <div key={area.id} className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                        {/* Acordeón header */}
                        <button
                          onClick={() => setSoAreaOpen(soAreaOpen === area.id ? null : area.id)}
                          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#161616] transition-colors text-left"
                        >
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                          <span className="text-lg">{area.icono}</span>
                          <span className="text-white font-semibold flex-1">{area.nombre}</span>
                          <span className="text-gray-600 text-[10px]">{area.kpis.length} KPIs</span>
                          <span className="text-gray-600 text-xs ml-2">{soAreaOpen === area.id ? "▾" : "▸"}</span>
                        </button>
                        {/* Acordeón body */}
                        {soAreaOpen === area.id && (
                          <div className="px-5 pb-5 space-y-5 border-t border-[#1a1a1a]">
                            {/* A — Objetivo */}
                            {area.objetivo && (
                              <div className="mt-4 pl-4 border-l-4 py-2" style={{ borderColor: area.color }}>
                                <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1.5">Objetivo del área</p>
                                <p className="text-gray-200 text-sm leading-relaxed">{area.objetivo}</p>
                              </div>
                            )}
                            {/* B — Entregables por subárea */}
                            {area.subareas.some(s => s.entregables.length > 0) && (
                              <div>
                                <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-3">Entregables por subárea</p>
                                <div className="space-y-2">
                                  {area.subareas.filter(s => s.entregables.length > 0).map(sa => (
                                    <div key={sa.id} className="bg-green-950/20 border border-green-900/20 rounded-xl px-4 py-3">
                                      <p className="text-green-600 text-[9px] font-bold uppercase tracking-widest mb-2">{sa.nombre}</p>
                                      <ul className="space-y-1">
                                        {sa.entregables.map((e, i) => (
                                          <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                            <span className="text-green-500 font-bold shrink-0">→</span>{e}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* C — KPIs con collapse top-3 */}
                            {area.kpis.length > 0 && (() => {
                              const sortedKpis = [...area.kpis].sort((a, b) => a.orden - b.orden);
                              const isExpanded = kpiExpandedAreas.has(area.id);
                              const visibleKpis = isExpanded ? sortedKpis : sortedKpis.slice(0, 3);
                              const hiddenCount = sortedKpis.length - 3;
                              return (
                                <div>
                                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-3">KPIs del área</p>
                                  <div className="overflow-x-auto rounded-xl border border-[#1e1e1e]">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-black">
                                          {["Indicador","Meta","Cómo se calcula","Fuente en plataforma"].map(h => (
                                            <th key={h} className="text-left px-3 py-2.5 text-[#B3985B] font-semibold whitespace-nowrap">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {visibleKpis.map((kpi, i) => (
                                          <tr key={kpi.id} className={i % 2 === 0 ? "bg-[#0d0d0d]" : "bg-[#111]"}>
                                            <td className="px-3 py-2.5 text-white font-medium">{kpi.nombre}</td>
                                            <td className="px-3 py-2.5 text-[#B3985B] font-bold whitespace-nowrap">{kpi.meta}</td>
                                            <td className="px-3 py-2.5 text-gray-400">{kpi.formula}</td>
                                            <td className="px-3 py-2.5 text-gray-500">{kpi.fuente}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {hiddenCount > 0 && (
                                      <button
                                        onClick={() => setKpiExpandedAreas(prev => {
                                          const next = new Set(prev);
                                          if (next.has(area.id)) next.delete(area.id); else next.add(area.id);
                                          return next;
                                        })}
                                        className="w-full flex items-center gap-1.5 justify-center py-2 text-[10px] text-gray-500 hover:text-gray-300 transition-colors bg-[#111] border-t border-[#1e1e1e]"
                                      >
                                        <svg
                                          className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {isExpanded ? 'Ver menos' : `Ver todos los indicadores (+${hiddenCount} más)`}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                    {/* KPIs Transversales */}
                    {soData.kpisTransversales.length > 0 && (
                      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setSoAreaOpen(soAreaOpen === "transversal" ? null : "transversal")}
                          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#161616] transition-colors text-left"
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-[#B3985B] shrink-0" />
                          <span className="text-white font-semibold flex-1">KPIs Transversales / Gastos</span>
                          <span className="text-gray-600 text-[10px]">{soData.kpisTransversales.length} KPIs</span>
                          <span className="text-gray-600 text-xs ml-2">{soAreaOpen === "transversal" ? "▾" : "▸"}</span>
                        </button>
                        {soAreaOpen === "transversal" && (
                          <div className="px-5 pb-5 border-t border-[#1a1a1a] mt-0 pt-4">
                            <p className="text-gray-500 text-[10px] leading-relaxed mb-4">
                              Estos KPIs aplican a toda la empresa y relacionan cada rubro de gasto contra los ingresos totales del mes.
                            </p>
                            <div className="overflow-x-auto rounded-xl border border-[#1e1e1e]">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-black">
                                    {["Indicador","Meta","Cómo se calcula","Fuente en plataforma"].map(h => (
                                      <th key={h} className="text-left px-3 py-2.5 text-[#B3985B] font-semibold whitespace-nowrap">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {soData.kpisTransversales.map((kpi, i) => (
                                    <tr key={kpi.id} className={i % 2 === 0 ? "bg-[#0d0d0d]" : "bg-[#111]"}>
                                      <td className="px-3 py-2.5 text-white font-medium">{kpi.nombre}</td>
                                      <td className="px-3 py-2.5 text-[#B3985B] font-bold whitespace-nowrap">{kpi.meta}</td>
                                      <td className="px-3 py-2.5 text-gray-400">{kpi.formula}</td>
                                      <td className="px-3 py-2.5 text-gray-500">{kpi.fuente}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : tab === "equipo" && isAdmin ? (
              <div className="space-y-6">
                {agrupar(instanciasEquipo).map(({ area, subareas }) => (
                  <div key={area.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }} />
                      <span className="text-white font-semibold text-sm">{area.icono} {area.nombre}</span>
                      <div className="flex-1 h-px bg-[#1e1e1e]" />
                      <span className="text-gray-600 text-[10px]">
                        {Object.values(subareas).flatMap(s => s.instancias).filter(i => i.estado === "COMPLETADA").length}/
                        {Object.values(subareas).flatMap(s => s.instancias).length}
                      </span>
                    </div>
                    {Object.values(subareas).map(({ subarea, instancias: insts }) => (
                      <div key={subarea.id} className="mb-4">
                        <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1.5 ml-1">{subarea.nombre}</p>
                        <div className="space-y-1.5">
                          {insts.map(inst => (
                            <TareaCard key={inst.id} inst={inst} selected={selectedId === inst.id}
                              accionando={accionando === inst.id} showResponsable={true}
                              onSelect={() => setSelectedId(selectedId === inst.id ? null : inst.id)}
                              onAccion={tipo => accion(inst.id, tipo)}
                              onEntregableConfirm={() => { setEntregableDialogId(inst.id); setNotaEntrega(""); }}
                              onIrModulo={() => { if (inst.template.moduloDestino) router.push(inst.template.moduloDestino); }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              /* Mi Plan */
              agrupar(misTareas).length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-white/40 text-sm">No tienes tareas asignadas para hoy</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {agrupar(misTareas).map(({ area, subareas }) => (
                    <div key={area.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }} />
                        <span className="text-white font-semibold text-sm">{area.icono} {area.nombre}</span>
                        <div className="flex-1 h-px bg-[#1e1e1e]" />
                      </div>
                      <div className="space-y-4">
                        {Object.values(subareas).map(({ subarea, instancias: insts }) => (
                          <div key={subarea.id}>
                            <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-2 ml-1">{subarea.nombre}</p>
                            <div className="space-y-1.5">
                              {insts.map(inst => (
                                <TareaCard key={inst.id} inst={inst} selected={selectedId === inst.id}
                                  accionando={accionando === inst.id} showResponsable={false}
                                  onSelect={() => setSelectedId(selectedId === inst.id ? null : inst.id)}
                                  onAccion={tipo => accion(inst.id, tipo)}
                                  onEntregableConfirm={() => { setEntregableDialogId(inst.id); setNotaEntrega(""); }}
                                  onIrModulo={() => { if (inst.template.moduloDestino) router.push(inst.template.moduloDestino); }} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )
          )}
        </div>
      </div>

      {/* ── Dialog de entregable ── */}
      {entregableDialogId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-semibold mb-1">Marcar como entregado</h3>
            <p className="text-gray-500 text-sm mb-4">Agrega una nota opcional sobre este entregable antes de cerrarlo.</p>
            <textarea
              value={notaEntrega}
              onChange={e => setNotaEntrega(e.target.value)}
              placeholder="Nota de entrega (opcional)..."
              rows={3}
              className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]/50 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={completarEntregable}
                className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400 text-sm font-semibold py-2.5 rounded-xl transition-colors">
                ✓ Confirmar entrega
              </button>
              <button onClick={() => setEntregableDialogId(null)}
                className="px-4 bg-[#111] hover:bg-[#1a1a1a] border border-[#333] text-gray-500 text-sm py-2.5 rounded-xl">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer de detalle ── */}
      {selected && (
        <div className="w-[370px] border-l border-[#1a1a1a] flex flex-col bg-[#0d0d0d] overflow-hidden shrink-0">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase ${selected.esEntregable ? "bg-purple-900/30 text-purple-400" : "bg-blue-900/30 text-blue-400"}`}>
                  {selected.esEntregable ? "Entregable" : "Check"}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded font-semibold ${ESTADO_CONFIG[selected.estado]?.bg} ${ESTADO_CONFIG[selected.estado]?.color}`}>
                  {ESTADO_CONFIG[selected.estado]?.label}
                </span>
              </div>
              <p className="text-white font-semibold text-sm leading-snug">{selected.template.nombre}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">{selected.template.area.nombre} · {selected.template.subArea.nombre}</p>
              {selected.responsable && <p className="text-gray-500 text-[10px]">👤 {selected.responsable.name}</p>}
            </div>
            <button onClick={() => setSelectedId(null)} className="text-gray-600 hover:text-white shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Descripción */}
            {selected.template.descripcion && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3">
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1.5">Descripción</p>
                <p className="text-gray-300 text-xs leading-relaxed">{selected.template.descripcion}</p>
              </div>
            )}

            {/* Módulo destino */}
            {selected.template.moduloDestino && (
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-2">Módulo destino</p>
                <button
                  onClick={() => { if (rutaExiste(selected.template.moduloDestino)) router.push(selected.template.moduloDestino!); }}
                  disabled={!rutaExiste(selected.template.moduloDestino)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-colors ${rutaExiste(selected.template.moduloDestino) ? "border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10" : "border-[#333] text-gray-600 cursor-not-allowed"}`}>
                  <span>{selected.template.moduloTexto ?? "Ir al módulo"}</span>
                  <span>{rutaExiste(selected.template.moduloDestino) ? "→" : "🔒"}</span>
                </button>
              </div>
            )}

            {/* Vencimiento con countdown live */}
            <div className="flex gap-3">
              <div className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                <p className="text-gray-600 text-[10px] mb-0.5">Vence</p>
                <p className="text-white text-xs font-medium">{new Date(selected.fechaVencimiento).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                <p className="text-gray-600 text-[10px] mb-0.5">Tiempo</p>
                {selected.completadaAt ? (
                  <p className="text-green-400 text-xs font-medium">✓ Completada</p>
                ) : (
                  // tick forces re-render for live countdown
                  <p className={`text-xs font-medium ${timeLeftStr(selected.fechaVencimiento).color}`} key={tick}>
                    {timeLeftStr(selected.fechaVencimiento).text}
                  </p>
                )}
              </div>
            </div>

            {/* Subtareas */}
            {selected.subtareasInstancia.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-[10px] uppercase tracking-wider">Pasos</p>
                  <span className="text-gray-600 text-[10px]">
                    {selected.subtareasInstancia.filter(s => s.completada).length}/{selected.subtareasInstancia.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {selected.subtareasInstancia.map(st => (
                    <label key={st.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={st.completada}
                        onChange={e => toggleSubtarea(selected.id, st.id, e.target.checked)}
                        className="accent-[#B3985B] w-3.5 h-3.5 shrink-0" />
                      <span className={`text-xs ${st.completada ? "line-through text-gray-600" : "text-gray-300"}`}>{st.subtarea.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones */}
            {selected.estado !== "COMPLETADA" && selected.estado !== "OMITIDA" && (
              <div className="space-y-2">
                {selected.esEntregable && selected.template.moduloDestino && rutaExiste(selected.template.moduloDestino) && (
                  <button onClick={() => router.push(selected.template.moduloDestino!)}
                    className="w-full flex items-center justify-between bg-[#B3985B]/10 hover:bg-[#B3985B]/20 border border-[#B3985B]/30 text-[#B3985B] text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                    <span>→ Ir a {selected.template.moduloTexto ?? "módulo"}</span>
                    <span className="text-xs opacity-60">primero ejecutar</span>
                  </button>
                )}
                <div className="flex gap-2">
                  {selected.esEntregable ? (
                    <button onClick={() => { setEntregableDialogId(selected.id); setNotaEntrega(""); }}
                      disabled={accionando === selected.id}
                      className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400 text-xs font-semibold py-2 rounded-xl disabled:opacity-50">
                      ✓ Marcar como entregado
                    </button>
                  ) : (
                    <button onClick={() => accion(selected.id, "completar")}
                      disabled={accionando === selected.id}
                      className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400 text-xs font-semibold py-2 rounded-xl disabled:opacity-50">
                      ✓ Completar
                    </button>
                  )}
                  <button onClick={() => accion(selected.id, "omitir")} disabled={accionando === selected.id}
                    className="px-3 bg-[#111] hover:bg-[#1a1a1a] border border-[#333] text-gray-500 text-xs py-2 rounded-xl">Omitir</button>
                </div>
              </div>
            )}
            {selected.estado === "COMPLETADA" && (
              <button onClick={() => accion(selected.id, "reabrir")}
                className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-[#333] text-gray-400 text-xs py-2 rounded-xl">↩ Reabrir</button>
            )}

            {/* Reasignar — solo admin */}
            {isAdmin && selected.estado !== "COMPLETADA" && selected.estado !== "OMITIDA" && (
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-2">Reasignar</p>
                <div className="relative">
                  <select
                    value=""
                    disabled={reasignandoId === selected.id}
                    onChange={async e => {
                      const uid = e.target.value;
                      if (!uid) return;
                      setReasignandoId(selected.id);
                      const res = await fetch(`/api/plan-trabajo/instancias/${selected.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ accion: "reasignar", responsableId: uid }),
                      });
                      if (res.ok) {
                        const d = await res.json();
                        setInstancias(prev => prev.map(i => i.id === selected.id ? { ...i, ...d.instancia } : i));
                      }
                      setReasignandoId(null);
                    }}
                    className="w-full bg-[#111] border border-[#333] hover:border-[#444] text-gray-300 text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-[#B3985B]/50 appearance-none pr-8">
                    <option value="" disabled>{reasignandoId === selected.id ? "Reasignando..." : `👤 ${selected.responsable?.name ?? "Sin asignar"} — cambiar →`}</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}{u.area ? ` (${u.area})` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-[10px]">▾</div>
                </div>
              </div>
            )}

            {/* WhatsApp */}
            <a href={`https://wa.me/?text=${encodeURIComponent(`[Mainstage Pro] Tarea pendiente: "${selected.template.nombre}" — ${selected.template.area.nombre}. mainstagepro.vercel.app/plan-trabajo`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-green-900/20 hover:bg-green-900/30 border border-green-900/30 text-green-400 text-xs font-medium transition-colors">
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/></svg>
              Notificar por WhatsApp
            </a>

            {/* Comentarios */}
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-2">Comentarios {selected.comentarios.length > 0 && `(${selected.comentarios.length})`}</p>
              <div className="space-y-2 mb-3">
                {selected.comentarios.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#222] border border-[#333] shrink-0 flex items-center justify-center text-[10px] text-gray-400">{c.autor.name?.charAt(0)}</div>
                    <div className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                      <p className="text-white/70 text-xs font-medium">{c.autor.name}</p>
                      <p className="text-white/50 text-[11px] mt-0.5 leading-snug">{c.contenido}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={comentario} onChange={e => setComentario(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarComentario(); } }}
                  placeholder="Escribe un comentario..."
                  className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]/50" />
                <button onClick={enviarComentario} disabled={enviandoComentario || !comentario.trim()}
                  className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-bold px-3 py-2 rounded-lg">→</button>
              </div>
            </div>

            {/* Historial colapsable */}
            {selected.historial.length > 0 && (
              <div>
                <button onClick={() => setHistorialOpen(v => !v)}
                  className="flex items-center gap-2 text-gray-600 text-[10px] uppercase tracking-wider hover:text-gray-400 transition-colors">
                  <span>{historialOpen ? "▾" : "▸"}</span> Historial ({selected.historial.length})
                </button>
                {historialOpen && (
                  <div className="mt-2 space-y-1.5">
                    {selected.historial.map(h => (
                      <div key={h.id} className="flex items-start gap-2 text-[11px]">
                        <div className="w-1 h-1 rounded-full bg-gray-700 mt-1.5 shrink-0" />
                        <div>
                          <span className="text-gray-400">{ACCION_LABELS[h.accion] ?? h.accion}</span>
                          <span className="text-gray-600"> por {h.usuario.name} · {tiempoRelativo(h.createdAt)}</span>
                          {h.detalles && (() => { try { const d = JSON.parse(h.detalles!); return d.nota ? <p className="text-gray-600 italic mt-0.5">&ldquo;{d.nota}&rdquo;</p> : null; } catch { return null; } })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TareaCard ────────────────────────────────────────────────────────────────
function TareaCard({ inst, selected, accionando, showResponsable, onSelect, onAccion, onEntregableConfirm, onIrModulo }: {
  inst: Instancia; selected: boolean; accionando: boolean; showResponsable: boolean;
  onSelect: () => void; onAccion: (t: "completar"|"reabrir"|"omitir") => void;
  onEntregableConfirm: () => void; onIrModulo: () => void;
}) {
  const cfg = ESTADO_CONFIG[inst.estado];
  const subtareasPct = inst.subtareasInstancia.length > 0
    ? Math.round(inst.subtareasInstancia.filter(s => s.completada).length / inst.subtareasInstancia.length * 100) : null;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
      selected ? "border-[#B3985B]/40 bg-[#B3985B]/5" :
      inst.estado === "COMPLETADA" ? "border-[#1a1a1a] bg-[#0d0d0d] opacity-60" :
      inst.estado === "VENCIDA" ? "border-red-900/30 bg-[#111] hover:border-red-900/50" :
      "border-[#1e1e1e] bg-[#111] hover:border-[#2a2a2a]"
    }`} onClick={onSelect}>
      {!inst.esEntregable && inst.estado !== "OMITIDA" && (
        <button onClick={e => { e.stopPropagation(); onAccion(inst.estado === "COMPLETADA" ? "reabrir" : "completar"); }}
          disabled={accionando}
          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${inst.estado === "COMPLETADA" ? "border-green-500 bg-green-500" : "border-gray-600 hover:border-green-500"}`}>
          {inst.estado === "COMPLETADA" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
      )}
      {inst.esEntregable && (
        <div className={`w-5 h-5 rounded-sm shrink-0 flex items-center justify-center text-[10px] ${inst.estado === "COMPLETADA" ? "bg-green-500/20 text-green-400" : "bg-purple-900/30 text-purple-400"}`}>📄</div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${inst.estado === "COMPLETADA" ? "line-through text-gray-600" : "text-white"}`}>
          {inst.template.nombre}
          {inst.estado === "VENCIDA" && <span className="text-red-400 text-[9px] ml-2 font-bold">⚠</span>}
        </p>
        {showResponsable && inst.responsable && <p className="text-gray-600 text-[10px]">👤 {inst.responsable.name}</p>}
        {subtareasPct !== null && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full"><div className="h-full rounded-full bg-[#B3985B]" style={{ width: `${subtareasPct}%` }} /></div>
            <span className="text-gray-600 text-[9px]">{subtareasPct}%</span>
          </div>
        )}
      </div>
      {inst.esEntregable && inst.estado !== "COMPLETADA" && (
        <button onClick={e => { e.stopPropagation(); onEntregableConfirm(); }}
          className="shrink-0 text-[10px] px-2 py-1 rounded border border-green-700/40 text-green-400 hover:bg-green-900/20 transition-colors">
          Entregar
        </button>
      )}
      {!inst.esEntregable && inst.template.moduloDestino && rutaExiste(inst.template.moduloDestino) && inst.estado !== "COMPLETADA" && (
        <button onClick={e => { e.stopPropagation(); onIrModulo(); }}
          className="shrink-0 text-[10px] px-2 py-1 rounded border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10">
          {inst.template.moduloTexto ?? "Ir →"}
        </button>
      )}
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg?.dot}`} />
    </div>
  );
}
