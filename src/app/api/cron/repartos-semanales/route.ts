import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/repartos-semanales
// Corre todos los lunes — genera CuotaReparto + CuentaPagar para repartos SEMANAL activos
// Llamado por Vercel Cron: "0 10 * * 1" (lunes 10AM UTC)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora = new Date();
  // Verificar que sea lunes (día 1 en JS)
  const diaSemana = ahora.getDay(); // 0=dom, 1=lun
  if (diaSemana !== 1) {
    return NextResponse.json({ mensaje: "No es lunes, sin acción", dia: diaSemana });
  }

  // Período: semana del lunes actual (formato YYYY-WXX)
  const startOfYear = new Date(ahora.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((ahora.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  const periodo = `${ahora.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

  // Próximo lunes como fecha de compromiso de pago
  const proximoLunes = new Date(ahora);
  proximoLunes.setDate(ahora.getDate() + 7);

  // Traer todos los repartos SEMANAL activos
  const repartos = await prisma.repartoUtilidad.findMany({
    where: { tipoPeriodo: "SEMANAL", activo: true },
    include: { socio: { select: { id: true, nombre: true } } },
  });

  const resultados: { repartoId: string; beneficiario: string; monto: number; estado: "creado" | "ya_existe" | "error"; mensaje?: string }[] = [];

  for (const reparto of repartos) {
    // Verificar que no exista ya cuota para este período
    const existente = await prisma.cuotaReparto.findFirst({
      where: { repartoId: reparto.id, periodo },
    });

    if (existente) {
      resultados.push({ repartoId: reparto.id, beneficiario: reparto.beneficiario, monto: reparto.montoBase, estado: "ya_existe" });
      continue;
    }

    try {
      // Crear CxP
      const cxp = await prisma.cuentaPagar.create({
        data: {
          tipoAcreedor: "SOCIO",
          socioId: reparto.socioId || null,
          concepto: `Pago semanal ${reparto.beneficiario} — ${periodo}`,
          monto: reparto.montoBase,
          fechaCompromiso: proximoLunes,
          esReparto: true,
          notas: `Generado automáticamente por cron repartos-semanales. Reparto: ${reparto.nombre}`,
        },
      });

      // Crear CuotaReparto vinculada
      await prisma.cuotaReparto.create({
        data: {
          repartoId: reparto.id,
          periodo,
          monto: reparto.montoBase,
          cuentaPagarId: cxp.id,
          fechaGenerada: ahora,
        },
      });

      resultados.push({ repartoId: reparto.id, beneficiario: reparto.beneficiario, monto: reparto.montoBase, estado: "creado" });
    } catch (err) {
      resultados.push({ repartoId: reparto.id, beneficiario: reparto.beneficiario, monto: reparto.montoBase, estado: "error", mensaje: String(err) });
    }
  }

  const creados = resultados.filter(r => r.estado === "creado").length;
  return NextResponse.json({
    ok: true,
    periodo,
    totalRepartos: repartos.length,
    creados,
    resultados,
  });
}
