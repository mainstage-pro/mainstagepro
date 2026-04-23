import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vista = searchParams.get("vista");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    parentId: null,
    estado: { notIn: ["COMPLETADA", "CANCELADA"] },
  };

  if (vista === "hoy_equipo") {
    const hoyCST = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    const manana = new Date(hoyCST);
    manana.setUTCDate(manana.getUTCDate() + 1);
    where.fecha = { lt: manana };
  } else if (vista === "proximas_equipo") {
    const hoyCST = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    const hoy = new Date(hoyCST);
    const en7 = new Date(hoyCST);
    en7.setUTCDate(en7.getUTCDate() + 7);
    where.fecha = { gte: hoy, lte: en7 };
  }

  const tareas = await prisma.tarea.findMany({
    where,
    select: {
      id: true,
      titulo: true,
      prioridad: true,
      area: true,
      estado: true,
      fecha: true,
      fechaVencimiento: true,
      proyectoTarea: { select: { id: true, nombre: true, color: true } },
      asignadoA:     { select: { id: true, name: true } },
      _count:        { select: { subtareas: true, comentarios: true } },
    },
    orderBy: [{ fecha: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tareas });
}
