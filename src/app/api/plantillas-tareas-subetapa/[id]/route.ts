import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensurePlantillasTareaSubetapa } from "@/lib/plantillas-tareas-subetapa-db";

// PATCH /api/plantillas-tareas-subetapa/[id]  (solo ADMIN)
// Edita título/área/prioridad/offset, o reordena con { mover: "arriba"|"abajo" }.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  await ensurePlantillasTareaSubetapa();

  const { id } = await params;
  const body = await req.json();

  const actual = await prisma.plantillaTareaSubetapa.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Reordenar: intercambia `orden` con el vecino contiguo de la misma subetapa.
  if (body?.mover === "arriba" || body?.mover === "abajo") {
    const arriba = body.mover === "arriba";
    const vecino = await prisma.plantillaTareaSubetapa.findFirst({
      where: {
        etapaInterna: actual.etapaInterna,
        orden: arriba ? { lt: actual.orden } : { gt: actual.orden },
      },
      orderBy: { orden: arriba ? "desc" : "asc" },
    });
    if (vecino) {
      await prisma.$transaction([
        prisma.plantillaTareaSubetapa.update({ where: { id: actual.id }, data: { orden: vecino.orden } }),
        prisma.plantillaTareaSubetapa.update({ where: { id: vecino.id }, data: { orden: actual.orden } }),
      ]);
    }
    return NextResponse.json({ ok: true });
  }

  const data: { titulo?: string; area?: string; prioridad?: string; offsetDias?: number | null } = {};
  if (typeof body?.titulo === "string" && body.titulo.trim()) data.titulo = body.titulo.trim();
  if (typeof body?.area === "string" && body.area.trim()) data.area = body.area.trim();
  if (typeof body?.prioridad === "string" && body.prioridad.trim()) data.prioridad = body.prioridad.trim();
  if ("offsetDias" in body) data.offsetDias = typeof body.offsetDias === "number" ? body.offsetDias : null;

  const item = await prisma.plantillaTareaSubetapa.update({ where: { id }, data });
  return NextResponse.json({ item });
}

// DELETE /api/plantillas-tareas-subetapa/[id]  (solo ADMIN)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  await ensurePlantillasTareaSubetapa();

  const { id } = await params;
  await prisma.plantillaTareaSubetapa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
