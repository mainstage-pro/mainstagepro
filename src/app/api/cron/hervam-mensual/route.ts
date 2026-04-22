import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function calcular(config: {
  valorTotalActivos: number; tasaAnualRendimiento: number;
  modoActivo: string; porcentajeVariable: number; pisoMinimoFijo: number;
}, valorEfectivo: number) {
  const montoFijo = (valorEfectivo * config.tasaAnualRendimiento) / 1200;
  const pisoAbsoluto = montoFijo * config.pisoMinimoFijo / 100;

  if (config.modoActivo === "FIJO") {
    return { montoFijo, montoVariable: null, montoAcordado: montoFijo, modoPago: "FIJO" };
  }

  // Sin utilidad conocida al inicio del mes → modo FIJO como base
  // (El equipo podrá ajustar la utilidad y el monto después si aplica)
  return { montoFijo, montoVariable: null, montoAcordado: Math.max(pisoAbsoluto, montoFijo), modoPago: "FIJO" };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora = new Date();
  const mes  = ahora.getMonth() + 1; // 1–12
  const anio = ahora.getFullYear();

  // Evitar duplicados
  const existente = await prisma.hervamPago.findUnique({ where: { mes_anio: { mes, anio } } });
  if (existente) {
    return NextResponse.json({ skipped: true, reason: "Ya existe el pago de este mes" });
  }

  const config = await prisma.hervamConfig.findFirst({ include: { socio: { select: { id: true, nombre: true } } } });
  if (!config) {
    return NextResponse.json({ error: "No hay configuración HERVAM" }, { status: 500 });
  }

  let valorEfectivo = config.valorTotalActivos;
  if (config.usarSumaActivos) {
    const activos = await prisma.hervamActivo.findMany({ where: { activo: true } });
    valorEfectivo = activos.reduce((s, a) => s + a.valorActual, 0);
  }

  const calc = calcular(config, valorEfectivo);

  // Crear registro de pago HERVAM
  const pago = await prisma.hervamPago.create({
    data: {
      mes,
      anio,
      montoFijo: calc.montoFijo,
      montoAcordado: calc.montoAcordado,
      modoPago: calc.modoPago,
      notas: "Generado automáticamente al inicio del mes",
    },
  });

  // Crear CxP vencimiento día 10 del mes actual
  const fechaCompromiso = new Date(anio, mes - 1, 10);
  const fechaISO = `${anio}-${String(mes).padStart(2,"0")}-10`;

  await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor: config.socio ? "SOCIO" : "OTRO",
      socioId: config.socio?.id ?? null,
      concepto: `Renta HERVAM · ${MESES[mes - 1]} ${anio}`,
      monto: calc.montoAcordado,
      fechaCompromiso,
      notas: "Generado automáticamente. Ajustar monto si aplica modo variable.",
    },
  });

  return NextResponse.json({
    ok: true,
    mes,
    anio,
    montoAcordado: calc.montoAcordado,
    socio: config.socio?.nombre ?? null,
    fechaCompromiso: fechaISO,
    pagoId: pago.id,
  });
}
