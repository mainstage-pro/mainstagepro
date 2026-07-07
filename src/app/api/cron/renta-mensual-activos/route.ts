import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Configuración del compromiso recurrente ────────────────────────────────────
const SOCIO_ID  = "cmoaejaa600008id05rodlphx"; // Mauricio Hernández
const MONTO     = 28000;
const CONCEPTO  = "Renta mensual de activos (pago de crédito actinver)";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Determinar mes y año actual
  const ahora = new Date();
  const mes   = ahora.getMonth() + 1; // 1–12
  const anio  = ahora.getFullYear();

  // Fecha de vencimiento: día 5 del mes en curso
  const fechaVencimiento = new Date(`${anio}-${String(mes).padStart(2, "0")}-05T12:00:00Z`);

  // Evitar duplicados — revisar si ya existe CxP de este mes/concepto para el socio
  const existente = await prisma.cuentaPagar.findFirst({
    where: {
      socioId: SOCIO_ID,
      concepto: CONCEPTO,
      fechaCompromiso: {
        gte: new Date(`${anio}-${String(mes).padStart(2, "0")}-01`),
        lte: new Date(`${anio}-${String(mes).padStart(2, "0")}-28`),
      },
    },
  });

  if (existente) {
    return NextResponse.json({
      skipped: true,
      reason: `Ya existe el compromiso para ${mes}/${anio}`,
      id: existente.id,
    });
  }

  // Crear el registro de CxP
  const cxp = await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor: "SOCIO",
      concepto: CONCEPTO,
      monto: MONTO,
      fechaCompromiso: fechaVencimiento,
      estado: "PENDIENTE",
      socioId: SOCIO_ID,
      esDeuda: false,
      esReparto: false,
      esNomina: false,
      notas: `Generado automáticamente el 1 de ${ahora.toLocaleString("es-MX", { month: "long" })} de ${anio}`,
    },
  });

  return NextResponse.json({
    ok: true,
    mes,
    anio,
    monto: MONTO,
    fechaVencimiento: fechaVencimiento.toISOString().slice(0, 10),
    id: cxp.id,
  });
}
