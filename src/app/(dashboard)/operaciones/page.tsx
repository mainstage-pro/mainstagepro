"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { TareaIntegrada } from "@/lib/tareas-integradas";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  area: string;
  estado: string;
  asignadoA: { id: string; name: string } | null;
  creadoPor:  { id: string; name: string } | null;
  iniciativa: { id: string; nombre: string; color: string | null } | null;
  iniciativaId: string | null;
  fechaVencimiento: string | null;
  fechaCompletada:  string | null;
  notas: string | null;
  createdAt: string;
}

interface Iniciativa {
  id: string;
  nombre: string;
  area: string;
  color: string | null;
  tareas: { id: string }[];
  _count: { tareas: number };
}

interface Usuario { id: string; name: string; role: string }

// ─── Configuraciones visuales ─────────────────────────────────────────────────

const AREAS: Record<string, { label: string; text: string; bg: string; borderL: string }> = {
  VENTAS:         { label: "Ventas",         text: "text-blue-400",   bg: "bg-blue-900/20",   borderL: "border-l-blue-600"   },
  ADMINISTRACION: { label: "Administración", text: "text-green-400",  bg: "bg-green-900/20",  borderL: "border-l-green-600"  },
  PRODUCCION:     { label: "Producción",     text: "text-purple-400", bg: "bg-purple-900/20", borderL: "border-l-purple-600" },
  MARKETING:      { label: "Marketing",      text: "text-pink-400",   bg: "bg-pink-900/20",   borderL: "border-l-pink-600"   },
  RRHH:           { label: "RR.HH.",         text: "text-teal-400",   bg: "bg-teal-900/20",   borderL: "border-l-teal-600"   },
  GENERAL:        { label: "General",        text: "text-[#888]",     bg: "bg-[#1a1a1a]",     borderL: "border-l-[#333]"     },
};

const PRIORIDADES: Record<string, { label: string; circle: string; text: string }> = {
  URGENTE: { label: "Urgente", circle: "border-red-500",    text: "text-red-400"    },
  ALTA:    { label: "Alta",    circle: "border-orange-400", text: "text-orange-400" },
  MEDIA:   { label: "Media",   circle: "border-[#444]",     text: "text-yellow-500" },
  BAJA:    { label: "Baja",    circle: "border-[#333]",     text: "text-[#555]"     },
};

