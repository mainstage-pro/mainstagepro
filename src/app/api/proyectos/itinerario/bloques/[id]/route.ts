import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * Quita desde el itinerario un renglón de la Logística general del proyecto
 * (Montaje / Evento / Desmontaje). Los de proveedor se manejan en su propio panel.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const r = await prisma.proyectoBloqueTiempo.deleteMany({
    where: { id, tipo: { in: ["MONTAJE", "SOUNDCHECK", "PROGRAMA", "DESMONTAJE"] } },
  });
  if (!r.count) return NextResponse.json({ error: "Renglón no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
