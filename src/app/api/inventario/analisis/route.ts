import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mesParam = req.nextUrl.searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);
  const [year, month] = mesParam.split("-").map(Number);
  if (!year || !month) return NextResponse.json({ error: "Mes inválido" }, { status: 400 });

  const inicio = new Date(year, month - 1, 1);
  const fin = new Date(year, month, 0, 23, 59, 59, 999);
  const ahora = new Date();

  const [
    todosEquipos,
    lineasPropiaMes,
    lineasExternasMes,
    lineasCustomMes,
    historialAprobado,
    cotizacionesMes,
    cotizacionesAprobadas,
    socios,
  ] = await Promise.all([
    prisma.equipo.findMany({
      where: { activo: true },
      include: { categoria: { select: { nombre: true } } },
      orderBy: { descripcion: "asc" },
    }),

    // Own equipment this month (any cotizacion state = demand signal)
    prisma.cotizacionLinea.findMany({
      where: {
        tipo: "EQUIPO_PROPIO",
        equipoId: { not: null },
        cotizacion: { fechaEvento: { gte: inicio, lte: fin } },
      },
      select: {
        equipoId: true,
        cantidad: true,
        dias: true,
        subtotal: true,
        cotizacion: { select: { estado: true } },
      },
    }),

    // External/provider equipment this month
    prisma.cotizacionLinea.findMany({
      where: {
        tipo: "EQUIPO_EXTERNO",
        cotizacion: { fechaEvento: { gte: inicio, lte: fin } },
      },
      select: {
        descripcion: true,
        proveedorId: true,
        cantidad: true,
        dias: true,
        precioUnitario: true,
        costoUnitario: true,
        subtotal: true,
        cotizacion: { select: { estado: true, numeroCotizacion: true } },
        proveedor: { select: { nombre: true } },
      },
    }),

    // Custom line items (OTRO with no catalog link)
    prisma.cotizacionLinea.findMany({
      where: {
        tipo: "OTRO",
        equipoId: null,
        cotizacion: { fechaEvento: { gte: inicio, lte: fin } },
      },
      select: {
        descripcion: true,
        cantidad: true,
        subtotal: true,
        cotizacion: { select: { estado: true, numeroCotizacion: true } },
      },
    }),

    // All-time approved rentals (for last rental date + historical count)
    prisma.cotizacionLinea.findMany({
      where: {
        tipo: "EQUIPO_PROPIO",
        equipoId: { not: null },
        cotizacion: { estado: "APROBADA" },
      },
      select: {
        equipoId: true,
        cotizacion: { select: { fechaEvento: true } },
      },
      orderBy: { cotizacion: { fechaEvento: "desc" } },
    }),

    prisma.cotizacion.count({ where: { fechaEvento: { gte: inicio, lte: fin } } }),
    prisma.cotizacion.count({ where: { fechaEvento: { gte: inicio, lte: fin }, estado: "APROBADA" } }),

    prisma.socio.findMany({
      where: { status: "ACTIVO" },
      select: {
        id: true,
        nombre: true,
        activos: {
          where: { activo: true },
          select: { id: true, nombre: true, categoria: true, precioDia: true, valorDeclarado: true },
        },
      },
    }),
  ]);

  // ── Own equipment: build lookup maps ──────────────────────────────────────
  const ultimaRentaMap = new Map<string, Date>();
  const historialCountMap = new Map<string, number>();
  for (const l of historialAprobado) {
    if (!l.equipoId) continue;
    if (!ultimaRentaMap.has(l.equipoId) && l.cotizacion.fechaEvento) ultimaRentaMap.set(l.equipoId, l.cotizacion.fechaEvento);
    historialCountMap.set(l.equipoId, (historialCountMap.get(l.equipoId) ?? 0) + 1);
  }

  type MesStat = { vecesCotizadas: number; vecesAprobadas: number; unidadesCotizadas: number; unidadesAprobadas: number; revenueGenerado: number };
  const mesStatsMap = new Map<string, MesStat>();
  for (const l of lineasPropiaMes) {
    if (!l.equipoId) continue;
    const s: MesStat = mesStatsMap.get(l.equipoId) ?? { vecesCotizadas: 0, vecesAprobadas: 0, unidadesCotizadas: 0, unidadesAprobadas: 0, revenueGenerado: 0 };
    s.vecesCotizadas++;
    s.unidadesCotizadas += l.cantidad;
    if (l.cotizacion.estado === "APROBADA") {
      s.vecesAprobadas++;
      s.unidadesAprobadas += l.cantidad;
      s.revenueGenerado += l.subtotal;
    }
    mesStatsMap.set(l.equipoId, s);
  }

  const inventarioPropio = todosEquipos.map(e => {
    const stats = mesStatsMap.get(e.id) ?? { vecesCotizadas: 0, vecesAprobadas: 0, unidadesCotizadas: 0, unidadesAprobadas: 0, revenueGenerado: 0 };
    const ultimaFecha = ultimaRentaMap.get(e.id) ?? null;
    const diasSinRenta = ultimaFecha ? Math.floor((ahora.getTime() - ultimaFecha.getTime()) / 86400000) : null;
    let alerta: string | null = null;
    if (!ultimaFecha) alerta = "NUNCA_RENTADO";
    else if (diasSinRenta! > 180) alerta = "INACTIVO_6M";
    else if (diasSinRenta! > 90) alerta = "INACTIVO_3M";
    else if (diasSinRenta! > 30 && stats.vecesAprobadas === 0) alerta = "INACTIVO_1M";
    return {
      id: e.id,
      descripcion: e.descripcion,
      marca: e.marca,
      modelo: e.modelo,
      categoria: e.categoria.nombre,
      cantidadTotal: e.cantidadTotal,
      precioRenta: e.precioRenta,
      ...stats,
      totalRentasHistoricas: historialCountMap.get(e.id) ?? 0,
      ultimaRentaFecha: ultimaFecha?.toISOString() ?? null,
      diasSinRenta,
      alerta,
    };
  }).sort((a, b) => b.vecesAprobadas - a.vecesAprobadas || b.revenueGenerado - a.revenueGenerado);

  // ── External equipment: group by proveedor + description ─────────────────
  type ExternoStat = {
    proveedorId: string | null; proveedorNombre: string; descripcion: string;
    vecesCotizadas: number; vecesAprobadas: number;
    unidadesCotizadas: number; unidadesAprobadas: number;
    revenueGenerado: number; costoTotal: number; cotizaciones: string[];
  };
  const externoMap = new Map<string, ExternoStat>();
  for (const l of lineasExternasMes) {
    const key = `${l.proveedorId ?? ""}::${l.descripcion.toLowerCase().trim()}`;
    const aprobada = l.cotizacion.estado === "APROBADA";
    const existing = externoMap.get(key);
    if (!existing) {
      externoMap.set(key, {
        proveedorId: l.proveedorId,
        proveedorNombre: l.proveedor?.nombre ?? "Sin proveedor asignado",
        descripcion: l.descripcion,
        vecesCotizadas: 1,
        vecesAprobadas: aprobada ? 1 : 0,
        unidadesCotizadas: l.cantidad,
        unidadesAprobadas: aprobada ? l.cantidad : 0,
        revenueGenerado: aprobada ? l.subtotal : 0,
        costoTotal: aprobada ? l.costoUnitario * l.cantidad * l.dias : 0,
        cotizaciones: [l.cotizacion.numeroCotizacion],
      });
    } else {
      existing.vecesCotizadas++;
      existing.unidadesCotizadas += l.cantidad;
      if (aprobada) {
        existing.vecesAprobadas++;
        existing.unidadesAprobadas += l.cantidad;
        existing.revenueGenerado += l.subtotal;
        existing.costoTotal += l.costoUnitario * l.cantidad * l.dias;
      }
      if (!existing.cotizaciones.includes(l.cotizacion.numeroCotizacion)) existing.cotizaciones.push(l.cotizacion.numeroCotizacion);
    }
  }
  const proveedoresEquipo = Array.from(externoMap.values()).map(e => ({
    ...e,
    margen: e.revenueGenerado - e.costoTotal,
    margenPct: e.revenueGenerado > 0 ? ((e.revenueGenerado - e.costoTotal) / e.revenueGenerado * 100) : 0,
    inversionPotencial: e.vecesAprobadas >= 2,
  })).sort((a, b) => b.vecesAprobadas - a.vecesAprobadas || b.revenueGenerado - a.revenueGenerado);

  // ── Custom items: group by description ───────────────────────────────────
  type CustomStat = { descripcion: string; vecesCotizadas: number; vecesAprobadas: number; unidadesCotizadas: number; revenueGenerado: number; cotizaciones: string[] };
  const customMap = new Map<string, CustomStat>();
  for (const l of lineasCustomMes) {
    const key = l.descripcion.toLowerCase().trim();
    const aprobada = l.cotizacion.estado === "APROBADA";
    const existing = customMap.get(key);
    if (!existing) {
      customMap.set(key, { descripcion: l.descripcion, vecesCotizadas: 1, vecesAprobadas: aprobada ? 1 : 0, unidadesCotizadas: l.cantidad, revenueGenerado: aprobada ? l.subtotal : 0, cotizaciones: [l.cotizacion.numeroCotizacion] });
    } else {
      existing.vecesCotizadas++;
      existing.unidadesCotizadas += l.cantidad;
      if (aprobada) { existing.vecesAprobadas++; existing.revenueGenerado += l.subtotal; }
      if (!existing.cotizaciones.includes(l.cotizacion.numeroCotizacion)) existing.cotizaciones.push(l.cotizacion.numeroCotizacion);
    }
  }
  const itemsCustom = Array.from(customMap.values()).sort((a, b) => b.vecesCotizadas - a.vecesCotizadas);

  // ── Summary ───────────────────────────────────────────────────────────────
  const revenuePropio = inventarioPropio.reduce((s, e) => s + e.revenueGenerado, 0);
  const revenueExterno = proveedoresEquipo.reduce((s, e) => s + e.revenueGenerado, 0);
  const costoExterno = proveedoresEquipo.reduce((s, e) => s + e.costoTotal, 0);

  return NextResponse.json({
    mes: mesParam,
    resumen: {
      totalEquiposPropio: todosEquipos.length,
      equiposActivosMes: inventarioPropio.filter(e => e.vecesAprobadas > 0).length,
      equiposInactivosMes: inventarioPropio.filter(e => e.vecesAprobadas === 0).length,
      equiposNuncaRentados: inventarioPropio.filter(e => !e.ultimaRentaFecha).length,
      revenueEquipoPropio: revenuePropio,
      totalExternosUnicos: proveedoresEquipo.length,
      vecesSubarrendado: proveedoresEquipo.reduce((s, e) => s + e.vecesAprobadas, 0),
      revenueExterno,
      costoExterno,
      margenExterno: revenueExterno - costoExterno,
      costoOpportunityCost: costoExterno,
      cotizacionesMes,
      cotizacionesAprobadas,
    },
    inventarioPropio,
    proveedoresEquipo,
    itemsCustom,
    socios,
    topMasUsados: [...inventarioPropio].sort((a, b) => b.vecesAprobadas - a.vecesAprobadas).slice(0, 5),
    topMenosUsados: [...inventarioPropio]
      .sort((a, b) => {
        if (a.vecesAprobadas !== b.vecesAprobadas) return a.vecesAprobadas - b.vecesAprobadas;
        const da = a.diasSinRenta ?? 99999;
        const db = b.diasSinRenta ?? 99999;
        return db - da;
      })
      .slice(0, 10),
  });
}
