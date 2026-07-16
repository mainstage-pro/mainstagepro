import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";

const CAMPOS = ["nombre", "descripcion", "orden", "activa", "generacionAutomatica"] as const;

// Edita una subetapa (nombre, descripción, toggle generacionAutomatica). Solo ADMIN.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  for (const campo of CAMPOS) {
    if (campo in body) data[campo] = body[campo];
  }

  const subetapa = await prisma.procesoSubetapa.update({ where: { id }, data });
  return NextResponse.json({ subetapa });
}
