'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { showUndoToast } from '@/components/ui/undo-toast'

// ── Types ──────────────────────────────────────────────────────────────────────

type Instancia = {
  id: string
  estado: string
  notas: string | null
  fechaVencimiento: string
  completadaAt: string | null
  responsable: { id: string; name: string } | null
  template: {
    id: string
    nombre: string
    tipo: string
    impacto: string
    contexto: string
    frecuencia: string
    diasSemana: number[]
    cuando: string | null
    descripcion: string | null
    estandarMinimo: string | null
    porqueSeHace: string | null
    relacionCon: string | null
    siNoSeHace: string | null
    afectaA: string[]
    kpiNombre: string | null
    moduloTexto: string | null
    moduloDestino: string | null
    moduloDisponible: boolean
    esAccionCampo: boolean
    puestoDefault: string | null
    horaLimite?: string | null
    area: { id: string; nombre: string; color: string; icono: string }
    subArea: { id: string; nombre: string }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function getLunesDeSemana(d: Date): Date {
  const dow = d.getDay()
  const lunes = new Date(d)
  lunes.setDate(d.getDate() - ((dow + 6) % 7))
  lunes.setHours(0, 0, 0, 0)
  return lunes
}

function getDiasSemana(lunes: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    return d
  })
}

function esMismaFecha(a: Date, b: Date): boolean {
  return toDateStr(a) === toDateStr(b)
}

