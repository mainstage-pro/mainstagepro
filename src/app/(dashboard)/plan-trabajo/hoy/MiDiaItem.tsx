'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'

// ── Tipo compartido de instancia del plan de trabajo ────────────────────────────

export type Instancia = {
  id: string
  estado: string
  notas: string | null
  razonNoRealizado: string | null
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

export const DIAS_PLAN_LABEL: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V' }

export const FRECUENCIA_LABEL: Record<string, string> = {
  DIARIO: 'Diario', SEMANAL: 'Semanal', QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual', TRIMESTRAL: 'Trimestral', POR_EVENTO: 'Por evento',
}

export const IMPACTO: Record<string, { bar: string; dot: string; label: string; labelCls: string }> = {
  critico:  { bar: 'bg-red-500',    dot: 'border-red-500/60 hover:bg-red-500/10',      label: 'Crítico',   labelCls: 'text-red-400' },
  alto:     { bar: 'bg-orange-400', dot: 'border-orange-400/50 hover:bg-orange-400/10', label: 'Alto',      labelCls: 'text-orange-400' },
  estandar: { bar: 'bg-[#333]',     dot: 'border-[#444] hover:bg-[#2a2a2a]',           label: 'Estándar',  labelCls: 'text-gray-600' },
}

export const RAZONES_NO_REALIZADO = [
  { key: 'no_alcanzo_tiempo',   label: '🕐 No alcanzó el tiempo' },
  { key: 'ya_estaba_cubierto',  label: '✅ Ya estaba cubierto' },
  { key: 'tarea_no_clara',      label: '❓ Tarea no era clara' },
  { key: 'no_habia_necesidad',  label: '🚫 No había necesidad' },
]

// ── MiDiaItem ──────────────────────────────────────────────────────────────────

export default function MiDiaItem({
  instancia,
  onToggle,
  onNoRealizado,
}: {
  instancia: Instancia
  onToggle: (id: string, currentEstado: string) => Promise<void>
  onNoRealizado?: (id: string, razon: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [showRazones, setShowRazones] = useState(false)
  const completada = instancia.estado === 'COMPLETADA'
  const noRealizado = instancia.estado === 'NO_REALIZADO'
  const { template: t } = instancia
  const imp = IMPACTO[t.impacto] ?? IMPACTO.estandar
  const router = useRouter()

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(true)
    await onToggle(instancia.id, instancia.estado)
    setToggling(false)
  }

  async function handleSelectRazon(razon: string) {
    setShowRazones(false)
    if (onNoRealizado) await onNoRealizado(instancia.id, razon)
  }

  return (
    <>
      <tr
        className={`border-b border-[#111] transition-colors group cursor-pointer ${
          completada || noRealizado ? 'opacity-50' : 'hover:bg-[#0a0a0a]'
        } ${expanded ? 'bg-[#0d0d0d]' : ''}`}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Left bar — area color */}
        <td className="w-1 p-0">
          <div
            className="w-1 min-h-[44px] h-full rounded-l-sm"
            style={{
              backgroundColor: noRealizado ? '#555' : (t.area.color || '#333'),
              opacity: noRealizado ? 0.4 : t.impacto === 'critico' ? 1 : t.impacto === 'alto' ? 0.55 : 0.25,
            }}
          />
        </td>

        {/* Check circle */}
        <td className="w-10 py-3 px-2" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
              completada
                ? 'bg-green-500 border-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]'
                : noRealizado
                ? 'bg-[#2a1a1a] border-[#5a2a2a] hover:border-red-800'
                : toggling
                ? 'border-[#c9a96a] animate-pulse'
                : 'border-[#c9a96a] hover:bg-[#c9a96a]/20 hover:shadow-[0_0_0_3px_rgba(201,168,76,0.18)]'
            }`}
          >
            {completada && <span className="text-white text-[10px] font-bold">✓</span>}
            {noRealizado && <span className="text-red-800 text-[10px] font-bold">✗</span>}
            {!completada && !noRealizado && !toggling && <span className="w-2 h-2 rounded-full bg-[#c9a96a]/50" />}
          </button>
        </td>

        {/* Nombre + chips */}
        <td className="py-3 px-3">
          <div className="flex items-start gap-2 flex-wrap">
            <span className={`text-sm leading-snug ${
              completada ? 'line-through text-gray-600' : noRealizado ? 'line-through text-gray-700' : 'text-white'
            }`}>{t.nombre}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {noRealizado && instancia.razonNoRealizado && (
              <span className="text-[9px] text-red-900 bg-red-950/30 px-1.5 py-0.5 rounded-full border border-red-900/20">
                {RAZONES_NO_REALIZADO.find(r => r.key === instancia.razonNoRealizado)?.label ?? instancia.razonNoRealizado}
              </span>
            )}
            {!noRealizado && t.impacto !== 'estandar' && (
              <span className={`text-[9px] ${
                t.impacto === 'critico' ? 'text-red-400' : 'text-orange-400'
              }`}>{imp.label}</span>
            )}
            {!noRealizado && t.tipo === 'ENTREGABLE' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#c9a96a]/30 text-[#c9a96a]">Entregable</span>
            )}
            {!noRealizado && t.cuando && !expanded && (
              <span className="text-[10px] text-gray-600 truncate max-w-[160px]">{t.cuando}</span>
            )}
            {/* Módulo link */}
            {!noRealizado && t.moduloDestino && t.moduloTexto && !t.esAccionCampo && t.moduloDisponible && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); router.push(t.moduloDestino!.split('#')[0]) }}
                className="text-[9px] text-[#c9a96a] hover:underline"
              >
                → {t.moduloTexto}
              </button>
            )}
          </div>
        </td>

        {/* Responsable */}
        <td className="py-3 px-3 hidden sm:table-cell">
          {instancia.responsable ? (
            <span className="text-xs text-gray-500">{instancia.responsable.name.split(' ')[0]}</span>
          ) : t.puestoDefault === 'Todo el equipo' ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full"><Users strokeWidth={1.75} className="w-3 h-3" /> Todos</span>
          ) : null}
        </td>

        {/* Días */}
        <td className="py-3 px-3 hidden md:table-cell">
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(d => (
              <span
                key={d}
                className={`text-[8px] w-3.5 h-3.5 rounded flex items-center justify-center font-bold ${
                  (t.diasSemana ?? []).includes(d)
                    ? 'bg-[#c9a96a]/20 text-[#c9a96a]'
                    : 'bg-[#111] text-gray-700'
                }`}
              >
                {DIAS_PLAN_LABEL[d]}
              </span>
            ))}
          </div>
        </td>

        {/* Frecuencia */}
        <td className="py-3 px-3 hidden lg:table-cell">
          <span className="text-[10px] text-gray-600">
            {FRECUENCIA_LABEL[t.frecuencia] ?? t.frecuencia}
          </span>
        </td>

        {/* Chevron + No realizado */}
        <td className="py-3 px-2 text-right w-16" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {/* No realizado button — only for pending tasks */}
            {!completada && !noRealizado && onNoRealizado && (
              <div className="relative">
                <button
                  type="button"
                  title="Marcar como no realizado"
                  onClick={e => { e.stopPropagation(); setShowRazones(v => !v) }}
                  className="text-[#3a3a3a] hover:text-red-800 text-[10px] px-1.5 py-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  ✗
                </button>
                {showRazones && (
                  <div className="absolute right-0 top-6 z-50 ms-card shadow-2xl py-1 w-52">
                    <p className="text-[8px] uppercase tracking-wider text-gray-600 px-3 py-1.5">¿Por qué no se realizó?</p>
                    {RAZONES_NO_REALIZADO.map(r => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => handleSelectRazon(r.key)}
                        className="w-full text-left px-3 py-2 text-[11px] text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-[#080808] border-b border-[#0d0d0d]">
          <td colSpan={7} className="px-4 pb-4 pt-0">
            <div className="ml-12 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {t.cuando && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500">
                    <span className="text-gray-700">⏰ Cuándo: </span>{t.cuando}
                  </p>
                </div>
              )}
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
              {t.moduloDestino && t.moduloTexto && !t.esAccionCampo && (
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); router.push(t.moduloDestino!.split('#')[0]) }}
                    className="inline-flex items-center gap-1.5 text-sm text-[#c9a96a] hover:underline"
                  >
                    {t.moduloTexto} →
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
