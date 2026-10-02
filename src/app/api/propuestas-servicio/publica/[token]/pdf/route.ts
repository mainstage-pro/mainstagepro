// El mismo PDF que descarga el vendedor, servido por el token del cliente.
//
// Se regenera en cada visita, así que el enlace siempre refleja la propuesta
// como está hoy: no hay una copia vieja circulando por correo.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";
import { generarPropuestaServicio, respuestaPdf } from "@/lib/pdf-propuesta";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`propuesta:pdf:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) {
    return NextResponse.json({ error: "Link no válido o expirado" }, { status: 410 });
  }

  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { aprobacionToken: token },
    select: { id: true, activo: true },
  });
  if (!propuesta?.activo) return NextResponse.json({ error: "Link no válido o expirado" }, { status: 404 });

  const pdf = await generarPropuestaServicio(propuesta.id);
  if (!pdf) return NextResponse.json({ error: "Link no válido o expirado" }, { status: 404 });

  return respuestaPdf(pdf, req.nextUrl.searchParams.get("inline") === "1");
}
