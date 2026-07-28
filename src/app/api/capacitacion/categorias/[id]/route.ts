import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeEditarCapacitacion } from "@/lib/capacitacion";

// PATCH /api/capacitacion/categorias/[id] — Editar área (nombre, color, ícono, orden).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEditarCapacitacion(session)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await params;
  const { nombre, color, icono, orden, activo } = await req.json();

  const data: Record<string, unknown> = {};
  if (nombre !== undefined) data.nombre = nombre;
  if (color !== undefined) data.color = color;
  if (icono !== undefined) data.icono = icono;
  if (orden !== undefined) data.orden = orden;
  if (activo !== undefined) data.activo = activo;

  const cat = await prisma.categoriaCapacitacion.update({ where: { id }, data });
  return NextResponse.json(cat);
}

// DELETE /api/capacitacion/categorias/[id] — Desactiva el área (soft). Las sesiones quedan sin área.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEditarCapacitacion(session)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await params;
  await prisma.categoriaCapacitacion.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
