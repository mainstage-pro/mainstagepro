import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/equipos/[id]/accesorios
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const accesorios = await prisma.equipoAccesorio.findMany({
    where: { equipoId: id },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });
  return NextResponse.json({ accesorios });
}

// POST /api/equipos/[id]/accesorios
// Body: { nombre, categoria? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nombre, categoria } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const exists = await prisma.equipoAccesorio.findFirst({
    where: { equipoId: id, nombre: nombre.trim() },
  });
  if (exists) return NextResponse.json({ accesorio: exists });

  // Crea el accesorio de primera clase y la fila puente en una transacción.
  const cat = await prisma.accesorio.create({
    data: { nombre: nombre.trim(), tipoConteo: "default", estado: "activo", activo: true },
    select: { id: true },
  });
  const accesorio = await prisma.equipoAccesorio.create({
    data: { equipoId: id, nombre: nombre.trim(), categoria: categoria ?? null, accesorioId: cat.id },
  });
  return NextResponse.json({ accesorio });
}
