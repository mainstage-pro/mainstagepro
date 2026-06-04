import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/plan-trabajo/instancias/semana?lunes=2026-06-02
// Returns count of active templates per day (Mon-Fri) for the given week
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lunesParam = searchParams.get('lunes') // YYYY-MM-DD of Monday
  const userIdParam = searchParams.get('userId')

  const isAdmin = session.role === 'ADMIN' || session.role === 'DIRECTOR'
  const userId = isAdmin && userIdParam ? userIdParam : session.id

  if (!lunesParam) {
    return NextResponse.json({ error: 'El parámetro lunes es requerido' }, { status: 400 })
  }

  // Get all active templates for this user (or Todo el equipo)
  const templates = await prisma.pTTareaTemplate.findMany({
    where: {
      activa: true,
      OR: [
        { responsableId: userId },
        { puestoDefault: 'Todo el equipo' },
      ],
    },
    select: { diasSemana: true },
  })

  // Count templates per day of the week
  const conteos: Record<string, number> = {}
  for (let i = 0; i < 5; i++) {
    const dia = new Date(lunesParam + 'T12:00:00')
    dia.setDate(dia.getDate() + i)
    const diaStr = dia.toLocaleDateString('en-CA')
    const diaSemana = i + 1 // 1=Lun, 2=Mar, ..., 5=Vie
    conteos[diaStr] = templates.filter(t => t.diasSemana.includes(diaSemana)).length
  }

  return NextResponse.json({ conteos, lunes: lunesParam })
}
