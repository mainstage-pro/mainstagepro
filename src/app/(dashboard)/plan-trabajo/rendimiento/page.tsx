'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import type { BarShapeProps } from 'recharts/types/cartesian/Bar'
import { getAreaColor } from '@/lib/areaColors'

type SemanaData = {
  semana: string
  label: string
  total: number
  completadas: number
  pct: number
}

type AreaData = {
  nombre: string
  icono: string
  total: number
  completadas: number
}

type ImpactoData = {
  critico:  { total: number; completadas: number }
  alto:     { total: number; completadas: number }
  estandar: { total: number; completadas: number }
}

type UsuarioData = {
  id: string
  name: string
  area: string | null
  total: number
  completadas: number
  pct: number
}

type Rendimiento = {
  semanas: SemanaData[]
  areas:   AreaData[]
  impacto: ImpactoData
  usuarios: UsuarioData[]
  currentUserId: string
}

const IMPACTO_META: Record<string, { label: string; badgeCls: string; barCls: string }> = {
  critico:  { label: 'Crítico',   badgeCls: 'bg-red-500/20 text-red-400',      barCls: 'bg-red-500/60'    },
  alto:     { label: 'Alto',      badgeCls: 'bg-orange-500/20 text-orange-400', barCls: 'bg-orange-400/60' },
  estandar: { label: 'Estándar',  badgeCls: 'bg-gray-700/30 text-gray-500',    barCls: 'bg-[#444]'        },
}

function StatCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string
  value: string
  sub?: string
  positive?: boolean
}) {
  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-2">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      {sub && (
        <p
          className={`text-xs mt-1 ${
            positive === undefined
              ? 'text-gray-600'
              : positive
              ? 'text-green-400'
              : 'text-red-400'
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

/** Custom bar shape that colours current-week bar in gold */
function CustomBar(props: BarShapeProps & { isCurrentWeek?: boolean }) {
  const { x, y, width, height, isCurrentWeek } = props
  if (x == null || y == null || !width || !height) return null
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={isCurrentWeek ? '#C9A84C' : '#2a2a2a'}
      rx={4}
      ry={4}
    />
  )
}

export default function RendimientoPage() {
  const [data, setData] = useState<Rendimiento | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/plan-trabajo/rendimiento')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[#111] border border-[#1a1a1a] rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-[#111] border border-[#1a1a1a] rounded-2xl animate-pulse mb-6" />
        <div className="h-48 bg-[#111] border border-[#1a1a1a] rounded-2xl animate-pulse mb-6" />
        <div className="h-48 bg-[#111] border border-[#1a1a1a] rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!data) return null

  const lastIdx       = data.semanas.length - 1
  const semanaActual  = data.semanas[lastIdx]
  const semanaAnterior = data.semanas[lastIdx - 1]
  const deltaPct =
    semanaActual && semanaAnterior ? semanaActual.pct - semanaAnterior.pct : 0

  // Annotate each data point so the custom shape knows which week is current
  const chartData = data.semanas.map((s, i) => ({
    ...s,
    isCurrentWeek: i === lastIdx,
  }))

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <p className="text-[10px] text-[#C9A84C] uppercase tracking-[0.2em] font-semibold">
          Semana en curso
        </p>
        <h2 className="text-xl font-bold text-white mt-0.5">Rendimiento operativo</h2>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Completadas esta semana"
          value={`${semanaActual?.completadas ?? 0} / ${semanaActual?.total ?? 0}`}
        />
        <StatCard
          label="Cumplimiento"
          value={`${semanaActual?.pct ?? 0}%`}
          sub={semanaActual?.total === 0 ? 'Sin compromisos generados' : undefined}
        />
        <StatCard
          label="vs semana anterior"
          value={`${deltaPct > 0 ? '+' : ''}${deltaPct}%`}
          positive={deltaPct > 0}
          sub={deltaPct === 0 ? 'Sin cambio' : deltaPct > 0 ? 'Mejora' : 'Caída'}
        />
      </div>

      {/* ── Bar chart ── */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5 mb-6">
        <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-4">
          Cumplimiento semanal (%)
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={28}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#555', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#444', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              cursor={{ fill: '#ffffff08' }}
              contentStyle={{
                background: '#111',
                border: '1px solid #222',
                borderRadius: 8,
                color: '#ddd',
                fontSize: 12,
              }}
              formatter={(v) => [`${String(v)}%`, 'Cumplimiento'] as [string, string]}
            />
            <Bar
              dataKey="pct"
              radius={[4, 4, 0, 0]}
              shape={(props: BarShapeProps) => {
                // Access the payload to know if this is the current week
                const payload = (props as BarShapeProps & { payload?: { isCurrentWeek?: boolean } }).payload
                return <CustomBar {...props} isCurrentWeek={payload?.isCurrentWeek} />
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Evolution line chart ── */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5 mb-6">
        <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-4">Evolución 8 semanas (%)</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data.semanas}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#444', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#333', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              cursor={{ stroke: '#ffffff15' }}
              contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, color: '#ddd', fontSize: 12 }}
              formatter={(v) => [`${String(v)}%`, 'Cumplimiento'] as [string, string]}
            />
            <Line
              type="monotone"
              dataKey="pct"
              stroke="#C9A84C"
              strokeWidth={2}
              dot={{ fill: '#C9A84C', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#C9A84C' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── By area ── */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5 mb-6">
        <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-4">
          Por área · semana actual
        </p>
        <div className="space-y-3">
          {data.areas.map(a => {
            const pct = a.total > 0 ? Math.round((a.completadas / a.total) * 100) : 0
            return (
              <div key={a.nombre}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">
                    {a.icono} {a.nombre}
                  </span>
                  <span className="text-xs text-gray-500 tabular-nums">
                    {a.completadas}/{a.total} · {pct}%
                  </span>
                </div>
                <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#C9A84C] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
          {data.areas.length === 0 && (
            <p className="text-gray-700 text-sm">Sin datos esta semana</p>
          )}
        </div>
      </div>

      {/* ── By impact ── */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5 mb-6">
        <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-4">
          Por impacto · semana actual
        </p>
        <div className="space-y-3">
          {(['critico', 'alto', 'estandar'] as const).map(imp => {
            const meta = IMPACTO_META[imp]
            const d    = data.impacto[imp]
            const pct  = d.total > 0 ? Math.round((d.completadas / d.total) * 100) : 0
            return (
              <div key={imp} className="flex items-center gap-4">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.badgeCls} min-w-[64px] text-center`}
                >
                  {meta.label}
                </span>
                <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${meta.barCls}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 tabular-nums w-24 text-right">
                  {d.completadas}/{d.total} · {pct}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Per-user list ── */}
      {data.usuarios.length > 0 && (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5 mb-6">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-4">Por persona · semana actual</p>
          <div className="space-y-1">
            {[...data.usuarios]
              .sort((a, b) => {
                if (a.id === data.currentUserId) return -1
                if (b.id === data.currentUserId) return 1
                return b.pct - a.pct
              })
              .map(u => {
                const isCurrent = u.id === data.currentUserId
                return (
                  <div
                    key={u.id}
                    className={`px-3 py-3 rounded-xl transition-colors ${
                      isCurrent ? 'bg-[#C9A84C]/5 border border-[#C9A84C]/10' : 'hover:bg-[#0d0d0d]'
                    }`}
                  >
                    {/* Top row: avatar + name + area + pct + label */}
                    <div className="flex items-center gap-3 mb-2">
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white/90 shrink-0"
                        style={{ backgroundColor: getAreaColor(u.area ?? '') }}
                      >
                        {u.name[0]}
                      </div>

                      {/* Name + area */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium leading-none ${
                          isCurrent ? 'text-[#C9A84C]' : 'text-white'
                        }`}>
                          {u.name.split(' ')[0]}
                          {isCurrent && <span className="text-[9px] text-[#C9A84C]/60 ml-1">(tú)</span>}
                        </p>
                        {u.area && <p className="text-[10px] text-gray-600 mt-0.5">{u.area}</p>}
                      </div>

                      {/* Pct + performance label */}
                      <div className="text-right shrink-0">
                        <p className={`text-base font-bold tabular-nums ${
                          u.pct === 100 ? 'text-green-400' : u.pct >= 70 ? 'text-white' : 'text-gray-400'
                        }`}>
                          {u.pct}%
                        </p>
                        <p className="text-[9px] tabular-nums" style={{ color: getAreaColor(u.area ?? ''), opacity: 0.7 }}>
                          {u.pct === 100 ? '🏆 Perfecto' :
                           u.pct >= 80 ? '⚡ Excelente' :
                           u.pct >= 60 ? '👍 Buen avance' :
                           u.pct >= 30 ? '📈 En progreso' :
                           u.total === 0 ? '—' : '⏳ Por comenzar'}
                        </p>
                      </div>
                    </div>

                    {/* Full-width progress bar */}
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${u.pct}%`,
                          backgroundColor: getAreaColor(u.area ?? ''),
                        }}
                      />
                    </div>

                    {/* Bottom: completadas/total */}
                    <p className="text-[9px] text-gray-700 mt-1 tabular-nums">
                      {u.completadas} de {u.total} compromisos completados
                    </p>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
