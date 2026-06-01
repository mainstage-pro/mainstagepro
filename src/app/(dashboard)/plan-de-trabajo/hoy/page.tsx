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
    area: { id: string; nombre: string; color: string; icono: string }
    subArea: { id: string; nombre: string }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function fmtFecha(d: Date): string {
  return `${DIAS_ES[d.getDay()]}, ${d.getDate()} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`
}

const IMPACTO: Record<string, { color: string; dot: string; label: string }> = {
  critico:  { color: 'text-red-400',    dot: 'border-red-500 hover:bg-red-500/20',    label: 'CRÍTICO'  },
  alto:     { color: 'text-orange-400', dot: 'border-orange-400 hover:bg-orange-400/20', label: 'ALTO'  },
  estandar: { color: 'text-gray-500',   dot: 'border-[#444] hover:bg-[#2a2a2a]',      label: 'ESTÁNDAR' },
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
    <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${
      completada ? 'border-[#1a1a1a] opacity-60' : 'border-[#222] hover:border-[#333]'
    }`}>
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
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${imp.color}`}>
              {imp.label}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${ctx.cls}`}>
              {ctx.label}
            </span>
            {t.tipo === 'ENTREGABLE' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#C9A84C]/30 text-[#C9A84C] bg-[#C9A84C]/5">
                📄 Entregable
              </span>
            )}
          </div>

          <p className={`text-sm font-medium leading-snug ${completada ? 'line-through text-gray-600' : 'text-white'}`}>
            {t.nombre}
          </p>

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

          {t.moduloDestino && t.moduloTexto && (
            <a
              href={t.moduloDestino}
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-sm text-[#C9A84C] hover:underline"
            >
              {t.moduloTexto} →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MiDiaPage() {
  const today = new Date()
  const fecha = getTodayStr()
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading]       = useState(true)
  const [generando, setGenerando]   = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/plan-trabajo/instancias?fecha=${fecha}&vista=dia`)
      const data = await res.json()
      setInstancias(data.instancias ?? [])
    } finally {
      setLoading(false)
    }
  }, [fecha])

  useEffect(() => { cargar() }, [cargar])

  async function handleGenerar() {
    setGenerando(true)
    await fetch('/api/plan-trabajo/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha }),
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
        <p className="text-gray-500 text-sm">{fmtFecha(today)}</p>
        <p className="text-xl font-semibold text-white mt-0.5">{getGreeting()}.</p>
        {total > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A84C] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{pct}% completado</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-600 text-sm">Cargando tareas del día...</div>
      ) : instancias.length === 0 ? (
        <div className="bg-[#111] border border-dashed border-[#2a2a2a] rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-white font-semibold mb-1">No hay tareas generadas para hoy</p>
          <p className="text-gray-500 text-sm mb-6">
            Genera las instancias del día a partir del plan de actividades.
          </p>
          <button
            onClick={handleGenerar}
            disabled={generando}
            className="bg-[#C9A84C] text-black font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#d4b060] disabled:opacity-50 transition-colors"
          >
            {generando ? 'Generando...' : 'Generar tareas de hoy →'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pendientes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Mis tareas de hoy
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
