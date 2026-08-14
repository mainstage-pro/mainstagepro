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
  const { nombre, orden, descripcionInterna, descMusical, descSocial, descEmpresarial, disciplina } = body;

  const data: { nombre?: string; orden?: number; disciplina?: string | null; descripcionInterna?: string | null; descMusical?: string | null; descSocial?: string | null; descEmpresarial?: string | null } = {};
  if (nombre !== undefined) data.nombre = nombre.trim();
  if (orden !== undefined) data.orden = Number(orden);
  if (disciplina !== undefined) data.disciplina = disciplina || null;
  if (descripcionInterna !== undefined) data.descripcionInterna = descripcionInterna || null;
  if (descMusical !== undefined) data.descMusical = descMusical || null;
  if (descSocial !== undefined) data.descSocial = descSocial || null;
  if (descEmpresarial !== undefined) data.descEmpresarial = descEmpresarial || null;

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
