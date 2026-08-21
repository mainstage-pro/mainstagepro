import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generarFechasRecurrentes } from "@/lib/recurrencia-finanzas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  
  const { id } = await params;
  const { estado } = await req.json(); // ACTIVO | PAUSADO | FINALIZADO

  const serie = await prisma.serieRecurrente.findUnique({ where: { id } });
  if (!serie) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.serieRecurrente.update({ where: { id }, data: { estado } });

    if (estado === "FINALIZADO" || estado === "PAUSADO") {
      // Eliminar futuras pendientes
      await tx.cuentaCobrar.deleteMany({ where: { serieRecurrenteId: id, estado: "PENDIENTE" } });
      await tx.cuentaPagar.deleteMany({ where: { serieRecurrenteId: id, estado: "PENDIENTE" } });
    } else if (estado === "ACTIVO" && serie.estado !== "ACTIVO") {
      // Reactivar: Generar nuevas a partir de hoy o de la ultima fecha
      // Simplificado: esto se puede detallar luego
    }
  });

  return NextResponse.json({ ok: true });
}
