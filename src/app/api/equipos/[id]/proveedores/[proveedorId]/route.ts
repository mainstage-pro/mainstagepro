import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; proveedorId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id, proveedorId } = await params
  const { precio, notas } = await req.json()
  const registro = await prisma.equipoProveedorPrecio.update({
    where: { equipoId_proveedorId: { equipoId: id, proveedorId } },
    data: { ...(precio !== undefined && { precio: Number(precio) }), ...(notas !== undefined && { notas }) },
  })
  return NextResponse.json({ registro })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; proveedorId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id, proveedorId } = await params
  await prisma.equipoProveedorPrecio.update({
    where: { equipoId_proveedorId: { equipoId: id, proveedorId } },
    data: { activo: false },
  })
  return NextResponse.json({ ok: true })
}
