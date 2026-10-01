'use client'

import { ANCLA_CATEGORIA, type FinanzasProyecto, type Semaforo } from '@/lib/finanzas-proyecto'

const SEMAFORO = {
  IDEAL: { color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-800/30', barra: 'bg-green-500', label: 'IDEAL' },
  REGULAR: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-800/30', barra: 'bg-yellow-400', label: 'REGULAR' },
  MINIMO: { color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-800/30', barra: 'bg-orange-400', label: 'MÍNIMO' },
  RIESGO: { color: 'text-red-400', bg: 'bg-red-950/20', border: 'border-red-900/30', barra: 'bg-red-600', label: 'EN RIESGO' },
} satisfies Record<Semaforo, { color: string; bg: string; border: string; barra: string; label: string }>

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function irA(ancla: string) {
  document.getElementById(ancla)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function ResultadoFinanciero({ fin }: { fin: FinanzasProyecto }) {
  const cfg = SEMAFORO[fin.utilidad.semaforo]
  const { ingreso, costos, utilidad } = fin

  if (!fin.hayCotizacion) {
    return (
      <div className="bg-[#111] border border-dashed border-[#222] rounded-xl p-6 text-center">
        <p className="text-gray-500 text-sm">Este proyecto no tiene cotización ligada.</p>
        <p className="text-gray-700 text-xs mt-1">Sin ella no hay contra qué medir el costo del evento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* ── Resultado ── */}
      <div className={`border rounded-xl p-5 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">Resultado del evento</p>
            <p className={`text-2xl font-bold mt-1 ${cfg.color}`}>{fmt(utilidad.real)}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Utilidad con lo que lleva comprometido
            </p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-bold ${cfg.color}`}>{(utilidad.margenReal * 100).toFixed(1)}%</p>
            <p className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</p>
          </div>
        </div>

        <div className="mt-3 h-1.5 bg-[#0a0a0a]/60 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${cfg.barra}`}
            style={{ width: `${Math.min(100, Math.max(0, utilidad.margenReal * 100))}%` }} />
        </div>
        <div className="flex justify-between text-[9px] text-gray-700 mt-1">
          <span>Riesgo &lt;25%</span><span>Mínimo 25%</span><span>Regular 40%</span><span>Ideal ≥55%</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          <div className="bg-[#0d0d0d]/70 border border-[#1a1a1a] rounded-lg p-3">
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Ingreso del evento</p>
            <p className="text-sm font-bold text-white tabular-nums">{fmt(ingreso.base)}</p>
            {ingreso.iva > 0 && (
              <p className="text-[10px] text-gray-700 mt-0.5">+ {fmt(ingreso.iva)} de IVA</p>
            )}
          </div>
          <div className="bg-[#0d0d0d]/70 border border-[#1a1a1a] rounded-lg p-3">
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Costo del evento</p>
            <p className="text-sm font-bold text-orange-400 tabular-nums">{fmt(costos.real)}</p>
            <p className="text-[10px] text-gray-700 mt-0.5">{fmt(costos.porPagar)} sin pagar</p>
          </div>
          <div className="bg-[#0d0d0d]/70 border border-[#1a1a1a] rounded-lg p-3 col-span-2 sm:col-span-1">
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Se presupuestó</p>
            <p className="text-sm font-bold text-gray-300 tabular-nums">{fmt(costos.presupuesto)}</p>
            <p className={`text-[10px] mt-0.5 font-medium ${
              utilidad.desviacion > 0 ? 'text-red-400' : utilidad.desviacion < 0 ? 'text-green-500' : 'text-gray-700'
            }`}>
              {utilidad.desviacion === 0
                ? 'Va igual que el plan'
                : utilidad.desviacion > 0
                  ? `${fmt(utilidad.desviacion)} más caro`
                  : `${fmt(Math.abs(utilidad.desviacion))} más barato`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Costos por categoría ── */}
      <div className="ms-table-wrapper">
        <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Costos del evento</h3>
          <p className="text-[11px] text-gray-600">Lo que se presupuestó contra lo que va comprometido</p>
        </div>

        <div className="grid grid-cols-[1.6fr_repeat(4,minmax(0,1fr))] gap-2 px-5 py-1.5 border-b border-[#0d0d0d]">
          {['Concepto', 'Presupuesto', 'Comprometido', 'Pagado', 'Falta pagar'].map((h, i) => (
            <p key={h} className={`text-[10px] text-gray-600 uppercase tracking-wider font-semibold ${i > 0 ? 'text-right' : ''}`}>{h}</p>
          ))}
        </div>

        {costos.renglones.map(r => {
          const dif = r.real - r.presupuesto
          return (
            <button key={r.clave} onClick={() => irA(ANCLA_CATEGORIA[r.clave])}
              className="w-full grid grid-cols-[1.6fr_repeat(4,minmax(0,1fr))] gap-2 px-5 py-3 border-b border-[#0d0d0d] items-center text-left hover:bg-[#0d0d0d] transition-colors">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{r.etiqueta}</p>
                <p className="text-[10px] text-gray-600">
                  {r.conceptos === 0 ? 'Sin renglones' : `${r.conceptos} renglón${r.conceptos !== 1 ? 'es' : ''}`}
                  {r.presupuesto > 0 && dif !== 0 && (
                    <span className={dif > 0 ? ' text-red-400/80' : ' text-green-500/80'}>
                      {' · '}{dif > 0 ? '+' : ''}{fmt(dif)}
                    </span>
                  )}
                </p>
              </div>
              <p className="text-xs text-gray-500 text-right tabular-nums">{r.presupuesto > 0 ? fmt(r.presupuesto) : '—'}</p>
              <p className="text-sm text-white font-medium text-right tabular-nums">{r.real > 0 ? fmt(r.real) : '—'}</p>
              <p className="text-xs text-green-500 text-right tabular-nums">{r.pagado > 0 ? fmt(r.pagado) : '—'}</p>
              <p className={`text-xs text-right tabular-nums ${r.porPagar > 0 ? 'text-yellow-400' : 'text-gray-700'}`}>
                {r.porPagar > 0 ? fmt(r.porPagar) : '—'}
              </p>
            </button>
          )
        })}

        <div className="grid grid-cols-[1.6fr_repeat(4,minmax(0,1fr))] gap-2 px-5 py-3 bg-[#0d0d0d] border-t border-[#111] items-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Costo total</p>
          <p className="text-xs text-gray-400 text-right tabular-nums">{fmt(costos.presupuesto)}</p>
          <p className="text-sm text-orange-400 font-bold text-right tabular-nums">{fmt(costos.real)}</p>
          <p className="text-xs text-green-400 font-semibold text-right tabular-nums">{fmt(costos.pagado)}</p>
          <p className="text-xs text-yellow-400 font-semibold text-right tabular-nums">{fmt(costos.porPagar)}</p>
        </div>

        {fin.avisos.length > 0 && (
          <div className="px-5 py-3 border-t border-[#1a1a1a] space-y-1">
            {fin.avisos.map((a, i) => (
              <p key={i} className="text-[11px] text-yellow-600/90">· {a}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
