import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ urgentes: 0 });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);

  const [vencidos, hoyCount, leadsVencidos] = await Promise.all([
    prisma.seguimiento.count({ where: { completado: false, fechaProgramada: { lt: hoy } } }),
    prisma.seguimiento.count({ where: { completado: false, fechaProgramada: { gte: hoy, lt: manana } } }),
    prisma.trato.count({
      where: {
        tipoProspecto: 'NURTURING',
        fechaProximaAccion: { lt: hoy },
        etapa: { notIn: ['VENTA_CERRADA', 'VENTA_PERDIDA'] },
      },
    }),
  ]);

  return NextResponse.json({ urgentes: vencidos + hoyCount, vencidos, hoy: hoyCount, leads: leadsVencidos });
}
