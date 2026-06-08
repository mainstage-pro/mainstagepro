import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// PATCH /api/plan-trabajo/templates/reorder
// Body: { orderedIds: string[] }
// Sets orden 100, 200, 300... for each template in order
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { orderedIds } = await req.json()
  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: 'orderedIds required' }, { status: 400 })
  }

  await Promise.all(
    orderedIds.map((id: string, index: number) =>
      prisma.pTTareaTemplate.update({
        where: { id },
        data: { orden: (index + 1) * 100 },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
