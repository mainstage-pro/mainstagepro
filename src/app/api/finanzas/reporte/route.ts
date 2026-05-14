import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const meses = parseInt(req.nextUrl.searchParams.get("meses") ?? "6");
  const ahora       = new Date();
  const inicioDeHoy = new Date(ahora); inicioDeHoy.setHours(0, 0, 0, 0);
  const desde = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1), 1);

  const [movimientos, cxc, cxp, cuentas] = await Promise.all([
    prisma.movimientoFinanciero.findMany({
      where: { fecha: { gte: desde } },
      include: { categoria: { select: { nombre: true, tipo: true } } },
      orderBy: { fecha: "asc" },
    }),
    prisma.cuentaCobrar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    }),
    prisma.cuentaPagar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    }),
    prisma.cuentaBancaria.findMany({ where: { activa: true }, select: { id: true, nombre: true, banco: true } }),
  ]);

  // ── Por mes ──────────────────────────────────────────────────────────────
  const porMes: Record<string, { mes: string; ingresos: number; egresos: number }> = {};
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    porMes[key] = { mes: key, ingresos: 0, egresos: 0 };
  }
  for (const m of movimientos) {
    const key = m.fecha.toISOString().slice(0, 7);
    if (!porMes[key]) continue;
    if (m.tipo === "INGRESO") porMes[key].ingresos += m.monto;
    else if (m.tipo === "GASTO") porMes[key].egresos += m.monto;
  }

  // ── Por categoría ────────────────────────────────────────────────────────
  const porCategoria: Record<string, { nombre: string; tipo: string; total: number; count: number }> = {};
  for (const m of movimientos) {
    if (m.tipo !== "INGRESO" && m.tipo !== "GASTO") continue;
    const key = m.categoriaId ?? "_sin_cat";
    const nombre = m.categoria?.nombre ?? "Sin categoría";
    const tipo = m.tipo;
    if (!porCategoria[key]) porCategoria[key] = { nombre, tipo, total: 0, count: 0 };
    porCategoria[key].total += m.monto;
    porCategoria[key].count++;
  }

  // ── KPIs globales ────────────────────────────────────────────────────────
  const totalIngresos = movimientos.filter(m => m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0);
  const totalEgresos  = movimientos.filter(m => m.tipo === "GASTO").reduce((s, m) => s + m.monto, 0);

  const mesActual = ahora.toISOString().slice(0, 7);
  const movMes = movimientos.filter(m => m.fecha.toISOString().slice(0, 7) === mesActual);
  const ingresosMes = movMes.filter(m => m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0);
  const egresosMes  = movMes.filter(m => m.tipo === "GASTO").reduce((s, m) => s + m.monto, 0);

  const cxcTotal = cxc.reduce((s, c) => s + (c.monto - c.montoCobrado), 0);
  const cxpTotal = cxp.reduce((s, c) => s + c.monto, 0);
  const cxcVencido = cxc.filter(c => new Date(c.fechaCompromiso) < inicioDeHoy).reduce((s, c) => s + (c.monto - c.montoCobrado), 0);
  const cxpVencido = cxp.filter(c => new Date(c.fechaCompromiso) < inicioDeHoy).reduce((s, c) => s + c.monto, 0);

  // Solo devolver meses con movimientos + el mes actual (no rellenar vacíos históricos)
  const mesActualKey = ahora.toISOString().slice(0, 7);
  const porMesFiltrado = Object.values(porMes).filter(
    m => m.mes === mesActualKey || m.ingresos > 0 || m.egresos > 0,
  );

  return NextResponse.json({
    kpis: {
      ingresosMes, egresosMes,
      utilidadMes: ingresosMes - egresosMes,
      margenMes: ingresosMes > 0 ? ((ingresosMes - egresosMes) / ingresosMes) * 100 : 0,
      totalIngresos, totalEgresos,
      utilidadPeriodo: totalIngresos - totalEgresos,
      cxcTotal, cxcVencido,
      cxpTotal, cxpVencido,
    },
    porMes: porMesFiltrado,
    porCategoria: Object.values(porCategoria).sort((a, b) => b.total - a.total),
    cuentas,
  });
}
