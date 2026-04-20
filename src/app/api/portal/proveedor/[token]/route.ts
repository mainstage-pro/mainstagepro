import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";

// GET — info del proveedor + sus equipos registrados (público por token)
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`proveedor-portal:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });

  const proveedor = await prisma.proveedor.findUnique({
    where: { portalToken: token },
    select: {
      id: true,
      nombre: true,
      empresa: true,
      giro: true,
      correo: true,
      equiposPortal: {
        orderBy: [{ categoria: "asc" }, { descripcion: "asc" }],
      },
    },
  });

  if (!proveedor) return NextResponse.json({ error: "Link inválido o expirado" }, { status: 404 });
  return NextResponse.json({ proveedor });
}
