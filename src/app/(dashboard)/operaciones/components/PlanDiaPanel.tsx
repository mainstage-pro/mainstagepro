'use client'

import { useEffect, useState, useCallback } from 'react'
import { PartyPopper, ClipboardList } from 'lucide-react'
import MiDiaItem, { type Instancia } from '../../plan-trabajo/hoy/MiDiaItem'

// Vista "Plan del día" embebida en /operaciones (Bloque 2).
// Lee Tarea (tipoOrigen="PLAN") del día vía /api/plan-trabajo/tareas-dia y
// reutiliza MiDiaItem. El completado persiste con PATCH /api/tareas/[id].

function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

const IMPACTO_ORDER: Record<string, number> = { critico: 0, alto: 1, estandar: 2 }
const AREA_ORDER = ['Dirección', 'Administración', 'Marketing', 'Ventas', 'Producción']
const displayArea = (n: string) => (n === 'Ventas' ? 'Comercial' : n)

const TH = (
  <thead className="bg-[#060606] border-b border-[#0d0d0d]">
    <tr>
      <th className="w-1 p-0" />
      <th className="w-10" />
      <th className="py-2 px-3 text-left text-[9px] uppercase tracking-[0.12em] text-gray-700 font-medium">Compromiso</th>
      <th className="py-2 px-3 text-left text-[9px] uppercase tracking-[0.12em] text-gray-700 font-medium hidden sm:table-cell">Responsable</th>
      <th className="py-2 px-3 text-left text-[9px] uppercase tracking-[0.12em] text-gray-700 font-medium hidden md:table-cell">Días</th>
      <th className="py-2 px-3 text-left text-[9px] uppercase tracking-[0.12em] text-gray-700 font-medium hidden lg:table-cell">Recurrencia</th>
      <th className="w-10" />
    </tr>
  </thead>
)

