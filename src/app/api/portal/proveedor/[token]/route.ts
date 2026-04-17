import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — info del proveedor + sus equipos registrados (público por token)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

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