function esHoy(d: Date): boolean {
  return esMismaFecha(d, new Date())
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_COMPLETO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_INICIAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const DIAS_PLAN_LABEL: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V' }
const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const FRECUENCIA_LABEL: Record<string, string> = {
  DIARIO: 'Diario', SEMANAL: 'Semanal', QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual', TRIMESTRAL: 'Trimestral', POR_EVENTO: 'Por evento',
}

function fmtFechaLarga(d: Date): string {
  return `${DIAS_CORTO[d.getDay()]}, ${d.getDate()} de ${MESES_FULL[d.getMonth()]} de ${d.getFullYear()}`
}

function fmtRangoSemana(dias: Date[]): string {
  if (dias.length < 5) return ''
  const ini = dias[0]
  const fin = dias[4]
  return `${ini.getDate()} ${MESES_ES[ini.getMonth()]} – ${fin.getDate()} ${MESES_ES[fin.getMonth()]} ${fin.getFullYear()}`
}

const IMPACTO: Record<string, { bar: string; dot: string; label: string; labelCls: string }> = {
  critico:  { bar: 'bg-red-500',    dot: 'border-red-500/60 hover:bg-red-500/10',      label: 'Crítico',   labelCls: 'text-red-400' },
  alto:     { bar: 'bg-orange-400', dot: 'border-orange-400/50 hover:bg-orange-400/10', label: 'Alto',      labelCls: 'text-orange-400' },
  estandar: { bar: 'bg-[#333]',     dot: 'border-[#444] hover:bg-[#2a2a2a]',           label: 'Estándar',  labelCls: 'text-gray-600' },
}

const CONTEXTO: Record<string, { label: string; cls: string }> = {
  evento:        { label: '📅 Con evento',    cls: 'bg-blue-900/30 text-blue-400 border-blue-800/40' },
  hibrida:       { label: '⚡ Híbrida',       cls: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40' },
  independiente: { label: '✅ Independiente', cls: 'bg-[#1a1a1a] text-gray-600 border-[#2a2a2a]' },
}

const IMPACTO_ORDER: Record<string, number> = { critico: 0, alto: 1, estandar: 2 }

// ── Daily motivational phrases ─────────────────────────────────────────────────

const FRASES_MOTIVADORAS = [
  'El plan de trabajo no es una lista de tareas — es el mapa que convierte tu esfuerzo en resultados concretos.',
  'Cada tarea completada a tiempo es una promesa cumplida con tu equipo y con tus clientes.',
  'La estructura no limita la creatividad, la potencia. Cuando el orden está claro, la energía fluye.',
  'Lo que haces hoy es la base de lo que lograrás mañana. No subestimes el poder de la consistencia.',
  'Tu colaboración importa más de lo que crees. Cada área depende de que la tuya funcione bien.',
  'El equipo que planea junto, ejecuta junto. Tu aporte en el plan hace posible el de todos.',
  'Las empresas que crecen tienen algo en común: personas que hacen lo que dijeron que iban a hacer.',
  'Seguir el plan de trabajo no es rigidez, es respeto — por tu tiempo, el de tu equipo y el del cliente.',
  'El caos se combate con claridad. Tu plan de hoy es tu escudo contra lo urgente e improductivo.',
  'Los pequeños compromisos de hoy construyen los grandes logros del mes. No los subestimes.',
  'Tu disciplina en el plan de trabajo es directamente proporcional al éxito del equipo en producción.',
  'Lo que no se planea, se improvisa. Lo que se improvisa, cuesta más tiempo y dinero.',
  'Un equipo con plan claro es más ágil, más efectivo y más rentable. Tú eres parte de eso.',
  'La mejor manera de predecir el futuro de tu área es construirlo con acciones diarias bien ejecutadas.',
  'No existe compromiso pequeño cuando el propósito es grande. Ejecuta con intención.',
  'El orden que mantienes en tu plan de trabajo se refleja directamente en la calidad del servicio al cliente.',
  'Cada día de ejecución limpia acumula confianza — la de tu equipo, la de la empresa y la tuya.',
  'La estructura del plan existe para liberarte, no para atarte. Úsala a tu favor.',
  'Tu área bien operada permite que las demás fluyan. Eso es liderazgo operativo real.',
  'Las empresas que perduran tienen equipos que cumplen lo que planean. Sigue siendo parte de eso.',
  'Hoy es otro día para demostrar que la excelencia operativa no es un accidente, es una decisión.',
  'El plan de trabajo es el lenguaje común del equipo. Hablarlo bien es contribuir a algo mayor.',
  'No busques el día perfecto para empezar. El plan de trabajo convierte cada día en uno productivo.',
  'Tu cumplimiento hoy impacta el flujo de mañana. El equipo cuenta contigo.',
  'La diferencia entre un equipo bueno y uno extraordinario está en la consistencia. Tú decides.',
  'Trabajar con plan no solo te hace más productivo, te hace más valioso para el equipo.',
  'Cada subproceso que ejecutas a tiempo es una pieza que completa el rompecabezas del éxito del evento.',
  'El plan de trabajo es el compromiso silencioso que cada integrante hace con la empresa cada día.',
  'La claridad operativa que construyes hoy es la tranquilidad del equipo mañana.',
  'Mainstage Pro crece cuando cada persona hace su parte con precisión. Gracias por ser esa persona.',
]

function getFraseDelDia(): string {
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), 0, 0)
  const diff = hoy.getTime() - inicio.getTime()
  const diaDelAño = Math.floor(diff / 86400000)
  return FRASES_MOTIVADORAS[diaDelAño % FRASES_MOTIVADORAS.length]
}

// ── CircularProgress ───────────────────────────────────────────────────────────

function CircularProgress({ pct, completadas, total }: { pct: number; completadas: number; total: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5 flex flex-col items-center">
      <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-4">Tu día</p>
      <div className="relative">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#1a1a1a" strokeWidth="8" />
          <circle
            cx="64" cy="64" r={r}
            fill="none"
            stroke="#C9A84C"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={circ / 4}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white tabular-nums">{pct}%</span>
          <span className="text-[10px] text-gray-600">{completadas}/{total}</span>
        </div>
      </div>
      {total > 0 && pct === 100 && (
        <p className="text-xs text-green-400 mt-3">🎉 ¡Todo completado!</p>
      )}
    </div>
  )
}

// ── DayPanel ───────────────────────────────────────────────────────────────────

