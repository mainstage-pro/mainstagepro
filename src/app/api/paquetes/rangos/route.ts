import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ensurePaquetesTables, getRangosPersonas } from "@/lib/paquetes";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePaquetesTables();
  const rangos = await getRangosPersonas();
  return NextResponse.json({ rangos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePaquetesTables();

  const body = await req.json();
  const label = String(body.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "El rango no puede estar vacío" }, { status: 400 });

  const existente = await prisma.paqueteRango.findUnique({ where: { label } });
  if (existente) {
    if (existente.activo) return NextResponse.json({ error: "Ese rango ya existe" }, { status: 409 });
    // Reactivar uno que estaba desactivado.
    const rango = await prisma.paqueteRango.update({ where: { label }, data: { activo: true } });
    return NextResponse.json({ rango }, { status: 200 });
  }

  const max = await prisma.paqueteRango.aggregate({ _max: { orden: true } });
  const rango = await prisma.paqueteRango.create({
    data: { label, orden: (max._max.orden ?? -1) + 1 },
  });
  await logActividad(session.id, "CREAR", "PaqueteRango", rango.id, `Agregó el rango de personas "${label}"`);
  return NextResponse.json({ rango }, { status: 201 });
}
