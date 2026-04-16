import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const meses = parseInt(req.nextUrl.searchParams.get("meses") ?? "12");
  const desde = new Date();
  desde.setMonth(desde.getMonth() - meses);
  desde.setDate(1);

  // Obtener proyectos completados con datos financieros
  const proyectos = await prisma.proyecto.findMany({
    where: {
      estado: { in: ["COMPLETADO", "EN_CURSO"] },
      fechaEvento: { gte: desde },
    },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true } },
      cotizacion: { select: { granTotal: true, costosTotalesEstimados: true, utilidadEstimada: true } },
      cuentasCobrar: { select: { monto: true, montoCobrado: true, estado: true } },
      cuentasPagar: { select: { monto: true } },
      gastosOperativos: { select: { monto: true } },
      personal: { select: { tarifaAcordada: true } },
    },
    orderBy: { fechaEvento: "desc" },
  });

  // Calcular métricas por proyecto
  const datosProyectos = proyectos.map(p => {
    const granTotal = Number(p.cotizacion?.granTotal ?? 0);
    const cobrado = p.cuentasCobrar.reduce((s, c) => s + Number(c.montoCobrado ?? 0), 0);
    const cxp = p.cuentasPagar.reduce((s, c) => s + Number(c.monto), 0);
    const gastos = p.gastosOperativos.reduce((s, g) => s + Number(g.monto), 0);
    const nomina = p.personal.reduce((s, pp) => s + Number(pp.tarifaAcordada ?? 0), 0);
    const costoTotal = cxp + gastos + nomina;
    const utilidad = cobrado - costoTotal;
    const margen = cobrado > 0 ? (utilidad / cobrado) * 100 : 0;

    return {
      id: p.id,
      nombre: p.nombre,
      numero: p.numeroProyecto,
      tipoEvento: p.tipoEvento,
      tipoServicio: p.tipoServicio,
      fechaEvento: p.fechaEvento?.toISOString() ?? null,
      mes: p.fechaEvento ? p.fechaEvento.toISOString().slice(0, 7) : null,
      clienteId: p.cliente.id,
      clienteNombre: p.cliente.nombre,
      clienteEmpresa: p.cliente.empresa,
      granTotal,
      cobrado,
      costoTotal,
      utilidad,
      margen,
      estado: p.estado,
    };
  });

  // ── Por tipo de evento ─────────────────────────────────────────────
  const porTipoEvento: Record<string, { tipoEvento: string; count: number; ingresos: number; costos: number; utilidad: number; margenPromedio: number }> = {};
  for (const d of datosProyectos) {
    const tipo = d.tipoEvento || "Sin clasificar";
    if (!porTipoEvento[tipo]) porTipoEvento[tipo] = { tipoEvento: tipo, count: 0, ingresos: 0, costos: 0, utilidad: 0, margenPromedio: 0 };
    porTipoEvento[tipo].count++;
    porTipoEvento[tipo].ingresos += d.cobrado;
    porTipoEvento[tipo].costos += d.costoTotal;
    porTipoEvento[tipo].utilidad += d.utilidad;
  }
  for (const k in porTipoEvento) {
    const t = porTipoEvento[k];
    t.margenPromedio = t.ingresos > 0 ? (t.utilidad / t.ingresos) * 100 : 0;
  }

  // ── Por cliente (top 10) ───────────────────────────────────────────
  const porCliente: Record<string, { clienteId: string; clienteNombre: string; count: number; ingresos: number; costos: number; utilidad: number; margenPromedio: number }> = {};
  for (const d of datosProyectos) {
    const cid = d.clienteId;
    if (!porCliente[cid]) porCliente[cid] = { clienteId: cid, clienteNombre: d.clienteNombre, count: 0, ingresos: 0, costos: 0, utilidad: 0, margenPromedio: 0 };
    porCliente[cid].count++;
    porCliente[cid].ingresos += d.cobrado;
    porCliente[cid].costos += d.costoTotal;
    porCliente[cid].utilidad += d.utilidad;
  }
  for (const k in porCliente) {
    const c = porCliente[k];
    c.margenPromedio = c.ingresos > 0 ? (c.utilidad / c.ingresos) * 100 : 0;
  }

  // ── Estacionalidad por mes ─────────────────────────────────────────
  const porMes: Record<string, { mes: string; count: number; ingresos: number; costos: number; utilidad: number }> = {};
  for (const d of datosProyectos) {
    if (!d.mes) continue;
    if (!porMes[d.mes]) porMes[d.mes] = { mes: d.mes, count: 0, ingresos: 0, costos: 0, utilidad: 0 };
    porMes[d.mes].count++;
    porMes[d.mes].ingresos += d.cobrado;
    porMes[d.mes].costos += d.costoTotal;
    porMes[d.mes].utilidad += d.utilidad;
  }

  // ── KPIs globales ─────────────────────────────────────────────────
  const totalIngresos = datosProyectos.reduce((s, d) => s + d.cobrado, 0);
  const totalCostos = datosProyectos.reduce((s, d) => s + d.costoTotal, 0);
  const totalUtilidad = totalIngresos - totalCostos;
  const margenGlobal = totalIngresos > 0 ? (totalUtilidad / totalIngresos) * 100 : 0;

  return NextResponse.json({
    kpis: { totalIngresos, totalCostos, totalUtilidad, margenGlobal, totalProyectos: datosProyectos.length },
    porTipoEvento: Object.values(porTipoEvento).sort((a, b) => b.ingresos - a.ingresos),
    porCliente: Object.values(porCliente).sort((a, b) => b.ingresos - a.ingresos).slice(0, 10),
    porMes: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes)),
    proyectos: datosProyectos.slice(0, 30),
  });
}
