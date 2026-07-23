import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { NominaPDF, type NominaPagoData } from "@/components/NominaPDF";
import React from "react";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [pendientes, historial] = await Promise.all([
    prisma.pagoNomina.findMany({
      where: { estado: "PENDIENTE" },
      include: { personal: { select: { nombre: true, puesto: true } }, cuentaOrigen: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pagoNomina.findMany({
      where: { estado: "PAGADO" },
      include: { personal: { select: { nombre: true, puesto: true } }, cuentaOrigen: { select: { nombre: true } } },
      orderBy: { fechaPago: "desc" },
      take: 60,
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toData = (p: any): NominaPagoData => ({
    id: p.id,
    nombre: p.personal.nombre,
    puesto: p.personal.puesto,
    concepto: p.concepto,
    periodo: p.periodo,
    monto: p.monto,
    fechaPago: p.fechaPago ? p.fechaPago.toISOString() : null,
    metodoPago: p.metodoPago,
    cuenta: p.cuentaOrigen?.nombre ?? null,
  });

  const pendientesData = pendientes.map(toData);
  const historialData = historial.map(toData);
  const totalPendiente = pendientesData.reduce((s, p) => s + p.monto, 0);
  const totalPagado = historialData.reduce((s, p) => s + p.monto, 0);

  const secciones = [];
  if (pendientesData.length > 0) secciones.push({ nombre: "Pendiente de pago", pagos: pendientesData, total: totalPendiente });
  if (historialData.length > 0) secciones.push({ nombre: "Pagos recientes", pagos: historialData, total: totalPagado });

  const pdfData = {
    secciones,
    totalPendiente,
    totalPagado,
    totalRegistros: pendientesData.length + historialData.length,
    generadoEn: new Date().toISOString(),
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(NominaPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const fecha = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Nomina-${fecha}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
