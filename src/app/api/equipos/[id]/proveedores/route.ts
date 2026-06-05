import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/equipos/[id]/proveedores — lista proveedores de un equipo (ordenados por prioridad desc)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const registros = await prisma.equipoProveedorPrecio.findMany({
    where: { equipoId: id, activo: true },
    include: { proveedor: { select: { id: true, nombre: true, empresa: true, prioridad: true, telefono: true } } },
    orderBy: { proveedor: { prioridad: 'desc' as const } },
  })
  return NextResponse.json({ proveedores: registros })
}

// POST /api/equipos/[id]/proveedores — vincular proveedor con precio
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const { proveedorId, precio, notas } = await req.json()
  if (!proveedorId || precio === undefined) return NextResponse.json({ error: 'proveedorId y precio requeridos' }, { status: 400 })
  const registro = await prisma.equipoProveedorPrecio.upsert({
    where: { equipoId_proveedorId: { equipoId: id, proveedorId } },
    create: { equipoId: id, proveedorId, precio: Number(precio), notas: notas ?? null },
    update: { precio: Number(precio), notas: notas ?? null, activo: true },
    include: { proveedor: { select: { id: true, nombre: true, empresa: true, prioridad: true } } },
  })
  return NextResponse.json({ registro })
}
