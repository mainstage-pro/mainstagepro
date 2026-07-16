import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";
import { CATEGORIAS_REGLA } from "@/lib/proceso/valores";

// Crea una regla nueva en una categoría.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();
  const body = await req.json();
  const { texto, categoria } = body;

  if (!texto || !CATEGORIAS_REGLA.includes(categoria)) {
    return NextResponse.json({ error: "texto y categoria válida requeridos" }, { status: 400 });
  }

  const ultimo = await prisma.procesoRegla.findFirst({
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const regla = await prisma.procesoRegla.create({
    data: { texto, categoria, orden: (ultimo?.orden ?? 0) + 1 },
  });

  return NextResponse.json({ regla });
}
