import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTipoMovimientoMap, esIngresoResultado, esGastoResultado } from "@/lib/tipos-movimiento";

function groupByCategoria(movs: { categoria: { nombre: string } | null; monto: number }[]) {
  const map: Record<string, { nombre: string; total: number; count: number }> = {};
  for (const m of movs) {
    const nombre = m.categoria?.nombre ?? "Sin categoría";
    if (!map[nombre]) map[nombre] = { nombre, total: 0, count: 0 };
    map[nombre].total += m.monto;
    map[nombre].count += 1;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function calcAgingBuckets(
  items: { id: string; nombre: string; monto: number; fecha: Date }[],
  ahora: Date
) {
  const corriente: typeof items = [];
  const d30: typeof items = [];
  const d60: typeof items = [];
  const d90: typeof items = [];

  for (const item of items) {
    const dias = Math.floor((ahora.getTime() - item.fecha.getTime()) / 86_400_000);
    if (dias <= 0) corriente.push(item);
    else if (dias <= 30) d30.push(item);
    else if (dias <= 60) d60.push(item);
    else d90.push(item);
  }

  const sum = (arr: typeof items) => arr.reduce((s, i) => s + i.monto, 0);
  return {
    corriente: { total: sum(corriente), items: corriente },
    dias30:    { total: sum(d30),       items: d30 },
    dias60:    { total: sum(d60),       items: d60 },
    dias90:    { total: sum(d90),       items: d90 },
    totalPendiente: sum([...corriente, ...d30, ...d60, ...d90]),
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Parse month param — default: previous month
  const mesParam = req.nextUrl.searchParams.get("mes");
  let year: number, month: number;
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    [year, month] = mesParam.split("-").map(Number);
  } else {
    const ahora = new Date();
    const prev = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    year = prev.getFullYear();
    month = prev.getMonth() + 1;
  }

  const desde = new Date(year, month - 1, 1);
  const hasta = new Date(year, month, 0, 23, 59, 59, 999);
  const ahora = new Date();

  const [movimientos, pagosNomina, tecnicosFreelance, cxcPendientes, cxpPendientes, cierres] =
    await Promise.all([
      // All financial movements in the month
      prisma.movimientoFinanciero.findMany({
        where: { fecha: { gte: desde, lte: hasta } },
        include: { categoria: { select: { nombre: true, tipo: true } } },
        orderBy: { fecha: "asc" },
      }),

      // Payroll in the month
      prisma.pagoNomina.findMany({
        where: {
          estado: "PAGADO",
          fechaPago: { gte: desde, lte: hasta },
        },
        include: { personal: { select: { nombre: true, puesto: true } } },
      }),

      // Freelance technicians paid in the month
      prisma.cuentaPagar.findMany({
        where: {
          tipoAcreedor: "TECNICO",
          fechaPagoReal: { gte: desde, lte: hasta },
        },
        include: { tecnico: { select: { nombre: true } } },
      }),

      // CxC aging (all pending)
      prisma.cuentaCobrar.findMany({
        where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
        include: {
          cliente: { select: { nombre: true } },
          proyecto: { select: { nombre: true, numeroProyecto: true } },
        },
        orderBy: { fechaCompromiso: "asc" },
      }),

      // CxP aging (all pending)
      prisma.cuentaPagar.findMany({
        where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
        include: {
          tecnico:   { select: { nombre: true } },
          proveedor: { select: { nombre: true } },
          proyecto:  { select: { nombre: true, numeroProyecto: true } },
        },
        orderBy: { fechaCompromiso: "asc" },
      }),

      // Project closings for margin
      prisma.cierreFinanciero.findMany({
        include: { proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true } } },
        orderBy: { cerradoEn: "desc" },
        take: 20,
      }),
    ]);

  // ── P&L Classification ──────────────────────────────────────────────────

  const tipoMap = await getTipoMovimientoMap();
  const ingresosMovs    = movimientos.filter(m => esIngresoResultado(tipoMap, m.tipo));
  const gastosMovs      = movimientos.filter(m => esGastoResultado(tipoMap, m.tipo));

  const ingresos = ingresosMovs.reduce((s, m) => s + m.monto, 0);

  // Costos directos: movimientos with proyectoId
  const costosDirectosMovs = gastosMovs.filter(m => m.proyectoId !== null);
  const costosDirectosMov  = costosDirectosMovs.reduce((s, m) => s + m.monto, 0);

  // Técnicos freelance (from CuentaPagar)
  const tecnicosTotal = tecnicosFreelance.reduce((s, c) => s + (c.montoPagado ?? c.monto), 0);
  const costosDirectosTotal = costosDirectosMov + tecnicosTotal;

  // Nómina
  const nominaTotal = pagosNomina.reduce((s, p) => s + p.monto, 0);

  // Gastos operativos (sin proyectoId, sin impuestos)
  const gastosOpMovs = gastosMovs.filter(
    m => !m.proyectoId && !m.categoria?.nombre?.toLowerCase().includes("impuesto")
  );
  const gastosOpTotal = gastosOpMovs.reduce((s, m) => s + m.monto, 0);

  // Impuestos
  const impuestosMovs  = gastosMovs.filter(m => m.categoria?.nombre?.toLowerCase().includes("impuesto"));
  const impuestosTotal = impuestosMovs.reduce((s, m) => s + m.monto, 0);

  // P&L
  const utilidadBruta = ingresos - costosDirectosTotal;
  const utilidadNeta  = utilidadBruta - nominaTotal - gastosOpTotal - impuestosTotal;

  // ── Aging ───────────────────────────────────────────────────────────────

  const agingCxC = calcAgingBuckets(
    cxcPendientes.map(c => ({
      id:     c.id,
      nombre: c.cliente?.nombre ?? c.concepto,
      monto:  Math.max(0, c.monto - c.montoCobrado),
      fecha:  c.fechaCompromiso,
    })),
    ahora
  );

  const agingCxP = calcAgingBuckets(
    cxpPendientes.map(c => ({
      id:     c.id,
      nombre: c.tecnico?.nombre ?? c.proveedor?.nombre ?? c.concepto,
      monto:  Math.max(0, c.monto - c.montoPagado),
      fecha:  c.fechaCompromiso,
    })),
    ahora
  );

  // ── Margin by project ───────────────────────────────────────────────────

  const margenProyectos = cierres.map(c => ({
    id:       c.proyectoId,
    titulo:   `${c.proyecto.numeroProyecto ? `#${c.proyecto.numeroProyecto} ` : ""}${c.proyecto.nombre}`,
    fecha:    c.proyecto.fechaEvento,
    cobrado:  c.totalCobrado,
    costo:    c.totalGastado,
    utilidad: c.utilidadReal,
    margen:   c.margenReal,
  }));

  const periodoStr = `${year}-${String(month).padStart(2, "0")}`;

  return NextResponse.json({
    periodo:              periodoStr,
    ingresos,
    ingresosPorCategoria: groupByCategoria(ingresosMovs),
    costosDirectos: {
      total:             costosDirectosTotal,
      movimientos:       costosDirectosMov,
      tecnicosFreelance: tecnicosTotal,
      detalleTecnicos:   tecnicosFreelance.map(t => ({
        nombre: t.tecnico?.nombre ?? "Técnico",
        monto:  t.montoPagado ?? t.monto,
      })),
      detalleMovimientos: groupByCategoria(costosDirectosMovs),
    },
    nomina: {
      total:   nominaTotal,
      detalle: pagosNomina.map(p => ({
        nombre:      p.personal?.nombre ?? "—",
        puesto:      p.personal?.puesto ?? "",
        monto:       p.monto,
        tipoPeriodo: p.tipoPeriodo,
      })),
    },
    gastosOperativos: {
      total:       gastosOpTotal,
      porCategoria: groupByCategoria(gastosOpMovs),
    },
    impuestos: impuestosTotal,
    utilidadBruta,
    utilidadNeta,
    agingCxC,
    agingCxP,
    margenProyectos,
  });
}
