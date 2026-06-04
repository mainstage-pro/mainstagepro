'use client'

import { useState, useEffect, useCallback } from 'react'
import { showUndoToast } from '@/components/ui/undo-toast'
import DatePicker from '@/components/ui/DatePicker'
import { getAreaColor } from '@/lib/areaColors'

type Tab = 'midia' | 'tareas'

// ── Types ──
type Instancia = {
  id: string
  estado: string
  completadaAt: string | null
  template: {
    id: string
    nombre: string
    impacto: string
    area: { nombre: string; color: string }
    subArea: { nombre: string }
  }
}

type TemplateDetail = {
  id: string
  nombre: string
  descripcion: string | null
  estandarMinimo: string | null
  porqueSeHace: string | null
  siNoSeHace: string | null
  relacionCon: string | null
}

type Tarea = {
  id: string
  titulo: string
  estado: string
  prioridad: string
  fecha: string | null
  fechaVencimiento: string | null
  area: string
  proyectoTarea: { id: string; nombre: string; color: string | null } | null
  asignadoA: { id: string; name: string } | null
  _count: { subtareas: number; comentarios: number }
}

// ── Helpers ──
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const AREA_LABEL: Record<string, string> = {
  VENTAS:         'Ventas',
  PRODUCCION:     'Producción',
  MARKETING:      'Marketing',
  ADMINISTRACION: 'Administración',
  RRHH:           'RRHH',
  DIRECCION:      'Dirección',
  GENERAL:        'General',
}

const AREA_ORDER = ['DIRECCION','VENTAS','PRODUCCION','MARKETING','ADMINISTRACION','RRHH','GENERAL']

