import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function groupByCategoria(
  movs: { categoria: { nombre: string; tipo: string } | null; monto: number }[]
) {
  const map: Record<string, { nombre: string; total: number; count: number }> = {};
  for (const m of movs) {
    const nombre = m.categoria?.nombre ?? "Sin categoría";
    if (!map[nombre]) map[nombre] = { nombre, total: 0, count: 0 };
    map[nombre].total += m.monto;
    map[nombre].count += 1;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // ── Período ─────────────────────────────────────────────────────────────
  const mesParam = req.nextUrl.searchParams.get("mes");
  let year: number, month: number;
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    [year, month] = mesParam.split("-").map(Number);
  } else {
    const d = new Date();
    const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    year = p.getFullYear();
    month = p.getMonth() + 1;
  }
  const desde     = new Date(year, month - 1, 1);
  const hasta     = new Date(year, month, 0, 23, 59, 59, 999);
  const periodoStr = `${year}-${String(month).padStart(2, "0")}`;

  // ── Fuentes de efectivo ──────────────────────────────────────────────────
  const [
    movimientos,
    nominaOrfana,
    abonosOrfanos,
    abonosPagoOrfanos,
    gastosEventoOrfanos,
    cuentasBancarias,
  ] = await Promise.all([
    // TODO central: MovimientoFinanciero
    prisma.movimientoFinanciero.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
      include: {
        categoria:      { select: { nombre: true, tipo: true } },
        cuentaOrigen:   { select: { nombre: true, banco: true } },
        cuentaDestino:  { select: { nombre: true, banco: true } },
      },
      orderBy: { fecha: "asc" },
    }),

    // Nómina pagada en el mes SIN movimiento conciliado
    prisma.pagoNomina.findMany({
      where: {
        estado:      "PAGADO",
        fechaPago:   { gte: desde, lte: hasta },
        movimientoId: null,
      },
      include: { personal: { select: { nombre: true } } },
    }),

    // Abonos (CxC) en el mes SIN movimiento conciliado
    prisma.abono.findMany({
      where: {
        fecha:        { gte: desde, lte: hasta },
        movimientoId: null,
      },
      include: {
        cuentaCobrar: {
          select: {
            concepto: true,
            cliente:  { select: { nombre: true } },
          },
        },
      },
    }),

    // Abonos de pago (CxP) en el mes SIN movimiento conciliado
    prisma.abonoPago.findMany({
      where: {
        fecha:        { gte: desde, lte: hasta },
        movimientoId: null,
      },
      include: {
        cuentaPagar: { select: { concepto: true, tipoAcreedor: true } },
      },
    }),

    // GastoOperativo entregado en el mes (SIEMPRE fuera del libro de movimientos)
    prisma.gastoOperativo.findMany({
      where: {
        entregado:     true,
        fechaEntrega: { gte: desde, lte: hasta },
      },
      include: {
        proyecto: { select: { nombre: true, numeroProyecto: true } },
      },
    }),

    // Cuentas bancarias activas para el saldo
    prisma.cuentaBancaria.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, banco: true },
    }),
  ]);

  // ── Clasificar movimientos ───────────────────────────────────────────────
  const ingresoMovs      = movimientos.filter(m => m.tipo === "INGRESO");
  const gastoMovs        = movimientos.filter(m => m.tipo === "GASTO");
  const transMovs        = movimientos.filter(m => m.tipo === "TRANSFERENCIA");
  const inversionMovs    = movimientos.filter(m => m.tipo === "INVERSION");
  const retiroMovs       = movimientos.filter(m => m.tipo === "RETIRO");

  const totalIngresos     = ingresoMovs.reduce((s, m) => s + m.monto, 0);
  const totalGastos       = gastoMovs.reduce((s, m) => s + m.monto, 0);
  const totalInvRetiro    = inversionMovs.reduce((s, m) => s + m.monto, 0)
                          + retiroMovs.reduce((s, m) => s + m.monto, 0);

  // Orphaned totals
  const orphanIngresos    = abonosOrfanos.reduce((s, a) => s + a.monto, 0);
  const orphanGastos      = abonosPagoOrfanos.reduce((s, a) => s + a.monto, 0)
                          + nominaOrfana.reduce((s, p) => s + p.monto, 0)
                          + gastosEventoOrfanos.reduce((s, g) => s + g.monto * g.cantidad, 0);

  const flujoNeto = totalIngresos + orphanIngresos - totalGastos - orphanGastos;

  return NextResponse.json({
    periodo: periodoStr,

    ingresos: {
      total:       totalIngresos + orphanIngresos,
      conciliado:  totalIngresos,
      orphan:      orphanIngresos,
      porCategoria: groupByCategoria(ingresoMovs),
      detalle:     ingresoMovs.map(m => ({
        id:        m.id, fecha: m.fecha, concepto: m.concepto,
        monto:     m.monto, metodoPago: m.metodoPago,
        categoria: m.categoria?.nombre ?? "Sin categoría",
        cuenta:    m.cuentaDestino?.nombre ?? null,
      })),
      abonosOrfanos: abonosOrfanos.map(a => ({
        monto:    a.monto,
        concepto: a.cuentaCobrar?.concepto ?? "—",
        cliente:  a.cuentaCobrar?.cliente?.nombre ?? "—",
        fecha:    a.fecha,
      })),
    },

    gastos: {
      total:       totalGastos + orphanGastos,
      conciliado:  totalGastos,
      orphan:      orphanGastos,
      porCategoria: groupByCategoria(gastoMovs),
      detalle:     gastoMovs.map(m => ({
        id:        m.id, fecha: m.fecha, concepto: m.concepto,
        monto:     m.monto, metodoPago: m.metodoPago,
        categoria: m.categoria?.nombre ?? "Sin categoría",
        cuenta:    m.cuentaOrigen?.nombre ?? null,
      })),
      abonosPagoOrfanos: abonosPagoOrfanos.map(a => ({
        monto:    a.monto,
        concepto: a.cuentaPagar?.concepto ?? "—",
        tipo:     a.cuentaPagar?.tipoAcreedor ?? "—",
        fecha:    a.fecha,
      })),
      nominaOrfana: nominaOrfana.map(p => ({
        monto:  p.monto,
        nombre: p.personal?.nombre ?? "—",
        fecha:  p.fechaPago,
      })),
      gastosEventoOrfanos: gastosEventoOrfanos.map(g => ({
        concepto: g.concepto,
        monto:    g.monto * g.cantidad,
        tipo:     g.tipo,
        proyecto: g.proyecto
          ? `#${g.proyecto.numeroProyecto ?? ""} ${g.proyecto.nombre}`.trim()
          : null,
        fecha:    g.fechaEntrega,
      })),
    },

    transferencias: {
      total:   transMovs.reduce((s, m) => s + m.monto, 0),
      detalle: transMovs.map(m => ({
        concepto: m.concepto, monto: m.monto, fecha: m.fecha,
        origen:   m.cuentaOrigen?.nombre ?? null,
        destino:  m.cuentaDestino?.nombre ?? null,
      })),
    },

    otrasOperaciones: {
      total:   totalInvRetiro,
      detalle: [...inversionMovs, ...retiroMovs].map(m => ({
        tipo:     m.tipo, concepto: m.concepto, monto: m.monto, fecha: m.fecha,
        categoria: m.categoria?.nombre ?? "—",
      })),
    },

    flujoNeto,
    cuentasBancarias,

    // Conciliation flags
    tieneOrfanos: orphanIngresos > 0 || orphanGastos > 0,
    orphanCount:
      abonosOrfanos.length +
      abonosPagoOrfanos.length +
      nominaOrfana.length +
      gastosEventoOrfanos.length,
  });
}
