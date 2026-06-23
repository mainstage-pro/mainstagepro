import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const clientes = await prisma.cliente.findMany({
      where: { tipoCliente: "POR_DESCUBRIR" },
      select: {
        id: true,
        nombre: true,
        empresa: true,
        telefono: true,
        correo: true,
        tipoCliente: true,
        clasificacion: true,
        esProspecto: true,
        createdAt: true,
        _count: {
          select: { prospecciones: true },
        },
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json({ clientes, total: clientes.length });
  } catch (error) {
    console.error("[GET /api/clientes/por-descubrir]", error);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}
