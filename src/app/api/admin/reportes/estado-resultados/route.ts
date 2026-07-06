import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/reportes/estado-resultados?mes=2026-07
// Estado de Resultados — Base DEVENGADO (accrual)
// Ingresos y costos reconocidos al periodo en que ocurren, no cuando se cobran/pagan

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  const [year, month] = mes.split("-").map(Number);

  // Rango del período (por fecha de evento de proyecto)
  const inicioMes = new Date(year, month - 1, 1);
  const finMes    = new Date(year, month, 0, 23, 59, 59);

  // ─── 1. INGRESOS DEVENGADOS: Proyectos ejecutados en el período ────────────
  // Reconocemos el 100% del valor de cotización al momento del evento,
  // independientemente de si el cliente ya pagó o no.
  const proyectosPeriodo = await prisma.proyecto.findMany({
    where: {
      fechaEvento: { gte: inicioMes, lte: finMes },
      estado: { not: "CANCELADO" },
    },
    include: {
      cotizacion: {
        select: {
          granTotal: true,
          total: true,
          montoIva: true,
          costosTotalesEstimados: true,
        },
      },
      cliente: { select: { nombre: true, empresa: true } },
      cuentasCobrar: {
        select: { monto: true, montoCobrado: true, estado: true },
      },
      cuentasPagar: {
        where: { esDeuda: false, esReparto: false, esNomina: false },
        select: { concepto: true, monto: true, montoPagado: true, estado: true, tipoAcreedor: true, proyectoId: true },
      },
      gastosOperativos: {
        select: { tipo: true, concepto: true, monto: true, cantidad: true },
      },
      cierreFinanciero: {
        select: { totalCobrado: true, totalGastado: true, utilidadReal: true, desgloseCostos: true },
      },
    },
    orderBy: { fechaEvento: "asc" },
  });

  // Construir desglose de ingresos y costos directos por proyecto
  const proyectosDesglose = proyectosPeriodo.map((p) => {
    const ingreso       = p.cotizacion.granTotal;                           // valor total (con IVA si aplica)
    const ingresoSinIva = p.cotizacion.total ?? p.cotizacion.granTotal;    // valor sin IVA
    const costoEstimado = p.cotizacion.costosTotalesEstimados;

    const costoCxP       = p.cuentasPagar.reduce((s, c) => s + c.monto, 0);
    const costoOperat    = p.gastosOperativos.reduce((s, g) => s + g.monto * g.cantidad, 0);
    const costoDirecto   = costoCxP + costoOperat;

    const cobrado        = p.cuentasCobrar.reduce((s, c) => s + c.montoCobrado, 0);
    const porCobrar      = p.cuentasCobrar.reduce((s, c) => s + (c.monto - c.montoCobrado), 0);
    const utilidadBruta  = ingresoSinIva - costoDirecto;
    const margen         = ingresoSinIva > 0 ? (utilidadBruta / ingresoSinIva) * 100 : 0;

    return {
      id:           p.id,
      nombre:       p.nombre,
      cliente:      p.cliente.nombre,
      empresa:      p.cliente.empresa,
      fechaEvento:  p.fechaEvento.toISOString(),
      tipoEvento:   p.tipoEvento,
      ingreso,
      ingresoSinIva,
      costoEstimado,
      costoDirecto,
      costoCxP,
      costoOperat,
      cobrado,
      porCobrar,
      utilidadBruta,
      margenPct: margen,
    };
  });

  const totalIngresos      = proyectosDesglose.reduce((s, p) => s + p.ingresoSinIva, 0);
  const totalCostosDirectos = proyectosDesglose.reduce((s, p) => s + p.costoDirecto, 0);
  const utilidadBruta      = totalIngresos - totalCostosDirectos;
  const margenBrutoPct     = totalIngresos > 0 ? (utilidadBruta / totalIngresos) * 100 : 0;

  // ─── 2. NÓMINA DEL PERÍODO ─────────────────────────────────────────────────
  // PagoNomina con periodo === mes (devengado en el período)
  const nominaItems = await prisma.pagoNomina.findMany({
    where: { periodo: mes },
    include: {
      personal: { select: { nombre: true, puesto: true, departamento: true } },
    },
  });

  const totalNomina = nominaItems.reduce((s, n) => s + n.monto, 0);

  const nominaPorArea: Record<string, number> = {};
  for (const n of nominaItems) {
    const area = n.personal.departamento ?? "Sin área";
    nominaPorArea[area] = (nominaPorArea[area] ?? 0) + n.monto;
  }

  // ─── 3. GASTOS FIJOS Y VARIABLES (no ligados a proyectos del período) ──────
  // Movimientos de gasto en el período que no son de nómina
  const movGastos = await prisma.movimientoFinanciero.findMany({
    where: {
      tipo: "GASTO",
      fecha: { gte: inicioMes, lte: finMes },
      proyectoId: null, // Solo gastos no ligados a proyectos específicos
    },
    include: {
      categoria: { select: { nombre: true, tipo: true } },
      proveedor: { select: { nombre: true } },
    },
    orderBy: { fecha: "asc" },
  });

  // Clasificar por categoría
  const gastosPorCategoria: Record<string, { monto: number; items: typeof movGastos }> = {};
  for (const g of movGastos) {
    const cat = g.categoria?.nombre ?? "Sin categoría";
    if (!gastosPorCategoria[cat]) gastosPorCategoria[cat] = { monto: 0, items: [] };
    gastosPorCategoria[cat].monto += g.monto;
    gastosPorCategoria[cat].items.push(g);
  }

  const totalGastosOperativos = movGastos.reduce((s, g) => s + g.monto, 0);

  // ─── 4. PASIVOS FINANCIEROS DEL PERÍODO ───────────────────────────────────
  // Cuotas de deuda que vencen en este período (devengado)
  const cuotasDeudaPeriodo = await prisma.cuotaDeuda.findMany({
    where: {
      fechaVencimiento: { gte: inicioMes, lte: finMes },
    },
    include: {
      pasivoDeuda: { select: { nombre: true, categoria: true, tasaInteres: true } },
    },
  });

  const totalCostosFinancieros = cuotasDeudaPeriodo.reduce((s, c) => s + c.monto, 0);

  // ─── 5. REPARTOS DEL PERÍODO ──────────────────────────────────────────────
  const cuotasReparto = await prisma.cuotaReparto.findMany({
    where: { periodo: mes },
    include: {
      reparto: { select: { nombre: true, beneficiario: true, tipoPeriodo: true } },
    },
  });
  const totalRepartos = cuotasReparto.reduce((s, c) => s + c.monto, 0);

  // ─── 6. CÁLCULOS FINALES ──────────────────────────────────────────────────
  const utilidadOperativa = utilidadBruta - totalGastosOperativos - totalNomina;
  const margenOperativoPct = totalIngresos > 0 ? (utilidadOperativa / totalIngresos) * 100 : 0;

  // ISR estimado: 30% sobre utilidad operativa positiva (México)
  const isrEstimado      = utilidadOperativa > 0 ? utilidadOperativa * 0.30 : 0;
  const utilidadNeta     = utilidadOperativa - totalCostosFinancieros - isrEstimado;
  const margenNetoPct    = totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0;

  // ─── 7. ANÁLISIS DIRECTIVO GUARDADO ──────────────────────────────────────
  const analisis = await prisma.reporteERAnalisis.findUnique({ where: { mes } });

  // ─── 8. COMPARATIVO MES ANTERIOR ─────────────────────────────────────────
  const mesAnteriorDate = new Date(year, month - 2, 1);
  const mesAnterior     = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, "0")}`;
  const inicioAnterior  = new Date(year, month - 2, 1);
  const finAnterior     = new Date(year, month - 1, 0, 23, 59, 59);

  const proyAnterior = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: inicioAnterior, lte: finAnterior }, estado: { not: "CANCELADO" } },
    include: { cotizacion: { select: { total: true, granTotal: true } } },
  });
  const ingresosAnterior = proyAnterior.reduce((s, p) => s + (p.cotizacion.total ?? p.cotizacion.granTotal), 0);

  const nominaAnterior = await prisma.pagoNomina.aggregate({
    where: { periodo: mesAnterior },
    _sum: { monto: true },
  });

  const gastosAnterior = await prisma.movimientoFinanciero.aggregate({
    where: { tipo: "GASTO", fecha: { gte: inicioAnterior, lte: finAnterior }, proyectoId: null },
    _sum: { monto: true },
  });

  const totalIngresosAnterior  = ingresosAnterior;
  const totalNominaAnterior    = nominaAnterior._sum.monto ?? 0;
  const totalGastosAnterior    = gastosAnterior._sum.monto ?? 0;

  // ─── RESPUESTA ─────────────────────────────────────────────────────────────
  return NextResponse.json({
    mes,
    mesAnterior,

    // Proyectos del período
    proyectos: proyectosDesglose,
    cantidadProyectos: proyectosDesglose.length,

    // Ingresos
    totalIngresos,

    // Costos directos
    totalCostosDirectos,

    // Utilidad Bruta
    utilidadBruta,
    margenBrutoPct,

    // Gastos operativos (fijos + variables)
    gastosPorCategoria: Object.entries(gastosPorCategoria).map(([nombre, data]) => ({
      nombre,
      monto: data.monto,
      items: data.items.map((i) => ({
        id: i.id,
        concepto: i.concepto,
        monto: i.monto,
        fecha: i.fecha.toISOString(),
        categoria: i.categoria?.nombre ?? "Sin categoría",
        proveedor: i.proveedor?.nombre ?? null,
      })),
    })).sort((a, b) => b.monto - a.monto),
    totalGastosOperativos,

    // Nómina
    nominaItems: nominaItems.map((n) => ({
      id: n.id,
      nombre: n.personal.nombre,
      puesto: n.personal.puesto,
      area: n.personal.departamento,
      monto: n.monto,
      periodo: n.periodo,
      estado: n.estado,
    })),
    nominaPorArea,
    totalNomina,

    // Utilidad Operativa
    utilidadOperativa,
    margenOperativoPct,

    // Costos financieros
    cuotasDeuda: cuotasDeudaPeriodo.map((c) => ({
      id: c.id,
      nombre: c.pasivoDeuda.nombre,
      categoria: c.pasivoDeuda.categoria,
      monto: c.monto,
      numeroCuota: c.numeroCuota,
      estado: c.estado,
      fechaVencimiento: c.fechaVencimiento.toISOString(),
    })),
    totalCostosFinancieros,

    // Repartos
    repartos: cuotasReparto.map((c) => ({
      id: c.id,
      nombre: c.reparto.nombre,
      beneficiario: c.reparto.beneficiario,
      monto: c.monto,
    })),
    totalRepartos,

    // ISR
    isrEstimado,

    // Utilidad Neta
    utilidadNeta,
    margenNetoPct,

    // Comparativo mes anterior
    comparativo: {
      mes: mesAnterior,
      totalIngresos: totalIngresosAnterior,
      totalNomina: totalNominaAnterior,
      totalGastos: totalGastosAnterior,
    },

    // Análisis directivo
    analisis: analisis ?? null,
  });
}
