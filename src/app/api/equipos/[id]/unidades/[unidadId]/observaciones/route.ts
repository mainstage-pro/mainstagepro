import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

let tablaEnsured = false;
export async function ensureObservacionesTable() {
  if (tablaEnsured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "unidad_observaciones" (
      "id" TEXT PRIMARY KEY,
      "unidadId" TEXT NOT NULL REFERENCES "equipo_unidades"("id") ON DELETE CASCADE,
      "contenido" TEXT NOT NULL,
      "creadoPorId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  tablaEnsured = true;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ unidadId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureObservacionesTable();
  const { unidadId } = await params;
  const observaciones = await prisma.unidadObservacion.findMany({
    where: { unidadId },
    include: { creadoPor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ observaciones });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ unidadId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureObservacionesTable();
  const { unidadId } = await params;
  const { contenido } = await req.json();
  if (!contenido?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 });

  const observacion = await prisma.unidadObservacion.create({
    data: { unidadId, contenido: contenido.trim(), creadoPorId: session.id },
    include: { creadoPor: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ observacion });
}
