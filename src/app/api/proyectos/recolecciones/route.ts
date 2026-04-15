import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const proyectos = await prisma.proyecto.findMany({
      where: {
        recoleccionStatus: { in: ["PENDIENTE", "EN_CAMINO", "COMPLETADA"] },
      },
      select: {
        id: true,
        numeroProyecto: true,
        nombre: true,
        estado: true,
        fechaEvento: true,
        logisticaRenta: true,
        recoleccionStatus: true,
        recoleccionNotas: true,
        recoleccionFechaReal: true,
        choferNombre: true,
        choferExterno: true,
        tipoServicio: true,
        cliente: { select: { id: true, nombre: true, empresa: true, telefono: true } },
        equipos: {
          select: {
            id: true, tipo: true, cantidad: true,
            equipo: { select: { descripcion: true, marca: true, categoria: { select: { nombre: true } } } },
          },
        },
        trato: { select: { ideasReferencias: true, tipoServicio: true } },
      },
      orderBy: { fechaEvento: "asc" },
    });
    return NextResponse.json({ proyectos });
  } catch (e) {
    console.error("[/api/proyectos/recolecciones]", e);
    return NextResponse.json({ error: String(e), proyectos: [] }, { status: 500 });
  }
}
