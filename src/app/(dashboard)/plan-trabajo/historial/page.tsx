'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock } from 'lucide-react'
import { getAreaColor } from '@/lib/areaColors'

// ── Types ─────────────────────────────────────────────────────────────────────

type InstanciaHistorial = {
  id: string
  templateId: string
  estado: 'PENDIENTE' | 'COMPLETADA' | 'EN_PROGRESO' | 'VENCIDA' | 'OMITIDA'
  completadaAt: string | null
  esEntregable: boolean
  responsable: { id: string; name: string } | null
  template: {
    nombre: string
    impacto: string
    frecuencia: string
    diasSemana: number[]
    descripcion: string | null
    porqueSeHace: string | null
    siNoSeHace: string | null
    area: { nombre: string; color: string; icono: string }
    subArea: { nombre: string } | null
  }
}

type DiaHabil = {
  fecha: string
  diaNombre: string
  diaCorto: string
  instancias: InstanciaHistorial[]
}

type Resumen = {
  total: number
  completadas: number
  pendientes: number
  pct: number
  porArea: { area: string; color: string; total: number; completadas: number; pct: number }[]
  porImpacto: { impacto: string; total: number; completadas: number; pct: number }[]
  racha: number
  criticasTotal: number
  criticasCompletadas: number
}

type SemanaData = {
  semana: string
  diasHabiles: DiaHabil[]
  resumen: Resumen
}

type Incumplimiento = {
  templateId: string
  nombre: string
  area: string
  color: string
  responsable: string | null
  semanasIncumplidas: number
  historial: ('completada' | 'pendiente' | 'sin-datos')[]
}

type Usuario = { id: string; name: string; area?: string | null }

const IMPACTO_META: Record<string, { label: string; color: string; dotCls: string }> = {
  critico:  { label: 'Crítico',  color: '#f87171', dotCls: 'bg-red-500'    },
  alto:     { label: 'Alto',     color: '#fb923c', dotCls: 'bg-orange-400'  },
  estandar: { label: 'Estándar', color: '#555',    dotCls: 'bg-[#444]'     },
}

const AREAS_PLAN = [
  'Dirección', 'Ventas', 'Producción', 'Marketing', 'Administración', 'RRHH',
]
const displayArea = (n: string) => (n === 'Ventas' ? 'Comercial' : n)

function fmtHora(iso: string | null): string {
  if (!iso) return ''
  // Convert UTC to Mexico City (UTC-6)
  const d = new Date(iso)
  const offset = -6 * 60
  const local = new Date(d.getTime() + offset * 60 * 1000)
  return local.toISOString().slice(11, 16)
}