function DayPanel({ pct, completadas, total }: { pct: number; completadas: number; total: number }) {
  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-3">Avance</p>
      {total === 0 ? (
        <p className="text-xs text-gray-600">Sin compromisos generados</p>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Completadas</span>
            <span className="text-white font-medium">{completadas} / {total}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Pendientes</span>
            <span className="text-white font-medium">{total - completadas}</span>
          </div>
          {pct >= 80 && (
            <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
              <p className="text-xs text-[#C9A84C]">
                {pct === 100 ? '🏆 Día perfecto' : '⚡ Casi listo'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── MiDiaItem ──────────────────────────────────────────────────────────────────

function MiDiaItem({
  instancia,
  onToggle,
}: {
  instancia: Instancia
  onToggle: (id: string, currentEstado: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [toggling, setToggling] = useState(false)
  const completada = instancia.estado === 'COMPLETADA'
  const { template: t } = instancia
  const imp = IMPACTO[t.impacto] ?? IMPACTO.estandar
  const ctx = CONTEXTO[t.contexto] ?? CONTEXTO.independiente
  const router = useRouter()

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(true)
    await onToggle(instancia.id, instancia.estado)
    setToggling(false)
  }

  return (
    <div className={`relative border rounded-xl overflow-hidden transition-all duration-200 flex ${
      completada ? 'border-[#1a1a1a] opacity-55' : 'border-[#1e1e1e] hover:border-[#2a2a2a]'
    }`}>
      {/* Left bar — area color */}
      <div className="w-1 shrink-0 rounded-r-sm" style={{ backgroundColor: t.area.color || '#333' }} />

      <div className="flex-1 min-w-0">
        {/* Main row */}
        <div
          className="flex items-start gap-3 px-4 py-3.5 cursor-pointer select-none"
          onClick={() => setExpanded(v => !v)}
        >
          {/* Toggle circle — dorado y visible */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
              completada
                ? 'bg-green-500 border-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]'
                : 'border-[#C9A84C] hover:bg-[#C9A84C]/20 hover:shadow-[0_0_0_3px_rgba(201,168,76,0.18)]'
            }`}
          >
            {completada && <span className="text-white text-[10px] leading-none font-bold">✓</span>}
            {!completada && !toggling && <span className="w-2 h-2 rounded-full bg-[#C9A84C]/50" />}
            {toggling && !completada && <span className="w-2.5 h-2.5 rounded-full bg-[#C9A84C] animate-pulse" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Task name */}
            <p className={`text-sm font-medium leading-snug mb-1 ${
              completada ? 'line-through text-gray-600' : 'text-white'
            }`}>
              {t.nombre}
            </p>

            {/* Módulo de ejecución — inline bajo el nombre */}
            {t.esAccionCampo ? (
              <p className="text-[10px] text-[#444] mt-0.5 mb-1">· En campo</p>
            ) : t.moduloDestino && t.moduloTexto ? (
              t.moduloDisponible ? (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(t.moduloDestino!.split('#')[0]) }}
                  className="text-[10px] text-[#C9A84C] hover:text-[#d4b060] mt-0.5 mb-1 transition-colors block"
                >
                  → {t.moduloTexto}
                </button>
              ) : (
                <p className="text-[10px] text-[#333] mt-0.5 mb-1">→ {t.moduloTexto}</p>
              )
            ) : null}

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              {/* Impact — only shown for crítico / alto, as subtle dot + label */}
              {t.impacto !== 'estandar' && (
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    t.impacto === 'critico' ? 'bg-red-500' : 'bg-orange-400'
                  }`} />
                  <span className={`text-[9px] uppercase tracking-wider ${
                    t.impacto === 'critico' ? 'text-red-400/60' : 'text-orange-400/60'
                  }`}>{imp.label}</span>
                </span>
              )}
              {t.tipo === 'ENTREGABLE' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#C9A84C]/30 text-[#C9A84C] bg-[#C9A84C]/5">
                  📄 Entregable
                </span>
              )}
              {t.puestoDefault === 'Todo el equipo' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#444] text-gray-500 bg-[#1a1a1a]">
                  👥 Todos
                </span>
              )}
            </div>

            {/* Meta row: responsable + days + frecuencia */}
            <div className="flex flex-wrap items-center gap-2">
              {instancia.responsable && (
                <span className="text-[10px] text-gray-500">
                  {instancia.responsable.name.split(' ')[0]}
                </span>
              )}
              {/* diasSemana boxes */}
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(d => (
                  <span
                    key={d}
                    className={`text-[8px] w-3.5 h-3.5 rounded flex items-center justify-center font-bold ${
                      (t.diasSemana ?? []).includes(d)
                        ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                        : 'bg-[#111] text-gray-700'
                    }`}
                  >
                    {DIAS_PLAN_LABEL[d]}
                  </span>
                ))}
              </div>
              {t.frecuencia && (
                <span className="text-[9px] text-gray-700">
                  {FRECUENCIA_LABEL[t.frecuencia] ?? t.frecuencia}
                </span>
              )}
            </div>

            {t.cuando && !expanded && (
              <p className="text-[11px] text-gray-600 mt-1 truncate">{t.cuando}</p>
            )}
          </div>

          {/* Area + chevron */}
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[9px] text-gray-700 hidden sm:block">{t.area.icono}</span>
            <span className="text-gray-600 text-[10px]">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[#111] space-y-3">
          {t.cuando && (
            <p className="text-xs text-gray-500">
              <span className="text-gray-700">⏰ Cuándo: </span>{t.cuando}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {t.descripcion && (
              <div className="bg-[#0d0d0d] rounded-lg p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Descripción</p>
                <p className="text-xs text-gray-300 leading-relaxed">{t.descripcion}</p>
              </div>
            )}
            {t.porqueSeHace && (
              <div className="bg-[#0d0d0d] rounded-lg p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Por qué se hace</p>
                <p className="text-xs text-gray-300 leading-relaxed">{t.porqueSeHace}</p>
              </div>
            )}
            {t.estandarMinimo && (
              <div className="bg-[#C9A84C]/5 border border-[#C9A84C]/20 rounded-lg p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#C9A84C] mb-1.5">Estándar mínimo</p>
                <p className="text-xs text-gray-300 leading-relaxed">{t.estandarMinimo}</p>
              </div>
            )}
            {t.siNoSeHace && (
              <div className="bg-red-950/20 border border-red-900/20 rounded-lg p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-1.5">Si no se hace</p>
                <p className="text-xs text-gray-400 leading-relaxed">{t.siNoSeHace}</p>
              </div>
            )}
          </div>

          {t.moduloDestino && t.moduloTexto && !t.esAccionCampo && (
            <button
              onClick={e => { e.stopPropagation(); router.push(t.moduloDestino!.split('#')[0]) }}
              className="inline-flex items-center gap-1.5 text-sm text-[#C9A84C] hover:underline"
            >
              {t.moduloTexto} →
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MiDiaPage() {
  // ── Week navigation state ───────────────────────────────────────────────────
  const [fechaActual, setFechaActual] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [conteosSemana, setConteosSemana] = useState<Record<string, number>>({})
  const [loadingConteos, setLoadingConteos] = useState(false)

  const lunes = getLunesDeSemana(fechaActual)
  const lunesSemana = (() => {
    const l = new Date(lunes)
    l.setDate(lunes.getDate() + semanaOffset * 7)
    return l
  })()
  const diasSemana = getDiasSemana(lunesSemana)

  // ── Task state ──────────────────────────────────────────────────────────────
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading]       = useState(true)
  const [generando, setGenerando]   = useState(false)

  // ── Tomorrow preview state ──────────────────────────────────────────────────
  const [manana, setManana] = useState<{ nombre: string; impacto: string }[]>([])
  const [atrasadas, setAtrasadas] = useState<Instancia[]>([])
  const [modoArranque, setModoArranque] = useState(false)
  const [collapsedSubareas, setCollapsedSubareas] = useState<Set<string>>(new Set())

  // ── User / collaboration state ──────────────────────────────────────────────
  const [userName, setUserName] = useState<string>('')
  const [usuariosEquipo, setUsuariosEquipo] = useState<{ id: string; name: string; role: string }[]>([])
  const [viendoUsuarioId, setViendoUsuarioId] = useState<string | null>(null)

  const fechaStr = toDateStr(fechaActual)

  // ── Fetch current user name ─────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        setUserName(d.name?.split(' ')[0] ?? '')
        setModoArranque(d.modoArranque ?? false)
      })
      .catch(() => {})
  }, [])

  // ── Fetch team users for collaboration view ─────────────────────────────────
  useEffect(() => {
    fetch('/api/usuarios')
      .then(r => r.json())
      .then(d => {
        const lista = (d.usuarios ?? []) as { id: string; name: string; role: string }[]
        setUsuariosEquipo(lista)
      })
      .catch(() => {})
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const url = viendoUsuarioId
        ? `/api/plan-trabajo/instancias?fecha=${fechaStr}&vista=dia&userId=${viendoUsuarioId}`
        : `/api/plan-trabajo/instancias?fecha=${fechaStr}&vista=dia`
      const res = await fetch(url)
      const data = await res.json()
      setInstancias(data.instancias ?? [])
    } finally {
      setLoading(false)
    }
  }, [fechaStr, viendoUsuarioId])

  useEffect(() => { cargar() }, [cargar])

  // ── Load week counts ────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadConteos() {
      setLoadingConteos(true)
      try {
        const lunesStr = toDateStr(lunesSemana)
        const userParam = viendoUsuarioId ? `&userId=${viendoUsuarioId}` : ''
        const res = await fetch(`/api/plan-trabajo/instancias/semana?lunes=${lunesStr}${userParam}`)
        const data = await res.json()
        setConteosSemana(data.conteos ?? {})
      } catch {
        // silently fail
      } finally {
        setLoadingConteos(false)
      }
    }
    loadConteos()
  }, [lunesSemana.toDateString(), viendoUsuarioId])

  // ── Load tomorrow preview ───────────────────────────────────────────────────
  useEffect(() => {
    const tomorrow = new Date(fechaActual)
    tomorrow.setDate(fechaActual.getDate() + 1)
    const tomorrowStr = toDateStr(tomorrow)
    fetch(`/api/plan-trabajo/instancias?fecha=${tomorrowStr}&vista=dia`)
      .then(r => r.json())
      .then(d => {
        const list = (d.instancias ?? []) as Array<{ estado: string; template: { nombre: string; impacto: string } }>
        setManana(list.slice(0, 3).map(i => ({ nombre: i.template.nombre, impacto: i.template.impacto })))
      })
      .catch(() => {})
  }, [toDateStr(fechaActual)])

  // ── Fetch atrasadas (pendientes de días anteriores) ─────────────────────────
  useEffect(() => {
    if (viendoUsuarioId || modoArranque) { setAtrasadas([]); return }
    fetch('/api/plan-trabajo/instancias?pendientesAnteriores=true')
      .then(r => r.json())
      .then(d => setAtrasadas(d.instancias ?? []))
      .catch(() => {})
  }, [viendoUsuarioId, modoArranque])

  function cambiarSemana(dir: number) {
    setSemanaOffset(prev => prev + dir)
    // Move fechaActual to Monday of the new week
    const newLunes = new Date(lunesSemana)
    newLunes.setDate(lunesSemana.getDate() + dir * 7)
    setFechaActual(newLunes)
  }

  async function handleGenerar() {
    setGenerando(true)
    await fetch('/api/plan-trabajo/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: fechaStr }),
    })
    await cargar()
    setGenerando(false)
  }

  async function handleToggleAtrasada(id: string, currentEstado: string) {
    const goingComplete = currentEstado !== 'COMPLETADA'
    setAtrasadas(prev => prev.map(i =>
      i.id === id ? { ...i, estado: goingComplete ? 'COMPLETADA' : 'PENDIENTE' } : i
    ))
    await fetch('/api/plan-trabajo/instancias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanciaId: id, estado: goingComplete ? 'COMPLETADA' : 'PENDIENTE' }),
    })
    if (goingComplete) {
      setTimeout(() => setAtrasadas(prev => prev.filter(i => i.id !== id)), 1200)
    }
  }

  async function handleToggle(id: string, currentEstado: string) {
    const goingComplete = currentEstado !== 'COMPLETADA'

    if (!goingComplete) {
      // Directly undo (re-open task)
      const res = await fetch('/api/plan-trabajo/instancias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanciaId: id, estado: 'PENDIENTE' }),
      })
      if (res.ok) {
        setInstancias(prev =>
          prev.map(i => i.id === id ? { ...i, estado: 'PENDIENTE', completadaAt: null } : i)
        )
      }
      return
    }

    // Optimistic: show as completed
    setInstancias(prev =>
      prev.map(i => i.id === id ? { ...i, estado: 'COMPLETADA', completadaAt: new Date().toISOString() } : i)
    )

    showUndoToast({
      message: 'Compromiso completado',
      duration: 5000,
      onUndo: () => {
        // Revert optimistic update
        setInstancias(prev =>
          prev.map(i => i.id === id ? { ...i, estado: 'PENDIENTE', completadaAt: null } : i)
        )
      },
      onConfirm: async () => {
        // Persist to server
        await fetch('/api/plan-trabajo/instancias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanciaId: id, estado: 'COMPLETADA' }),
        })
      },
    })
  }

  const sorted = [...instancias].sort((a, b) => {
    // Primary: impacto
    const impDiff = (IMPACTO_ORDER[a.template.impacto] ?? 2) - (IMPACTO_ORDER[b.template.impacto] ?? 2)
    if (impDiff !== 0) return impDiff
    // Secondary: horaLimite (null/empty → end)
    const aHora = a.template.horaLimite ?? '99:99'
    const bHora = b.template.horaLimite ?? '99:99'
    return aHora.localeCompare(bHora)
  })
  const pendientes  = sorted.filter(i => i.estado !== 'COMPLETADA' && i.estado !== 'OMITIDA')
  const completadas = sorted.filter(i => i.estado === 'COMPLETADA')
  const total = instancias.length
  const pct   = total > 0 ? Math.round((completadas.length / total) * 100) : 0

  // Group by area first, then by subarea within each area
  const pendientesByArea = pendientes.reduce((acc, inst) => {
    const areaNombre = inst.template.area.nombre
    if (!acc[areaNombre]) acc[areaNombre] = { color: inst.template.area.color, subareas: {} }
    const subNombre = inst.template.subArea.nombre
    if (!acc[areaNombre].subareas[subNombre]) acc[areaNombre].subareas[subNombre] = []
    acc[areaNombre].subareas[subNombre].push(inst)
    return acc
  }, {} as Record<string, { color: string; subareas: Record<string, Instancia[]> }>)

  const AREA_ORDER = ['Dirección', 'Administración', 'Marketing', 'Ventas', 'Producción']
  const areaKeys = Object.keys(pendientesByArea).sort(
    (a, b) => (AREA_ORDER.indexOf(a) === -1 ? 99 : AREA_ORDER.indexOf(a)) - (AREA_ORDER.indexOf(b) === -1 ? 99 : AREA_ORDER.indexOf(b))
  )

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      {/* ── Personalized Greeting ── */}
      <div className="mb-5">
        <p className="text-[10px] text-[#C9A84C] uppercase tracking-[0.2em] font-semibold">{fmtFechaLarga(fechaActual)}</p>
        <p className="text-xl font-bold text-white mt-1">
          {getGreeting()}{userName ? `, ${userName}` : ''} 👋
        </p>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-xl italic">
          &ldquo;{getFraseDelDia()}&rdquo;
        </p>
        {total > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A84C] rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{pct}%</span>
          </div>
        )}
      </div>

      {/* ── Collaboration user selector ── */}
      {usuariosEquipo.length > 1 && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setViendoUsuarioId(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              viendoUsuarioId === null
                ? 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]'
                : 'border-[#1e1e1e] text-gray-500 hover:text-gray-300 hover:border-[#333]'
            }`}
          >
            Mi día
          </button>
          {usuariosEquipo.map(u => (
            <button
              key={u.id}
              onClick={() => setViendoUsuarioId(u.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                viendoUsuarioId === u.id
                  ? 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]'
                  : 'border-[#1e1e1e] text-gray-500 hover:text-gray-300 hover:border-[#333]'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[8px] font-bold">
                {u.name[0]}
              </div>
              {u.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* ── Viewing-as banner ── */}
      {viendoUsuarioId && (() => {
        const u = usuariosEquipo.find(x => x.id === viendoUsuarioId)
        return u ? (
          <div className="mb-3 px-3 py-2 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl flex items-center gap-2">
            <span className="text-[10px] text-gray-600">Viendo el día de</span>
            <span className="text-[10px] font-medium text-white">{u.name}</span>
          </div>
        ) : null
      })()}

      {/* ── Compact Week Strip ── */}
      <div className="mb-5">
        {/* Navigation row */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => cambiarSemana(-1)}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-[#111] border border-[#1e1e1e] text-gray-500 hover:text-white hover:border-[#333] transition-colors text-sm"
          >
            ‹
          </button>
          <div className="flex gap-1 flex-1">
            {diasSemana.map(dia => {
              const diaStr = toDateStr(dia)
              const conteo = conteosSemana[diaStr]
              const isSelected = esMismaFecha(dia, fechaActual)
              const isToday = esHoy(dia)
              const diaNombre = DIAS_COMPLETO[dia.getDay()]
              const mesAbrev = MESES_ES[dia.getMonth()]
              return (
                <button
                  key={diaStr}
                  onClick={() => setFechaActual(new Date(dia))}
                  className={`flex-1 flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-[#C9A84C]/10 border border-[#C9A84C]/30'
                      : 'border border-transparent hover:border-[#1e1e1e] hover:bg-[#0d0d0d]'
                  }`}
                >
                  <span className={`text-[10px] font-semibold leading-tight ${
                    isSelected ? 'text-[#C9A84C]' : isToday ? 'text-white' : 'text-gray-500'
                  }`}>
                    {diaNombre}
                  </span>
                  <span className={`text-[10px] mt-0.5 ${
                    isSelected ? 'text-[#C9A84C]/80' : isToday ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {dia.getDate()} de {mesAbrev}
                  </span>
                  <span className={`text-[9px] mt-1 font-mono ${
                    isSelected ? 'text-[#C9A84C]/60' : 'text-gray-700'
                  }`}>
                    {loadingConteos ? '·' : (conteo !== undefined ? `${conteo} compromiso${conteo !== 1 ? 's' : ''}` : '–')}
                  </span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => cambiarSemana(+1)}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-[#111] border border-[#1e1e1e] text-gray-500 hover:text-white hover:border-[#333] transition-colors text-sm"
          >
            ›
          </button>
        </div>

        {/* Focus del día strip — only when there are tasks */}
        {total > 0 && (() => {
          const criticas = pendientes.filter(i => i.template.impacto === 'critico').length
          const altas    = pendientes.filter(i => i.template.impacto === 'alto').length
          return (
            <div className="flex items-center gap-3 px-3 py-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl">
              <span className="text-[9px] uppercase tracking-wider text-gray-700 shrink-0">Foco</span>
              <div className="h-3 w-px bg-[#1e1e1e]" />
              {criticas > 0 && (
                <span className="text-[10px] text-red-400/70">
                  {criticas} crítica{criticas !== 1 ? 's' : ''}
                </span>
              )}
              {altas > 0 && (
                <span className="text-[10px] text-orange-400/60">
                  {altas} alta{altas !== 1 ? 's' : ''}
                </span>
              )}
              {criticas === 0 && altas === 0 && (
                <span className="text-[10px] text-gray-600">Sin compromisos urgentes</span>
              )}
              <div className="flex-1" />
              <span className="text-[10px] text-gray-600">{pct}% completado</span>
            </div>
          )
        })()}
      </div>

      {/* ── Two columns ── */}
      <div className="flex gap-6 items-start">
        {/* Left — tasks (65%) */}
        <div className="flex-1 min-w-0">
          {/* ── Atrasadas — pendientes de días anteriores ── */}
          {!modoArranque && !viendoUsuarioId && atrasadas.filter(i => i.estado !== 'COMPLETADA').length > 0 && (
            <div className="mb-5 border border-amber-700/30 bg-amber-950/10 rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <span className="text-amber-400 text-base">⚠️</span>
                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
                  Sin completar de días anteriores
                </p>
                <span className="text-[10px] bg-amber-900/30 border border-amber-700/30 text-amber-400/80 px-2 py-0.5 rounded-full ml-auto">
                  {atrasadas.filter(i => i.estado !== 'COMPLETADA').length}
                </span>
              </div>
              <div className="px-4 pb-4 space-y-2">
                {atrasadas.filter(i => i.estado !== 'COMPLETADA').map(inst => {
                  const fechaOrigen = new Date(inst.fechaVencimiento)
                  const diasAtras = Math.round((Date.now() - fechaOrigen.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={inst.id} className="relative">
                      <div className="absolute -top-0 right-0 z-10 bg-amber-900/60 text-amber-300 text-[9px] px-2 py-0.5 rounded-bl-lg rounded-tr-xl border-l border-b border-amber-700/30 font-medium">
                        {diasAtras === 1 ? 'ayer' : `hace ${diasAtras} días`}
                      </div>
                      <MiDiaItem instancia={inst} onToggle={handleToggleAtrasada} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-gray-600 text-sm">Cargando compromisos del día...</div>
          ) : instancias.length === 0 ? (
            <div className="bg-[#111] border border-dashed border-[#2a2a2a] rounded-2xl p-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-white font-semibold mb-1">No hay compromisos generados para este día</p>
              <p className="text-gray-500 text-sm mb-6">
                Genera las instancias del día a partir del plan de actividades.
              </p>
              <button
                onClick={handleGenerar}
                disabled={generando}
                className="bg-[#C9A84C] text-black font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#d4b060] disabled:opacity-50 transition-colors"
              >
                {generando ? 'Generando...' : 'Generar compromisos →'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pendientes — grouped by subArea */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Mis compromisos del día
                  </p>
                  <span className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 px-2 py-0.5 rounded-full">
                    {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {pendientes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    🎉 ¡Todo completado por hoy!
                  </div>
                ) : (
                  <div>
                    {areaKeys.map((areaNombre, areaIdx) => {
                      const { color, subareas } = pendientesByArea[areaNombre]
                      const subKeys = Object.keys(subareas)
                      const areaColor = color || '#6B7280'
                      return (
                        <div key={areaNombre} className={areaIdx > 0 ? 'mt-8' : ''}>
                          {/* Area header */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: areaColor }} />
                            <span className="text-xs font-semibold text-white">{areaNombre}</span>
                            <div className="h-px flex-1 bg-[#1a1a1a]" />
                            <span className="text-[9px] text-gray-700">{Object.values(subareas).flat().length}</span>
                          </div>
                          {/* Subareas */}
                          {subKeys.map((subNombre, subIdx) => {
                            const collapseKey = `${areaNombre}__${subNombre}`
                            const isCollapsed = collapsedSubareas.has(collapseKey)
                            const toggleCollapse = () => setCollapsedSubareas(prev => {
                              const next = new Set(prev)
                              if (next.has(collapseKey)) next.delete(collapseKey)
                              else next.add(collapseKey)
                              return next
                            })
                            return (
                              <div key={subNombre} className={subIdx > 0 ? 'mt-5' : ''}>
                                <button
                                  type="button"
                                  onClick={toggleCollapse}
                                  className="flex items-center gap-2 w-full text-left group mb-2 pl-4"
                                >
                                  <p className="text-[9px] uppercase tracking-[0.1em] text-gray-600 group-hover:text-gray-400 transition-colors flex-1">{subNombre}</p>
                                  <span className="text-[9px] text-gray-700 group-hover:text-gray-500 transition-colors">
                                    {isCollapsed ? `▶ ${subareas[subNombre].length}` : '▼'}
                                  </span>
                                </button>
                                {!isCollapsed && (
                                  <div className="space-y-2">
                                    {subareas[subNombre].map(inst => (
                                      <MiDiaItem key={inst.id} instancia={inst} onToggle={handleToggle} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Completadas — flat list */}
              {completadas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                    ✓ Completadas ({completadas.length})
                  </p>
                  <div className="space-y-2">
                    {completadas.map(inst => (
                      <MiDiaItem key={inst.id} instancia={inst} onToggle={handleToggle} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel — fixed width, desktop only */}
        <div className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
          {/* Circular progress */}
          <CircularProgress pct={pct} completadas={completadas.length} total={total} />

          {/* Day stats panel */}
          <DayPanel pct={pct} completadas={completadas.length} total={total} />

          {/* Tomorrow preview */}
          {manana.length > 0 && (
            <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-3">Mañana</p>
              <div className="space-y-2">
                {manana.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-1 h-4 rounded-full shrink-0 ${
                      t.impacto === 'critico' ? 'bg-red-500/40' :
                      t.impacto === 'alto' ? 'bg-orange-400/40' : 'bg-[#2a2a2a]'
                    }`} />
                    <p className="text-xs text-gray-500 leading-snug truncate">{t.nombre}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
