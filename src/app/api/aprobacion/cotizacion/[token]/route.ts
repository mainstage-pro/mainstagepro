import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: datos de la cotización para mostrar en la página pública
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const cot = await prisma.cotizacion.findUnique({
    where: { aprobacionToken: token },
    include: {
      cliente: { select: { nombre: true, empresa: true } },
      creadaPor: { select: { name: true } },
      lineas: { orderBy: { orden: "asc" } },
    },
  });

  if (!cot) return NextResponse.json({ error: "Link no válido o expirado" }, { status: 404 });

  return NextResponse.json({ cotizacion: cot });
}

// POST: el cliente aprueba
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const nombre = (body.nombre as string | undefined)?.trim() || null;

  const cot = await prisma.cotizacion.findUnique({
    where: { aprobacionToken: token },
    select: { id: true, estado: true, aprobacionFecha: true },
  });

  if (!cot) return NextResponse.json({ error: "Link no válido" }, { status: 404 });
  if (cot.estado === "APROBADA") return NextResponse.json({ ok: true, yaAprobada: true });

  await prisma.cotizacion.update({
    where: { id: cot.id },
    data: {
      estado: "APROBADA",
      aprobacionFecha: new Date(),
      aprobacionNombre: nombre,
    },
  });

  return NextResponse.json({ ok: true });
}
