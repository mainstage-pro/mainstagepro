import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensurePlantillasTareaEvento } from "@/lib/plantillas-tareas-evento-db";

// PATCH /api/plantillas-tareas-evento/[id]  (solo ADMIN)
// Edita título/grupo/área, o reordena dentro de su grupo con { mover: "arriba"|"abajo" }.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  await ensurePlantillasTareaEvento();

  const { id } = await params;
  const body = await req.json();

  const actual = await prisma.plantillaTareaEvento.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Reordenar: intercambia `orden` con el vecino contiguo del mismo grupo.
  if (body?.mover === "arriba" || body?.mover === "abajo") {
    const arriba = body.mover === "arriba";
    const vecino = await prisma.plantillaTareaEvento.findFirst({
      where: {
        tipoServicio: actual.tipoServicio,
        grupo: actual.grupo,
        orden: arriba ? { lt: actual.orden } : { gt: actual.orden },
      },
      orderBy: { orden: arriba ? "desc" : "asc" },
    });
    if (vecino) {
      await prisma.$transaction([
        prisma.plantillaTareaEvento.update({ where: { id: actual.id }, data: { orden: vecino.orden } }),
        prisma.plantillaTareaEvento.update({ where: { id: vecino.id }, data: { orden: actual.orden } }),
      ]);
    }
    return NextResponse.json({ ok: true });
  }

  const data: { titulo?: string; grupo?: string; area?: string } = {};
  if (typeof body?.titulo === "string" && body.titulo.trim()) data.titulo = body.titulo.trim();
  if (typeof body?.grupo === "string" && body.grupo.trim()) data.grupo = body.grupo.trim();
  if (typeof body?.area === "string" && body.area.trim()) data.area = body.area.trim();

  const item = await prisma.plantillaTareaEvento.update({ where: { id }, data });
  return NextResponse.json({ item });
}

// DELETE /api/plantillas-tareas-evento/[id]  (solo ADMIN)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  await ensurePlantillasTareaEvento();

  const { id } = await params;
  await prisma.plantillaTareaEvento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
