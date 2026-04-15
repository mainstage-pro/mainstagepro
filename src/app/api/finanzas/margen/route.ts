import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proyectos = await prisma.proyecto.findMany({
    where: { estado: { in: ["EN_CURSO", "COMPLETADO"] } },
    select: {
      id: true, nombre: true, numeroProyecto: true, fechaEvento: true, estado: true,
      cuentasCobrar: { select: { monto: true, montoCobrado: true, estado: true } },
      cuentasPagar: { select: { monto: true, estado: true } },
    },
    orderBy: { fechaEvento: "desc" },
    take: 30,
  });

  const result = proyectos.map(p => {
    const ingresos = p.cuentasCobrar.reduce((s, c) => s + c.monto, 0);
    const cobrado  = p.cuentasCobrar.reduce((s, c) => s + (c.montoCobrado ?? 0), 0);
    const egresos  = p.cuentasPagar.reduce((s, c) => s + c.monto, 0);
    const margen   = ingresos - egresos;
    const margenPct = ingresos > 0 ? Math.round((margen / ingresos) * 100) : null;
    return { id: p.id, nombre: p.nombre, numero: p.numeroProyecto, fecha: p.fechaEvento, estado: p.estado, ingresos, cobrado, egresos, margen, margenPct };
  });

  return NextResponse.json({ proyectos: result });
}
