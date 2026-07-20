"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { useToast } from "@/components/Toast";
import TaskItem, { type TareaItem } from "@/app/(dashboard)/operaciones/components/TaskItem";
import TaskPanel, { type TareaDetalle } from "@/app/(dashboard)/operaciones/components/TaskPanel";
import QuickAdd from "@/app/(dashboard)/operaciones/components/QuickAdd";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getSemanaISO(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function fmtWeekRange(semana: number, anio: number): string {
  const jan4 = new Date(Date.UTC(anio, 0, 4));
  const start = new Date(jan4);
  start.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (semana - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function fmtFechaBadge(iso: string | null): { label: string; cls: string } | null {
  if (!iso) return null
  const d   = new Date(iso.substring(0, 10) + 'T00:00:00')
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const man = new Date(hoy); man.setDate(hoy.getDate() + 1)
  const sem = new Date(hoy); sem.setDate(hoy.getDate() + 7)
  if (d < hoy)  return { label: d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }), cls: 'text-red-400 bg-red-950/30' }
  if (d < man)  return { label: 'Hoy',    cls: 'text-emerald-400 bg-emerald-950/30' }
  if (d < new Date(man.getTime() + 86400000)) return { label: 'Mañana', cls: 'text-yellow-400 bg-yellow-950/20' }
  if (d <= sem) return { label: d.toLocaleDateString('es-MX', { weekday: 'short' }), cls: 'text-[#777] bg-[#111]' }
  return { label: d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }), cls: 'text-[#666] bg-[#0f0f0f]' }
}

