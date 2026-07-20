import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ReporteVentasMensualPDF } from "@/components/ReporteVentasMensualPDF";
import React from "react";
import fs from "fs";
import path from "path";

function getMesAnterior() {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${y}-${String(m).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { mes, analisis, propuestas, comentarios } = body;
  const mesParam = mes ?? getMesAnterior();

  const [year, month] = mesParam.split("-").map(Number);
  const mesStart = new Date(year, month - 1, 1);
  const mesEnd   = new Date(year, month, 1);

  // ── Tratos cerrados ────────────────────────────────────────────────────────
  const tratos = await prisma.trato.findMany({
    where: {
      etapa: "VENTA_CERRADA",
      OR: [
        { fechaCierre: { gte: mesStart, lt: mesEnd } },
        { fechaCierre: null, etapaCambiadaEn: { gte: mesStart, lt: mesEnd } },
      ],
    },
    select: {
      id: true, tipoEvento: true, tipoServicio: true,
      origenLead: true, origenVenta: true, clienteId: true,
      vendedorId: true, fechaCierre: true, etapaCambiadaEn: true,
      cliente: { select: { id: true, nombre: true, empresa: true } },
      vendedor: { select: { id: true, name: true } },
      cotizaciones: { where: { estado: "APROBADA" }, select: { granTotal: true }, orderBy: { createdAt: "desc" }, take: 1 },
      proyectos: { select: { id: true, tipoServicio: true, zona: true }, take: 1 },
    },
  });

  // ── Tratos perdidos ────────────────────────────────────────────────────────
  const tratosPerdidos = await prisma.trato.findMany({
    where: {
      etapa: "VENTA_PERDIDA",
      OR: [
        { fechaCierre: { gte: mesStart, lt: mesEnd } },
        { etapaCambiadaEn: { gte: mesStart, lt: mesEnd } },
      ],
    },
    select: {
      id: true, motivoPerdida: true,
      cotizaciones: { where: { estado: { not: "RECHAZADA" } }, select: { granTotal: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // ── Enriquecer ─────────────────────────────────────────────────────────────
  const enriquecidos = tratos.map(t => ({
    id: t.id,
    tipoEvento: t.tipoEvento ?? "OTRO",
    tipoServicio: t.proyectos[0]?.tipoServicio ?? t.tipoServicio ?? "OTRO",
    origenLead: t.origenLead,
    clienteId: t.clienteId,
    vendedorId: t.vendedorId,
    vendedorNombre: t.vendedor?.name ?? null,
    cliente: t.cliente,
    granTotal: t.cotizaciones[0]?.granTotal ?? 0,
    tieneProyecto: t.proyectos.length > 0,
    zona: t.proyectos[0]?.zona ?? null,
  }));

  const totalMonto = enriquecidos.reduce((s, t) => s + t.granTotal, 0);
  const ticketPromedio = enriquecidos.length > 0 ? totalMonto / enriquecidos.length : 0;

  // Agrupaciones
  function agrupar<T extends string>(arr: { key: T; monto: number }[]) {
    const map: Record<string, { count: number; monto: number }> = {};
    for (const { key, monto } of arr) {
      if (!map[key]) map[key] = { count: 0, monto: 0 };
      map[key].count++; map[key].monto += monto;
    }
    return Object.entries(map)
      .map(([k, d]) => ({ key: k, ...d, pct: enriquecidos.length ? (d.count / enriquecidos.length) * 100 : 0 }))
      .sort((a, b) => b.monto - a.monto);
  }

  const porTipoEvento   = agrupar(enriquecidos.map(t => ({ key: t.tipoEvento, monto: t.granTotal }))).map(({ key, ...r }) => ({ tipo: key, ...r }));
  const porTipoServicio = agrupar(enriquecidos.map(t => ({ key: t.tipoServicio, monto: t.granTotal }))).map(({ key, ...r }) => ({ tipo: key, ...r }));
  const origenLeads     = agrupar(enriquecidos.map(t => ({ key: t.origenLead ?? "OTRO", monto: t.granTotal }))).map(({ key, ...r }) => ({ origen: key, ...r }));
  const zonaMap         = agrupar(enriquecidos.filter(t => !!t.zona).map(t => ({ key: t.zona!, monto: t.granTotal }))).map(({ key, ...r }) => ({ zona: key, ...r }));

  // Vendedores
  const vendedorMap: Record<string, { id: string; nombre: string; eventos: number; monto: number }> = {};
  for (const t of enriquecidos) {
    const vid = t.vendedorId ?? "sin-asignar";
    if (!vendedorMap[vid]) vendedorMap[vid] = { id: vid, nombre: t.vendedorNombre ?? "Sin asignar", eventos: 0, monto: 0 };
    vendedorMap[vid].eventos++; vendedorMap[vid].monto += t.granTotal;
  }
  const porVendedor = Object.values(vendedorMap).sort((a, b) => b.monto - a.monto);

  // Top clientes
  const clienteMap: Record<string, { nombre: string; empresa: string | null; monto: number; eventos: number }> = {};
  for (const t of enriquecidos) {
    if (!clienteMap[t.clienteId]) clienteMap[t.clienteId] = { nombre: t.cliente.nombre, empresa: t.cliente.empresa, monto: 0, eventos: 0 };
    clienteMap[t.clienteId].monto += t.granTotal; clienteMap[t.clienteId].eventos++;
  }
  const top5Clientes = Object.values(clienteMap).sort((a, b) => b.monto - a.monto).slice(0, 5);

  // Clientes recurrentes / nuevos
  const clienteIdsPeriodo = [...new Set(enriquecidos.map(t => t.clienteId))];
  const conHistorico = await prisma.trato.groupBy({ by: ["clienteId"], where: { clienteId: { in: clienteIdsPeriodo }, etapa: "VENTA_CERRADA", fechaCierre: { lt: mesStart } } });
  const idsRecurrentes = new Set(conHistorico.map(r => r.clienteId));
  const clientesRecurrentes = clienteIdsPeriodo.filter(id => idsRecurrentes.has(id)).length;

  const proyectosPeriodo = await prisma.proyecto.findMany({ where: { createdAt: { gte: mesStart, lt: mesEnd } }, select: { clienteId: true } });
  const cidsConProy = [...new Set(proyectosPeriodo.map(p => p.clienteId))];
  const conPrevio = await prisma.proyecto.groupBy({ by: ["clienteId"], where: { clienteId: { in: cidsConProy }, createdAt: { lt: mesStart } } });
  const idsPrevio = new Set(conPrevio.map(r => r.clienteId));
  const clientesNuevosIds = cidsConProy.filter(id => !idsPrevio.has(id));
  const clientesNuevos = await prisma.cliente.findMany({ where: { id: { in: clientesNuevosIds } }, select: { nombre: true, empresa: true } });

  // Cotizaciones
  const totalCotizacionesPeriodo = await prisma.cotizacion.count({ where: { createdAt: { gte: mesStart, lt: mesEnd } } });
  const conProyecto = enriquecidos.filter(t => t.tieneProyecto).length;

  // Por servicio
  const rentasCount     = enriquecidos.filter(t => t.tipoServicio === "RENTA").length;
  const produccionCount = enriquecidos.filter(t => ["PRODUCCION_TECNICA","DIRECCION_TECNICA"].includes(t.tipoServicio)).length;
  const otroCount       = enriquecidos.length - rentasCount - produccionCount;
  const porServicio = {
    rentas:    { count: rentasCount,     monto: enriquecidos.filter(t => t.tipoServicio === "RENTA").reduce((s, t) => s + t.granTotal, 0), pct: enriquecidos.length ? (rentasCount / enriquecidos.length) * 100 : 0 },
    produccion:{ count: produccionCount, monto: enriquecidos.filter(t => ["PRODUCCION_TECNICA","DIRECCION_TECNICA"].includes(t.tipoServicio)).reduce((s, t) => s + t.granTotal, 0), pct: enriquecidos.length ? (produccionCount / enriquecidos.length) * 100 : 0 },
    otro:      { count: otroCount,       monto: enriquecidos.filter(t => !["RENTA","PRODUCCION_TECNICA","DIRECCION_TECNICA"].includes(t.tipoServicio)).reduce((s, t) => s + t.granTotal, 0), pct: enriquecidos.length ? (otroCount / enriquecidos.length) * 100 : 0 },
  };

  // Motivos de pérdida
  const motivoMap: Record<string, number> = {};
  for (const t of tratosPerdidos) {
    const k = t.motivoPerdida ?? "Sin especificar";
    motivoMap[k] = (motivoMap[k] ?? 0) + 1;
  }
  const motivosPerdida = Object.entries(motivoMap)
    .map(([motivo, count]) => ({ motivo, count, pct: tratosPerdidos.length > 0 ? (count / tratosPerdidos.length) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);

  // Historial 6 meses
  const porMesHistorico: { mes: string; label: string; count: number; monto: number; perdidos: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const lbl = d.toLocaleDateString("es-MX", { month: "short" });
    const [cerrados, perdidos] = await Promise.all([
      prisma.trato.findMany({ where: { etapa: "VENTA_CERRADA", fechaCierre: { gte: start, lt: end } }, select: { cotizaciones: { where: { estado: "APROBADA" }, select: { granTotal: true }, take: 1 } } }),
      prisma.trato.count({ where: { etapa: "VENTA_PERDIDA", OR: [{ fechaCierre: { gte: start, lt: end } }, { etapaCambiadaEn: { gte: start, lt: end } }] } }),
    ]);
    porMesHistorico.push({ mes: mesKey, label: lbl.charAt(0).toUpperCase() + lbl.slice(1), count: cerrados.length, monto: cerrados.reduce((s, t) => s + (t.cotizaciones[0]?.granTotal ?? 0), 0), perdidos });
  }

  const mesAnteriorData = porMesHistorico[porMesHistorico.length - 2];
  const crecimientoMensual = mesAnteriorData && mesAnteriorData.monto > 0
    ? ((totalMonto - mesAnteriorData.monto) / mesAnteriorData.monto) * 100 : null;

  const label = new Date(year, month - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}` : null;

  const data = {
    periodo: { mes: mesParam, label: label.charAt(0).toUpperCase() + label.slice(1) },
    ventasTotal: { count: enriquecidos.length, monto: totalMonto },
    ticketPromedio,
    crecimientoMensual,
    porTipoEvento,
    porTipoServicio,
    cotizaciones: { totalCreadas: totalCotizacionesPeriodo, ventasCerradas: enriquecidos.length, conProyecto, sinProyecto: enriquecidos.length - conProyecto },
    tratosPerdidos: { count: tratosPerdidos.length, montoEstimadoPerdido: tratosPerdidos.reduce((s, t) => s + (t.cotizaciones[0]?.granTotal ?? 0), 0), motivosPerdida },
    top3Clientes: top5Clientes.slice(0, 3),
    top5Clientes,
    clientesRecurrentes: { count: clientesRecurrentes },
    clientesNuevos: { count: clientesNuevos.length, lista: clientesNuevos },
    porServicio,
    origenLeads,
    porVendedor,
    porZona: zonaMap,
    porMesHistorico,
    analisis: analisis || undefined,
    propuestas: propuestas || undefined,
    comentarios: comentarios || undefined,
    logoSrc,
    generadoEn: new Date().toLocaleDateString("es-MX"),
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(ReporteVentasMensualPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const fileName = `Reporte-Ventas-${mesParam}.pdf`;
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
