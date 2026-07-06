import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/reportes/flujo?mes=2026-06
// Flujo de caja mensual detallado separando operativo vs. estructural
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  const [year, month] = mes.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  // ── ENTRADAS ───────────────────────────────────────────────────────────────
  const movIngreso = await prisma.movimientoFinanciero.findMany({
    where: { tipo: "INGRESO", fecha: { gte: start, lte: end } },
    include: {
      categoria: { select: { nombre: true } },
      cliente: { select: { nombre: true } },
      cuentaDestino: { select: { nombre: true } },
    },
    orderBy: { fecha: "asc" },
  });

  // ── SALIDAS OPERATIVAS ─────────────────────────────────────────────────────
  const movGasto = await prisma.movimientoFinanciero.findMany({
    where: { tipo: "GASTO", fecha: { gte: start, lte: end } },
    include: {
      categoria: { select: { nombre: true } },
      proveedor: { select: { nombre: true } },
      cuentaOrigen: { select: { nombre: true } },
    },
    orderBy: { fecha: "asc" },
  });

  // ── RETIROS / REPARTOS ─────────────────────────────────────────────────────
  const movRetiro = await prisma.movimientoFinanciero.findMany({
    where: { tipo: "RETIRO", fecha: { gte: start, lte: end } },
    include: {
      categoria: { select: { nombre: true } },
      cuentaOrigen: { select: { nombre: true } },
    },
    orderBy: { fecha: "asc" },
  });

  // ── TRANSFERENCIAS ─────────────────────────────────────────────────────────
  const movTransf = await prisma.movimientoFinanciero.findMany({
    where: { tipo: "TRANSFERENCIA", fecha: { gte: start, lte: end } },
    include: {
      cuentaOrigen: { select: { nombre: true } },
      cuentaDestino: { select: { nombre: true } },
    },
    orderBy: { fecha: "asc" },
  });

  // ── PAGOS DE DEUDAS ESTRUCTURALES ─────────────────────────────────────────
  const cuotasDeuda = await prisma.cuotaDeuda.findMany({
    where: { estado: "PAGADO", updatedAt: { gte: start, lte: end } },
    include: { pasivoDeuda: { select: { nombre: true, categoria: true } } },
  });

  // ── REPARTOS PAGADOS EN EL MES ─────────────────────────────────────────────
  const cuotasReparto = await prisma.cuotaReparto.findMany({
    where: { estado: "PAGADO", createdAt: { gte: start, lte: end } },
    include: { reparto: { select: { nombre: true, beneficiario: true } } },
  });

  // ── CUENTAS BANCARIAS (posición: ingresos - gastos acumulados) ─────────────
  const cuentas = await prisma.cuentaBancaria.findMany({ where: { activa: true } });
  const posicionBancaria: { nombre: string; banco: string | null; saldo: number }[] = [];
  for (const c of cuentas) {
    const ing = await prisma.movimientoFinanciero.aggregate({
      where: { cuentaDestinoId: c.id, tipo: "INGRESO" },
      _sum: { monto: true },
    });
    const gas = await prisma.movimientoFinanciero.aggregate({
      where: { cuentaOrigenId: c.id, tipo: { not: "INGRESO" } },
      _sum: { monto: true },
    });
    posicionBancaria.push({ nombre: c.nombre, banco: c.banco, saldo: (ing._sum.monto ?? 0) - (gas._sum.monto ?? 0) });
  }

  // ── PASIVOS ACTIVOS (próximos vencimientos) ────────────────────────────────
  const pasivosActivos = await prisma.pasivoDeuda.findMany({
    where: { estado: "ACTIVO" },
    include: {
      cuotas: {
        where: { estado: "PENDIENTE" },
        orderBy: { fechaVencimiento: "asc" },
        take: 3,
      },
    },
  });

  // ── REPARTOS ACTIVOS ───────────────────────────────────────────────────────
  const repartosActivos = await prisma.repartoUtilidad.findMany({
    where: { activo: true },
    include: { socio: { select: { nombre: true, pctParticipacion: true } } },
  });

  // ── AGRUPACIÓN POR CATEGORÍA ───────────────────────────────────────────────
  function groupByCat<T extends { categoria?: { nombre: string } | null; monto: number }>(items: T[]) {
    const map: Record<string, number> = {};
    for (const i of items) {
      const cat = i.categoria?.nombre ?? "Sin categoría";
      map[cat] = (map[cat] ?? 0) + i.monto;
    }
    return Object.entries(map).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total);
  }

  const totalIngresos = movIngreso.reduce((s, m) => s + m.monto, 0);
  const totalGastos = movGasto.reduce((s, m) => s + m.monto, 0);
  const totalRetiros = movRetiro.reduce((s, m) => s + m.monto, 0);
  const totalDeudas = cuotasDeuda.reduce((s, c) => s + c.monto, 0);
  const totalRepartos = cuotasReparto.reduce((s, c) => s + c.monto, 0);
  const flujoOperativo = totalIngresos - totalGastos;
  const flujoNeto = totalIngresos - totalGastos - totalRetiros - totalDeudas - totalRepartos;

  return NextResponse.json({
    periodo: mes,
    entradas: {
      total: totalIngresos,
      porCategoria: groupByCat(movIngreso),
      detalle: movIngreso.map(m => ({
        id: m.id, fecha: m.fecha, concepto: m.concepto, monto: m.monto,
        categoria: m.categoria?.nombre ?? "Sin categoría",
        cliente: m.cliente?.nombre ?? null,
        cuenta: m.cuentaDestino?.nombre ?? null,
        metodoPago: m.metodoPago,
      })),
    },
    salidas: {
      operativas: {
        total: totalGastos,
        porCategoria: groupByCat(movGasto),
        detalle: movGasto.map(m => ({
          id: m.id, fecha: m.fecha, concepto: m.concepto, monto: m.monto,
          categoria: m.categoria?.nombre ?? "Sin categoría",
          proveedor: m.proveedor?.nombre ?? null,
          cuenta: m.cuentaOrigen?.nombre ?? null,
          metodoPago: m.metodoPago,
        })),
      },
      retiros: {
        total: totalRetiros,
        detalle: movRetiro.map(m => ({
          id: m.id, fecha: m.fecha, concepto: m.concepto, monto: m.monto,
          categoria: m.categoria?.nombre ?? "Sin categoría",
          cuenta: m.cuentaOrigen?.nombre ?? null,
        })),
      },
      deudasPagadas: {
        total: totalDeudas,
        detalle: cuotasDeuda.map(c => ({
          nombre: c.pasivoDeuda.nombre, categoria: c.pasivoDeuda.categoria,
          monto: c.monto, numeroCuota: c.numeroCuota,
        })),
      },
      repartosPagados: {
        total: totalRepartos,
        detalle: cuotasReparto.map(c => ({
          nombre: c.reparto.nombre, beneficiario: c.reparto.beneficiario,
          periodo: c.periodo, monto: c.monto,
        })),
      },
    },
    resumen: {
      flujoOperativo,
      flujoNeto,
      totalIngresos,
      totalEgresos: totalGastos + totalRetiros,
      compromisosPasivos: totalDeudas + totalRepartos,
    },
    posicionBancaria,
    compromisosVigentes: {
      pasivos: pasivosActivos.map(p => ({
        nombre: p.nombre, categoria: p.categoria, saldo: p.montoTotal - p.montoPagado,
        proximasCuotas: p.cuotas.map(c => ({ monto: c.monto, fechaVencimiento: c.fechaVencimiento })),
      })),
      repartos: repartosActivos.map(r => ({
        nombre: r.nombre, beneficiario: r.beneficiario,
        montoBase: r.montoBase, tipoPeriodo: r.tipoPeriodo,
        socio: r.socio?.nombre ?? null, pct: r.socio?.pctParticipacion ?? null,
      })),
    },
  });
}
