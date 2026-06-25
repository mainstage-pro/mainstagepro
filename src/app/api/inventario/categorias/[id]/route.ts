import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nombre, orden } = body;

  const data: { nombre?: string; orden?: number } = {};
  if (nombre !== undefined) data.nombre = nombre.trim();
  if (orden !== undefined) data.orden = Number(orden);

  try {
    const categoria = await prisma.categoriaEquipo.update({ where: { id }, data });
    return NextResponse.json({ categoria });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la categoría" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Verificar que no tenga equipos activos
  const count = await prisma.equipo.count({ where: { categoriaId: id, activo: true } });
  if (count > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${count} equipo(s) activo(s) en esta categoría` },
      { status: 409 }
    );
  }

  try {
    await prisma.categoriaEquipo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar la categoría" }, { status: 400 });
  }
}
