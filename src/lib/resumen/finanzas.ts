import { prisma } from "@/lib/prisma";
import { getTipoMovimientoMap, naturalezaDe } from "@/lib/tipos-movimiento";
import { diasEntre, fmtDiaAnio, fmtMes, inicioDeMes, num, sumarDias, ventana } from "./base";

/**
 * El saldo de una cuenta no está almacenado en ningún campo: se deriva del
 * movimiento. Al crear un movimiento, ENTRADA escribe `cuentaDestinoId`,
 * SALIDA escribe `cuentaOrigenId` y TRANSFERENCIA escribe ambos. Por eso:
 *
 *   saldo = Σ(monto donde destino = cuenta) − Σ(monto donde origen = cuenta)
 *
 * Cualquier otro cálculo se desincroniza en cuanto alguien registra una
 * transferencia.
 */
async function saldosPorCuenta() {
  const [cuentas, entradas, salidas] = await Promise.all([
    prisma.cuentaBancaria.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, banco: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.movimientoFinanciero.groupBy({
      by: ["cuentaDestinoId"],
      where: { cuentaDestinoId: { not: null } },
      _sum: { monto: true },
    }),
    prisma.movimientoFinanciero.groupBy({
      by: ["cuentaOrigenId"],
      where: { cuentaOrigenId: { not: null } },
      _sum: { monto: true },
    }),
  ]);

  return cuentas.map(c => ({
    id: c.id,
    nombre: c.nombre,
    banco: c.banco,
    saldo:
      num(entradas.find(e => e.cuentaDestinoId === c.id)?._sum.monto) -
      num(salidas.find(s => s.cuentaOrigenId === c.id)?._sum.monto),
  }));
}

const ABIERTAS = ["PENDIENTE", "PARCIAL", "VENCIDA"];

type Documento = {
  id: string;
  concepto: string;
  quien: string;
  proyecto: string | null;
  /** Fecha del evento del proyecto ligado, ya formateada. */
  proyectoFecha: string | null;
  /** Fecha compromiso, ya formateada. */
  fecha: string;
  saldo: number;
  /** Positivo = vencida hace N días; negativo = vence en N días. */
  dias: number;
};

