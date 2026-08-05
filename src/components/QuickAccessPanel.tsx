'use client'

import { useState, useEffect, useCallback } from 'react'
import { showUndoToast } from '@/components/ui/undo-toast'
import DatePicker from '@/components/ui/DatePicker'
import { CheckCircle2, Sun } from 'lucide-react'

// ── Types ──
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
function formatFecha(iso: string | null): { label: string; color: string } | null {
  if (!iso) return null
  const today = new Date()
  today.setHours(0,0,0,0)
  const d = new Date(iso.substring(0, 10) + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return { label: 'Vencida', color: '#ef4444' }
  if (diff === 0) return { label: 'Hoy',    color: '#22c55e' }
  if (diff === 1) return { label: 'Mañana', color: '#c9a96a' }
  return {
    label: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
    color: '#6b7280',
  }
}

const PRIO_COLOR: Record<string, string> = {
  URGENTE: '#f87171',
  ALTA:    '#fb923c',
  MEDIA:   '#c9a96a',
  BAJA:    '#6b7280',
}

// ── Main component ──
export default function QuickAccessPanel() {
  const [open, setOpen] = useState(false)

  // Tareas de hoy (sistema unificado de Operaciones)
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

  // Load data when opening
  useEffect(() => {
    if (!open) return
    loadTareas()
  }, [open, loadTareas])

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

  return (
    <>
      {/* Toggle trigger button on right edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[88] hidden lg:flex">
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex flex-col items-center gap-1.5 px-2 py-4 rounded-l-xl border-l border-t border-b transition-all duration-200 backdrop-blur-sm ${
            open
              ? 'bg-[#c9a96a]/10 border-[#c9a96a]/30 text-[#c9a96a]'
              : 'bg-[#0d0d0d]/90 border-[#1e1e1e] text-gray-600 hover:text-white hover:border-[#2a2a2a] hover:bg-[#111]'
          }`}
          title="Vista rapida (Cmd+Shift+P)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          {tareas.length > 0 && (
            <span className="text-[9px] font-bold tabular-nums leading-none">
              {tareas.length}
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#c9a96a]/10 text-[#c9a96a]">
            <CheckCircle2 strokeWidth={1.75} className="w-3.5 h-3.5" /> Tareas de hoy
          </span>
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
          <div className="p-4">
            {loadingTareas ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-10 bg-[#111] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : tareas.length === 0 ? (
              <div className="text-center py-12">
                <Sun strokeWidth={1.75} className="w-6 h-6 mx-auto mb-2 text-amber-400" />
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
                                            value={t.fecha?.substring(0, 10) ?? ''}
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
                className="flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-[#c9a96a] transition-colors"
              >
                Ver módulo de tareas
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
