'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────────

type KPIConValor = {
  id: string
  nombre: string
  slug: string
  meta: string
  formula: string
  fuente: string
  esTransversal: boolean
  calculo: string
  valorActual: number | null
  cumplida: boolean
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'sin-dato'
  area: { id: string; nombre: string; color: string } | null
}

type DashboardData = {
  cabecera: KPIConValor[]
  porArea: Record<string, KPIConValor[]>
  periodo: string
  anio: number
  mes: number
}

type RegistroKPI = {
  id: string
  kpiSlug: string
  kpiNombre: string
  valor: number | null
  meta: string
  periodo: string
  fechaInicio: string
  mes: number | null
  trimestre: number | null
  semana: number | null
  anio: number
  nota: string | null
  calculo: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SEMAFORO = {
  verde:     { dot: 'bg-green-500',  text: 'text-green-400',  bg: 'bg-green-900/10',  border: 'border-green-800/20' },
  amarillo:  { dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-900/10', border: 'border-yellow-800/20' },
  rojo:      { dot: 'bg-red-500',    text: 'text-red-400',    bg: 'bg-red-900/10',    border: 'border-red-800/20' },
  'sin-dato':{ dot: 'bg-gray-600',   text: 'text-gray-500',   bg: 'bg-[#111]',        border: 'border-[#222]' },
}

const MESES = ['', 'Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatValor(valor: number | null, meta: string): string {
  if (valor === null) return '—'
  if (meta.includes('%'))           return `${valor.toFixed(1)}%`
  if (meta.includes('$') || meta.includes('MXN'))
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor)
  return valor % 1 === 0 ? String(valor) : valor.toFixed(1)
}

// ── Modal Registrar ────────────────────────────────────────────────────────────

function ModalRegistrar({
  kpi, periodo, anio, mes, onClose, onSaved,
}: {
  kpi: KPIConValor; periodo: string; anio: number; mes: number
  onClose: () => void; onSaved: () => void
}) {
  const [valor, setValor]   = useState('')
  const [nota, setNota]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function getFechas() {
    const fechaInicio = new Date(anio, mes - 1, 1).toISOString()
    const fechaFin    = new Date(anio, mes, 0, 23, 59, 59).toISOString()
    return { fechaInicio, fechaFin }
  }

  async function handleSave() {
    const num = parseFloat(valor.replace(',', '.'))
    if (isNaN(num)) { setError('Ingresa un número válido'); return }
    setSaving(true)
    setError('')
    const { fechaInicio, fechaFin } = getFechas()
    const metaNum = parseFloat(kpi.meta.replace(/[^0-9.]/g, ''))
    const res = await fetch('/api/plan-trabajo/kpis/registros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kpiId: kpi.id,
        kpiSlug: kpi.slug,
        kpiNombre: kpi.nombre,
        kpiArea: kpi.area?.nombre ?? 'Transversal',
        valor: num,
        meta: kpi.meta,
        cumplida: !isNaN(metaNum) && num >= metaNum,
        periodo,
        fechaInicio,
        fechaFin,
        mes,
        anio,
        nota: nota || null,
      }),
    })
    setSaving(false)
    if (res.ok) { onSaved(); onClose() }
    else setError('Error al guardar. Intenta de nuevo.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <div>
            <p className="text-white font-semibold text-sm">Registrar KPI</p>
            <p className="text-gray-500 text-xs mt-0.5">{kpi.nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-red-400 text-xs bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Período</label>
            <p className="text-sm text-white">{MESES[mes]} {anio}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Valor real <span className="text-gray-700">(Meta: {kpi.meta})</span>
            </label>
            <input
              autoFocus
              type="number"
              value={valor}
              onChange={e => setValor(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="0"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nota (opcional)</label>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={2}
              placeholder="Observaciones..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#C9A84C] resize-none transition-colors"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:bg-[#1a1a1a] transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#C9A84C] text-black font-semibold text-sm hover:bg-[#d4b060] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ kpi, onRegistrar }: { kpi: KPIConValor; onRegistrar: (k: KPIConValor) => void }) {
  const cfg = SEMAFORO[kpi.semaforo]
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div
      className={`border rounded-xl p-4 transition-all cursor-pointer hover:border-opacity-50 ${cfg.bg} ${cfg.border}`}
      onClick={() => setShowDetail(v => !v)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
          <p className="text-xs font-medium text-white leading-snug">{kpi.nombre}</p>
        </div>
        {kpi.calculo === 'automatico' && (
          <span className="shrink-0 text-[8px] bg-[#0d0d0d] border border-[#1a1a1a] text-gray-600 px-1.5 py-0.5 rounded">auto</span>
        )}
      </div>

      <p className={`text-2xl font-bold ${kpi.valorActual !== null ? cfg.text : 'text-gray-700'}`}>
        {formatValor(kpi.valorActual, kpi.meta)}
      </p>
      <p className="text-[10px] text-gray-600 mt-0.5">Meta: {kpi.meta}</p>

      {showDetail && kpi.formula && (
        <p className="text-[10px] text-gray-700 mt-2 border-t border-[#1a1a1a] pt-2 leading-relaxed">{kpi.formula}</p>
      )}

      {kpi.valorActual === null && (
        <button
          onClick={e => { e.stopPropagation(); onRegistrar(kpi) }}
          className="w-full mt-3 py-1.5 rounded-lg border border-[#C9A84C]/30 text-[#C9A84C] text-xs hover:bg-[#C9A84C]/10 transition-colors"
        >
          + Registrar valor
        </button>
      )}
    </div>
  )
}

// ── Histórico Tab ──────────────────────────────────────────────────────────────

function HistoricoTab({ allKpis }: { allKpis: KPIConValor[] }) {
  const [selectedSlug, setSelectedSlug] = useState('')
  const [periodo, setPeriodo]           = useState('mensual')
  const [anio, setAnio]                 = useState(new Date().getFullYear())
  const [registros, setRegistros]       = useState<RegistroKPI[]>([])
  const [loading, setLoading]           = useState(false)

  const kpiSel = allKpis.find(k => k.slug === selectedSlug)

  const loadRegistros = useCallback(async () => {
    if (!selectedSlug) return
    setLoading(true)
    const res = await fetch(`/api/plan-trabajo/kpis/registros?kpiSlug=${selectedSlug}&periodo=${periodo}&anio=${anio}`)
    const data = await res.json()
    setRegistros(data.registros ?? [])
    setLoading(false)
  }, [selectedSlug, periodo, anio])

  useEffect(() => { loadRegistros() }, [loadRegistros])

  const metaNum = kpiSel ? parseFloat(kpiSel.meta.replace(/[^0-9.]/g, '')) : NaN

  // Build monthly chart data (always 12 points, null for missing)
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m   = i + 1
    const reg = registros.find(r => r.mes === m)
    return { etiqueta: MESES[m], valor: reg?.valor ?? null, mes: m }
  })

  return (
    <div className="p-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedSlug}
          onChange={e => setSelectedSlug(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C] min-w-56"
        >
          <option value="">Selecciona un KPI…</option>
          {allKpis.map(k => (
            <option key={k.id} value={k.slug}>{k.nombre}</option>
          ))}
        </select>

        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-gray-400 focus:outline-none"
        >
          <option value="mensual">Mensual</option>
          <option value="trimestral">Trimestral</option>
          <option value="semanal">Semanal</option>
          <option value="anual">Anual</option>
        </select>

        <select
          value={anio}
          onChange={e => setAnio(parseInt(e.target.value))}
          className="bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-gray-400 focus:outline-none"
        >
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {!selectedSlug ? (
        <div className="text-center py-20 text-gray-700">
          <p className="text-4xl mb-3">📈</p>
          <p className="text-sm">Selecciona un KPI para ver su histórico</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-600 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-6">
          {/* Chart */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-4">{kpiSel?.nombre}</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="etiqueta"
                  tick={{ fill: '#555', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#555', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => formatValor(v, kpiSel?.meta ?? '')}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: 10, color: '#fff' }}
                  itemStyle={{ color: '#C9A84C' }}
                  formatter={(val) => [
                    typeof val === 'number' ? formatValor(val, kpiSel?.meta ?? '') : '—',
                    'Valor',
                  ]}
                />
                {!isNaN(metaNum) && (
                  <ReferenceLine
                    y={metaNum}
                    stroke="#EF5350"
                    strokeDasharray="5 5"
                    label={{ value: 'Meta', fill: '#EF5350', fontSize: 10, position: 'right' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#C9A84C', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#d4b060' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  {['Período', 'Valor', 'Meta', 'Fuente', 'Nota'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-700 text-sm">Sin registros para este período</td>
                  </tr>
                ) : (
                  registros.map(r => (
                    <tr key={r.id} className="border-b border-[#111] hover:bg-[#111]">
                      <td className="px-4 py-2.5 text-sm text-white">
                        {r.mes ? MESES[r.mes] : r.trimestre ? `Q${r.trimestre}` : `S${r.semana ?? ''}`} {r.anio}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-semibold text-[#C9A84C]">
                        {formatValor(r.valor, r.meta)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{r.meta}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 capitalize">{r.calculo}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{r.nota ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main KPIs Page ─────────────────────────────────────────────────────────────

export default function KpisPage() {
  const [tab, setTab]               = useState<'semaforo' | 'historico'>('semaforo')
  const [anio, setAnio]             = useState(new Date().getFullYear())
  const [mes, setMes]               = useState(new Date().getMonth() + 1)
  const [dashboard, setDashboard]   = useState<DashboardData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState<KPIConValor | null>(null)

  const loadDashboard = useCallback(() => {
    setLoading(true)
    fetch(`/api/plan-trabajo/kpis/dashboard?periodo=mensual&anio=${anio}&mes=${mes}`)
      .then(r => r.json())
      .then(d => { setDashboard(d); setLoading(false) })
  }, [anio, mes])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const allKpis: KPIConValor[] = [
    ...(dashboard?.cabecera ?? []),
    ...Object.values(dashboard?.porArea ?? {}).flat(),
  ]

  return (
    <div>
      {/* Sub-nav */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#1a1a1a] bg-[#080808]">
        <div className="flex gap-1">
          {(['semaforo', 'historico'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-[#1a1a1a] text-white border border-[#2a2a2a]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'semaforo' ? '🚦 Semáforo' : '📈 Histórico'}
            </button>
          ))}
        </div>

        {tab === 'semaforo' && (
          <div className="flex items-center gap-2">
            <select
              value={mes}
              onChange={e => setMes(parseInt(e.target.value))}
              className="bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-gray-400 focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{MESES[m]}</option>
              ))}
            </select>
            <select
              value={anio}
              onChange={e => setAnio(parseInt(e.target.value))}
              className="bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-gray-400 focus:outline-none"
            >
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {tab === 'semaforo' ? (
        loading ? (
          <div className="text-center py-16 text-gray-600 text-sm">Cargando KPIs...</div>
        ) : (
          <div className="p-6 space-y-8 max-w-5xl">
            {/* Transversales */}
            {(dashboard?.cabecera?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600 mb-3">KPIs Transversales</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {dashboard!.cabecera.map(kpi => (
                    <KpiCard key={kpi.id} kpi={kpi} onRegistrar={setModal} />
                  ))}
                </div>
              </div>
            )}

            {/* Por área */}
            {Object.entries(dashboard?.porArea ?? {}).map(([areaNombre, kpis]) => (
              kpis.length > 0 && (
                <div key={areaNombre}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600 mb-3">{areaNombre}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {kpis.map(kpi => (
                      <KpiCard key={kpi.id} kpi={kpi} onRegistrar={setModal} />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )
      ) : (
        <HistoricoTab allKpis={allKpis} />
      )}

      {modal && (
        <ModalRegistrar
          kpi={modal}
          periodo="mensual"
          anio={anio}
          mes={mes}
          onClose={() => setModal(null)}
          onSaved={loadDashboard}
        />
      )}
    </div>
  )
}
