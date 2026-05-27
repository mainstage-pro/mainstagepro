import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/plan-trabajo/instancias?fecha=2026-05-27&vista=dia|semana|todas
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fechaParam = searchParams.get("fecha");
  const vista = searchParams.get("vista") ?? "dia";
  const areaFiltro = searchParams.get("area"); // filtro para vista de dirección
  const userFiltro = searchParams.get("userId"); // filtro para vista de dirección

  const tz = "America/Mexico_City";
  const hoy = fechaParam
    ? new Date(fechaParam + "T12:00:00.000-06:00")
    : new Date();

  const dateStr = hoy.toLocaleDateString("en-CA", { timeZone: tz });

  let fechaInicio: Date;
  let fechaFin: Date;

  if (vista === "semana") {
    const dow = hoy.getDay(); // 0=dom
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((dow + 6) % 7));
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    const lunesStr = lunes.toLocaleDateString("en-CA", { timeZone: tz });
    const domingoStr = domingo.toLocaleDateString("en-CA", { timeZone: tz });
    fechaInicio = new Date(`${lunesStr}T00:00:00.000-06:00`);
    fechaFin    = new Date(`${domingoStr}T23:59:59.999-06:00`);
  } else if (vista === "todas") {
    fechaInicio = new Date("2020-01-01");
    fechaFin    = new Date("2099-12-31");
  } else {
    fechaInicio = new Date(`${dateStr}T00:00:00.000-06:00`);
    fechaFin    = new Date(`${dateStr}T23:59:59.999-06:00`);
  }

  const isAdmin = session.role === "ADMIN" || session.role === "DIRECTOR";

  // Si es admin y viene un filtro de usuario, muestra ese usuario; si no, muestra todo
  const responsableWhere =
    isAdmin && !userFiltro ? undefined :
    isAdmin && userFiltro ? userFiltro :
    session.id;

  const instancias = await prisma.pTTareaInstancia.findMany({
    where: {
      ...(responsableWhere ? { responsableId: responsableWhere } : {}),
      fechaVencimiento: { gte: fechaInicio, lte: fechaFin },
      ...(areaFiltro
        ? { template: { areaId: areaFiltro } }
        : {}),
    },
    include: {
      template: {
        include: {
          area: true,
          subArea: true,
        },
      },
      responsable: { select: { id: true, name: true, email: true } },
      subtareasInstancia: {
        include: { subtarea: true },
        orderBy: { subtarea: { orden: "asc" } },
      },
      comentarios: {
        include: { autor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
        take: 20,
      },
    },
    orderBy: { fechaVencimiento: "asc" },
  });

  return NextResponse.json({ instancias, fecha: dateStr });
}
