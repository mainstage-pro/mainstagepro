import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/proyectos/[id]/rider-accesorios
// Body: { proyectoEquipoId, nombre, categoria?, cantidad?, origen?, accesorioId? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { proyectoEquipoId, nombre, categoria, cantidad = 1, guardarEnBiblioteca = true, origen, accesorioId } = body;

  if (!proyectoEquipoId || !nombre?.trim()) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  const origenValido = ["manual", "equipo", "sistema", "producto"].includes(origen) ? origen : "manual";

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
      cantidad: Math.max(1, parseInt(cantidad) || 1),
      categoria: categoria ?? null,
      orden,
      esSugerencia: false,
      origen: origenValido,
      accesorioId: typeof accesorioId === "string" && accesorioId ? accesorioId : null,
    },
  });

  // Sync a biblioteca permanente del equipo solo si el usuario lo eligió
  if (guardarEnBiblioteca) {
    const exists = await prisma.equipoAccesorio.findFirst({
      where: { equipoId: pe.equipoId, nombre: nombre.trim() },
    });
    if (!exists) {
      await prisma.equipoAccesorio.create({
        data: { equipoId: pe.equipoId, nombre: nombre.trim(), categoria: categoria ?? null },
      });
    }
  }

  return NextResponse.json({ accesorio });
}

// DELETE /api/proyectos/[id]/rider-accesorios?accesorioId=XXX
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: proyectoId } = await params;
  const { searchParams } = new URL(req.url);
  const accesorioId = searchParams.get("accesorioId");
  if (!accesorioId) return NextResponse.json({ error: "accesorioId requerido" }, { status: 400 });
  const accesorio = await prisma.riderAccesorio.findFirst({
    where: { id: accesorioId, proyectoEquipo: { proyectoId } },
  });
  if (!accesorio) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await prisma.riderAccesorio.delete({ where: { id: accesorioId } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/proyectos/[id]/rider-accesorios
// Body: { accesorioId, completado?, cantidad?, nombre? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: proyectoId } = await params;
  const body = await req.json();
  const { accesorioId, completado, cantidad, nombre } = body;
  if (!accesorioId) return NextResponse.json({ error: "accesorioId requerido" }, { status: 400 });
  const accesorio = await prisma.riderAccesorio.findFirst({
    where: { id: accesorioId, proyectoEquipo: { proyectoId } },
  });
  if (!accesorio) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (completado !== undefined) data.completado = completado;
  if (cantidad !== undefined) data.cantidad = Math.max(1, parseInt(String(cantidad)) || 1);
  if (nombre !== undefined) data.nombre = String(nombre).trim();
  const updated = await prisma.riderAccesorio.update({ where: { id: accesorioId }, data });
  return NextResponse.json({ accesorio: updated });
}
