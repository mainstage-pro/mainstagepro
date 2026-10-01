import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, puedeVerCostosTecnicos } from "@/lib/auth";
import { BONOS_PERSONAL, CONFIG_BONOS_DEFAULT } from "@/lib/pago-personal";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const existente = await prisma.configPagoPersonal.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ bonos: existente ?? { id: "singleton", ...CONFIG_BONOS_DEFAULT } });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerCostosTecnicos(session)) {
    return NextResponse.json({ error: "Sin permiso para modificar tarifas de técnicos" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, number> = {};
  for (const b of BONOS_PERSONAL) {
    if (b.config in body) data[b.config] = Math.max(0, Number(body[b.config]) || 0);
  }

  // Cambiar el catálogo no mueve ningún puesto: los puestos guardan el monto que
  // tenía el bono cuando se les aplicó.
  const bonos = await prisma.configPagoPersonal.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...CONFIG_BONOS_DEFAULT, ...data },
    update: data,
  });
  return NextResponse.json({ bonos });
}