const SEV_COLORS: Record<string, string> = {
  URGENTE: "text-red-400",
  ALTA:    "text-orange-400",
  MEDIA:   "text-yellow-500",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string | null): string | null {
  if (!iso) return null;
  const d    = new Date(iso);
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const man  = new Date(hoy); man.setDate(hoy.getDate() + 1);
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  if (d.toDateString() === man.toDateString()) return "Mañana";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function eHoy(iso: string | null)  {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

function eSemana(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso); const now = new Date(); now.setHours(0,0,0,0);
  return d >= now && d <= new Date(now.getTime() + 7 * 86400000);
}

function eVencida(iso: string | null, estado: string) {
  if (!iso || estado === "COMPLETADA" || estado === "CANCELADA") return false;
  const d = new Date(iso); const hoy = new Date(); hoy.setHours(0,0,0,0);
  return d < hoy;
}

function fmtMonto(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OperacionesPage() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [tareas,     setTareas]     = useState<Tarea[]>([]);
  const [integradas, setIntegradas] = useState<TareaIntegrada[]>([]);
  const [iniciativas,setIniciativas]= useState<Iniciativa[]>([]);
  const [usuarios,   setUsuarios]   = useState<Usuario[]>([]);
  const [loading,    setLoading]    = useState(true);

  // ── Vista ─────────────────────────────────────────────────────────────────
  const [seccion,   setSeccion]   = useState<"integrada" | "externa">("integrada");
  const [vistaInt,  setVistaInt]  = useState("todas");
  const [vistaExt,  setVistaExt]  = useState("hoy");

  // ── Quick add ─────────────────────────────────────────────────────────────
  const [quickTitulo,    setQuickTitulo]    = useState("");
  const [quickArea,      setQuickArea]      = useState("GENERAL");
  const [quickPrioridad, setQuickPrioridad] = useState("MEDIA");
  const [quickFecha,     setQuickFecha]     = useState("");
  const [quickIniciativa,setQuickIniciativa]= useState("");
  const [showQuickMore,  setShowQuickMore]  = useState(false);
  const [addingTarea,    setAddingTarea]    = useState(false);

  // ── Panel tarea ───────────────────────────────────────────────────────────
  const [panelTarea,  setPanelTarea]  = useState<Tarea | null>(null);
  const [panelFields, setPanelFields] = useState<Record<string, unknown>>({});
  const [panelSaving, setPanelSaving] = useState(false);

  // ── Modal iniciativa ──────────────────────────────────────────────────────
  const [showNuevaIni,    setShowNuevaIni]    = useState(false);
  const [iniForm, setIniForm] = useState({ nombre: "", area: "GENERAL", color: "" });
  const [savingIni, setSavingIni] = useState(false);

  // ─── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [tRes, iRes, initRes, uRes] = await Promise.all([
        fetch("/api/tareas").then(r => r.json()),
        fetch("/api/tareas/integradas").then(r => r.json()),
        fetch("/api/iniciativas").then(r => r.json()),
        fetch("/api/usuarios").then(r => r.json()),
      ]);
      setTareas(tRes.tareas ?? []);
      setIntegradas(iRes.tareas ?? []);
      setIniciativas(initRes.iniciativas ?? []);
      setUsuarios(uRes.usuarios ?? []);
    } finally {
      setLoading(false);
    }
  }

  // ─── CRUD tareas ──────────────────────────────────────────────────────────
  async function agregarTarea(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitulo.trim() || addingTarea) return;
    setAddingTarea(true);
    try {
      // Detectar si vistaExt es una iniciativa
      const iniciativaIdAuto = vistaExt !== "hoy" && vistaExt !== "semana" &&
        vistaExt !== "vencidas" && vistaExt !== "todas" ? vistaExt : null;

      const body: Record<string, unknown> = {
        titulo:    quickTitulo.trim(),
        area:      quickArea,
        prioridad: quickPrioridad,
        iniciativaId: quickIniciativa || iniciativaIdAuto || null,
      };
      if (quickFecha) body.fechaVencimiento = quickFecha;
      const res  = await fetch("/api/tareas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const { tarea } = await res.json();
      setTareas(prev => [tarea, ...prev]);
      setQuickTitulo(""); setQuickFecha(""); setQuickIniciativa("");
      setShowQuickMore(false);
    } finally {
      setAddingTarea(false);
    }
  }

  async function toggleCompletada(tarea: Tarea) {
    const nuevoEstado = tarea.estado === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    setTareas(prev => prev.map(t => t.id === tarea.id ? { ...t, estado: nuevoEstado } : t));
    await fetch(`/api/tareas/${tarea.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
  }

  async function guardarPanel() {
    if (!panelTarea || Object.keys(panelFields).length === 0) return;
    setPanelSaving(true);
    try {
      const res  = await fetch(`/api/tareas/${panelTarea.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(panelFields),
      });
      const { tarea } = await res.json();
      setTareas(prev => prev.map(t => t.id === tarea.id ? tarea : t));
      setPanelTarea(tarea);
      setPanelFields({});
    } finally {
      setPanelSaving(false);
    }
  }

  async function eliminarTarea(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    setTareas(prev => prev.filter(t => t.id !== id));
    if (panelTarea?.id === id) setPanelTarea(null);
  }

  function abrirPanel(t: Tarea) {
    setPanelTarea(t);
    setPanelFields({});
  }

  // ─── CRUD iniciativas ─────────────────────────────────────────────────────
  async function crearIniciativa(e: React.FormEvent) {
    e.preventDefault();
    if (!iniForm.nombre.trim() || savingIni) return;
    setSavingIni(true);
    try {
      const res = await fetch("/api/iniciativas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(iniForm),
      });
      const { iniciativa } = await res.json();
      setIniciativas(prev => [{ ...iniciativa, tareas: [], _count: { tareas: 0 } }, ...prev]);
      setShowNuevaIni(false);
      setIniForm({ nombre: "", area: "GENERAL", color: "" });
      // Cambiar vista a la nueva iniciativa
      setSeccion("externa");
      setVistaExt(iniciativa.id);
    } finally {
      setSavingIni(false);
    }
  }

  // ─── Filtros en-cliente ───────────────────────────────────────────────────
  const integradasFiltradas = useMemo(() => {
    if (vistaInt === "todas") return integradas;
    return integradas.filter(t => t.area === vistaInt);
  }, [integradas, vistaInt]);

  const tareasFiltradas = useMemo(() => {
    if (seccion !== "externa") return [];
    switch (vistaExt) {
      case "hoy":      return tareas.filter(t => t.estado !== "COMPLETADA" && eHoy(t.fechaVencimiento));
      case "semana":   return tareas.filter(t => t.estado !== "COMPLETADA" && eSemana(t.fechaVencimiento));
      case "vencidas": return tareas.filter(t => eVencida(t.fechaVencimiento, t.estado));
      case "todas":    return tareas.filter(t => t.estado !== "COMPLETADA");
      default:         return tareas.filter(t => t.iniciativaId === vistaExt && t.estado !== "COMPLETADA");
    }
  }, [tareas, vistaExt, seccion]);

  // ─── Contadores para badges ───────────────────────────────────────────────
  const cntInt = useMemo(() => {
    const m: Record<string, number> = { todas: integradas.length };
    for (const t of integradas) m[t.area] = (m[t.area] ?? 0) + 1;
    return m;
  }, [integradas]);

  const cntHoy     = useMemo(() => tareas.filter(t => t.estado !== "COMPLETADA" && eHoy(t.fechaVencimiento)).length, [tareas]);
  const cntSemana  = useMemo(() => tareas.filter(t => t.estado !== "COMPLETADA" && eSemana(t.fechaVencimiento)).length, [tareas]);
  const cntVenc    = useMemo(() => tareas.filter(t => eVencida(t.fechaVencimiento, t.estado)).length, [tareas]);
  const cntTodas   = useMemo(() => tareas.filter(t => t.estado !== "COMPLETADA").length, [tareas]);

  // ─── Helpers nav ─────────────────────────────────────────────────────────
  function navIntBtn(key: string, label: string, count: number) {
    const active = seccion === "integrada" && vistaInt === key;
    return (
      <button key={key}
        onClick={() => { setSeccion("integrada"); setVistaInt(key); }}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
          active ? "bg-[#1a1a1a] text-white" : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
        }`}
      >
        <span>{label}</span>
        {count > 0 && <span className={`text-[11px] ${active ? "text-[#888]" : "text-[#444]"}`}>{count}</span>}
      </button>
    );
  }

  function navExtBtn(key: string, label: string, count: number, warn = false) {
    const active = seccion === "externa" && vistaExt === key;
    return (
      <button key={key}
        onClick={() => { setSeccion("externa"); setVistaExt(key); }}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
          active ? "bg-[#1a1a1a] text-white" : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
        }`}
      >
        <span>{label}</span>
        {count > 0 && (
          <span className={`text-[11px] font-medium ${warn ? "text-red-400" : active ? "text-[#888]" : "text-[#444]"}`}>
            {count}
          </span>
        )}
      </button>
    );
  }

  // ─── Vista título ─────────────────────────────────────────────────────────
  const vistaTitle = useMemo(() => {
    if (seccion === "integrada") {
      if (vistaInt === "todas") return `Operación integrada · ${integradas.length} alertas`;
      return `${AREAS[vistaInt]?.label ?? vistaInt} · ${cntInt[vistaInt] ?? 0} alertas`;
    }
    const ini = iniciativas.find(i => i.id === vistaExt);
    if (ini) return ini.nombre;
    return { hoy: "Hoy", semana: "Esta semana", vencidas: "Vencidas", todas: "Todas las tareas" }[vistaExt] ?? vistaExt;
  }, [seccion, vistaInt, vistaExt, integradas.length, cntInt, iniciativas]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-[#0d0d0d]">

      {/* ══ Left Nav (desktop) ══════════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-52 border-r border-[#1a1a1a] shrink-0 py-5 px-2 gap-1">

        {/* INTEGRADA */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a3a3a] px-3 mb-1">
          Integrada
        </p>
        {navIntBtn("todas",         "Todas",          cntInt.todas ?? 0)}
        {navIntBtn("VENTAS",        "Ventas",          cntInt.VENTAS ?? 0)}
        {navIntBtn("ADMINISTRACION","Administración",  cntInt.ADMINISTRACION ?? 0)}
        {navIntBtn("PRODUCCION",    "Producción",      cntInt.PRODUCCION ?? 0)}
        {navIntBtn("MARKETING",     "Marketing",       cntInt.MARKETING ?? 0)}
        {navIntBtn("RRHH",          "RR.HH.",          cntInt.RRHH ?? 0)}

        <div className="border-t border-[#1a1a1a] my-3" />

        {/* EXTERNA */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a3a3a] px-3 mb-1">
          Externa
        </p>
        {navExtBtn("hoy",      "Hoy",           cntHoy)}
        {navExtBtn("semana",   "Esta semana",   cntSemana)}
        {navExtBtn("vencidas", "Vencidas",      cntVenc, true)}
        {navExtBtn("todas",    "Todas",         cntTodas)}

        {/* Iniciativas */}
        {iniciativas.length > 0 && (
          <>
            <div className="border-t border-[#1a1a1a] my-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a3a3a] px-3 mb-1">
              Iniciativas
            </p>
            {iniciativas.map(ini => {
              const active = seccion === "externa" && vistaExt === ini.id;
              return (
                <button key={ini.id}
                  onClick={() => { setSeccion("externa"); setVistaExt(ini.id); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-left ${
                    active ? "bg-[#1a1a1a] text-white" : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  {ini.color && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ini.color }} />
                  )}
                  <span className="flex-1 truncate text-xs">{ini.nombre}</span>
                  {ini.tareas.length > 0 && (
                    <span className="text-[11px] text-[#444] shrink-0">{ini.tareas.length}</span>
                  )}
                </button>
              );
            })}
          </>
        )}

        {/* Nueva iniciativa */}
        <button
          onClick={() => setShowNuevaIni(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-[#444] hover:text-[#B3985B] transition-colors mt-1"
        >
          <span>+</span>
          <span className="text-xs">Nueva iniciativa</span>
        </button>
      </aside>

      {/* ══ Main ════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Mobile nav strip */}
        <div className="md:hidden flex gap-1 px-4 py-3 border-b border-[#1a1a1a] overflow-x-auto">
          {[
            { key: "int-todas",    label: "Integrada", s: "integrada" as const, v: "todas" },
            { key: "ext-hoy",      label: "Hoy",       s: "externa"   as const, v: "hoy"   },
            { key: "ext-semana",   label: "Semana",    s: "externa"   as const, v: "semana"  },
            { key: "ext-vencidas", label: "Vencidas",  s: "externa"   as const, v: "vencidas"},
            { key: "ext-todas",    label: "Todas",     s: "externa"   as const, v: "todas"   },
          ].map(item => {
            const active = seccion === item.s && (item.s === "integrada" ? vistaInt === item.v : vistaExt === item.v);
            return (
              <button key={item.key}
                onClick={() => { setSeccion(item.s); if (item.s === "integrada") setVistaInt(item.v); else setVistaExt(item.v); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active ? "bg-[#B3985B] text-black" : "bg-[#1a1a1a] text-[#888]"
                }`}
              >
                {item.label}
                {item.key === "ext-vencidas" && cntVenc > 0 && (
                  <span className="ml-1 text-red-400">{cntVenc}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 px-4 md:px-6 py-5 max-w-3xl w-full mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-white font-semibold text-base">{vistaTitle}</h1>
              {seccion === "integrada" && integradas.length > 0 && (
                <p className="text-[#555] text-xs mt-0.5">Solo lectura · resuelve cada alerta en su módulo de origen</p>
              )}
            </div>
            {seccion === "externa" && (
              <button
                onClick={() => setShowNuevaIni(true)}
                className="hidden md:block text-xs text-[#555] hover:text-[#B3985B] transition-colors"
              >
                + Iniciativa
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-11 bg-[#111] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : seccion === "integrada" ? (

            /* ══ VISTA INTEGRADA ══════════════════════════════════════════ */
            <div>
              {integradasFiltradas.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-[#555] text-sm">Sin alertas activas. El sistema está al día.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {integradasFiltradas.map(t => (
                    <Link
                      key={t.id}
                      href={t.href}
                      className={`flex items-start gap-3 px-4 py-3 rounded-lg border-l-2 bg-[#0a0a0a] hover:bg-[#111] transition-colors group ${AREAS[t.area]?.borderL ?? "border-l-[#333]"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {t.severidad !== "MEDIA" && (
                            <span className={`text-[10px] font-bold ${SEV_COLORS[t.severidad]}`}>
                              {t.severidad}
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${AREAS[t.area]?.text ?? ""} ${AREAS[t.area]?.bg ?? ""}`}>
                            {AREAS[t.area]?.label ?? t.area}
                          </span>
                          <span className="text-[10px] text-[#444]">{t.etiqueta}</span>
                        </div>
                        <p className="text-sm text-white leading-5">{t.titulo}</p>
                        {t.descripcion && (
                          <p className="text-xs text-[#555] mt-0.5 truncate">{t.descripcion}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {t.monto !== undefined && (
                            <span className="text-xs text-[#B3985B]">{fmtMonto(t.monto)}</span>
                          )}
                          {(t.diasVencido ?? 0) > 0 && (
                            <span className={`text-[10px] ${(t.diasVencido ?? 0) >= 7 ? "text-red-400" : "text-orange-400"}`}>
                              Vencido hace {t.diasVencido} día{t.diasVencido !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[#444] group-hover:text-[#888] transition-colors text-sm mt-1 shrink-0">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          ) : (

            /* ══ VISTA EXTERNA ════════════════════════════════════════════ */
            <div>
              {/* Quick add */}
              <form onSubmit={agregarTarea} className="mb-4">
                <div className="flex items-center gap-2 bg-[#111] border border-[#222] hover:border-[#333] rounded-xl px-3 py-2.5 transition-colors focus-within:border-[#B3985B]/40">
                  {/* Circle placeholder */}
                  <div className="w-4 h-4 rounded-full border-2 border-[#333] shrink-0" />
                  <input
                    value={quickTitulo}
                    onChange={e => setQuickTitulo(e.target.value)}
                    onFocus={() => setShowQuickMore(true)}
                    placeholder="Agregar tarea..."
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-[#444]"
                  />
                  {quickTitulo.trim() && (
                    <button type="submit" disabled={addingTarea}
                      className="text-[10px] text-[#B3985B] font-semibold hover:text-white transition-colors shrink-0 disabled:opacity-40"
                    >
                      {addingTarea ? "..." : "Agregar"}
                    </button>
                  )}
                </div>

                {/* Quick more options */}
                {showQuickMore && (
                  <div className="mt-2 flex flex-wrap gap-2 px-1">
                    <select value={quickPrioridad} onChange={e => setQuickPrioridad(e.target.value)}
                      className="text-xs bg-[#111] border border-[#222] text-[#888] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#333]">
                      <option value="URGENTE">Urgente</option>
                      <option value="ALTA">Alta</option>
                      <option value="MEDIA">Media</option>
                      <option value="BAJA">Baja</option>
                    </select>
                    <select value={quickArea} onChange={e => setQuickArea(e.target.value)}
                      className="text-xs bg-[#111] border border-[#222] text-[#888] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#333]">
                      {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <input type="date" value={quickFecha} onChange={e => setQuickFecha(e.target.value)}
                      className="text-xs bg-[#111] border border-[#222] text-[#888] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#333]" />
                    {iniciativas.length > 0 && (
                      <select value={quickIniciativa} onChange={e => setQuickIniciativa(e.target.value)}
                        className="text-xs bg-[#111] border border-[#222] text-[#888] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#333]">
                        <option value="">Sin iniciativa</option>
                        {iniciativas.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                      </select>
                    )}
                    <button type="button" onClick={() => setShowQuickMore(false)}
                      className="text-xs text-[#444] hover:text-[#888] px-1">✕</button>
                  </div>
                )}
              </form>

              {/* Task list */}
              {tareasFiltradas.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[#444] text-sm">Sin tareas para esta vista.</p>
                  <p className="text-[#333] text-xs mt-1">Usa el campo de arriba para agregar una.</p>
                </div>
              ) : (
                <div className="space-y-px">
                  {tareasFiltradas.map(t => {
                    const pCfg     = PRIORIDADES[t.prioridad] ?? PRIORIDADES.MEDIA;
                    const aCfg     = AREAS[t.area] ?? AREAS.GENERAL;
                    const fechaTxt = fmtFecha(t.fechaVencimiento);
                    const vencida  = eVencida(t.fechaVencimiento, t.estado);
                    const done     = t.estado === "COMPLETADA";
                    return (
                      <div key={t.id}
                        className="group flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[#111] transition-colors"
                      >
                        {/* Circle checkbox */}
                        <button
                          onClick={() => toggleCompletada(t)}
                          className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                            done ? "bg-[#B3985B] border-[#B3985B]" : `${pCfg.circle} hover:border-[#B3985B]`
                          }`}
                        >
                          {done && (
                            <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => abrirPanel(t)}>
                          <p className={`text-sm leading-5 ${done ? "line-through text-[#444]" : "text-white"}`}>
                            {t.titulo}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {t.prioridad !== "MEDIA" && t.prioridad !== "BAJA" && (
                              <span className={`text-[10px] font-semibold ${pCfg.text}`}>{pCfg.label}</span>
                            )}
                            {t.area !== "GENERAL" && (
                              <span className={`text-[10px] ${aCfg.text}`}>{aCfg.label}</span>
                            )}
                            {t.iniciativa && (
                              <span className="text-[10px] text-[#444]">· {t.iniciativa.nombre}</span>
                            )}
                            {t.asignadoA && (
                              <span className="text-[10px] text-[#444]">→ {t.asignadoA.name}</span>
                            )}
                          </div>
                        </div>

                        {/* Date + actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {fechaTxt && (
                            <span className={`text-[11px] ${vencida ? "text-red-400" : eHoy(t.fechaVencimiento) ? "text-[#B3985B]" : "text-[#555]"}`}>
                              {fechaTxt}
                            </span>
                          )}
                          <button
                            onClick={() => eliminarTarea(t.id)}
                            className="opacity-0 group-hover:opacity-100 text-[#333] hover:text-red-400 transition-all text-lg leading-none"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ Panel lateral — detalle de tarea ══════════════════════════════════ */}
      {panelTarea && (
        <>
          <div className="fixed inset-0 z-40 md:hidden bg-black/50" onClick={() => setPanelTarea(null)} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full md:w-[380px] bg-[#0d0d0d] border-l border-[#1a1a1a] flex flex-col shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCompletada(panelTarea)}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    panelTarea.estado === "COMPLETADA"
                      ? "bg-[#B3985B] border-[#B3985B]"
                      : `${PRIORIDADES[panelTarea.prioridad]?.circle ?? "border-[#444]"} hover:border-[#B3985B]`
                  }`}
                >
                  {panelTarea.estado === "COMPLETADA" && (
                    <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-[#555] uppercase tracking-wider">Tarea</span>
              </div>
              <div className="flex items-center gap-3">
                {panelSaving && <span className="text-[10px] text-[#555]">Guardando…</span>}
                <button onClick={() => setPanelTarea(null)}
                  className="text-[#555] hover:text-white text-lg transition-colors">✕</button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Título */}
              <textarea
                key={panelTarea.id + "-titulo"}
                defaultValue={panelTarea.titulo}
                onBlur={e => {
                  if (e.target.value.trim() && e.target.value !== panelTarea.titulo) {
                    setPanelFields(p => ({ ...p, titulo: e.target.value.trim() }));
                    setTimeout(guardarPanel, 0);
                  }
                }}
                className="w-full text-base font-semibold text-white bg-transparent outline-none resize-none leading-snug"
                rows={2}
              />

              {/* Descripción */}
              <textarea
                key={panelTarea.id + "-desc"}
                defaultValue={panelTarea.descripcion ?? ""}
                onBlur={e => {
                  const val = e.target.value || null;
                  if (val !== panelTarea.descripcion) {
                    setPanelFields(p => ({ ...p, descripcion: val }));
                    setTimeout(guardarPanel, 0);
                  }
                }}
                placeholder="Agregar descripción…"
                className="w-full text-sm text-[#888] bg-transparent outline-none resize-none placeholder:text-[#333]"
                rows={3}
              />

              {/* Fields */}
              <div className="space-y-2.5">
                {[
                  {
                    label: "Prioridad",
                    content: (
                      <select
                        key={panelTarea.id + "-prio"}
                        defaultValue={panelTarea.prioridad}
                        onBlur={e => { setPanelFields(p => ({ ...p, prioridad: e.target.value })); setTimeout(guardarPanel, 0); }}
                        className="flex-1 bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#333]"
                      >
                        <option value="URGENTE">Urgente</option>
                        <option value="ALTA">Alta</option>
                        <option value="MEDIA">Media</option>
                        <option value="BAJA">Baja</option>
                      </select>
                    ),
                  },
                  {
                    label: "Área",
                    content: (
                      <select
                        key={panelTarea.id + "-area"}
                        defaultValue={panelTarea.area}
                        onBlur={e => { setPanelFields(p => ({ ...p, area: e.target.value })); setTimeout(guardarPanel, 0); }}
                        className="flex-1 bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#333]"
                      >
                        {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    ),
                  },
                  {
                    label: "Asignado a",
                    content: (
                      <select
                        key={panelTarea.id + "-asig"}
                        defaultValue={panelTarea.asignadoA?.id ?? ""}
                        onBlur={e => { setPanelFields(p => ({ ...p, asignadoAId: e.target.value || null })); setTimeout(guardarPanel, 0); }}
                        className="flex-1 bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#333]"
                      >
                        <option value="">Sin asignar</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    ),
                  },
                  {
                    label: "Vencimiento",
                    content: (
                      <input type="date"
                        key={panelTarea.id + "-fecha"}
                        defaultValue={panelTarea.fechaVencimiento?.slice(0, 10) ?? ""}
                        onBlur={e => { setPanelFields(p => ({ ...p, fechaVencimiento: e.target.value || null })); setTimeout(guardarPanel, 0); }}
                        className="flex-1 bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#333]"
                      />
                    ),
                  },
                  {
                    label: "Iniciativa",
                    content: (
                      <select
                        key={panelTarea.id + "-ini"}
                        defaultValue={panelTarea.iniciativaId ?? ""}
                        onBlur={e => { setPanelFields(p => ({ ...p, iniciativaId: e.target.value || null })); setTimeout(guardarPanel, 0); }}
                        className="flex-1 bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#333]"
                      >
                        <option value="">Sin iniciativa</option>
                        {iniciativas.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                      </select>
                    ),
                  },
                ].map(({ label, content }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-[#444] w-24 shrink-0">{label}</span>
                    {content}
                  </div>
                ))}
              </div>

              {/* Notas */}
              <div>
                <p className="text-xs text-[#444] mb-2">Notas</p>
                <textarea
                  key={panelTarea.id + "-notas"}
                  defaultValue={panelTarea.notas ?? ""}
                  onBlur={e => {
                    const val = e.target.value || null;
                    if (val !== panelTarea.notas) {
                      setPanelFields(p => ({ ...p, notas: val }));
                      setTimeout(guardarPanel, 0);
                    }
                  }}
                  placeholder="Notas adicionales…"
                  rows={4}
                  className="w-full text-sm text-[#888] bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 outline-none resize-none focus:border-[#222] placeholder:text-[#333]"
                />
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-5 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
              <span className="text-[10px] text-[#333]">
                {panelTarea.creadoPor ? `Por ${panelTarea.creadoPor.name}` : ""}
              </span>
              <button
                onClick={() => eliminarTarea(panelTarea.id)}
                className="text-xs text-[#555] hover:text-red-400 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ══ Modal nueva iniciativa ═════════════════════════════════════════════ */}
      {showNuevaIni && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowNuevaIni(false)} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-white font-semibold mb-4">Nueva iniciativa</h3>
            <form onSubmit={crearIniciativa} className="space-y-3">
              <input
                value={iniForm.nombre}
                onChange={e => setIniForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre de la iniciativa *"
                className="w-full bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
                autoFocus
              />
              <select
                value={iniForm.area}
                onChange={e => setIniForm(p => ({ ...p, area: e.target.value }))}
                className="w-full bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
              >
                {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#555]">Color</span>
                <input type="color" value={iniForm.color || "#B3985B"}
                  onChange={e => setIniForm(p => ({ ...p, color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border border-[#333] bg-transparent"
                />
                <button type="button" onClick={() => setIniForm(p => ({ ...p, color: "" }))}
                  className="text-xs text-[#444] hover:text-[#888]">Sin color</button>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowNuevaIni(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#222] text-[#888] text-sm hover:text-white transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={savingIni || !iniForm.nombre.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold disabled:opacity-40">
                  {savingIni ? "Creando…" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
