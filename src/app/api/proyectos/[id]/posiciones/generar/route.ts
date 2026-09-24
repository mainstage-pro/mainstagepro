import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sugerirMontaje } from "@/lib/montaje-sugerido";

/**
 * Siembra una posición sugerida por cada equipo del proyecto que todavía no
 * tenga ninguna. No toca los equipos ya desglosados.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const equipos = await prisma.proyectoEquipo.findMany({
    where: { proyectoId: id },
    include: {
      equipo: { select: { marca: true, modelo: true, descripcion: true, categoria: { select: { nombre: true } } } },
      posiciones: { select: { id: true } },
    },
  });

  const nuevas = equipos
    .filter((e) => e.posiciones.length === 0)
    .map((e) => {
      const s = sugerirMontaje(e.equipo, e.equipo.categoria?.nombre ?? null);
      return {
        proyectoEquipoId: e.id,
        cantidad: e.cantidad,
        funcion: s.funcion,
        soporte: s.soporte,
        zona: s.zona,
        esSugerencia: true,
        orden: 0,
      };
    });

  if (nuevas.length > 0) await prisma.proyectoEquipoPosicion.createMany({ data: nuevas });

  return NextResponse.json({ creadas: nuevas.length });
}
