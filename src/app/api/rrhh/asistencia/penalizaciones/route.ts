import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recalcularMes } from "@/lib/asistencia-penalizaciones";

// GET: incidencias AUTO (penalizaciones de asistencia) del mes.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const mes = new URL(req.url).searchParams.get("mes");
  if (!mes) return NextResponse.json({ error: "Falta el mes" }, { status: 400 });
  const incidencias = await prisma.incidencia.findMany({
    where: { origen: "AUTO", periodoNomina: mes },
    orderBy: { estado: "asc" },
    include: { personal: { select: { id: true, nombre: true, puesto: true } } },
  });
  return NextResponse.json({ incidencias });
}

// POST: recalcula el mes y regenera las propuestas pendientes.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { mes } = await req.json();
  if (!mes) return NextResponse.json({ error: "Falta el mes" }, { status: 400 });
  const resultado = await recalcularMes(mes);
  return NextResponse.json(resultado);
}
