import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/reportes/balance?mes=2026-06
// Construye el Balance General del período
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  const [year, month] = mes.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const startAll = new Date("2020-01-01");

  // ── ACTIVOS ────────────────────────────────────────────────────────────────
  // Cuentas bancarias (sin campo saldo — usamos movimientos para calcular posición)
  const cuentas = await prisma.cuentaBancaria.findMany({ where: { activa: true } });

  // Posición de cada cuenta: sum(ingresos) - sum(gastos) de movimientos
  const cuentasPosicion: { id: string; nombre: string; banco: string | null; posicion: number }[] = [];
  for (const c of cuentas) {
    const ingresos = await prisma.movimientoFinanciero.aggregate({
      where: { cuentaDestinoId: c.id, tipo: "INGRESO" },
      _sum: { monto: true },
    });
    const gastos = await prisma.movimientoFinanciero.aggregate({
      where: { cuentaOrigenId: c.id, tipo: { not: "INGRESO" } },
      _sum: { monto: true },
    });
    cuentasPosicion.push({
      id: c.id, nombre: c.nombre, banco: c.banco,
      posicion: (ingresos._sum.monto ?? 0) - (gastos._sum.monto ?? 0),
    });
  }
  const totalEfectivo = cuentasPosicion.reduce((s, c) => s + c.posicion, 0);

  // Cuentas por cobrar (CxC acumuladas pendientes)
  const cxc = await prisma.cuentaCobrar.aggregate({
    where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    _sum: { monto: true, montoCobrado: true },
  });
  const cxcTotal = (cxc._sum.monto ?? 0) - (cxc._sum.montoCobrado ?? 0);

  // Activos por categoría de Mainstage (HERVAM — solo OFICINA/INTANGIBLE/OTRO)
  // EQUIPO/VEHICULO/INMUEBLE son de Mauricio, administrados por Mainstage → NO van al balance
  const CATS_MAINSTAGE = ["OFICINA", "INTANGIBLE", "OTRO"];
  const activosDB = await prisma.hervamActivo.groupBy({
    by: ["categoria", "propietario"],
    where: { activo: true, categoria: { in: CATS_MAINSTAGE } },
    _sum: { valorAdquisicion: true, valorActual: true },
    _count: { id: true },
  });

  // Usar valorActual si está disponible, si no valorAdquisicion
  // (Los activos de OFICINA tienen valorActual capturado, valorAdquisicion = 0)
  const activosPorCategoria = activosDB
    .filter(r => CATS_MAINSTAGE.includes(r.categoria))
    .map(r => ({
      categoria: r.categoria,
      propietario: r.propietario,
      total: (r._sum.valorActual ?? 0) > 0 ? (r._sum.valorActual ?? 0) : (r._sum.valorAdquisicion ?? 0),
      count: r._count.id,
    }));


  // Físicos Mainstage (OFICINA, OTRO) vs Intangibles (INTANGIBLE)
  const activosFisicos = activosPorCategoria
    .filter(r => r.categoria !== "INTANGIBLE")
    .reduce((s, r) => s + r.total, 0);
  const activosIntangibles = activosPorCategoria
    .filter(r => r.categoria === "INTANGIBLE")
    .reduce((s, r) => s + r.total, 0);
  const activosFijos = activosFisicos + activosIntangibles;

  // ── PASIVOS ────────────────────────────────────────────────────────────────
  const pasivos = await prisma.pasivoDeuda.findMany({
    where: { estado: "ACTIVO" },
    select: { nombre: true, montoTotal: true, montoPagado: true, categoria: true },
  });
  const totalPasivosDeuda = pasivos.reduce((s, p) => s + (p.montoTotal - p.montoPagado), 0);

  const cxp = await prisma.cuentaPagar.aggregate({
    where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, esDeuda: false },
    _sum: { monto: true, montoPagado: true },
  });
  const cxpTotal = (cxp._sum.monto ?? 0) - (cxp._sum.montoPagado ?? 0);

  const repartosPend = await prisma.cuotaReparto.aggregate({
    where: { estado: "PENDIENTE" },
    _sum: { monto: true },
  });
  const totalRepartosPendientes = repartosPend._sum.monto ?? 0;

  // ── PATRIMONIO ─────────────────────────────────────────────────────────────
  const ingresosHist = await prisma.movimientoFinanciero.aggregate({
    where: { tipo: "INGRESO", fecha: { gte: startAll } },
    _sum: { monto: true },
  });
  const gastosHist = await prisma.movimientoFinanciero.aggregate({
    where: { tipo: { in: ["GASTO", "RETIRO"] }, fecha: { gte: startAll } },
    _sum: { monto: true },
  });
  const utilidadAcumulada = (ingresosHist._sum.monto ?? 0) - (gastosHist._sum.monto ?? 0);

  // ── RESUMEN DEL MES ────────────────────────────────────────────────────────
  const ingresosMes = await prisma.movimientoFinanciero.aggregate({
    where: { tipo: "INGRESO", fecha: { gte: start, lte: end } },
    _sum: { monto: true },
  });
  const gastosMes = await prisma.movimientoFinanciero.aggregate({
    where: { tipo: { in: ["GASTO", "RETIRO"] }, fecha: { gte: start, lte: end } },
    _sum: { monto: true },
  });
  const flujoNetoMes = (ingresosMes._sum.monto ?? 0) - (gastosMes._sum.monto ?? 0);

  const socios = await prisma.socio.findMany({
    where: { status: "ACTIVO" },
    select: { nombre: true, pctParticipacion: true, razonSocial: true, esRepresentante: true, esRepartoUtilidades: true, montoRepartoSemanal: true },
  });

  const totalActivos = totalEfectivo + cxcTotal + activosFijos;
  const totalPasivos = totalPasivosDeuda + cxpTotal + totalRepartosPendientes;
  const patrimonioNeto = totalActivos - totalPasivos;

  return NextResponse.json({
    periodo: mes,
    activos: {
      efectivoYBancos: { total: totalEfectivo, cuentas: cuentasPosicion },
      cuentasPorCobrar: { total: cxcTotal },
      activosFijos: { total: activosFisicos, etiqueta: "Activos Físicos de Mainstage" },
      activosIntangibles: { total: activosIntangibles, etiqueta: "Activos Intangibles de Mainstage" },
      porCategoria: activosPorCategoria,
      totalActivos,
    },
    pasivos: {
      deudasEstructurales: { total: totalPasivosDeuda, detalle: pasivos },
      cuentasPorPagar: { total: cxpTotal },
      repartosPendientes: { total: totalRepartosPendientes },
      totalPasivos,
    },
    patrimonio: {
      utilidadAcumulada,
      patrimonioNeto,
    },
    resMes: {
      ingresos: ingresosMes._sum.monto ?? 0,
      gastos: gastosMes._sum.monto ?? 0,
      flujoNeto: flujoNetoMes,
    },
    estructura: {
      razonSocial: socios[0]?.razonSocial || "Escenario Principal S.A. de C.V.",
      socios,
    },
  });
}