function formatFecha(iso: string | null): { label: string; color: string } | null {
  if (!iso) return null
  const today = new Date()
  today.setHours(0,0,0,0)
  const d = new Date(iso + 'T00:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return { label: 'Vencida', color: '#ef4444' }
  if (diff === 0) return { label: 'Hoy',    color: '#22c55e' }
  if (diff === 1) return { label: 'Mañana', color: '#C9A84C' }
  return {
    label: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
    color: '#6b7280',
  }
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

  // Mi Día expand detail
  const [expandedMiDiaId, setExpandedMiDiaId]   = useState<string | null>(null)
  const [templateDetails, setTemplateDetails]   = useState<Record<string, TemplateDetail>>({})
  const [loadingTemplate, setLoadingTemplate]   = useState<string | null>(null)

  // Tareas
  const [tareas, setTareas]               = useState<Tarea[]>([])
  const [loadingTareas, setLoadingTareas] = useState(false)
  const [editingDateId, setEditingDateId] = useState<string | null>(null)

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

  // Complete a Tarea with undo toast
  async function handleCompleteTask(id: string) {
    // Optimistically remove from list
    setTareas(prev => prev.filter(t => t.id !== id))
    showUndoToast({
      message: 'Tarea completada',
      duration: 4000,
      onUndo: () => {
        loadTareas() // reload the list
      },
      onConfirm: async () => {
        await fetch(`/api/tareas/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'COMPLETADA' }),
        })
      },
    })
  }

  async function handleDateChange(id: string, fecha: string) {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, fecha: fecha || null } : t))
    setEditingDateId(null)
    await fetch(`/api/tareas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: fecha || null }),
    })
  }

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

  // Open/collapse Mi Día task detail
  async function handleOpenMiDiaTask(inst: Instancia) {
    const templateId = inst.template.id
    if (expandedMiDiaId === inst.id) {
      setExpandedMiDiaId(null)
      return
    }
    setExpandedMiDiaId(inst.id)
    if (!templateDetails[templateId]) {
      setLoadingTemplate(inst.id)
      try {
        const res  = await fetch(`/api/plan-trabajo/templates/${templateId}`)
        const data = await res.json()
        const t    = data.template ?? data
        setTemplateDetails(prev => ({ ...prev, [templateId]: t }))
      } catch {
        // silent
      } finally {
        setLoadingTemplate(null)
      }
    }
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
      {/* CHANGE 1 — Single toggle trigger button on right edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[88] hidden lg:flex">
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex flex-col items-center gap-1.5 px-2 py-4 rounded-l-xl border-l border-t border-b transition-all duration-200 backdrop-blur-sm ${
            open
              ? 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]'
              : 'bg-[#0d0d0d]/90 border-[#1e1e1e] text-gray-600 hover:text-white hover:border-[#2a2a2a] hover:bg-[#111]'
          }`}
          title="Vista rapida (Cmd+Shift+P)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          {(instancias.filter(i => i.estado !== 'COMPLETADA' && i.estado !== 'OMITIDA').length + tareas.length) > 0 && (
            <span className="text-[9px] font-bold tabular-nums leading-none">
              {instancias.filter(i => i.estado !== 'COMPLETADA' && i.estado !== 'OMITIDA').length + tareas.length}
            </span>
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
                        {/* CHANGE 2D — separate circle-check from task click */}
                        {tasks.map(inst => (
                          <div key={inst.id}>
                            <div className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[#0f0f0f] transition-colors group">
                              {/* Checkbox circle - ONLY this triggers complete */}
                              <button
                                onClick={e => { e.stopPropagation(); handleToggleMiDia(inst.id, inst.estado) }}
                                className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                                  inst.estado === 'COMPLETADA'
                                    ? 'bg-[#C9A84C] border-[#C9A84C]'
                                    : 'border-[#333] group-hover:border-[#555]'
                                }`}
                                style={inst.estado !== 'COMPLETADA' ? {
                                  borderColor: (IMPACTO_COLOR[inst.template.impacto] ?? '#333') + '60',
                                } : {}}
                                title="Completar"
                              >
                                {inst.estado === 'COMPLETADA' && (
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
                                    <path d="M20 6L9 17l-5-5"/>
                                  </svg>
                                )}
                              </button>

                              {/* Task name - click to expand detail */}
                              <div
                                className="min-w-0 flex-1 cursor-pointer"
                                onClick={() => handleOpenMiDiaTask(inst)}
                              >
                                <p className={`text-xs leading-snug transition-colors ${
                                  inst.estado === 'COMPLETADA'
                                    ? 'line-through text-gray-600'
                                    : 'text-gray-300 hover:text-white'
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

                              {/* Expand chevron */}
                              <button
                                onClick={() => handleOpenMiDiaTask(inst)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                              >
                                <svg
                                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"
                                  style={{ transform: expandedMiDiaId === inst.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                                >
                                  <path d="M6 9l6 6 6-6"/>
                                </svg>
                              </button>
                            </div>

                            {/* Expanded detail panel */}
                            {expandedMiDiaId === inst.id && (
                              <div className="ml-7 mr-2 mb-2 px-3 py-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
                                {loadingTemplate === inst.id ? (
                                  <div className="space-y-1.5">
                                    <div className="h-2 bg-[#1a1a1a] rounded animate-pulse w-3/4" />
                                    <div className="h-2 bg-[#1a1a1a] rounded animate-pulse w-1/2" />
                                  </div>
                                ) : (() => {
                                  const detail = templateDetails[inst.template.id]
                                  if (!detail) return <p className="text-[10px] text-gray-700">Sin detalles disponibles</p>
                                  const fields = [
                                    { label: 'Descripcion', value: detail.descripcion },
                                    { label: 'Estandar minimo', value: detail.estandarMinimo },
                                    { label: 'Por que se hace', value: detail.porqueSeHace },
                                    { label: 'Si no se hace', value: detail.siNoSeHace },
                                    { label: 'Se relaciona con', value: detail.relacionCon },
                                  ].filter(f => f.value)
                                  if (fields.length === 0) return <p className="text-[10px] text-gray-700">Sin descripcion adicional</p>
                                  return (
                                    <div className="space-y-2">
                                      {fields.map(f => (
                                        <div key={f.label}>
                                          <p className="text-[8px] uppercase tracking-wider text-gray-700 mb-0.5">{f.label}</p>
                                          <p className="text-[10px] text-gray-400 leading-relaxed">{f.value}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                })()}
                              </div>
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
                          <div key={inst.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#0f0f0f] transition-colors">
                            <button
                              onClick={() => handleToggleMiDia(inst.id, inst.estado)}
                              className="w-4 h-4 rounded-full bg-[#C9A84C] shrink-0 flex items-center justify-center"
                            >
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            </button>
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
          {/* CHANGE 3 — outer div for each task row has NO onClick (already correct) */}
          {tab === 'tareas' && (
            <div className="p-4">
              {loadingTareas ? (
                <div className="space-y-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-10 bg-[#111] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : tareas.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-2xl mb-2">☀️</p>
                  <p className="text-gray-600 text-sm font-medium">Nada para hoy</p>
                  <p className="text-gray-700 text-xs mt-1">Todas las tareas completadas</p>
                  <button
                    onClick={loadTareas}
                    className="mt-3 text-xs text-gray-600 hover:text-gray-400 underline"
                  >
                    Recargar
                  </button>
                </div>
              ) : (() => {
                // Group by project — same as real operaciones Hoy module
                const byProyecto = tareas.reduce((acc, t) => {
                  const key = t.proyectoTarea?.nombre ?? 'Bandeja de entrada'
                  if (!acc[key]) acc[key] = { color: t.proyectoTarea?.color ?? null, tasks: [] }
                  acc[key].tasks.push(t)
                  return acc
                }, {} as Record<string, { color: string | null; tasks: Tarea[] }>)

                const proyKeys = Object.keys(byProyecto).sort((a, b) => {
                  if (a === 'Bandeja de entrada') return 1
                  if (b === 'Bandeja de entrada') return -1
                  return a.localeCompare(b, 'es')
                })

                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-600 uppercase tracking-wider">{tareas.length} tarea{tareas.length !== 1 ? 's' : ''} hoy</span>
                      <button onClick={loadTareas} className="text-[9px] text-gray-700 hover:text-gray-500 transition-colors">↺ Actualizar</button>
                    </div>

                    {proyKeys.map(proyNombre => {
                      const dotColor = byProyecto[proyNombre].color ?? '#6b7280'
                      const tasks = [...byProyecto[proyNombre].tasks].sort((a, b) => {
                        // Sort by fecha asc (overdue first), nulls last
                        if (!a.fecha && !b.fecha) return 0
                        if (!a.fecha) return 1
                        if (!b.fecha) return -1
                        return a.fecha.localeCompare(b.fecha)
                      })

                      return (
                        <div key={proyNombre}>
                          {/* Project header — same style as real operaciones Hoy module */}
                          <div
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1"
                            style={{ backgroundColor: dotColor + '18' }}
                          >
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                            <span
                              className="text-[11px] font-semibold flex-1 truncate"
                              style={{ color: dotColor === '#6b7280' ? '#9ca3af' : dotColor }}
                            >
                              {proyNombre}
                            </span>
                            <span className="text-[9px] text-gray-600 font-medium">{tasks.length}</span>
                          </div>

                          {/* Task rows — outer div has NO onClick */}
                          <div className="space-y-0.5">
                            {tasks.map(t => {
                              const fechaInfo = formatFecha(t.fecha)
                              const isEditingDate = editingDateId === t.id

                              return (
                                <div
                                  key={t.id}
                                  className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-[#0a0a0a] transition-colors group"
                                >
                                  {/* Complete circle */}
                                  <button
                                    onClick={() => handleCompleteTask(t.id)}
                                    className="mt-0.5 w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-all hover:border-white/40"
                                    style={{ borderColor: (PRIO_COLOR[t.prioridad] ?? '#444') + '80' }}
                                    title="Completar"
                                  >
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-gray-600">✓</span>
                                  </button>

                                  {/* Content */}
                                  <div className="min-w-0 flex-1">
                                    {/* Title + open link */}
                                    <a
                                      href={`/operaciones?open=${t.id}`}
                                      className="text-xs text-gray-300 hover:text-white leading-snug block truncate transition-colors"
                                      title={t.titulo}
                                    >
                                      {t.titulo}
                                    </a>

                                    {/* Meta row */}
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      {/* Project badge */}
                                      {t.proyectoTarea && (
                                        <span className="text-[9px] text-gray-700 truncate max-w-[100px]">
                                          {t.proyectoTarea.nombre}
                                        </span>
                                      )}

                                      {/* Subtareas count */}
                                      {t._count.subtareas > 0 && (
                                        <span className="text-[9px] text-gray-700">
                                          {t._count.subtareas} sub
                                        </span>
                                      )}

                                      {/* Date badge — click to edit */}
                                      <div className="relative">
                                        <button
                                          onClick={() => setEditingDateId(isEditingDate ? null : t.id)}
                                          className={`text-[9px] px-1.5 py-0.5 rounded-full transition-colors border ${
                                            fechaInfo
                                              ? 'border-transparent hover:border-[#1e1e1e]'
                                              : 'border-[#1a1a1a] text-gray-700 hover:text-gray-500'
                                          }`}
                                          style={fechaInfo ? { color: fechaInfo.color } : {}}
                                        >
                                          {fechaInfo ? fechaInfo.label : '+ fecha'}
                                        </button>

                                        {/* Inline date picker */}
                                        {isEditingDate && (
                                          <div className="absolute left-0 top-full mt-1 z-50">
                                            <DatePicker
                                              value={t.fecha ?? ''}
                                              onChange={val => handleDateChange(t.id, val)}
                                              size="sm"
                                              autoOpen
                                              hideTrigger
                                              showClear
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Open arrow */}
                                  <a
                                    href={`/operaciones?open=${t.id}`}
                                    className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity"
                                    title="Abrir tarea"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                                      <path d="M5 12h14M12 5l7 7-7 7"/>
                                    </svg>
                                  </a>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Footer link */}
              <div className="mt-6 pt-4 border-t border-[#0f0f0f]">
                <a
                  href="/operaciones?vista=hoy"
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
