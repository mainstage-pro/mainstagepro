"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

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

// ─── Paleta de prioridad (igual que TaskItem.tsx) ──────────────────────────────

const PRIO_STYLE: Record<string, { ring: string; dot: string; color: string; label: string }> = {
  URGENTE: { ring: 'border-red-500/70',    dot: 'bg-red-500',    color: '#f87171', label: 'Urgente' },
  ALTA:    { ring: 'border-orange-500/70', dot: 'bg-orange-500', color: '#fb923c', label: 'Alta'    },
  MEDIA:   { ring: 'border-[#B3985B]/60',  dot: 'bg-[#B3985B]', color: '#B3985B', label: 'Media'   },
  BAJA:    { ring: 'border-[#2a2a2a]',     dot: 'bg-[#333]',    color: '#4b5563', label: 'Baja'    },
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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Incidencia { que: string; causa: string; propuesta: string; }
interface SessionInfo { id: string; name: string; area: string | null; }

type TareaOp = {
  id: string
  titulo: string
  prioridad: string
  estado: string
  fecha: string | null
  fechaVencimiento: string | null
  proyecto: string | null
  asignadoNombre: string | null
}

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

// Para la sección de próxima semana (QuickAdd-like)
type ProximaTarea = {
  id: string  // local UUID temporal
  titulo: string
  fecha: string | null
  prioridad: string
  asignadoId: string | null
  asignadoNombre: string | null
}

type UsuarioOpt = { id: string; name: string }

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

  // — Plataforma pendientes —
  const [tareasOp, setTareasOp] = useState<TareaOp[]>([])
  const [compPlan, setCompPlan] = useState<CompromisoPlan[]>([])
  const [loadingPendientes, setLoadingPendientes] = useState(false)
  const [accionesOp, setAccionesOp] = useState<Record<string, AccionTarea>>({})
  const [accionesPlan, setAccionesPlan] = useState<Record<string, AccionTarea>>({})
  const [reagendarFechaOp, setReagendarFechaOp] = useState<Record<string, string>>({})
  const [reagendarFechaPlan, setReagendarFechaPlan] = useState<Record<string, string>>({})

  // — Próxima semana QuickAdd —
  const [proximasTareas, setProximasTareas] = useState<ProximaTarea[]>([])
  const [qaTitulo, setQaTitulo] = useState('')
  const [qaFecha, setQaFecha] = useState('')
  const [qaPrioridad, setQaPrioridad] = useState('MEDIA')
  const [qaAsignadoId, setQaAsignadoId] = useState<string | null>(null)
  const [qaAsignadoNombre, setQaAsignadoNombre] = useState<string | null>(null)
  const [qaPanel, setQaPanel] = useState<'fecha' | 'prioridad' | 'asignado' | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([])

  // Unused ref retained for potential future use
  const _tareaRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.id) setSession({ id: d.id, name: d.name, area: d.area ?? null });
        else router.push(`/login?redirect=/formularios/reporte-semanal/nuevo`);
      })
      .catch(() => router.push(`/login?redirect=/formularios/reporte-semanal/nuevo`));
  }, []); // eslint-disable-line

  // Cargar pendientes de plataforma
  useEffect(() => {
    if (!session) return
    setLoadingPendientes(true)
    fetch('/api/formularios/reporte-semanal/pendientes')
      .then(r => r.json())
      .then(d => {
        setTareasOp((d.tareasOperaciones ?? []).map((t: {
          id: string; titulo: string; prioridad: string; estado: string;
          fecha: string | null; fechaVencimiento: string | null; proyecto: string | null;
        }) => ({ ...t, asignadoNombre: null })))
        setCompPlan(d.compromisosPlan ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingPendientes(false))
  }, [session])

  // Cargar usuarios para QuickAdd
  useEffect(() => {
    fetch('/api/usuarios')
      .then(r => r.json())
      .then(d => setUsuarios(d.usuarios ?? []))
      .catch(() => {})
  }, [])

  function addIncidencia() { setIncidencias((p) => [...p, { que: "", causa: "", propuesta: "" }]); }
  function updateInc(i: number, f: keyof Incidencia, v: string) {
    setIncidencias((p) => p.map((inc, idx) => idx === i ? { ...inc, [f]: v } : inc));
  }
  function removeInc(i: number) {
    if (incidencias.length <= 1) return;
    setIncidencias((p) => p.filter((_, idx) => idx !== i));
  }

  // ── Handlers tareas Op ──
  function handleCompletarOp(id: string) {
    setAccionesOp(prev => ({ ...prev, [id]: { accion: 'completada' } }))
    fetch(`/api/tareas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'COMPLETADA' }),
    }).catch(() => {})
  }

  function handleReagendarOp(id: string) {
    setAccionesOp(prev => ({
      ...prev,
      [id]: { accion: prev[id]?.accion === 'reagendada' ? 'pendiente' : 'reagendada' }
    }))
  }

  function handleFechaReagendarOp(id: string, fecha: string) {
    setReagendarFechaOp(prev => ({ ...prev, [id]: fecha }))
    setAccionesOp(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), accion: 'reagendada', fechaComprometida: fecha } }))
  }

  // ── Handlers compromisos Plan ──
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

  // ── QuickAdd ──
  function addProximaTarea() {
    if (!qaTitulo.trim()) return
    setProximasTareas(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      titulo: qaTitulo.trim(),
      fecha: qaFecha || null,
      prioridad: qaPrioridad,
      asignadoId: qaAsignadoId,
      asignadoNombre: qaAsignadoNombre,
    }])
    setQaTitulo('')
    setQaFecha('')
    setQaPrioridad('MEDIA')
    setQaAsignadoId(null)
    setQaAsignadoNombre(null)
    setQaPanel(null)
  }

  function removeProximaTarea(id: string) {
    setProximasTareas(prev => prev.filter(t => t.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { toast.error("Debes estar autenticado"); return; }
    if (!logros.trim()) { toast.error("Por favor completa los logros de la semana"); return; }
    setEnviando(true);
    try {
      const tareasLimpias = proximasTareas.map(t => ({
        titulo: t.titulo,
        fechaVencimiento: t.fecha || null,
        prioridad: t.prioridad,
        asignadoNombre: t.asignadoNombre,
      }))
      const incidenciasLimpias = incidencias.filter((i) => i.que.trim() || i.causa.trim() || i.propuesta.trim());
      const res = await fetch("/api/formularios/reporte-semanal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semana, anio, logros,
          tareas: tareasLimpias,
          incidencias: incidenciasLimpias, mejoras, compromisos, sugerencias, bienestar,
          tareasOperaciones: tareasOp.map(t => ({
            tareaId: t.id, titulo: t.titulo, prioridad: t.prioridad,
            ...(accionesOp[t.id] ?? { accion: 'pendiente' }),
            fechaComprometida: reagendarFechaOp[t.id] ?? undefined,
          })),
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-[#B3985B]/10 border border-[#B3985B]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-white font-bold text-xl mb-2">¡Reporte enviado!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Gracias, <span className="text-white font-semibold">{session.name}</span>. Tu reporte de la semana {semana} fue recibido correctamente.
          </p>
          <p className="text-gray-700 text-xs">Solo Dirección tiene acceso a esta información.</p>
          <div className="mt-8 pt-6 border-t border-[#1e1e1e] flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#111] border border-[#2a2a2a] flex items-center justify-center">
              <span className="text-[#B3985B] text-xs font-bold">M</span>
            </div>
            <span className="text-gray-400 text-sm font-semibold">Mainstage Pro</span>
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
              <p className="text-[#B3985B] text-xs font-semibold mb-2">🔒 Lo que escribas aquí:</p>
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
              onClick={() => setPrivacyDismissed(true)}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96e] text-black font-bold py-3.5 rounded-xl transition-colors text-sm"
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
            <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 px-2 py-0.5 rounded-full font-medium">
              🔒 Solo Dirección
            </span>
            <div className="text-right hidden sm:block">
              <p className="text-white text-xs font-semibold">{session.name}</p>
              <p className="text-gray-600 text-[10px]">S{semana} · {rango}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay para cerrar dropdowns QuickAdd */}
      {qaPanel && <div className="fixed inset-0 z-40" onClick={() => setQaPanel(null)} />}

      <form onSubmit={handleSubmit}>
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
              value={logros} onChange={(e) => setLogros(e.target.value)} required />
          </Section>

          {/* ── Tareas pendientes en plataforma ── */}
          {(loadingPendientes || tareasOp.length > 0) && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </span>
                  <div>
                    <h2 className="text-white font-semibold text-sm">Tareas pendientes en la plataforma</h2>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                      Estas son tus tareas con fecha y asignadas a ti que aún no están completadas. Si ya las realizaste, dáles ✓. Si no puedes completarlas ahora, agéndalas con una nueva fecha.
                    </p>
                  </div>
                </div>
              </div>
              {/* Lista */}
              <div className="py-1">
                {loadingPendientes ? (
                  <p className="text-gray-600 text-xs px-5 py-4">Cargando tareas...</p>
                ) : tareasOp.length === 0 ? (
                  <p className="text-green-400/60 text-xs px-5 py-4">✓ Sin tareas pendientes</p>
                ) : (
                  tareasOp.map(t => {
                    const prio = PRIO_STYLE[t.prioridad] ?? PRIO_STYLE.BAJA
                    const accion = accionesOp[t.id]
                    const isComp = accion?.accion === 'completada'
                    const isReag = accion?.accion === 'reagendada'
                    const fechaKey = t.fechaVencimiento ?? t.fecha
                    const fechaBadge = fechaKey ? fmtFechaBadge(fechaKey) : null

                    return (
                      <div
                        key={t.id}
                        className={`group flex items-start gap-3 px-5 py-2.5 transition-all ${
                          isComp ? 'opacity-40' : 'hover:bg-[#0d0d0d]'
                        }`}
                      >
                        {/* Checkbox estilo TaskItem */}
                        <button
                          type="button"
                          onClick={() => handleCompletarOp(t.id)}
                          disabled={isComp}
                          className={`mt-[3px] w-[17px] h-[17px] shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                            isComp
                              ? 'border-[#333] bg-[#1f1f1f]'
                              : `${prio.ring} hover:bg-[#111] group-hover:shadow-md`
                          }`}
                          aria-label="Completar"
                        >
                          {isComp && (
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>
                          )}
                          {!isComp && (
                            <div className={`w-1.5 h-1.5 rounded-full ${prio.dot} opacity-0 group-hover:opacity-50 transition-opacity`} />
                          )}
                        </button>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[15px] leading-snug transition-colors ${
                            isComp ? 'line-through text-[#333]' : 'text-[#d0d0d0]'
                          }`}>{t.titulo}</p>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {/* Proyecto */}
                            {t.proyecto && (
                              <span className="flex items-center gap-1 text-[13px] text-[#444]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#444] inline-block shrink-0" />
                                {t.proyecto}
                              </span>
                            )}

                            {/* Fecha badge */}
                            {fechaBadge && !isComp && (
                              <span className={`inline-flex items-center gap-1 text-[13px] px-1.5 py-0.5 rounded-md font-medium ${fechaBadge.cls}`}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                {fechaBadge.label}
                              </span>
                            )}

                            {/* Asignado */}
                            {t.asignadoNombre && !isComp && (
                              <span className="w-[18px] h-[18px] rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 text-[10px] text-[#B3985B] flex items-center justify-center font-bold shrink-0" title={t.asignadoNombre}>
                                {t.asignadoNombre.charAt(0).toUpperCase()}
                              </span>
                            )}

                            {/* Badge reagendada */}
                            {isReag && reagendarFechaOp[t.id] && (
                              <span className="text-[11px] text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 px-1.5 py-0.5 rounded-md">
                                ↺ {reagendarFechaOp[t.id]}
                              </span>
                            )}
                          </div>

                          {/* Inline reagendar date input */}
                          {isReag && (
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="date"
                                value={reagendarFechaOp[t.id] ?? ''}
                                onChange={e => handleFechaReagendarOp(t.id, e.target.value)}
                                className="bg-[#0d0d0d] border border-[#B3985B]/30 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#B3985B]/50"
                              />
                              <span className="text-[10px] text-[#444]">Nueva fecha comprometida</span>
                            </div>
                          )}
                        </div>

                        {/* Acciones */}
                        {!isComp && (
                          <div className="flex items-center gap-1 shrink-0 mt-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            {/* Completar */}
                            <button
                              type="button"
                              onClick={() => handleCompletarOp(t.id)}
                              title="Marcar como completada"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#3a3a3a] hover:text-green-400 hover:bg-[#1a1a1a] transition-all"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                            </button>
                            {/* Reagendar */}
                            <button
                              type="button"
                              onClick={() => handleReagendarOp(t.id)}
                              title="Reagendar"
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                                isReag
                                  ? 'bg-[#B3985B]/15 text-[#B3985B]'
                                  : 'text-[#3a3a3a] hover:text-[#aaa] hover:bg-[#1a1a1a]'
                              }`}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            </button>
                          </div>
                        )}
                        {isComp && (
                          <button type="button" onClick={() => setAccionesOp(prev => ({ ...prev, [t.id]: { accion: 'pendiente' } }))}
                            className="text-[10px] text-[#2a2a2a] hover:text-[#555] shrink-0 transition-colors"
                          >Deshacer</button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* ── Compromisos pendientes del Plan de Trabajo ── */}
          {(loadingPendientes || compPlan.length > 0) && (
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
                        {/* Checkbox con color de área */}
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
                            {/* Área */}
                            <span className="flex items-center gap-1 text-[13px] text-[#444]">
                              <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: c.areaColor }} />
                              {c.areaNombre}
                            </span>
                            {/* Fecha vencida */}
                            {fechaBadge && !isComp && (
                              <span className={`inline-flex items-center gap-1 text-[13px] px-1.5 py-0.5 rounded-md font-medium ${fechaBadge.cls}`}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                Venció {fechaBadge.label}
                              </span>
                            )}
                            {/* Impacto */}
                            {c.impacto !== 'estandar' && !isComp && (
                              <span className="flex items-center gap-1 text-[12px]" style={{ color: impactoColor }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: impactoColor }} />
                                {c.impacto === 'critico' ? 'Crítico' : 'Alto'}
                              </span>
                            )}
                            {/* Reagendada badge */}
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

          {/* 3. Tareas próxima semana — QuickAdd */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <h2 className="text-white font-semibold text-sm">Tareas para la próxima semana</h2>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                    ¿Qué está en tu agenda para la siguiente semana? Agrégalas aquí con fecha y prioridad. Quedarán registradas y Dirección las verá el lunes.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              {/* Tareas ya agregadas */}
              {proximasTareas.length > 0 && (
                <div className="mb-3 space-y-0.5">
                  {proximasTareas.map(t => {
                    const prio = PRIO_STYLE[t.prioridad] ?? PRIO_STYLE.MEDIA
                    const fechaBadge = t.fecha ? fmtFechaBadge(t.fecha) : null
                    return (
                      <div key={t.id} className="group flex items-start gap-3 px-2 py-2 rounded-xl hover:bg-[#0d0d0d] transition-all">
                        {/* Dot prioridad */}
                        <span className={`mt-[7px] w-[7px] h-[7px] shrink-0 rounded-full ${prio.dot} opacity-70`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] leading-snug text-[#d0d0d0]">{t.titulo}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {fechaBadge && (
                              <span className={`inline-flex items-center gap-1 text-[13px] px-1.5 py-0.5 rounded-md font-medium ${fechaBadge.cls}`}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                {fechaBadge.label}
                              </span>
                            )}
                            <span className="text-[12px]" style={{ color: prio.color }}>{prio.label}</span>
                            {t.asignadoNombre && (
                              <span className="w-[18px] h-[18px] rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 text-[10px] text-[#B3985B] flex items-center justify-center font-bold shrink-0">
                                {t.asignadoNombre.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => removeProximaTarea(t.id)}
                          className="opacity-0 group-hover:opacity-100 mt-0.5 w-6 h-6 flex items-center justify-center rounded-lg text-[#333] hover:text-red-400 hover:bg-[#1a1a1a] transition-all shrink-0">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* QuickAdd input */}
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl focus-within:border-[#B3985B]/40 transition-colors">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button type="button" onClick={addProximaTarea}
                    className="w-6 h-6 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#444] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all shrink-0">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <input
                    className="flex-1 bg-transparent text-[15px] text-[#d0d0d0] placeholder:text-[#333] focus:outline-none"
                    placeholder="¿Qué vas a hacer la próxima semana?"
                    value={qaTitulo}
                    onChange={e => setQaTitulo(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addProximaTarea() } }}
                  />
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 px-3 pb-2.5 border-t border-[#1a1a1a] pt-2">
                  {/* Fecha */}
                  <div className="relative">
                    <button type="button"
                      onClick={() => setQaPanel(prev => prev === 'fecha' ? null : 'fecha')}
                      className={`flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-lg transition-all ${
                        qaFecha ? 'text-[#B3985B] bg-[#B3985B]/10' : 'text-[#444] hover:text-[#888] hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {qaFecha || 'Fecha'}
                    </button>
                    {qaPanel === 'fecha' && (
                      <div className="absolute left-0 top-8 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl p-2">
                        <input type="date" value={qaFecha} onChange={e => { setQaFecha(e.target.value); setQaPanel(null) }}
                          className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#B3985B]/30" />
                      </div>
                    )}
                  </div>

                  {/* Prioridad */}
                  <div className="relative">
                    <button type="button"
                      onClick={() => setQaPanel(prev => prev === 'prioridad' ? null : 'prioridad')}
                      className={`flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-lg transition-all ${
                        qaPrioridad !== 'MEDIA' ? 'bg-current/10' : 'text-[#444] hover:text-[#888] hover:bg-[#1a1a1a]'
                      }`}
                      style={qaPrioridad !== 'MEDIA' ? { color: PRIO_STYLE[qaPrioridad]?.color } : undefined}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                      {PRIO_STYLE[qaPrioridad]?.label ?? 'Prioridad'}
                    </button>
                    {qaPanel === 'prioridad' && (
                      <div className="absolute left-0 top-8 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[130px]">
                        {Object.entries(PRIO_STYLE).map(([key, p]) => (
                          <button key={key} type="button"
                            onClick={() => { setQaPrioridad(key); setQaPanel(null) }}
                            className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[#1f1f1f] ${
                              qaPrioridad === key ? 'font-semibold' : ''
                            }`} style={{ color: p.color }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/></svg>
                            {p.label}
                            {qaPrioridad === key && <svg className="ml-auto" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Asignado */}
                  <div className="relative">
                    <button type="button"
                      onClick={() => setQaPanel(prev => prev === 'asignado' ? null : 'asignado')}
                      className={`flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-lg transition-all ${
                        qaAsignadoId ? 'text-[#B3985B] bg-[#B3985B]/10' : 'text-[#444] hover:text-[#888] hover:bg-[#1a1a1a]'
                      }`}
                    >
                      {qaAsignadoId ? (
                        <span className="w-4 h-4 rounded-full bg-[#B3985B]/20 text-[10px] text-[#B3985B] flex items-center justify-center font-bold">
                          {qaAsignadoNombre?.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      )}
                      {qaAsignadoNombre?.split(' ')[0] ?? 'Asignar'}
                    </button>
                    {qaPanel === 'asignado' && (
                      <div className="absolute left-0 top-8 z-50 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[160px]">
                        <p className="text-[10px] text-[#555] uppercase tracking-wider px-3 pt-1 pb-1.5">Asignar a</p>
                        {qaAsignadoId && (
                          <button type="button" onClick={() => { setQaAsignadoId(null); setQaAsignadoNombre(null); setQaPanel(null) }}
                            className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-[#1f1f1f] transition-colors">
                            Sin asignar
                          </button>
                        )}
                        {usuarios.map(u => (
                          <button key={u.id} type="button"
                            onClick={() => { setQaAsignadoId(u.id); setQaAsignadoNombre(u.name); setQaPanel(null) }}
                            className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#1f1f1f] transition-colors ${
                              qaAsignadoId === u.id ? 'text-[#B3985B]' : 'text-[#ccc]'
                            }`}>
                            <span className="w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] text-[#B3985B] flex items-center justify-center font-semibold shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                            {u.name}
                            {qaAsignadoId === u.id && <svg className="ml-auto" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {proximasTareas.length === 0 && (
                <p className="text-[#2a2a2a] text-xs text-center mt-2">Presiona Enter o + para agregar tareas</p>
              )}
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
              className="w-full bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-colors text-sm">
              {enviando ? "Enviando reporte..." : `Enviar reporte — Semana ${semana} ✓`}
            </button>
            <div className="flex items-center justify-center">
              <span className="text-[10px] text-[#B3985B]/70 bg-[#B3985B]/5 border border-[#B3985B]/15 px-3 py-0.5 rounded-full">
                🔒 Solo Dirección tiene acceso a tus respuestas
              </span>
            </div>
            <p className="text-center text-gray-700 text-[10px]">
              Una vez enviado, el reporte quedará registrado y no podrá editarse.
            </p>
          </div>

        </div>
      </form>
    </div>
  );
}
