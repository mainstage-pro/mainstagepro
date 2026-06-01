import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarReporteData, getLunesDeSemana } from "@/lib/reportes";

// Vercel Cron invoca este endpoint con el header Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const lunes = getLunesDeSemana();
  const domingo = new Date(lunes.getTime() + 6 * 86400000);
  domingo.setHours(23, 59, 59, 999);

  const datos = await generarReporteData(lunes, domingo);

  await prisma.reporteSemanal.upsert({
    where: { semana: lunes },
    create: {
      semana:      lunes,
      fechaInicio: lunes,
      fechaFin:    domingo,
      datos:       JSON.stringify(datos),
      score:       datos.score.total,
    },
    update: {
      datos:      JSON.stringify(datos),
      score:      datos.score.total,
      generadoEn: new Date(),
    },
  });

  return NextResponse.json({ ok: true, score: datos.score.total });
}
