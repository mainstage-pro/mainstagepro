import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { NotaCobroPDF } from "@/components/NotaCobroPDF";
import React from "react";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cxc = await prisma.cuentaCobrar.findUnique({
    where: { id },
    include: {
      cliente:    { select: { nombre: true, empresa: true, telefono: true } },
      proyecto:   { select: { nombre: true, numeroProyecto: true, fechaEvento: true } },
      cotizacion: { select: { numeroCotizacion: true, granTotal: true } },
    },
  });

  if (!cxc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Obtener granTotal desde cotización (directo o via proyecto)
  let granTotal: number | null = cxc.cotizacion?.granTotal ?? null;
  let montoAnticipo: number | null = null;
  let montoCobradoProyecto = 0;

  if (cxc.proyectoId) {
    if (!granTotal) {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: cxc.proyectoId },
        select: { cotizacion: { select: { granTotal: true } } },
      });
      granTotal = proyecto?.cotizacion?.granTotal ?? null;
    }

    // Anticipo registrado en el mismo proyecto
    const cxcAnticipo = await prisma.cuentaCobrar.findFirst({
      where: { proyectoId: cxc.proyectoId, tipoPago: "ANTICIPO" },
      select: { monto: true, montoCobrado: true },
    });
    montoAnticipo = cxcAnticipo?.monto ?? null;

    // Total cobrado en el proyecto (todos los abonos confirmados)
    const todas = await prisma.cuentaCobrar.findMany({
      where: { proyectoId: cxc.proyectoId },
      select: { montoCobrado: true },
    });
    montoCobradoProyecto = todas.reduce((s, c) => s + c.montoCobrado, 0);
  }

  const notaData = {
    id:               cxc.id,
    concepto:         cxc.concepto,
    tipoPago:         cxc.tipoPago,
    monto:            cxc.monto,
    fechaCompromiso:  cxc.fechaCompromiso.toISOString(),
    granTotal,
    montoAnticipo,
    montoCobrado:     montoCobradoProyecto || cxc.montoCobrado,
    cliente:          cxc.cliente
      ? { nombre: cxc.cliente.nombre, empresa: cxc.cliente.empresa ?? null, telefono: cxc.cliente.telefono ?? null }
      : null,
    proyecto:         cxc.proyecto
      ? { nombre: cxc.proyecto.nombre, numeroProyecto: cxc.proyecto.numeroProyecto, fechaEvento: cxc.proyecto.fechaEvento?.toISOString() ?? null }
      : null,
    cotizacion:       cxc.cotizacion ? { numeroCotizacion: cxc.cotizacion.numeroCotizacion } : null,
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(NotaCobroPDF, { nota: notaData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="NotaCobro-${id.slice(-8).toUpperCase()}.pdf"`,
      "Content-Length":      String(pdfBuffer.length),
    },
  });
}
