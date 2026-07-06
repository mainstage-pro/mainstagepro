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

  // Fetch all monthly data (same logic as GET /api/ventas/reporte-mensual)
  const [year, month] = mesParam.split("-").map(Number);
  const mesStart = new Date(year, month - 1, 1);
  const mesEnd = new Date(year, month, 1);

  const tratos = await prisma.trato.findMany({
    where: { etapa: "VENTA_CERRADA", fechaCierre: { gte: mesStart, lt: mesEnd } },
    select: {
      id: true, tipoEvento: true, tipoServicio: true, origenLead: true, origenVenta: true, clienteId: true, fechaCierre: true,
      cliente: { select: { id: true, nombre: true, empresa: true } },
      cotizaciones: { where: { estado: "APROBADA" }, select: { granTotal: true, subtotalEquiposNeto: true }, orderBy: { createdAt: "desc" }, take: 1 },
      proyecto: { select: { id: true } },
    },
  });

  const totalMonto = tratos.reduce((s, t) => s + (t.cotizaciones[0]?.granTotal ?? 0), 0);
  const ticketPromedio = tratos.length > 0 ? totalMonto / tratos.length : 0;

  const tipoEventoMap: Record<string, { count: number; monto: number }> = {};
  const tipoServicioMap: Record<string, { count: number; monto: number }> = {};
  const origenMap: Record<string, { count: number; monto: number }> = {};
  const clienteMontoMap: Record<string, { id: string; nombre: string; empresa: string | null; monto: number; eventos: number }> = {};

  for (const t of tratos) {
    const k1 = t.tipoEvento ?? "OTRO"; if (!tipoEventoMap[k1]) tipoEventoMap[k1] = { count: 0, monto: 0 }; tipoEventoMap[k1].count++; tipoEventoMap[k1].monto += t.cotizaciones[0]?.granTotal ?? 0;
    const k2 = t.tipoServicio ?? "OTRO"; if (!tipoServicioMap[k2]) tipoServicioMap[k2] = { count: 0, monto: 0 }; tipoServicioMap[k2].count++; tipoServicioMap[k2].monto += t.cotizaciones[0]?.granTotal ?? 0;
    const k3 = t.origenLead ?? "OTRO"; if (!origenMap[k3]) origenMap[k3] = { count: 0, monto: 0 }; origenMap[k3].count++; origenMap[k3].monto += t.cotizaciones[0]?.granTotal ?? 0;
    const cid = t.clienteId; if (!clienteMontoMap[cid]) clienteMontoMap[cid] = { id: cid, nombre: t.cliente.nombre, empresa: t.cliente.empresa, monto: 0, eventos: 0 }; clienteMontoMap[cid].monto += t.cotizaciones[0]?.granTotal ?? 0; clienteMontoMap[cid].eventos++;
  }

  const clienteIdsPeriodo = [...new Set(tratos.map(t => t.clienteId))];
  const clientesConHistorico = await prisma.trato.groupBy({ by: ["clienteId"], where: { clienteId: { in: clienteIdsPeriodo }, etapa: "VENTA_CERRADA", fechaCierre: { lt: mesStart } } });
  const idsRecurrentes = new Set(clientesConHistorico.map(r => r.clienteId));
  const nuevosRaw = await prisma.cliente.findMany({ where: { createdAt: { gte: mesStart, lt: mesEnd } }, select: { id: true, nombre: true, empresa: true } });
  const totalCotizacionesPeriodo = await prisma.cotizacion.count({ where: { createdAt: { gte: mesStart, lt: mesEnd } } });

  const rentasCount = tratos.filter(t => t.tipoServicio === "RENTA").length;
  const produccionCount = tratos.filter(t => ["PRODUCCION_TECNICA","DIRECCION_TECNICA"].includes(t.tipoServicio ?? "")).length;
  const otroCount = tratos.length - rentasCount - produccionCount;

  const label = new Date(year, month - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}` : null;

  const data = {
    periodo: { mes: mesParam, label: label.charAt(0).toUpperCase() + label.slice(1) },
    ventasTotal: { count: tratos.length, monto: totalMonto },
    ticketPromedio,
    porTipoEvento: Object.entries(tipoEventoMap).map(([tipo, d]) => ({ tipo, ...d, pct: tratos.length ? (d.count / tratos.length) * 100 : 0 })).sort((a, b) => b.monto - a.monto),
    porTipoServicio: Object.entries(tipoServicioMap).map(([tipo, d]) => ({ tipo, ...d, pct: tratos.length ? (d.count / tratos.length) * 100 : 0 })).sort((a, b) => b.monto - a.monto),
    cotizaciones: { totalCreadas: totalCotizacionesPeriodo, ventasCerradas: tratos.length, conProyecto: tratos.filter(t => t.proyecto !== null).length, sinProyecto: tratos.filter(t => t.proyecto === null).length },
    top3Clientes: Object.values(clienteMontoMap).sort((a, b) => b.monto - a.monto).slice(0, 3),
    clientesRecurrentes: { count: clienteIdsPeriodo.filter(id => idsRecurrentes.has(id)).length },
    clientesNuevos: { count: nuevosRaw.length, lista: [] },
    porServicio: {
      rentas: { count: rentasCount, monto: tratos.filter(t => t.tipoServicio === "RENTA").reduce((s, t) => s + (t.cotizaciones[0]?.granTotal ?? 0), 0), pct: tratos.length ? (rentasCount / tratos.length) * 100 : 0 },
      produccion: { count: produccionCount, monto: tratos.filter(t => ["PRODUCCION_TECNICA","DIRECCION_TECNICA"].includes(t.tipoServicio ?? "")).reduce((s, t) => s + (t.cotizaciones[0]?.granTotal ?? 0), 0), pct: tratos.length ? (produccionCount / tratos.length) * 100 : 0 },
      otro: { count: otroCount, monto: tratos.filter(t => !["RENTA","PRODUCCION_TECNICA","DIRECCION_TECNICA"].includes(t.tipoServicio ?? "")).reduce((s, t) => s + (t.cotizaciones[0]?.granTotal ?? 0), 0), pct: tratos.length ? (otroCount / tratos.length) * 100 : 0 },
    },
    origenLeads: Object.entries(origenMap).map(([origen, d]) => ({ origen, ...d, pct: tratos.length ? (d.count / tratos.length) * 100 : 0 })).sort((a, b) => b.count - a.count),
    analisis: analisis || undefined,
    propuestas: propuestas || undefined,
    comentarios: comentarios || undefined,
    logoSrc,
    generadoEn: new Date().toLocaleDateString("es-MX"),
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(ReporteVentasMensualPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const fileName = `Reporte-Ventas-${mesParam}.pdf`;
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
