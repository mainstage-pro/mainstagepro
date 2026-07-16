import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";

// Crea un paso nuevo al final de una subetapa.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();
  const body = await req.json();
  const { subetapaId } = body;
  if (!subetapaId) return NextResponse.json({ error: "subetapaId requerido" }, { status: 400 });

  const ultimo = await prisma.procesoPaso.findFirst({
    where: { subetapaId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const paso = await prisma.procesoPaso.create({
    data: {
      subetapaId,
      orden: (ultimo?.orden ?? 0) + 1,
      dia: body.dia ?? 0,
      diaUrgente: body.diaUrgente ?? null,
      titulo: body.titulo ?? "Nuevo paso",
      objetivo: body.objetivo ?? "",
      guion: body.guion ?? "",
      canal: body.canal ?? "WHATSAPP",
      herramienta: body.herramienta ?? null,
      avanzaSubetapaA: body.avanzaSubetapaA ?? null,
    },
  });

  return NextResponse.json({ paso });
}
