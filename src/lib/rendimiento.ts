import { prisma } from '@/lib/prisma'
import { proyectarOcurrencias, diaCalUTC } from '@/lib/ocurrencias'

/**
 * Rendimiento operativo — diagnóstico de cumplimiento del equipo.
 *
 * Universo medible: tareas con RESPONSABLE asignado y FECHA COMPROMISO
 * (la MÁS TARDÍA entre fecha y fechaVencimiento). Se excluyen subtareas y canceladas.
 *
 * Cumplimiento "A LA FECHA": se mide sobre lo que YA debía estar hecho, es decir
 * completadas / (completadas + vencidas). Las pendientes vigentes (aún no vencen)
 * NO penalizan hasta que pasa su fecha compromiso — así no castiga el trabajo futuro
 * de la semana. Una tarea completada cuenta completa aunque se entregue tarde
 * (mide cumplimiento, no puntualidad).
 *
 * Recurrentes: una tarea recurrente es UNA fila que se reagenda al completarse; sus
 * ocurrencias cerradas viven en `evidenciasHistorial`. Se PROYECTAN por día con el
 * mismo helper que la Semana del equipo (src/lib/ocurrencias) para que ambas vistas
 * coincidan y el trabajo recurrente hecho cuente de verdad como cumplido.
 *
 * Alcance: todas las fuentes (Plan de trabajo, Tareas, Proyectos de evento/empresa,
 * Tratos), unificadas en el modelo Tarea.
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
// La MÁS TARDÍA entre dos fechas (ignora nulls). Se usa como fecha compromiso:
// si la tarea se movió a un día futuro (cambia `fecha`), deja de contar como
// vencida aunque conserve un `fechaVencimiento` viejo en el pasado.
function masTardia(a: Date | null, b: Date | null): Date | null {
  if (!a) return b
  if (!b) return a
  return a.getTime() >= b.getTime() ? a : b
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
export type FuenteKey = 'NORMAL' | 'PLAN' | 'EVENTO' | 'EMPRESA' | 'TRATO'

export const FUENTE_LABEL: Record<FuenteKey, string> = {
  NORMAL: 'Tareas',
  PLAN: 'Plan de trabajo',
  EVENTO: 'Proyectos de evento',
  EMPRESA: 'Proyectos de empresa',
  TRATO: 'Tratos',
}

// Orden de despliegue de las fuentes en el desglose.
export const FUENTE_ORDEN: FuenteKey[] = ['PLAN', 'NORMAL', 'EVENTO', 'EMPRESA', 'TRATO']

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
  dispensadas: number
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
  dispensadas: number
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
  tipoOrigen: string
  asignadoAId: string | null
  fecha: Date | null
  fechaVencimiento: Date | null
  fechaCompletada: Date | null
  recurrencia: string | null
  createdAt: Date | null
  evidenciasHistorial: string | null
  proyectoEventoId: string | null
  tratoId: string | null
  proyectoInternoId: string | null
  requiereEvidencia: boolean
  estadoVerificacion: string
  noRealizada: boolean
  asignadoA: { id: string; name: string; area: string | null } | null
  proyectoEvento: { nombre: string } | null
  trato: { nombreEvento: string | null } | null
  proyectoInterno: { nombre: string } | null
  proyectoTarea: { nombre: string } | null
  ptTemplate: { area: { nombre: string } | null } | null
}

function fuenteDe(t: TareaRow): { fuente: FuenteKey; contexto: string | null } {
  if (t.tipoOrigen === 'PLAN') return { fuente: 'PLAN', contexto: t.ptTemplate?.area?.nombre ?? 'Plan de trabajo' }
  if (t.proyectoEventoId) return { fuente: 'EVENTO', contexto: t.proyectoEvento?.nombre ?? null }
  if (t.tratoId) return { fuente: 'TRATO', contexto: t.trato?.nombreEvento ?? 'Trato' }
  if (t.proyectoInternoId) return { fuente: 'EMPRESA', contexto: t.proyectoInterno?.nombre ?? null }
  return { fuente: 'NORMAL', contexto: t.proyectoTarea?.nombre ?? null }
}

function nuevoPorFuente(): Record<FuenteKey, { total: number; completadas: number }> {
  return {
    NORMAL: { total: 0, completadas: 0 },
    PLAN: { total: 0, completadas: 0 },
    EVENTO: { total: 0, completadas: 0 },
    EMPRESA: { total: 0, completadas: 0 },
    TRATO: { total: 0, completadas: 0 },
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

  // Universo: tareas raíz (no subtareas) con responsable, no canceladas.
  // Incluye el plan de trabajo (tipoOrigen='PLAN', que trae ptTemplateId).
  const base = {
    asignadoAId: { not: null as string | null },
    estado: { not: 'CANCELADA' },
    parentId: null as string | null,
    ...(soloUsuarioId ? { asignadoAId: soloUsuarioId } : {}),
  }

  const select = {
    id: true, titulo: true, prioridad: true, estado: true, tipoOrigen: true, asignadoAId: true,
    fecha: true, fechaVencimiento: true, fechaCompletada: true,
    recurrencia: true, createdAt: true, evidenciasHistorial: true,
    proyectoEventoId: true, tratoId: true, proyectoInternoId: true,
    requiereEvidencia: true, estadoVerificacion: true, noRealizada: true,
    asignadoA: { select: { id: true, name: true, area: true } },
    proyectoEvento: { select: { nombre: true } },
    trato: { select: { nombreEvento: true } },
    proyectoInterno: { select: { nombre: true } },
    proyectoTarea: { select: { nombre: true } },
    ptTemplate: { select: { area: { select: { nombre: true } } } },
  }

  const [rows, sinResponsable] = await Promise.all([
    prisma.tarea.findMany({
      where: {
        ...base,
        OR: [
          // Pendientes/en progreso (incluye las recurrentes, que se reagendan a
          // PENDIENTE; sus ocurrencias cerradas se leen de evidenciasHistorial).
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
      where: { estado: { not: 'CANCELADA' }, parentId: null, asignadoAId: null },
    }),
  ])

  // Rango de días (YYYY-MM-DD) sobre el que se proyectan las ocurrencias recurrentes:
  // toda la ventana de tendencia (8 semanas) hasta el fin del periodo.
  const allDays: string[] = []
  for (let d = windowStr; d <= hasta; d = addDias(d, 1)) allDays.push(d)

  // Diagnóstico por ocurrencia: completada / vencida (sin completar y pasada) / vigente.
  // Una tarea normal = 1 diag; una recurrente = 1 diag por ocurrencia proyectada.
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
  // "No realizada" aceptada/justificada: se excluye del cálculo (ni cuenta como
  // cumplida ni resta). Se cuenta aparte como "dispensada" para dar visibilidad.
  let dispensadasTotal = 0
  const dispensadasPorUser = new Map<string, number>()
  const marcarDispensada = (row: TareaRow, diaStr: string) => {
    if (diaStr >= desde && diaStr <= hasta) {
      dispensadasTotal++
      if (row.asignadoAId) dispensadasPorUser.set(row.asignadoAId, (dispensadasPorUser.get(row.asignadoAId) ?? 0) + 1)
    }
  }
  for (const row of rows) {
    // Recurrente: se proyectan sus ocurrencias por día (mismo helper que la Semana
    // del equipo), leyendo evidenciasHistorial para las ya cerradas.
    if (row.recurrencia) {
      for (const o of proyectarOcurrencias(row, allDays, hoyStr)) {
        if (o.noRealizada) { marcarDispensada(row, o.dia); continue }
        diags.push({
          row,
          compromisoStr: o.dia,
          completada: o.completada,
          vencida: o.vencida,
          pendienteVigente: o.pendienteVigente,
          diasAtraso: o.vencida ? diffDias(hoyStr, o.dia) : 0,
        })
      }
      continue
    }
    // No recurrente: una sola ocurrencia con compromiso = la fecha más tardía.
    const compromiso = masTardia(row.fecha, row.fechaVencimiento)
    if (!compromiso) { if (row.estado !== 'COMPLETADA') sinFecha++; continue }
    const compromisoStr = diaCalUTC(compromiso)
    if (row.noRealizada) { marcarDispensada(row, compromisoStr); continue }
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
  resumen.dispensadas = dispensadasTotal

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
    // Dedup por tarea: una recurrente diaria genera muchas ocurrencias con el mismo
    // id; en la lista mostramos una sola (la más atrasada / la más próxima).
    const criticas = dedupPorId(
      ds.filter(d => d.vencida).sort((a, b) => b.diasAtraso - a.diasAtraso),
    ).slice(0, 25).map(toDetalle)
    const pendientes = dedupPorId(
      ds.filter(d => d.pendienteVigente).sort((a, b) => a.compromisoStr.localeCompare(b.compromisoStr)),
    ).slice(0, 25).map(toDetalle)
    usuarios.push({
      id: uid,
      name: info?.name ?? 'Sin nombre',
      area: info?.area ?? null,
      total: r.total,
      completadas: r.completadas,
      vencidas: r.vencidas,
      pendientesVigentes: r.pendientesVigentes,
      dispensadas: dispensadasPorUser.get(uid) ?? 0,
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
  const fuentes: RendFuente[] = FUENTE_ORDEN
    .map(fuente => {
      const f = fuenteAgg.get(fuente) ?? { total: 0, completadas: 0, vencidas: 0 }
      return {
        fuente,
        label: FUENTE_LABEL[fuente],
        total: f.total,
        completadas: f.completadas,
        vencidas: f.vencidas,
        cumplimiento: pct(f.completadas, f.completadas + f.vencidas),
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
    const vencidas = sem.filter(d => d.vencida).length
    tendencia.push({
      semana: lun,
      label: fechaHumana(lun),
      total,
      completadas,
      cumplimiento: pct(completadas, completadas + vencidas),
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
  function dedupPorId(ds: Diag[]): Diag[] {
    const vistos = new Set<string>()
    const out: Diag[] = []
    for (const d of ds) {
      if (vistos.has(d.row.id)) continue
      vistos.add(d.row.id)
      out.push(d)
    }
    return out
  }
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
    dispensadas: 0,
    // Cumplimiento "a la fecha": de lo que YA vencía (hecho + vencido), cuánto se hizo.
    // Las pendientes vigentes (aún no vencen) no entran al denominador.
    cumplimiento: pct(completadas, completadas + vencidas),
    sinFecha,
    sinResponsable,
  }
}