function getLunesAnterior(): string {
  const now = new Date()
  const dow = now.getDay()
  const lunes = new Date(now)
  lunes.setDate(now.getDate() - ((dow + 6) % 7) - 7)
  return lunes.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function addWeeks(lunesStr: string, n: number): string {
  const d = new Date(lunesStr + 'T12:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toLocaleDateString('en-CA')
}

function fmtSemanaLabel(lunesStr: string): string {
  const lunes = new Date(lunesStr + 'T12:00:00')
  const viernes = new Date(lunes)
  viernes.setDate(lunes.getDate() + 4)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${lunes.toLocaleDateString('es-MX', opts)} — ${viernes.toLocaleDateString('es-MX', opts)}`
}

function isHoy(fechaStr: string): boolean {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  return fechaStr === hoy
}

function esPasado(fechaStr: string): boolean {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  return fechaStr < hoy
}

// ── ExpandableRow ─────────────────────────────────────────────────────────────

function ExpandableRow({ inst, esDiaPasado }: {
  inst: InstanciaHistorial
  esDiaPasado: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const completada = inst.estado === 'COMPLETADA'
  const pendientePasado = !completada && esDiaPasado
  const impacto = IMPACTO_META[inst.template.impacto] ?? IMPACTO_META.estandar

  return (
    <div className={`border-b border-[#111] last:border-0 ${pendientePasado ? 'bg-red-950/5' : ''}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#0f0f0f] transition-colors text-left"
      >
        {/* Status indicator */}
        <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold border-2 transition-colors ${
          completada
            ? 'bg-[#10B981] border-[#10B981] text-white'
            : pendientePasado
            ? 'bg-red-500/80 border-red-500/80 text-white'
            : 'border-[#2a2a2a] bg-transparent'
        }`}>
          {completada && '✓'}
          {pendientePasado && '×'}
        </div>

        {/* Task name */}
        <span className={`flex-1 text-sm min-w-0 truncate ${
          completada
            ? 'text-[#666] line-through'
            : pendientePasado
            ? 'text-[#777] line-through'
            : 'text-white font-medium'
        }`}>{inst.template.nombre}</span>

        {/* Chips: impacto (solo crítico/alto) */}
        {inst.template.impacto !== 'estandar' && (
          <span className="flex items-center gap-1 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${impacto.dotCls}`} />
            <span className="text-[9px] text-[#555] hidden sm:block">{impacto.label}</span>
          </span>
        )}

        {/* Responsable avatar */}
        {inst.responsable && (
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
            style={{ backgroundColor: inst.template.area.color + '22', color: inst.template.area.color, border: `1px solid ${inst.template.area.color}44` }}
            title={inst.responsable.name}
          >
            {inst.responsable.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        )}

        {/* Right: hora o badge */}
        <div className="shrink-0 min-w-[60px] text-right">
          {completada && inst.completadaAt && (
            <span className="text-[10px] text-[#444] tabular-nums">{fmtHora(inst.completadaAt)}</span>
          )}
          {pendientePasado && (
            <span className="text-[9px] px-1.5 py-0.5 rounded border border-red-900/30 bg-red-950/20 text-red-400/70">
              No completada
            </span>
          )}
        </div>

        <span className="text-[#333] text-[9px] shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-[#111] space-y-2 bg-[#080808]">
          {inst.template.descripcion && (
            <p className="text-xs text-[#777]">
              <span className="text-[#444] mr-1">Descripción:</span>{inst.template.descripcion}
            </p>
          )}
          {inst.template.porqueSeHace && (
            <p className="text-xs text-[#777]">
              <span className="text-[#444] mr-1">Por qué:</span>{inst.template.porqueSeHace}
            </p>
          )}
          {inst.template.siNoSeHace && (
            <p className="text-xs text-red-400/60">
              <span className="text-red-400/40 mr-1">Si no se hace:</span>{inst.template.siNoSeHace}
            </p>
          )}
          {inst.template.subArea && (
            <p className="text-[10px] text-[#444]">Área: {inst.template.area.nombre} · {inst.template.subArea.nombre}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HistorialPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── State ─────────────────────────────────────────────────────────────────
  const [semana, setSemana] = useState(() => searchParams.get('semana') ?? getLunesAnterior())
  const [usuarioId, setUsuarioId] = useState(() => searchParams.get('usuario') ?? 'todos')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroImpacto, setFiltroImpacto] = useState<string[]>([])

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [semanaData, setSemanaData] = useState<SemanaData | null>(null)
  const [incumplimientos, setIncumplimientos] = useState<Incumplimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingInc, setLoadingInc] = useState(true)
  const [sinAcceso, setSinAcceso] = useState(false)
  const [expandIncumplimientos, setExpandIncumplimientos] = useState(true)

  // Limit: 12 weeks back from today
  const lunesMin = useMemo(() => addWeeks(getLunesAnterior(), -11), [])
  const lunesMax = useMemo(() => getLunesAnterior(), [])

  // ── Load users ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/usuarios')
      .then(r => r.json())
      .then((d: { usuarios?: Usuario[] }) => setUsuarios(d.usuarios ?? []))
      .catch(() => {})
  }, [])

  // ── Load semana data ──────────────────────────────────────────────────────
  const loadSemana = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/plan-trabajo/instancias/semana-detalle?lunes=${semana}&usuarioId=${usuarioId}`)
      if (res.status === 403) { setSinAcceso(true); setLoading(false); return }
      const d = await res.json() as SemanaData
      setSemanaData(d)
    } catch { /* silently fail */ }
    setLoading(false)
  }, [semana, usuarioId])

  const loadIncumplimientos = useCallback(async () => {
    setLoadingInc(true)
    try {
      const res = await fetch(`/api/plan-trabajo/incumplimientos?usuarioId=${usuarioId}&semanas=4`)
      const d = await res.json() as { incumplimientos?: Incumplimiento[] }
      setIncumplimientos(d.incumplimientos ?? [])
    } catch { /* silently fail */ }
    setLoadingInc(false)
  }, [usuarioId])

  useEffect(() => { void loadSemana() }, [loadSemana])
  useEffect(() => { void loadIncumplimientos() }, [loadIncumplimientos])

  // Update URL
  useEffect(() => {
    const params = new URLSearchParams({ semana, usuario: usuarioId })
    router.replace(`/plan-trabajo/historial?${params}`, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semana, usuarioId])

  // ── Computed ──────────────────────────────────────────────────────────────
  const diasFiltrados = useMemo(() => {
    if (!semanaData) return []
    return semanaData.diasHabiles.map(dia => ({
      ...dia,
      instancias: dia.instancias.filter(inst => {
        if (filtroArea && inst.template.area.nombre !== filtroArea) return false
        if (filtroImpacto.length > 0 && !filtroImpacto.includes(inst.template.impacto ?? 'estandar')) return false
        return true
      }),
    }))
  }, [semanaData, filtroArea, filtroImpacto])

  // ── No access ──────────────────────────────────────────────────────────────
  if (sinAcceso) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Lock strokeWidth={1.5} className="w-7 h-7 text-gray-500" />
        <p className="text-white font-semibold">Solo disponible para Dirección</p>
        <p className="text-[#444] text-sm">Esta sección es exclusiva para el rol Admin / Director.</p>
      </div>
    )
  }

  const resumen = semanaData?.resumen
  const pctColor = (pct: number) => pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden">

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r border-[#111] flex flex-col bg-[#060606] overflow-y-auto">

        {/* User selector */}
        <div className="p-3 border-b border-[#111]">
          <p className="text-[9px] text-[#333] uppercase tracking-[0.15em] font-semibold mb-2">Usuario</p>
          <div className="flex flex-wrap gap-1.5">
            {/* Todos chip */}
            <button
              onClick={() => setUsuarioId('todos')}
              className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                usuarioId === 'todos'
                  ? 'bg-[#c9a96a]/15 border-[#c9a96a]/40 text-[#c9a96a]'
                  : 'border-[#1e1e1e] text-[#444] hover:text-[#777]'
              }`}
            >
              Todos
            </button>
            {usuarios.map(u => {
              const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              const isActive = usuarioId === u.id
              const color = getAreaColor(u.area ?? '')
              return (
                <button
                  key={u.id}
                  onClick={() => setUsuarioId(u.id)}
                  title={u.name}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all border"
                  style={{
                    backgroundColor: isActive ? color + '22' : 'transparent',
                    borderColor: isActive ? color + '88' : '#1e1e1e',
                    color: isActive ? color : '#444',
                  }}
                >
                  {initials}
                </button>
              )
            })}
          </div>
        </div>

        {/* Week selector */}
        <div className="p-3 border-b border-[#111]">
          <p className="text-[9px] text-[#333] uppercase tracking-[0.15em] font-semibold mb-2">Semana</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSemana(s => addWeeks(s, -1))}
              disabled={semana <= lunesMin}
              className="w-6 h-6 flex items-center justify-center rounded text-[#333] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-all"
            >←</button>
            <span className="text-[10px] text-[#555] flex-1 text-center leading-tight">{fmtSemanaLabel(semana)}</span>
            <button
              onClick={() => setSemana(s => addWeeks(s, 1))}
              disabled={semana >= lunesMax}
              className="w-6 h-6 flex items-center justify-center rounded text-[#333] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-all"
            >→</button>
          </div>
        </div>

        {/* Area filter */}
        <div className="p-3 border-b border-[#111]">
          <p className="text-[9px] text-[#333] uppercase tracking-[0.15em] font-semibold mb-2">Área</p>
          <select
            value={filtroArea}
            onChange={e => setFiltroArea(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-2 py-1.5 text-xs text-[#666] focus:outline-none focus:border-[#c9a96a]/30"
          >
            <option value="">Todas las áreas</option>
            {AREAS_PLAN.map(a => <option key={a} value={a}>{displayArea(a)}</option>)}
          </select>
        </div>

        {/* Impact filter */}
        <div className="p-3">
          <p className="text-[9px] text-[#333] uppercase tracking-[0.15em] font-semibold mb-2">Impacto</p>
          <div className="flex flex-col gap-1.5">
            {['critico', 'alto', 'estandar'].map(imp => {
              const meta = IMPACTO_META[imp]!
              const active = filtroImpacto.length === 0 || filtroImpacto.includes(imp)
              return (
                <button
                  key={imp}
                  onClick={() => {
                    setFiltroImpacto(prev => {
                      if (prev.length === 0) return ['critico', 'alto', 'estandar'].filter(x => x !== imp)
                      if (prev.includes(imp)) return prev.filter(x => x !== imp)
                      const next = [...prev, imp]
                      if (next.length === 3) return []
                      return next
                    })
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                    active ? 'border-[#2a2a2a] text-[#999]' : 'border-transparent text-[#333]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? meta.color : '#2a2a2a' }} />
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>

      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-[#333] text-sm">Cargando historial...</p>
          </div>
        ) : !semanaData ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-[#444] text-sm">Sin datos para esta semana</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">

            {/* ── KPI Cards ── */}
            {resumen && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
                  <p className="text-[9px] text-[#444] uppercase tracking-wider mb-1">Completadas</p>
                  <p className="ms-h1 tabular-nums">
                    {resumen.completadas}<span className="text-sm text-[#444] ml-1">/{resumen.total}</span>
                  </p>
                </div>
                <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
                  <p className="text-[9px] text-[#444] uppercase tracking-wider mb-1">Cumplimiento</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color: pctColor(resumen.pct) }}>
                    {resumen.pct}%
                  </p>
                </div>
                <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
                  <p className="text-[9px] text-[#444] uppercase tracking-wider mb-1">Críticas completadas</p>
                  <p className="ms-h1 tabular-nums">
                    {resumen.criticasCompletadas}<span className="text-sm text-[#444] ml-1">/{resumen.criticasTotal}</span>
                  </p>
                </div>
                <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
                  <p className="text-[9px] text-[#444] uppercase tracking-wider mb-1">Racha</p>
                  <p className="ms-h1 tabular-nums">
                    {resumen.racha}
                    <span className="text-sm text-[#444] ml-1">día{resumen.racha !== 1 ? 's' : ''}</span>
                  </p>
                </div>
              </div>
            )}

            {/* ── Days ── */}
            {diasFiltrados.map(dia => {
              const pasado = esPasado(dia.fecha)
              const hoy = isHoy(dia.fecha)

              // Group by area
              const byArea = new Map<string, { color: string; instancias: InstanciaHistorial[] }>()
              for (const inst of dia.instancias) {
                const key = inst.template.area.nombre
                if (!byArea.has(key)) byArea.set(key, { color: inst.template.area.color, instancias: [] })
                byArea.get(key)!.instancias.push(inst)
              }

              return (
                <div key={dia.fecha}>
                  {/* Day header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-semibold text-[#444] uppercase tracking-[0.15em]">
                      {dia.diaNombre} {new Date(dia.fecha + 'T12:00:00').getDate()}
                    </span>
                    <span className="text-[10px] text-[#333]">· {dia.instancias.length} compromisos</span>
                    {hoy && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#c9a96a]/30 bg-[#c9a96a]/10 text-[#c9a96a] font-semibold">HOY</span>
                    )}
                    {!hoy && !pasado && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#2a2a2a] text-[#444]">PRÓXIMO</span>
                    )}
                    <div className="flex-1 h-px bg-[#111]" />
                  </div>

                  {dia.instancias.length === 0 ? (
                    <p className="text-[#2a2a2a] text-xs px-1 mb-4">Sin compromisos para este día con los filtros actuales</p>
                  ) : (
                    <div className="space-y-3 mb-6">
                      {[...byArea.entries()].map(([area, { color, instancias: areaInsts }]) => (
                        <div key={area} className="bg-[#0d0d0d] border border-[#111] rounded-xl overflow-hidden">
                          {/* Area header */}
                          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#111]" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#444]">{displayArea(area)}</span>
                            <span className="text-[10px] text-[#333]">{areaInsts.length}</span>
                          </div>
                          {/* Tasks */}
                          {areaInsts.map(inst => (
                            <ExpandableRow
                              key={inst.id}
                              inst={inst}
                              esDiaPasado={pasado}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* ── Incumplimientos recurrentes ── */}
            {!loadingInc && incumplimientos.length > 0 && (
              <div className="bg-[#0a0808] border border-red-900/20 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandIncumplimientos(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-950/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400/70">Compromisos con incumplimiento recurrente</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/20 text-red-400/70 border border-red-900/30">{incumplimientos.length}</span>
                  </div>
                  <span className="text-red-400/40 text-[10px]">{expandIncumplimientos ? '▲' : '▼'}</span>
                </button>

                {expandIncumplimientos && (
                  <div className="divide-y divide-red-900/10">
                    {incumplimientos.map(inc => (
                      <div key={`${inc.templateId}-${inc.responsable ?? 'all'}`} className="flex items-center gap-4 px-5 py-3">
                        {/* Dot color area */}
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: inc.color }} />

                        {/* Name */}
                        <span className="text-sm text-[#888] flex-1 min-w-0 truncate">{inc.nombre}</span>

                        {/* Responsable (si es todos) */}
                        {usuarioId === 'todos' && inc.responsable && (
                          <span className="text-[10px] text-[#444] shrink-0 hidden sm:block">{inc.responsable.split(' ')[0]}</span>
                        )}

                        {/* Weeks label */}
                        <span className="text-[10px] text-red-400/60 shrink-0 tabular-nums">{inc.semanasIncumplidas} semanas seguidas</span>

                        {/* 4-square visual */}
                        <div className="flex gap-1 shrink-0">
                          {inc.historial.map((estado, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 rounded-sm"
                              title={estado}
                              style={{
                                backgroundColor:
                                  estado === 'completada' ? '#10B981'
                                  : estado === 'pendiente' ? '#EF444488'
                                  : '#1a1a1a',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
