import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ReporteVendedorPDF } from "@/components/ReporteVendedorPDF";
import React from "react";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { mes, vendedorId, analisis, propuestas, comentarios } = body;

  if (!vendedorId || !mes) return NextResponse.json({ error: "vendedorId y mes requeridos" }, { status: 400 });

  // Non-admin can only generate their own report
  if (session.role !== "ADMIN" && session.id !== vendedorId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [year, month] = mes.split("-").map(Number);
  const mesStart = new Date(year, month - 1, 1);
  const mesEnd = new Date(year, month, 1);

  let config = await prisma.configComisiones.findFirst();
  if (!config) config = await prisma.configComisiones.create({ data: {} });

  const vendedor = await prisma.user.findUnique({
    where: { id: vendedorId },
    select: { id: true, name: true, fechaInicioVendedor: true },
  });
  if (!vendedor) return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });

  function mesDeTrabajoNum(fechaInicio: Date, mesReporte: string): number {
    const [y2, m2] = mesReporte.split("-").map(Number);
    const inicio = new Date(fechaInicio);
    const diff = (y2 - inicio.getFullYear()) * 12 + (m2 - (inicio.getMonth() + 1));
    return Math.max(1, diff + 1);
  }
  function pisoDelMes(mesTrabajo: number, cfg: { metaMes1: number; metaMes2: number; metaMes3: number; metaMesNormal: number }): number {
    if (mesTrabajo === 1) return cfg.metaMes1;
    if (mesTrabajo === 2) return cfg.metaMes2;
    if (mesTrabajo === 3) return cfg.metaMes3;
    return cfg.metaMesNormal;
  }

  const mesTrabajo = vendedor.fechaInicioVendedor ? mesDeTrabajoNum(vendedor.fechaInicioVendedor, mes) : 99;
  const piso = pisoDelMes(mesTrabajo, config);

  const tratos = await prisma.trato.findMany({
    where: {
      etapa: "VENTA_CERRADA",
      fechaCierre: { gte: mesStart, lt: mesEnd },
      OR: [{ vendedorId }, { vendedorId: null, responsableId: vendedorId }],
    },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true } },
      vendedorOrigen: { select: { id: true, name: true } },
      cotizaciones: {
        where: { estado: { in: ["APROBADA"] } },
        select: {
          id: true, numeroCotizacion: true, subtotalEquiposNeto: true, granTotal: true,
          creadaPorId: true,
          creadaPor: { select: { id: true, name: true } },
          cuentasCobrar: { select: { estado: true, monto: true, montoCobrado: true, tipoPago: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const detalles = tratos.map((trato) => {
    const cotizacion = trato.cotizaciones[0] ?? null;
    const baseCalculo = cotizacion?.subtotalEquiposNeto ?? 0;
    const cxc = cotizacion?.cuentasCobrar ?? [];
    const totalFacturado = cxc.reduce((s, c) => s + c.monto, 0);
    const totalCobrado = cxc.reduce((s, c) => s + c.montoCobrado, 0);
    const liquidado100 = totalFacturado > 0 && totalCobrado >= totalFacturado;
    const tienAnticipo = cxc.some(c => c.tipoPago === "ANTICIPO" && c.montoCobrado > 0);

    let pctComision = 0;
    if (trato.origenVenta === "CLIENTE_PROPIO") pctComision = config!.pctClientePropio;
    else if (trato.origenVenta === "PUBLICIDAD") pctComision = config!.pctPublicidad;
    else if (trato.origenVenta === "ASIGNADO") pctComision = config!.pctAsignadoVendedor;

    const montoComision = liquidado100 ? (baseCalculo * pctComision) / 100 : 0;

    // Verificación: si creadaPorId es distinto al vendedorId del trato → delegado
    const esDelegado = !!cotizacion?.creadaPorId && cotizacion.creadaPorId !== vendedorId;

    return {
      tratoId: trato.id,
      cliente: trato.cliente,
      nombreEvento: trato.nombreEvento,
      fechaCierre: trato.fechaCierre?.toISOString() ?? null,
      origenVenta: trato.origenVenta,
      numeroCotizacion: cotizacion?.numeroCotizacion ?? null,
      granTotal: cotizacion?.granTotal ?? 0,
      baseCalculo,
      pctComision,
      montoComision,
      liquidado100,
      estadoPago: liquidado100 ? "LIQUIDADO" : tienAnticipo ? "PARCIAL" : "PENDIENTE",
      esDelegado,
      cotizadorNombre: esDelegado ? (cotizacion?.creadaPor?.name ?? null) : null,
    };
  });

  const baseLiquidada = detalles.filter(d => d.liquidado100).reduce((s, d) => s + d.baseCalculo, 0);
  const totalComisiones = detalles.reduce((s, d) => s + d.montoComision, 0);
  const alcanzaPiso = baseLiquidada >= piso;
  const montoBono = alcanzaPiso ? (baseLiquidada * config.pctBono) / 100 : 0;
  const totalAPagar = totalComisiones + montoBono;

  // Comisión pendiente = tratos no liquidados × su % de comisión estimado
  const comisionPendiente = detalles
    .filter(d => !d.liquidado100 && d.baseCalculo > 0)
    .reduce((s, d) => s + (d.baseCalculo * d.pctComision) / 100, 0);

  // Total cotizaciones del vendedor en el período
  const totalCotizaciones = await prisma.cotizacion.count({
    where: {
      createdAt: { gte: mesStart, lt: mesEnd },
      OR: [
        { trato: { vendedorId } },
        { creadaPorId: vendedorId },
      ],
    },
  });

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}` : null;

  const data = {
    vendedor: { id: vendedor.id, name: vendedor.name },
    mes,
    mesTrabajo,
    piso,
    config: { pctBono: config.pctBono },
    detalles,
    resumen: { totalTratos: tratos.length, baseLiquidada, totalComisiones, alcanzaPiso, montoBono, totalAPagar },
    totalCotizaciones,
    comisionPendiente,
    analisis: analisis || undefined,
    propuestas: propuestas || undefined,
    comentarios: comentarios || undefined,
    logoSrc,
    generadoEn: new Date().toLocaleDateString("es-MX"),
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(ReporteVendedorPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const vendedorSlug = vendedor.name.replace(/\s+/g, "-");
  const fileName = `Reporte-Vendedor-${vendedorSlug}-${mes}.pdf`;
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
