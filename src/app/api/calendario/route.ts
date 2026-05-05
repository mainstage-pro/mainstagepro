import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const mes = sp.get("mes"); // "2026-04"

  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  if (mes) {
    const [y, m] = mes.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m)) { year = y; month = m - 1; }
  }

  const inicio = new Date(year, month, 1);
  const fin    = new Date(year, month + 1, 0, 23, 59, 59);

  const proyectos = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: inicio, lte: fin }, estado: { not: "CANCELADO" } },
    include: { cliente: { select: { nombre: true } } },
    orderBy: { fechaEvento: "asc" },
  });

  const eventos = proyectos.map(p => ({
    id: p.id,
    dia: new Date(p.fechaEvento.toISOString().substring(0, 10) + "T12:00:00Z").getUTCDate(),
    titulo: p.nombre,
    subtitulo: p.cliente.nombre,
    estado: p.estado,
    url: `/proyectos/${p.id}`,
    tipoEvento: p.tipoEvento,
    tipoServicio: p.tipoServicio,
    lugarEvento: p.lugarEvento,
    horaInicioEvento: p.horaInicioEvento,
  }));

  return NextResponse.json({ eventos });
}
