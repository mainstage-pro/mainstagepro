import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createExpiringToken } from "@/lib/tokens";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const acuses = await prisma.politicaAcuse.findMany({
    where: { politicaId: id },
    orderBy: [{ aceptado: "asc" }, { personalNombre: "asc" }],
  });
  return NextResponse.json({ acuses });
}

// Asigna la política a un conjunto de personas: crea (si no existe) un acuse
// pendiente por persona para la versión publicada vigente, con su token público.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const politica = await prisma.politica.findUnique({ where: { id } });
    if (!politica) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    if (politica.estado !== "PUBLICADA")
      return NextResponse.json({ error: "Publica la política antes de solicitar acuse" }, { status: 400 });

    const b = await req.json();
    const ids: string[] = Array.isArray(b.personalIds) ? b.personalIds : [];
    if (!ids.length) return NextResponse.json({ error: "Selecciona al menos una persona" }, { status: 400 });

    const personas = await prisma.personalInterno.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true },
    });
    // No duplicar acuses pendientes de la misma versión para la misma persona.
    const existentes = await prisma.politicaAcuse.findMany({
      where: { politicaId: id, version: politica.version, personalId: { in: ids } },
      select: { personalId: true },
    });
    const yaTiene = new Set(existentes.map((e) => e.personalId));
    const nuevos = personas.filter((p) => !yaTiene.has(p.id));
    if (nuevos.length) {
      await prisma.politicaAcuse.createMany({
        data: nuevos.map((p) => ({
          politicaId: id,
          version: politica.version,
          personalId: p.id,
          personalNombre: p.nombre,
          token: createExpiringToken(3650),
        })),
      });
    }
    return NextResponse.json({ creados: nuevos.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/politicas/acuse POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
