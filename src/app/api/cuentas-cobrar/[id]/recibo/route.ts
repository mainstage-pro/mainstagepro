import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ReciboPagoPDF } from "@/components/ReciboPagoPDF";
import React from "react";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cxc = await prisma.cuentaCobrar.findUnique({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true } },
      proyecto: { select: { nombre: true, numeroProyecto: true, fechaEvento: true } },
      cotizacion: { select: { numeroCotizacion: true, granTotal: true } },
    },
  });

  if (!cxc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Para ANTICIPO: calcular saldo restante (granTotal - monto anticipo)
  // Para LIQUIDACION: obtener el monto de anticipo previo si existe
  let granTotal: number | null = cxc.cotizacion?.granTotal ?? null;
  let montoAnticipo: number | null = null;

  if (cxc.proyectoId) {
    // Buscar cotización del proyecto si no está en la CxC
    if (!granTotal) {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: cxc.proyectoId },
        select: { cotizacion: { select: { granTotal: true } } },
      });
      granTotal = proyecto?.cotizacion?.granTotal ?? null;
    }
    // Buscar anticipo del mismo proyecto
    const cxcAnticipo = await prisma.cuentaCobrar.findFirst({
      where: { proyectoId: cxc.proyectoId, tipoPago: "ANTICIPO" },
      select: { monto: true },
    });
    montoAnticipo = cxcAnticipo?.monto ?? null;
  }

  const reciboData = {
    id: cxc.id,
    concepto: cxc.concepto,
    tipoPago: cxc.tipoPago,
    monto: cxc.monto,
    fechaCompromiso: cxc.fechaCompromiso.toISOString(),
    estado: cxc.estado,
    granTotal,
    montoAnticipo,
    cliente: cxc.cliente ? { nombre: cxc.cliente.nombre, empresa: cxc.cliente.empresa ?? null } : null,
    proyecto: cxc.proyecto
      ? {
          nombre: cxc.proyecto.nombre,
          numeroProyecto: cxc.proyecto.numeroProyecto,
          fechaEvento: cxc.proyecto.fechaEvento?.toISOString() ?? null,
        }
      : null,
    cotizacion: cxc.cotizacion ? { numeroCotizacion: cxc.cotizacion.numeroCotizacion } : null,
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(ReciboPagoPDF, { recibo: reciboData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const tipoPagoSlug = cxc.tipoPago === "ANTICIPO" ? "Anticipo" : cxc.tipoPago === "LIQUIDACION" ? "Liquidacion" : "Recibo";

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${tipoPagoSlug}-${id.slice(-8).toUpperCase()}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
