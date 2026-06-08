'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAreaColor } from '@/lib/areaColors'
import { GRUPOS_MODULOS } from '@/lib/modulosEjecucion'

// ── Types ──────────────────────────────────────────────────────────────────────

type Usuario = {
  id: string
  name: string
  role: string
  area: string | null
}

type Template = {
  id: string
  nombre: string
  tipo: string
  impacto: string
  contexto: string
  frecuencia: string
  diasSemana: number[]
  semanaDeMes: number[]
  horaLimite: string | null
  cuando: string | null
  descripcion: string | null
  estandarMinimo: string | null
  porqueSeHace: string | null
  relacionCon: string | null
  siNoSeHace: string | null
  kpiNombre: string | null
  moduloTexto: string | null
  moduloDestino: string | null
  moduloDisponible: boolean
  esAccionCampo: boolean
  dependeDe: { tarea: string; puesto: string } | null
  bloqueaA: { tarea: string; puesto: string } | null
  afectaA: string[]
  puestoDefault: string | null
  tipoAsignacion: string
  areaAsignada: string | null
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

type ModalState = {
  mode: 'create' | 'edit'
  tarea: Template | null
  areaId: string
  subAreaId: string
  subAreaNombre: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortTemplatesByDay(templates: Template[]): Template[] {
  return [...templates].sort((a, b) => {
    const dayA = a.diasSemana && a.diasSemana.length > 0 ? Math.min(...a.diasSemana) : 999
    const dayB = b.diasSemana && b.diasSemana.length > 0 ? Math.min(...b.diasSemana) : 999
    if (dayA !== dayB) return dayA - dayB
    return a.nombre.localeCompare(b.nombre)
  })
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DIAS_LABEL: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V' }
const DIAS_SEMANA = [
  { d: 1, l: 'L', full: 'Lunes' },
  { d: 2, l: 'M', full: 'Martes' },
  { d: 3, l: 'X', full: 'Miércoles' },
  { d: 4, l: 'J', full: 'Jueves' },
  { d: 5, l: 'V', full: 'Viernes' },
]

const FRECUENCIA_LABEL: Record<string, string> = {
  DIARIO: 'Diario', SEMANAL: 'Semanal', QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual', TRIMESTRAL: 'Trimestral', POR_EVENTO: 'Por evento',
  LUNES_JUEVES: 'L/J',
}

const SEMANA_LABELS: Record<number, string> = {
  1: '1°', 2: '2°', 3: '3°', 4: '4°', 5: 'Último',
}

const DIA_FULL: Record<number, string> = {
  1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábado', 0: 'domingo',
}

function formatMensualLabel(semanaDeMes: number[], diasSemana: number[]): string {
  if (semanaDeMes.length === 0) return 'Mensual'
  const semanas = [...semanaDeMes].sort((a, b) => a - b).map(s => SEMANA_LABELS[s] ?? `${s}°`)
  const dias = diasSemana.map(d => ({
    1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D',
  }[d] ?? '?'))
  return `Mensual · ${semanas.join(',')} ${dias.join('')}`
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

// ── ResponsableBtn ─────────────────────────────────────────────────────────────

function ResponsableBtn({
  tarea,
  usuarios,
  onCambiar,
  onGroupChange,
}: {
  tarea: Template
  usuarios: Usuario[]
  onCambiar: (responsableId: string | null) => void
  onGroupChange?: (tipoAsignacion: string, areaAsignada?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="text-xs text-gray-500 hover:text-white transition-colors text-left"
      >
        {tarea.tipoAsignacion === 'todos' ? (
          <span className="text-[10px] bg-[#1a1a1a] text-gray-400 px-2 py-0.5 rounded-full border border-[#2a2a2a]">👥 Todo el equipo</span>
        ) : tarea.tipoAsignacion === 'area' ? (
          <span className="text-[10px] bg-[#1a1a1a] text-gray-400 px-2 py-0.5 rounded-full border border-[#2a2a2a]">
            <span style={{ color: getAreaColor(tarea.areaAsignada ?? '') }}>●</span> {tarea.areaAsignada}
          </span>
        ) : tarea.responsable ? (
          <span className="text-xs text-gray-400">{tarea.responsable.name.split(' ')[0]}</span>
        ) : (
          <span className="text-xs text-gray-600 italic">Sin asignar</span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-[#0d0d0d] border border-[#222] rounded-xl shadow-2xl overflow-hidden w-52 py-1">

          {/* Group options */}
          {onGroupChange && (
            <>
              <p className="text-[8px] text-gray-700 uppercase tracking-wider px-3 py-1.5">Asignación grupal</p>

              {/* Todo el equipo */}
              <button
                onClick={e => {
                  e.stopPropagation()
                  onGroupChange('todos')
                  setOpen(false)
                }}
                className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                  tarea.tipoAsignacion === 'todos'
                    ? 'text-[#C9A84C] bg-[#C9A84C]/5'
                    : 'text-gray-400 hover:bg-[#111] hover:text-white'
                }`}
              >
                <span className="text-base leading-none">👥</span>
                <span>Todo el equipo</span>
              </button>

              {/* Per area options */}
              {['Dirección', 'Administración', 'Marketing', 'Ventas', 'Producción'].map(area => (
                <button
                  key={area}
                  onClick={e => {
                    e.stopPropagation()
                    onGroupChange('area', area)
                    setOpen(false)
                  }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                    tarea.tipoAsignacion === 'area' && tarea.areaAsignada === area
                      ? 'text-[#C9A84C] bg-[#C9A84C]/5'
                      : 'text-gray-400 hover:bg-[#111] hover:text-white'
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getAreaColor(area) }}
                  />
                  <span>Toda {area}</span>
                </button>
              ))}

              {/* Divider */}
              <div className="mx-2 my-1 h-px bg-[#1a1a1a]" />
              <p className="text-[8px] text-gray-700 uppercase tracking-wider px-3 py-1">Individual</p>
            </>
          )}

          {/* Sin asignar */}
          <button
            onClick={e => { e.stopPropagation(); onCambiar(null); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-[#111] hover:text-gray-400 transition-colors"
          >
            Sin asignar
          </button>

          {/* Individual users */}
          {usuarios.map(u => (
            <button
              key={u.id}
              onClick={e => { e.stopPropagation(); onCambiar(u.id); setOpen(false) }}
              className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                tarea.responsable?.id === u.id && tarea.tipoAsignacion === 'individual'
                  ? 'text-[#C9A84C] bg-[#C9A84C]/5'
                  : 'text-gray-400 hover:bg-[#111] hover:text-white'
              }`}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white/80 shrink-0"
                style={{ backgroundColor: getAreaColor(u.area ?? '') }}
              >
                {u.name[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate">{u.name}</p>
                {u.area && <p className="text-[8px] text-gray-600 truncate">{u.area}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TareaModal ─────────────────────────────────────────────────────────────────

function TareaModal({
  modal,
  usuarios,
  onClose,
  onSaved,
}: {
  modal: ModalState
  usuarios: Usuario[]
  onClose: () => void
  onSaved: (template: Template, isEdit: boolean) => void
}) {
  const isEdit = modal.mode === 'edit'
  const t = modal.tarea

  const [form, setForm] = useState({
    nombre:          t?.nombre         ?? '',
    descripcion:     t?.descripcion    ?? '',
    tipo:            t?.tipo           ?? 'CHECK',
    frecuencia:      t?.frecuencia     ?? 'DIARIO',
    diasSemana:      t?.diasSemana     ?? [],
    semanaDeMes:     t?.semanaDeMes    ?? [],
    horaLimite:      t?.horaLimite     ?? '',
    responsableId:   t?.responsable?.id ?? '',
    impacto:         t?.impacto        ?? 'estandar',
    contexto:        t?.contexto       ?? 'independiente',
    estandarMinimo:  t?.estandarMinimo ?? '',
    porqueSeHace:    t?.porqueSeHace   ?? '',
    relacionCon:     t?.relacionCon    ?? '',
    siNoSeHace:      t?.siNoSeHace     ?? '',
    tipoAsignacion:  t?.tipoAsignacion ?? 'individual',
    areaAsignada:    t?.areaAsignada   ?? '',
    moduloDestino:   t?.moduloDestino  ?? '',
    moduloTexto:     t?.moduloTexto    ?? '',
    moduloDisponible: t?.moduloDisponible ?? true,
    esAccionCampo:   t?.esAccionCampo  ?? false,
  })
  const [showDetalle, setShowDetalle] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorSemana, setErrorSemana] = useState(false)

  function toggleDia(d: number) {
    setForm(prev => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(d)
        ? prev.diasSemana.filter(x => x !== d)
        : [...prev.diasSemana, d].sort(),
    }))
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    if (['MENSUAL', 'QUINCENAL'].includes(form.frecuencia) && form.semanaDeMes.length === 0) {
      setErrorSemana(true)
      return
    }
    setErrorSemana(false)
    setSaving(true)
    try {
      const body = {
        ...form,
        responsableId:   form.responsableId  || null,
        horaLimite:      form.horaLimite     || null,
        descripcion:     form.descripcion    || null,
        estandarMinimo:  form.estandarMinimo || null,
        porqueSeHace:    form.porqueSeHace   || null,
        relacionCon:     form.relacionCon    || null,
        siNoSeHace:      form.siNoSeHace     || null,
        tipoAsignacion:  form.tipoAsignacion,
        areaAsignada: form.tipoAsignacion === 'area' ? (form.areaAsignada || null) : null,
        esAccionCampo:   form.esAccionCampo,
        moduloDisponible: form.moduloDisponible,
        moduloDestino: form.esAccionCampo ? null : (form.moduloDestino || null),
        moduloTexto:   form.esAccionCampo ? null : (form.moduloTexto   || null),
        ...(isEdit ? {} : { areaId: modal.areaId, subAreaId: modal.subAreaId }),
      }

      const res = isEdit
        ? await fetch(`/api/plan-trabajo/templates/${t!.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/plan-trabajo/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

      if (!res.ok) return
      const data = await res.json()
      onSaved(data.template, isEdit)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C] transition-colors'
  const labelCls = 'text-[10px] text-gray-600 uppercase tracking-wider block mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-base">
              {isEdit ? 'Editar compromiso' : 'Nuevo compromiso'}
            </h2>
            <p className="text-[10px] text-gray-600 mt-0.5">{modal.subAreaNombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-lg leading-none transition-colors">✕</button>
        </div>

        {/* Nombre */}
        <div>
          <label className={labelCls}>Nombre *</label>
          <input
            value={form.nombre}
            onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
            placeholder="Ej. Revisar pipeline de ventas"
            className={inputCls}
            autoFocus
          />
        </div>

        {/* Días */}
        <div>
          <label className={labelCls}>Días</label>
          <div className="flex gap-2">
            {DIAS_SEMANA.map(({ d, l }) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDia(d)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                  form.diasSemana.includes(d)
                    ? 'bg-[#C9A84C] text-black'
                    : 'bg-[#1a1a1a] text-gray-600 hover:text-gray-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Grid: Frecuencia + Hora */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Frecuencia</label>
            <select
              value={form.frecuencia}
              onChange={e => {
                const newFrecuencia = e.target.value
                setForm(p => ({
                  ...p,
                  frecuencia: newFrecuencia,
                  // Clear semanaDeMes when switching away from MENSUAL/QUINCENAL
                  semanaDeMes: ['MENSUAL', 'QUINCENAL'].includes(newFrecuencia) ? p.semanaDeMes : [],
                }))
                setErrorSemana(false)
              }}
              className={inputCls}
            >
              <option value="DIARIO">Diario</option>
              <option value="SEMANAL">Semanal</option>
              <option value="QUINCENAL">Quincenal</option>
              <option value="MENSUAL">Mensual</option>
              <option value="TRIMESTRAL">Trimestral</option>
              <option value="POR_EVENTO">Por evento</option>
            </select>
          </div>

          {/* Semana del mes — only for MENSUAL and QUINCENAL */}
          {['MENSUAL', 'QUINCENAL'].includes(form.frecuencia) && (
            <div>
              <label className={labelCls}>¿Qué semana del mes?</label>
              <p className="text-[11px] text-gray-600 mb-2">
                {form.frecuencia === 'MENSUAL'
                  ? 'Selecciona en qué semana(s) del mes aplica este compromiso'
                  : '¿En qué semana(s) del mes?'}
              </p>
              <div className="flex gap-2 flex-wrap">
                {([{ v: 1, l: '1ª' }, { v: 2, l: '2ª' }, { v: 3, l: '3ª' }, { v: 4, l: '4ª' }, { v: 5, l: 'Última' }]).map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setErrorSemana(false)
                      setForm(p => ({
                        ...p,
                        semanaDeMes: p.semanaDeMes.includes(v)
                          ? p.semanaDeMes.filter(s => s !== v)
                          : [...p.semanaDeMes, v].sort((a, b) => a - b),
                      }))
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.semanaDeMes.includes(v)
                        ? 'bg-[#C9A84C] text-black border-[#C9A84C]'
                        : 'bg-transparent text-gray-500 border-[#2a2a2a] hover:border-[#3a3a3a] hover:text-gray-300'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {errorSemana && (
                <p className="text-xs text-red-400 mt-1.5">Selecciona al menos una semana del mes</p>
              )}
            </div>
          )}
          <div>
            <label className={labelCls}>Hora límite</label>
            <input
              type="time"
              value={form.horaLimite ?? ''}
              onChange={e => setForm(p => ({ ...p, horaLimite: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Impacto</label>
            <select
              value={form.impacto}
              onChange={e => setForm(p => ({ ...p, impacto: e.target.value }))}
              className={inputCls}
            >
              <option value="critico">Crítico</option>
              <option value="alto">Alto</option>
              <option value="estandar">Estándar</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Contexto</label>
            <select
              value={form.contexto}
              onChange={e => setForm(p => ({ ...p, contexto: e.target.value }))}
              className={inputCls}
            >
              <option value="independiente">Independiente</option>
              <option value="evento">Con evento</option>
              <option value="hibrida">Híbrida</option>
            </select>
          </div>
        </div>

        {/* Responsable */}
        {form.tipoAsignacion === 'todos' ? (
          <div>
            <label className={labelCls}>Responsable</label>
            <p className="text-xs text-gray-600">Este compromiso aparece para todos los usuarios del equipo</p>
          </div>
        ) : (
          <div>
            <label className={labelCls}>Responsable{form.tipoAsignacion === 'area' ? ' (opcional)' : ''}</label>
            <select
              value={form.responsableId}
              onChange={e => setForm(p => ({ ...p, responsableId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Sin asignar</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tipo de asignación */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Tipo de asignación</label>
            <select
              value={form.tipoAsignacion}
              onChange={e => setForm(p => ({ ...p, tipoAsignacion: e.target.value }))}
              className={inputCls}
            >
              <option value="individual">Individual (1 responsable)</option>
              <option value="area">Área completa</option>
              <option value="todos">Todo el equipo</option>
            </select>
          </div>
          {form.tipoAsignacion === 'area' && (
            <div>
              <label className={labelCls}>Área</label>
              <select
                value={form.areaAsignada}
                onChange={e => setForm(p => ({ ...p, areaAsignada: e.target.value }))}
                className={inputCls}
              >
                <option value="">Seleccionar...</option>
                <option value="VENTAS">Ventas</option>
                <option value="PRODUCCION">Producción</option>
                <option value="MARKETING">Marketing</option>
                <option value="ADMINISTRACION">Administración</option>
                <option value="DIRECCION">Dirección</option>
              </select>
            </div>
          )}
        </div>

        {/* Detalle expandible */}
        <div>
          <button
            type="button"
            onClick={() => setShowDetalle(v => !v)}
            className="text-[10px] text-gray-600 uppercase tracking-wider flex items-center gap-1 hover:text-gray-400 transition-colors"
          >
            {showDetalle ? '▲' : '▼'} Detalle adicional
          </button>
          {showDetalle && (
            <div className="mt-3 space-y-3">
              {[
                { key: 'descripcion',    label: 'Descripción',       placeholder: 'Qué implica este compromiso, cómo ejecutarlo...',   rows: 3 },
                { key: 'estandarMinimo', label: 'Estándar mínimo',  placeholder: 'Qué cuenta como hecho correctamente...',        rows: 2 },
                { key: 'porqueSeHace',   label: 'Por qué se hace',  placeholder: 'Razón de existir de este compromiso...',              rows: 2 },
                { key: 'relacionCon',    label: 'Se relaciona con', placeholder: 'Otros compromisos o módulos...',                      rows: 2 },
                { key: 'siNoSeHace',     label: 'Si no se hace',    placeholder: 'Consecuencias si no se ejecuta...',              rows: 2 },
              ].map(({ key, label, placeholder, rows }) => (
                <div key={key}>
                  <label className="text-[9px] text-gray-700 uppercase tracking-wider block mb-1">{label}</label>
                  <textarea
                    value={form[key as keyof typeof form] as string}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    rows={rows}
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#C9A84C] resize-none transition-colors"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Módulo de ejecución */}
        <div className="border-t border-[#111] pt-4">
          <p className="text-[9px] text-[#444] uppercase tracking-[0.15em] font-semibold mb-3">Módulo de ejecución</p>

          {/* Toggle: accion campo */}
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.esAccionCampo}
              onChange={e => setForm(p => ({ ...p, esAccionCampo: e.target.checked }))}
              className="w-3.5 h-3.5 rounded accent-[#C9A84C]"
            />
            <span className="text-xs text-[#777]">Es acción en campo (no requiere módulo en plataforma)</span>
          </label>

          {/* Dropdown */}
          {!form.esAccionCampo && (
            <select
              value={form.moduloDestino ?? ''}
              onChange={e => {
                const ruta = e.target.value || ''
                const nombre = ruta
                  ? GRUPOS_MODULOS.flatMap(g => g.modulos).find(m => m.ruta === ruta)?.nombre ?? ''
                  : ''
                setForm(p => ({ ...p, moduloDestino: ruta, moduloTexto: nombre }))
              }}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-[#999] focus:outline-none focus:border-[#C9A84C]/30"
            >
              <option value="">Sin módulo asignado</option>
              {GRUPOS_MODULOS.map(grupo => (
                <optgroup key={grupo.grupo} label={grupo.grupo}>
                  {grupo.modulos.map(m => (
                    <option key={m.ruta} value={m.ruta}>{m.nombre}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white hover:border-[#555] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.nombre.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#C9A84C] text-black text-sm font-semibold hover:bg-[#d4b060] disabled:opacity-40 transition-colors"
          >
            {saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear compromiso')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DiasBtn ───────────────────────────────────────────────────────────────────

function DiasBtn({
  tarea,
  onCambiar,
}: {
  tarea: Template
  onCambiar: (diasSemana: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggleDia(d: number) {
    const newDias = tarea.diasSemana.includes(d)
      ? tarea.diasSemana.filter(x => x !== d)
      : [...tarea.diasSemana, d].sort()
    onCambiar(newDias)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="flex gap-0.5 cursor-pointer group/dias"
        title="Cambiar días"
      >
        {[1,2,3,4,5].map(d => (
          <span
            key={d}
            className={`text-[9px] w-4 h-4 rounded flex items-center justify-center font-bold transition-colors ${
              tarea.diasSemana.includes(d)
                ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                : 'bg-[#1a1a1a] text-gray-700'
            }`}
          >
            {DIAS_LABEL[d]}
          </span>
        ))}
        <span className="opacity-0 group-hover/dias:opacity-100 text-gray-700 text-[9px] ml-0.5 transition-opacity">✎</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-[#0d0d0d] border border-[#222] rounded-xl shadow-2xl p-3 w-auto">
          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-2">Días de la semana</p>
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map(d => (
              <button
                key={d}
                onClick={e => { e.stopPropagation(); toggleDia(d) }}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  tarea.diasSemana.includes(d)
                    ? 'bg-[#C9A84C] text-black'
                    : 'bg-[#1a1a1a] text-gray-500 hover:text-gray-300'
                }`}
              >
                {DIAS_LABEL[d]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── FrecuenciaBtn ──────────────────────────────────────────────────────────────

function FrecuenciaBtn({
  tarea,
  onCambiar,
  onSemanaDeMesChange,
}: {
  tarea: Template
  onCambiar: (frecuencia: string) => void
  onSemanaDeMesChange?: (semanaDeMes: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const opciones = [
    { value: 'DIARIO', label: 'Diario' },
    { value: 'SEMANAL', label: 'Semanal' },
    { value: 'QUINCENAL', label: 'Quincenal' },
    { value: 'MENSUAL', label: 'Mensual' },
    { value: 'TRIMESTRAL', label: 'Trimestral' },
    { value: 'POR_EVENTO', label: 'Por evento' },
    { value: 'LUNES_JUEVES', label: 'L/J' },
  ]

  const showSemanaPicker = ['MENSUAL', 'QUINCENAL'].includes(tarea.frecuencia)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="flex items-center gap-1 text-xs text-gray-600 hover:text-white transition-colors group/frec"
        title="Cambiar recurrencia"
      >
        {tarea.frecuencia === 'MENSUAL'
          ? (
            tarea.semanaDeMes.length === 0
              ? <span className="flex items-center gap-1">Mensual <span className="text-yellow-500 text-[9px]" title="Falta indicar qué semana del mes">⚠</span></span>
              : formatMensualLabel(tarea.semanaDeMes, tarea.diasSemana)
          )
          : tarea.frecuencia === 'QUINCENAL'
            ? (
              tarea.semanaDeMes.length === 0
                ? <span className="flex items-center gap-1">Quincenal <span className="text-yellow-500 text-[9px]" title="Falta indicar qué semanas">⚠</span></span>
                : formatMensualLabel(tarea.semanaDeMes, tarea.diasSemana)
            )
            : (FRECUENCIA_LABEL[tarea.frecuencia] ?? tarea.frecuencia)
        }
        <span className="opacity-0 group-hover/frec:opacity-100 text-[9px] transition-opacity">✎</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-[#0d0d0d] border border-[#222] rounded-xl shadow-2xl overflow-hidden py-1" style={{ minWidth: 160 }}>
          <p className="text-[9px] text-gray-600 uppercase tracking-wider px-3 py-1.5">Recurrencia</p>
          {opciones.map(op => (
            <button
              key={op.value}
              onClick={e => { e.stopPropagation(); onCambiar(op.value); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                tarea.frecuencia === op.value
                  ? 'text-[#C9A84C] bg-[#C9A84C]/5'
                  : 'text-gray-400 hover:bg-[#111] hover:text-white'
              }`}
            >
              {op.label}
            </button>
          ))}

          {/* Semana del mes — inline picker */}
          {showSemanaPicker && onSemanaDeMesChange && (
            <>
              <div className="mx-3 my-1.5 h-px bg-[#1e1e1e]" />
              <p className="text-[9px] text-gray-600 uppercase tracking-wider px-3 pb-1.5">
                {tarea.semanaDeMes.length === 0
                  ? <span className="text-yellow-500">⚠ ¿Qué semana del mes?</span>
                  : '¿Qué semana?'}
              </p>
              <div className="flex gap-1 px-3 pb-2 flex-wrap">
                {([{ v: 1, l: '1ª' }, { v: 2, l: '2ª' }, { v: 3, l: '3ª' }, { v: 4, l: '4ª' }, { v: 5, l: 'Últ' }]).map(({ v, l }) => {
                  const active = tarea.semanaDeMes.includes(v)
                  return (
                    <button
                      key={v}
                      onClick={e => {
                        e.stopPropagation()
                        const next = active
                          ? tarea.semanaDeMes.filter(s => s !== v)
                          : [...tarea.semanaDeMes, v].sort((a, b) => a - b)
                        onSemanaDeMesChange(next)
                      }}
                      className={`w-8 h-7 rounded-lg text-[10px] font-bold transition-colors ${
                        active ? 'bg-[#C9A84C] text-black' : 'bg-[#1a1a1a] text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {l}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── TemplateRow ────────────────────────────────────────────────────────────────

function TemplateRow({
  t,
  usuarios,
  onEdit,
  onDelete,
  onResponsableChange,
  onDiasChange,
  onFrecuenciaChange,
  onSemanaDeMesChange,
  onGroupChange,
  onDragStart,
  onDragEnd,
  onDragOverRow,
  onDropOnRow,
  dragOverIndicator,
  canEdit,
}: {
  t: Template
  usuarios: Usuario[]
  onEdit: (t: Template) => void
  onDelete: (id: string) => void
  onResponsableChange: (templateId: string, responsableId: string | null) => void
  onDiasChange: (templateId: string, diasSemana: number[]) => void
  onFrecuenciaChange: (templateId: string, frecuencia: string) => void
  onSemanaDeMesChange: (templateId: string, semanaDeMes: number[]) => void
  onGroupChange: (templateId: string, tipoAsignacion: string, areaAsignada?: string) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  onDragOverRow?: (templateId: string, position: 'above' | 'below') => void
  onDropOnRow?: (targetId: string, position: 'above' | 'below') => void
  dragOverIndicator?: 'above' | 'below' | null
  canEdit?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const ctx = CONTEXTO_BADGE[t.contexto] ?? CONTEXTO_BADGE.independiente
  const imp = IMPACTO_LABEL[t.impacto] ?? IMPACTO_LABEL.estandar
  const router = useRouter()

  return (
    <>
      <tr
        className={`border-b border-[#111] transition-colors group ${
          expanded ? 'bg-[#0d0d0d]' : 'hover:bg-[#0a0a0a]'
        }${onDragStart ? ' cursor-grab active:cursor-grabbing' : ' cursor-pointer'}${
          dragOverIndicator === 'above' ? ' border-t-2 border-t-[#C9A84C]' : ''
        }${
          dragOverIndicator === 'below' ? ' border-b-2 border-b-[#C9A84C]' : ''
        }`}
        onClick={() => setExpanded(v => !v)}
        draggable={!!onDragStart}
        onDragStart={onDragStart ? e => { e.currentTarget.style.opacity = '0.4'; e.dataTransfer.effectAllowed = 'move'; onDragStart() } : undefined}
        onDragEnd={onDragEnd ? e => { e.currentTarget.style.opacity = '1'; onDragEnd() } : undefined}
        onDragOver={onDragOverRow ? (e) => {
          e.preventDefault()
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          const midY = rect.top + rect.height / 2
          const position: 'above' | 'below' = e.clientY < midY ? 'above' : 'below'
          onDragOverRow(t.id, position)
        } : undefined}
        onDrop={onDropOnRow ? (e) => {
          e.preventDefault()
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          const midY = rect.top + rect.height / 2
          const position: 'above' | 'below' = e.clientY < midY ? 'above' : 'below'
          onDropOnRow(t.id, position)
        } : undefined}
      >
        {/* Impacto bar */}
        <td className="w-1 p-0">
          <div
            className="w-1 min-h-[48px] h-full rounded-l-sm"
            style={{
              backgroundColor: getAreaColor(t.area.nombre),
              opacity: t.impacto === 'critico' ? 1 : t.impacto === 'alto' ? 0.55 : 0.25,
            }}
          />
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

        {/* Responsable — clickable */}
        <td className="py-3 px-3 hidden sm:table-cell" onClick={e => e.stopPropagation()}>
          <ResponsableBtn
            tarea={t}
            usuarios={usuarios}
            onCambiar={rid => onResponsableChange(t.id, rid)}
            onGroupChange={(tipo, area) => onGroupChange(t.id, tipo, area)}
          />
        </td>

        {/* Días */}
        <td className="py-3 px-3 hidden md:table-cell" onClick={e => e.stopPropagation()}>
          <DiasBtn
            tarea={t}
            onCambiar={dias => onDiasChange(t.id, dias)}
          />
        </td>

        {/* Frecuencia */}
        <td className="py-3 px-3 hidden lg:table-cell" onClick={e => e.stopPropagation()}>
          <FrecuenciaBtn
            tarea={t}
            onCambiar={frec => onFrecuenciaChange(t.id, frec)}
            onSemanaDeMesChange={sem => onSemanaDeMesChange(t.id, sem)}
          />
        </td>

        {/* Actions + Expand */}
        <td className="py-3 px-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {canEdit !== false && (
              <div
                className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => onEdit(t)}
                  className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-gray-600 hover:text-white transition-colors"
                  title="Editar"
                >
                  ✎
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="p-1.5 rounded-lg hover:bg-red-900/20 text-gray-700 hover:text-red-400 transition-colors"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            )}
            <span className="text-gray-600 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
          </div>
        </td>
      </tr>

      {/* Expanded detail */}
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
              {t.kpiNombre && (
                <span className="text-[10px] text-[#C9A84C] border border-[#C9A84C]/30 px-2 py-0.5 rounded-full">
                  KPI: {t.kpiNombre}
                </span>
              )}
              {t.cuando && <span className="text-[10px] text-gray-600">⏰ {t.cuando}</span>}
              {(t.moduloDestino || t.esAccionCampo) && (
                <div className="flex items-center gap-2 pt-2 mt-2 border-t border-[#111] w-full">
                  <span className="text-[9px] text-[#444] uppercase tracking-[0.15em] font-semibold shrink-0">
                    {t.esAccionCampo ? 'Ejecución' : 'Ejecutar en'}
                  </span>
                  {t.esAccionCampo ? (
                    <span className="flex items-center gap-1.5 text-[10px] text-[#444]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      En campo
                    </span>
                  ) : t.moduloDestino && t.moduloTexto ? (
                    t.moduloDisponible ? (
                      <button
                        onClick={e => { e.stopPropagation(); router.push(t.moduloDestino!.split('#')[0]) }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-[#111] border border-[#1e1e1e] rounded-lg text-[10px] text-[#999] hover:text-white hover:border-[#2a2a2a] transition-all cursor-pointer"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        {t.moduloTexto}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-[#0d0d0d] rounded-lg text-[10px] text-[#333] cursor-default" title="Próximamente disponible">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/60 shrink-0" />
                        {t.moduloTexto}
                      </span>
                    )
                  ) : null}
                </div>
              )}
              {(['MENSUAL', 'QUINCENAL'].includes(t.frecuencia)) && t.semanaDeMes.length > 0 && (
                <p className="text-[10px] text-gray-500 mt-1">
                  {(() => {
                    const semanasParts = [...t.semanaDeMes].sort((a, b) => a - b).map(s =>
                      s === 5 ? 'último' : `${s}°`
                    )
                    const diasParts = t.diasSemana.map(d => DIA_FULL[d] ?? 'día')
                    const semanasStr = semanasParts.length === 1
                      ? semanasParts[0]
                      : semanasParts.slice(0, -1).join(', ') + ' y ' + semanasParts[semanasParts.length - 1]
                    const diasStr = diasParts.length === 1
                      ? diasParts[0]
                      : diasParts.join(' y ')
                    const prefix = t.frecuencia === 'QUINCENAL' ? 'Quincenal — cada' : 'Cada'
                    return `${prefix} ${semanasStr} ${diasStr} del mes`
                  })()}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Vista Por Persona ──────────────────────────────────────────────────────────

// ── AreaPersonasView ──────────────────────────────────────────────────────────

function AreaPersonasView({
  areaId,
  usuarios,
  onEdit,
  onDelete,
  onResponsableChange,
  onDiasChange,
  onFrecuenciaChange,
  onSemanaDeMesChange,
  onGroupChange,
  canEdit,
}: {
  areaId: string
  usuarios: Usuario[]
  onEdit: (t: Template) => void
  onDelete: (id: string) => void
  onResponsableChange: (templateId: string, responsableId: string | null) => void
  onDiasChange: (templateId: string, diasSemana: number[]) => void
  onFrecuenciaChange: (templateId: string, frecuencia: string) => void
  onSemanaDeMesChange: (templateId: string, semanaDeMes: number[]) => void
  onGroupChange: (templateId: string, tipoAsignacion: string, areaAsignada?: string) => void
  canEdit?: boolean
}) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)

  async function load() {
    if (loaded) return
    setLoading(true)
    try {
      const res = await fetch(`/api/plan-trabajo/templates?areaId=${areaId}`)
      const data = await res.json()
      setTemplates(data.templates ?? [])
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  function toggle() {
    if (!open && !loaded) load()
    setOpen(v => !v)
  }

  const byPersona = templates.reduce((acc, t) => {
    const key = t.responsable?.name ?? 'Sin asignar'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {} as Record<string, Template[]>)

  return (
    <div className="border-t border-[#111] mt-2">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-600 hover:text-gray-400 transition-colors"
      >
        <span>{open ? '▲' : '▼'}</span>
        <span>Ver por persona en esta área</span>
        {loaded && !open && (
          <span className="text-gray-700">
            ({Object.keys(byPersona).length} personas)
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-6">
          {loading ? (
            <p className="text-xs text-gray-600 py-4">Cargando...</p>
          ) : Object.keys(byPersona).length === 0 ? (
            <p className="text-xs text-gray-600 py-4">Sin compromisos asignados en esta área</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(byPersona).map(([nombre, tareas]) => {
                const usuario = usuarios.find(u => u.name === nombre)
                return (
                  <div key={nombre}>
                    <div className="flex items-center gap-2 mb-2">
                      {usuario ? (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white/80 shrink-0"
                          style={{ backgroundColor: getAreaColor(usuario.area ?? '') }}
                        >
                          {nombre[0]}
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[10px] text-gray-600">
                          ?
                        </div>
                      )}
                      <span className="text-xs font-medium text-gray-400">{nombre}</span>
                      <span className="text-[10px] text-gray-700">{tareas.length} compromiso{tareas.length !== 1 ? 's' : ''}</span>
                    </div>
                    <table className="w-full">
                      <tbody>
                        {tareas.map(t => (
                          <TemplateRow
                            key={t.id}
                            t={t}
                            usuarios={usuarios}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onResponsableChange={onResponsableChange}
                            onDiasChange={onDiasChange}
                            onFrecuenciaChange={onFrecuenciaChange}
                            onSemanaDeMesChange={onSemanaDeMesChange}
                            onGroupChange={onGroupChange}
                            canEdit={canEdit}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Vista Por Persona ──────────────────────────────────────────────────────────

function VistaPorPersona({
  usuario,
  onEdit,
  onDelete,
  onResponsableChange,
  onDiasChange,
  onFrecuenciaChange,
  onSemanaDeMesChange,
  onGroupChange,
  usuarios,
  canEdit,
}: {
  usuario: Usuario
  onEdit: (t: Template) => void
  onDelete: (id: string) => void
  onResponsableChange: (templateId: string, responsableId: string | null) => void
  onDiasChange: (templateId: string, diasSemana: number[]) => void
  onFrecuenciaChange: (templateId: string, frecuencia: string) => void
  onSemanaDeMesChange: (templateId: string, semanaDeMes: number[]) => void
  onGroupChange: (templateId: string, tipoAsignacion: string, areaAsignada?: string) => void
  usuarios: Usuario[]
  canEdit?: boolean
}) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/plan-trabajo/templates?responsableId=${usuario.id}`)
        const data = await res.json()
        setTemplates(data.templates ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [usuario.id])

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">Cargando...</div>
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-5 py-4 border-b border-[#1a1a1a] bg-[#0a0a0a] sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white/80"
            style={{ backgroundColor: getAreaColor(usuario.area ?? ''), opacity: 0.85 }}
          >
            {usuario.name[0]}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{usuario.name}</h2>
            <p className="text-[10px] text-gray-600">{usuario.area ?? ''} · {templates.length} compromiso{templates.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {DIAS_SEMANA.map(({ d, full }) => {
          const tareasDia = templates.filter(t => t.diasSemana.includes(d))
          if (tareasDia.length === 0) return null
          return (
            <section key={d} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold tracking-wider text-gray-600 uppercase">{full}</span>
                <span className="text-[10px] text-[#C9A84C]">{tareasDia.length}</span>
              </div>
              <table className="w-full">
                <tbody>
                  {tareasDia.map(t => (
                    <TemplateRow
                      key={t.id}
                      t={t}
                      usuarios={usuarios}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onResponsableChange={onResponsableChange}
                      onDiasChange={onDiasChange}
                      onFrecuenciaChange={onFrecuenciaChange}
                      onSemanaDeMesChange={onSemanaDeMesChange}
                      onGroupChange={onGroupChange}
                      canEdit={canEdit}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          )
        })}

        {/* Sin día específico */}
        {(() => {
          const sinDia = templates.filter(t => t.diasSemana.length === 0)
          if (sinDia.length === 0) return null
          return (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold tracking-wider text-gray-600 uppercase">Sin día específico</span>
                <span className="text-[10px] text-gray-700">{sinDia.length}</span>
              </div>
              <table className="w-full">
                <tbody>
                  {sinDia.map(t => (
                    <TemplateRow
                      key={t.id}
                      t={t}
                      usuarios={usuarios}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onResponsableChange={onResponsableChange}
                      onDiasChange={onDiasChange}
                      onFrecuenciaChange={onFrecuenciaChange}
                      onSemanaDeMesChange={onSemanaDeMesChange}
                      onGroupChange={onGroupChange}
                      canEdit={canEdit}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          )
        })()}

        {templates.length === 0 && (
          <div className="text-center py-16 text-gray-700 text-sm">Sin compromisos asignados</div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const [areas, setAreas]               = useState<AreaData[]>([])
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null)
  const [vistaPersonaId, setVistaPersonaId] = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [filtroImpacto, setFiltroImpacto]   = useState('todos')
  const [filtroContexto, setFiltroContexto] = useState('todos')
  const [usuarios, setUsuarios]         = useState<Usuario[]>([])
  const [modal, setModal]               = useState<ModalState | null>(null)
  const [isAdmin, setIsAdmin]           = useState(false)
  const [userArea, setUserArea]         = useState<string | null>(null)
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(new Set())

  // Add subarea
  const [addingSubareaForAreaId, setAddingSubareaForAreaId] = useState<string | null>(null)
  const [newSubareaName, setNewSubareaName]                 = useState('')

  // Drag and drop
  const [dragState, setDragState]           = useState<{ templateId: string; fromSubAreaId: string } | null>(null)
  const [dragOverSubAreaId, setDragOverSubAreaId] = useState<string | null>(null)
  const [dragOverRow, setDragOverRow] = useState<{ templateId: string; position: 'above' | 'below' } | null>(null)

  // Load areas + templates + usuarios
  useEffect(() => {
    async function load() {
      const [soRes, usuRes, meRes] = await Promise.all([
        fetch('/api/plan-trabajo/sistema-operativo'),
        fetch('/api/usuarios'),
        fetch('/api/me'),
      ])
      const soData: { areas: SOArea[] } = await soRes.json()
      const usuData: { usuarios: Usuario[] } = await usuRes.json()
      const meData: { role: string; area?: string | null } = await meRes.json()
      setUsuarios(usuData.usuarios ?? [])
      setIsAdmin(meData.role === 'ADMIN')
      setUserArea(meData.area ?? null)

      const areasData: AreaData[] = await Promise.all(
        soData.areas.map(async area => {
          const tRes = await fetch(`/api/plan-trabajo/templates?areaId=${area.id}`)
          const tData: { templates: Template[] } = await tRes.json()
          const templates = tData.templates ?? []

          const subMap = new Map<string, SubareaGroup>()
          for (const t of templates) {
            if (!t.subArea) continue
            if (!subMap.has(t.subArea.id)) {
              subMap.set(t.subArea.id, { subArea: t.subArea, templates: [] })
            }
            subMap.get(t.subArea.id)!.templates.push(t)
          }
          // Feature 1A: sort each subarea's templates by day of week
          for (const sg of subMap.values()) {
            sg.templates = sortTemplatesByDay(sg.templates)
          }

          return { ...area, subareaGroups: Array.from(subMap.values()) }
        })
      )

      // For non-admins: scope to their own area
      // DIRECCION users see all areas (cross-functional role)
      if (meData.role !== 'ADMIN' && meData.area && meData.area !== 'DIRECCION') {
        const AREA_MAP: Record<string, string[]> = {
          VENTAS:         ['ventas', 'comercial', 'sales'],
          MARKETING:      ['marketing'],
          PRODUCCION:     ['produccion', 'producción', 'technical', 'técnica'],
          ADMINISTRACION: ['administracion', 'administración', 'admin'],
          RRHH:           ['rrhh', 'recursos humanos'],
        }
        const keywords = AREA_MAP[meData.area] ?? []
        const filtered = areasData.filter(a =>
          keywords.some(kw => a.nombre.toLowerCase().includes(kw))
        )
        const scoped = filtered.length > 0 ? filtered : areasData
        setAreas(scoped)
        setActiveAreaId(scoped[0]?.id ?? null)
      } else {
        setAreas(areasData)
        setActiveAreaId(areasData[0]?.id ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  // ── Mutations ─────────────────────────────────────────────────────────────

  async function handleResponsableChange(templateId: string, responsableId: string | null) {
    const resp = usuarios.find(u => u.id === responsableId) ?? null
    // Optimistic update
    setAreas(prev => prev.map(a => ({
      ...a,
      subareaGroups: a.subareaGroups.map(sg => ({
        ...sg,
        templates: sg.templates.map(t =>
          t.id === templateId
            ? { ...t, responsable: resp ? { id: resp.id, name: resp.name } : null }
            : t
        ),
      })),
    })))
    // Persist
    await fetch(`/api/plan-trabajo/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responsableId }),
    })
  }

  async function handleGroupAssignment(templateId: string, tipoAsignacion: string, areaAsignada?: string) {
    // Optimistic update
    setAreas(prev => prev.map(a => ({
      ...a,
      subareaGroups: a.subareaGroups.map(sg => ({
        ...sg,
        templates: sg.templates.map(t =>
          t.id === templateId
            ? { ...t, tipoAsignacion, areaAsignada: areaAsignada ?? null, responsable: null, responsableId: null }
            : t
        ),
      })),
    })))
    await fetch(`/api/plan-trabajo/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipoAsignacion, areaAsignada: areaAsignada ?? null, responsableId: null }),
    })
  }

  async function handleDiasChange(templateId: string, diasSemana: number[]) {
    // Optimistic update
    setAreas(prev => prev.map(a => ({
      ...a,
      subareaGroups: a.subareaGroups.map(sg => ({
        ...sg,
        templates: sg.templates.map(t =>
          t.id === templateId ? { ...t, diasSemana } : t
        ),
      })),
    })))
    await fetch(`/api/plan-trabajo/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diasSemana }),
    })
  }

  async function handleFrecuenciaChange(templateId: string, frecuencia: string) {
    // Optimistic update
    setAreas(prev => prev.map(a => ({
      ...a,
      subareaGroups: a.subareaGroups.map(sg => ({
        ...sg,
        templates: sg.templates.map(t =>
          t.id === templateId ? { ...t, frecuencia } : t
        ),
      })),
    })))
    await fetch(`/api/plan-trabajo/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frecuencia }),
    })
  }

  async function handleSemanaDeMesChange(templateId: string, semanaDeMes: number[]) {
    // Optimistic update
    setAreas(prev => prev.map(a => ({
      ...a,
      subareaGroups: a.subareaGroups.map(sg => ({
        ...sg,
        templates: sg.templates.map(t =>
          t.id === templateId ? { ...t, semanaDeMes } : t
        ),
      })),
    })))
    await fetch(`/api/plan-trabajo/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semanaDeMes }),
    })
  }

  async function handleDelete(templateId: string) {
    if (!confirm('¿Eliminar este compromiso del plan?')) return
    const res = await fetch(`/api/plan-trabajo/templates/${templateId}`, { method: 'DELETE' })
    if (res.ok) {
      setAreas(prev => prev.map(a => ({
        ...a,
        subareaGroups: a.subareaGroups.map(sg => ({
          ...sg,
          templates: sg.templates.filter(t => t.id !== templateId),
        })),
      })))
    }
  }

  async function handleAddSubarea(areaId: string) {
    const nombre = newSubareaName.trim()
    if (!nombre) return
    const res = await fetch('/api/plan-trabajo/subareas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areaId, nombre }),
    })
    if (!res.ok) return
    const data = await res.json()
    const newSA: { id: string; nombre: string } = data.subArea
    setAreas(prev => prev.map(a => {
      if (a.id !== areaId) return a
      return {
        ...a,
        subareas: [...a.subareas, { id: newSA.id, nombre: newSA.nombre }],
        subareaGroups: [...a.subareaGroups, { subArea: newSA, templates: [] }],
      }
    }))
    setNewSubareaName('')
    setAddingSubareaForAreaId(null)
  }

  async function handleMoveTemplate(templateId: string, toSubAreaId: string) {
    if (!dragState || dragState.fromSubAreaId === toSubAreaId) {
      setDragState(null)
      setDragOverSubAreaId(null)
      return
    }
    // Find the template to move
    let movedTemplate: Template | undefined
    for (const a of areas) {
      for (const sg of a.subareaGroups) {
        const found = sg.templates.find(t => t.id === templateId)
        if (found) { movedTemplate = found; break }
      }
      if (movedTemplate) break
    }
    if (!movedTemplate) { setDragState(null); setDragOverSubAreaId(null); return }

    // Find target subarea name
    let targetSubArea: { id: string; nombre: string } | undefined
    for (const a of areas) {
      targetSubArea = a.subareas.find(sa => sa.id === toSubAreaId)
      if (targetSubArea) break
    }
    if (!targetSubArea) { setDragState(null); setDragOverSubAreaId(null); return }

    const updatedTemplate = { ...movedTemplate, subArea: targetSubArea }

    // Optimistic state update
    setAreas(prev => prev.map(a => ({
      ...a,
      subareaGroups: a.subareaGroups.map(sg => {
        if (sg.subArea.id === dragState.fromSubAreaId) {
          return { ...sg, templates: sg.templates.filter(t => t.id !== templateId) }
        }
        if (sg.subArea.id === toSubAreaId) {
          return { ...sg, templates: [...sg.templates, updatedTemplate] }
        }
        return sg
      }),
    })))

    setDragState(null)
    setDragOverSubAreaId(null)

    // Persist
    await fetch(`/api/plan-trabajo/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subAreaId: toSubAreaId }),
    })
  }

  function handleOpenModal(opts: { tarea?: Template; areaId: string; subAreaId: string; subAreaNombre: string }) {
    setModal({
      mode: opts.tarea ? 'edit' : 'create',
      tarea: opts.tarea ?? null,
      areaId: opts.areaId,
      subAreaId: opts.subAreaId,
      subAreaNombre: opts.subAreaNombre,
    })
  }

  function handleSaved(saved: Template, isEdit: boolean) {
    setAreas(prev => prev.map(a => {
      if (a.id !== saved.area.id) return a
      return {
        ...a,
        subareaGroups: isEdit
          ? a.subareaGroups.map(sg => ({
              ...sg,
              // Feature 1A: re-sort after edit in case diasSemana changed
              templates: sortTemplatesByDay(sg.templates.map(t => t.id === saved.id ? saved : t)),
            }))
          : a.subareaGroups.map(sg =>
              sg.subArea.id === saved.subArea.id
                // Feature 1A: insert then re-sort
                ? { ...sg, templates: sortTemplatesByDay([...sg.templates, saved]) }
                : sg
            ),
      }
    }))
  }

  async function handleReorderTemplate(draggedId: string, targetId: string, position: 'above' | 'below') {
    if (!dragState) return
    const subAreaId = dragState.fromSubAreaId

    // Optimistic UI update
    setAreas(prev => prev.map(a => ({
      ...a,
      subareaGroups: a.subareaGroups.map(sg => {
        if (sg.subArea.id !== subAreaId) return sg
        const templates = [...sg.templates]
        const draggedIndex = templates.findIndex(t => t.id === draggedId)
        if (draggedIndex === -1) return sg
        const [dragged] = templates.splice(draggedIndex, 1)
        const targetIndex = templates.findIndex(t => t.id === targetId)
        if (targetIndex === -1) return sg
        const insertAt = position === 'above' ? targetIndex : targetIndex + 1
        templates.splice(insertAt, 0, dragged)
        return { ...sg, templates }
      }),
    })))

    // Compute the new order from the current state for persistence
    const subAreaGroup = areas.flatMap(a => a.subareaGroups).find(sg => sg.subArea.id === subAreaId)
    if (!subAreaGroup) { setDragState(null); setDragOverRow(null); return }

    const currentTemplates = subAreaGroup.templates
    const reordered = [...currentTemplates]
    const draggedIndex = reordered.findIndex(t => t.id === draggedId)
    if (draggedIndex !== -1) {
      const [dragged] = reordered.splice(draggedIndex, 1)
      const targetIndex = reordered.findIndex(t => t.id === targetId)
      if (targetIndex !== -1) {
        const insertAt = position === 'above' ? targetIndex : targetIndex + 1
        reordered.splice(insertAt, 0, dragged)
      }
    }

    await fetch('/api/plan-trabajo/templates/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map(t => t.id) }),
    })

    setDragState(null)
    setDragOverRow(null)
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const area = areas.find(a => a.id === activeAreaId)
  const usuarioSeleccionado = vistaPersonaId ? usuarios.find(u => u.id === vistaPersonaId) ?? null : null

  function filterT(t: Template): boolean {
    if (busqueda && !t.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroImpacto !== 'todos' && t.impacto !== filtroImpacto) return false
    if (filtroContexto !== 'todos' && t.contexto !== filtroContexto) return false
    return true
  }

  const totalVisible = area?.subareaGroups.reduce((acc, s) => acc + s.templates.filter(filterT).length, 0) ?? 0

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 130px)' }}>
      {/* ── Sidebar — only shown for admins ── */}
      {isAdmin && (
        <div className="w-48 shrink-0 border-r border-[#141414] bg-[#060606] py-4 flex flex-col gap-0.5 overflow-y-auto sticky top-0" style={{ height: '100vh' }}>
          {loading ? (
            <p className="px-4 text-gray-700 text-xs mt-2">Cargando...</p>
          ) : (
            <>
              {/* Áreas section */}
              <div className="px-3 mb-1">
                <p className="text-[8px] uppercase tracking-[0.2em] text-gray-700 font-bold px-1 mb-2">Por Área</p>
                {areas.map(a => {
                  const isActive = activeAreaId === a.id && !vistaPersonaId
                  const color = getAreaColor(a.nombre)
                  const total = a.subareaGroups.reduce((sum, sg) => sum + sg.templates.length, 0)
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setActiveAreaId(a.id); setVistaPersonaId(null) }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg transition-all flex items-center gap-2.5 mb-0.5 ${
                        isActive
                          ? 'bg-[#111] shadow-sm'
                          : 'hover:bg-[#0a0a0a]'
                      }`}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                          isActive ? 'opacity-100 scale-110' : 'opacity-50'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                      <span className={`text-xs font-medium truncate transition-colors ${
                        isActive ? 'text-white' : 'text-gray-500'
                      }`}>
                        {a.nombre}
                      </span>
                      <span className={`ml-auto text-[9px] tabular-nums shrink-0 transition-colors ${
                        isActive ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                        {total}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Divider */}
              <div className="mx-3 my-2 h-px bg-[#111]" />

              {/* Por Persona section */}
              {usuarios.length > 0 && (
                <div className="px-3">
                  <p className="text-[8px] uppercase tracking-[0.2em] text-gray-700 font-bold px-1 mb-2">Por Persona</p>
                  {usuarios.map(u => {
                    const isActive = vistaPersonaId === u.id
                    const color = getAreaColor(u.area ?? '')
                    return (
                      <button
                        key={u.id}
                        onClick={() => { setVistaPersonaId(u.id); setActiveAreaId(null) }}
                        className={`w-full text-left px-2 py-2 rounded-lg transition-all flex items-center gap-2 mb-0.5 ${
                          isActive
                            ? 'bg-[#111] shadow-sm'
                            : 'hover:bg-[#0a0a0a]'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white/80 shrink-0 transition-all ${
                            isActive ? 'opacity-100 ring-1 ring-white/10' : 'opacity-50'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {u.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium truncate transition-colors ${
                            isActive ? 'text-white' : 'text-gray-500'
                          }`}>
                            {u.name.split(' ')[0]}
                          </p>
                          {u.area && (
                            <p className="text-[8px] text-gray-700 truncate">{u.area}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {usuarioSeleccionado ? (
        <VistaPorPersona
          usuario={usuarioSeleccionado}
          usuarios={usuarios}
          onEdit={t => handleOpenModal({ tarea: t, areaId: t.area.id, subAreaId: t.subArea.id, subAreaNombre: t.subArea.nombre })}
          onDelete={handleDelete}
          onResponsableChange={handleResponsableChange}
          onDiasChange={handleDiasChange}
          onFrecuenciaChange={handleFrecuenciaChange}
          onSemanaDeMesChange={handleSemanaDeMesChange}
          onGroupChange={handleGroupAssignment}
          canEdit={isAdmin}
        />
      ) : (
        <div className="flex-1 overflow-auto">
          {!loading && area && (
            <>
              {/* Area header + filters */}
              <div className="px-5 py-4 border-b border-[#1a1a1a] bg-[#0a0a0a] sticky top-0 z-20">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: getAreaColor(area.nombre) }}
                  />
                  <div>
                    <h2 className="text-lg font-bold text-white">{area.nombre}</h2>
                    {area.objetivo && (
                      <p className="text-xs text-gray-500 mt-0.5 max-w-xl">{area.objetivo}</p>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-gray-600">{totalVisible} compromisos</span>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <input
                    type="text"
                    placeholder="Buscar compromiso..."
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

              {/* Single table with thead + per-subarea tbody */}
              <table className="w-full">
                <thead className="bg-[#060606] border-b border-[#0d0d0d]">
                  <tr>
                    <th className="w-1 p-0" />
                    <th className="py-2 px-3 text-left text-[9px] uppercase tracking-[0.12em] text-gray-700 font-medium">Compromiso</th>
                    <th className="py-2 px-3 text-left text-[9px] uppercase tracking-[0.12em] text-gray-700 font-medium hidden sm:table-cell">Responsable</th>
                    <th className="py-2 px-3 text-left text-[9px] uppercase tracking-[0.12em] text-gray-700 font-medium hidden md:table-cell">Días</th>
                    <th className="py-2 px-3 text-left text-[9px] uppercase tracking-[0.12em] text-gray-700 font-medium hidden lg:table-cell">Recurrencia</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                {area.subareaGroups.map(group => {
                  const filtered = group.templates.filter(filterT)
                  return (
                    <tbody
                      key={group.subArea.id}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSubAreaId(group.subArea.id) }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverSubAreaId(null) }}
                      onDrop={e => { e.preventDefault(); if (dragState) handleMoveTemplate(dragState.templateId, group.subArea.id) }}
                      className={`transition-colors duration-150 ${
                        dragOverSubAreaId === group.subArea.id && dragState?.fromSubAreaId !== group.subArea.id
                          ? 'bg-[#C9A84C]/5 outline outline-1 outline-[#C9A84C]/20 outline-offset-[-1px]'
                          : ''
                      }`}
                    >
                      {/* Subarea header row */}
                      <tr
                        className="bg-[#070707] border-b border-[#111] cursor-pointer group select-none"
                        onClick={() => setCollapsedSubs(prev => {
                          const next = new Set(prev)
                          if (next.has(group.subArea.id)) next.delete(group.subArea.id)
                          else next.add(group.subArea.id)
                          return next
                        })}
                      >
                        <td colSpan={6} className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-0.5 h-4 rounded-full bg-[#C9A84C]/40" />
                            <span className="text-[11px] text-[#C9A84C] uppercase tracking-[0.12em] font-semibold">
                              {group.subArea.nombre}
                            </span>
                            <span className="text-[10px] text-gray-700">{filtered.length}</span>
                            {isAdmin && (
                              <button
                                onClick={e => { e.stopPropagation(); handleOpenModal({ areaId: area.id, subAreaId: group.subArea.id, subAreaNombre: group.subArea.nombre }) }}
                                className="text-[10px] text-gray-700 hover:text-[#C9A84C] transition-colors flex items-center gap-1"
                              >
                                + Agregar compromiso
                              </button>
                            )}
                            <span className={`${isAdmin ? '' : 'ml-auto'} text-gray-700 text-[10px] group-hover:text-gray-500 transition-colors`}>
                              {collapsedSubs.has(group.subArea.id) ? '▶' : '▼'}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {/* Task rows */}
                      {!collapsedSubs.has(group.subArea.id) && filtered.map(t => (
                        <TemplateRow
                          key={t.id}
                          t={t}
                          usuarios={usuarios}
                          onEdit={tarea => handleOpenModal({
                            tarea,
                            areaId: area.id,
                            subAreaId: group.subArea.id,
                            subAreaNombre: group.subArea.nombre,
                          })}
                          onDelete={handleDelete}
                          onResponsableChange={handleResponsableChange}
                          onDiasChange={handleDiasChange}
                          onFrecuenciaChange={handleFrecuenciaChange}
                          onSemanaDeMesChange={handleSemanaDeMesChange}
                          onGroupChange={handleGroupAssignment}
                          onDragStart={() => setDragState({ templateId: t.id, fromSubAreaId: group.subArea.id })}
                          onDragEnd={() => { setDragState(null); setDragOverSubAreaId(null); setDragOverRow(null) }}
                          onDragOverRow={(targetId, position) => setDragOverRow({ templateId: targetId, position })}
                          onDropOnRow={(targetId, position) => {
                            if (dragState && dragState.fromSubAreaId === group.subArea.id) {
                              handleReorderTemplate(dragState.templateId, targetId, position)
                            } else if (dragState) {
                              handleMoveTemplate(dragState.templateId, group.subArea.id)
                            }
                          }}
                          dragOverIndicator={dragOverRow?.templateId === t.id ? dragOverRow.position : null}
                          canEdit={isAdmin}
                        />
                      ))}
                    </tbody>
                  )
                })}
              </table>

              {/* Add new subarea */}
              <div className="px-4 pb-3 pt-1">
                {isAdmin && (addingSubareaForAreaId === area.id ? (
                  <div className="flex items-center gap-2 py-2">
                    <input
                      autoFocus
                      value={newSubareaName}
                      onChange={e => setNewSubareaName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddSubarea(area.id)
                        if (e.key === 'Escape') { setAddingSubareaForAreaId(null); setNewSubareaName('') }
                      }}
                      placeholder="Nombre de la subárea..."
                      className="bg-transparent border-b border-[#C9A84C]/40 text-sm text-white focus:outline-none flex-1 py-1 placeholder:text-gray-700"
                    />
                    <button
                      onClick={() => handleAddSubarea(area.id)}
                      className="text-xs text-[#C9A84C] hover:text-[#C9A84C]/80 font-medium px-2 py-1 transition-colors"
                    >
                      Agregar
                    </button>
                    <button
                      onClick={() => { setAddingSubareaForAreaId(null); setNewSubareaName('') }}
                      className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingSubareaForAreaId(area.id); setNewSubareaName('') }}
                    className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-400 transition-colors py-1"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Nueva subárea
                  </button>
                ))}
              </div>

              {/* Ver por persona en esta área */}
              <AreaPersonasView
                areaId={area.id}
                usuarios={usuarios}
                onEdit={t => handleOpenModal({ tarea: t, areaId: area.id, subAreaId: t.subArea.id, subAreaNombre: t.subArea.nombre })}
                onDelete={handleDelete}
                onResponsableChange={handleResponsableChange}
                onDiasChange={handleDiasChange}
                onFrecuenciaChange={handleFrecuenciaChange}
                onSemanaDeMesChange={handleSemanaDeMesChange}
                onGroupChange={handleGroupAssignment}
                canEdit={isAdmin}
              />
            </>
          )}

          {loading && (
            <div className="text-center py-16 text-gray-600 text-sm">Cargando plan...</div>
          )}
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <TareaModal
          modal={modal}
          usuarios={usuarios}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
