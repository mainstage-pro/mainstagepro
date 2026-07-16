import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";

// Reordena los pasos de una subetapa. Recibe { orden: [pasoId, ...] }.
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();
  const { orden } = await req.json();
  if (!Array.isArray(orden)) return NextResponse.json({ error: "orden requerido" }, { status: 400 });

  await prisma.$transaction(
    orden.map((id: string, i: number) =>
      prisma.procesoPaso.update({ where: { id }, data: { orden: i + 1 } })
    )
  );

  return NextResponse.json({ ok: true });
}
