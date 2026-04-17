import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/equipos/[id]/disponibilidad?fecha=YYYY-MM-DD&proyectoId=XXX&cantidad=1
 * Verifica si un equipo tiene conflictos en la fecha dada.
 * proyectoId se excluye del chequeo (el proyecto actual).
 * Toma en cuenta cantidad disponible vs cantidad comprometida.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const fecha = req.nextUrl.searchParams.get("fecha");
  const proyectoIdExcluir = req.nextUrl.searchParams.get("proyectoId");
  const cantidadSolicitada = parseInt(req.nextUrl.searchParams.get("cantidad") ?? "1");

  if (!fecha) return NextResponse.json({ disponible: true, conflictos: [], cantidadDisponible: null });

  const fechaDate = new Date(fecha + "T12:00:00");
  const diaInicio = new Date(fechaDate); diaInicio.setHours(0, 0, 0, 0);
  const diaFin    = new Date(fechaDate); diaFin.setHours(23, 59, 59, 999);

  const [equipo, asignaciones] = await Promise.all([
    prisma.equipo.findUnique({
      where: { id },
      select: { id: true, descripcion: true, marca: true, cantidadTotal: true },
    }),
    prisma.proyectoEquipo.findMany({
      where: {
        equipoId: id,
        tipo: "PROPIO",
        proyecto: {
          fechaEvento: { gte: diaInicio, lte: diaFin },
          estado: { notIn: ["COMPLETADO", "CANCELADO"] },
          ...(proyectoIdExcluir ? { id: { not: proyectoIdExcluir } } : {}),
        },
      },
      include: {
        proyecto: {
          select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true, estado: true },
        },
      },
    }),
  ]);

  if (!equipo) return NextResponse.json({ disponible: true, conflictos: [], cantidadDisponible: null });

  const cantidadTotal = equipo.cantidadTotal ?? 1;
  const cantidadComprometida = asignaciones.reduce((s, a) => s + a.cantidad, 0);
  const cantidadDisponible = cantidadTotal - cantidadComprometida;
  const disponible = cantidadDisponible >= cantidadSolicitada;

  return NextResponse.json({
    disponible,
    cantidadTotal,
    cantidadComprometida,
    cantidadDisponible,
    conflictos: asignaciones.map(a => ({
      ...a.proyecto,
      cantidadUsada: a.cantidad,
    })),
  });
}
