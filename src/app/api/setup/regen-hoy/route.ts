import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarInstanciasDelDia } from "@/lib/plan-trabajo/motor";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== "msp-regen-2026") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tz = "America/Mexico_City";
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const inicioHoy = new Date(`${dateStr}T00:00:00.000-06:00`);
  const finHoy    = new Date(`${dateStr}T23:59:59.999-06:00`);

  // Borrar TODAS las instancias de hoy
  const deleted = await prisma.pTTareaInstancia.deleteMany({
    where: { fechaVencimiento: { gte: inicioHoy, lte: finHoy } },
  });

  // Regenerar con el motor corregido (todos los templates)
  const resultado = await generarInstanciasDelDia(new Date());

  return NextResponse.json({ ok: true, eliminadas: deleted.count, ...resultado });
}
