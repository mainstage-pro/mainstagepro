import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/capacitacion/[id] — Single session with full version history
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const sesion = await prisma.sesionCapacitacion.findUnique({
    where: { id },
    include: {
      versiones: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          generadaPor: true,
          generadaEn: true,
          notasSnapshot: true,
          puntosSnapshot: true,
          // htmlContent is NOT included here — loaded lazily when viewing
        },
      },
    },
  });

  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  return NextResponse.json(sesion);
}

// PATCH /api/capacitacion/[id] — Update session fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { notas, puntosEditados, estado, fechaProgramada, duracion, impartidor } = body;

  // Fetch current state to determine auto-state promotion
  const current = await prisma.sesionCapacitacion.findUnique({
    where: { id },
    select: { estado: true },
  });
  if (!current) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  if (notas !== undefined) updateData.notas = notas;
  if (puntosEditados !== undefined) updateData.puntosEditados = puntosEditados;
  if (estado !== undefined) updateData.estado = estado;
  if (fechaProgramada !== undefined) updateData.fechaProgramada = fechaProgramada ? new Date(fechaProgramada) : null;
  if (duracion !== undefined) updateData.duracion = duracion;
  if (impartidor !== undefined) updateData.impartidor = impartidor;

  // Auto-promote: pendiente → en-preparacion when notes or points are updated
  if (current.estado === "pendiente" && (notas !== undefined || puntosEditados !== undefined)) {
    updateData.estado = "en-preparacion";
  }

  const updated = await prisma.sesionCapacitacion.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
