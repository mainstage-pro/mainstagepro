'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

// ── Types (espejo de src/lib/rendimiento) ──────────────────────────────────────
type FuenteKey = 'EVENTO' | 'EMPRESA' | 'TRATO' | 'NORMAL'
type Verif = { requieren: number; verificadas: number; rechazadas: number; pendientes: number }
type TareaDet = {
  id: string; titulo: string; prioridad: string; fuente: FuenteKey
  contexto: string | null; fechaCompromiso: string | null
  estado: string; diasAtraso: number; verificacion: string
}
type Usuario = {
  id: string; name: string; area: string | null
  total: number; completadas: number; aTiempo: number; tarde: number
  vencidas: number; pendientesVigentes: number
  pctEjecucion: number; pctPuntualidad: number; cumplimiento: number; atrasoPromedio: number
  porFuente: Record<FuenteKey, { total: number; completadas: number }>
  verificacion: Verif; criticas: TareaDet[]; pendientes: TareaDet[]
}
type Fuente = { fuente: FuenteKey; label: string; total: number; completadas: number; aTiempo: number; vencidas: number; cumplimiento: number }
type Semana = { semana: string; label: string; total: number; completadas: number; aTiempo: number; pctEjecucion: number; cumplimiento: number }
type Resumen = {
  total: number; completadas: number; aTiempo: number; tarde: number
  vencidas: number; pendientesVigentes: number
  pctEjecucion: number; pctPuntualidad: number; cumplimiento: number
  atrasoPromedio: number; sinFecha: number; sinResponsable: number
}
type Data = {
  periodo: { desde: string; hasta: string; label: string }
  resumen: Resumen; usuarios: Usuario[]; fuentes: Fuente[]
  tendencia: Semana[]; verificacion: Verif; currentUserId: string
}

// ── Constants ──────────────────────────────────────────────────────────────────
type Preset = 'semana' | 'semana-pasada' | '4-semanas' | 'mes'
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'semana', label: 'Esta semana' },
  { key: 'semana-pasada', label: 'Semana pasada' },
  { key: '4-semanas', label: 'Últimas 4 sem.' },
  { key: 'mes', label: 'Este mes' },
]
const PRIO_COLOR: Record<string, string> = { URGENTE: '#f87171', ALTA: '#fb923c', MEDIA: '#B3985B', BAJA: '#4b5563' }
const FUENTE_LABEL: Record<FuenteKey, string> = {
  EVENTO: 'Proyectos de evento', EMPRESA: 'Proyectos de empresa', TRATO: 'Tratos', NORMAL: 'Tareas',
}

