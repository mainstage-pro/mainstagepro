import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/admin/migrate-cxc-fechas
// Body: { fecha: "YYYY-MM-DD" }  — mueve todas las CxC pendientes a esa fecha
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { fecha } = await req.json();
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "fecha requerida en formato YYYY-MM-DD" }, { status: 400 });
  }

  const nuevaFecha = new Date(fecha);

  const result = await prisma.cuentaCobrar.updateMany({
    where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    data: { fechaCompromiso: nuevaFecha },
  });

  return NextResponse.json({ actualizadas: result.count, nuevaFecha: fecha });
}