export default function PlanDiaPanel({ isAdmin = false }: { isAdmin?: boolean }) {
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsedSubareas, setCollapsedSubareas] = useState<Set<string>>(new Set())
  const [usuariosEquipo, setUsuariosEquipo] = useState<{ id: string; name: string }[]>([])
  const [viendoUsuarioId, setViendoUsuarioId] = useState<string | null>(null)

  const fechaStr = toDateStr(new Date())

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/usuarios')
      .then(r => r.json())
      .then(d => setUsuariosEquipo((d.usuarios ?? []).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }))))
      .catch(() => {})
  }, [isAdmin])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const userParam = viendoUsuarioId ? `&userId=${viendoUsuarioId}` : ''
      const res = await fetch(`/api/plan-trabajo/tareas-dia?fecha=${fechaStr}${userParam}`)
      const data = await res.json()
      setInstancias(data.instancias ?? [])
    } finally {
      setLoading(false)
    }
  }, [fechaStr, viendoUsuarioId])

  useEffect(() => { cargar() }, [cargar])

  async function handleToggle(id: string, currentEstado: string) {
    const goingComplete = currentEstado !== 'COMPLETADA'
    const nuevoEstado = goingComplete ? 'COMPLETADA' : 'PENDIENTE'
    setInstancias(prev => prev.map(i =>
      i.id === id ? { ...i, estado: nuevoEstado, completadaAt: goingComplete ? new Date().toISOString() : null } : i
    ))
    const res = await fetch(`/api/tareas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (!res.ok) {
      // revertir en error
      setInstancias(prev => prev.map(i =>
        i.id === id ? { ...i, estado: currentEstado, completadaAt: goingComplete ? null : i.completadaAt } : i
      ))
    }
  }

  const sorted = [...instancias].sort((a, b) => {
    const impDiff = (IMPACTO_ORDER[a.template.impacto] ?? 2) - (IMPACTO_ORDER[b.template.impacto] ?? 2)
    if (impDiff !== 0) return impDiff
    const aHora = a.template.horaLimite ?? '99:99'
    const bHora = b.template.horaLimite ?? '99:99'
    return aHora.localeCompare(bHora)
  })
  const pendientes = sorted.filter(i => i.estado !== 'COMPLETADA' && i.estado !== 'CANCELADA')
  const completadas = sorted.filter(i => i.estado === 'COMPLETADA')
  const total = instancias.length
  const pct = total > 0 ? Math.round((completadas.length / total) * 100) : 0

  const pendientesByArea = pendientes.reduce((acc, inst) => {
    const areaNombre = inst.template.area.nombre
    if (!acc[areaNombre]) acc[areaNombre] = { color: inst.template.area.color, subareas: {} }
    const subNombre = inst.template.subArea?.nombre ?? 'General'
    if (!acc[areaNombre].subareas[subNombre]) acc[areaNombre].subareas[subNombre] = []
    acc[areaNombre].subareas[subNombre].push(inst)
    return acc
  }, {} as Record<string, { color: string; subareas: Record<string, Instancia[]> }>)

  const areaKeys = Object.keys(pendientesByArea).sort(
    (a, b) => (AREA_ORDER.indexOf(a) === -1 ? 99 : AREA_ORDER.indexOf(a)) - (AREA_ORDER.indexOf(b) === -1 ? 99 : AREA_ORDER.indexOf(b))
  )

  return (
    <div className="max-w-4xl mx-auto px-3 py-4 pb-24">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] text-[#B3985B] uppercase tracking-[0.2em] font-semibold">Plan del día</p>
        <p className="ms-h1 mt-1">Compromisos del plan de trabajo</p>
        {total > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div className="h-full bg-[#B3985B] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{pct}% · {completadas.length}/{total}</span>
          </div>
        )}
      </div>

      {/* Selector de usuario (solo admin) */}
      {isAdmin && usuariosEquipo.length > 1 && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setViendoUsuarioId(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              viendoUsuarioId === null
                ? 'bg-[#B3985B]/10 border-[#B3985B]/30 text-[#B3985B]'
                : 'border-[#1e1e1e] text-gray-500 hover:text-gray-300 hover:border-[#333]'
            }`}
          >
            Mi día
          </button>
          {usuariosEquipo.map(u => (
            <button
              key={u.id}
              onClick={() => setViendoUsuarioId(u.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                viendoUsuarioId === u.id
                  ? 'bg-[#B3985B]/10 border-[#B3985B]/30 text-[#B3985B]'
                  : 'border-[#1e1e1e] text-gray-500 hover:text-gray-300 hover:border-[#333]'
              }`}
            >
              {u.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-600 text-sm">Cargando compromisos del día…</div>
      ) : total === 0 ? (
        <div className="bg-[#111] border border-dashed border-[#2a2a2a] rounded-2xl p-12 text-center">
          <ClipboardList strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-white font-semibold mb-1">No hay compromisos del plan para hoy</p>
          <p className="text-gray-500 text-sm">Las tareas del plan de trabajo se generan automáticamente cada mañana.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pendientes agrupadas por área → subárea */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Compromisos del día</p>
              <span className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 px-2 py-0.5 rounded-full">
                {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
              </span>
            </div>
            {pendientes.length === 0 ? (
              <div className="flex items-center justify-center gap-1.5 py-8 text-gray-500 text-sm">
                <PartyPopper strokeWidth={1.75} className="w-4 h-4" /> ¡Todo completado por hoy!
              </div>
            ) : (
              <div>
                {areaKeys.map((areaNombre, areaIdx) => {
                  const { color, subareas } = pendientesByArea[areaNombre]
                  const subKeys = Object.keys(subareas)
                  const areaColor = color || '#6B7280'
                  return (
                    <div key={areaNombre} className={areaIdx > 0 ? 'mt-8' : ''}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: areaColor }} />
                        <span className="text-xs font-semibold text-white">{displayArea(areaNombre)}</span>
                        <div className="h-px flex-1 bg-[#1a1a1a]" />
                        <span className="text-[9px] text-gray-700">{Object.values(subareas).flat().length}</span>
                      </div>
                      <table className="w-full">
                        {TH}
                        {subKeys.map((subNombre) => {
                          const collapseKey = `${areaNombre}__${subNombre}`
                          const isCollapsed = collapsedSubareas.has(collapseKey)
                          const toggleCollapse = () => setCollapsedSubareas(prev => {
                            const next = new Set(prev)
                            if (next.has(collapseKey)) next.delete(collapseKey)
                            else next.add(collapseKey)
                            return next
                          })
                          return (
                            <tbody key={subNombre}>
                              <tr className="bg-[#070707] border-b border-[#111] cursor-pointer select-none group" onClick={toggleCollapse}>
                                <td colSpan={7} className="px-4 py-2.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-0.5 h-4 rounded-full bg-[#B3985B]/40" />
                                    <span className="text-[11px] text-[#B3985B] uppercase tracking-[0.12em] font-semibold">{subNombre}</span>
                                    <span className="text-[10px] text-gray-700">{subareas[subNombre].length}</span>
                                    <span className="ml-auto text-gray-700 text-[10px] group-hover:text-gray-500 transition-colors">{isCollapsed ? '▶' : '▼'}</span>
                                  </div>
                                </td>
                              </tr>
                              {!isCollapsed && subareas[subNombre].map(inst => (
                                <MiDiaItem key={inst.id} instancia={inst} onToggle={handleToggle} />
                              ))}
                            </tbody>
                          )
                        })}
                      </table>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Completadas */}
          {completadas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">✓ Completadas ({completadas.length})</p>
              <table className="w-full">
                {TH}
                <tbody>
                  {completadas.map(inst => (
                    <MiDiaItem key={inst.id} instancia={inst} onToggle={handleToggle} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
