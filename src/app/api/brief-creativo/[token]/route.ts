import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTokenExpired } from "@/lib/tokens";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Portal público del brief creativo. Sin auth: el token es la llave.
// El `select` es a mano y a propósito — nada de costos, notas internas ni
// datos de la propuesta sale de aquí. Solo lo que el cliente necesita para
// llenar las 5 secciones / 16 puntos del brief técnico.
const SELECT_PUBLICO = {
  id: true,
  numero: true,
  nombre: true,
  briefDetalle: true,
  formEstado: true,
  fechaEntrega: true,
  cliente: { select: { nombre: true, empresa: true } },
  artista: { select: { nombre: true, logoUrl: true } },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`brief-creativo:get:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) {
    return NextResponse.json({ error: "Link no válido o expirado" }, { status: 410 });
  }

  const proyecto = await prisma.proyectoCreativo.findUnique({
    where: { formToken: token },
    select: SELECT_PUBLICO,
  });
  if (!proyecto) return NextResponse.json({ error: "Link no válido o expirado" }, { status: 404 });

  return NextResponse.json({ proyecto });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`brief-creativo:post:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Link expirado" }, { status: 410 });

  const body = await req.json().catch(() => ({}));
  const briefDetalle = typeof body.briefDetalle === "string" ? body.briefDetalle : null;
  const esFinal = Boolean(body.final);

  const proyecto = await prisma.proyectoCreativo.findUnique({
    where: { formToken: token },
    select: { id: true },
  });
  if (!proyecto) return NextResponse.json({ error: "Link no válido" }, { status: 404 });

  await prisma.proyectoCreativo.update({
    where: { id: proyecto.id },
    data: {
      ...(briefDetalle !== null && { briefDetalle }),
      formEstado: esFinal ? "COMPLETADO" : "PENDIENTE",
    },
  });

  return NextResponse.json({ ok: true, final: esFinal });
}
