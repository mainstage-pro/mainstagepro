import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { CotizacionPDF } from "@/components/CotizacionPDF";
import React from "react";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true, telefono: true, correo: true, tipoCliente: true } },
      creadaPor: { select: { name: true } },
      lineas: {
        orderBy: { orden: "asc" },
        select: {
          id: true, tipo: true, descripcion: true, marca: true, modelo: true,
          nivel: true, jornada: true, cantidad: true, dias: true,
          precioUnitario: true, subtotal: true, esIncluido: true, notas: true,
        },
      },
    },
  });

  if (!cotizacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(CotizacionPDF, { cotizacion }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Cotizacion-${cotizacion.numeroCotizacion}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
