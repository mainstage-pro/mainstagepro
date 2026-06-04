'use client'

import { useEffect, useState, useRef } from 'react'

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
}: {
  tarea: Template
  usuarios: Usuario[]
  onCambiar: (responsableId: string | null) => void
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
        className="text-xs text-gray-500 hover:text-white hover:underline transition-colors text-left"
      >
        {tarea.responsable?.name ?? <span className="text-gray-700 italic">Sin asignar</span>}
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-[#0d0d0d] border border-[#222] rounded-xl shadow-2xl overflow-hidden w-44 py-1">
          <p className="text-[9px] text-gray-600 uppercase tracking-wider px-3 py-1.5">Cambiar responsable</p>
          {usuarios.map(u => (
            <button
              key={u.id}
              onClick={e => { e.stopPropagation(); onCambiar(u.id); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                tarea.responsable?.id === u.id
                  ? 'text-[#C9A84C] bg-[#C9A84C]/5'
                  : 'text-gray-400 hover:bg-[#111] hover:text-white'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">
                {u.name[0]}
              </div>
              <span className="truncate">{u.name.split(' ')[0]}</span>
            </button>
          ))}
          <div className="border-t border-[#1a1a1a] mt-1 pt-1">
            <button
              onClick={e => { e.stopPropagation(); onCambiar(null); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:text-gray-400 transition-colors"
            >
              Sin asignar
            </button>
          </div>
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
    nombre:         t?.nombre         ?? '',
    descripcion:    t?.descripcion    ?? '',
    tipo:           t?.tipo           ?? 'CHECK',
    frecuencia:     t?.frecuencia     ?? 'DIARIO',
    diasSemana:     t?.diasSemana     ?? [],
    horaLimite:     t?.horaLimite     ?? '',
    responsableId:  t?.responsable?.id ?? '',
    impacto:        t?.impacto        ?? 'estandar',
    contexto:       t?.contexto       ?? 'independiente',
    estandarMinimo: t?.estandarMinimo ?? '',
    porqueSeHace:   t?.porqueSeHace   ?? '',
    relacionCon:    t?.relacionCon    ?? '',
    siNoSeHace:     t?.siNoSeHace     ?? '',
    tipoAsignacion: t?.tipoAsignacion ?? 'individual',
    areaAsignada:   t?.areaAsignada   ?? '',
  })
  const [showDetalle, setShowDetalle] = useState(false)
  const [saving, setSaving] = useState(false)

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
    setSaving(true)
    try {
      const body = {
        ...form,
        responsableId:  form.responsableId  || null,
        horaLimite:     form.horaLimite     || null,
        descripcion:    form.descripcion    || null,
        estandarMinimo: form.estandarMinimo || null,
        porqueSeHace:   form.porqueSeHace   || null,
        relacionCon:    form.relacionCon    || null,
        siNoSeHace:     form.siNoSeHace     || null,
        tipoAsignacion: form.tipoAsignacion,
        areaAsignada: form.tipoAsignacion === 'area' ? (form.areaAsignada || null) : null,
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
              {isEdit ? 'Editar tarea' : 'Nueva tarea'}
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
              onChange={e => setForm(p => ({ ...p, frecuencia: e.target.value }))}
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
            <p className="text-xs text-gray-600">Esta tarea aparece para todos los usuarios del equipo</p>
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
                { key: 'estandarMinimo', label: 'Estándar mínimo',  placeholder: 'Qué cuenta como hecho correctamente...' },
                { key: 'porqueSeHace',   label: 'Por qué se hace',  placeholder: 'Razón de existir de esta tarea...' },
                { key: 'relacionCon',    label: 'Se relaciona con', placeholder: 'Otras tareas o módulos...' },
                { key: 'siNoSeHace',     label: 'Si no se hace',    placeholder: 'Consecuencias si no se ejecuta...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[9px] text-gray-700 uppercase tracking-wider block mb-1">{label}</label>
                  <textarea
                    value={form[key as keyof typeof form] as string}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    rows={2}
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#C9A84C] resize-none transition-colors"
                  />
                </div>
              ))}
            </div>
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
            {saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear tarea')}
          </button>
        </div>
      </div>
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
}: {
  t: Template
  usuarios: Usuario[]
  onEdit: (t: Template) => void
  onDelete: (id: string) => void
  onResponsableChange: (templateId: string, responsableId: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const ctx = CONTEXTO_BADGE[t.contexto] ?? CONTEXTO_BADGE.independiente
  const imp = IMPACTO_LABEL[t.impacto] ?? IMPACTO_LABEL.estandar

  return (
    <>
      <tr
        className={`border-b border-[#111] cursor-pointer transition-colors group ${
          expanded ? 'bg-[#0d0d0d]' : 'hover:bg-[#0a0a0a]'
        }`}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Impacto bar */}
        <td className="w-1 p-0">
          <div className={`w-1 min-h-[48px] h-full rounded-l-sm ${IMPACTO_DOT[t.impacto] ?? 'bg-[#333]'}`} />
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
          {t.tipoAsignacion === 'todos' ? (
            <span className="text-[10px] bg-[#1a1a1a] text-gray-500 px-2 py-0.5 rounded-full border border-[#2a2a2a] whitespace-nowrap">
              👥 Todo el equipo
            </span>
          ) : t.tipoAsignacion === 'area' ? (
            <span className="text-[10px] bg-[#1a1a1a] text-gray-500 px-2 py-0.5 rounded-full border border-[#2a2a2a] whitespace-nowrap">
              🏢 Área: {t.areaAsignada ?? '–'}
            </span>
          ) : (
            <ResponsableBtn
              tarea={t}
              usuarios={usuarios}
              onCambiar={rid => onResponsableChange(t.id, rid)}
            />
          )}
        </td>

        {/* Días */}
        <td className="py-3 px-3 hidden md:table-cell">
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(d => (
              <span
                key={d}
                className={`text-[9px] w-4 h-4 rounded flex items-center justify-center font-bold ${
                  t.diasSemana.includes(d)
                    ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                    : 'bg-[#1a1a1a] text-gray-700'
                }`}
              >
                {DIAS_LABEL[d]}
              </span>
            ))}
          </div>
        </td>

        {/* Frecuencia */}
        <td className="py-3 px-3 text-xs text-gray-600 hidden lg:table-cell">
          {FRECUENCIA_LABEL[t.frecuencia] ?? t.frecuencia}
        </td>

        {/* Actions + Expand */}
        <td className="py-3 px-3 text-right">
          <div className="flex items-center justify-end gap-1">
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
              {t.moduloDestino && t.moduloTexto && (
                <a href={t.moduloDestino} onClick={e => e.stopPropagation()} className="text-[10px] text-[#C9A84C] hover:underline">
                  {t.moduloTexto} →
                </a>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Vista Por Persona ──────────────────────────────────────────────────────────

function VistaPorPersona({
  usuario,
  onEdit,
  onDelete,
  onResponsableChange,
  usuarios,
}: {
  usuario: Usuario
  onEdit: (t: Template) => void
  onDelete: (id: string) => void
  onResponsableChange: (templateId: string, responsableId: string | null) => void
  usuarios: Usuario[]
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
          <div className="w-9 h-9 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center text-sm font-bold text-[#C9A84C]">
            {usuario.name[0]}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{usuario.name}</h2>
            <p className="text-[10px] text-gray-600">{usuario.area ?? ''} · {templates.length} tarea{templates.length !== 1 ? 's' : ''}</p>
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
                    />
                  ))}
                </tbody>
              </table>
            </section>
          )
        })()}

        {templates.length === 0 && (
          <div className="text-center py-16 text-gray-700 text-sm">Sin tareas asignadas</div>
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

  // Load areas + templates + usuarios
  useEffect(() => {
    async function load() {
      const [soRes, usuRes] = await Promise.all([
        fetch('/api/plan-trabajo/sistema-operativo'),
        fetch('/api/usuarios'),
      ])
      const soData: { areas: SOArea[] } = await soRes.json()
      const usuData: { usuarios: Usuario[] } = await usuRes.json()
      setUsuarios(usuData.usuarios ?? [])

      const areasData: AreaData[] = await Promise.all(
        soData.areas.map(async area => {
          const tRes = await fetch(`/api/plan-trabajo/templates?areaId=${area.id}`)
          const tData: { templates: Template[] } = await tRes.json()
          const templates = tData.templates ?? []

          const IMPACTO_ORDER: Record<string, number> = { critico: 0, alto: 1, estandar: 2 }
          const subMap = new Map<string, SubareaGroup>()
          for (const t of templates) {
            if (!t.subArea) continue
            if (!subMap.has(t.subArea.id)) {
              subMap.set(t.subArea.id, { subArea: t.subArea, templates: [] })
            }
            subMap.get(t.subArea.id)!.templates.push(t)
            subMap.get(t.subArea.id)!.templates.sort(
              (a, b) => (IMPACTO_ORDER[a.impacto] ?? 2) - (IMPACTO_ORDER[b.impacto] ?? 2)
            )
          }

          return { ...area, subareaGroups: Array.from(subMap.values()) }
        })
      )

      setAreas(areasData)
      setActiveAreaId(areasData[0]?.id ?? null)
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

  async function handleDelete(templateId: string) {
    if (!confirm('¿Eliminar esta tarea del plan?')) return
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
              templates: sg.templates.map(t => t.id === saved.id ? saved : t),
            }))
          : a.subareaGroups.map(sg =>
              sg.subArea.id === saved.subArea.id
                ? { ...sg, templates: [...sg.templates, saved] }
                : sg
            ),
      }
    }))
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
      {/* ── Sidebar ── */}
      <div className="w-44 shrink-0 border-r border-[#1a1a1a] bg-[#080808] py-3 flex flex-col">
        {loading ? (
          <p className="px-4 text-gray-700 text-xs mt-2">Cargando...</p>
        ) : (
          <>
            {/* Areas */}
            <div className="flex-1">
              {areas.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setActiveAreaId(a.id); setVistaPersonaId(null) }}
                  className={`w-full text-left px-4 py-3 text-xs transition-all border-l-2 ${
                    activeAreaId === a.id && !vistaPersonaId
                      ? 'border-[#C9A84C] text-white bg-[#0d0d0d]'
                      : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#0a0a0a]'
                  }`}
                >
                  <span className="mr-1.5">{a.icono}</span>
                  {a.nombre}
                </button>
              ))}
            </div>

            {/* Por persona */}
            {usuarios.length > 0 && (
              <div className="border-t border-[#1a1a1a] pt-3 mt-2">
                <p className="text-[9px] text-gray-700 uppercase tracking-wider px-4 mb-2">Por persona</p>
                {usuarios.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setVistaPersonaId(u.id); setActiveAreaId(null) }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-all border-l-2 ${
                      vistaPersonaId === u.id
                        ? 'border-[#C9A84C] text-white bg-[#0d0d0d]'
                        : 'border-transparent text-gray-600 hover:text-gray-300 hover:bg-[#0a0a0a]'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#222] flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">
                      {u.name[0]}
                    </div>
                    <span className="truncate">{u.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Content ── */}
      {usuarioSeleccionado ? (
        <VistaPorPersona
          usuario={usuarioSeleccionado}
          usuarios={usuarios}
          onEdit={t => handleOpenModal({ tarea: t, areaId: t.area.id, subAreaId: t.subArea.id, subAreaNombre: t.subArea.nombre })}
          onDelete={handleDelete}
          onResponsableChange={handleResponsableChange}
        />
      ) : (
        <div className="flex-1 overflow-auto">
          {!loading && area && (
            <>
              {/* Area header + filters */}
              <div className="px-5 py-4 border-b border-[#1a1a1a] bg-[#0a0a0a] sticky top-0 z-20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{area.icono}</span>
                  <div>
                    <h2 className="text-lg font-bold text-white">{area.nombre}</h2>
                    {area.objetivo && (
                      <p className="text-xs text-gray-500 mt-0.5 max-w-xl">{area.objetivo}</p>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-gray-600">{totalVisible} tareas</span>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <input
                    type="text"
                    placeholder="Buscar tarea..."
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

              {/* Subareas + tables */}
              {area.subareaGroups.map(group => {
                const filtered = group.templates.filter(filterT)
                return (
                  <div key={group.subArea.id}>
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#070707] border-b border-[#111] sticky top-[148px] z-10">
                      <div className="w-0.5 h-4 rounded-full bg-[#2a2a2a]" />
                      <span className="text-[10px] text-gray-600 uppercase tracking-[0.15em] font-semibold">
                        {group.subArea.nombre}
                      </span>
                      <span className="text-[10px] text-gray-700">{filtered.length}</span>
                    </div>
                    {filtered.length > 0 && (
                      <table className="w-full">
                        <tbody>
                          {filtered.map(t => (
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
                            />
                          ))}
                        </tbody>
                      </table>
                    )}
                    {/* + Agregar tarea */}
                    <button
                      onClick={() => handleOpenModal({
                        areaId: area.id,
                        subAreaId: group.subArea.id,
                        subAreaNombre: group.subArea.nombre,
                      })}
                      className="w-full text-left px-5 py-2.5 text-xs text-gray-700 hover:text-[#C9A84C] hover:bg-[#0a0a0a] flex items-center gap-1.5 border-b border-[#0d0d0d] transition-colors"
                    >
                      <span className="text-base leading-none">+</span>
                      Agregar tarea a {group.subArea.nombre}
                    </button>
                  </div>
                )
              })}
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
