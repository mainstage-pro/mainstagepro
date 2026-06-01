'use client'

import { useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Template = {
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
  kpiNombre: string | null
  moduloTexto: string | null
  moduloDestino: string | null
  dependeDe: { tarea: string; puesto: string } | null
  bloqueaA: { tarea: string; puesto: string } | null
  afectaA: string[]
  puestoDefault: string | null
  responsable: { id: string; name: string } | null
  area: { id: string; nombre: string; color: string; icono: string }
  subArea: { id: string; nombre: string }
}

type SOArea = {
  id: string
  nombre: string
  color: string
  icono: string
  objetivo: string | null
  subareas: { id: string; nombre: string }[]
}

type SubareaGroup = {
  subArea: { id: string; nombre: string }
  templates: Template[]
}

type AreaData = SOArea & { subareaGroups: SubareaGroup[] }

// ── Constants ──────────────────────────────────────────────────────────────────

const DIAS_LABEL: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V' }

const FRECUENCIA_LABEL: Record<string, string> = {
  DIARIO: 'Diario', SEMANAL: 'Semanal', QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual', TRIMESTRAL: 'Trimestral', POR_EVENTO: 'Por evento',
  LUNES_JUEVES: 'L/J',
}

const IMPACTO_DOT: Record<string, string> = {
  critico: 'bg-red-500', alto: 'bg-orange-400', estandar: 'bg-[#333]',
}

const IMPACTO_LABEL: Record<string, { color: string; label: string }> = {
  critico:  { color: 'text-red-400',    label: 'Crítico'  },
  alto:     { color: 'text-orange-400', label: 'Alto'     },
  estandar: { color: 'text-gray-600',   label: 'Estándar' },
}

const CONTEXTO_BADGE: Record<string, { label: string; cls: string }> = {
  evento:        { label: '📅 Evento',   cls: 'bg-blue-900/30 text-blue-400 border-blue-800/40' },
  hibrida:       { label: '⚡ Híbrida',  cls: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40' },
  independiente: { label: '✅ Indep.',   cls: 'bg-[#111] text-gray-600 border-[#222]' },
}

// ── TemplateRow ────────────────────────────────────────────────────────────────

function TemplateRow({ t }: { t: Template }) {
  const [expanded, setExpanded] = useState(false)
  const ctx = CONTEXTO_BADGE[t.contexto] ?? CONTEXTO_BADGE.independiente
  const imp = IMPACTO_LABEL[t.impacto] ?? IMPACTO_LABEL.estandar

  return (
    <>
      <tr
        className={`border-b border-[#111] cursor-pointer transition-colors ${
          expanded ? 'bg-[#0d0d0d]' : 'hover:bg-[#0a0a0a]'
        }`}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Impacto bar */}
        <td className="w-1 p-0">
          <div className={`w-1 min-h-[48px] h-full rounded-l-sm ${IMPACTO_DOT[t.impacto] ?? 'bg-[#333]'}`} />
        </td>

        {/* Nombre + chips */}
        <td className="py-3 px-3">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-sm text-white leading-snug">{t.nombre}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-[9px] ${imp.color}`}>{imp.label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${ctx.cls}`}>{ctx.label}</span>
            {t.tipo === 'ENTREGABLE' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#C9A84C]/30 text-[#C9A84C]">Entregable</span>
            )}
          </div>
        </td>

        {/* Responsable */}
        <td className="py-3 px-3 text-xs text-gray-500 hidden sm:table-cell">
          {t.responsable?.name ?? <span className="text-gray-700 italic">Sin asignar</span>}
        </td>

        {/* Días */}
        <td className="py-3 px-3 hidden md:table-cell">
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(d => (
              <span
                key={d}
                className={`text-[9px] w-4 h-4 rounded flex items-center justify-center font-bold ${
                  t.diasSemana.includes(d)
                    ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                    : 'bg-[#1a1a1a] text-gray-700'
                }`}
              >
                {DIAS_LABEL[d]}
              </span>
            ))}
          </div>
        </td>

        {/* Frecuencia */}
        <td className="py-3 px-3 text-xs text-gray-600 hidden lg:table-cell">
          {FRECUENCIA_LABEL[t.frecuencia] ?? t.frecuencia}
        </td>

        {/* Expand */}
        <td className="py-3 px-3 text-gray-600 text-xs text-right">
          {expanded ? '▲' : '▼'}
        </td>
      </tr>

      {/* Expanded */}
      {expanded && (
        <tr className="bg-[#080808] border-b border-[#0d0d0d]">
          <td colSpan={6} className="px-4 pb-4 pt-0">
            <div className="ml-3 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
              {t.relacionCon && (
                <div className="bg-[#0d0d0d] rounded-lg p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Se relaciona con</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{t.relacionCon}</p>
                </div>
              )}
              {(t.dependeDe || t.bloqueaA) && (
                <div className="bg-[#0d0d0d] rounded-lg p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Dependencias</p>
                  {t.dependeDe && <p className="text-xs text-gray-400">Depende de: {t.dependeDe.tarea}</p>}
                  {t.bloqueaA && <p className="text-xs text-gray-400 mt-1">Bloquea a: {t.bloqueaA.tarea}</p>}
                </div>
              )}
            </div>
            <div className="ml-3 mt-3 flex items-center gap-3 flex-wrap">
              {t.puestoDefault && <span className="text-[10px] text-gray-600">{t.puestoDefault}</span>}
              {t.kpiNombre && (
                <span className="text-[10px] text-[#C9A84C] border border-[#C9A84C]/30 px-2 py-0.5 rounded-full">
                  KPI: {t.kpiNombre}
                </span>
              )}
              {t.cuando && <span className="text-[10px] text-gray-600">⏰ {t.cuando}</span>}
              {t.moduloDestino && t.moduloTexto && (
                <a href={t.moduloDestino} onClick={e => e.stopPropagation()} className="text-[10px] text-[#C9A84C] hover:underline">
                  {t.moduloTexto} →
                </a>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const [areas, setAreas]               = useState<AreaData[]>([])
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [filtroImpacto, setFiltroImpacto]   = useState('todos')
  const [filtroContexto, setFiltroContexto] = useState('todos')

  useEffect(() => {
    async function load() {
      // 1. Get areas + subareas from sistema-operativo
      const soRes = await fetch('/api/plan-trabajo/sistema-operativo')
      const soData: { areas: SOArea[] } = await soRes.json()

      // 2. For each area, get templates
      const areasData: AreaData[] = await Promise.all(
        soData.areas.map(async area => {
          const tRes = await fetch(`/api/plan-trabajo/templates?areaId=${area.id}`)
          const tData: { templates: Template[] } = await tRes.json()
          const templates = tData.templates ?? []

          // Group by subarea
          const subMap = new Map<string, SubareaGroup>()
          for (const t of templates) {
            if (!t.subArea) continue
            if (!subMap.has(t.subArea.id)) {
              subMap.set(t.subArea.id, { subArea: t.subArea, templates: [] })
            }
            subMap.get(t.subArea.id)!.templates.push(t)
          }

          return { ...area, subareaGroups: Array.from(subMap.values()) }
        })
      )

      setAreas(areasData)
      setActiveAreaId(areasData[0]?.id ?? null)
      setLoading(false)
    }
    load()
  }, [])

  const area = areas.find(a => a.id === activeAreaId)

  function filterT(t: Template): boolean {
    if (busqueda && !t.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroImpacto !== 'todos' && t.impacto !== filtroImpacto) return false
    if (filtroContexto !== 'todos' && t.contexto !== filtroContexto) return false
    return true
  }

  const totalVisible = area?.subareaGroups.reduce((acc, s) => acc + s.templates.filter(filterT).length, 0) ?? 0

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 130px)' }}>
      {/* Area sidebar */}
      <div className="w-44 shrink-0 border-r border-[#1a1a1a] bg-[#080808] py-3">
        {loading ? (
          <p className="px-4 text-gray-700 text-xs mt-2">Cargando...</p>
        ) : (
          areas.map(a => (
            <button
              key={a.id}
              onClick={() => setActiveAreaId(a.id)}
              className={`w-full text-left px-4 py-3 text-xs transition-all border-l-2 ${
                activeAreaId === a.id
                  ? 'border-[#C9A84C] text-white bg-[#0d0d0d]'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#0a0a0a]'
              }`}
            >
              <span className="mr-1.5">{a.icono}</span>
              {a.nombre}
            </button>
          ))
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!loading && area && (
          <>
            {/* Area header + filters */}
            <div className="px-5 py-4 border-b border-[#1a1a1a] bg-[#0a0a0a] sticky top-0 z-20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{area.icono}</span>
                <div>
                  <h2 className="text-lg font-bold text-white">{area.nombre}</h2>
                  {area.objetivo && (
                    <p className="text-xs text-gray-500 mt-0.5 max-w-xl">{area.objetivo}</p>
                  )}
                </div>
                <span className="ml-auto text-xs text-gray-600">{totalVisible} tareas</span>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Buscar tarea..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C] w-44"
                />
                <select
                  value={filtroImpacto}
                  onChange={e => setFiltroImpacto(e.target.value)}
                  className="bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-gray-400 focus:outline-none cursor-pointer"
                >
                  <option value="todos">Todos los impactos</option>
                  <option value="critico">Crítico</option>
                  <option value="alto">Alto</option>
                  <option value="estandar">Estándar</option>
                </select>
                <select
                  value={filtroContexto}
                  onChange={e => setFiltroContexto(e.target.value)}
                  className="bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-gray-400 focus:outline-none cursor-pointer"
                >
                  <option value="todos">Todos los contextos</option>
                  <option value="evento">Con evento</option>
                  <option value="hibrida">Híbrida</option>
                  <option value="independiente">Independiente</option>
                </select>
              </div>
            </div>

            {/* Subareas + tables */}
            {area.subareaGroups.map(group => {
              const filtered = group.templates.filter(filterT)
              if (filtered.length === 0) return null
              return (
                <div key={group.subArea.id}>
                  <div className="px-5 py-2 border-b border-[#111] bg-[#060606] sticky top-[148px] z-10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                      {group.subArea.nombre}
                      <span className="ml-2 font-normal text-gray-800">{filtered.length}</span>
                    </p>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {filtered.map(t => <TemplateRow key={t.id} t={t} />)}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </>
        )}

        {loading && (
          <div className="text-center py-16 text-gray-600 text-sm">Cargando plan...</div>
        )}
      </div>
    </div>
  )
}
