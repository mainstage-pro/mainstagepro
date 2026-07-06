import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function getMesAnterior() {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${y}-${String(m).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") ?? getMesAnterior();

  const [year, month] = mes.split("-").map(Number);
  const mesStart = new Date(year, month - 1, 1);
  const mesEnd   = new Date(year, month, 1);

  // ── Tratos cerrados en el período ──────────────────────────────────────────
  const tratos = await prisma.trato.findMany({
    where: {
      etapa: "VENTA_CERRADA",
      OR: [
        { fechaCierre: { gte: mesStart, lt: mesEnd } },
        { fechaCierre: null, etapaCambiadaEn: { gte: mesStart, lt: mesEnd } },
      ],
    },
    select: {
      id: true,
      tipoEvento: true,
      tipoServicio: true,
      origenLead: true,
      origenVenta: true,
      clienteId: true,
      vendedorId: true,
      fechaCierre: true,
      etapaCambiadaEn: true,
      cliente: { select: { id: true, nombre: true, empresa: true } },
      vendedor: { select: { id: true, name: true } },
      cotizaciones: {
        where: { estado: "APROBADA" },
        select: { granTotal: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      proyecto: {
        select: {
          id: true,
          tipoServicio: true,
          zona: true,
          clienteId: true,
          createdAt: true,
        },
      },
    },
  });

  // ── Tratos perdidos en el período ──────────────────────────────────────────
  const tratosPerdidos = await prisma.trato.findMany({
    where: {
      etapa: "VENTA_PERDIDA",
      OR: [
        { fechaCierre: { gte: mesStart, lt: mesEnd } },
        { etapaCambiadaEn: { gte: mesStart, lt: mesEnd } },
      ],
    },
    select: {
      id: true,
      motivoPerdida: true,
      tipoEvento: true,
      origenLead: true,
      vendedorId: true,
      fechaCierre: true,
      cliente: { select: { nombre: true, empresa: true } },
      cotizaciones: {
        where: { estado: { not: "RECHAZADA" } },
        select: { granTotal: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // ── Enriquecer tratos ───────────────────────────────────────────────────────
  interface TratoEnriquecido {
    id: string;
    tipoEvento: string;
    tipoServicio: string;
    origenLead: string | null;
    origenVenta: string;
    clienteId: string;
    vendedorId: string | null;
    vendedorNombre: string | null;
    cliente: { id: string; nombre: string; empresa: string | null };
    granTotal: number;
    tieneProyecto: boolean;
    zona: string | null;
  }

  const tratosEnriquecidos: TratoEnriquecido[] = tratos.map(t => ({
    id: t.id,
    tipoEvento: t.tipoEvento ?? "OTRO",
    tipoServicio: t.proyecto?.tipoServicio ?? t.tipoServicio ?? "OTRO",
    origenLead: t.origenLead,
    origenVenta: t.origenVenta ?? "CLIENTE_PROPIO",
    clienteId: t.clienteId,
    vendedorId: t.vendedorId,
    vendedorNombre: t.vendedor?.name ?? null,
    cliente: t.cliente,
    granTotal: t.cotizaciones[0]?.granTotal ?? 0,
    tieneProyecto: t.proyecto !== null,
    zona: t.proyecto?.zona ?? null,
  }));

  // ── Totales principales ─────────────────────────────────────────────────────
  const totalMonto = tratosEnriquecidos.reduce((s, t) => s + t.granTotal, 0);
  const ticketPromedio = tratosEnriquecidos.length > 0 ? totalMonto / tratosEnriquecidos.length : 0;

  // ── Por tipo de evento ──────────────────────────────────────────────────────
  const tipoEventoMap: Record<string, { count: number; monto: number }> = {};
  for (const t of tratosEnriquecidos) {
    const k = t.tipoEvento;
    if (!tipoEventoMap[k]) tipoEventoMap[k] = { count: 0, monto: 0 };
    tipoEventoMap[k].count++;
    tipoEventoMap[k].monto += t.granTotal;
  }
  const porTipoEvento = Object.entries(tipoEventoMap)
    .map(([tipo, d]) => ({ tipo, ...d, pct: tratosEnriquecidos.length ? (d.count / tratosEnriquecidos.length) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);

  // ── Por tipo de servicio ────────────────────────────────────────────────────
  const tipoServicioMap: Record<string, { count: number; monto: number }> = {};
  for (const t of tratosEnriquecidos) {
    const k = t.tipoServicio;
    if (!tipoServicioMap[k]) tipoServicioMap[k] = { count: 0, monto: 0 };
    tipoServicioMap[k].count++;
    tipoServicioMap[k].monto += t.granTotal;
  }
  const porTipoServicio = Object.entries(tipoServicioMap)
    .map(([tipo, d]) => ({ tipo, ...d, pct: tratosEnriquecidos.length ? (d.count / tratosEnriquecidos.length) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);

  // ── Cotizaciones vs Proyectos ───────────────────────────────────────────────
  const conProyecto = tratosEnriquecidos.filter(t => t.tieneProyecto).length;
  const totalCotizacionesPeriodo = await prisma.cotizacion.count({
    where: { createdAt: { gte: mesStart, lt: mesEnd } },
  });

  // ── Top 5 clientes del período ──────────────────────────────────────────────
  const clienteMontoMap: Record<string, { id: string; nombre: string; empresa: string | null; monto: number; eventos: number }> = {};
  for (const t of tratosEnriquecidos) {
    const cid = t.clienteId;
    if (!clienteMontoMap[cid]) clienteMontoMap[cid] = { id: cid, nombre: t.cliente.nombre, empresa: t.cliente.empresa, monto: 0, eventos: 0 };
    clienteMontoMap[cid].monto += t.granTotal;
    clienteMontoMap[cid].eventos++;
  }
  const top5Clientes = Object.values(clienteMontoMap).sort((a, b) => b.monto - a.monto).slice(0, 5);
  const top3Clientes = top5Clientes.slice(0, 3);

  // ── Clientes recurrentes ────────────────────────────────────────────────────
  const clienteIdsPeriodo = [...new Set(tratosEnriquecidos.map(t => t.clienteId))];
  const clientesConHistorico = await prisma.trato.groupBy({
    by: ["clienteId"],
    where: {
      clienteId: { in: clienteIdsPeriodo },
      etapa: "VENTA_CERRADA",
      fechaCierre: { lt: mesStart },
    },
  });
  const idsRecurrentes = new Set(clientesConHistorico.map(r => r.clienteId));
  const clientesRecurrentes = clienteIdsPeriodo.filter(id => idsRecurrentes.has(id)).length;

  // ── Clientes nuevos ─────────────────────────────────────────────────────────
  const proyectosPeriodo = await prisma.proyecto.findMany({
    where: { createdAt: { gte: mesStart, lt: mesEnd } },
    select: { clienteId: true, createdAt: true },
  });
  const clienteIdsConProyectoEnPeriodo = [...new Set(proyectosPeriodo.map(p => p.clienteId))];
  const clientesConProyectoPrevio = await prisma.proyecto.groupBy({
    by: ["clienteId"],
    where: {
      clienteId: { in: clienteIdsConProyectoEnPeriodo },
      createdAt: { lt: mesStart },
    },
  });
  const idsConProyectoPrevio = new Set(clientesConProyectoPrevio.map(r => r.clienteId));
  const clientesNuevosIds = clienteIdsConProyectoEnPeriodo.filter(id => !idsConProyectoPrevio.has(id));
  const clientesNuevosData = await prisma.cliente.findMany({
    where: { id: { in: clientesNuevosIds } },
    select: { id: true, nombre: true, empresa: true },
  });

  // ── Por servicio (Rentas vs Producción) ────────────────────────────────────
  const rentasCount = tratosEnriquecidos.filter(t => t.tipoServicio === "RENTA").length;
  const produccionCount = tratosEnriquecidos.filter(t => ["PRODUCCION_TECNICA", "DIRECCION_TECNICA"].includes(t.tipoServicio)).length;
  const otroServicioCount = tratosEnriquecidos.length - rentasCount - produccionCount;
  const porServicio = {
    rentas: {
      count: rentasCount,
      monto: tratosEnriquecidos.filter(t => t.tipoServicio === "RENTA").reduce((s, t) => s + t.granTotal, 0),
      pct: tratosEnriquecidos.length ? (rentasCount / tratosEnriquecidos.length) * 100 : 0,
    },
    produccion: {
      count: produccionCount,
      monto: tratosEnriquecidos.filter(t => ["PRODUCCION_TECNICA","DIRECCION_TECNICA"].includes(t.tipoServicio)).reduce((s, t) => s + t.granTotal, 0),
      pct: tratosEnriquecidos.length ? (produccionCount / tratosEnriquecidos.length) * 100 : 0,
    },
    otro: {
      count: otroServicioCount,
      monto: tratosEnriquecidos.filter(t => !["RENTA","PRODUCCION_TECNICA","DIRECCION_TECNICA"].includes(t.tipoServicio)).reduce((s, t) => s + t.granTotal, 0),
      pct: tratosEnriquecidos.length ? (otroServicioCount / tratosEnriquecidos.length) * 100 : 0,
    },
  };

  // ── Origen de leads ─────────────────────────────────────────────────────────
  const origenMap: Record<string, { count: number; monto: number }> = {};
  for (const t of tratosEnriquecidos) {
    const k = t.origenLead ?? "OTRO";
    if (!origenMap[k]) origenMap[k] = { count: 0, monto: 0 };
    origenMap[k].count++;
    origenMap[k].monto += t.granTotal;
  }
  const origenLeads = Object.entries(origenMap)
    .map(([origen, d]) => ({ origen, ...d, pct: tratosEnriquecidos.length ? (d.count / tratosEnriquecidos.length) * 100 : 0 }))
    .sort((a, b) => b.monto - a.monto);

  // ── Rendimiento por vendedor ────────────────────────────────────────────────
  const vendedorMap: Record<string, { id: string; nombre: string; eventos: number; monto: number }> = {};
  for (const t of tratosEnriquecidos) {
    const vid = t.vendedorId ?? "sin-asignar";
    const vname = t.vendedorNombre ?? "Sin asignar";
    if (!vendedorMap[vid]) vendedorMap[vid] = { id: vid, nombre: vname, eventos: 0, monto: 0 };
    vendedorMap[vid].eventos++;
    vendedorMap[vid].monto += t.granTotal;
  }
  const porVendedor = Object.values(vendedorMap).sort((a, b) => b.monto - a.monto);

  // ── Tratos perdidos: motivos ────────────────────────────────────────────────
  const motivoMap: Record<string, number> = {};
  for (const t of tratosPerdidos) {
    const k = t.motivoPerdida ?? "Sin especificar";
    motivoMap[k] = (motivoMap[k] ?? 0) + 1;
  }
  const motivosPerdida = Object.entries(motivoMap)
    .map(([motivo, count]) => ({ motivo, count, pct: tratosPerdidos.length > 0 ? (count / tratosPerdidos.length) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);

  // ── Zonas ──────────────────────────────────────────────────────────────────
  const zonaMap: Record<string, { count: number; monto: number }> = {};
  for (const t of tratosEnriquecidos) {
    if (!t.zona) continue;
    if (!zonaMap[t.zona]) zonaMap[t.zona] = { count: 0, monto: 0 };
    zonaMap[t.zona].count++;
    zonaMap[t.zona].monto += t.granTotal;
  }
  const porZona = Object.entries(zonaMap)
    .map(([zona, d]) => ({ zona, ...d, pct: tratosEnriquecidos.length ? (d.count / tratosEnriquecidos.length) * 100 : 0 }))
    .sort((a, b) => b.monto - a.monto);

  // ── Historial mensual (últimos 6 meses) ─────────────────────────────────────
  const porMesHistorico: { mes: string; label: string; count: number; monto: number; perdidos: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const lbl = d.toLocaleDateString("es-MX", { month: "short" });

    const [cerrados, perdidos] = await Promise.all([
      prisma.trato.findMany({
        where: { etapa: "VENTA_CERRADA", fechaCierre: { gte: start, lt: end } },
        select: { cotizaciones: { where: { estado: "APROBADA" }, select: { granTotal: true }, take: 1 } },
      }),
      prisma.trato.count({
        where: {
          etapa: "VENTA_PERDIDA",
          OR: [{ fechaCierre: { gte: start, lt: end } }, { etapaCambiadaEn: { gte: start, lt: end } }],
        },
      }),
    ]);

    const monto = cerrados.reduce((s, t) => s + (t.cotizaciones[0]?.granTotal ?? 0), 0);
    porMesHistorico.push({ mes: mesKey, label: lbl.charAt(0).toUpperCase() + lbl.slice(1), count: cerrados.length, monto, perdidos });
  }

  // ── Mes anterior para comparativa ──────────────────────────────────────────
  const mesAnteriorIdx = porMesHistorico.length >= 2 ? porMesHistorico[porMesHistorico.length - 2] : null;
  const crecimientoMensual = mesAnteriorIdx && mesAnteriorIdx.monto > 0
    ? ((totalMonto - mesAnteriorIdx.monto) / mesAnteriorIdx.monto) * 100
    : null;

  const label = new Date(year, month - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return NextResponse.json({
    periodo: { mes, label: label.charAt(0).toUpperCase() + label.slice(1) },
    ventasTotal: { count: tratosEnriquecidos.length, monto: totalMonto },
    ticketPromedio,
    crecimientoMensual,
    porTipoEvento,
    porTipoServicio,
    cotizaciones: {
      totalCreadas: totalCotizacionesPeriodo,
      ventasCerradas: tratosEnriquecidos.length,
      conProyecto,
      sinProyecto: tratosEnriquecidos.length - conProyecto,
    },
    tratosPerdidos: {
      count: tratosPerdidos.length,
      montoEstimadoPerdido: tratosPerdidos.reduce((s, t) => s + (t.cotizaciones[0]?.granTotal ?? 0), 0),
      motivosPerdida,
    },
    top3Clientes,
    top5Clientes,
    clientesRecurrentes: { count: clientesRecurrentes },
    clientesNuevos: { count: clientesNuevosData.length, lista: clientesNuevosData },
    porServicio,
    origenLeads,
    porVendedor,
    porZona,
    porMesHistorico,
    _debug: {
      totalTratosNullServicio: tratos.filter(t => !t.proyecto?.tipoServicio && !t.tipoServicio).length,
    },
  });
}
