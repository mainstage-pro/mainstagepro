import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// ── Vista semanal del equipo ──────────────────────────────────────────────────
// Devuelve, por cada miembro del equipo, sus tareas de la semana (lun–vie),
// cada una con el día en que caen (YYYY-MM-DD en zona México) y su tipo de
// sistema operativo (tipoOrigen): TAREA · PLAN · EVENTO · PROYECTO · TRATO.
// El cliente las agrupa por día y por tipo, calcula el día más cargado y
// permite reasignar el día de una tarea (PATCH /api/tareas/[id] { fecha }).
//
// Visibilidad: ADMIN ve a todo el equipo; el resto solo se ve a sí mismo.
// Orden fijo de la vista de admin (igual que el resumen de gestión).

const ORDEN_NOMBRES = ['mauricio', 'emiliano', 'sebastian', 'rodrigo', 'zaid', 'daniel']

function rankUsuario(name: string): number {
  const first = (name ?? '').trim().toLowerCase().split(/\s+/)[0]
  const norm = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const idx = ORDEN_NOMBRES.indexOf(norm)
  return idx === -1 ? ORDEN_NOMBRES.length + 1 : idx
}

// Día local (América/México) de una fecha, como YYYY-MM-DD.
function diaCST(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

// El lunes de la semana que contiene la fecha `ymd` (YYYY-MM-DD), en CST.
function lunesDeLaSemana(ymd: string): string {
  const base = new Date(`${ymd}T12:00:00-06:00`)
  const dow = base.getUTCDay() // 0=dom … 6=sáb (base a mediodía CST evita cruces de día)
  const diffALunes = dow === 0 ? -6 : 1 - dow
  base.setUTCDate(base.getUTCDate() + diffALunes)
  return diaCST(base)
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const isAdmin = session.role === 'ADMIN'

  // 1. Semana pedida (?inicio=YYYY-MM-DD, cualquier día de la semana). Default: hoy.
  const inicioParam = req.nextUrl.searchParams.get('inicio')
  const hoyCST = diaCST(new Date())
  const lunes = lunesDeLaSemana(inicioParam && /^\d{4}-\d{2}-\d{2}$/.test(inicioParam) ? inicioParam : hoyCST)

  // Los 5 días objetivo (lun–vie) como strings YYYY-MM-DD.
  const dias: string[] = []
  {
    const d = new Date(`${lunes}T12:00:00-06:00`)
    for (let i = 0; i < 5; i++) {
      dias.push(diaCST(d))
      d.setUTCDate(d.getUTCDate() + 1)
    }
  }
  const setDias = new Set(dias)

  // 2. Usuarios visibles
  const users = isAdmin
    ? await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, area: true } })
    : await prisma.user.findMany({ where: { id: session.id }, select: { id: true, name: true, area: true } })

  const userIds = users.map(u => u.id)

  // 3. Ventana de consulta amplia en UTC (lun−1 … sáb+1) para no perder tareas por
  //    el desfase de zona horaria; luego se filtra por el string de día CST.
  const desde = new Date(`${dias[0]}T00:00:00-06:00`)
  desde.setUTCDate(desde.getUTCDate() - 1)
  const hasta = new Date(`${dias[4]}T00:00:00-06:00`)
  hasta.setUTCDate(hasta.getUTCDate() + 2)

  const tareas = await prisma.tarea.findMany({
    where: {
      asignadoAId: { in: userIds },
      estado: { not: 'CANCELADA' },
      parentId: null,
      fecha: { gte: desde, lt: hasta },
    },
    select: {
      id: true,
      titulo: true,
      prioridad: true,
      estado: true,
      tipoOrigen: true,
      fecha: true,
      fechaVencimiento: true,
      asignadoAId: true,
      proyectoTarea: { select: { nombre: true } },
      proyectoEvento: { select: { nombre: true } },
      proyectoInterno: { select: { nombre: true } },
      faseInterna: { select: { nombre: true } },
      trato: { select: { nombreEvento: true, cliente: { select: { nombre: true } } } },
    },
  })

  const now = new Date()
  const TIPOS = new Set(['TAREA', 'PLAN', 'EVENTO', 'PROYECTO', 'TRATO'])

  type TareaSemana = {
    id: string
    titulo: string
    prioridad: string
    estado: string
    tipo: string
    dia: string
    contexto: string | null
    vencida: boolean
  }

  const porUsuario = new Map<string, TareaSemana[]>()
  for (const u of users) porUsuario.set(u.id, [])

  for (const t of tareas) {
    if (!t.asignadoAId || !t.fecha) continue
    const dia = diaCST(t.fecha)
    if (!setDias.has(dia)) continue
    const lista = porUsuario.get(t.asignadoAId)
    if (!lista) continue

    const tipo = TIPOS.has(t.tipoOrigen) ? t.tipoOrigen : 'TAREA'
    const contexto =
      t.trato?.nombreEvento ??
      t.trato?.cliente?.nombre ??
      t.proyectoEvento?.nombre ??
      t.proyectoInterno?.nombre ??
      t.faseInterna?.nombre ??
      t.proyectoTarea?.nombre ??
      null
    const venceRef = t.fechaVencimiento ?? t.fecha
    const vencida = t.estado !== 'COMPLETADA' && !!venceRef && venceRef < now

    lista.push({
      id: t.id,
      titulo: t.titulo,
      prioridad: t.prioridad,
      estado: t.estado,
      tipo,
      dia,
      contexto,
      vencida,
    })
  }

  const usuarios = users
    .map(u => {
      const tareasU = porUsuario.get(u.id)!
      const pendientes = tareasU.filter(t => t.estado !== 'COMPLETADA').length
      return { id: u.id, name: u.name, area: u.area, total: pendientes, tareas: tareasU }
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
    inicio: lunes,
    dias,
    usuarios,
  })
}
