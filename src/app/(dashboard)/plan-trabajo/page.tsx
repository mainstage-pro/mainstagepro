"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Area { id: string; nombre: string; color: string; icono: string | null; }
interface SubArea { id: string; nombre: string; entregables: string[]; }
interface Template { id: string; nombre: string; tipo: string; moduloDestino: string | null; moduloTexto: string | null; area: Area; subArea: SubArea; }
interface Responsable { id: string; name: string; }
interface SubtareaInst { id: string; completada: boolean; subtarea: { id: string; nombre: string; orden: number }; }
interface Comentario { id: string; contenido: string; createdAt: string; autor: Responsable; }
interface Instancia {
  id: string; estado: string; esEntregable: boolean; periodoLabel: string | null;
  fechaVencimiento: string; notas: string | null; completadaAt: string | null;
  template: Template; responsable: Responsable;
  subtareasInstancia: SubtareaInst[];
  comentarios: Comentario[];
}
interface AreaConfig {
  id: string; nombre: string; color: string; icono: string | null;
  _count: { templates: number };
  subareas: { id: string; nombre: string; _count: { templates: number } }[];
}
interface Me { id: string; name: string; role: string; area: string | null; }

// ─── Constantes ───────────────────────────────────────────────────────────────
const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  PENDIENTE:   { label: "Pendiente",   color: "text-gray-400",  bg: "bg-gray-800/40",  dot: "bg-gray-500" },
  EN_PROGRESO: { label: "En progreso", color: "text-blue-400",  bg: "bg-blue-900/30",  dot: "bg-blue-400" },
  COMPLETADA:  { label: "Completada",  color: "text-green-400", bg: "bg-green-900/30", dot: "bg-green-400" },
  VENCIDA:     { label: "Vencida",     color: "text-red-400",   bg: "bg-red-900/30",   dot: "bg-red-400" },
  OMITIDA:     { label: "Omitida",     color: "text-gray-600",  bg: "bg-gray-900/20",  dot: "bg-gray-700" },
};

const RUTAS_EXISTENTES = ["/finanzas", "/marketing", "/proyectos", "/operaciones", "/crm", "/ventas", "/rrhh", "/cotizaciones"];
function rutaExiste(ruta: string | null) {
  if (!ruta) return false;
  return RUTAS_EXISTENTES.some(r => ruta.startsWith(r));
}

