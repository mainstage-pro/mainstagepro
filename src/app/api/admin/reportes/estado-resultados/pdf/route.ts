import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF from "@react-pdf/renderer";
import { EstadoResultadosPDF, type EstadoResultadosData } from "@/components/EstadoResultadosPDF";
import React from "react";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const getMesLabel = (mes: string) => {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  const [year, month] = mes.split("-").map(Number);
  const inicioMes = new Date(year, month - 1, 1);
  const finMes    = new Date(year, month, 0, 23, 59, 59);

  // ─── Proyectos del período ──────────────────────────────────────────────────
  const proyectosPeriodo = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: inicioMes, lte: finMes }, estado: { not: "CANCELADO" } },
    include: {
      cotizacion: { select: { granTotal: true, total: true, costosTotalesEstimados: true } },
      cliente:    { select: { nombre: true, empresa: true } },
      cuentasCobrar: { select: { monto: true, montoCobrado: true, estado: true } },
      cuentasPagar:  { where: { esDeuda: false, esReparto: false, esNomina: false },
                       select: { monto: true } },
      gastosOperativos: { select: { monto: true, cantidad: true } },
    },
    orderBy: { fechaEvento: "asc" },
  });

  const proyectos = proyectosPeriodo.map((p) => {
    const ingresoSinIva = p.cotizacion.total ?? p.cotizacion.granTotal;
    const costoCxP      = p.cuentasPagar.reduce((s, c) => s + c.monto, 0);
    const costoOperat   = p.gastosOperativos.reduce((s, g) => s + g.monto * g.cantidad, 0);
    const costoDirecto  = costoCxP + costoOperat;
    const cobrado       = p.cuentasCobrar.reduce((s, c) => s + c.montoCobrado, 0);
    const porCobrar     = p.cuentasCobrar.reduce((s, c) => s + (c.monto - c.montoCobrado), 0);
    const utilidadBruta = ingresoSinIva - costoDirecto;
    return {
      id: p.id, nombre: p.nombre,
      cliente: p.cliente.nombre, empresa: p.cliente.empresa ?? null,
      fechaEvento: p.fechaEvento.toISOString(), tipoEvento: p.tipoEvento,
      ingreso: p.cotizacion.granTotal, ingresoSinIva,
      costoEstimado: p.cotizacion.costosTotalesEstimados,
      costoDirecto, costoCxP, costoOperat,
      cobrado, porCobrar, utilidadBruta,
      margenPct: ingresoSinIva > 0 ? (utilidadBruta / ingresoSinIva) * 100 : 0,
    };
  });

  const totalIngresos       = proyectos.reduce((s, p) => s + p.ingresoSinIva, 0);
  const totalCostosDirectos = proyectos.reduce((s, p) => s + p.costoDirecto, 0);
  const utilidadBruta       = totalIngresos - totalCostosDirectos;

  // ─── Nómina ─────────────────────────────────────────────────────────────────
  const nominaItems = await prisma.pagoNomina.findMany({
    where: { periodo: mes },
    include: { personal: { select: { nombre: true, puesto: true, departamento: true } } },
  });
  const totalNomina = nominaItems.reduce((s, n) => s + n.monto, 0);
  const nominaPorArea: Record<string, number> = {};
  for (const n of nominaItems) {
    const area = n.personal.departamento ?? "Sin área";
    nominaPorArea[area] = (nominaPorArea[area] ?? 0) + n.monto;
  }

  // ─── Gastos operativos ──────────────────────────────────────────────────────
  const movGastos = await prisma.movimientoFinanciero.findMany({
    where: { tipo: "GASTO", fecha: { gte: inicioMes, lte: finMes }, proyectoId: null },
    include: { categoria: { select: { nombre: true } }, proveedor: { select: { nombre: true } } },
    orderBy: { fecha: "asc" },
  });
  const gastosPorCat: Record<string, { monto: number; items: typeof movGastos }> = {};
  for (const g of movGastos) {
    const cat = g.categoria?.nombre ?? "Sin categoría";
    if (!gastosPorCat[cat]) gastosPorCat[cat] = { monto: 0, items: [] };
    gastosPorCat[cat].monto += g.monto;
    gastosPorCat[cat].items.push(g);
  }
  const gastosPorCategoria = Object.entries(gastosPorCat).map(([nombre, data]) => ({
    nombre, monto: data.monto,
    items: data.items.map((i) => ({
      id: i.id, concepto: i.concepto, monto: i.monto,
      fecha: i.fecha.toISOString(),
      categoria: i.categoria?.nombre ?? "Sin categoría",
      proveedor: i.proveedor?.nombre ?? null,
    })),
  })).sort((a, b) => b.monto - a.monto);
  const totalGastosOperativos = movGastos.reduce((s, g) => s + g.monto, 0);

  // ─── Pasivos financieros ────────────────────────────────────────────────────
  const cuotasDeuda = await prisma.cuotaDeuda.findMany({
    where: { fechaVencimiento: { gte: inicioMes, lte: finMes } },
    include: { pasivoDeuda: { select: { nombre: true, categoria: true } } },
  });
  const totalCostosFinancieros = cuotasDeuda.reduce((s, c) => s + c.monto, 0);

  // ─── Repartos ───────────────────────────────────────────────────────────────
  const cuotasReparto = await prisma.cuotaReparto.findMany({ where: { periodo: mes },
    include: { reparto: { select: { nombre: true, beneficiario: true } } } });
  const totalRepartos = cuotasReparto.reduce((s, c) => s + c.monto, 0);

  // ─── Cálculos ───────────────────────────────────────────────────────────────
  const utilidadOperativa  = utilidadBruta - totalGastosOperativos - totalNomina;
  const isrEstimado        = utilidadOperativa > 0 ? utilidadOperativa * 0.30 : 0;
  const utilidadNeta       = utilidadOperativa - totalCostosFinancieros - isrEstimado;
  const margenBrutoPct     = totalIngresos > 0 ? (utilidadBruta / totalIngresos) * 100 : 0;
  const margenOperativoPct = totalIngresos > 0 ? (utilidadOperativa / totalIngresos) * 100 : 0;
  const margenNetoPct      = totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0;

  // ─── Comparativo mes anterior ───────────────────────────────────────────────
  const mesAnteriorDate = new Date(year, month - 2, 1);
  const mesAnterior     = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, "0")}`;
  const inicioAnterior  = new Date(year, month - 2, 1);
  const finAnterior     = new Date(year, month - 1, 0, 23, 59, 59);

  const [proyAnterior, nominaAnterior, gastosAnterior] = await Promise.all([
    prisma.proyecto.findMany({ where: { fechaEvento: { gte: inicioAnterior, lte: finAnterior }, estado: { not: "CANCELADO" } },
      include: { cotizacion: { select: { total: true, granTotal: true } } } }),
    prisma.pagoNomina.aggregate({ where: { periodo: mesAnterior }, _sum: { monto: true } }),
    prisma.movimientoFinanciero.aggregate({ where: { tipo: "GASTO", fecha: { gte: inicioAnterior, lte: finAnterior }, proyectoId: null }, _sum: { monto: true } }),
  ]);

  // ─── Análisis directivo ─────────────────────────────────────────────────────
  const analisis = await prisma.reporteERAnalisis.findUnique({ where: { mes } });

  // ─── Construir data ─────────────────────────────────────────────────────────
  const data: EstadoResultadosData = {
    mes,
    mesLabel: getMesLabel(mes),
    proyectos,
    cantidadProyectos: proyectos.length,
    totalIngresos,
    totalCostosDirectos,
    utilidadBruta, margenBrutoPct,
    gastosPorCategoria,
    totalGastosOperativos,
    nominaItems: nominaItems.map((n) => ({ id: n.id, nombre: n.personal.nombre,
      puesto: n.personal.puesto, area: n.personal.departamento, monto: n.monto })),
    nominaPorArea, totalNomina,
    utilidadOperativa, margenOperativoPct,
    cuotasDeuda: cuotasDeuda.map((c) => ({
      id: c.id, nombre: c.pasivoDeuda.nombre, categoria: c.pasivoDeuda.categoria,
      monto: c.monto, numeroCuota: c.numeroCuota, estado: c.estado,
      fechaVencimiento: c.fechaVencimiento.toISOString(),
    })),
    totalCostosFinancieros,
    totalRepartos,
    isrEstimado,
    utilidadNeta, margenNetoPct,
    comparativo: {
      mes: mesAnterior,
      totalIngresos: proyAnterior.reduce((s, p) => s + (p.cotizacion.total ?? p.cotizacion.granTotal), 0),
      totalNomina: nominaAnterior._sum.monto ?? 0,
      totalGastos: gastosAnterior._sum.monto ?? 0,
    },
    analisis: analisis ?? null,
  };

  // ─── Renderizar PDF ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfStream = await ReactPDF.renderToStream(React.createElement(EstadoResultadosPDF, { data }) as any);
  const chunks: Buffer[] = [];
  for await (const chunk of pdfStream as unknown as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="Estado-Resultados-${mes}.pdf"`,
      "Content-Length":      String(pdfBuffer.length),
    },
  });
}
