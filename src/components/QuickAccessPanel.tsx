'use client'

import { useState, useEffect, useCallback } from 'react'
import { showUndoToast } from '@/components/ui/undo-toast'

type Tab = 'midia' | 'tareas'

// ── Types ──
type Instancia = {
  id: string
  estado: string
  completadaAt: string | null
  template: {
    nombre: string
    impacto: string
    area: { nombre: string; color: string }
    subArea: { nombre: string }
  }
}

type Tarea = {
  id: string
  titulo: string
  estado: string
  prioridad: string
  fechaVencimiento: string | null
  proyectoTarea: { id: string; nombre: string; color: string | null } | null
  asignadoA: { id: string; name: string } | null
}

// ── Helpers ──
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const PRIO_COLOR: Record<string, string> = {
  URGENTE: '#f87171',
  ALTA:    '#fb923c',
  MEDIA:   '#C9A84C',
  BAJA:    '#6b7280',
}

const IMPACTO_COLOR: Record<string, string> = {
  critico:  '#ef4444',
  alto:     '#f97316',
  estandar: '#444',
}

// ── Main component ──
export default function QuickAccessPanel() {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState<Tab>('midia')

  // Mi Día
  const [instancias, setInstancias]       = useState<Instancia[]>([])
  const [loadingMiDia, setLoadingMiDia]   = useState(false)

  // Tareas
  const [tareas, setTareas]               = useState<Tarea[]>([])
  const [loadingTareas, setLoadingTareas] = useState(false)

  // Keyboard shortcut: Cmd/Ctrl + Shift + P
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Load Mi Día
  const loadMiDia = useCallback(async () => {
    setLoadingMiDia(true)
    try {
      const today = toDateStr(new Date())
      const res   = await fetch(`/api/plan-trabajo/instancias?fecha=${today}&vista=dia`)
      const data  = await res.json()
      setInstancias(data.instancias ?? [])
    } catch { /* silent */ } finally {
      setLoadingMiDia(false)
    }
  }, [])

  // Load Tareas — vista=hoy shows today's tasks from the Tareas module (same as "Hoy" section)
  const loadTareas = useCallback(async () => {
    setLoadingTareas(true)
    try {
      const res  = await fetch('/api/tareas?vista=hoy')
      const data = await res.json()
      setTareas(data.tareas ?? [])
    } catch { /* silent */ } finally {
      setLoadingTareas(false)
    }
  }, [])

  // Load data when opening or switching tabs
  useEffect(() => {
    if (!open) return
    if (tab === 'midia')  loadMiDia()
    if (tab === 'tareas') loadTareas()
  }, [open, tab, loadMiDia, loadTareas])

  // Toggle task completion in Mi Día
  async function handleToggleMiDia(id: string, currentEstado: string) {
    const goingComplete = currentEstado !== 'COMPLETADA'
    if (!goingComplete) {
      const res = await fetch('/api/plan-trabajo/instancias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanciaId: id, estado: 'PENDIENTE' }),
      })
      if (res.ok) {
        setInstancias(prev =>
          prev.map(i => i.id === id ? { ...i, estado: 'PENDIENTE', completadaAt: null } : i)
        )
      }
      return
    }
    // Optimistic update
    setInstancias(prev =>
      prev.map(i => i.id === id ? { ...i, estado: 'COMPLETADA', completadaAt: new Date().toISOString() } : i)
    )
    showUndoToast({
      message: 'Tarea completada',
      duration: 5000,
      onUndo: () => {
        setInstancias(prev =>
          prev.map(i => i.id === id ? { ...i, estado: 'PENDIENTE', completadaAt: null } : i)
        )
      },
      onConfirm: async () => {
        await fetch('/api/plan-trabajo/instancias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanciaId: id, estado: 'COMPLETADA' }),
        })
      },
    })
  }

  const pendientes  = instancias.filter(i => i.estado !== 'COMPLETADA' && i.estado !== 'OMITIDA')
  const completadas = instancias.filter(i => i.estado === 'COMPLETADA')
  const pct = instancias.length > 0 ? Math.round((completadas.length / instancias.length) * 100) : 0

  // Group pendientes by area
  const byArea = pendientes.reduce((acc, inst) => {
    const key = inst.template.area.nombre
    if (!acc[key]) acc[key] = { color: inst.template.area.color, tasks: [] }
    acc[key].tasks.push(inst)
    return acc
  }, {} as Record<string, { color: string; tasks: Instancia[] }>)

  return (
    <>
      {/* Toggle triggers — vertical pill buttons on right edge, always visible */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[88] flex-col gap-1 hidden lg:flex">
        {/* Mi Día trigger */}
        <button
          onClick={() => {
            if (open && tab === 'midia') setOpen(false)
            else { setTab('midia'); setOpen(true) }
          }}
          className={`group flex items-center gap-1.5 px-2.5 py-3 rounded-l-xl border-l border-t border-b transition-all duration-200 ${
            open && tab === 'midia'
              ? 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]'
              : 'bg-[#0d0d0d]/90 border-[#1e1e1e] text-gray-600 hover:text-white hover:border-[#2a2a2a] hover:bg-[#111]'
          } backdrop-blur-sm`}
          title="Mi Día (⌘⇧P)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {instancias.length > 0 && (
            <span className="text-[9px] font-bold tabular-nums">{pct}%</span>
          )}
        </button>

        {/* Tareas trigger */}
        <button
          onClick={() => {
            if (open && tab === 'tareas') setOpen(false)
            else { setTab('tareas'); setOpen(true) }
          }}
          className={`group flex items-center gap-1.5 px-2.5 py-3 rounded-l-xl border-l border-t border-b transition-all duration-200 ${
            open && tab === 'tareas'
              ? 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]'
              : 'bg-[#0d0d0d]/90 border-[#1e1e1e] text-gray-600 hover:text-white hover:border-[#2a2a2a] hover:bg-[#111]'
          } backdrop-blur-sm`}
          title="Tareas"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          {tareas.length > 0 && (
            <span className="text-[9px] font-bold tabular-nums">{tareas.length}</span>
          )}
        </button>
      </div>

      {/* Panel — slides in from right, no backdrop overlay */}
      <div
        className={`fixed top-0 right-0 h-full z-[87] hidden lg:flex flex-col w-[380px] bg-[#080808] border-l border-[#141414] shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#111] shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab('midia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === 'midia'
                  ? 'bg-[#C9A84C]/10 text-[#C9A84C]'
                  : 'text-gray-600 hover:text-gray-300 hover:bg-[#111]'
              }`}
            >
              📅 Mi Día
            </button>
            <button
              onClick={() => setTab('tareas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === 'tareas'
                  ? 'bg-[#C9A84C]/10 text-[#C9A84C]'
                  : 'text-gray-600 hover:text-gray-300 hover:bg-[#111]'
              }`}
            >
              ✅ Tareas
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-700 hidden xl:inline">⌘⇧P</span>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-700 hover:text-white hover:bg-[#1a1a1a] transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── MI DÍA TAB ── */}
          {tab === 'midia' && (
            <div className="p-4">
              {/* Progress bar */}
              {instancias.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">Hoy</span>
                    <span className="text-[10px] text-gray-500">{completadas.length}/{instancias.length} · {pct}%</span>
                  </div>
                  <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C9A84C] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {loadingMiDia ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-10 bg-[#111] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : instancias.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-700 text-sm">Sin tareas hoy</p>
                  <button
                    onClick={loadMiDia}
                    className="mt-2 text-xs text-gray-600 hover:text-gray-400 underline"
                  >
                    Recargar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pendientes grouped by area */}
                  {Object.entries(byArea).map(([areaNombre, { color, tasks }]) => (
                    <div key={areaNombre}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{areaNombre}</span>
                        <div className="h-px flex-1 bg-[#111]" />
                      </div>
                      <div className="space-y-1 pl-1">
                        {tasks.map(inst => (
                          <div
                            key={inst.id}
                            className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[#0f0f0f] transition-colors group cursor-pointer"
                            onClick={() => handleToggleMiDia(inst.id, inst.estado)}
                          >
                            {/* Checkbox circle */}
                            <div
                              className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                                inst.estado === 'COMPLETADA'
                                  ? 'bg-[#C9A84C] border-[#C9A84C]'
                                  : 'border-[#333] group-hover:border-[#555]'
                              }`}
                              style={inst.estado !== 'COMPLETADA' ? {
                                borderColor: (IMPACTO_COLOR[inst.template.impacto] ?? '#333') + '60',
                              } : {}}
                            >
                              {inst.estado === 'COMPLETADA' && (
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
                                  <path d="M20 6L9 17l-5-5"/>
                                </svg>
                              )}
                            </div>
                            {/* Task name + subarea */}
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs leading-snug ${
                                inst.estado === 'COMPLETADA'
                                  ? 'line-through text-gray-600'
                                  : 'text-gray-300'
                              }`}>
                                {inst.template.nombre}
                              </p>
                              <p className="text-[9px] text-gray-700 mt-0.5">{inst.template.subArea.nombre}</p>
                            </div>
                            {/* Impact dot */}
                            {inst.template.impacto !== 'estandar' && (
                              <div
                                className="w-1 h-1 rounded-full shrink-0 mt-1.5"
                                style={{ backgroundColor: IMPACTO_COLOR[inst.template.impacto] ?? '#444' }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Completadas section */}
                  {completadas.length > 0 && (
                    <div className="border-t border-[#0f0f0f] pt-3">
                      <p className="text-[9px] text-gray-700 uppercase tracking-wider mb-2">
                        {completadas.length} completada{completadas.length !== 1 ? 's' : ''}
                      </p>
                      <div className="space-y-1">
                        {completadas.map(inst => (
                          <div
                            key={inst.id}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#0f0f0f] transition-colors"
                            onClick={() => handleToggleMiDia(inst.id, inst.estado)}
                          >
                            <div className="w-4 h-4 rounded-full bg-[#C9A84C] shrink-0 flex items-center justify-center">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            </div>
                            <p className="text-[11px] text-gray-700 line-through truncate">{inst.template.nombre}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer link */}
              <div className="mt-6 pt-4 border-t border-[#0f0f0f]">
                <a
                  href="/plan-trabajo/hoy"
                  className="flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-[#C9A84C] transition-colors"
                >
                  Ver módulo completo
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              </div>
            </div>
          )}

          {/* ── TAREAS TAB ── */}
          {tab === 'tareas' && (
            <div className="p-4">
              {loadingTareas ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-10 bg-[#111] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : tareas.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-700 text-sm">Sin tareas para hoy</p>
                  <button
                    onClick={loadTareas}
                    className="mt-2 text-xs text-gray-600 hover:text-gray-400 underline"
                  >
                    Recargar
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">
                      {tareas.length} tarea{tareas.length !== 1 ? 's' : ''} hoy
                    </span>
                  </div>
                  {tareas.map(t => (
                    <a
                      key={t.id}
                      href={`/tareas/${t.id}`}
                      className="flex items-start gap-2.5 px-2 py-2.5 rounded-lg hover:bg-[#0f0f0f] transition-colors group block"
                    >
                      {/* Priority dot */}
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: PRIO_COLOR[t.prioridad] ?? '#444' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-300 group-hover:text-white leading-snug truncate">{t.titulo}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {t.proyectoTarea && (
                            <span className="text-[9px] text-gray-600 truncate max-w-[120px]">{t.proyectoTarea.nombre}</span>
                          )}
                          {t.fechaVencimiento && (
                            <span className="text-[9px] text-gray-700">
                              {new Date(t.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="w-3 h-3 text-gray-700 group-hover:text-gray-500 shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </a>
                  ))}
                </div>
              )}

              {/* Footer link */}
              <div className="mt-6 pt-4 border-t border-[#0f0f0f]">
                <a
                  href="/tareas?vista=hoy"
                  className="flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-[#C9A84C] transition-colors"
                >
                  Ver módulo de tareas
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
