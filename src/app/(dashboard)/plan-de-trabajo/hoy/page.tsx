'use client'

import { useEffect, useState, useCallback } from 'react'

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
    puestoDefault: string | null
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
const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

const DIAS_PLAN_LABEL: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V' }
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

const IMPACTO: Record<string, { color: string; dot: string; label: string; bar: string }> = {
  critico:  { color: 'text-red-400',    dot: 'border-red-500 hover:bg-red-500/20',       bar: 'bg-red-500',    label: 'CRÍTICO'  },
  alto:     { color: 'text-orange-400', dot: 'border-orange-400 hover:bg-orange-400/20', bar: 'bg-orange-400', label: 'ALTO'     },
  estandar: { color: 'text-gray-500',   dot: 'border-[#444] hover:bg-[#2a2a2a]',         bar: 'bg-[#444]',     label: 'ESTÁNDAR' },
}

const CONTEXTO: Record<string, { label: string; cls: string }> = {
  evento:        { label: '📅 Con evento',    cls: 'bg-blue-900/30 text-blue-400 border-blue-800/40' },
  hibrida:       { label: '⚡ Híbrida',       cls: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40' },
  independiente: { label: '✅ Independiente', cls: 'bg-[#1a1a1a] text-gray-600 border-[#2a2a2a]' },
}

const IMPACTO_ORDER: Record<string, number> = { critico: 0, alto: 1, estandar: 2 }

// ── MiDiaItem ──────────────────────────────────────────────────────────────────

function MiDiaItem({
  instancia,
  onToggle,
}: {
  instancia: Instancia
  onToggle: (id: string, estado: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [toggling, setToggling] = useState(false)
  const completada = instancia.estado === 'COMPLETADA'
  const { template: t } = instancia
  const imp = IMPACTO[t.impacto] ?? IMPACTO.estandar
  const ctx = CONTEXTO[t.contexto] ?? CONTEXTO.independiente

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(true)
    await onToggle(instancia.id, completada ? 'PENDIENTE' : 'COMPLETADA')
    setToggling(false)
  }

  return (
    <div className={`relative border rounded-xl overflow-hidden transition-all duration-200 flex ${
      completada ? 'border-[#1a1a1a] opacity-60' : 'border-[#222] hover:border-[#333]'
    }`}>
      {/* Left impacto bar */}
      <div className={`w-1 shrink-0 ${imp.bar}`} />

      <div className="flex-1 min-w-0">
        {/* Main row */}
        <div
          className="flex items-start gap-3 px-4 py-3.5 cursor-pointer select-none"
          onClick={() => setExpanded(v => !v)}
        >
          {/* Toggle circle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
              completada
                ? 'bg-green-500 border-green-500'
                : imp.dot
            }`}
          >
            {completada && <span className="text-white text-[10px] leading-none font-bold">✓</span>}
            {toggling && !completada && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug mb-1 ${
              completada ? 'line-through text-gray-600' : 'text-white'
            }`}>
              {t.nombre}
            </p>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${imp.color}`}>
                {imp.label}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${ctx.cls}`}>
                {ctx.label}
              </span>
              {t.tipo === 'ENTREGABLE' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#c9a96a]/30 text-[#c9a96a] bg-[#c9a96a]/5">
                  📄 Entregable
                </span>
              )}
              {t.puestoDefault === 'Todo el equipo' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#444] text-gray-500 bg-[#1a1a1a]">
                  👥 Todo el equipo
                </span>
              )}
            </div>

            {/* Bottom meta row: responsable + diasSemana + frecuencia */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {instancia.responsable && (
                <span className="text-[10px] text-gray-500">{instancia.responsable.name.split(' ')[0]}</span>
              )}
              {/* diasSemana boxes */}
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(d => (
                  <span
                    key={d}
                    className={`text-[8px] w-3.5 h-3.5 rounded flex items-center justify-center font-bold ${
                      (t.diasSemana ?? []).includes(d)
                        ? 'bg-[#c9a96a]/20 text-[#c9a96a]'
                        : 'bg-[#1a1a1a] text-gray-700'
                    }`}
                  >
                    {DIAS_PLAN_LABEL[d]}
                  </span>
                ))}
              </div>
              {t.frecuencia && (
                <span className="text-[9px] text-gray-600">
                  {FRECUENCIA_LABEL[t.frecuencia] ?? t.frecuencia}
                </span>
              )}
            </div>

            {t.cuando && !expanded && (
              <p className="text-[11px] text-gray-600 mt-0.5 truncate">{t.cuando}</p>
            )}
          </div>

          {/* Area + chevron */}
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[9px] text-gray-700 hidden sm:block">{t.area.icono} {t.area.nombre}</span>
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
                <div className="bg-[#c9a96a]/5 border border-[#c9a96a]/20 rounded-lg p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#c9a96a] mb-1.5">Estándar mínimo</p>
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

            {t.moduloDestino && t.moduloTexto && (
              <a
                href={t.moduloDestino}
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-sm text-[#c9a96a] hover:underline"
              >
                {t.moduloTexto} →
              </a>
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

  const fechaStr = toDateStr(fechaActual)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/plan-trabajo/instancias?fecha=${fechaStr}&vista=dia`)
      const data = await res.json()
      setInstancias(data.instancias ?? [])
    } finally {
      setLoading(false)
    }
  }, [fechaStr])

  useEffect(() => { cargar() }, [cargar])

  // ── Load week counts ────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadConteos() {
      setLoadingConteos(true)
      try {
        const lunesStr = toDateStr(lunesSemana)
        const res = await fetch(`/api/plan-trabajo/instancias/semana?lunes=${lunesStr}`)
        const data = await res.json()
        setConteosSemana(data.conteos ?? {})
      } catch {
        // silently fail
      } finally {
        setLoadingConteos(false)
      }
    }
    loadConteos()
  }, [lunesSemana.toDateString()])

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

  async function handleToggle(id: string, estado: string) {
    const res = await fetch('/api/plan-trabajo/instancias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanciaId: id, estado }),
    })
    if (res.ok) {
      setInstancias(prev =>
        prev.map(i =>
          i.id === id
            ? { ...i, estado, completadaAt: estado === 'COMPLETADA' ? new Date().toISOString() : null }
            : i
        )
      )
    }
  }

  const sorted = [...instancias].sort(
    (a, b) => (IMPACTO_ORDER[a.template.impacto] ?? 2) - (IMPACTO_ORDER[b.template.impacto] ?? 2)
  )
  const pendientes  = sorted.filter(i => i.estado !== 'COMPLETADA' && i.estado !== 'OMITIDA')
  const completadas = sorted.filter(i => i.estado === 'COMPLETADA')
  const total = instancias.length
  const pct   = total > 0 ? Math.round((completadas.length / total) * 100) : 0

  return (
    <div className="p-6 max-w-3xl">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-gray-500 text-sm">{fmtFechaLarga(fechaActual)}</p>
        <p className="ms-h1 mt-0.5">{getGreeting()}.</p>
        {total > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#c9a96a] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{pct}% completado</span>
          </div>
        )}
      </div>

      {/* ── Week Navigator ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => cambiarSemana(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#111] border border-[#222] text-gray-400 hover:text-white hover:border-[#444] transition-colors text-sm"
          >
            ‹
          </button>
          <span className="text-xs text-gray-600">{fmtRangoSemana(diasSemana)}</span>
          <button
            onClick={() => cambiarSemana(+1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#111] border border-[#222] text-gray-400 hover:text-white hover:border-[#444] transition-colors text-sm"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {diasSemana.map(dia => {
            const diaStr = toDateStr(dia)
            const conteo = conteosSemana[diaStr]
            const isSelected = esMismaFecha(dia, fechaActual)
            const isToday = esHoy(dia)
            const diaNombre = DIAS_COMPLETO[dia.getDay()]
            const diaNumero = dia.getDate()
            const mesAbrev = MESES_ES[dia.getMonth()]

            return (
              <button
                key={diaStr}
                onClick={() => setFechaActual(new Date(dia))}
                className={`flex flex-col items-center px-2 py-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[#c9a96a]/10 border-[#c9a96a]/40 shadow-sm'
                    : 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#333]'
                }`}
              >
                <span className={`text-xs font-semibold mb-0.5 ${
                  isSelected ? 'text-[#c9a96a]' : isToday ? 'text-white' : 'text-[#666]'
                }`}>
                  {diaNombre}
                </span>
                <span className={`text-[11px] mt-0.5 ${
                  isSelected ? 'text-[#c9a96a]/80' : isToday ? 'text-gray-300' : 'text-[#444]'
                }`}>
                  {diaNumero} de {mesAbrev}
                </span>
                <span className={`text-[9px] mt-1 font-mono ${
                  isSelected ? 'text-[#c9a96a]/70' : 'text-gray-700'
                }`}>
                  {loadingConteos ? '·' : (conteo !== undefined ? `${conteo} tarea${conteo !== 1 ? 's' : ''}` : '–')}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-600 text-sm">Cargando tareas del día...</div>
      ) : instancias.length === 0 ? (
        <div className="bg-[#111] border border-dashed border-[#2a2a2a] rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-white font-semibold mb-1">No hay tareas generadas para este día</p>
          <p className="text-gray-500 text-sm mb-6">
            Genera las instancias del día a partir del plan de actividades.
          </p>
          <button
            onClick={handleGenerar}
            disabled={generando}
            className="bg-[#c9a96a] text-black font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#d4b060] disabled:opacity-50 transition-colors"
          >
            {generando ? 'Generando...' : 'Generar tareas →'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pendientes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Mis tareas del día
              </p>
              <span className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 px-2 py-0.5 rounded-full">
                {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {pendientes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  🎉 ¡Todo completado por hoy!
                </div>
              ) : (
                pendientes.map(inst => (
                  <MiDiaItem key={inst.id} instancia={inst} onToggle={handleToggle} />
                ))
              )}
            </div>
          </div>

          {/* Completadas */}
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
  )
}
