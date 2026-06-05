'use client'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

type SemanaData = { semana: string; label: string; total: number; completadas: number; pct: number }
type UsuarioData = { id: string; name: string; total: number; completadas: number; pct: number }
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

const PRIO_META: Record<string, { label: string; color: string }> = {
  URGENTE: { label: 'Urgente', color: '#f87171' },
  ALTA:    { label: 'Alta',    color: '#fb923c' },
  MEDIA:   { label: 'Media',   color: '#B3985B' },
  BAJA:    { label: 'Baja',    color: '#4b5563' },
}

export function VistaRendimiento() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/operaciones/rendimiento')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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
      <div>
        <p className="text-[10px] text-[#B3985B] uppercase tracking-[0.2em] font-semibold">Módulo de tareas</p>
        <h1 className="text-xl font-bold text-white mt-1">Rendimiento operativo</h1>
        <p className="text-xs text-[#444] mt-1">
          Solo se miden tareas con responsable asignado. La fecha solo aplica para el análisis semanal.
          {data.noMedibles > 0 && (
            <span className="ml-2 text-[#555]">
              {data.noMedibles} tarea{data.noMedibles !== 1 ? 's' : ''} sin responsable asignado (no medibles)
            </span>
          )}
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">Total medibles</p>
          <p className="text-2xl font-bold text-white tabular-nums">{data.totalMedibles}</p>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">Completadas</p>
          <p className="text-2xl font-bold text-white tabular-nums">{data.totalCompletadas}</p>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">% completado</p>
          <p className={`text-2xl font-bold tabular-nums ${
            data.pctGeneral >= 80 ? 'text-green-400' : data.pctGeneral >= 50 ? 'text-[#B3985B]' : 'text-red-400'
          }`}>{data.pctGeneral}%</p>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-2">Esta semana</p>
          <p className="text-2xl font-bold text-white tabular-nums">
            {semanaActual?.completadas ?? 0}/{semanaActual?.total ?? 0}
          </p>
          <p className="text-xs text-[#444] mt-1">
            {semanaActual?.pct ?? 0}% completado
          </p>
        </div>
      </div>

      {/* ── Weekly Bar Chart ── */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-4">Últimas 8 semanas</p>
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

      {/* ── Two columns: Users + Priority ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Per-user */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#444] mb-4">Por responsable</p>
          {data.usuarios.length === 0 ? (
            <p className="text-[#333] text-sm">Sin tareas asignadas</p>
          ) : (
            <div className="space-y-3">
              {data.usuarios.map(u => (
                <div key={u.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        u.id === data.currentUserId ? 'bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/30' : 'bg-[#1a1a1a] text-[#555] border border-[#222]'
                      }`}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <span className={`text-xs ${
                        u.id === data.currentUserId ? 'text-white font-medium' : 'text-[#666]'
                      }`}>{u.name.split(' ')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#444] tabular-nums">{u.completadas}/{u.total}</span>
                      <span className={`text-[10px] font-semibold tabular-nums min-w-[32px] text-right ${
                        u.pct >= 80 ? 'text-green-400' : u.pct >= 50 ? 'text-[#B3985B]' : 'text-red-400'
                      }`}>{u.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${u.pct}%`,
                        backgroundColor: u.pct >= 80 ? '#4ade80' : u.pct >= 50 ? '#B3985B' : '#f87171'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-priority */}
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

    </div>
  )
}
