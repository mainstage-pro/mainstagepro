import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// ── Dashboard de Gestión Operativa ───────────────────────────────────────────
// Resumen por usuario de su rendimiento (asignadas / completadas / vencidas) y
// sus pendientes desglosados por los 4 sistemas operativos (tipoOrigen):
//   TAREA    → tareas normales
//   PLAN     → tareas del plan de trabajo
//   EVENTO   → tareas de proyectos de eventos
//   PROYECTO → tareas de proyectos de empresa (internos)
//
// Visibilidad: solo ADMIN ve a todos; cada usuario ve únicamente lo suyo.
// Orden fijo para la vista de admin: Mauricio, Emiliano, Sebastian, Rodrigo, Zaid, Daniel.

const ORDEN_NOMBRES = ['mauricio', 'emiliano', 'sebastian', 'rodrigo', 'zaid', 'daniel']

const SISTEMAS = ['TAREA', 'EVENTO', 'PROYECTO'] as const
type Sistema = (typeof SISTEMAS)[number]

function rankUsuario(name: string): number {
  const first = (name ?? '').trim().toLowerCase().split(/\s+/)[0]
  // normaliza acentos (Sebastián → sebastian)
  const norm = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const idx = ORDEN_NOMBRES.indexOf(norm)
  return idx === -1 ? ORDEN_NOMBRES.length + 1 : idx
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const isAdmin = session.role === 'ADMIN'

  // 1. Determinar qué usuarios se muestran
  const users = isAdmin
    ? await prisma.user.findMany({
        where: { active: true },
        select: { id: true, name: true, area: true },
      })
    : await prisma.user.findMany({
        where: { id: session.id },
        select: { id: true, name: true, area: true },
      })

  const userIds = users.map(u => u.id)

  const now = new Date()

  // 2. Todas las tareas medibles (no canceladas, sin subtareas) de esos usuarios
  const tareas = await prisma.tarea.findMany({
    where: {
      asignadoAId: { in: userIds },
      estado: { not: 'CANCELADA' },
      parentId: null,
      // Plan de trabajo eliminado de la plataforma: no cuenta ni se muestra
      tipoOrigen: { not: 'PLAN' },
      origenPlan: false,
      // Solo tareas ejecutables: deben tener fecha asignada. Sin fecha no cuentan.
      fecha: { not: null },
    },
    select: {
      id: true,
      titulo: true,
      prioridad: true,
      estado: true,
      area: true,
      tipoOrigen: true,
      fecha: true,
      fechaVencimiento: true,
      fechaCompletada: true,
      asignadoAId: true,
      proyectoTarea: { select: { nombre: true } },
      proyectoEvento: { select: { nombre: true } },
      proyectoInterno: { select: { nombre: true } },
      faseInterna: { select: { nombre: true } },
    },
  })

  // 3. Agregar por usuario
  type Pendiente = {
    id: string
    titulo: string
    prioridad: string
    estado: string
    fecha: string | null
    vencimiento: string | null
    vencida: boolean
    contexto: string | null
  }

  const porUsuario = new Map<string, {
    asignadas: number
    completadas: number
    vencidas: number
    sistemas: Record<Sistema, Pendiente[]>
  }>()

  for (const u of users) {
    porUsuario.set(u.id, {
      asignadas: 0,
      completadas: 0,
      vencidas: 0,
      sistemas: { TAREA: [], EVENTO: [], PROYECTO: [] },
    })
  }

  const PRIO_RANK: Record<string, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAJA: 3 }

  for (const t of tareas) {
    if (!t.asignadoAId) continue
    const agg = porUsuario.get(t.asignadoAId)
    if (!agg) continue

    agg.asignadas++

    const completada = t.estado === 'COMPLETADA'
    if (completada) {
      agg.completadas++
      continue // completadas no aparecen en la lista de pendientes
    }

    // Vencida: su fecha compromiso ya pasó y no está completa. El compromiso es
    // la MÁS TARDÍA entre fecha de trabajo y vencimiento: si la tarea se movió a
    // un día futuro (cambia `fecha`), deja de estar vencida aunque conserve un
    // `fechaVencimiento` viejo en el pasado.
    const venceRef =
      t.fecha && t.fechaVencimiento
        ? (t.fecha > t.fechaVencimiento ? t.fecha : t.fechaVencimiento)
        : (t.fecha ?? t.fechaVencimiento)
    const vencida = !!venceRef && venceRef < now
    if (vencida) agg.vencidas++

    const sistema: Sistema = (SISTEMAS as readonly string[]).includes(t.tipoOrigen)
      ? (t.tipoOrigen as Sistema)
      : 'TAREA'

    const contexto =
      t.proyectoEvento?.nombre ??
      t.proyectoInterno?.nombre ??
      t.faseInterna?.nombre ??
      t.proyectoTarea?.nombre ??
      null

    agg.sistemas[sistema].push({
      id: t.id,
      titulo: t.titulo,
      prioridad: t.prioridad,
      estado: t.estado,
      fecha: t.fecha ? t.fecha.toISOString().slice(0, 10) : null,
      vencimiento: t.fechaVencimiento ? t.fechaVencimiento.toISOString().slice(0, 10) : null,
      vencida,
      contexto,
    })
  }

  // Ordenar pendientes de cada sistema: vencidas primero, luego por prioridad, luego por fecha
  for (const agg of porUsuario.values()) {
    for (const s of SISTEMAS) {
      agg.sistemas[s].sort((a, b) => {
        if (a.vencida !== b.vencida) return a.vencida ? -1 : 1
        const pa = PRIO_RANK[a.prioridad] ?? 9
        const pb = PRIO_RANK[b.prioridad] ?? 9
        if (pa !== pb) return pa - pb
        const fa = a.vencimiento ?? a.fecha ?? '9999'
        const fb = b.vencimiento ?? b.fecha ?? '9999'
        return fa.localeCompare(fb)
      })
    }
  }

  // 4. Construir salida ordenada
  const usuarios = users
    .map(u => {
      const agg = porUsuario.get(u.id)!
      const pendientes = agg.asignadas - agg.completadas
      return {
        id: u.id,
        name: u.name,
        area: u.area,
        asignadas: agg.asignadas,
        completadas: agg.completadas,
        pendientes,
        vencidas: agg.vencidas,
        pct: agg.asignadas > 0 ? Math.round((agg.completadas / agg.asignadas) * 100) : 0,
        sistemas: SISTEMAS.map(s => ({
          key: s,
          pendientes: agg.sistemas[s],
        })),
      }
    })
    .sort((a, b) => {
      const ra = rankUsuario(a.name)
      const rb = rankUsuario(b.name)
      if (ra !== rb) return ra - rb
      return a.name.localeCompare(b.name)
    })

  return NextResponse.json({
    isAdmin,
    currentUserId: session.id,
    usuarios,
  })
}
