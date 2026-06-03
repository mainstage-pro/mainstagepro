'use client'

const SEMAFORO_CFG = {
  IDEAL:   { color: 'text-green-400',  bg: 'bg-green-900/20',  border: 'border-green-800/30',  dot: 'bg-green-500',  label: 'IDEAL'   },
  REGULAR: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-800/30', dot: 'bg-yellow-400', label: 'REGULAR' },
  MINIMO:  { color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-800/30', dot: 'bg-orange-400', label: 'MÍNIMO'  },
  RIESGO:  { color: 'text-gray-400',   bg: 'bg-[#0f0f0f]',    border: 'border-[#1e1e1e]',    dot: 'bg-gray-600',  label: 'Riesgo'  },
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export type ViabilidadActiva = {
  semaforo: string
  pctUtilidad: number
  utilidadViva: number
  total: number
  costoReal: number
  estado: string
  desgloseCostos: {
    operacion: number; transporte: number; hospedaje: number; comidas: number; total: number
  }
}

export type ViabilidadHistoricoItem = {
  id: string; numero: string; version: number; estado: string
  esActiva: boolean; pctUtilidad: number; total: number; semaforo: string
}

export function ViabilidadWidget({
  viabilidadActiva,
  historico,
}: {
  viabilidadActiva: ViabilidadActiva | null
  historico: ViabilidadHistoricoItem[]
}) {
  if (!viabilidadActiva) {
    return (
      <div className="bg-[#111] border border-dashed border-[#222] rounded-xl p-4 text-center">
        <p className="text-gray-600 text-xs">Sin cotización asociada para calcular viabilidad</p>
      </div>
    )
  }

  const cfg = SEMAFORO_CFG[viabilidadActiva.semaforo as keyof typeof SEMAFORO_CFG] ?? SEMAFORO_CFG.RIESGO
  const pct = (viabilidadActiva.pctUtilidad * 100).toFixed(1)

  return (
    <div className="space-y-3">
      {/* Semáforo principal */}
      <div className={`border rounded-xl p-4 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
            <div>
              <p className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-gray-500 text-xs">Margen de utilidad estimada</p>
            </div>
          </div>
          <p className={`text-4xl font-bold ${cfg.color}`}>{pct}%</p>
        </div>
        <div className="mt-3 h-1.5 bg-[#0a0a0a]/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${cfg.dot}`}
            style={{ width: `${Math.min(100, viabilidadActiva.pctUtilidad * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-gray-700 mt-1">
          <span>Riesgo &lt;25%</span><span>Mínimo 25%</span><span>Regular 40%</span><span>Ideal ≥55%</span>
        </div>
      </div>

      {/* Desglose 3 columnas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Total cotizado</p>
          <p className="text-sm font-bold text-white">{fmt(viabilidadActiva.total)}</p>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Costos operativos</p>
          <p className="text-sm font-bold text-orange-400">{fmt(viabilidadActiva.costoReal)}</p>
        </div>
        <div className={`border rounded-xl p-3 ${cfg.bg} ${cfg.border}`}>
          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Utilidad estimada</p>
          <p className={`text-sm font-bold ${cfg.color}`}>{fmt(viabilidadActiva.utilidadViva)}</p>
        </div>
      </div>

      {/* Versiones si hay más de 1 */}
      {historico.length > 1 && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 px-3 py-2 border-b border-[#111]">Versiones de cotización</p>
          {historico.map(h => {
            const hCfg = SEMAFORO_CFG[h.semaforo as keyof typeof SEMAFORO_CFG] ?? SEMAFORO_CFG.RIESGO
            return (
              <div key={h.id} className={`flex items-center justify-between px-3 py-2.5 border-b border-[#111] last:border-0 ${h.esActiva ? 'bg-[#131313]' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hCfg.dot}`} />
                  <span className="text-xs text-gray-400">{h.numero} v{h.version}</span>
                  {h.esActiva && <span className="text-[8px] text-[#C9A84C] border border-[#C9A84C]/30 px-1.5 py-0.5 rounded-full">Activa</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${hCfg.color}`}>{(h.pctUtilidad * 100).toFixed(1)}%</span>
                  <span className="text-xs text-gray-500">{fmt(h.total)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
