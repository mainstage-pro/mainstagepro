import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";
import { ordenPorToken } from "@/lib/orden-produccion";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`orden:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });

  const orden = await ordenPorToken(token);
  if (!orden) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  return NextResponse.json({ orden });
}
