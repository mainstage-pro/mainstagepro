import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/nomina-semanal
// Corre todos los lunes — genera PagoNomina + CuentaPagar para personal SEMANAL activo
// Llamado por Vercel Cron: "30 10 * * 1" (lunes 10:30AM UTC)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora = new Date();

  // Período: semana del lunes actual (formato YYYY-WXX)
  const startOfYear = new Date(ahora.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((ahora.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  );
  const periodo = `${ahora.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

  // Fecha compromiso: este mismo lunes (pago inmediato)
  const fechaCompromiso = new Date(ahora);
  fechaCompromiso.setHours(23, 59, 0, 0);

  // Personal activo con pago SEMANAL y salario definido
  const empleados = await prisma.personalInterno.findMany({
    where: { activo: true, periodoPago: "SEMANAL", NOT: { salario: null } },
    select: { id: true, nombre: true, puesto: true, salario: true },
  });

  if (empleados.length === 0) {
    return NextResponse.json({ ok: true, periodo, creados: 0, mensaje: "Sin personal semanal activo" });
  }

  const resultados: {
    empleadoId: string;
    nombre: string;
    monto: number;
    estado: "creado" | "ya_existe" | "error";
    mensaje?: string;
  }[] = [];

  for (const empleado of empleados) {
    // Verificar que no exista ya pago de nómina para este período
    const existente = await prisma.pagoNomina.findFirst({
      where: { personalId: empleado.id, periodo, tipoPeriodo: "SEMANAL" },
    });

    if (existente) {
      resultados.push({ empleadoId: empleado.id, nombre: empleado.nombre, monto: empleado.salario!, estado: "ya_existe" });
      continue;
    }

    try {
      // Crear CuentaPagar primero
      const cxp = await prisma.cuentaPagar.create({
        data: {
          tipoAcreedor: "PERSONAL_INTERNO",
          concepto: `Nómina semanal ${empleado.nombre} — ${periodo}`,
          monto: empleado.salario!,
          fechaCompromiso,
          esNomina: true,
          notas: `Generado automáticamente por cron nomina-semanal. Período: ${periodo}`,
        },
      });

      // Crear PagoNomina vinculado a la CXP
      await prisma.pagoNomina.create({
        data: {
          personalId: empleado.id,
          periodo,
          tipoPeriodo: "SEMANAL",
          monto: empleado.salario!,
          concepto: `Semana ${periodo} — ${empleado.nombre}`,
          estado: "PENDIENTE",
          cuentaPagarId: cxp.id,
        },
      });

      resultados.push({ empleadoId: empleado.id, nombre: empleado.nombre, monto: empleado.salario!, estado: "creado" });
    } catch (err) {
      resultados.push({
        empleadoId: empleado.id,
        nombre: empleado.nombre,
        monto: empleado.salario!,
        estado: "error",
        mensaje: String(err),
      });
    }
  }

  const creados = resultados.filter((r) => r.estado === "creado").length;
  return NextResponse.json({
    ok: true,
    periodo,
    totalEmpleados: empleados.length,
    creados,
    resultados,
  });
}
