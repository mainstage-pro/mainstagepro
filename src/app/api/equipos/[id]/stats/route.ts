import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const [equipo, proyectoEquipos, mantAgg] = await Promise.all([
    prisma.equipo.findUnique({ where: { id }, select: { precioRenta: true } }),
    prisma.proyectoEquipo.findMany({
      where: { equipoId: id },
      select: { proyectoId: true, cantidad: true, dias: true },
    }),
    prisma.mantenimientoEquipo.aggregate({
      where: { equipoId: id },
      _sum: { costoReparacion: true },
    }),
  ]);

  const precioRenta = equipo?.precioRenta ?? 0;
  const vecesRentada = new Set(proyectoEquipos.map(pe => pe.proyectoId)).size;
  const diasRentados = proyectoEquipos.reduce((s, pe) => s + pe.dias, 0);
  const revenue = proyectoEquipos.reduce((s, pe) => s + precioRenta * pe.cantidad * pe.dias, 0);
  const costoMantenimiento = mantAgg._sum.costoReparacion ?? 0;

  return NextResponse.json({ vecesRentada, diasRentados, revenue, costoMantenimiento });
}
