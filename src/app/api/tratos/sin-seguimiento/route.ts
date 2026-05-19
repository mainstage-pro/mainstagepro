import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Tratos en Descubrimiento u Oportunidad sin seguimiento completado en los últimos 7 días
// y sin cambio de etapa en los últimos 7 días
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const tratos = await prisma.trato.findMany({
    where: {
      etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] },
      tipoProspecto: "ACTIVO",
      OR: [
        { etapaCambiadaEn: null, createdAt: { lte: hace7dias } },
        { etapaCambiadaEn: { lte: hace7dias } },
      ],
    },
    select: {
      id: true,
      etapa: true,
      nombreEvento: true,
      createdAt: true,
      etapaCambiadaEn: true,
      cliente: { select: { nombre: true, empresa: true } },
      seguimientos: {
        where: { completado: true },
        orderBy: { fechaCompletado: "desc" },
        take: 1,
        select: { fechaCompletado: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Filtrar los que no tienen seguimiento completado en los últimos 7 días
  const sinMovimiento = tratos.filter(t => {
    const ultimo = t.seguimientos[0]?.fechaCompletado;
    if (!ultimo) return true; // nunca ha tenido seguimiento completado
    return new Date(ultimo) <= hace7dias;
  });

  return NextResponse.json({ tratos: sinMovimiento });
}
