import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/plan-trabajo/templates
// ?areaId=X  → returns full template list for that area (for Plan page)
// (no params) → returns summary counts per area (for existing tabs)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const areaId = searchParams.get('areaId')

  // ── Full template list for one area ─────────────────────────────────────────
  if (areaId) {
    const templates = await prisma.pTTareaTemplate.findMany({
      where: { areaId, activa: true },
      include: {
        area:        true,
        subArea:     true,
        responsable: { select: { id: true, name: true } },
      },
      orderBy: [
        { subArea: { orden: 'asc' } },
        { orden: 'asc' },
      ],
    })
    return NextResponse.json({ templates })
  }

  // ── Summary counts (default behaviour) ──────────────────────────────────────
  const [totalTemplates, areas] = await Promise.all([
    prisma.pTTareaTemplate.count({ where: { activa: true } }),
    prisma.pTArea.findMany({
      orderBy: { orden: 'asc' },
      include: {
        _count: { select: { templates: { where: { activa: true } } } },
        subareas: {
          orderBy: { orden: 'asc' },
          select: {
            id: true,
            nombre: true,
            _count: { select: { templates: { where: { activa: true } } } },
          },
        },
      },
    }),
  ])

  return NextResponse.json({ totalTemplates, areas })
}
