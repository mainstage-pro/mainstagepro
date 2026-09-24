import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type PosicionInput = {
  cantidad?: number;
  funcion?: string | null;
  soporte?: string | null;
  zona?: string | null;
  alturaM?: number | string | null;
  notas?: string | null;
};

/** Reemplaza todas las posiciones de un equipo del proyecto. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ equipoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { equipoId } = await params;
  const body = await req.json();
  const entrada: PosicionInput[] = Array.isArray(body.posiciones) ? body.posiciones : [];

  const posiciones = entrada.map((p, i) => ({
    proyectoEquipoId: equipoId,
    cantidad: Math.max(1, Number(p.cantidad) || 1),
    funcion: p.funcion || null,
    soporte: p.soporte || null,
    zona: p.zona || null,
    alturaM: p.alturaM != null && p.alturaM !== "" ? Number(p.alturaM) : null,
    notas: p.notas || null,
    esSugerencia: false,
    orden: i,
  }));

  await prisma.$transaction([
    prisma.proyectoEquipoPosicion.deleteMany({ where: { proyectoEquipoId: equipoId } }),
    ...(posiciones.length > 0 ? [prisma.proyectoEquipoPosicion.createMany({ data: posiciones })] : []),
  ]);

  const items = await prisma.proyectoEquipoPosicion.findMany({
    where: { proyectoEquipoId: equipoId },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json({ posiciones: items });
}
