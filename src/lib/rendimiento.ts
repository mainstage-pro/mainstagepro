import { prisma } from '@/lib/prisma'

/**
 * Rendimiento operativo — diagnóstico de cumplimiento del equipo.
 *
 * Universo medible: tareas con RESPONSABLE asignado y FECHA COMPROMISO
 * (fechaVencimiento ?? fecha). Son las que "cuentan". Se excluyen subtareas,
 * canceladas y las generadas por plantilla de plan (ptTemplateId), ya dadas de baja.
 *
 * Se mide CUMPLIMIENTO (¿se hizo o no?), no puntualidad: una tarea completada
 * cuenta completa aunque se haya entregado tarde. Solo se marca como "vencida"
 * la que sigue SIN completar después de su fecha compromiso.
 *
 * Todas las fuentes (tareas normales, proyectos de evento, proyectos de empresa
 * y tratos) viven en el mismo modelo `Tarea` vía FKs, así que se miden juntas.
 */

// ── Zona horaria: México (UTC-6 todo el año, sin horario de verano desde 2023) ──
const TZ = 'America/Mexico_City'
const OFF = '-06:00'

function fmtDia(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}
function parseDiaInicio(s: string): Date { return new Date(`${s}T00:00:00.000${OFF}`) }
function addDias(s: string, n: number): string {
  const d = new Date(`${s}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function diffDias(aStr: string, bStr: string): number {
  const a = new Date(`${aStr}T00:00:00Z`).getTime()
  const b = new Date(`${bStr}T00:00:00Z`).getTime()
  return Math.round((a - b) / 86_400_000)
}
function lunesDe(s: string): string {
  const dow = new Date(`${s}T00:00:00Z`).getUTCDay() // 0=Dom..6=Sab
  return addDias(s, -((dow + 6) % 7))
}
function pct(n: number, d: number): number { return d > 0 ? Math.round((n / d) * 100) : 0 }

// ── Presets de periodo ─────────────────────────────────────────────────────────
export type PresetPeriodo = 'semana' | 'semana-pasada' | '4-semanas' | 'mes'

export function rangoPreset(preset: PresetPeriodo): { desde: string; hasta: string } {
  const hoy = fmtDia(new Date())
  if (preset === 'semana-pasada') {
    const lun = addDias(lunesDe(hoy), -7)
    return { desde: lun, hasta: addDias(lun, 6) }
  }
  if (preset === '4-semanas') {
    const lun = lunesDe(hoy)
    return { desde: addDias(lun, -21), hasta: addDias(lun, 6) }
  }
  if (preset === 'mes') {
    const [y, m] = hoy.split('-').map(Number)
    const desde = `${y}-${String(m).padStart(2, '0')}-01`
    const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return { desde, hasta: `${y}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}` }
  }
  const lun = lunesDe(hoy)
  return { desde: lun, hasta: addDias(lun, 6) }
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
function fechaHumana(s: string): string {
  const [, m, d] = s.split('-').map(Number)
  return `${d} ${MESES[m - 1]}`
}
export function labelPeriodo(desde: string, hasta: string): string {
  const yD = desde.slice(0, 4), yH = hasta.slice(0, 4)
  const anio = yD === yH ? yH : `${yD}–${yH}`
  return `${fechaHumana(desde)} – ${fechaHumana(hasta)} ${anio}`
}

// ── Tipos de salida ──────────────────────────────────────────────────────────
export type FuenteKey = 'EVENTO' | 'EMPRESA' | 'TRATO' | 'NORMAL'

export const FUENTE_LABEL: Record<FuenteKey, string> = {
  EVENTO: 'Proyectos de evento',
  EMPRESA: 'Proyectos de empresa',
  TRATO: 'Tratos',
  NORMAL: 'Tareas',
}

export interface RendTareaDetalle {
  id: string
  titulo: string
  prioridad: string
  fuente: FuenteKey
  contexto: string | null
  fechaCompromiso: string | null
  estado: string
  diasAtraso: number
  verificacion: string
}

interface Verificacion { requieren: number; verificadas: number; rechazadas: number; pendientes: number }

export interface RendUsuario {
  id: string
  name: string
  area: string | null
  total: number
  completadas: number
  vencidas: number
  pendientesVigentes: number
  cumplimiento: number
  porFuente: Record<FuenteKey, { total: number; completadas: number }>
  verificacion: Verificacion
  criticas: RendTareaDetalle[]
  pendientes: RendTareaDetalle[]
}

export interface RendFuente {
  fuente: FuenteKey
  label: string
  total: number
  completadas: number
  vencidas: number
  cumplimiento: number
}

export interface RendSemana {
  semana: string
  label: string
  total: number
  completadas: number
  cumplimiento: number
}

export interface RendResumen {
  total: number
  completadas: number
  vencidas: number
  pendientesVigentes: number
  cumplimiento: number
  sinFecha: number
  sinResponsable: number
}

export interface RendimientoData {
  periodo: { desde: string; hasta: string; label: string }
  resumen: RendResumen
  usuarios: RendUsuario[]
  fuentes: RendFuente[]
  tendencia: RendSemana[]
  verificacion: Verificacion
  generadoEn: string
}

// ── Cálculo ────────────────────────────────────────────────────────────────────

type TareaRow = {
  id: string
  titulo: string
  prioridad: string
  estado: string
  asignadoAId: string | null
  fecha: Date | null
  fechaVencimiento: Date | null
  fechaCompletada: Date | null
  proyectoEventoId: string | null
  tratoId: string | null
  proyectoInternoId: string | null
  requiereEvidencia: boolean
  estadoVerificacion: string
  asignadoA: { id: string; name: string; area: string | null } | null
  proyectoEvento: { nombre: string } | null
  trato: { nombreEvento: string | null } | null
  proyectoInterno: { nombre: string } | null
  proyectoTarea: { nombre: string } | null
}

function fuenteDe(t: TareaRow): { fuente: FuenteKey; contexto: string | null } {
  if (t.proyectoEventoId) return { fuente: 'EVENTO', contexto: t.proyectoEvento?.nombre ?? null }
  if (t.tratoId) return { fuente: 'TRATO', contexto: t.trato?.nombreEvento ?? 'Trato' }
  if (t.proyectoInternoId) return { fuente: 'EMPRESA', contexto: t.proyectoInterno?.nombre ?? null }
  return { fuente: 'NORMAL', contexto: t.proyectoTarea?.nombre ?? null }
}

function nuevoPorFuente(): Record<FuenteKey, { total: number; completadas: number }> {
  return {
    EVENTO: { total: 0, completadas: 0 },
    EMPRESA: { total: 0, completadas: 0 },
    TRATO: { total: 0, completadas: 0 },
    NORMAL: { total: 0, completadas: 0 },
  }
}

export async function computeRendimiento(opts: {
  desde: string
  hasta: string
  soloUsuarioId?: string
}): Promise<RendimientoData> {
  const { desde, hasta, soloUsuarioId } = opts
  const hoyStr = fmtDia(new Date())

  // Tendencia: 8 semanas terminando en la semana de `hasta`
  const lunHasta = lunesDe(hasta)
  const trendInicio = addDias(lunHasta, -7 * 7)
  const windowStr = desde < trendInicio ? desde : trendInicio
  const windowStart = parseDiaInicio(windowStr)

  const base = {
    asignadoAId: { not: null as string | null },
    estado: { not: 'CANCELADA' },
    parentId: null as string | null,
    ptTemplateId: null as string | null,
    ...(soloUsuarioId ? { asignadoAId: soloUsuarioId } : {}),
  }

  const select = {
    id: true, titulo: true, prioridad: true, estado: true, asignadoAId: true,
    fecha: true, fechaVencimiento: true, fechaCompletada: true,
    proyectoEventoId: true, tratoId: true, proyectoInternoId: true,
    requiereEvidencia: true, estadoVerificacion: true,
    asignadoA: { select: { id: true, name: true, area: true } },
    proyectoEvento: { select: { nombre: true } },
    trato: { select: { nombreEvento: true } },
    proyectoInterno: { select: { nombre: true } },
    proyectoTarea: { select: { nombre: true } },
  }

  const [rows, sinResponsable] = await Promise.all([
    prisma.tarea.findMany({
      where: {
        ...base,
        OR: [
          { estado: { in: ['PENDIENTE', 'EN_PROGRESO'] } },
          {
            estado: 'COMPLETADA',
            OR: [
              { fechaCompletada: { gte: windowStart } },
              { fecha: { gte: windowStart } },
              { fechaVencimiento: { gte: windowStart } },
            ],
          },
        ],
      },
      select,
    }) as unknown as Promise<TareaRow[]>,
    prisma.tarea.count({
      where: { estado: { not: 'CANCELADA' }, parentId: null, ptTemplateId: null, asignadoAId: null },
    }),
  ])

  // Diagnóstico por tarea: completada / vencida (sin completar y pasada) / vigente
  type Diag = {
    row: TareaRow
    compromisoStr: string
    completada: boolean
    vencida: boolean
    pendienteVigente: boolean
    diasAtraso: number
  }
  const diags: Diag[] = []
  let sinFecha = 0
  for (const row of rows) {
    const compromiso = row.fechaVencimiento ?? row.fecha
    if (!compromiso) { if (row.estado !== 'COMPLETADA') sinFecha++; continue }
    const compromisoStr = fmtDia(compromiso)
    const completada = row.estado === 'COMPLETADA'
    let vencida = false, pendienteVigente = false, diasAtraso = 0
    if (!completada) {
      const d = diffDias(hoyStr, compromisoStr)
      if (d > 0) { vencida = true; diasAtraso = d }
      else pendienteVigente = true
    }
    diags.push({ row, compromisoStr, completada, vencida, pendienteVigente, diasAtraso })
  }

  const enRango = (d: Diag) => d.compromisoStr >= desde && d.compromisoStr <= hasta
  const periodo = diags.filter(enRango)

  // ── Resumen general ──
  const resumen = agregarResumen(periodo, sinFecha, sinResponsable)

  // ── Por usuario ──
  const porUser = new Map<string, Diag[]>()
  for (const d of periodo) {
    const uid = d.row.asignadoAId!
    if (!porUser.has(uid)) porUser.set(uid, [])
    porUser.get(uid)!.push(d)
  }
  const usuarios: RendUsuario[] = []
  for (const [uid, ds] of porUser) {
    const info = ds[0].row.asignadoA
    const r = agregarResumen(ds, 0, 0)
    const porFuente = nuevoPorFuente()
    const verificacion: Verificacion = { requieren: 0, verificadas: 0, rechazadas: 0, pendientes: 0 }
    for (const d of ds) {
      const { fuente } = fuenteDe(d.row)
      porFuente[fuente].total++
      if (d.completada) {
        porFuente[fuente].completadas++
        acumVerificacion(verificacion, d.row)
      }
    }
    const criticas = ds
      .filter(d => d.vencida)
      .sort((a, b) => b.diasAtraso - a.diasAtraso)
      .slice(0, 25)
      .map(toDetalle)
    const pendientes = ds
      .filter(d => d.pendienteVigente)
      .sort((a, b) => a.compromisoStr.localeCompare(b.compromisoStr))
      .slice(0, 25)
      .map(toDetalle)
    usuarios.push({
      id: uid,
      name: info?.name ?? 'Sin nombre',
      area: info?.area ?? null,
      total: r.total,
      completadas: r.completadas,
      vencidas: r.vencidas,
      pendientesVigentes: r.pendientesVigentes,
      cumplimiento: r.cumplimiento,
      porFuente,
      verificacion,
      criticas,
      pendientes,
    })
  }
  usuarios.sort((a, b) => b.cumplimiento - a.cumplimiento || b.total - a.total)

  // ── Por fuente ──
  const fuenteAgg = new Map<FuenteKey, { total: number; completadas: number; vencidas: number }>()
  for (const d of periodo) {
    const { fuente } = fuenteDe(d.row)
    if (!fuenteAgg.has(fuente)) fuenteAgg.set(fuente, { total: 0, completadas: 0, vencidas: 0 })
    const f = fuenteAgg.get(fuente)!
    f.total++
    if (d.completada) f.completadas++
    if (d.vencida) f.vencidas++
  }
  const fuentes: RendFuente[] = (['EVENTO', 'EMPRESA', 'TRATO', 'NORMAL'] as FuenteKey[])
    .map(fuente => {
      const f = fuenteAgg.get(fuente) ?? { total: 0, completadas: 0, vencidas: 0 }
      return {
        fuente,
        label: FUENTE_LABEL[fuente],
        total: f.total,
        completadas: f.completadas,
        vencidas: f.vencidas,
        cumplimiento: pct(f.completadas, f.total),
      }
    })
    .filter(f => f.total > 0)

  // ── Tendencia 8 semanas ──
  const tendencia: RendSemana[] = []
  for (let i = 7; i >= 0; i--) {
    const lun = addDias(lunHasta, -7 * i)
    const dom = addDias(lun, 6)
    const sem = diags.filter(d => d.compromisoStr >= lun && d.compromisoStr <= dom)
    const total = sem.length
    const completadas = sem.filter(d => d.completada).length
    tendencia.push({
      semana: lun,
      label: fechaHumana(lun),
      total,
      completadas,
      cumplimiento: pct(completadas, total),
    })
  }

  // ── Verificación global (periodo) ──
  const verificacion: Verificacion = { requieren: 0, verificadas: 0, rechazadas: 0, pendientes: 0 }
  for (const d of periodo) if (d.completada) acumVerificacion(verificacion, d.row)

  return {
    periodo: { desde, hasta, label: labelPeriodo(desde, hasta) },
    resumen,
    usuarios,
    fuentes,
    tendencia,
    verificacion,
    generadoEn: new Date().toISOString(),
  }

  // ── helpers internos ──
  function toDetalle(d: Diag): RendTareaDetalle {
    const { fuente, contexto } = fuenteDe(d.row)
    return {
      id: d.row.id,
      titulo: d.row.titulo,
      prioridad: d.row.prioridad,
      fuente,
      contexto,
      fechaCompromiso: d.compromisoStr,
      estado: d.row.estado,
      diasAtraso: d.diasAtraso,
      verificacion: d.row.estadoVerificacion,
    }
  }
}

function acumVerificacion(v: { requieren: number; verificadas: number; rechazadas: number; pendientes: number }, row: TareaRow) {
  if (!row.requiereEvidencia) return
  v.requieren++
  if (row.estadoVerificacion === 'VERIFICADA') v.verificadas++
  else if (row.estadoVerificacion === 'RECHAZADA') v.rechazadas++
  else if (row.estadoVerificacion === 'PENDIENTE_VERIFICACION') v.pendientes++
}

type DiagLite = { completada: boolean; vencida: boolean; pendienteVigente: boolean }
function agregarResumen(ds: DiagLite[], sinFecha: number, sinResponsable: number): RendResumen {
  const total = ds.length
  const completadas = ds.filter(d => d.completada).length
  const vencidas = ds.filter(d => d.vencida).length
  const pendientesVigentes = ds.filter(d => d.pendienteVigente).length
  return {
    total, completadas, vencidas, pendientesVigentes,
    cumplimiento: pct(completadas, total),
    sinFecha,
    sinResponsable,
  }
}
