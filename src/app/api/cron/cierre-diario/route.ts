import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardarCierreDiario } from "@/lib/resumen/cierre-diario";
import { fmtMoneda } from "@/lib/resumen/base";

// GET /api/cron/cierre-diario
// Corre lunes, miércoles y viernes — foto de caja del día + notificación a admins.
// Llamado por Vercel Cron: "0 23 * * 1,3,5" (17:00 CDMX)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cierre = await guardarCierreDiario("CRON");

  const admins = await prisma.user.findMany({ where: { active: true, role: "ADMIN" }, select: { id: true } });
  const mensaje =
    `Bancos: ${fmtMoneda(cierre.totalBancos)} · Por cobrar: ${fmtMoneda(cierre.porCobrar)} · ` +
    `Por pagar: ${fmtMoneda(cierre.porPagar)} · Cobrado hoy: ${fmtMoneda(cierre.cobradoHoy)} · ` +
    `Pagado hoy: ${fmtMoneda(cierre.pagadoHoy)}`;

  if (admins.length > 0) {
    await prisma.notificacion.createMany({
      data: admins.map(a => ({
        usuarioId: a.id,
        tipo: "SISTEMA",
        titulo: `Cierre financiero — ${cierre.diaSemana.toLowerCase()}`,
        mensaje,
        url: "/finanzas/cierre-diario",
      })),
    });
  }

  return NextResponse.json({ ok: true, cierre });
}