export async function resumenFinanzas() {
  const { hoy, finDeHoy } = ventana();
  const desde6Meses = inicioDeMes(sumarDias(hoy, -160));

  const [cuentas, cxcAbiertas, cxpAbiertas, movimientos, tipoMap] = await Promise.all([
    saldosPorCuenta(),
    prisma.cuentaCobrar.findMany({
      where: { estado: { in: ABIERTAS } },
      select: {
        id: true,
        concepto: true,
        monto: true,
        montoCobrado: true,
        montoCompensado: true,
        fechaCompromiso: true,
        estado: true,
        cliente: { select: { nombre: true, empresa: true } },
        proyecto: { select: { numeroProyecto: true, fechaEvento: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    }),
    prisma.cuentaPagar.findMany({
      where: { estado: { in: ABIERTAS } },
      select: {
        id: true,
        concepto: true,
        monto: true,
        montoPagado: true,
        montoCompensado: true,
        fechaCompromiso: true,
        estado: true,
        tipoAcreedor: true,
        proveedor: { select: { nombre: true } },
        tecnico: { select: { nombre: true } },
        proyecto: { select: { numeroProyecto: true, fechaEvento: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    }),
    prisma.movimientoFinanciero.findMany({
      where: { fecha: { gte: desde6Meses, lte: finDeHoy } },
      select: { fecha: true, tipo: true, monto: true },
    }),
    getTipoMovimientoMap(),
  ]);

  const dia = (f: Date) => new Date(f.toISOString().slice(0, 10));
  const anio = hoy.getUTCFullYear();
  const fmtF = (f: Date | null | undefined) => (f ? fmtDiaAnio(dia(f), anio) : null);

  const cxc = cxcAbiertas.map(c => {
    const saldo = num(c.monto) - num(c.montoCobrado) - num(c.montoCompensado);
    return {
      id: c.id,
      concepto: c.concepto,
      quien: c.cliente?.empresa || c.cliente?.nombre || "—",
      proyecto: c.proyecto?.numeroProyecto ?? null,
      proyectoFecha: fmtF(c.proyecto?.fechaEvento),
      fecha: fmtF(c.fechaCompromiso)!,
      saldo,
      dias: diasEntre(dia(c.fechaCompromiso), hoy), // positivo = vencida
    };
  }).filter(c => c.saldo > 0.5);

  const cxp = cxpAbiertas.map(c => {
    const saldo = num(c.monto) - num(c.montoPagado) - num(c.montoCompensado);
    return {
      id: c.id,
      concepto: c.concepto,
      quien: c.proveedor?.nombre || c.tecnico?.nombre || c.tipoAcreedor,
      proyecto: c.proyecto?.numeroProyecto ?? null,
      proyectoFecha: fmtF(c.proyecto?.fechaEvento),
      fecha: fmtF(c.fechaCompromiso)!,
      saldo,
      dias: diasEntre(dia(c.fechaCompromiso), hoy),
    };
  }).filter(c => c.saldo > 0.5);

  const cxcVencida = cxc.filter(c => c.dias > 0);
  const cxpVencida = cxp.filter(c => c.dias > 0);
  const cxpPorVencer = cxp.filter(c => c.dias <= 0 && -c.dias <= 15);
  const cxcPorCobrar15 = cxc.filter(c => c.dias <= 0 && -c.dias <= 15);

  const suma = (xs: { saldo: number }[]) => xs.reduce((s, x) => s + x.saldo, 0);

  // La cobranza se persigue por contraparte, no por documento suelto: tres
  // facturas del mismo cliente son una sola llamada, no tres.
  const agrupar = (docs: Documento[]) => {
    const porQuien = new Map<string, Documento[]>();
    for (const d of docs) {
      const k = d.quien || "—";
      if (!porQuien.has(k)) porQuien.set(k, []);
      porQuien.get(k)!.push(d);
    }
    return [...porQuien.entries()]
      .map(([quien, xs]) => ({
        quien,
        total: suma(xs),
        n: xs.length,
        // El documento más viejo manda el color del grupo.
        diasMax: Math.max(...xs.map(x => x.dias)),
        docs: xs.slice().sort((a, b) => b.saldo - a.saldo),
      }))
      .sort((a, b) => b.total - a.total);
  };

  // Serie mensual de ingreso vs gasto: la única forma de ver si el saldo de hoy
  // es una racha o un accidente.
  const meses: { label: string; ingreso: number; gasto: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = inicioDeMes(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1)));
    meses.push({ label: fmtMes(m), ingreso: 0, gasto: 0 });
  }
  const baseMes = hoy.getUTCFullYear() * 12 + hoy.getUTCMonth();
  for (const mv of movimientos) {
    const idx = 5 - (baseMes - (mv.fecha.getUTCFullYear() * 12 + mv.fecha.getUTCMonth()));
    if (idx < 0 || idx > 5) continue;
    const nat = naturalezaDe(tipoMap, mv.tipo);
    if (nat === "ENTRADA") meses[idx].ingreso += num(mv.monto);
    else if (nat === "SALIDA") meses[idx].gasto += num(mv.monto);
  }

  const totalBancos = cuentas.reduce((s, c) => s + c.saldo, 0);
  const porCobrar = suma(cxc);
  const porPagar = suma(cxp);

  return {
    cuentas,
    totalBancos,
    porCobrar,
    porPagar,
    // Lo que realmente queda si todo se cobra y todo se paga.
    posicion: totalBancos + porCobrar - porPagar,
    cxcVencida: { total: suma(cxcVencida), n: cxcVencida.length, grupos: agrupar(cxcVencida) },
    cxpVencida: { total: suma(cxpVencida), n: cxpVencida.length, grupos: agrupar(cxpVencida) },
    cxpPorVencer: { total: suma(cxpPorVencer), n: cxpPorVencer.length, grupos: agrupar(cxpPorVencer) },
    cxcPorCobrar15: { total: suma(cxcPorCobrar15), n: cxcPorCobrar15.length, grupos: agrupar(cxcPorCobrar15) },
    meses,
  };
}