function perfClass(p: number): string {
  return p >= 80 ? 'text-green-400' : p >= 50 ? 'text-[#B3985B]' : 'text-red-400'
}
function perfBar(p: number): string {
  return p >= 80 ? '#4ade80' : p >= 50 ? '#B3985B' : '#f87171'
}
function fmtFecha(f: string | null): string {
  if (!f) return ''
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// ── Component ──────────────────────────────────────────────────────────────────
export function VistaRendimiento() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<Preset>('semana')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [pdfGeneral, setPdfGeneral] = useState(false)
  const [pdfUser, setPdfUser] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/operaciones/rendimiento?preset=${preset}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [preset])

  const downloadPdf = useCallback(async (tipo: 'general' | 'usuario', userId?: string) => {
    if (tipo === 'general') setPdfGeneral(true); else setPdfUser(userId!)
    try {
      const qs = new URLSearchParams({ tipo, preset })
      if (userId) qs.set('userId', userId)
      const res = await fetch(`/api/operaciones/rendimiento/pdf?${qs}`)
      if (!res.ok) { alert('Error al generar PDF'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'reporte.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfGeneral(false); setPdfUser(null)
    }
  }, [preset])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64"><div className="text-[#333] text-sm">Cargando métricas...</div></div>
  }
  if (!data) {
    return <div className="flex items-center justify-center h-64"><div className="text-[#333] text-sm">Error al cargar datos</div></div>
  }

  const r = data.resumen
  const v = data.verificacion

  return (
    <div className="p-6 max-w-5xl space-y-6 overflow-y-auto h-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-[#B3985B] uppercase tracking-[0.2em] font-semibold">Gestión operativa</p>
          <h1 className="ms-h1 mt-1">Rendimiento del equipo</h1>
          <p className="text-xs text-[#444] mt-1">
            {data.periodo.label} · Solo tareas con responsable y fecha compromiso.
            {r.sinResponsable > 0 && <span className="ml-1 text-[#555]">· {r.sinResponsable} sin responsable (no medibles)</span>}
          </p>
        </div>
        <button
          onClick={() => downloadPdf('general')}
          disabled={pdfGeneral}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold text-xs rounded-xl transition-all active:scale-95 disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          {pdfGeneral
            ? <><div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />Generando...</>
            : '⬇ Reporte semanal (PDF)'}
        </button>
      </div>

      {/* ── Period selector ── */}
      <div className="flex items-center gap-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1 w-fit">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              preset === p.key ? 'bg-[#B3985B] text-black' : 'text-[#666] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >{p.label}</button>
        ))}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="ms-stat-card">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">Cumplimiento</p>
          <p className={`text-2xl font-bold tabular-nums ${perfClass(r.cumplimiento)}`}>{r.cumplimiento}%</p>
          <p className="text-[10px] text-[#444] mt-1">{r.aTiempo}/{r.total} a tiempo</p>
        </div>
        <div className="ms-stat-card">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">Ejecución</p>
          <p className={`text-2xl font-bold tabular-nums ${perfClass(r.pctEjecucion)}`}>{r.pctEjecucion}%</p>
          <p className="text-[10px] text-[#444] mt-1">{r.completadas}/{r.total} completadas</p>
        </div>
        <div className="ms-stat-card">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">Puntualidad</p>
          <p className={`text-2xl font-bold tabular-nums ${perfClass(r.pctPuntualidad)}`}>{r.pctPuntualidad}%</p>
          <p className="text-[10px] text-[#444] mt-1">{r.tarde} entregadas tarde</p>
        </div>
        <div className="ms-stat-card">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">Vencidas</p>
          <p className={`text-2xl font-bold tabular-nums ${r.vencidas > 0 ? 'text-red-400' : 'text-green-400'}`}>{r.vencidas}</p>
          <p className="text-[10px] text-[#444] mt-1">sin completar</p>
        </div>
        <div className="ms-stat-card">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">En curso</p>
          <p className="text-2xl font-bold tabular-nums text-[#B3985B]">{r.pendientesVigentes}</p>
          <p className="text-[10px] text-[#444] mt-1">pendientes vigentes</p>
        </div>
      </div>

      {/* ── Trend ── */}
      <div className="ms-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444]">Tendencia · últimas 8 semanas</p>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1 text-[#666]"><span className="w-2 h-2 rounded-sm bg-[#B3985B] inline-block" />Cumplimiento %</span>
            <span className="flex items-center gap-1 text-[#666]"><span className="w-2 h-0.5 bg-[#4b7bec] inline-block" />Ejecución %</span>
          </div>
        </div>
        {data.tendencia.every(sw => sw.total === 0) ? (
          <p className="text-[#333] text-sm text-center py-8">Sin datos en el rango</p>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={data.tendencia}>
              <XAxis dataKey="label" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#888' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((val: number, name: string) => [`${val}%`, name === 'cumplimiento' ? 'Cumplimiento' : 'Ejecución']) as any}
              />
              <Bar dataKey="cumplimiento" fill="#B3985B" radius={[3, 3, 0, 0]} maxBarSize={34} />
              <Line dataKey="pctEjecucion" stroke="#4b7bec" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Per-user ── */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-4">Eficiencia por responsable</p>
        {data.usuarios.length === 0 ? (
          <p className="text-[#333] text-sm">Sin tareas comprometidas en el período</p>
        ) : (
          <div className="space-y-2">
            {data.usuarios.map(u => {
              const isExpanded = expanded.has(u.id)
              const isMe = u.id === data.currentUserId
              const hasDrill = u.criticas.length > 0 || u.pendientes.length > 0
              return (
                <div key={u.id} className="rounded-xl border border-[#1e1e1e] overflow-hidden">
                  <div className={`w-full flex items-center gap-3 px-4 py-3 ${isExpanded ? 'bg-[#161616]' : 'bg-[#0d0d0d]'}`}>
                    <button
                      onClick={() => hasDrill && toggle(u.id)}
                      className={`flex items-center gap-3 flex-1 min-w-0 ${hasDrill ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        isMe ? 'bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/30' : 'bg-[#1a1a1a] text-[#555] border border-[#222]'
                      }`}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`text-sm text-left truncate ${isMe ? 'text-white font-medium' : 'text-[#888]'}`}>{u.name.split(' ')[0]}</span>
                      {u.vencidas > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-900/40 text-red-400 bg-red-950/20 tabular-nums shrink-0">
                          {u.vencidas} vencida{u.vencidas !== 1 ? 's' : ''}
                        </span>
                      )}
                      {u.tarde > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-orange-900/40 text-orange-400 bg-orange-950/20 tabular-nums shrink-0 hidden sm:inline">
                          {u.tarde} tarde
                        </span>
                      )}
                    </button>

                    {/* Stats */}
                    <span className="text-[10px] text-[#444] tabular-nums shrink-0 hidden sm:block">{u.aTiempo}/{u.total} a tiempo</span>
                    <span className={`text-sm font-semibold tabular-nums min-w-[40px] text-right shrink-0 ${perfClass(u.cumplimiento)}`}>{u.cumplimiento}%</span>

                    <button
                      onClick={() => downloadPdf('usuario', u.id)}
                      disabled={pdfUser === u.id}
                      title="Descargar reporte individual"
                      className="text-[#555] hover:text-[#B3985B] transition-colors shrink-0 text-xs disabled:opacity-40"
                    >
                      {pdfUser === u.id ? <span className="inline-block w-3 h-3 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" /> : '⬇'}
                    </button>
                    {hasDrill && (
                      <button onClick={() => toggle(u.id)} className="text-[#333] text-[10px] shrink-0" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</button>
                    )}
                  </div>

                  <div className="h-0.5 bg-[#1a1a1a]">
                    <div className="h-full transition-all duration-500" style={{ width: `${u.cumplimiento}%`, backgroundColor: perfBar(u.cumplimiento) }} />
                  </div>

                  {isExpanded && hasDrill && (
                    <div className="border-t border-[#1a1a1a] bg-[#080808]">
                      {u.criticas.length > 0 && (
                        <div className="divide-y divide-[#111]">
                          <p className="px-4 pt-3 pb-1 text-[9px] uppercase tracking-wider text-red-400/60">Vencidas / entregadas tarde</p>
                          {u.criticas.map(t => (
                            <div key={t.id} className="flex items-center gap-3 px-4 py-2">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIO_COLOR[t.prioridad] ?? '#555' }} />
                              <span className="text-xs text-[#888] flex-1 min-w-0 truncate">{t.titulo}</span>
                              {t.contexto && <span className="text-[9px] text-[#444] shrink-0 hidden sm:block truncate max-w-[120px]">{t.contexto}</span>}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${t.estado === 'COMPLETADA' ? 'text-orange-400 border-orange-900/40 bg-orange-950/20' : 'text-red-400 border-red-900/40 bg-red-950/20'}`}>
                                {t.estado === 'COMPLETADA' ? 'tarde' : 'vencida'} {t.diasAtraso}d
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {u.pendientes.length > 0 && (
                        <div className="divide-y divide-[#111] border-t border-[#111]">
                          <p className="px-4 pt-3 pb-1 text-[9px] uppercase tracking-wider text-[#555]">Pendientes vigentes</p>
                          {u.pendientes.map(t => (
                            <div key={t.id} className="flex items-center gap-3 px-4 py-2">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIO_COLOR[t.prioridad] ?? '#555' }} />
                              <span className="text-xs text-[#888] flex-1 min-w-0 truncate">{t.titulo}</span>
                              {t.contexto && <span className="text-[9px] text-[#444] shrink-0 hidden sm:block truncate max-w-[120px]">{t.contexto}</span>}
                              {t.fechaCompromiso && <span className="text-[9px] text-[#444] shrink-0 tabular-nums">{fmtFecha(t.fechaCompromiso)}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Por fuente + Verificación ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-4">Por fuente de tarea</p>
          {data.fuentes.length === 0 ? (
            <p className="text-[#333] text-sm">Sin tareas medibles</p>
          ) : (
            <div className="space-y-3">
              {data.fuentes.map(f => (
                <div key={f.fuente}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#666]">{FUENTE_LABEL[f.fuente]}</span>
                    <div className="flex items-center gap-2">
                      {f.vencidas > 0 && <span className="text-[10px] text-red-400 tabular-nums">{f.vencidas} venc.</span>}
                      <span className="text-[10px] text-[#444] tabular-nums">{f.completadas}/{f.total}</span>
                      <span className={`text-[10px] font-semibold tabular-nums min-w-[32px] text-right ${perfClass(f.cumplimiento)}`}>{f.cumplimiento}%</span>
                    </div>
                  </div>
                  <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${f.cumplimiento}%`, backgroundColor: perfBar(f.cumplimiento) }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-4">Verificación de evidencia</p>
          {v.requieren === 0 ? (
            <p className="text-[#333] text-sm">Ninguna tarea completada requería evidencia en el período.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-3">
                <p className="text-[10px] text-[#444]">Requieren evidencia</p>
                <p className="text-xl font-bold text-white tabular-nums">{v.requieren}</p>
              </div>
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-3">
                <p className="text-[10px] text-[#444]">Verificadas</p>
                <p className="text-xl font-bold text-green-400 tabular-nums">{v.verificadas}</p>
              </div>
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-3">
                <p className="text-[10px] text-[#444]">Por verificar</p>
                <p className="text-xl font-bold text-[#B3985B] tabular-nums">{v.pendientes}</p>
              </div>
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-3">
                <p className="text-[10px] text-[#444]">Rechazadas</p>
                <p className="text-xl font-bold text-red-400 tabular-nums">{v.rechazadas}</p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