const FRASES = [
  "La excelencia no es un acto, es un hábito.",
  "Cada reto que superamos juntos nos hace un equipo más fuerte.",
  "La mejora continua empieza con la honestidad de reconocer lo que podemos hacer mejor.",
  "Detrás de cada gran evento hay un equipo que planeó, ejecutó y aprendió.",
  "Reportar es reflexionar. Y reflexionar es crecer.",
  "Una semana bien analizada vale más que un mes de trabajo sin dirección.",
  "El equipo que comunica bien, rinde bien.",
  "Comprometerse con mejoras personales es el primer paso para elevar al equipo.",
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Incidencia { que: string; causa: string; propuesta: string; }
interface SessionInfo { id: string; name: string; area: string | null; }

type CompromisoPlan = {
  id: string
  templateNombre: string
  impacto: string
  areaNombre: string
  areaColor: string
  fechaVencimiento: string
}

type AccionTarea = {
  accion: 'completada' | 'reagendada' | 'pendiente'
  fechaComprometida?: string
  nota?: string
}

type UsuarioOpt = { id: string; name: string }
interface ProyectoOpt { id: string; nombre: string; color: string | null }
interface IniciativaOpt { id: string; nombre: string; color: string | null }

// ─── Section component ────────────────────────────────────────────────────────

function Section({ num, title, hint, children }: {
  num: number; title: string; hint: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
        <div className="flex items-start gap-3">
          <span className="w-7 h-7 rounded-lg bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {num}
          </span>
          <div>
            <h2 className="text-white font-semibold text-sm">{title}</h2>
            <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{hint}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

const ta = "w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none transition-colors placeholder:text-gray-700 leading-relaxed";

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReporteSemanalLandingPage() {
  const router = useRouter();
  const toast = useToast();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [privacyDismissed, setPrivacyDismissed] = useState(false);

  const semana = getSemanaISO();
  const anio = new Date().getFullYear();
  const frase = FRASES[(semana - 1) % FRASES.length];
  const rango = fmtWeekRange(semana, anio);

  const [logros, setLogros] = useState("");
  const [incidencias, setIncidencias] = useState<Incidencia[]>([{ que: "", causa: "", propuesta: "" }]);
  const [mejoras, setMejoras] = useState("");
  const [compromisos, setCompromisos] = useState("");
  const [sugerencias, setSugerencias] = useState("");
  const [bienestar, setBienestar] = useState(7);

  // — Tareas pendientes (idéntico a operaciones) —
  const [tareasOp, setTareasOp]                       = useState<TareaItem[]>([])
  const [loadingPendientes, setLoadingPendientes]     = useState(false)
  const [compPlan, setCompPlan]                       = useState<CompromisoPlan[]>([])
  const [accionesPlan, setAccionesPlan]               = useState<Record<string, AccionTarea>>({})
  const [reagendarFechaPlan, setReagendarFechaPlan]   = useState<Record<string, string>>({})
  const [modoArranque, setModoArranque]               = useState(false)

  // — TaskPanel —
  const [selectedTask, setSelectedTask]   = useState<TareaDetalle | null>(null)
  const [loadingPanel, setLoadingPanel]   = useState(false)

  // — Próxima semana (QuickAdd real) —
  const [tareasProxima, setTareasProxima] = useState<TareaItem[]>([])

  // — Recursos —
  const [usuarios, setUsuarios]         = useState<UsuarioOpt[]>([])
  const [proyectos, setProyectos]       = useState<ProyectoOpt[]>([])
  const [iniciativas, setIniciativas]   = useState<IniciativaOpt[]>([])

  // Unused ref retained for potential future use
  const _tareaRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Sesión
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.id) {
          setSession({ id: d.id, name: d.name, area: d.area ?? null });
          setModoArranque(d.modoArranque ?? false);
        } else router.push(`/login?redirect=/formularios/reporte-semanal/nuevo`);
      })
      .catch(() => router.push(`/login?redirect=/formularios/reporte-semanal/nuevo`));
  }, []); // eslint-disable-line

  // 2. Pendientes + recursos (cuando session está lista)
  useEffect(() => {
    if (!session) return
    // Siempre cargar tareas pendientes del módulo de tareas (tareasOp)
    // compPlan se carga también pero su sección JSX está gateada por modoArranque
    setLoadingPendientes(true)
    fetch('/api/formularios/reporte-semanal/pendientes')
      .then(r => r.json())
      .then(d => {
        setTareasOp(d.tareasOperaciones ?? [])
        setCompPlan(d.compromisosPlan ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingPendientes(false))
    // Recursos para TaskPanel y QuickAdd
    Promise.all([
      fetch('/api/usuarios').then(r => r.json()),
      fetch('/api/operaciones/proyectos').then(r => r.json()),
      fetch('/api/iniciativas').then(r => r.json()),
    ]).then(([u, p, i]) => {
      setUsuarios(u.usuarios ?? [])
      setProyectos(p.proyectos ?? [])
      // /api/iniciativas returns array directly
      setIniciativas(Array.isArray(i) ? i : (i.iniciativas ?? []))
    }).catch(() => {})
  }, [session])

  function addIncidencia() { setIncidencias((p) => [...p, { que: "", causa: "", propuesta: "" }]); }
  function updateInc(i: number, f: keyof Incidencia, v: string) {
    setIncidencias((p) => p.map((inc, idx) => idx === i ? { ...inc, [f]: v } : inc));
  }
  function removeInc(i: number) {
    if (incidencias.length <= 1) return;
    setIncidencias((p) => p.filter((_, idx) => idx !== i));
  }

  // ── Compromisos Plan ──
  function handleCompletarPlan(id: string) {
    setAccionesPlan(prev => ({ ...prev, [id]: { accion: 'completada' } }))
    fetch(`/api/plan-trabajo/instancias/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'COMPLETADA' }),
    }).catch(() => {})
  }

  function handleReagendarPlan(id: string) {
    setAccionesPlan(prev => ({
      ...prev,
      [id]: { accion: prev[id]?.accion === 'reagendada' ? 'pendiente' : 'reagendada' }
    }))
  }

  function handleFechaReagendarPlan(id: string, fecha: string) {
    setReagendarFechaPlan(prev => ({ ...prev, [id]: fecha }))
    setAccionesPlan(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), accion: 'reagendada', fechaComprometida: fecha } }))
  }

  // ── Handlers de TaskItem (operaciones style) ──

  async function handleSelectTask(id: string) {
    setLoadingPanel(true)
    try {
      const res = await fetch(`/api/tareas/${id}`)
      const data = await res.json()
      setSelectedTask((data.tarea ?? data) as TareaDetalle)
    } catch {}
    finally { setLoadingPanel(false) }
  }

  async function handleCompleteTask(id: string) {
    await fetch(`/api/tareas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'COMPLETADA' }),
    })
    setTareasOp(prev => prev.filter(t => t.id !== id))
    setTareasProxima(prev => prev.filter(t => t.id !== id))
    if (selectedTask?.id === id) setSelectedTask(null)
  }

  async function handleDeleteTask(id: string) {
    await fetch(`/api/tareas/${id}`, { method: 'DELETE' })
    setTareasOp(prev => prev.filter(t => t.id !== id))
    setTareasProxima(prev => prev.filter(t => t.id !== id))
    if (selectedTask?.id === id) setSelectedTask(null)
  }

  async function handleDateChange(id: string, value: string) {
    await fetch(`/api/tareas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: value || null }),
    })
    const updater = (t: TareaItem) => t.id === id ? { ...t, fecha: value } : t
    setTareasOp(prev => prev.map(updater))
    setTareasProxima(prev => prev.map(updater))
    if (selectedTask?.id === id) setSelectedTask(prev => prev ? { ...prev, fecha: value } : prev)
  }

  async function handlePriorityChange(id: string, prioridad: string) {
    await fetch(`/api/tareas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prioridad }),
    })
    const updater = (t: TareaItem) => t.id === id ? { ...t, prioridad } : t
    setTareasOp(prev => prev.map(updater))
    setTareasProxima(prev => prev.map(updater))
  }

  async function handleAssign(id: string, userId: string | null) {
    await fetch(`/api/tareas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asignadoAId: userId }),
    })
    const asignadoA = userId ? (usuarios.find(u => u.id === userId) ?? null) : null
    const updater = (t: TareaItem) => t.id === id ? { ...t, asignadoA } : t
    setTareasOp(prev => prev.map(updater))
    setTareasProxima(prev => prev.map(updater))
  }

  async function handleProjectChange(id: string, proyectoId: string | null) {
    await fetch(`/api/tareas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyectoTareaId: proyectoId }),
    })
    const pt = proyectoId ? (proyectos.find(p => p.id === proyectoId) ?? null) : null
    const updater = (t: TareaItem) => t.id === id ? { ...t, proyectoTarea: pt } : t
    setTareasOp(prev => prev.map(updater))
    setTareasProxima(prev => prev.map(updater))
  }

  async function handleSaveTask(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/tareas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (data.tarea || data.id) {
      const updated = data.tarea ?? data
      setSelectedTask(updated as TareaDetalle)
      const syncItem = (t: TareaItem) => t.id === id ? {
        ...t,
        titulo:           updated.titulo ?? t.titulo,
        descripcion:      updated.descripcion ?? t.descripcion,
        prioridad:        updated.prioridad ?? t.prioridad,
        fecha:            updated.fecha ?? t.fecha,
        
        asignadoA:        updated.asignadoA ?? t.asignadoA,
        proyectoTarea:    updated.proyectoTarea ?? t.proyectoTarea,
      } : t
      setTareasOp(prev => prev.map(syncItem))
      setTareasProxima(prev => prev.map(syncItem))
    }
  }

  async function handleAddSubtarea(parentId: string, data: { titulo: string; fecha: string | null; prioridad: string }) {
    await fetch('/api/tareas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, parentId, area: 'GENERAL' }),
    })
    handleSelectTask(parentId)
  }

  async function handleCompleteSubtarea(id: string) {
    await fetch(`/api/tareas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'COMPLETADA' }),
    })
    if (selectedTask) handleSelectTask(selectedTask.id)
  }

  async function handleDeleteSubtarea(id: string) {
    await fetch(`/api/tareas/${id}`, { method: 'DELETE' })
    if (selectedTask) handleSelectTask(selectedTask.id)
  }

  // QuickAdd: crear tarea en DB inmediatamente
  async function handleAddProximaTarea(tareaData: {
    titulo: string; descripcion: string | null; fecha: string | null;
    fechaVencimiento: string | null; prioridad: string; area: string;
    recurrencia: string | null; proyectoTareaId: string | null;
    seccionId: string | null; parentId: string | null;
    asignadoAId: string | null;
  }) {
    if (!session) return
    const body = {
      ...tareaData,
      asignadoAId: tareaData.asignadoAId ?? session.id, // auto-asignada al usuario del reporte si no hay asignado
    }
    const res = await fetch('/api/tareas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    const tarea = data.tarea ?? data
    if (tarea?.id) {
      const item: TareaItem = {
        id: tarea.id,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion ?? null,
        prioridad: tarea.prioridad,
        area: tarea.area,
        estado: tarea.estado,
        fecha: tarea.fecha ?? null,
        
        recurrencia: tarea.recurrencia ?? null,
        proyectoTarea: tarea.proyectoTarea ?? null,
        seccion: tarea.seccion ?? null,
        asignadoA: tarea.asignadoA ?? null,
        juntaOrigenId: null,
        juntaOrigen: null,
        _count: tarea._count ?? { subtareas: 0, comentarios: 0, archivos: 0 },
        createdAt: tarea.createdAt ?? new Date().toISOString(),
        fechaCompletada: null,
      }
      setTareasProxima(prev => [...prev, item])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { toast.error("Debes estar autenticado"); return; }
    if (!logros.trim()) { toast.error("Por favor completa los logros de la semana"); return; }
    setEnviando(true);
    try {
      const incidenciasLimpias = incidencias.filter((i) => i.que.trim() || i.causa.trim() || i.propuesta.trim());
      const res = await fetch("/api/formularios/reporte-semanal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semana, anio, logros,
          tareas: tareasProxima.map(t => ({
            tareaId: t.id,
            titulo: t.titulo,
            
          })),
          incidencias: incidenciasLimpias, mejoras, compromisos, sugerencias, bienestar,
          tareasOperaciones: tareasOp.map(t => ({ tareaId: t.id, titulo: t.titulo, accion: 'pendiente' })),
          compromisosPlan: compPlan.map(c => ({
            instanciaId: c.id, templateNombre: c.templateNombre, areaNombre: c.areaNombre,
            ...(accionesPlan[c.id] ?? { accion: 'pendiente' }),
            fechaComprometida: reagendarFechaPlan[c.id] ?? undefined,
          })),
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al enviar el reporte"); return; }
      setEnviado(true);
    } catch { toast.error("Error de conexión al enviar"); }
    finally { setEnviando(false); }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#B3985B] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // ── Enviado ──────────────────────────────────────────────────────────────────

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-5">

          {/* ── Confirmación ── */}
          <div className="text-center">
            <div className="w-20 h-20 bg-[#B3985B]/10 border border-[#B3985B]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 strokeWidth={1.75} className="w-9 h-9 text-[#B3985B]" />
            </div>
            <h1 className="text-white font-bold text-xl mb-2">¡Reporte enviado!</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-2">
              Gracias, <span className="text-white font-semibold">{session.name}</span>. Tu reporte de la semana {semana} fue recibido correctamente.
            </p>
            <p className="text-gray-700 text-xs">Solo Dirección tiene acceso a esta información.</p>
          </div>

          {/* ── Próximo paso: revisar tareas ── */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  <path d="M8 14h.01M12 14h4M8 18h.01M12 18h4"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Tu próximo paso: tareas pendientes</p>
                <p className="text-gray-600 text-[11px] mt-0.5">Antes de cerrar, revisa tus compromisos del día</p>
              </div>
            </div>

            <p className="text-gray-500 text-xs leading-relaxed mb-5">
              Mantener tus tareas actualizadas permite que el equipo coordine sin fricciones, que no haya bloqueos silenciosos y que Dirección tenga visibilidad real del avance de cada área. <span className="text-gray-400">Un minuto de orden ahora ahorra horas de confusión después.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href="/plan-trabajo/hoy"
                className="flex-1 flex items-center justify-center gap-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold py-3 rounded-xl transition-all text-sm shadow-lg shadow-[#B3985B]/10 hover:shadow-[#B3985B]/20"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Ver mis tareas de hoy
              </a>
              <a
                href="/"
                className="flex-1 flex items-center justify-center gap-2 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#3a3a3a] text-gray-300 hover:text-white font-medium py-3 rounded-xl transition-all text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                </svg>
                Ir al Dashboard
              </a>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="w-6 h-6 rounded-md bg-[#111] border border-[#2a2a2a] flex items-center justify-center">
              <span className="text-[#B3985B] text-xs font-bold">M</span>
            </div>
            <span className="text-gray-600 text-sm font-semibold">Mainstage Pro</span>
          </div>

        </div>
      </div>
    );
  }

  // ── Privacy Notice ───────────────────────────────────────────────────────────

  if (!privacyDismissed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#111] border border-[#2a2a2a] flex items-center justify-center shrink-0">
              <span className="text-[#B3985B] text-base font-bold">M</span>
            </div>
            <div>
              <p className="text-white text-base font-bold leading-tight">Mainstage Pro</p>
              <p className="text-gray-600 text-[10px]">Sistema operativo interno</p>
            </div>
          </div>

          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-7 text-center">
            <div className="w-14 h-14 bg-[#B3985B]/10 border border-[#B3985B]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-[#B3985B]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>

            <h1 className="text-white font-bold text-lg mb-3">Reporte Semanal — Privado</h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Este formulario es <span className="text-white font-semibold">completamente privado y confidencial</span>. Solo el equipo de Dirección tiene acceso a las respuestas que escribas aquí.
            </p>

            <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 mb-5 text-left space-y-1.5">
              <p className="text-[#B3985B] text-xs font-semibold mb-2 inline-flex items-center gap-1.5"><Lock strokeWidth={1.75} className="w-3.5 h-3.5" /> Lo que escribas aquí:</p>
              <p className="text-gray-500 text-xs">• No es visible para otros compañeros del equipo</p>
              <p className="text-gray-500 text-xs">• Solo lo lee Dirección</p>
              <p className="text-gray-500 text-xs">• Sirve para mejorar condiciones y tomar mejores decisiones</p>
              <p className="text-gray-500 text-xs">• Puedes ser honesto y directo</p>
            </div>

            <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 mb-6 text-left">
              <p className="text-gray-600 text-xs mb-1">Llenando como:</p>
              <p className="text-white font-semibold text-sm">{session.name}</p>
              {session.area && <p className="text-gray-500 text-xs">{session.area}</p>}
            </div>

            <button
              type="button"
              onClick={() => setPrivacyDismissed(true)}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold py-3.5 rounded-xl transition-colors text-sm"
            >
              Entendido — Comenzar reporte ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario ───────────────────────────────────────────────────────────────

  const bienestarLabel = bienestar <= 3 ? "Muy pesado" : bienestar <= 5 ? "Pesado" : bienestar <= 7 ? "Bien" : bienestar <= 9 ? "Muy bien" : "Excelente";
  const bienestarColor = bienestar <= 3 ? "text-red-400" : bienestar <= 5 ? "text-orange-400" : bienestar <= 7 ? "text-blue-400" : "text-green-400";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top bar */}
      <div className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#111] border border-[#2a2a2a] flex items-center justify-center shrink-0">
              <span className="text-[#B3985B] text-xs font-bold">M</span>
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-tight">Mainstage Pro</p>
              <p className="text-gray-600 text-[10px]">Reporte Semanal · Privado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[10px] text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 px-2 py-0.5 rounded-full font-medium">
              <Lock strokeWidth={1.75} className="w-3 h-3" /> Solo Dirección
            </span>
            <div className="text-right hidden sm:block">
              <p className="text-white text-xs font-semibold">{session.name}</p>
              <p className="text-gray-600 text-[10px]">S{semana} · {rango}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Hero */}
          <div className="bg-gradient-to-br from-[#B3985B]/10 to-[#0d0d0d] border border-[#B3985B]/20 rounded-2xl p-6">
            <p className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold mb-1">
              Semana {semana} · {anio} · {rango}
            </p>
            <h1 className="text-white text-lg font-bold mb-2">Reporte General Semanal</h1>
            <p className="text-gray-400 text-xs leading-relaxed italic">&ldquo;{frase}&rdquo;</p>
          </div>

          {/* 1. Logros */}
          <Section num={1} title="Logros de la semana"
            hint="Escribe los logros, avances y cosas que salieron bien esta semana. Pueden ser resultados de proyectos, tareas completadas, victorias del equipo o tuyas personales. Sé específico — no importa si son pequeños o grandes.">
            <textarea className={ta} rows={4}
              placeholder="Ejemplo: Cerré la cotización del evento Expo Guadalajara. Terminé de organizar el almacén de producción. Mejoré el proceso de check-in con el cliente..."
              value={logros} onChange={(e) => setLogros(e.target.value)} />
          </Section>

          {/* ── Tareas pendientes en plataforma — IDÉNTICO a operaciones ── */}
          {(loadingPendientes || tareasOp.length > 0) && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </span>
                  <div>
                    <h2 className="text-white font-semibold text-sm">Tareas pendientes en la plataforma</h2>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                      Tus tareas con fecha y responsable asignados que están pendientes. Completa, cambia fechas o edita directamente desde aquí — los cambios se sincronizan con el módulo de tareas.
                    </p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                {loadingPendientes ? (
                  <p className="text-gray-600 text-xs px-5 py-4">Cargando tareas...</p>
                ) : tareasOp.length === 0 ? (
                  <p className="text-green-400/60 text-xs px-5 py-4">✓ Sin tareas pendientes con fecha asignada</p>
                ) : (
                  <div className="px-2">
                    {tareasOp.map(t => (
                      <TaskItem
                        key={t.id}
                        tarea={t}
                        onComplete={handleCompleteTask}
                        onSelect={handleSelectTask}
                        onDelete={handleDeleteTask}
                        onDateChange={handleDateChange}
                        onPriorityChange={handlePriorityChange}
                        onAssign={handleAssign}
                        onProjectChange={handleProjectChange}
                        users={usuarios}
                        projects={proyectos}
                        isSelected={selectedTask?.id === t.id}
                        showProject
                      />
                    ))}
                  </div>
                )}
                {loadingPanel && (
                  <p className="text-gray-600 text-[11px] px-5 pb-3">Abriendo tarea...</p>
                )}
              </div>
            </div>
          )}

          {/* ── Compromisos pendientes del Plan de Trabajo ── */}
          {!modoArranque && (loadingPendientes || compPlan.length > 0) && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                  </span>
                  <div>
                    <h2 className="text-white font-semibold text-sm">Compromisos pendientes del Plan de Trabajo</h2>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                      Compromisos recurrentes de semanas anteriores que no se completaron en el sistema. ¿Los realizaste? Dáles ✓. ¿Necesitan reagendarse? Elige una nueva fecha.
                    </p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                {loadingPendientes ? (
                  <p className="text-gray-600 text-xs px-5 py-4">Cargando compromisos...</p>
                ) : compPlan.length === 0 ? (
                  <p className="text-green-400/60 text-xs px-5 py-4">✓ Sin compromisos pendientes</p>
                ) : (
                  compPlan.map(c => {
                    const accion = accionesPlan[c.id]
                    const isComp = accion?.accion === 'completada'
                    const isReag = accion?.accion === 'reagendada'
                    const fechaBadge = fmtFechaBadge(c.fechaVencimiento)
                    const impactoColor = c.impacto === 'critico' ? '#f87171' : c.impacto === 'alto' ? '#fb923c' : '#555'

                    return (
                      <div
                        key={c.id}
                        className={`group flex items-start gap-3 px-5 py-2.5 transition-all ${
                          isComp ? 'opacity-40' : 'hover:bg-[#0d0d0d]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleCompletarPlan(c.id)}
                          disabled={isComp}
                          className="mt-[3px] w-[17px] h-[17px] shrink-0 rounded-full border-2 flex items-center justify-center transition-all hover:bg-[#111]"
                          style={{ borderColor: isComp ? '#333' : c.areaColor + 'aa', backgroundColor: isComp ? '#1f1f1f' : undefined }}
                        >
                          {isComp ? (
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-50 transition-opacity" style={{ backgroundColor: c.areaColor }} />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={`text-[15px] leading-snug ${isComp ? 'line-through text-[#333]' : 'text-[#d0d0d0]'}`}>
                            {c.templateNombre}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="flex items-center gap-1 text-[13px] text-[#444]">
                              <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: c.areaColor }} />
                              {c.areaNombre}
                            </span>
                            {fechaBadge && !isComp && (
                              <span className={`inline-flex items-center gap-1 text-[13px] px-1.5 py-0.5 rounded-md font-medium ${fechaBadge.cls}`}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                Venció {fechaBadge.label}
                              </span>
                            )}
                            {c.impacto !== 'estandar' && !isComp && (
                              <span className="flex items-center gap-1 text-[12px]" style={{ color: impactoColor }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: impactoColor }} />
                                {c.impacto === 'critico' ? 'Crítico' : 'Alto'}
                              </span>
                            )}
                            {isReag && reagendarFechaPlan[c.id] && (
                              <span className="text-[11px] text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 px-1.5 py-0.5 rounded-md">
                                ↺ {reagendarFechaPlan[c.id]}
                              </span>
                            )}
                          </div>
                          {isReag && (
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="date"
                                value={reagendarFechaPlan[c.id] ?? ''}
                                onChange={e => handleFechaReagendarPlan(c.id, e.target.value)}
                                className="bg-[#0d0d0d] border border-[#B3985B]/30 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                              />
                              <span className="text-[10px] text-[#444]">Nueva fecha comprometida</span>
                            </div>
                          )}
                        </div>

                        {!isComp && (
                          <div className="flex items-center gap-1 shrink-0 mt-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => handleCompletarPlan(c.id)} title="Marcar como realizado"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#3a3a3a] hover:text-green-400 hover:bg-[#1a1a1a] transition-all">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                            </button>
                            <button type="button" onClick={() => handleReagendarPlan(c.id)} title="Reagendar"
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                                isReag ? 'bg-[#B3985B]/15 text-[#B3985B]' : 'text-[#3a3a3a] hover:text-[#aaa] hover:bg-[#1a1a1a]'
                              }`}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            </button>
                          </div>
                        )}
                        {isComp && (
                          <button type="button" onClick={() => setAccionesPlan(prev => ({ ...prev, [c.id]: { accion: 'pendiente' } }))}
                            className="text-[10px] text-[#2a2a2a] hover:text-[#555] shrink-0 transition-colors">Deshacer</button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. Tareas próxima semana — QuickAdd real */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <h2 className="text-white font-semibold text-sm">Tareas para la próxima semana</h2>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                    Agrega aquí las tareas que planeas realizar la próxima semana. Cada una necesita <span className="text-gray-300">responsable, fecha y área</span> para saber dónde se gestiona. Se crean directamente en el módulo de tareas y Dirección las verá el lunes.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-2 py-2">
              {/* Tareas ya creadas */}
              {tareasProxima.length > 0 && (
                <div className="mb-2">
                  {tareasProxima.map(t => (
                    <TaskItem
                      key={t.id}
                      tarea={t}
                      onComplete={handleCompleteTask}
                      onSelect={handleSelectTask}
                      onDelete={handleDeleteTask}
                      onDateChange={handleDateChange}
                      onPriorityChange={handlePriorityChange}
                      onAssign={handleAssign}
                      onProjectChange={handleProjectChange}
                      users={usuarios}
                      projects={proyectos}
                      isSelected={selectedTask?.id === t.id}
                      showProject
                    />
                  ))}
                </div>
              )}
              {/* QuickAdd real */}
              <QuickAdd
                onAdd={handleAddProximaTarea}
                proyectos={proyectos}
                usuarios={usuarios}
                requiredFields={["fecha", "proyecto", "asignado"]}
                defaultAsignadoId={session.id}
                placeholder="¿Qué vas a hacer la próxima semana?"
              />
            </div>
          </div>

          {/* 4. Incidencias */}
          <Section num={4} title="Incidencias de la semana"
            hint="Una incidencia es cualquier problema, imprevisto o situación que haya afectado el trabajo normal. Describe qué pasó, por qué ocurrió y cómo propones resolverlo. Si no hubo incidencias, puedes dejarlo vacío.">
            <div className="space-y-4">
              {incidencias.map((inc, i) => (
                <div key={i} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Incidencia {i + 1}</span>
                    {incidencias.length > 1 && (
                      <button type="button" onClick={() => removeInc(i)} className="text-gray-700 hover:text-red-400 text-xs transition-colors">Eliminar</button>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">¿Qué pasó?</label>
                    <textarea className={`${ta} text-xs`} rows={2}
                      placeholder="Describe la situación. Ejemplo: Hubo un malentendido con el cliente sobre la fecha de entrega del material..."
                      value={inc.que} onChange={(e) => updateInc(i, "que", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Causa raíz — ¿Por qué ocurrió?</label>
                    <textarea className={`${ta} text-xs`} rows={2}
                      placeholder="¿Qué lo originó? Ejemplo: No se confirmó por escrito el acuerdo inicial con el cliente..."
                      value={inc.causa} onChange={(e) => updateInc(i, "causa", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Propuesta — ¿Cómo evitarlo en el futuro?</label>
                    <textarea className={`${ta} text-xs`} rows={2}
                      placeholder="¿Qué cambiarías para que no vuelva a pasar? Ejemplo: Agregar un checklist de confirmación antes de cerrar cotizaciones..."
                      value={inc.propuesta} onChange={(e) => updateInc(i, "propuesta", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addIncidencia} className="mt-3 flex items-center gap-1.5 text-xs text-[#B3985B]/70 hover:text-[#B3985B] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Agregar otra incidencia
            </button>
          </Section>

          {/* 5. Mejoras */}
          <Section num={5} title="Mejoras observadas en otras áreas"
            hint="¿Viste algo en el trabajo de otro compañero o área que crees que se puede mejorar, optimizar o reconocer? Esta sección es para feedback constructivo — no para quejas personales. Sé objetivo.">
            <textarea className={ta} rows={3}
              placeholder="Ejemplo: Creo que el proceso de entrega de materiales entre Producción y Operaciones podría agilizarse si hubiera una lista de verificación compartida..."
              value={mejoras} onChange={(e) => setMejoras(e.target.value)} />
          </Section>

          {/* 6. Compromisos */}
          <Section num={6} title="Compromisos de mejora personal"
            hint="¿En qué aspecto concreto de tu trabajo o actitud te comprometes a mejorar la próxima semana? Sé honesto y específico. Esto es para tu crecimiento personal dentro del equipo.">
            <textarea className={ta} rows={3}
              placeholder="Ejemplo: Me comprometo a responder mensajes de clientes en menos de 2 horas. Voy a documentar todos mis procesos antes del viernes..."
              value={compromisos} onChange={(e) => setCompromisos(e.target.value)} />
          </Section>

          {/* 7. Sugerencias */}
          <Section num={7} title="Comentarios o sugerencias a Dirección"
            hint="¿Qué quieres comunicar directamente a Dirección? Puede ser una propuesta, una necesidad de recursos, reconocimiento a un compañero, algo que te preocupa, o cualquier idea que mejore el ambiente o la empresa. Todo se lee.">
            <textarea className={ta} rows={3}
              placeholder="Ejemplo: Necesito una laptop con más capacidad para editar videos. Propongo hacer una reunión mensual de equipo para alinearnos..."
              value={sugerencias} onChange={(e) => setSugerencias(e.target.value)} />
          </Section>

          {/* 8. Bienestar */}
          <Section num={8} title="¿Cómo terminas esta semana?"
            hint="Califica tu nivel de energía, motivación y bienestar general al cerrar esta semana. Del 1 (muy pesado) al 10 (excelente). Ayuda a Dirección a conocer el estado del equipo.">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs">Muy pesado</span>
                <div className="text-center">
                  <span className={`text-3xl font-bold ${bienestarColor} transition-colors`}>{bienestar}</span>
                  <p className={`text-xs mt-0.5 font-medium ${bienestarColor} transition-colors`}>{bienestarLabel}</p>
                </div>
                <span className="text-gray-600 text-xs">Excelente</span>
              </div>
              <input type="range" min={1} max={10} value={bienestar}
                onChange={(e) => setBienestar(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #B3985B ${(bienestar - 1) * 100 / 9}%, #2a2a2a ${(bienestar - 1) * 100 / 9}%)` }}
              />
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button key={n} type="button" onClick={() => setBienestar(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${bienestar === n ? "bg-[#B3985B] text-black scale-110" : "bg-[#1a1a1a] text-gray-600 hover:bg-[#2a2a2a] hover:text-gray-400"}`}
                  >{n}</button>
                ))}
              </div>
            </div>
          </Section>

          {/* Submit */}
          <div className="pb-8 space-y-3">
            <button type="submit" disabled={enviando}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-colors text-sm">
              {enviando ? "Enviando reporte..." : `Enviar reporte — Semana ${semana} ✓`}
            </button>
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-1 text-[10px] text-[#B3985B]/70 bg-[#B3985B]/5 border border-[#B3985B]/15 px-3 py-0.5 rounded-full">
                <Lock strokeWidth={1.75} className="w-3 h-3" /> Solo Dirección tiene acceso a tus respuestas
              </span>
            </div>
            <p className="text-center text-gray-700 text-[10px]">
              Una vez enviado, el reporte quedará registrado y no podrá editarse.
            </p>
          </div>

        </div>
      </form>

      {/* TaskPanel — igual que en operaciones, pero como overlay */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40" onClick={() => setSelectedTask(null)} />
          {/* Panel */}
          <div className="w-full max-w-[520px] h-full bg-[#0d0d0d] border-l border-[#1e1e1e] overflow-y-auto">
            <TaskPanel
              tarea={selectedTask}
              usuarios={usuarios}
              proyectos={proyectos}
              iniciativas={iniciativas}
              sessionId={session?.id ?? ''}
              onClose={() => setSelectedTask(null)}
              onSave={handleSaveTask}
              onComplete={handleCompleteTask}
              onDelete={handleDeleteTask}
              onAddSubtarea={handleAddSubtarea}
              onCompleteSubtarea={handleCompleteSubtarea}
              onDeleteSubtarea={handleDeleteSubtarea}
            />
          </div>
        </div>
      )}
    </div>
  );
}
