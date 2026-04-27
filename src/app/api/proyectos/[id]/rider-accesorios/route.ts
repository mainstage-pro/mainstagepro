import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/proyectos/[id]/rider-accesorios
// Body: { proyectoEquipoId, nombre, categoria? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { proyectoEquipoId, nombre, categoria } = body;

  if (!proyectoEquipoId || !nombre?.trim()) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const pe = await prisma.proyectoEquipo.findFirst({
    where: { id: proyectoEquipoId, proyectoId: id },
  });
  if (!pe) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const lastAccesorio = await prisma.riderAccesorio.findFirst({
    where: { proyectoEquipoId },
    orderBy: { orden: "desc" },
  });
  const orden = (lastAccesorio?.orden ?? -1) + 1;

  const accesorio = await prisma.riderAccesorio.create({
    data: {
      proyectoEquipoId,
      nombre: nombre.trim(),
      categoria: categoria ?? null,
      orden,
      esSugerencia: false,
    },
  });

  // Sync automático a biblioteca permanente del equipo (upsert por nombre+equipoId)
  const exists = await prisma.equipoAccesorio.findFirst({
    where: { equipoId: pe.equipoId, nombre: nombre.trim() },
  });
  if (!exists) {
    await prisma.equipoAccesorio.create({
      data: { equipoId: pe.equipoId, nombre: nombre.trim(), categoria: categoria ?? null },
    });
  }

  return NextResponse.json({ accesorio });
}
