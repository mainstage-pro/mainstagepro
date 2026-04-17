import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generarReporteData, getLunesDeSemana } from "@/lib/reportes";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const lunes = getLunesDeSemana();
  const domingo = new Date(lunes.getTime() + 6 * 86400000);
  domingo.setHours(23, 59, 59, 999);

  const datos = await generarReporteData(lunes, domingo);

  const reporte = await prisma.reporteSemanal.upsert({
    where: { semana: lunes },
    create: {
      semana:      lunes,
      fechaInicio: lunes,
      fechaFin:    domingo,
      datos:       JSON.stringify(datos),
      score:       datos.score.total,
    },
    update: {
      datos:     JSON.stringify(datos),
      score:     datos.score.total,
      generadoEn: new Date(),
    },
  });

  return NextResponse.json({ ok: true, reporte });
}
