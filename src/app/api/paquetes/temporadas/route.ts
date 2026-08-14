import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensurePlantillasTemporada, PAQUETE_INCLUDE } from "@/lib/paquetes";

// Siembra una plantilla en blanco por cada temporada del calendario comercial
// (idempotente) y devuelve todos los paquetes activos para la sección "Por temporada".
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const temporadas = await ensurePlantillasTemporada();

  const paquetes = await prisma.paquete.findMany({
    where: { activo: true, temporada: { not: null } },
    include: PAQUETE_INCLUDE,
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ paquetes, temporadas });
}
