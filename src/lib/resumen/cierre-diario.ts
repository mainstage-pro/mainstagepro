// Cierre diario de finanzas: lo que `resumenFinanzas()` ya calcula en vivo,
// más lo que falta para una foto de cierre (cobrado/pagado de hoy, pasivos
// externos, nómina y gastos recurrentes pendientes), persistido L/M/V para
// poder comparar un día contra otro sin que los números se muevan solos.

import { prisma } from "@/lib/prisma";
import { resumenFinanzas } from "./finanzas";
import { num, ventana } from "./base";

const DIAS_SEMANA = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];

export type PasivoExternoResumen = {
  nombre: string;
  categoria: string;
  saldo: number;
};

export type GastoRecurrentePendiente = {
  nombre: string;
  periodo: string;
  monto: number;
  estado: string;
};

async function extraCierre() {
  const { hoy, finDeHoy } = ventana();
  const inicioHoy = new Date(hoy.getTime());

  const [abonosHoy, abonosPagoHoy, pasivos, periodos, nominaPendiente] = await Promise.all([
    prisma.abono.aggregate({ _sum: { monto: true }, where: { fecha: { gte: inicioHoy, lte: finDeHoy } } }),
    prisma.abonoPago.aggregate({ _sum: { monto: true }, where: { fecha: { gte: inicioHoy, lte: finDeHoy } } }),
    prisma.pasivoDeuda.findMany({
      where: { estado: { not: "LIQUIDADO" } },
      select: { nombre: true, acreedorNombre: true, categoria: true, montoTotal: true, montoPagado: true },
    }),
    prisma.periodoGastoRecurrente.findMany({
      where: { estado: { in: ["PENDIENTE_IMPORTE", "PENDIENTE_PAGO", "VENCIDO"] } },
      select: {
        periodo: true,
        montoEstimado: true,
        montoConfirmado: true,
        estado: true,
        gastoRecurrente: { select: { nombre: true } },
      },
    }),
    prisma.pagoNomina.aggregate({ _sum: { monto: true }, where: { estado: "PENDIENTE" } }),
  ]);

  const pasivosDetalle: PasivoExternoResumen[] = pasivos.map(p => ({
    nombre: p.acreedorNombre || p.nombre,
    categoria: p.categoria,
    saldo: num(p.montoTotal) - num(p.montoPagado),
  }));

  const gastosDetalle: GastoRecurrentePendiente[] = periodos.map(p => ({
    nombre: p.gastoRecurrente.nombre,
    periodo: p.periodo,
    monto: num(p.montoConfirmado ?? p.montoEstimado),
    estado: p.estado,
  }));

  return {
    hoy,
    cobradoHoy: num(abonosHoy._sum.monto),
    pagadoHoy: num(abonosPagoHoy._sum.monto),
    pasivosDetalle,
    pasivosExternosTotal: pasivosDetalle.reduce((s, p) => s + p.saldo, 0),
    gastosDetalle,
    gastosRecurrentesPendientesTotal: gastosDetalle.reduce((s, g) => s + g.monto, 0),
    nominaPendienteTotal: num(nominaPendiente._sum.monto),
  };
}

/** Lo que vería /finanzas/cierre-diario en vivo, sin guardar nada. */
export async function cierreDiarioEnVivo() {
  const [r, extra] = await Promise.all([resumenFinanzas(), extraCierre()]);
  return { ...r, ...extra };
}

/** Guarda la foto del día — upsert por fecha: correr dos veces el mismo día no duplica. */
export async function guardarCierreDiario(generadoPor: string) {
  const c = await cierreDiarioEnVivo();
  const fechaDia = new Date(c.hoy.toISOString().slice(0, 10) + "T00:00:00.000Z");
  const diaSemana = DIAS_SEMANA[fechaDia.getUTCDay()];

  const campos = {
    diaSemana,
    totalBancos: c.totalBancos,
    porCobrar: c.porCobrar,
    porPagar: c.porPagar,
    posicion: c.posicion,
    cobradoHoy: c.cobradoHoy,
    pagadoHoy: c.pagadoHoy,
    cxcVencidaTotal: c.cxcVencida.total,
    cxcVencidaN: c.cxcVencida.n,
    cxpVencidaTotal: c.cxpVencida.total,
    cxpVencidaN: c.cxpVencida.n,
    pasivosExternosTotal: c.pasivosExternosTotal,
    gastosRecurrentesPendientesTotal: c.gastosRecurrentesPendientesTotal,
    nominaPendienteTotal: c.nominaPendienteTotal,
    detalle: JSON.stringify(c),
    generadoPor,
  };

  return prisma.cierreFinancieroDiario.upsert({
    where: { fecha: fechaDia },
    create: { fecha: fechaDia, ...campos },
    update: campos,
  });
}

export async function historialCierres(limite = 20) {
  return prisma.cierreFinancieroDiario.findMany({
    orderBy: { fecha: "desc" },
    take: limite,
  });
}
