import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";

// GET: datos de la cotización para mostrar en la página pública
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`aprobacion:get:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Link no válido o expirado" }, { status: 410 });

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
  const ip = getClientIp(req);
  if (!rateLimit(`aprobacion:post:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Link expirado" }, { status: 410 });

  const body = await req.json().catch(() => ({}));
  const nombre = (body.nombre as string | undefined)?.trim() || null;
  if (!nombre || nombre.length < 2 || nombre.length > 100) {
    return NextResponse.json({ error: "Nombre requerido (2–100 caracteres)" }, { status: 400 });
  }

  const cot = await prisma.cotizacion.findUnique({
    where: { aprobacionToken: token },
    select: { id: true, estado: true, aprobacionFecha: true, tratoId: true },
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

  if (cot.tratoId) {
    await prisma.trato.update({
      where: { id: cot.tratoId },
      data: { etapa: "VENTA_CERRADA", etapaCambiadaEn: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
