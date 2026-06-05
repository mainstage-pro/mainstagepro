import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function aging(
  items: { id: string; nombre: string; monto: number; fecha: Date }[]
) {
  const ahora = new Date();
  const corriente: typeof items = [],
    d30: typeof items = [],
    d60: typeof items = [],
    d90: typeof items = [];
  for (const i of items) {
    if (i.monto <= 0) continue;
    const dias = Math.floor(
      (ahora.getTime() - i.fecha.getTime()) / 86_400_000
    );
    if (dias <= 0) corriente.push(i);
    else if (dias <= 30) d30.push(i);
    else if (dias <= 60) d60.push(i);
    else d90.push(i);
  }
  const sum = (a: typeof items) => a.reduce((s, x) => s + x.monto, 0);
  return {
    corriente: { total: sum(corriente), items: corriente },
    dias30:    { total: sum(d30),       items: d30 },
    dias60:    { total: sum(d60),       items: d60 },
    dias90:    { total: sum(d90),       items: d90 },
    totalPendiente: sum([...corriente, ...d30, ...d60, ...d90]),
  };
}

function isImpuesto(concepto: string) {
  const lc = concepto.toLowerCase();
  return lc.includes("impuesto") || lc.includes("isr") || lc.includes("iva");
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

  // ── Queries ──────────────────────────────────────────────────────────────
  const [
    cxcIngreso,
    cxpCostoDirecto,
    cxpSinProyecto,     // both gastos op + impuestos, split in JS
    gastosEvento,
    nomina,
    cxcPendientes,
    cxpPendientes,
    cierres,
  ] = await Promise.all([

    // INGRESOS: CxC con fechaCompromiso en el mes
    prisma.cuentaCobrar.findMany({
      where: { fechaCompromiso: { gte: desde, lte: hasta } },
      include: {
        cliente:  { select: { nombre: true } },
        proyecto: { select: { nombre: true, numeroProyecto: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    }),

    // COSTOS DIRECTOS: CxP con proyectoId creadas en el mes
    prisma.cuentaPagar.findMany({
      where: {
        createdAt:    { gte: desde, lte: hasta },
        proyectoId:   { not: null },
        tipoAcreedor: { in: ["TECNICO", "PROVEEDOR", "EMPRESA", "SOCIO"] },
      },
      include: {
        tecnico:   { select: { nombre: true } },
        proveedor: { select: { nombre: true } },
        proyecto:  { select: { nombre: true, numeroProyecto: true } },
      },
    }),

    // CxP sin proyecto creadas en el mes (impuestos y gastos op — split in JS)
    prisma.cuentaPagar.findMany({
      where: {
        createdAt:  { gte: desde, lte: hasta },
        proyectoId: null,
      },
    }),

    // GASTOS DE EVENTO: GastoOperativo cuyo proyecto ocurre en el mes
    prisma.gastoOperativo.findMany({
      where: { proyecto: { fechaEvento: { gte: desde, lte: hasta } } },
      include: {
        proyecto: {
          select: { nombre: true, numeroProyecto: true, fechaEvento: true },
        },
      },
    }),

    // NÓMINA: PagoNomina del período (devengado por período)
    prisma.pagoNomina.findMany({
      where: { periodo: periodoStr },
      include: { personal: { select: { nombre: true, puesto: true } } },
    }),

    // AGING CxC — todas pendientes
    prisma.cuentaCobrar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { fechaCompromiso: "asc" },
    }),

    // AGING CxP — todas pendientes
    prisma.cuentaPagar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
      include: {
        tecnico:   { select: { nombre: true } },
        proveedor: { select: { nombre: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    }),

    // MARGEN por proyecto
    prisma.cierreFinanciero.findMany({
      include: {
        proyecto: {
          select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true },
        },
      },
      orderBy: { cerradoEn: "desc" },
      take: 30,
    }),
  ]);

  // ── Clasificar en JS ──────────────────────────────────────────────────────
  const cxpGastoOp   = cxpSinProyecto.filter(c => !isImpuesto(c.concepto));
  const cxpImpuestos = cxpSinProyecto.filter(c =>  isImpuesto(c.concepto));

  const tecnicosFreelance = cxpCostoDirecto.filter(c => c.tipoAcreedor === "TECNICO");
  const otrosCostosDir    = cxpCostoDirecto.filter(c => c.tipoAcreedor !== "TECNICO");

  // ── Cálculos P&L ────────────────────────────────────────────────────────
  const ingresos           = cxcIngreso.reduce((s, c) => s + c.monto, 0);
  const costosCxP          = cxpCostoDirecto.reduce((s, c) => s + c.monto, 0);
  const costosEventoTotal  = gastosEvento.reduce((s, g) => s + g.monto * g.cantidad, 0);
  const costosDirectosTotal = costosCxP + costosEventoTotal;
  const nominaTotal        = nomina.reduce((s, p) => s + p.monto, 0);
  const gastosOpTotal      = cxpGastoOp.reduce((s, c) => s + c.monto, 0);
  const impuestosTotal     = cxpImpuestos.reduce((s, c) => s + c.monto, 0);
  const utilidadBruta      = ingresos - costosDirectosTotal;
  const utilidadNeta       = utilidadBruta - nominaTotal - gastosOpTotal - impuestosTotal;

  // ── Aging ────────────────────────────────────────────────────────────────
  const agingCxC = aging(
    cxcPendientes.map(c => ({
      id:     c.id,
      nombre: c.cliente?.nombre ?? c.concepto,
      monto:  Math.max(0, c.monto - c.montoCobrado),
      fecha:  c.fechaCompromiso,
    }))
  );
  const agingCxP = aging(
    cxpPendientes.map(c => ({
      id:     c.id,
      nombre: c.tecnico?.nombre ?? c.proveedor?.nombre ?? c.concepto,
      monto:  Math.max(0, c.monto - c.montoPagado),
      fecha:  c.fechaCompromiso,
    }))
  );

  return NextResponse.json({
    periodo: periodoStr,
    ingresos,
    ingresosDetalle: cxcIngreso.map(c => ({
      id:           c.id,
      cliente:      c.cliente?.nombre ?? "Sin cliente",
      concepto:     c.concepto,
      monto:        c.monto,
      montoCobrado: c.montoCobrado,
      estado:       c.estado,
      proyecto:     c.proyecto
        ? `#${c.proyecto.numeroProyecto ?? ""} ${c.proyecto.nombre}`.trim()
        : null,
    })),
    costosDirectos: {
      total:             costosDirectosTotal,
      tecnicosFreelance: tecnicosFreelance.reduce((s, c) => s + c.monto, 0),
      otrosCostos:       otrosCostosDir.reduce((s, c) => s + c.monto, 0),
      gastosEvento:      costosEventoTotal,
      detalleTecnicos: tecnicosFreelance.map(c => ({
        nombre:  c.tecnico?.nombre ?? "Técnico",
        monto:   c.monto,
        estado:  c.estado,
        proyecto: c.proyecto
          ? `#${c.proyecto.numeroProyecto ?? ""}`.trim()
          : null,
      })),
      detalleOtros: otrosCostosDir.map(c => ({
        concepto:     c.concepto,
        monto:        c.monto,
        tipoAcreedor: c.tipoAcreedor,
        estado:       c.estado,
        proyecto:     c.proyecto
          ? `#${c.proyecto.numeroProyecto ?? ""}`.trim()
          : null,
      })),
      detalleEventos: gastosEvento.map(g => ({
        concepto:  g.concepto,
        tipo:      g.tipo,
        monto:     g.monto * g.cantidad,
        entregado: g.entregado,
        proyecto:  g.proyecto
          ? `#${g.proyecto.numeroProyecto ?? ""} ${g.proyecto.nombre}`.trim()
          : null,
      })),
    },
    nomina: {
      total: nominaTotal,
      detalle: nomina.map(p => ({
        nombre:      p.personal?.nombre ?? "—",
        puesto:      p.personal?.puesto ?? "",
        monto:       p.monto,
        tipoPeriodo: p.tipoPeriodo,
        estado:      p.estado,
      })),
    },
    gastosOperativos: {
      total: gastosOpTotal,
      detalle: cxpGastoOp.map(c => ({
        concepto:     c.concepto,
        monto:        c.monto,
        tipoAcreedor: c.tipoAcreedor,
        estado:       c.estado,
      })),
    },
    impuestos: {
      total: impuestosTotal,
      detalle: cxpImpuestos.map(c => ({
        concepto:     c.concepto,
        monto:        c.monto,
        tipoAcreedor: c.tipoAcreedor,
      })),
    },
    utilidadBruta,
    utilidadNeta,
    agingCxC,
    agingCxP,
    margenProyectos: cierres.map(c => ({
      id:       c.proyectoId,
      titulo: `${c.proyecto.numeroProyecto ? `#${c.proyecto.numeroProyecto} ` : ""}${c.proyecto.nombre}`,
      fecha:    c.proyecto.fechaEvento,
      cobrado:  c.totalCobrado,
      costo:    c.totalGastado,
      utilidad: c.utilidadReal,
      margen:   c.margenReal,
    })),
  });
}
