'use client'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES_PDF = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
function defaultMesPDF() {
  const d = new Date(), p = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`
}
function navMesPDF(mes: string, delta: number) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function mesLabelPDF(mes: string) {
  const [y, m] = mes.split('-')
  return `${MESES_PDF[parseInt(m) - 1]} ${y}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SemanaData = { semana: string; label: string; total: number; completadas: number; pct: number }

type TareaPendiente = {
  id: string
  titulo: string
  prioridad: string
  fecha: string | null
  estado: string
  proyecto: string | null
}

type UsuarioData = {
  id: string
  name: string
  total: number
  completadas: number
  pendientes: number
  pct: number
  tareasPendientes: TareaPendiente[]
}

type PrioData = { prioridad: string; total: number; completadas: number; pct: number }

type Data = {
  semanas: SemanaData[]
  usuarios: UsuarioData[]
  prioridades: PrioData[]
  noMedibles: number
  totalMedibles: number
  totalCompletadas: number
  pctGeneral: number
  currentUserId: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIO_META: Record<string, { label: string; color: string }> = {
  URGENTE: { label: 'Urgente', color: '#f87171' },
  ALTA:    { label: 'Alta',    color: '#fb923c' },
  MEDIA:   { label: 'Media',   color: '#B3985B' },
  BAJA:    { label: 'Baja',    color: '#4b5563' },
}

const ESTADO_META: Record<string, { label: string; cls: string }> = {
  EN_PROGRESO: { label: 'En progreso', cls: 'text-blue-400 bg-blue-900/20 border-blue-800/30' },
  PENDIENTE:   { label: 'Pendiente',   cls: 'text-[#555] bg-[#111] border-[#1e1e1e]' },
}

function fmtFecha(f: string | null): string {
  if (!f) return ''
  const d = new Date(f + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// ── Component ──────────────────────────────────────────────────────────────────

export function VistaRendimiento() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [mesPdf, setMesPdf] = useState(defaultMesPDF)
  const [generandoPdf, setGenerandoPdf] = useState(false)

  const hoy = new Date()
  const mesActualStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const canNext = mesPdf < mesActualStr

  useEffect(() => {
    fetch('/api/operaciones/rendimiento')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function downloadPdf() {
    setGenerandoPdf(true)
    try {
      const res = await fetch(`/api/operaciones/reporte-mensual/pdf?mes=${mesPdf}`)
      if (!res.ok) { alert('Error al generar PDF'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href = url
      a.download = `Reporte-Tareas-${mesPdf}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerandoPdf(false)
    }
  }

  function toggleUser(id: string) {
    setExpandedUsers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#333] text-sm">Cargando métricas...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#333] text-sm">Error al cargar datos</div>
      </div>
    )
  }

  const semanaActual = data.semanas[data.semanas.length - 1]

  return (
    <div className="p-6 max-w-5xl space-y-6 overflow-y-auto h-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-[#B3985B] uppercase tracking-[0.2em] font-semibold">Módulo de tareas</p>
          <h1 className="text-xl font-semibold text-white mt-1">Rendimiento operativo</h1>
          <p className="text-xs text-[#444] mt-1">
            Solo se miden tareas con responsable asignado. La fecha solo aplica para el análisis semanal.
            {data.noMedibles > 0 && (
              <span className="ml-2 text-[#555]">
                · {data.noMedibles} tarea{data.noMedibles !== 1 ? 's' : ''} sin responsable (no medibles)
              </span>
            )}
          </p>
        </div>

        {/* PDF Report Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1">
            <button onClick={() => setMesPdf(m => navMesPDF(m, -1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-[#1a1a1a] transition-colors text-sm">←</button>
            <span className="text-white text-xs font-medium px-2 min-w-[110px] text-center">{mesLabelPDF(mesPdf)}</span>
            <button onClick={() => canNext && setMesPdf(m => navMesPDF(m, 1))} disabled={!canNext}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-[#1a1a1a] transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed">→</button>
          </div>
          <button onClick={downloadPdf} disabled={generandoPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-bold text-xs rounded-xl transition-all active:scale-95 disabled:opacity-60 whitespace-nowrap">
            {generandoPdf ? (
              <><div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />Generando...</>
            ) : '⬇ PDF Mensual'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">Total medibles</p>
          <p className="text-xl font-semibold text-white tabular-nums">{data.totalMedibles}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">Completadas</p>
          <p className="text-xl font-semibold text-white tabular-nums">{data.totalCompletadas}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">% completado</p>
          <p className={`text-2xl font-bold tabular-nums ${
            data.pctGeneral >= 80 ? 'text-green-400' : data.pctGeneral >= 50 ? 'text-[#B3985B]' : 'text-red-400'
          }`}>{data.pctGeneral}%</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">Esta semana</p>
          <p className="text-xl font-semibold text-white tabular-nums">
            {semanaActual?.completadas ?? 0}/{semanaActual?.total ?? 0}
          </p>
          <p className="text-xs text-[#444] mt-1">{semanaActual?.pct ?? 0}% completado</p>
        </div>
      </div>

      {/* ── Weekly Bar Chart ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-4">Últimas 8 semanas (con fecha)</p>
        {data.semanas.every(s => s.total === 0) ? (
          <p className="text-[#333] text-sm text-center py-8">Sin datos de semanas anteriores</p>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data.semanas} barGap={4}>
              <XAxis dataKey="label" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#888' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((v: number, name: string) => [v, name === 'completadas' ? 'Completadas' : 'Total']) as any}
              />
              <Bar dataKey="total" fill="#1e1e1e" radius={[3,3,0,0]} />
              <Bar dataKey="completadas" fill="#B3985B" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Per-user — full width with collapsible pending tasks ── */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-4">Por responsable</p>
        {data.usuarios.length === 0 ? (
          <p className="text-[#333] text-sm">Sin tareas asignadas</p>
        ) : (
          <div className="space-y-2">
            {data.usuarios.map(u => {
              const isExpanded = expandedUsers.has(u.id)
              const isMe = u.id === data.currentUserId
              return (
                <div key={u.id} className="rounded-xl border border-[#1e1e1e] overflow-hidden">

                  {/* ── Row header ── */}
                  <button
                    onClick={() => u.pendientes > 0 && toggleUser(u.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                      u.pendientes > 0 ? 'cursor-pointer hover:bg-[#161616]' : 'cursor-default'
                    } ${isExpanded ? 'bg-[#161616]' : 'bg-[#0d0d0d]'}`}
                  >
                    {/* Avatar */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      isMe ? 'bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/30' : 'bg-[#1a1a1a] text-[#555] border border-[#222]'
                    }`}>
                      {u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>

                    {/* Name */}
                    <span className={`text-sm flex-1 text-left ${isMe ? 'text-white font-medium' : 'text-[#888]'}`}>
                      {u.name.split(' ')[0]}
                    </span>

                    {/* Pending badge */}
                    {u.pendientes > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2a2a2a] text-[#555] bg-[#111] tabular-nums">
                        {u.pendientes} pendiente{u.pendientes !== 1 ? 's' : ''}
                      </span>
                    )}

                    {/* Stats */}
                    <span className="text-[10px] text-[#444] tabular-nums shrink-0">{u.completadas}/{u.total}</span>
                    <span className={`text-xs font-semibold tabular-nums min-w-[36px] text-right shrink-0 ${
                      u.pct >= 80 ? 'text-green-400' : u.pct >= 50 ? 'text-[#B3985B]' : 'text-red-400'
                    }`}>{u.pct}%</span>

                    {/* Chevron */}
                    {u.pendientes > 0 && (
                      <span className="text-[#333] text-[10px] shrink-0 transition-transform duration-200" style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}>▼</span>
                    )}
                  </button>

                  {/* Progress bar */}
                  <div className="h-0.5 bg-[#1a1a1a]">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${u.pct}%`,
                        backgroundColor: u.pct >= 80 ? '#4ade80' : u.pct >= 50 ? '#B3985B' : '#f87171'
                      }}
                    />
                  </div>

                  {/* ── Collapsible pending tasks ── */}
                  {isExpanded && u.tareasPendientes.length > 0 && (
                    <div className="border-t border-[#1a1a1a] bg-[#080808] divide-y divide-[#111]">
                      {u.tareasPendientes.map(t => {
                        const prio = PRIO_META[t.prioridad]
                        const est  = ESTADO_META[t.estado] ?? ESTADO_META.PENDIENTE
                        return (
                          <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                            {/* Priority dot */}
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: prio?.color ?? '#555' }}
                            />

                            {/* Task name */}
                            <span className="text-xs text-[#888] flex-1 min-w-0 truncate">{t.titulo}</span>

                            {/* Project */}
                            {t.proyecto && (
                              <span className="text-[9px] text-[#444] shrink-0 hidden sm:block truncate max-w-[120px]">
                                {t.proyecto}
                              </span>
                            )}

                            {/* Estado badge */}
                            {t.estado === 'EN_PROGRESO' && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${est.cls}`}>
                                {est.label}
                              </span>
                            )}

                            {/* Fecha */}
                            {t.fecha && (
                              <span className="text-[9px] text-[#444] shrink-0 tabular-nums">
                                {fmtFecha(t.fecha)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Per-priority ── */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-4">Por prioridad</p>
        <div className="space-y-3">
          {data.prioridades.filter(p => p.total > 0).map(p => {
            const meta = PRIO_META[p.prioridad] ?? { label: p.prioridad, color: '#555' }
            return (
              <div key={p.prioridad}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <span className="text-xs text-[#666]">{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#444] tabular-nums">{p.completadas}/{p.total}</span>
                    <span className="text-[10px] font-semibold tabular-nums min-w-[32px] text-right" style={{ color: meta.color }}>{p.pct}%</span>
                  </div>
                </div>
                <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.pct}%`, backgroundColor: meta.color + 'aa' }}
                  />
                </div>
              </div>
            )
          })}
          {data.prioridades.every(p => p.total === 0) && (
            <p className="text-[#333] text-sm">Sin tareas medibles</p>
          )}
        </div>
      </div>

    </div>
  )
}
