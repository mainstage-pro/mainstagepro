import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/clientes/[id]/precios-equipos
// Devuelve un mapa { equipoId: precio } para carga rápida en el cotizador
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Find the client to check if they have an empresaId
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: { empresaId: true }
  });

  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  let whereClause: any = { clienteId: id };

  if (cliente.empresaId) {
    // If the client is tied to an empresa, find all contacts of that empresa
    const contactos = await prisma.cliente.findMany({
      where: { empresaId: cliente.empresaId },
      select: { id: true }
    });
    const contactoIds = contactos.map(c => c.id);
    // Include the original id just in case
    if (!contactoIds.includes(id)) contactoIds.push(id);
    
    whereClause = { clienteId: { in: contactoIds } };
  }

  const precios = await prisma.precioClienteEquipo.findMany({
    where: whereClause,
    select: { equipoId: true, precio: true, precioOriginal: true, nota: true, updatedAt: true },
  });

  // Convertir a mapa { equipoId → { precio, precioOriginal, nota } }
  const mapa: Record<string, { precio: number; precioOriginal: number | null; nota: string | null; updatedAt: string }> = {};
  for (const p of precios) {
    // If there are duplicates (multiple contacts have special price for same item), the last one wins
    // We could sort by updatedAt if we wanted the newest one
    mapa[p.equipoId] = { precio: p.precio, precioOriginal: p.precioOriginal, nota: p.nota, updatedAt: p.updatedAt.toISOString() };
  }

  return NextResponse.json({ precios: mapa });
}

// PUT /api/clientes/[id]/precios-equipos
// Body: { equipoId, precio, nota? }
// Crea o actualiza el precio especial del cliente para ese equipo
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { equipoId, precio, precioOriginal, nota } = await req.json();

  if (!equipoId || precio == null) {
    return NextResponse.json({ error: "equipoId y precio requeridos" }, { status: 400 });
  }

  const precioGuardado = await prisma.precioClienteEquipo.upsert({
    where: { clienteId_equipoId: { clienteId: id, equipoId } },
    create: {
      clienteId: id, equipoId,
      precio: parseFloat(precio),
      precioOriginal: precioOriginal != null ? parseFloat(precioOriginal) : null,
      nota: nota || null,
    },
    update: {
      precio: parseFloat(precio),
      // Solo actualizar precioOriginal si se manda (al editar inline no se manda, para no pisar el original)
      ...(precioOriginal != null ? { precioOriginal: parseFloat(precioOriginal) } : {}),
      nota: nota || null,
    },
  });

  return NextResponse.json({ precio: precioGuardado });
}

// DELETE /api/clientes/[id]/precios-equipos?equipoId=xxx
// Elimina el precio especial de ese equipo para el cliente
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const equipoId = new URL(req.url).searchParams.get("equipoId");

  if (!equipoId) return NextResponse.json({ error: "equipoId requerido" }, { status: 400 });

  await prisma.precioClienteEquipo.deleteMany({
    where: { clienteId: id, equipoId },
  });

  return NextResponse.json({ ok: true });
}
