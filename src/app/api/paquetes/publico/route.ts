import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePaquetesTables, PAQUETE_INCLUDE } from "@/lib/paquetes";

// Listado público de paquetes activos — usado por el selector del descubrimiento
// (incluye formularios públicos por token) y el cotizador para el desglose.
export async function GET(req: NextRequest) {
  await ensurePaquetesTables();

  const tipoEvento = req.nextUrl.searchParams.get("tipoEvento");

  const paquetes = await prisma.paquete.findMany({
    where: { activo: true, ...(tipoEvento ? { tipoEvento } : {}) },
    include: PAQUETE_INCLUDE,
    orderBy: [{ tipoEvento: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ paquetes });
}