function timeLeft(fv: string) {
  const diff = new Date(fv).getTime() - Date.now();
  if (diff < 0) return "Vencida";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PlanTrabajoPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<"mi-plan" | "equipo" | "por-area" | "config">("mi-plan");
  const [instancias, setInstancias] = useState<Instancia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [accionando, setAccionando] = useState<string | null>(null);
  const [configData, setConfigData] = useState<{ totalTemplates: number; areas: AreaConfig[] } | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [generarLoading, setGenerarLoading] = useState(false);
  const [configMsg, setConfigMsg] = useState<string | null>(null);
  const [equipoFilter, setEquipoFilter] = useState<string>("todos"); // userId o "todos"

  const isAdmin = me?.role === "ADMIN";

  // Cargar sesión
  useEffect(() => {
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        setMe(d);
        // Admin empieza en Vista Equipo, usuario normal en Mi Plan
        if (d.role === "ADMIN") setTab("equipo");
      }
    });
  }, []);

  const loadInstancias = useCallback(async () => {
    if (tab === "config" || !me) return;
    setLoading(true);
    try {
      // Admin en vista equipo: pide todas sin filtro de usuario
      // Usuario normal: pide solo las suyas
      const params = new URLSearchParams({ vista: tab === "por-area" ? "semana" : "dia" });
      const res = await fetch(`/api/plan-trabajo/instancias?${params}`);
      if (res.ok) setInstancias((await res.json()).instancias ?? []);
    } finally { setLoading(false); }
  }, [tab, me]);

  useEffect(() => { if (me) loadInstancias(); }, [loadInstancias, me]);

  const loadConfig = useCallback(async () => {
    if (tab !== "config") return;
    fetch("/api/plan-trabajo/templates").then(r => r.ok ? r.json() : null).then(d => { if (d) setConfigData(d); });
  }, [tab]);
  useEffect(() => { loadConfig(); }, [loadConfig]);

  const selected = instancias.find(i => i.id === selectedId) ?? null;
  const misTareas = me ? instancias.filter(i => i.responsable?.id === me.id) : instancias;
  const pendientesHoy = misTareas.filter(i => i.estado === "PENDIENTE" || i.estado === "EN_PROGRESO").length;
  const completadasHoy = misTareas.filter(i => i.estado === "COMPLETADA").length;
  const vencidas = misTareas.filter(i => i.estado === "VENCIDA").length;
  const totalEquipo = instancias.filter(i => i.estado !== "COMPLETADA" && i.estado !== "OMITIDA").length;
  const vencidasEquipo = instancias.filter(i => i.estado === "VENCIDA").length;

  function compartirWhatsApp() {
    const msg = `[Mainstage Pro] Tienes ${pendientesHoy} tarea${pendientesHoy !== 1 ? "s" : ""} pendiente${pendientesHoy !== 1 ? "s" : ""} hoy. Revisa tu plan en mainstagepro.vercel.app/plan-trabajo`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  async function accion(id: string, tipo: "completar" | "reabrir" | "omitir" | "en_progreso") {
    setAccionando(id);
    const res = await fetch(`/api/plan-trabajo/instancias/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: tipo }),
    });
    if (res.ok) {
      const d = await res.json();
      setInstancias(prev => prev.map(i => i.id === id ? { ...i, ...d.instancia } : i));
    }
    setAccionando(null);
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

  async function ejecutarSeed() {
    setSeedLoading(true); setConfigMsg(null);
    const res = await fetch("/api/admin/seed-plan-trabajo", { method: "POST" });
    const d = await res.json();
    setConfigMsg(res.ok ? `✅ ${d.totalAreas} áreas, ${d.totalSubareas} subáreas, ${d.totalTemplates} plantillas` : `❌ ${d.error}`);
    setSeedLoading(false); loadConfig();
  }

  async function generarHoy() {
    setGenerarLoading(true); setConfigMsg(null);
    const res = await fetch("/api/plan-trabajo/generar", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await res.json();
    setConfigMsg(res.ok ? `✅ ${d.generadas} instancias creadas, ${d.omitidas} ya existían` : `❌ ${d.error}`);
    setGenerarLoading(false);
  }

  // Instancias filtradas para la vista equipo
  const instanciasEquipo = equipoFilter === "todos" ? instancias : instancias.filter(i => i.responsable?.id === equipoFilter);
  const personas = agruparPorPersona(instancias);
  const agrupadasMiPlan = agrupar(misTareas);
  const agrupadasEquipo = agrupar(instanciasEquipo);
  const agrupadasArea   = agrupar(instancias);

  const TABS = [
    { key: "mi-plan" as const, label: "Mi Plan" },
    ...(isAdmin ? [{ key: "equipo" as const, label: "Equipo" }] : []),
    { key: "por-area" as const, label: "Por Área" },
    { key: "config" as const, label: "⚙ Config" },
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#1a1a1a]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">Plan de Trabajo</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {tab !== "config" && (
                <>
                  {/* KPIs: Mi plan */}
                  {(tab === "mi-plan") && [
                    { label: "Pendientes", value: pendientesHoy, color: "text-white" },
                    { label: "Completadas", value: completadasHoy, color: "text-green-400" },
                    { label: "Vencidas", value: vencidas, color: "text-red-400" },
                  ].map(k => (
                    <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-center min-w-[60px]">
                      <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                      <p className="text-gray-600 text-[10px]">{k.label}</p>
                    </div>
                  ))}
                  {/* KPIs: Equipo */}
                  {(tab === "equipo") && isAdmin && [
                    { label: "Pendientes", value: totalEquipo, color: "text-white" },
                    { label: "Vencidas", value: vencidasEquipo, color: "text-red-400" },
                    { label: "Personas", value: personas.length, color: "text-[#B3985B]" },
                  ].map(k => (
                    <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2 text-center min-w-[60px]">
                      <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                      <p className="text-gray-600 text-[10px]">{k.label}</p>
                    </div>
                  ))}
                  {/* WhatsApp */}
                  {tab === "mi-plan" && (
                    <button onClick={compartirWhatsApp} title="Enviar resumen por WhatsApp"
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-900/20 hover:bg-green-900/40 border border-green-900/30 text-green-400 transition-colors">
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
                      </svg>
                    </button>
                  )}
                </>
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

          {/* Filtro por persona en vista Equipo */}
          {tab === "equipo" && isAdmin && personas.length > 1 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-gray-600 text-[10px] uppercase tracking-wider">Ver:</span>
              <button onClick={() => setEquipoFilter("todos")}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${equipoFilter === "todos" ? "border-[#B3985B]/60 bg-[#B3985B]/10 text-[#B3985B]" : "border-[#333] text-gray-500 hover:text-white"}`}>
                Todos
              </button>
              {personas.map(p => (
                <button key={p.responsable.id} onClick={() => setEquipoFilter(p.responsable.id)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${equipoFilter === p.responsable.id ? "border-[#B3985B]/60 bg-[#B3985B]/10 text-[#B3985B]" : "border-[#333] text-gray-500 hover:text-white"}`}>
                  {p.responsable.name.split(" ")[0]}
                  <span className="ml-1 text-[9px] opacity-50">({p.instancias.filter(i => i.estado !== "COMPLETADA" && i.estado !== "OMITIDA").length})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* ── Config ── */}
          {tab === "config" && (
            <div className="max-w-2xl space-y-5">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
                <h2 className="text-white font-semibold text-sm mb-1">Plantillas</h2>
                <p className="text-gray-500 text-xs mb-4">
                  {configData ? configData.totalTemplates > 0
                    ? `${configData.totalTemplates} plantillas activas en ${configData.areas.length} áreas`
                    : "Sin plantillas aún" : "Cargando..."}
                </p>
                {configData?.areas.map(area => (
                  <div key={area.id} className="flex items-center gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }} />
                    <span className="text-white/70 text-sm">{area.icono} {area.nombre}</span>
                    <span className="ml-auto text-gray-600 text-xs">{area._count.templates} plantillas</span>
                  </div>
                ))}
                {configData?.totalTemplates === 0 && (
                  <button onClick={ejecutarSeed} disabled={seedLoading}
                    className="mt-2 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black text-xs font-bold px-4 py-2 rounded-xl">
                    {seedLoading ? "Cargando..." : "📥 Cargar las 144 plantillas"}
                  </button>
                )}
              </div>
              <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
                <h2 className="text-white font-semibold text-sm mb-1">Generar instancias de hoy</h2>
                <p className="text-gray-500 text-xs mb-4">El cron corre automáticamente a la 01:00 AM México. Úsalo manualmente si necesitas regenerar.</p>
                <button onClick={generarHoy} disabled={generarLoading}
                  className="bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                  {generarLoading ? "Generando..." : "▶ Generar tareas de hoy"}
                </button>
              </div>
              {configMsg && (
                <div className={`text-sm px-4 py-3 rounded-xl border ${configMsg.startsWith("✅") ? "bg-green-900/20 border-green-900/40 text-green-400" : "bg-red-900/20 border-red-900/40 text-red-400"}`}>
                  {configMsg}
                </div>
              )}
            </div>
          )}

          {/* ── Vistas con instancias ── */}
          {tab !== "config" && (
            loading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl h-16 animate-pulse" />)}</div>
            ) : instancias.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-white/60 font-medium">No hay tareas para hoy</p>
                <p className="text-white/20 text-sm mt-1">Se generan automáticamente a las 01:00 AM.</p>
                <button onClick={() => setTab("config")} className="mt-4 text-[#B3985B] text-xs hover:underline">
                  ¿Primera vez? Ir a Configuración →
                </button>
              </div>
            ) : tab === "por-area" ? (
              /* Vista por área con porcentajes */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agrupadasArea.map(({ area, subareas }) => {
                  const todas = Object.values(subareas).flatMap(s => s.instancias);
                  const completadas = todas.filter(i => i.estado === "COMPLETADA").length;
                  const pct = todas.length > 0 ? Math.round(completadas / todas.length * 100) : 0;
                  return (
                    <div key={area.id} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{area.icono}</span>
                        <span className="text-white font-semibold">{area.nombre}</span>
                        <span className="ml-auto text-white/60 text-sm font-bold">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#1e1e1e] rounded-full mb-4">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: area.color }} />
                      </div>
                      <div className="grid grid-cols-3 text-center text-xs">
                        <div><p className="text-white font-bold">{completadas}</p><p className="text-gray-600">Completadas</p></div>
                        <div><p className="text-white font-bold">{todas.filter(i => i.estado === "PENDIENTE").length}</p><p className="text-gray-600">Pendientes</p></div>
                        <div><p className="text-red-400 font-bold">{todas.filter(i => i.estado === "VENCIDA").length}</p><p className="text-gray-600">Vencidas</p></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : tab === "equipo" && isAdmin ? (
              /* Vista equipo — agrupado por área (o por persona si hay filtro) */
              <div className="space-y-6">
                {(equipoFilter === "todos" ? agrupadasEquipo : agrupar(instanciasEquipo)).map(({ area, subareas }) => (
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
                              onIrModulo={() => { if (inst.template.moduloDestino) router.push(inst.template.moduloDestino); }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              /* Mi Plan — solo mis tareas */
              <div className="space-y-6">
                {agrupadasMiPlan.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-white/40 text-sm">No tienes tareas asignadas para hoy</p>
                  </div>
                ) : agrupadasMiPlan.map(({ area, subareas }) => (
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
          )}
        </div>
      </div>

      {/* ── Drawer ── */}
      {selected && (
        <div className="w-[360px] border-l border-[#1a1a1a] flex flex-col bg-[#0d0d0d] overflow-hidden shrink-0">
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
              <p className="text-gray-600 text-[10px] mt-0.5">
                {selected.template.area.nombre} · {selected.template.subArea.nombre}
              </p>
              <p className="text-gray-500 text-[10px] mt-0.5">
                👤 {selected.responsable?.name ?? "Sin asignar"}
              </p>
            </div>
            <button onClick={() => setSelectedId(null)} className="text-gray-600 hover:text-white transition-colors shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {selected.template.moduloDestino && (
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-2">Módulo destino</p>
                <button
                  onClick={() => { if (rutaExiste(selected.template.moduloDestino)) router.push(selected.template.moduloDestino!); }}
                  disabled={!rutaExiste(selected.template.moduloDestino)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-colors ${rutaExiste(selected.template.moduloDestino) ? "border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10" : "border-[#333] text-gray-600 cursor-not-allowed"}`}
                  title={!rutaExiste(selected.template.moduloDestino) ? "Módulo próximamente" : ""}>
                  <span>{selected.template.moduloTexto ?? "Ir al módulo"}</span>
                  <span>{rutaExiste(selected.template.moduloDestino) ? "→" : "🔒"}</span>
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                <p className="text-gray-600 text-[10px] mb-0.5">Vence</p>
                <p className="text-white text-xs font-medium">{new Date(selected.fechaVencimiento).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                <p className="text-gray-600 text-[10px] mb-0.5">Tiempo</p>
                <p className={`text-xs font-medium ${selected.estado === "VENCIDA" ? "text-red-400" : "text-white"}`}>
                  {selected.completadaAt ? "✓ Completada" : timeLeft(selected.fechaVencimiento)}
                </p>
              </div>
            </div>
            {selected.subtareasInstancia.length > 0 && (
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-2">Pasos</p>
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
            {selected.estado !== "COMPLETADA" && selected.estado !== "OMITIDA" && (
              <div className="flex gap-2">
                <button onClick={() => accion(selected.id, "completar")} disabled={accionando === selected.id}
                  className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400 text-xs font-semibold py-2 rounded-xl disabled:opacity-50">
                  ✓ Completar
                </button>
                <button onClick={() => accion(selected.id, "omitir")} disabled={accionando === selected.id}
                  className="px-3 bg-[#111] hover:bg-[#1a1a1a] border border-[#333] text-gray-500 text-xs py-2 rounded-xl">
                  Omitir
                </button>
              </div>
            )}
            {selected.estado === "COMPLETADA" && (
              <button onClick={() => accion(selected.id, "reabrir")}
                className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-[#333] text-gray-400 text-xs py-2 rounded-xl">
                ↩ Reabrir
              </button>
            )}
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-2">Notificar</p>
              <a href={`https://wa.me/?text=${encodeURIComponent(`[Mainstage Pro] Tarea pendiente: "${selected.template.nombre}" — ${selected.template.area.nombre}. mainstagepro.vercel.app/plan-trabajo`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-green-900/20 hover:bg-green-900/30 border border-green-900/30 text-green-400 text-xs font-medium transition-colors">
                <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
                </svg>
                Notificar por WhatsApp
              </a>
            </div>
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-2">
                Comentarios {selected.comentarios.length > 0 && `(${selected.comentarios.length})`}
              </p>
              <div className="space-y-2 mb-3">
                {selected.comentarios.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#222] border border-[#333] shrink-0 flex items-center justify-center text-[10px] text-gray-400">
                      {c.autor.name?.charAt(0)}
                    </div>
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
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TareaCard ────────────────────────────────────────────────────────────────
function TareaCard({ inst, selected, accionando, showResponsable, onSelect, onAccion, onIrModulo }: {
  inst: Instancia; selected: boolean; accionando: boolean; showResponsable: boolean;
  onSelect: () => void; onAccion: (t: "completar"|"reabrir"|"omitir"|"en_progreso") => void; onIrModulo: () => void;
}) {
  const cfg = ESTADO_CONFIG[inst.estado];
  const subtareasPct = inst.subtareasInstancia.length > 0
    ? Math.round(inst.subtareasInstancia.filter(s => s.completada).length / inst.subtareasInstancia.length * 100) : null;
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${selected ? "border-[#B3985B]/40 bg-[#B3985B]/5" : inst.estado === "COMPLETADA" ? "border-[#1a1a1a] bg-[#0d0d0d] opacity-60" : "border-[#1e1e1e] bg-[#111] hover:border-[#2a2a2a]"}`}
      onClick={onSelect}>
      {!inst.esEntregable && inst.estado !== "OMITIDA" && (
        <button onClick={e => { e.stopPropagation(); onAccion(inst.estado === "COMPLETADA" ? "reabrir" : "completar"); }}
          disabled={accionando}
          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${inst.estado === "COMPLETADA" ? "border-green-500 bg-green-500" : "border-gray-600 hover:border-green-500"}`}>
          {inst.estado === "COMPLETADA" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
      )}
      {inst.esEntregable && (
        <div className={`w-5 h-5 rounded-sm shrink-0 flex items-center justify-center text-[10px] ${inst.estado === "COMPLETADA" ? "bg-green-500/20 text-green-400" : "bg-purple-900/30 text-purple-400"}`}>📄</div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${inst.estado === "COMPLETADA" ? "line-through text-gray-600" : "text-white"}`}>
          {inst.template.nombre}
          {inst.estado === "VENCIDA" && <span className="text-red-400 text-[9px] ml-2">⚠ VENCIDA</span>}
        </p>
        {showResponsable && inst.responsable && (
          <p className="text-gray-600 text-[10px] mt-0.5">👤 {inst.responsable.name}</p>
        )}
        {subtareasPct !== null && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full">
              <div className="h-full rounded-full bg-[#B3985B]" style={{ width: `${subtareasPct}%` }} />
            </div>
            <span className="text-gray-600 text-[9px]">{subtareasPct}%</span>
          </div>
        )}
      </div>
      {inst.esEntregable && inst.template.moduloDestino && inst.estado !== "COMPLETADA" && (
        <button onClick={e => { e.stopPropagation(); onIrModulo(); }}
          disabled={!rutaExiste(inst.template.moduloDestino)}
          className={`shrink-0 text-[10px] px-2 py-1 rounded border ${rutaExiste(inst.template.moduloDestino) ? "border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10" : "border-[#333] text-gray-700 cursor-not-allowed"}`}
          title={!rutaExiste(inst.template.moduloDestino) ? "Módulo próximamente" : ""}>
          {inst.template.moduloTexto ?? "Ir →"}
        </button>
      )}
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg?.dot}`} />
    </div>
  );
}
